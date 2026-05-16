"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";

import { EmptyChat } from "./EmptyChat";
import { MessageItem } from "./MessageItem";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  hasThinking?: boolean;
  thinkingLabel?: string;
};

type MessageListProps = {
  messages: ChatMessage[];
  shouldAutoScroll: boolean;
  isStreaming: boolean;
  onAtBottomChange: (isAtBottom: boolean) => void;
  onUserNavigateUp: () => void;
};

// 消息列表组件：使用 Virtuoso 提供虚拟滚动和聊天场景的智能跟随能力。
export const MessageList = forwardRef<VirtuosoHandle, MessageListProps>(
  function MessageList(
    {
      messages,
      shouldAutoScroll,
      isStreaming,
      onAtBottomChange,
      onUserNavigateUp,
    }: MessageListProps,
    ref,
  ) {
    const [scrollerElement, setScrollerElement] = useState<HTMLElement | null>(
      null,
    );
    const previousScrollTopRef = useRef(0);

    // 记录用户主动向上滚动或向上拖动滚动条的意图，立即停止智能跟随。
    useEffect(() => {
      if (!scrollerElement) {
        return;
      }

      function handleWheel(event: globalThis.WheelEvent) {
        if (event.deltaY < 0) {
          onUserNavigateUp();
        }
      }

      function handleScroll(event: Event) {
        const currentTarget = event.currentTarget;

        if (!(currentTarget instanceof HTMLElement)) {
          return;
        }

        const currentScrollTop = currentTarget.scrollTop;

        if (currentScrollTop < previousScrollTopRef.current) {
          onUserNavigateUp();
        }

        previousScrollTopRef.current = currentScrollTop;
      }

      previousScrollTopRef.current = scrollerElement.scrollTop;

      scrollerElement.addEventListener("wheel", handleWheel, {
        passive: true,
      });
      scrollerElement.addEventListener("scroll", handleScroll, {
        passive: true,
      });

      return () => {
        scrollerElement.removeEventListener("wheel", handleWheel);
        scrollerElement.removeEventListener("scroll", handleScroll);
      };
    }, [onUserNavigateUp, scrollerElement]);

    if (messages.length === 0) {
      return <EmptyChat />;
    }

    return (
      <Virtuoso
        ref={ref}
        data={messages}
        className="h-full"
        increaseViewportBy={{ top: 320, bottom: 320 }}
        atBottomThreshold={48}
        atBottomStateChange={onAtBottomChange}
        computeItemKey={(_, message) => message.id}
        scrollerRef={(element) =>
          setScrollerElement(element instanceof HTMLElement ? element : null)
        }
        followOutput={(isAtBottom) => {
          if (!shouldAutoScroll || !isAtBottom) {
            return false;
          }

          return isStreaming ? true : "smooth";
        }}
        components={{
          Header: () => <div className="h-8" />,
          Footer: () => <div className="h-8" />,
        }}
        itemContent={(_, message) => (
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <MessageItem message={message} />
          </div>
        )}
      />
    );
  },
);
