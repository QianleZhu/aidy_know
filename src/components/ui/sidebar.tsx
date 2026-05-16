"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

// 侧边栏方向类型：当前布局只需要左侧和右侧两种方向。
export type SidebarSide = "left" | "right";

// 侧边栏开关状态：分别记录左右两侧是否展开。
type SidebarState = {
  left: boolean;
  right: boolean;
};

// 上下文结构：供触发器和侧边栏容器共享状态与操作函数。
type SidebarContextValue = {
  open: SidebarState;
  setOpen: (side: SidebarSide, nextOpen: boolean) => void;
  toggleSidebar: (side: SidebarSide) => void;
};

// 侧边栏上下文：默认值为空，必须由 Provider 包裹后使用。
const SidebarContext = createContext<SidebarContextValue | null>(null);

// Provider 属性：允许传入默认展开状态。
type SidebarProviderProps = {
  children: ReactNode;
  defaultOpen?: Partial<SidebarState>;
};

// 侧边栏 Provider：统一托管左右侧边栏的开合状态。
export function SidebarProvider({
  children,
  defaultOpen,
}: SidebarProviderProps) {
  // 初始化左右侧边栏展开状态。
  const [open, setOpenState] = useState<SidebarState>({
    left: defaultOpen?.left ?? true,
    right: defaultOpen?.right ?? true,
  });

  // 显式设置指定方向侧边栏的开合状态。
  const setOpen = (side: SidebarSide, nextOpen: boolean) => {
    setOpenState((previousOpen) => ({
      ...previousOpen,
      [side]: nextOpen,
    }));
  };

  // 切换指定方向侧边栏的开合状态。
  const toggleSidebar = (side: SidebarSide) => {
    setOpenState((previousOpen) => ({
      ...previousOpen,
      [side]: !previousOpen[side],
    }));
  };

  // 记忆化上下文值，减少不必要的引用变化。
  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggleSidebar,
    }),
    [open],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

// 上下文读取 Hook：避免组件脱离 Provider 使用。
function useSidebarContext() {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("Sidebar components must be used within SidebarProvider.");
  }

  return context;
}

// 侧边栏容器属性：支持设置方向、宽度与子内容。
type SidebarProps = {
  side: SidebarSide;
  width?: string;
  children: ReactNode;
};

// 侧边栏容器：桌面端参与布局，移动端退化为抽屉式面板。
export function Sidebar({
  side,
  width = side === "left" ? "260px" : "320px",
  children,
}: SidebarProps) {
  // 获取当前方向的侧边栏开关状态。
  const { open, setOpen } = useSidebarContext();

  // 读取当前侧边栏是否展开。
  const isOpen = open[side];

  // 计算移动端收起时的平移方向。
  const mobileTranslateClass =
    side === "left"
      ? isOpen
        ? "translate-x-0"
        : "-translate-x-full"
      : isOpen
        ? "translate-x-0"
        : "translate-x-full";

  return (
    <>
      {/* 桌面端占位容器：展开时参与布局，收起时宽度归零。 */}
      <div
        className="hidden shrink-0 transition-[width] duration-200 lg:block"
        style={{ width: isOpen ? width : "0px" }}
      >
        {/* 桌面端侧边栏本体：关闭后隐藏交互，避免误触。 */}
        <aside
          className={`h-full overflow-hidden bg-white text-zinc-900 transition-opacity duration-200 dark:bg-zinc-950 dark:text-zinc-100 ${
            side === "left"
              ? "border-r border-zinc-200 dark:border-zinc-800"
              : "border-l border-zinc-200 dark:border-zinc-800"
          } ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {children}
        </aside>
      </div>

      {/* 移动端遮罩：侧边栏打开时允许点击空白区关闭。 */}
      {isOpen ? (
        <button
          aria-label="关闭侧边栏遮罩"
          className="fixed inset-0 z-30 bg-zinc-950/30 lg:hidden"
          onClick={() => setOpen(side, false)}
          type="button"
        />
      ) : null}

      {/* 移动端抽屉：从对应方向滑出，贴近 shadcn/ui 的侧边栏体验。 */}
      <div
        className={`fixed inset-y-0 z-40 w-[min(20rem,calc(100vw-1.5rem))] transform transition-transform duration-200 lg:hidden ${
          side === "left" ? "left-0" : "right-0"
        } ${mobileTranslateClass}`}
      >
        <aside
          className={`flex h-full flex-col overflow-hidden bg-white text-zinc-900 shadow-2xl dark:bg-zinc-950 dark:text-zinc-100 ${
            side === "left"
              ? "border-r border-zinc-200 dark:border-zinc-800"
              : "border-l border-zinc-200 dark:border-zinc-800"
          }`}
        >
          {children}
        </aside>
      </div>
    </>
  );
}

// 主内容容器属性：用于承载聊天区主体。
type SidebarInsetProps = {
  children: ReactNode;
};

// 主内容容器：对应 shadcn/ui 的 SidebarInset。
export function SidebarInset({ children }: SidebarInsetProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      {children}
    </div>
  );
}

// 触发器属性：指定对应侧边栏，并允许自定义内容。
type SidebarTriggerProps = {
  side: SidebarSide;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

// 通用触发器：在头部或其他位置控制左右侧边栏开合。
export function SidebarTrigger({
  side,
  children,
  className = "",
  ariaLabel,
}: SidebarTriggerProps) {
  // 获取切换函数。
  const { toggleSidebar } = useSidebarContext();

  return (
    <button
      aria-label={ariaLabel ?? `切换${side === "left" ? "左侧" : "右侧"}边栏`}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
      onClick={() => toggleSidebar(side)}
      type="button"
    >
      {children}
    </button>
  );
}
