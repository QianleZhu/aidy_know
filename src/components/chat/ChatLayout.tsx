"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { type VirtuosoHandle } from "react-virtuoso";

import { AgentActivityPanel } from "../agent/AgentActivityPanel";
import { Sidebar, SidebarInset, SidebarProvider } from "../ui/sidebar";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatSidebar } from "./ChatSidebar";
import { MessageList } from "./MessageList";
import { useSmoothStreamingMessage } from "./useSmoothStreamingMessage";
import {
  AGENT_ACTIVITY_DATA_PART_NAME,
  getTimelinePreviewText,
  type ActivityTimelineItem,
  type AgentActivityData,
} from "@/lib/types/agent-activity";
import type { ChatUIMessage } from "@/lib/types/chat";

// 统一更新单个时间线节点，避免不同事件分支重复拼接 detail / preview / state。
function updateTimelineItem(
  previousItems: ActivityTimelineItem[],
  itemId: string,
  updater: (item: ActivityTimelineItem) => ActivityTimelineItem,
) {
  return previousItems.map((item) => (item.id === itemId ? updater(item) : item));
}

// 根据后端实时事件维护右侧单时间线，避免再从 message.parts 反推顺序。
function applyAgentActivityEvent(
  previousItems: ActivityTimelineItem[],
  event: AgentActivityData,
) {
  if (event.type === "reset") {
    return [];
  }

  if (event.type === "reasoning-start") {
    return [...previousItems, event.item];
  }

  if (event.type === "reasoning-delta") {
    return updateTimelineItem(previousItems, event.id, (item) => {
      const detail = `${item.detail}${event.delta}`;

      return {
        ...item,
        detail,
        previewText: getTimelinePreviewText(detail),
      };
    });
  }

  if (event.type === "reasoning-end") {
    return updateTimelineItem(previousItems, event.id, (item) => ({
      ...item,
      state: item.state === "error" ? "error" : "done",
    }));
  }

  if (event.type === "final-answer-start") {
    return [...previousItems, event.item];
  }

  if (event.type === "final-answer-delta") {
    return updateTimelineItem(previousItems, event.id, (item) => {
      const detail = `${item.detail}${event.delta}`;

      return {
        ...item,
        detail,
        previewText: getTimelinePreviewText(detail),
      };
    });
  }

  if (event.type === "final-answer-end") {
    return updateTimelineItem(previousItems, event.id, (item) => ({
      ...item,
      state: item.state === "error" ? "error" : "done",
    }));
  }

  return [...previousItems, event.item];
}

// 聊天主布局：保留现有三栏结构，并让右侧活动面板直接消费后端 agent-loop 事件。
export function ChatLayout() {
  const [inputValue, setInputValue] = useState("");
  const [thinkingMode, setThinkingMode] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [activityStartedAt, setActivityStartedAt] = useState<number | null>(null);
  const [activityElapsedSeconds, setActivityElapsedSeconds] = useState(0);
  const [timelineItems, setTimelineItems] = useState<ActivityTimelineItem[]>([]);

  const messageListRef = useRef<VirtuosoHandle | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, error, clearError } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    experimental_throttle: 50,
    onData: (dataPart) => {
      if (dataPart.type !== `data-${AGENT_ACTIVITY_DATA_PART_NAME}`) {
        return;
      }

      setTimelineItems((previousItems) =>
        applyAgentActivityEvent(previousItems, dataPart.data),
      );
    },
  });

  const isSending = status === "submitted" || status === "streaming";
  const { viewMessages } = useSmoothStreamingMessage(messages, status, thinkingMode);

  // 发送结束后把焦点重新交还给输入框，保证连续提问的流畅性。
  useEffect(() => {
    if (isSending) {
      return;
    }

    inputRef.current?.focus();
  }, [isSending]);

  // 记录当前活动耗时：从 assistant 开始流式生成起计时，便于右侧活动时间线展示。
  useEffect(() => {
    if (isSending && activityStartedAt === null) {
      const now = Date.now();
      setActivityStartedAt(now);
      setActivityElapsedSeconds(0);
      return;
    }

    if (!isSending && activityStartedAt !== null) {
      setActivityElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - activityStartedAt) / 1000)),
      );
    }
  }, [activityStartedAt, isSending]);

  useEffect(() => {
    if (activityStartedAt === null || !isSending) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActivityElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - activityStartedAt) / 1000)),
      );
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activityStartedAt, isSending]);

  // 处理输入提交：发送前先清空右侧活动时间线，避免把上一轮链路残留到本轮。
  async function handleSubmit() {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue || isSending) {
      return;
    }

    setInputValue("");
    setShouldAutoScroll(true);
    setActivityStartedAt(Date.now());
    setActivityElapsedSeconds(0);
    setTimelineItems([]);
    clearError();

    await sendMessage(
      {
        text: trimmedValue,
        metadata: {
          thinkingMode,
        },
      },
      {
        body: {
          thinkingMode,
        },
      },
    );
  }

  // 列表到底时恢复智能跟随；离开底部时只更新视图状态。
  function handleAtBottomChange(nextIsAtBottom: boolean) {
    setIsAtBottom(nextIsAtBottom);

    if (nextIsAtBottom) {
      setShouldAutoScroll(true);
    }
  }

  // 用户主动向上浏览历史时，立即停止自动跟随。
  function handleUserNavigateUp() {
    setShouldAutoScroll(false);
  }

  // 手动回到底部时恢复跟随，并通过 Virtuoso 滚到最后一条消息。
  function handleScrollToBottom() {
    if (viewMessages.length === 0) {
      return;
    }

    setShouldAutoScroll(true);
    messageListRef.current?.scrollToIndex({
      index: viewMessages.length - 1,
      align: "end",
      behavior: "smooth",
    });
  }

  const showScrollToBottomButton = viewMessages.length > 0 && !isAtBottom;

  return (
    <SidebarProvider defaultOpen={{ left: true, right: true }}>
      <div className="flex h-screen w-full overflow-hidden bg-white font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Sidebar side="left" width="260px">
          <ChatSidebar />
        </Sidebar>

        <SidebarInset>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0">
              <ChatHeader />
            </div>

            <div className="min-h-0 flex-1">
              <MessageList
                ref={messageListRef}
                messages={viewMessages}
                shouldAutoScroll={shouldAutoScroll}
                isStreaming={status === "streaming"}
                onAtBottomChange={handleAtBottomChange}
                onUserNavigateUp={handleUserNavigateUp}
              />
            </div>

            {showScrollToBottomButton ? (
              <div className="pointer-events-none absolute right-0 bottom-36 left-0 flex justify-center px-4">
                <button
                  type="button"
                  onClick={handleScrollToBottom}
                  className="pointer-events-auto rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  回到底部
                </button>
              </div>
            ) : null}

            <div className="shrink-0 border-t border-zinc-200 bg-gradient-to-t from-white via-white to-zinc-50/70 px-4 pt-4 pb-6 sm:px-6 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/70">
              {error ? (
                <div className="mx-auto mb-3 w-full max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {error.message}
                </div>
              ) : null}

              <ChatInput
                ref={inputRef}
                value={inputValue}
                isSending={isSending}
                thinkingMode={thinkingMode}
                onThinkingModeChange={setThinkingMode}
                onValueChange={(nextValue) => {
                  if (error) {
                    clearError();
                  }

                  setInputValue(nextValue);
                }}
                onSubmit={() => {
                  void handleSubmit();
                }}
              />
            </div>
          </div>
        </SidebarInset>

        <Sidebar side="right" width="320px">
          <AgentActivityPanel
            thinkingMode={thinkingMode}
            isStreaming={status === "streaming"}
            elapsedSeconds={activityElapsedSeconds}
            timelineItems={timelineItems}
          />
        </Sidebar>
      </div>
    </SidebarProvider>
  );
}
