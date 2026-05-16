import { MarkdownRenderer } from "../markdown/MarkdownRenderer";

type MessageItemProps = {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    isLoading?: boolean;
    hasThinking?: boolean;
    thinkingLabel?: string;
  };
};

// 单条消息组件：assistant 靠左展示，user 靠右展示，并在思考模式下为 assistant 显示提示条。
export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const showStreamingSkeleton =
    !isUser && message.isLoading && message.content.length < 24;
  const showThinkingBanner =
    !isUser && message.hasThinking && message.thinkingLabel;

  return (
    <div
      className={`group relative flex py-4 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex max-w-[min(85%,42rem)] gap-3 ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isUser
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
          }`}
        >
          {isUser ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8V4H8"></path>
              <rect x="4" y="8" width="16" height="12" rx="2"></rect>
              <path d="M2 14h2"></path>
              <path d="M20 14h2"></path>
              <path d="M15 13v2"></path>
              <path d="M9 13v2"></path>
            </svg>
          )}
        </div>

        <div className={`min-w-0 ${isUser ? "items-end" : "items-start"}`}>
          {showThinkingBanner ? (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {message.thinkingLabel}
            </div>
          ) : null}

          <div
            className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
              isUser
                ? "rounded-tr-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "min-h-[76px] rounded-tl-md border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            }`}
          >
            {showStreamingSkeleton ? (
              <div className="flex min-h-[52px] flex-col justify-center gap-2">
                <div className="h-3 w-40 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-56 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-32 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
              </div>
            ) : (
              isUser ? (
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              ) : (
                <MarkdownRenderer content={message.content} />
              )
            )}

            {message.isLoading ? (
              <div className="mt-3 inline-flex items-center gap-1 text-zinc-400">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
              </div>
            ) : null}
          </div>

          <div
            className={`mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            <button className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
