import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type AIMessageChunk,
  type BaseMessage,
  type BaseMessageChunk,
} from "@langchain/core/messages";
import { isReasoningUIPart, isTextUIPart, type UIMessage } from "ai";

import {
  createSearchWebTool,
  formatSearchWebDetail,
  normalizeSearchWebOutput,
  type SearchWebInput,
  type SearchWebOutput,
} from "@/lib/tools/search-web";

import { createChatModel } from "./create-chat-model";

type StreamChatParams = {
  messages: UIMessage[];
  thinkingMode?: boolean;
  onReasoningDelta?: (delta: string) => void | Promise<void>;
  onTextDelta: (delta: string) => void | Promise<void>;
  onToolInputAvailable?: (payload: {
    toolCallId: string;
    toolName: string;
    input: unknown;
    title?: string;
  }) => void | Promise<void>;
  onToolOutputAvailable?: (payload: {
    toolCallId: string;
    output: SearchWebOutput;
  }) => void | Promise<void>;
  onToolOutputError?: (payload: {
    toolCallId: string;
    errorText: string;
  }) => void | Promise<void>;
  onFinalAnswerAvailable?: (payload: {
    round: number;
    text: string;
  }) => void | Promise<void>;
};

type LangChainToolCall = {
  id?: string;
  name?: string;
  args?: unknown;
};

type StreamableChatModel = {
  stream: (input: BaseMessage[]) => Promise<AsyncIterable<BaseMessageChunk>>;
};

// 提取 UIMessage 中的纯文本内容：当前对话主消息仍然以文本内容为主。
function getTextFromUIMessage(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

// 提取 UIMessage 中的思考内容：后续工具调用阶段需要把它一并保存在消息结构里。
function getReasoningFromUIMessage(message: UIMessage) {
  return message.parts
    .filter(isReasoningUIPart)
    .map((part) => part.text)
    .join("");
}

// 将前端 UIMessage 转为 LangChain 消息：assistant 额外挂上 reasoning_content，便于后续扩展工具链路。
function toLangChainMessages(messages: UIMessage[]): BaseMessage[] {
  const langChainMessages: BaseMessage[] = [];

  messages.forEach((message) => {
    const content = getTextFromUIMessage(message).trim();
    const reasoningContent = getReasoningFromUIMessage(message).trim();

    if (!content && !reasoningContent) {
      return;
    }

    if (message.role === "user") {
      langChainMessages.push(new HumanMessage(content));
      return;
    }

    if (message.role === "assistant") {
      langChainMessages.push(
        new AIMessage({
          content,
          additional_kwargs: reasoningContent
            ? {
                reasoning_content: reasoningContent,
              }
            : {},
        }),
      );
      return;
    }

    if (message.role === "system") {
      langChainMessages.push(new SystemMessage(content));
    }
  });

  return langChainMessages;
}

// 把可能是数组的内容压平成字符串，兼容 LangChain 的多模态 content 表示。
function getChunkTextContent(content: BaseMessageChunk["content"]) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }

      return "";
    })
    .join("");
}

// 聚合 LangChain 流式 chunk，便于在结束后读取完整 tool_calls。
function mergeChunk(
  aggregatedChunk: AIMessageChunk | null,
  chunk: BaseMessageChunk,
) {
  if (aggregatedChunk === null) {
    return chunk as AIMessageChunk;
  }

  return aggregatedChunk.concat(chunk as AIMessageChunk);
}

// 搜索工具的时间线标题统一放在这里，避免前后端文案漂移。
function getToolCallTitle(input: unknown) {
  const query =
    typeof input === "object" &&
    input !== null &&
    "query" in input &&
    typeof input.query === "string"
      ? input.query
      : "未知搜索请求";

  return `正在联网搜索：${query}`;
}

// 执行单次模型流：一边向前端推 reasoning/text，一边聚合完整的 AIMessageChunk。
async function streamSingleAssistantTurn({
  model,
  messages,
  onReasoningDelta,
  onTextDelta,
}: {
  model: StreamableChatModel;
  messages: BaseMessage[];
  onReasoningDelta?: (delta: string) => void | Promise<void>;
  onTextDelta: (delta: string) => void | Promise<void>;
}) {
  const stream = await model.stream(messages);
  let aggregatedChunk: AIMessageChunk | null = null;

  for await (const chunk of stream) {
    aggregatedChunk = mergeChunk(aggregatedChunk, chunk);

    const reasoningDelta = chunk.additional_kwargs?.reasoning_content;
    const textDelta = getChunkTextContent(chunk.content);

    if (typeof reasoningDelta === "string" && reasoningDelta.length > 0) {
      await onReasoningDelta?.(reasoningDelta);
    }

    if (textDelta.length > 0) {
      await onTextDelta(textDelta);
    }
  }

  return aggregatedChunk;
}

// 执行工具调用：当前只接入 Tavily 联网搜索，但保留后续继续扩展的分支结构。
async function executeToolCall({
  toolName,
  args,
  toolCallId,
}: {
  toolName: string;
  args: unknown;
  toolCallId: string;
}) {
  if (toolName !== "search_web") {
    throw new Error(`Unsupported tool: ${toolName}`);
  }

  const tool = createSearchWebTool();
  const rawOutput = await tool.invoke(args as SearchWebInput);

  if (
    typeof args !== "object" ||
    args === null ||
    !("query" in args) ||
    typeof args.query !== "string"
  ) {
    throw new Error("Invalid search_web tool input.");
  }

  const output = normalizeSearchWebOutput(args.query, rawOutput);

  return {
    toolCallId,
    toolName,
    output,
    textForModel: formatSearchWebDetail(output),
  };
}

// 提取最终 tool_calls：优先读规范字段，兼容 provider 放在 additional_kwargs 里的情况。
function getToolCallsFromChunk(chunk: AIMessageChunk | null): LangChainToolCall[] {
  if (!chunk) {
    return [];
  }

  if (Array.isArray(chunk.tool_calls) && chunk.tool_calls.length > 0) {
    return chunk.tool_calls as LangChainToolCall[];
  }

  const rawToolCalls = chunk.additional_kwargs?.tool_calls;

  if (Array.isArray(rawToolCalls) && rawToolCalls.length > 0) {
    return rawToolCalls as LangChainToolCall[];
  }

  return [];
}

function truncateText(text: string, maxLength = 1200) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n\n...`;
}

function buildFallbackAssistantText({
  lastToolText,
  hadToolCall,
}: {
  lastToolText: string;
  hadToolCall: boolean;
}) {
  if (lastToolText.trim().length > 0) {
    return `我已完成工具调用，但模型没有输出最终正文。以下是当前可用结果：\n\n${truncateText(
      lastToolText,
    )}`;
  }

  if (hadToolCall) {
    return "我已完成工具调用，但模型没有输出最终正文。请基于右侧活动面板中的工具结果继续查看，或重新追问一次。";
  }

  return "当前没有生成可展示的回答，请重试一次。";
}

// 执行最小 Agent Loop：统一承接 reasoning、tool_call、tool_result、最终回答。
export async function streamChat({
  messages,
  thinkingMode = false,
  onReasoningDelta,
  onTextDelta,
  onToolInputAvailable,
  onToolOutputAvailable,
  onToolOutputError,
  onFinalAnswerAvailable,
}: StreamChatParams) {
  const baseModel = createChatModel({
    thinkingMode,
  });
  const searchWebTool = createSearchWebTool();
  const modelWithTools = baseModel.bindTools([searchWebTool]);
  const conversationMessages = toLangChainMessages(messages);
  let roundNumber = 1;
  let lastToolText = "";
  let hadToolCall = false;

  while (true) {
    const aggregatedChunk = await streamSingleAssistantTurn({
      model: modelWithTools,
      messages: conversationMessages,
      onReasoningDelta,
      onTextDelta,
    });

    const toolCalls = getToolCallsFromChunk(aggregatedChunk);

    if (toolCalls.length === 0) {
      const finalAnswerText = getChunkTextContent(aggregatedChunk?.content ?? "").trim();
      const finalAnswerOrFallback =
        finalAnswerText.length > 0
          ? finalAnswerText
          : buildFallbackAssistantText({
              lastToolText,
              hadToolCall,
            });

      await onFinalAnswerAvailable?.({
        round: roundNumber,
        text: finalAnswerOrFallback,
      });

      return;
    }

    // 把本轮 assistant 的 tool_calls 记录进消息上下文，供后续 tool result 回传给模型。
    conversationMessages.push(
      new AIMessage({
        content: getChunkTextContent(aggregatedChunk?.content ?? ""),
        tool_calls: toolCalls.map((toolCall, index) => ({
          id: toolCall.id ?? crypto.randomUUID(),
          name: toolCall.name ?? `tool_${index + 1}`,
          args: toolCall.args ?? {},
        })),
        additional_kwargs:
          aggregatedChunk?.additional_kwargs &&
          typeof aggregatedChunk.additional_kwargs === "object"
            ? aggregatedChunk.additional_kwargs
            : {},
      }),
    );

    for (const toolCall of toolCalls) {
      hadToolCall = true;
      const toolCallId = toolCall.id ?? crypto.randomUUID();
      const toolName = toolCall.name ?? "unknown_tool";
      const toolInput = toolCall.args ?? {};

      await onToolInputAvailable?.({
        toolCallId,
        toolName,
        input: toolInput,
        title: getToolCallTitle(toolInput),
      });

      try {
        const result = await executeToolCall({
          toolName,
          args: toolInput,
          toolCallId,
        });

        await onToolOutputAvailable?.({
          toolCallId,
          output: result.output,
        });

        lastToolText = result.textForModel;

        // 将工具结果回灌给模型，进入下一轮 agent loop。
        conversationMessages.push(
          new ToolMessage({
            tool_call_id: toolCallId,
            content: result.textForModel,
          }),
        );
      } catch (error) {
        const errorText =
          error instanceof Error ? error.message : "Tool execution failed.";

        await onToolOutputError?.({
          toolCallId,
          errorText,
        });

        lastToolText = `工具执行失败：${errorText}`;

        conversationMessages.push(
          new ToolMessage({
            tool_call_id: toolCallId,
            content: `工具执行失败：${errorText}`,
          }),
        );
      }
    }

    roundNumber += 1;
  }
}
