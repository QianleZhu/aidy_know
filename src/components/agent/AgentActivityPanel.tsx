"use client";

import { useEffect, useRef, useState } from "react";

import {
  getTimelinePreviewText,
  type ActivityTimelineChip,
  type ActivityTimelineItem,
  type ActivityTimelineSource,
} from "@/lib/types/agent-activity";

type AgentActivityPanelProps = {
  thinkingMode: boolean;
  isStreaming: boolean;
  elapsedSeconds: number;
  timelineItems: ActivityTimelineItem[];
};

const FOLLOW_THRESHOLD = 48;

// 从文本里提取域名，当前主要给思考和搜索类事件提供轻量来源提示。
function extractSourceChips(text: string) {
  const domainPattern =
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?:\/[^\s]*)?/g;
  const chips = new Set<string>();

  for (const match of text.matchAll(domainPattern)) {
    if (match[1]) {
      chips.add(match[1]);
    }
  }

  return Array.from(chips).slice(0, 3);
}

// 先把 reasoning 文本映射成统一时间线项，后续 tool_call / tool_result 也走同一结构。
export function buildReasoningTimelineItems(
  reasoningText: string,
  reasoningState: "idle" | "streaming" | "done",
  idPrefix = "reasoning",
) {
  const blocks = reasoningText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const chips = extractSourceChips(block).map((label) => ({
      label,
    }));
    const isLast = index === blocks.length - 1;

    return {
      id: `${idPrefix}-${index}`,
      kind: "reasoning",
      title: `思考片段 ${index + 1}`,
      detail: block,
      previewText: getTimelinePreviewText(block),
      chips,
      state: isLast && reasoningState === "streaming" ? "streaming" : "done",
    } satisfies ActivityTimelineItem;
  });
}

function getItemIcon(kind: ActivityTimelineItem["kind"]) {
  if (kind === "tool_call" || kind === "tool_result") {
    return "globe";
  }

  return "dot";
}

// 给 chips 和 sources 追加索引，避免同域名或同链接重复时出现重复 key。
function getTimelineChipKey(
  itemId: string,
  chip: ActivityTimelineChip,
  index: number,
) {
  return `${itemId}-chip-${index}-${chip.label}`;
}

function getTimelineSourceKey(
  itemId: string,
  source: ActivityTimelineSource,
  index: number,
) {
  return `${itemId}-source-${index}-${source.url}`;
}

function TimelineDetailDrawer({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: ActivityTimelineItem | null;
  onClose: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoFollow, setShouldAutoFollow] = useState(true);

  useEffect(() => {
    if (!open) {
      setShouldAutoFollow(true);
      return;
    }

    if (!shouldAutoFollow) {
      return;
    }

    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "auto",
    });
  }, [item?.detail, open, shouldAutoFollow]);

  if (!open || !item) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 bg-white/95 text-zinc-950 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-zinc-950">
              {item.title}
            </div>
            <div className="mt-1 text-xs text-zinc-500">详情视图</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
            aria-label="关闭详情"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div
          ref={scrollerRef}
          onScroll={(event) => {
            const target = event.currentTarget;
            const distanceToBottom =
              target.scrollHeight - target.scrollTop - target.clientHeight;
            setShouldAutoFollow(distanceToBottom < FOLLOW_THRESHOLD);
          }}
          className="flex-1 overflow-y-auto px-5 py-5"
        >
          <div className="space-y-4">
            {item.chips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {item.chips.map((chip, index) =>
                  chip.href ? (
                    <a
                      key={getTimelineChipKey(item.id, chip, index)}
                      href={chip.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
                    >
                      {chip.label}
                    </a>
                  ) : (
                    <span
                      key={getTimelineChipKey(item.id, chip, index)}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                    >
                      {chip.label}
                    </span>
                  ),
                )}
              </div>
            ) : null}

            <div className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-7 text-zinc-700">
              {item.detail}
            </div>

            {item.sources && item.sources.length > 0 ? (
              <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                {item.sources.map((source, index) => (
                  <a
                    key={getTimelineSourceKey(item.id, source, index)}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50"
                  >
                    <div className="text-sm font-medium text-zinc-900">
                      {source.title}
                    </div>
                    <div className="mt-1 truncate text-xs text-zinc-500">
                      {source.url}
                    </div>
                    {source.snippet ? (
                      <div className="mt-2 text-sm leading-6 text-zinc-700">
                        {source.snippet}
                      </div>
                    ) : null}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// 统一活动面板：只负责渲染 agent-loop 时间线，不关心事件来自 reasoning 还是 tool use。
export function AgentActivityPanel({
  thinkingMode,
  isStreaming,
  elapsedSeconds,
  timelineItems,
}: AgentActivityPanelProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [shouldAutoFollow, setShouldAutoFollow] = useState(true);

  const selectedItem =
    timelineItems.find((item) => item.id === selectedItemId) ?? null;

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    const stillExists = timelineItems.some(
      (item) => item.id === selectedItemId,
    );

    if (!stillExists) {
      setSelectedItemId(null);
    }
  }, [selectedItemId, timelineItems]);

  useEffect(() => {
    if (!shouldAutoFollow) {
      return;
    }

    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "auto",
    });
  }, [shouldAutoFollow, timelineItems]);

  const showEmptyState = !thinkingMode && timelineItems.length === 0;

  return (
    <div className="relative flex h-full flex-col bg-white text-zinc-950">
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-5">
        <div className="text-[15px] font-medium">
          活动
          <span className="ml-2 text-zinc-500">· {elapsedSeconds}s</span>
        </div>

        {isStreaming ? (
          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
            进行中
          </div>
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        onScroll={(event) => {
          const target = event.currentTarget;
          const distanceToBottom =
            target.scrollHeight - target.scrollTop - target.clientHeight;
          setShouldAutoFollow(distanceToBottom < FOLLOW_THRESHOLD);
        }}
        className="flex-1 overflow-y-auto px-5 py-5"
      >
        {showEmptyState ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
            开启思考模式后，这里会按时间线展示思考、工具调用和检索来源。
          </div>
        ) : (
          <div className="space-y-1">
            {timelineItems.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
                {thinkingMode && isStreaming
                  ? "正在接收活动内容..."
                  : "当前还没有可展示的活动轨迹。"}
              </div>
            ) : (
              timelineItems.map((item, index) => {
                const showConnector = index !== timelineItems.length - 1;
                const shouldUseDrawer =
                  item.detail !== item.previewText ||
                  (item.sources?.length ?? 0) > 0;
                const icon = getItemIcon(item.kind);

                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex w-5 flex-col items-center">
                      <span
                        className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                          item.state === "streaming"
                            ? "border-amber-200 bg-amber-50 text-amber-600"
                            : item.state === "error"
                              ? "border-red-200 bg-red-50 text-red-600"
                              : "border-zinc-200 bg-white text-zinc-500"
                        }`}
                      >
                        {icon === "globe" ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M2 12h20"></path>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                          </svg>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-current" />
                        )}
                      </span>
                      {showConnector ? (
                        <span className="mt-2 h-full w-px bg-zinc-200" />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1 pb-5">
                      <div className="text-sm font-medium leading-6 text-zinc-950">
                        {item.title}
                      </div>

                      {item.chips.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.chips.map((chip, chipIndex) =>
                            chip.href ? (
                              <a
                                key={getTimelineChipKey(item.id, chip, chipIndex)}
                                href={chip.href}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
                              >
                                {chip.label}
                              </a>
                            ) : (
                              <span
                                key={getTimelineChipKey(item.id, chip, chipIndex)}
                                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                              >
                                {chip.label}
                              </span>
                            ),
                          )}
                        </div>
                      ) : null}

                      <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                        {item.previewText}
                      </div>

                      {shouldUseDrawer ? (
                        <button
                          type="button"
                          onClick={() => setSelectedItemId(item.id)}
                          className="mt-2 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950"
                        >
                          查看详情
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <TimelineDetailDrawer
        open={selectedItem !== null}
        item={selectedItem}
        onClose={() => setSelectedItemId(null)}
      />
    </div>
  );
}
