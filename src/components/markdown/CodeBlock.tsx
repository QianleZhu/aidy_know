"use client";

import { memo, useEffect, useState, type ReactNode } from "react";

type CodeBlockProps = {
  code: string;
  language?: string;
  children: ReactNode;
};

function normalizeCopiedCode(code: string) {
  return code.endsWith("\n") ? code.slice(0, -1) : code;
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

// 代码块组件：负责语言标签、横向滚动和复制交互。
function CodeBlockComponent({ code, language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const displayLanguage = language ?? "text";

  // 复制成功后短暂展示确认状态，避免按钮长期停留在“已复制”。
  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copied]);

  async function handleCopy() {
    await copyToClipboard(normalizeCopiedCode(code));
    setCopied(true);
  }

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm">
      <div className="flex h-9 items-center justify-between gap-3 border-b border-white/10 bg-zinc-900/90 px-3">
        <span className="min-w-0 truncate text-xs font-medium text-zinc-300">
          {displayLanguage}
        </span>

        <button
          type="button"
          onClick={() => {
            void handleCopy();
          }}
          className="inline-flex h-7 shrink-0 items-center rounded-md border border-white/10 px-2 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
          aria-label={copied ? "代码已复制" : "复制代码"}
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <pre className="m-0 min-h-[72px] min-w-full bg-transparent p-4 text-[13px] leading-6 [tab-size:2]">
          {children}
        </pre>
      </div>
    </div>
  );
}

export const CodeBlock = memo(CodeBlockComponent);
