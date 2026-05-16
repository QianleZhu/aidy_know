import type { UIMessage } from "ai";

import type { ChatDataParts } from "./agent-activity";

// 当前项目聊天消息类型：保留标准 message parts，并额外挂载右侧活动面板 data part。
export type ChatUIMessage = UIMessage<unknown, ChatDataParts>;

// 聊天请求体：当前阶段只消费前端传来的消息数组和 thinking 开关。
export type ChatRequestBody = {
  messages: ChatUIMessage[];
  thinkingMode?: boolean;
};
