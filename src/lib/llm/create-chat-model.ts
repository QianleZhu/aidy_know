import { createReasoningCompatChatOpenAI } from "./reasoning-compat-chat-openai";

type CreateChatModelParams = {
  thinkingMode?: boolean;
};

// 创建 LangChain 聊天模型：统一承接 OpenAI-compatible 网关与 DeepSeek 思考模式配置。
export function createChatModel({
  thinkingMode = false,
}: CreateChatModelParams = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const baseURL = process.env.OPENAI_BASE_URL;
  const modelName = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT ?? "high";

  return createReasoningCompatChatOpenAI({
    apiKey,
    model: modelName,
    streaming: true,
    temperature: 0.7,
    // 通过 modelKwargs 透传 DeepSeek OpenAI-compatible 的思考模式参数。
    modelKwargs: {
      extra_body: {
        thinking: {
          type: thinkingMode ? "enabled" : "disabled",
        },
      },
      reasoning_effort: thinkingMode ? reasoningEffort : undefined,
    },
    configuration: baseURL
      ? {
          baseURL,
        }
      : undefined,
  });
}
