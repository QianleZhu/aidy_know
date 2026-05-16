// 工具结果卡片（静态占位，后续 Phase 对接 Agent 后使用真实数据）
type ToolResultCardProps = {
  success: boolean;
  content: string;
};

export function ToolResultCard({ success, content }: ToolResultCardProps) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        success
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950"
          : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950"
      }`}
    >
      {/* 结果状态标签 */}
      <p
        className={`text-xs font-medium ${
          success
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {success ? "成功" : "失败"}
      </p>
      {/* 结果内容 */}
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">
        {content}
      </p>
    </div>
  );
}
