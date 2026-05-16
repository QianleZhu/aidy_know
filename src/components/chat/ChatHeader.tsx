import { SidebarTrigger } from "../ui/sidebar";

// 聊天区顶部栏：展示会话标题，并提供左右侧边栏触发器。
export function ChatHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-4 sm:px-6 dark:border-zinc-800/50 dark:bg-zinc-950">
      {/* 左侧信息区：包含左侧边栏开关与会话标题。 */}
      <div className="flex min-w-0 items-center gap-3">
        {/* 左侧边栏触发器：控制会话列表侧边栏。 */}
        <SidebarTrigger side="left">
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
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </SidebarTrigger>

        {/* 标题文本：窄屏下允许截断，避免头部拥挤。 */}
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[15px] font-medium text-zinc-800 dark:text-zinc-200">
            NumPy 结构化数组填空题
          </h2>
          <span className="hidden text-zinc-400 sm:inline">/</span>
          <span className="hidden text-[13px] text-zinc-500 sm:inline">
            55,811 tokens
          </span>
        </div>
      </div>

      {/* 右侧操作区：保留原有按钮，并新增右侧边栏触发器。 */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* 编辑按钮：当前保留为静态视觉按钮。 */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>

        {/* 分享按钮：在小屏上隐藏，给双侧边栏触发器留出空间。 */}
        <button
          className="hidden h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 sm:flex dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        </button>

        {/* 更多按钮：在桌面端保留。 */}
        <button
          className="hidden h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 sm:flex dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        </button>

        {/* 右侧边栏触发器：控制运行设置侧边栏。 */}
        <SidebarTrigger side="right">
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
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <line x1="15" y1="4" x2="15" y2="20"></line>
          </svg>
        </SidebarTrigger>
      </div>
    </header>
  );
}
