# Phase 6-7 交接文档

本文档用于承接当前 `Agent Loop 可视化 / Tool Use` 开发进度，方便在新会话中快速恢复上下文。

---

## 1. 当前阶段结论

当前项目已经从纯聊天流式阶段推进到：

```txt
Phase 5: Agent Runtime 最小闭环
Phase 6: Agent Loop 可视化 / 工具调用展示面板
Phase 7: 接入第一个真实工具：联网搜索
```

当前已经确认的路线是：

```txt
前端：useChat + UI message parts
后端：LangChain.js + ChatOpenAI.bindTools()
搜索工具：Tavily Search
可视化：reasoning / tool_call / tool_result 共用同一条时间线
```

不是两套 UI：

```txt
不是“思考区 + 工具区”分离
而是“统一 agent-loop timeline”
```

---

## 2. 当前核心设计

### 2.1 Agent Loop 时间线原则

右侧活动面板的本质已经明确为：

```txt
展示本轮问答中的完整 agent-loop
```

统一顺序：

```txt
reasoning
-> tool_call
-> tool_result
-> reasoning
-> tool_call
-> tool_result
-> final answer
```

### 2.2 UI 设计原则

当前已确认：

```txt
思考片段和工具调用必须在同一条时间线上
搜索结果摘要展示方式尽量沿用 thinking detail
来源展示以 chips 形式出现
来源 chips 可点击跳转网页
不要照搬参考图的背景色、装饰和无关样式
只参考工具调用 UI 和来源展示方式
```

---

## 3. 已完成内容

### 3.1 路线文档已调整

已修改：

- `项目结构和开发路线.md`

当前顺序已调整为：

```txt
Phase 5: Agent Runtime 最小闭环
Phase 6: Agent Loop 可视化 / 工具调用展示面板
Phase 7: Tool Use 强化
Phase 8: 会话和消息持久化
```

也就是说：

```txt
会话持久化已后移
优先完成工具调用闭环和可视化
```

### 3.2 思考模式时间线 MVP 已完成

已完成：

- “思考中 / 已思考” 状态修复
- 思考时间每轮从 `0s` 开始
- 思考片段不再重复增长
- 右侧详情抽屉可查看完整思考内容

涉及文件：

- `src/components/chat/ChatLayout.tsx`
- `src/components/chat/useSmoothStreamingMessage.ts`
- `src/components/agent/AgentActivityPanel.tsx`
- `src/lib/chat/handle-chat-request.ts`

### 3.3 时间线数据结构已统一

当前 `AgentActivityPanel` 不再只依赖 reasoning 字符串，而是已经改成统一时间线渲染器。

核心类型：

```ts
type ActivityTimelineItem = {
  id: string;
  kind: "reasoning" | "tool_call" | "tool_result";
  title: string;
  detail: string;
  previewText: string;
  chips: Array<{ label: string; href?: string }>;
  state: "streaming" | "done" | "error";
  sources?: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
};
```

当前含义：

```txt
面板只负责渲染 timelineItems
不再关心事件来源是 reasoning 还是 tool
后续新增工具时继续复用同一结构
```

---

## 4. Tavily / LangChain 接入情况

### 4.1 已安装依赖

当前 `package.json` 已包含：

```txt
@langchain/core
@langchain/openai
@langchain/tavily
ai
@ai-sdk/react
```

### 4.2 已确认的官方接入方式

已经确认的 LangChain 路线：

```txt
const llm = createChatModel(...)
const searchTool = new TavilySearch(...)
const llmWithTools = llm.bindTools([searchTool])
```

工具调用闭环：

```txt
模型输出 tool_calls
后端执行工具
将 ToolMessage 回灌给模型
模型继续生成最终回答
```

### 4.3 Tavily 工具能力确认

已确认 TavilySearch 支持：

```txt
maxResults
includeAnswer
includeRawContent
includeDomains
excludeDomains
searchDepth
topic
timeRange
country
includeFavicon
```

中文搜索偏好已确定：

```txt
country: "china"
```

---

## 5. 当前已落地代码

### 5.1 搜索工具封装

已新增：

- `src/lib/tools/search-web.ts`

职责：

```txt
创建 TavilySearch 工具
规范化 Tavily 原始返回
格式化时间线展示详情
提取 sources 供前端 chips / 详情展示
```

核心导出：

```txt
createSearchWebTool()
normalizeSearchWebOutput()
formatSearchWebDetail()
```

### 5.2 stream-chat 已升级为最小 agent-loop

已修改：

- `src/lib/llm/stream-chat.ts`

当前职责已从：

```txt
纯 reasoning/text 双通道流
```

升级为：

```txt
reasoning 流
text 流
tool_call 执行
tool_result 回灌
最多多轮工具调用
```

当前实现点：

- `createChatModel()` 创建基础模型
- `createSearchWebTool()` 创建 `search_web`
- `model.bindTools([searchTool])`
- 聚合 `AIMessageChunk`
- 从 `tool_calls` 中取出工具请求
- 执行 Tavily
- 将结果转为 `ToolMessage`
- 再次喂给模型

### 5.3 /api/chat 已开始发送真实工具事件

已修改：

- `src/lib/chat/handle-chat-request.ts`

当前已写出的 UI stream 事件：

```txt
reasoning-start
reasoning-delta
reasoning-end
text-start
text-delta
text-end
tool-input-available
tool-output-available
tool-output-error
finish
```

说明：

```txt
后端没有自造前端协议
复用了 ai SDK 自带的工具 UI message chunk 结构
```

这点非常重要，因为它意味着：

```txt
useChat 会把工具调用自然并入同一条 assistant message
前端后续只需要解析 message.parts
```

### 5.4 ChatLayout 已能从 assistant parts 构建统一时间线

已修改：

- `src/components/chat/ChatLayout.tsx`

当前已经会从 assistant message 中提取：

```txt
reasoning parts
tool parts
```

并转换为统一 timeline item：

```txt
reasoning -> 思考片段
tool input -> 正在调用工具
tool output -> 已完成工具调用
tool error -> 工具调用失败
```

---

## 6. 当前验证结果

已完成验证：

```txt
pnpm exec tsc --noEmit
```

结果：

```txt
类型检查通过
```

未完成验证：

```txt
真实 Tavily API 联网运行验证
```

原因：

```txt
当前会话中没有直接完成真实 API 请求验证
需要本地带 TAVILY_API_KEY 手动测试
```

---

## 7. 当前环境变量

当前应至少具备：

```env
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_BASE_URL=
TAVILY_API_KEY=
```

说明：

- `OPENAI_API_KEY` 必填
- `TAVILY_API_KEY` 必填
- `OPENAI_BASE_URL` 视是否使用 OpenAI-compatible 网关决定

---

## 8. 当前可能的风险点

### 8.1 真实联网行为尚未人工验收

虽然类型已通过，但还需要人工实测：

```txt
模型是否真的触发 search_web
Tavily 是否返回结构化结果
时间线顺序是否符合预期
tool_result 的 sources chips 是否显示正确
点击来源是否能正常跳转
```

### 8.2 工具调用卡片尚未完全视觉精修

当前状态：

```txt
功能路径已串通
UI 已能展示
但还没有专门做 ToolCallCard / ToolResultCard 的独立精修复用
```

### 8.3 会话持久化还未开始

这是当前明确的策略，不是漏做：

```txt
先完成工具调用与可视化
再做 conversations / messages 持久化
```

---

## 9. 建议的下一步

优先级建议如下。

### 方案 A：先做真实联调验收

建议先人工验证：

```txt
配置 TAVILY_API_KEY
pnpm dev
提一个需要最新信息的问题
观察是否出现 reasoning -> tool_call -> tool_result
检查来源 chips 是否可点击
```

### 方案 B：修工具调用 UI

如果联调通过，建议继续：

```txt
把 tool_call / tool_result 节点的视觉样式精修
让来源 chips 更贴近参考图
让结果详情抽屉展示更稳定
```

### 方案 C：补 Agent Runtime / Tool Registry 抽象

当前虽然已经有最小闭环，但还可以继续往项目目标靠：

```txt
抽出 lib/agent/runtime.ts
抽出 lib/tools/index.ts
统一工具注册
避免工具逻辑继续散落
```

### 方案 D：在工具展示完成后再做会话持久化

对应当前路线：

```txt
Phase 8: conversations / messages
保存 assistant 消息
保存工具调用记录
切换会话
刷新恢复
```

---

## 10. 重要注意事项

当前不要推翻的设计：

```txt
useChat 仍然是前端消息主状态
LangChain 仍然是后端模型调用主链路
Tavily 作为第一个真实联网工具
AgentActivityPanel 作为统一时间线容器
reasoning 与 tool use 共用同一条 timeline
```

当前不要做的事情：

```txt
不要回退成 mock 工具
不要拆成“思考区”和“工具区”两套 UI
不要提前插入会话持久化打断当前链路
不要为了联网搜索再换一套工具框架
```

---

## 11. 新会话建议提示词

新开会话后，可以直接这样给 AI 上下文：

```txt
请先阅读 docs/phase6-7-agent-loop-handoff-2026-05-12.md。

当前项目已经完成：
- 思考模式时间线 MVP
- AgentActivityPanel 统一时间线结构
- Tavily 联网搜索工具接入
- LangChain bindTools 最小 agent-loop
- /api/chat 已发送 tool-input-available / tool-output-available

请基于当前实现继续推进，
不要拆分思考和工具调用 UI，
保持它们在同一条 agent-loop timeline 中展示。
```
