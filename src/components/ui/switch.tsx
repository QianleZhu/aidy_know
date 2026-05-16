"use client";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

// 开关组件：参考 shadcn/ui Switch 的视觉与交互语义，保持当前项目零额外依赖。
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          return;
        }

        onCheckedChange(!checked);
      }}
      className={`peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent shadow-xs outline-none transition-all focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-950 ${
        checked
          ? "bg-zinc-900 dark:bg-zinc-100"
          : "bg-zinc-300 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white ring-0 transition-transform dark:bg-zinc-900 ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
