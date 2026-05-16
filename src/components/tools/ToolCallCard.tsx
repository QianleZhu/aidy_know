// 工具调用卡片（静态占位，后续 Phase 对接 Agent 后使用真实数据）
type ToolCallCardProps = {
  name: string;
  arguments: string;
};

export function ToolCallCard({ name, arguments: args }: ToolCallCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3">
      {/* 工具名称 */}
      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
        {name}
      </p>
      {/* 工具参数 */}
      <pre className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
        {args}
      </pre>
    </div>
  );
}
