export function EmptyChat() {
  return (
    // 空状态：居中显示欢迎信息
    <div className="flex h-full flex-1 flex-col items-center justify-center px-5 py-20">
      {/* 图标区域 */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-400 dark:text-zinc-500"
        >
          <path d="M12 2a4 4 0 0 1 4 4v2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <circle cx="12" cy="18" r="0.5" fill="currentColor" />
        </svg>
      </div>

      {/* 欢迎标题 */}
      <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
        开始新对话
      </h3>

      {/* 欢迎描述 */}
      <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
        在下方输入你的问题，AI 助手将为你提供帮助。
      </p>
    </div>
  );
}
