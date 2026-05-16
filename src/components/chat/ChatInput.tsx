"use client";

import {
  forwardRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Switch } from "../ui/switch";

type ChatInputProps = {
  value: string;
  isSending: boolean;
  thinkingMode: boolean;
  onThinkingModeChange: (enabled: boolean) => void;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
};

// 底部输入框组件：负责受控输入、发送事件，并提供思考模式开关。
export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    {
      value,
      isSending,
      thinkingMode,
      onThinkingModeChange,
      onValueChange,
      onSubmit,
    }: ChatInputProps,
    ref,
  ) {
    const canSubmit = value.trim().length > 0 && !isSending;

    // 表单提交时阻止默认行为，并把发送逻辑交给外层容器。
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();

      if (!canSubmit) {
        return;
      }

      onSubmit();
    }

    // 支持回车发送、Shift + Enter 换行，贴近常见聊天输入体验。
    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }

      event.preventDefault();

      if (!canSubmit) {
        return;
      }

      onSubmit();
    }

    return (
      <form className="mx-auto w-full max-w-4xl" onSubmit={handleSubmit}>
        <div className="flex flex-col overflow-hidden rounded-[24px] border border-zinc-200 bg-[#f4f6f8] shadow-sm transition-all focus-within:border-zinc-400 focus-within:ring-1 focus-within:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-500 dark:focus-within:ring-zinc-700">
          <textarea
            ref={ref}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题，Shift + Enter 换行"
            className="min-h-[88px] w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] text-zinc-800 outline-none placeholder:text-zinc-500 read-only:cursor-not-allowed read-only:opacity-70 dark:text-zinc-200"
            readOnly={isSending}
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                type="button"
              >
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
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
                Tools
              </button>

              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <Switch
                  checked={thinkingMode}
                  onCheckedChange={onThinkingModeChange}
                  disabled={isSending}
                  ariaLabel="切换思考模式"
                />
                <span>思考模式</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-zinc-400 sm:inline-block">
                {isSending ? "生成中..." : "Enter 发送"}
              </span>

              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
                type="submit"
                disabled={!canSubmit}
              >
                {isSending ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="animate-spin"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                      opacity="0.25"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
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
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    );
  },
);
