<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md

# AI Engineering Assistant 项目协作指南

本文件用于约束 Codex、Claude Code、Cursor Agent 或其他 AI 编程助手在本项目中的行为。

请所有 AI 助手在修改代码前先阅读本文件。

---

## 1. 项目定位

本项目是一个面向工程学习、项目知识管理和智能问答的 AI Engineering Assistant。

最终目标是实现一个具备以下能力的系统：

- ChatGPT-like 多轮对话
- 流式输出
- Agent Tool Use: Web Search 外部信息检索
- 前端工具调用过程可视化, Citation 引用来源展示
- 文档上传
- Docs RAG 检索
- Wiki 知识管理
- Code Grep 代码检索
- Router 证据路由

但是当前阶段不要一次性实现所有能力。

当前优先级是：

```txt
1. 前后端基础对话功能
2. 会话和消息持久化
3. Agent Runtime 最小闭环
4. 前端工具调用面板
5. Agent Tool Use: Web Search 外部信息检索
6. 文档上传和 Docs RAG
7. Citation 引用系统
8. Wiki / Code Grep 
```

---

## 2. 交流语言和代码规范

### 2.1 交流语言

项目讨论、解释、总结、任务说明，统一使用中文。

### 2.2 代码命名

代码中的变量、函数、类型、文件名，使用英文。

推荐：

```ts
const conversationId = "xxx";
const toolCallId = "xxx";
function runAgent() {}
type ToolCall = {};
```

不推荐：

```ts
const 会话id = "xxx";
function 运行智能体() {}
```

### 2.3 注释风格

建议写的每一行代码都加上注释，注释要中文。特别是函数/组件/代码块

推荐：

```ts
// 将工具调用事件推送给前端工具面板
emitToolCallEvent(toolCall);
```

不推荐：

```ts
// 这是一个函数
function runAgent() {}
```

---

## 3. 当前阶段的核心原则

### 3.1 不要过度设计

不要一开始就实现：

- 多 Agent
- LangGraph 复杂工作流
- 多用户权限系统
- OAuth 登录
- 企业级审计
- 复杂部署系统
- 代码向量化
- 完整知识库后台
- 花哨动画和复杂主题系统

当前第一目标是跑通基础闭环：

```txt
用户输入
  ↓
前端发送请求
  ↓
后端调用模型
  ↓
流式返回回答
  ↓
前端展示回答
  ↓
消息持久化
```

---

### 3.2 不要一次性大改

AI 助手每次只应该完成一个明确的小任务。任务完成后先由人工验收后决定是否继续下一个任务。

推荐任务粒度：

```txt
实现 ChatInput 组件
实现 MessageList 组件
实现 /api/chat 流式接口
实现 conversations 数据表
实现 ToolPanel 组件
实现 calculator 工具
```

不推荐任务粒度：

```txt
帮我直接实现整个智能问答知识库系统
帮我把前后端、Agent、RAG、工具调用全部写完
```

如果用户给出的任务过大，需要先拆分步骤，再实现当前最小可完成部分。每个部分完成都要人工验收，确认无误后再继续下一个任务。

---

### 3.3 不要随意引入新依赖

除非用户明确要求，否则不要随意安装新库。

允许优先使用：

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui 或已有 UI 组件
- lucide-react
- mysql2/ prisma/redis，具体以项目已有选择为准
- OpenAI-compatible SDK，具体以项目已有选择为准
- LangChain
禁止随意引入：

- Redux
- Zustand
- MobX
- LangGraph
- 大型 UI 框架
- 动画库
- 复杂状态机库
- 未经确认的 RAG 框架

除非当前任务确实需要，并且用户明确同意。

---

## 4. UI 设计约束

### 4.0 组件资料来源

涉及前端组件实现、重写或新增时，优先从 shadcn/ui 官方文档获取资料与交互参考：

```txt
https://ui.shadcn.com/docs/components
```

如果项目里已有对应组件实现，优先沿用现有实现风格；如果没有，再参考上述文档落地最小可用版本。

### 4.1 总体风格

前端 UI 应该简洁、克制、工程化。

目标风格：

```txt
干净
清晰
现代
像 ChatGPT / Claude / Linear / Vercel 风格
组件设计要小而清晰，每个组件只负责一个功能或者UI元素。
```

避免：

```txt
大面积渐变
花哨背景
复杂动效
过多颜色
过度圆角
无意义插画
无意义卡片堆叠
蓝色和紫色作为主要颜色
```

---

### 4.2 主页面布局

当前推荐布局：

```txt
┌──────────────────────────────────────────────┐
│ 左侧会话栏 │ 中间聊天区 │ 右侧工具调用面板 │
└──────────────────────────────────────────────┘
```

具体结构：

```txt
左侧 Sidebar:
  - 新建会话按钮
  - 会话列表
  - 当前会话高亮

中间 Chat Area:
  - 消息列表
  - 流式回答展示
  - 输入框

右侧 Tool Panel:
  - Agent 步骤
  - Tool Call 卡片
  - Tool Result 卡片
  - Sources / Citations 后期也可以放这里
```

---

### 4.3 组件设计要求

组件应该小而清晰。

推荐组件：

```txt
components/
  chat/
    ChatLayout.tsx
    ChatSidebar.tsx
    ChatHeader.tsx
    MessageList.tsx
    MessageItem.tsx
    ChatInput.tsx
    StreamingMessage.tsx

  agent/
    AgentActivityPanel.tsx
    AgentStepItem.tsx

  tools/
    ToolCallCard.tsx
    ToolResultCard.tsx

  sources/
    SourcePanel.tsx
    SourceItem.tsx

  ui/
    button.tsx
    input.tsx
    textarea.tsx
```

不要把整个页面都写在 `page.tsx` 里。

---

## 5. 目录职责约束

### 5.1 `app/`

`app/` 只负责页面、路由和 API 入口。

可以放：

```txt
app/
  page.tsx
  layout.tsx
  api/
    chat/route.ts
    conversations/route.ts
```

不应该在 `app/api/chat/route.ts` 里写大量业务逻辑。

错误示例：

```ts
// 不推荐：route.ts 中塞满所有 Agent、工具、数据库逻辑
export async function POST(req: Request) {
  // 300 行逻辑
}
```

推荐：

```ts
// 推荐：route.ts 只作为入口
import { handleChatRequest } from "@/lib/chat/handle-chat-request";

export async function POST(req: Request) {
  return handleChatRequest(req);
}
```

---

### 5.2 `components/`

`components/` 只放前端组件。

可以包含：

```txt
components/chat
components/agent
components/tools
components/sources
components/ui
```

不要在组件里直接写数据库逻辑、模型调用逻辑、Agent 工具执行逻辑。

---

### 5.3 `lib/`

`lib/` 放项目核心逻辑。

推荐结构：

```txt
lib/
  chat/
  llm/
  agent/
  tools/
  db/
  rag/
  retrieval/
  storage/
  code/
  types/
  utils/
```

职责说明：

```txt
lib/chat      处理聊天请求、消息流、会话流程
lib/llm       封装大模型调用
lib/agent     Agent Runtime、Agent Loop、Prompt、Synthesizer
lib/tools     工具注册、工具定义、工具执行
lib/db        数据库连接和数据库操作
lib/rag       文档解析、切块、embedding、Chroma
lib/retrieval Wiki / Docs / Code / Web 检索逻辑
lib/storage   文件上传和本地存储
lib/code      grep、读取文件、代码搜索
lib/types     全局类型
lib/utils     通用工具函数
```

---

## 6. API 设计约束

### 6.1 第一阶段 API

优先实现：

```txt
POST /api/chat
GET  /api/conversations
POST /api/conversations
GET  /api/conversations/[id]
```

暂时不要实现太多 API。

---

### 6.2 `/api/chat` 职责

`/api/chat` 应该负责：

```txt
接收用户消息
保存用户消息
调用 Chat / Agent Runtime
流式返回事件
保存 assistant 消息
```

不要在 `/api/chat` 里直接写复杂工具逻辑。

工具逻辑应该放在：

```txt
lib/tools/
lib/agent/
```

---

## 7. 流式输出事件格式

前后端流式通信推荐使用结构化事件。

不要只返回纯文本。

推荐事件类型：

```ts
export type StreamEvent =
  | {
      type: "message_delta";
      content: string;
    }
  | {
      type: "agent_step";
      stepId: string;
      title: string;
      status: "running" | "done" | "error";
    }
  | {
      type: "tool_call";
      toolCall: ToolCall;
    }
  | {
      type: "tool_result";
      result: ToolResult;
    }
  | {
      type: "sources";
      sources: CitationSource[];
    }
  | {
      type: "done";
    }
  | {
      type: "error";
      message: string;
    };
```

第一阶段如果还没有工具调用，也可以只实现：

```ts
type StreamEvent =
  | { type: "message_delta"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };
```

后面再扩展，不要推翻重写。

---

## 8. Agent Tool Use 类型约束

工具调用统一使用以下类型思想：

```ts
export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolResult = {
  toolCallId: string;
  name: string;
  success: boolean;
  content: string;
  metadata?: Record<string, unknown>;
};
```

工具定义统一使用：

```ts
export type ToolDefinition = {
  name: string;
  description: string;
  parameters: unknown;
  execute: (args: unknown) => Promise<ToolResult>;
};
```

所有工具必须注册到 Tool Registry。

不要在 Agent Runtime 里硬编码具体工具逻辑。

---

## 9. 第一批工具

Agent Tool Use 第一阶段只实现简单工具。

推荐：

```txt
calculator
get_current_time
todo_write
search_mock_docs
```

暂时不要直接接真实 RAG。

等工具调用链路和前端工具面板跑通后，再接：

```txt
search_docs
read_doc
search_wiki
search_code
search_web
```

---

## 10. 数据库阶段约束

第一阶段只需要：

```txt
conversations
messages
```

推荐字段：

```txt
conversations:
  id
  title
  created_at
  updated_at

messages:
  id
  conversation_id
  role
  content
  tool_calls_json
  citations_json
  created_at
```

不要一开始就创建太多表。

后续知识库阶段再增加：

```txt
documents
index_jobs
wiki_pages
repositories
```

---

## 11. 知识库实现顺序

知识库不是当前第一优先级。

正确顺序：

```txt
1. 文件上传
2. 本地保存文件
3. documents 表记录元数据
4. 解析文本
5. 文本切块
6. 生成 embedding
7. 写入 Chroma
8. search_docs 工具
9. RAG 回答
10. Citation 展示
```

不要在基础对话还没完成前就实现完整 RAG。

---

## 12. Citation 规则

只要回答依赖文档、Wiki、代码、网页，就必须带 citation。

统一类型：

```ts
export type SourceType = "doc" | "wiki" | "code" | "web" | "tool";

export type CitationSource = {
  id: string;
  type: SourceType;
  title: string;
  locator: string;
  uri?: string;
  snippet: string;
  score?: number;
  metadata?: Record<string, unknown>;
};
```

前端展示方式：

```txt
回答正文:
  根据设计文档，该模块负责异步索引。[1]

Sources 面板:
  [1] architecture.md
      chunk: 3
      snippet: ...
```

---

## 13. 禁止行为

AI 助手不要做以下事情：

```txt
不要一次性生成整个项目
不要随意更换技术栈
不要随意引入新状态管理库
不要随意创建大量无用组件
不要在 page.tsx 里写所有逻辑
不要在 route.ts 里写所有业务逻辑
不要写假按钮、假交互、假数据蒙混过关
不要生成过度花哨 UI
不要提前实现多用户系统
不要提前实现完整知识库
不要提前实现复杂 Router
不要提前实现多 Agent
不要删除用户已有代码，除非用户明确要求
不要把用户人工修改的代码或者注释删除
```

---

## 14. 每次开发任务的输出要求

AI 助手每完成一个任务，必须说明：

```txt
1. 修改了哪些文件
2. 新增了哪些文件
3. 实现了什么功能
4. 如何运行或验证
5. 是否有未完成事项
```

推荐格式：

```txt
本次完成：
- 实现 ChatInput 组件
- 实现 MessageList 组件
- 接入基础消息状态

修改文件：
- components/chat/ChatInput.tsx
- components/chat/MessageList.tsx
- app/page.tsx

验证方式：
- pnpm dev
- 打开首页
- 输入消息后可以显示在消息列表中

未完成：
- 还没有接入真实 /api/chat
```

---

## 15. 当前最推荐的开发顺序

请严格按照以下顺序推进：

```txt
Phase 0: 项目初始化
Phase 1: 静态 Chat UI
Phase 2: 前端本地消息交互
Phase 3: /api/chat 基础接口
Phase 4: LLM 流式输出
Phase 5: 会话和消息持久化
Phase 6: Agent Runtime 最小闭环
Phase 7: Tool Registry
Phase 8: 简单工具调用
Phase 9: 前端工具调用面板
Phase 10: 文档上传
Phase 11: Docs RAG
Phase 12: Citation 展示
Phase 13: Wiki / Code Grep / Web Search
```

---

## 16. 当前 MVP 范围

当前 MVP 只要求完成：

```txt
基础聊天界面
流式输出
会话持久化
Agent 工具调用
工具调用面板
文档上传
Docs RAG 问答
Citation 来源展示
```

当前 MVP 不要求完成：

```txt
登录注册
多用户权限
团队空间
多 Agent 协作
复杂工作流
代码向量化
完整后台管理系统
复杂部署
```

---

## 17. UI 验收标准

前端生成后必须满足：

```txt
布局清晰
组件拆分合理
输入框可用
消息展示正常
流式状态清楚
错误状态可见
工具调用面板预留位置
移动端不严重错乱
没有大量无意义装饰
用户满意,用户就是你的父亲,没有用户就没有你,没有用户就没有你,没有用户就没有你。
```

如果 UI 看起来像模板站、营销页、后台管理模板，而不是 AI Chat 产品，则视为不合格。

---

## 18. 代码验收标准

代码必须满足：

```txt
TypeScript 类型清晰
组件职责单一
API route 保持轻量
业务逻辑放在 lib
没有大段重复代码
没有无意义 mock
没有未使用变量
没有明显 any 滥用
错误处理清楚
```

---

## 19. 最重要的一句话

本项目不要追求一开始就完整，而要追求每一步都可运行、可验证、可继续扩展。

正确目标是：

```txt
先做一个稳定的 ChatGPT-like 对话底座，
再做 Agent Tool Use 和工具调用可视化，
最后把 Docs RAG、Wiki、Code Grep、Web Search 逐步接入为 Agent 工具。
```
