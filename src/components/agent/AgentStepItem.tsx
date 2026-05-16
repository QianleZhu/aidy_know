type AgentStepItemProps = {
  step: {
    id: string;
    title: string;
    status: "done" | "running" | "pending";
  };
};

// 单条 Agent 步骤指示器：展示执行状态并保持时间线式信息密度。
export function AgentStepItem({ step }: AgentStepItemProps) {
  const isRunning = step.status === "running";
  const isDone = step.status === "done";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200/80 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mt-0.5">
        {isDone ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-500"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        ) : isRunning ? (
          <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
        ) : (
          <div className="h-3.5 w-3.5 rounded-full border-2 border-zinc-300 dark:border-zinc-600"></div>
        )}
      </div>

      <div className="flex-1">
        <p
          className={`text-sm leading-5 ${
            isRunning
              ? "font-medium text-zinc-900 dark:text-zinc-100"
              : isDone
                ? "text-zinc-700 dark:text-zinc-300"
                : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {step.title}
        </p>
      </div>
    </div>
  );
}
