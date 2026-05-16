import { AIMessage, AIMessageChunk, type BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import {
  ChatOpenAI,
  ChatOpenAICompletions,
  convertMessagesToCompletionsMessageParams,
  type ChatOpenAIFields,
} from "@langchain/openai";

// 在 thinking mode 下，部分 OpenAI-compatible provider 要求把上一轮 assistant 的
// reasoning_content 原样回传；当前 LangChain 版本在 completions 序列化时会丢掉它。
function injectReasoningContent(
  messages: BaseMessage[],
  messageParams: ReturnType<typeof convertMessagesToCompletionsMessageParams>,
) {
  return messageParams.map((messageParam, index) => {
    const sourceMessage = messages[index];

    if (!AIMessage.isInstance(sourceMessage)) {
      return messageParam;
    }

    const reasoningContent = sourceMessage.additional_kwargs?.reasoning_content;

    if (typeof reasoningContent !== "string" || reasoningContent.length === 0) {
      return messageParam;
    }

    return {
      ...messageParam,
      reasoning_content: reasoningContent,
    };
  });
}

// 只补齐 streaming 场景下的 completions 消息映射，保持现有 LangChain tool loop 不变。
class ReasoningCompatChatOpenAICompletions extends ChatOpenAICompletions {
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: Parameters<ChatOpenAICompletions["_streamResponseChunks"]>[2],
  ) {
    const rawMessages = convertMessagesToCompletionsMessageParams({
      messages,
      model: this.model,
    });
    const messagesMapped = injectReasoningContent(messages, rawMessages);
    const params = {
      ...this.invocationParams(options, { streaming: true }),
      messages: messagesMapped,
      stream: true as const,
    };

    let defaultRole: string | undefined;
    const streamIterable = await this.completionWithRetry(params, options);
    let usage:
      | {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          prompt_tokens_details?: {
            audio_tokens?: number | null;
            cached_tokens?: number | null;
          };
          completion_tokens_details?: {
            audio_tokens?: number | null;
            reasoning_tokens?: number | null;
          };
        }
      | undefined;

    for await (const data of streamIterable) {
      if (options.signal?.aborted) {
        return;
      }

      const choice = data?.choices?.[0];

      if (data.usage) {
        usage = data.usage;
      }

      if (!choice?.delta) {
        continue;
      }

      const chunk = this._convertCompletionsDeltaToBaseMessageChunk(
        choice.delta,
        data,
        defaultRole as never,
      );
      defaultRole = choice.delta.role ?? defaultRole;
      const newTokenIndices = {
        prompt: options.promptIndex ?? 0,
        completion: choice.index ?? 0,
      };

      if (typeof chunk.content !== "string") {
        continue;
      }

      const generationInfo: Record<string, unknown> = {
        ...newTokenIndices,
      };

      if (choice.finish_reason != null) {
        generationInfo.finish_reason = choice.finish_reason;
        generationInfo.system_fingerprint = data.system_fingerprint;
        generationInfo.model_name = data.model;
        generationInfo.service_tier = data.service_tier;
      }

      if (this.logprobs) {
        generationInfo.logprobs = choice.logprobs;
      }

      const generationChunk = new ChatGenerationChunk({
        message: chunk,
        text: chunk.content,
        generationInfo,
      });

      yield generationChunk;

      await runManager?.handleLLMNewToken(
        generationChunk.text ?? "",
        newTokenIndices,
        undefined,
        undefined,
        undefined,
        { chunk: generationChunk },
      );
    }

    if (usage) {
      const inputTokenDetails = {
        ...(usage.prompt_tokens_details?.audio_tokens !== null &&
        usage.prompt_tokens_details?.audio_tokens !== undefined
          ? { audio: usage.prompt_tokens_details.audio_tokens }
          : {}),
        ...(usage.prompt_tokens_details?.cached_tokens !== null &&
        usage.prompt_tokens_details?.cached_tokens !== undefined
          ? { cache_read: usage.prompt_tokens_details.cached_tokens }
          : {}),
      };
      const outputTokenDetails = {
        ...(usage.completion_tokens_details?.audio_tokens !== null &&
        usage.completion_tokens_details?.audio_tokens !== undefined
          ? { audio: usage.completion_tokens_details.audio_tokens }
          : {}),
        ...(usage.completion_tokens_details?.reasoning_tokens !== null &&
        usage.completion_tokens_details?.reasoning_tokens !== undefined
          ? { reasoning: usage.completion_tokens_details.reasoning_tokens }
          : {}),
      };
      const generationChunk = new ChatGenerationChunk({
        message: new AIMessageChunk({
          content: "",
          response_metadata: {
            usage: { ...usage },
          },
          usage_metadata: {
            input_tokens: usage.prompt_tokens,
            output_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
            ...(Object.keys(inputTokenDetails).length > 0
              ? { input_token_details: inputTokenDetails }
              : {}),
            ...(Object.keys(outputTokenDetails).length > 0
              ? { output_token_details: outputTokenDetails }
              : {}),
          },
        }),
        text: "",
      });

      yield generationChunk;

      await runManager?.handleLLMNewToken(
        generationChunk.text ?? "",
        {
          prompt: 0,
          completion: 0,
        },
        undefined,
        undefined,
        undefined,
        { chunk: generationChunk },
      );
    }

    if (options.signal?.aborted) {
      throw new Error("AbortError");
    }
  }
}

// 通过注入自定义 completions 实现 provider 兼容，外部仍按普通 ChatOpenAI 使用。
export function createReasoningCompatChatOpenAI(fields: ChatOpenAIFields) {
  return new ChatOpenAI({
    ...fields,
    completions: new ReasoningCompatChatOpenAICompletions(fields),
  });
}
