import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

import { streamChat } from "@/lib/llm/stream-chat";
import {
  formatSearchWebDetail,
  type SearchWebOutput,
} from "@/lib/tools/search-web";
import {
  AGENT_ACTIVITY_DATA_PART_NAME,
  getTimelinePreviewText,
  type ActivityTimelineItem,
  type AgentActivityData,
} from "@/lib/types/agent-activity";
import type { ChatRequestBody, ChatUIMessage } from "@/lib/types/chat";

// 校验并读取聊天请求体：当前阶段需要消息数组，并允许前端显式控制思考模式。
async function readChatRequestBody(request: Request): Promise<ChatRequestBody> {
  const requestBody = (await request.json()) as Partial<ChatRequestBody>;

  if (!Array.isArray(requestBody.messages)) {
    throw new Error("Invalid chat request: messages must be an array.");
  }

  return {
    messages: requestBody.messages as ChatUIMessage[],
    thinkingMode: requestBody.thinkingMode === true,
  };
}

// 将联网搜索结果映射成时间线来源信息，供前端直接渲染可点击来源 chips 和详情。
function buildSearchWebSources(output: SearchWebOutput) {
  return output.sources.map((source) => ({
    title: source.title,
    url: source.url,
    snippet: source.snippet,
  }));
}

// 工具输入预览：统一转成可读文本，供右侧时间线展示。
function getToolInputPreview(input: unknown) {
  if (typeof input === "string") {
    return input;
  }

  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return "工具输入无法序列化。";
  }
}

// 从 URL 提取域名，当前主要用于来源 chips。
function getDomainLabel(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// 发出右侧活动面板专用的 transient data 事件，不写入 message.parts。
function emitAgentActivity(
  writer: {
    write: (chunk: {
      type: `data-${typeof AGENT_ACTIVITY_DATA_PART_NAME}`;
      data: AgentActivityData;
      transient: true;
    }) => void;
  },
  data: AgentActivityData,
) {
  writer.write({
    type: `data-${AGENT_ACTIVITY_DATA_PART_NAME}`,
    data,
    transient: true,
  });
}

// 处理聊天请求：把 LangChain 的 reasoning / tool / text 多阶段流映射为 UI message stream。
export async function handleChatRequest(request: Request) {
  try {
    const { messages, thinkingMode } = await readChatRequestBody(request);
    const responseMessageId = crypto.randomUUID();
    const responseTextPartId = crypto.randomUUID();
    const responseReasoningPartId = crypto.randomUUID();
    let reasoningPartClosed = !thinkingMode;
    let activeReasoningTimelineId: string | null = null;
    let reasoningSectionIndex = 0;
    let hasResponseText = false;

    const stream = createUIMessageStream<ChatUIMessage>({
      execute: async ({ writer }) => {
        // 每次新回答开始时，先清空右侧单时间线。
        emitAgentActivity(writer, {
          type: "reset",
        });

        writer.write({
          type: "start",
          messageId: responseMessageId,
        });

        writer.write({
          type: "text-start",
          id: responseTextPartId,
        });

        if (thinkingMode) {
          writer.write({
            type: "reasoning-start",
            id: responseReasoningPartId,
          });
        }

        // 开启新的 reasoning timeline item，只影响右侧活动面板。
        function ensureReasoningTimelineItem() {
          if (activeReasoningTimelineId !== null) {
            return activeReasoningTimelineId;
          }

          activeReasoningTimelineId = crypto.randomUUID();
          reasoningSectionIndex += 1;

          const item: ActivityTimelineItem = {
            id: activeReasoningTimelineId,
            kind: "reasoning",
            title: `思考片段 ${reasoningSectionIndex}`,
            detail: "",
            previewText: "",
            chips: [],
            state: "streaming",
          };

          emitAgentActivity(writer, {
            type: "reasoning-start",
            item,
          });

          return activeReasoningTimelineId;
        }

        // 关闭当前 reasoning timeline item，确保下一段思考会落到工具结果之后。
        function closeReasoningTimelineItem() {
          if (activeReasoningTimelineId === null) {
            return;
          }

          emitAgentActivity(writer, {
            type: "reasoning-end",
            id: activeReasoningTimelineId,
          });
          activeReasoningTimelineId = null;
        }

        // 统一写入 assistant 正文增量：首次正文出现时同步结束 reasoning 展示，避免工具后空消息消失。
        function writeAssistantTextDelta(delta: string) {
          if (delta.length === 0) {
            return;
          }

          if (thinkingMode && !reasoningPartClosed) {
            writer.write({
              type: "reasoning-end",
              id: responseReasoningPartId,
            });
            reasoningPartClosed = true;
          }

          closeReasoningTimelineItem();
          hasResponseText = true;

          writer.write({
            type: "text-delta",
            id: responseTextPartId,
            delta,
          });
        }

        await streamChat({
          messages,
          thinkingMode,
          onReasoningDelta: (delta) => {
            if (!thinkingMode || reasoningPartClosed) {
              return;
            }

            const reasoningTimelineId = ensureReasoningTimelineItem();

            emitAgentActivity(writer, {
              type: "reasoning-delta",
              id: reasoningTimelineId,
              delta,
            });

            writer.write({
              type: "reasoning-delta",
              id: responseReasoningPartId,
              delta,
            });
          },
          onTextDelta: (delta) => {
            writeAssistantTextDelta(delta);
          },
          onToolInputAvailable: ({ toolCallId, toolName, input, title }) => {
            const detail = getToolInputPreview(input);
            const toolCallItem: ActivityTimelineItem = {
              id: `tool_call:${toolCallId}`,
              kind: "tool_call",
              title:
                typeof title === "string" && title.trim().length > 0
                  ? title
                  : `正在调用工具：${toolName}`,
              detail,
              previewText: getTimelinePreviewText(detail),
              chips: [
                {
                  label: toolName,
                },
              ],
              state: "done",
            };

            closeReasoningTimelineItem();

            emitAgentActivity(writer, {
              type: "tool-call",
              item: toolCallItem,
            });

            writer.write({
              type: "tool-input-available",
              toolCallId,
              toolName,
              input,
              dynamic: true,
              title,
            });
          },
          onToolOutputAvailable: ({ toolCallId, output }) => {
            const detail = formatSearchWebDetail(output);
            const sources = buildSearchWebSources(output);
            const toolResultItem: ActivityTimelineItem = {
              id: `tool_result:${toolCallId}`,
              kind: "tool_result",
              title: "联网搜索结果",
              detail,
              previewText: getTimelinePreviewText(detail),
              chips:
                sources.slice(0, 4).map((source) => ({
                  label: getDomainLabel(source.url),
                  href: source.url,
                })) ?? [],
              state: "done",
              sources,
            };

            emitAgentActivity(writer, {
              type: "tool-result",
              item:
                toolResultItem.chips.length > 0
                  ? toolResultItem
                  : {
                      ...toolResultItem,
                      chips: [
                        {
                          label: "search_web",
                        },
                      ],
                    },
            });

            writer.write({
              type: "tool-output-available",
              toolCallId,
              output: {
                detail,
                sources,
                answer: output.answer,
                query: output.query,
              },
              dynamic: true,
            });
          },
          onToolOutputError: ({ toolCallId, errorText }) => {
            const toolResultItem: ActivityTimelineItem = {
              id: `tool_result:${toolCallId}`,
              kind: "tool_result",
              title: "联网搜索失败",
              detail: errorText,
              previewText: getTimelinePreviewText(errorText),
              chips: [
                {
                  label: "search_web",
                },
              ],
              state: "error",
            };

            emitAgentActivity(writer, {
              type: "tool-result",
              item: toolResultItem,
            });

            writer.write({
              type: "tool-output-error",
              toolCallId,
              errorText,
              dynamic: true,
            });
          },
          onFinalAnswerAvailable: ({ round, text }) => {
            const finalAnswerTimelineId = `final_answer:${round}`;
            const finalAnswerDetail =
              text.trim().length > 0 ? text : "已生成最终回答。";
            const finalAnswerItem: ActivityTimelineItem = {
              id: finalAnswerTimelineId,
              kind: "final_answer",
              title: "最终回答",
              detail: "",
              previewText: "",
              chips: [],
              state: "streaming",
            };

            emitAgentActivity(writer, {
              type: "final-answer-start",
              item: finalAnswerItem,
            });

            emitAgentActivity(writer, {
              type: "final-answer-delta",
              id: finalAnswerTimelineId,
              delta: finalAnswerDetail,
            });

            emitAgentActivity(writer, {
              type: "final-answer-end",
              id: finalAnswerTimelineId,
            });

            if (!hasResponseText) {
              writeAssistantTextDelta(finalAnswerDetail);
            }
          },
        });

        if (thinkingMode && !reasoningPartClosed) {
          writer.write({
            type: "reasoning-end",
            id: responseReasoningPartId,
          });
          reasoningPartClosed = true;
        }

        closeReasoningTimelineItem();

        writer.write({
          type: "text-end",
          id: responseTextPartId,
        });

        writer.write({
          type: "finish",
        });
      },
      onError: (error) => {
        if (error instanceof Error) {
          return error.message;
        }

        return "Chat request failed.";
      },
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Chat request failed.";

    return Response.json(
      {
        message: errorMessage,
      },
      {
        status: 400,
      },
    );
  }
}
