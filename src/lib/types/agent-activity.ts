// 右侧 agent-loop 时间线节点状态。
export type ActivityTimelineItemState = "streaming" | "done" | "error";

// 时间线节点上的轻量标签，用于展示工具名或来源域名。
export type ActivityTimelineChip = {
  label: string;
  href?: string;
};

// 时间线节点的来源信息，用于详情抽屉。
export type ActivityTimelineSource = {
  title: string;
  url: string;
  snippet?: string;
};

// 右侧统一时间线节点结构。
export type ActivityTimelineItem = {
  id: string;
  kind: "reasoning" | "tool_call" | "tool_result" | "final_answer";
  title: string;
  detail: string;
  previewText: string;
  chips: ActivityTimelineChip[];
  state: ActivityTimelineItemState;
  sources?: ActivityTimelineSource[];
};

// 自定义 data part 名称，专门承载右侧 agent-loop 实时事件。
export const AGENT_ACTIVITY_DATA_PART_NAME = "agent-activity" as const;

// 单个 data part 的事件载荷。
export type AgentActivityData =
  | {
      type: "reset";
    }
  | {
      type: "reasoning-start";
      item: ActivityTimelineItem;
    }
  | {
      type: "reasoning-delta";
      id: string;
      delta: string;
    }
  | {
      type: "reasoning-end";
      id: string;
    }
  | {
      type: "tool-call";
      item: ActivityTimelineItem;
    }
  | {
      type: "tool-result";
      item: ActivityTimelineItem;
    }
  | {
      type: "final-answer-start";
      item: ActivityTimelineItem;
    }
  | {
      type: "final-answer-delta";
      id: string;
      delta: string;
    }
  | {
      type: "final-answer-end";
      id: string;
    };

// useChat 里声明自定义 data part 类型。
export type ChatDataParts = {
  [AGENT_ACTIVITY_DATA_PART_NAME]: AgentActivityData;
};

// 时间线正文默认只展示短预览，长内容交给详情抽屉。
export function getTimelinePreviewText(text: string, charLimit = 50) {
  if (text.length <= charLimit) {
    return text;
  }

  return `${text.slice(0, charLimit)}...`;
}
