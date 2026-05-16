// 左侧会话侧边栏内容：只负责内容本身，由外层 Sidebar 组件负责布局与开合。
export function ChatSidebar() {
  return (
    <div className="flex h-full flex-col bg-[#f8f9fa] dark:bg-zinc-900">
      {/* 标题区域：与主聊天区头部高度对齐。 */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <span className="text-lg font-medium tracking-tight text-zinc-800 dark:text-zinc-200">
          Google AI Studio
        </span>
      </div>

      {/* 主导航菜单：当前仍保持静态占位。 */}
      <div className="flex flex-col gap-1 px-3 py-2">
        {/* Playground：示例选中项。 */}
        <button
          className="flex items-center gap-3 rounded-full bg-[#e8f0fe] px-3 py-2 text-blue-700 transition-colors dark:bg-blue-900/30 dark:text-blue-300"
          type="button"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="text-sm font-medium">Playground</span>
        </button>

        {/* History：普通导航项。 */}
        <button
          className="flex items-center gap-3 rounded-full px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          type="button"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span className="text-sm font-medium">History</span>
        </button>
      </div>

      {/* Build 分组标题：保持简洁的工程化导航层次。 */}
      <div className="mt-2 px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500">
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
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          Build
        </div>
      </div>

      {/* Build 子项：继续沿用现有信息架构。 */}
      <div className="flex flex-col gap-1 px-3">
        <button
          className="flex items-center gap-3 rounded-full px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          type="button"
        >
          <span className="text-sm font-medium">Apps</span>
        </button>

        <button
          className="flex items-center gap-3 rounded-full px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          type="button"
        >
          <span className="text-sm font-medium">Gallery</span>
        </button>

        <button
          className="flex items-center gap-3 rounded-full px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          type="button"
        >
          <span className="text-sm font-medium">Dashboard</span>
        </button>

        <button
          className="mt-2 flex items-center gap-3 rounded-full px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          type="button"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span className="text-sm font-medium">Documentation</span>
        </button>
      </div>

      {/* 底部设置区：跟随侧边栏一起折叠，不再固定在视口边缘。 */}
      <div className="mt-auto border-t border-zinc-200 p-4 dark:border-zinc-800">
        <button
          className="flex w-full items-center gap-3 px-2 py-2 text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          type="button"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}
