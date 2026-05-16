import { handleChatRequest } from "@/lib/chat/handle-chat-request";

// /api/chat 路由入口：仅负责把 POST 请求交给聊天处理器。
export async function POST(request: Request) {
  return handleChatRequest(request);
}
