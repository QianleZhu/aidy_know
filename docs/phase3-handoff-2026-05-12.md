# Phase 3 交接文档

本文档用于承接当前聊天底座开发进度，方便在新会话中快速恢复上下文。

---

## 1. 当前阶段结论

当前项目已经进入 `Phase 3`，并且已经按最新讨论结果落地为：

```txt
前端：useChat
后端：LangChain.js
/api/chat：返回 AI SDK 兼容的 UI message stream
聊天区：继续使用 react-virtuoso
```

不是走“前端自定义 SSE + fetch-event-source”的路线，而是：

```txt
useChat 负责前端聊天状态和流式消费
LangChain 负责后端真实模型调用
AI SDK stream protocol 负责前后端流式协议承接
```

这条路线已经确认可继续承接后续：

```txt
Agent Runtime
Tool Use
RAG
Sources / Citation
右侧工具调用链路展示
```

---

## 2. 已完成内容

### 2.1 后端最小真实对话链路

已完成：

- `POST /api/chat`
- `route.ts` 仅作为 API 入口
- `lib/chat` / `lib/llm` 分层
- `LangChain ChatOpenAI` 流式输出
- 后端将 LangChain 文本增量映射成 AI SDK 兼容的 UI stream

当前后端文件：

- `src/app/api/chat/route.ts`
- `src/lib/chat/handle-chat-request.ts`
- `src/lib/llm/create-chat-model.ts`
- `src/lib/llm/stream-chat.ts`
- `src/lib/types/chat.ts`

### 2.2 前端聊天主链路

已完成：

- 前端从本地 mock 流切换到 `useChat`
- 保留现有三栏 UI
- 保留 `react-virtuoso`
- 保留输入框、滚动、回到底部按钮
- 真实消息来源改为 `/api/chat`

当前前端关键文件：

- `src/components/chat/ChatLayout.tsx`
- `src/components/chat/MessageList.tsx`
- `src/components/chat/MessageItem.tsx`
- `src/components/chat/ChatInput.tsx`

---

## 3. 当前流式渲染方案

### 3.1 已确认设计原则

当前流式体验不是直接把 `useChat.messages` 原样渲染，而是：

```txt
useChat 继续作为真实网络流源
历史消息正常渲染
用户消息正常渲染
只有最后一条正在 streaming 的 assistant 消息进入平滑输出层
```

### 3.2 平滑输出层实现

核心文件：

- `src/components/chat/useSmoothStreamingMessage.ts`

当前方案：

```txt
rawMessages 来自 useChat
viewMessages 供 Virtuoso 渲染
最后一条 assistant 使用 displayText 覆盖显示
outputQueue + requestAnimationFrame 控制展示节奏
```

### 3.3 当前时间驱动模型

当前 `useSmoothStreamingMessage.ts` 已从“固定每帧字符数”升级为：

```txt
outputQueue
currentSpeed
targetSpeed
accumulatedTime
requestAnimationFrame
```

当前特点：

- 用 `accumulatedTime * currentSpeed / 1000` 算本帧渲染字符数
- 根据 `queueLength` 动态计算 `targetSpeed`
- 根据 `queueLength` 变化幅度动态计算 `speedChangeRate`
- 渲染后扣除已消费时间，避免速度失控
- 流结束后提高收尾速度，尽快清空剩余队列

### 3.4 自动跟随策略

当前已确认并实现：

- 流式输出期间自动跟随不使用 `smooth`
- 只有手动点击“回到底部”时使用 `smooth`
- 用户主动上滑或向上拖动滚动条时立即停止自动跟随

---

## 4. 针对抖动问题的当前处理

### 4.1 已处理的问题

已处理：

1. 流式输出期间 `followOutput` 不再使用 `smooth`
2. assistant 生成中增加 `min-height`
3. assistant 初始生成阶段增加 skeleton
4. 平滑输出层将网络流和 UI 渲染解耦
5. 对 `\n` 换行引起的高度突变加入“换行捆绑策略”

### 4.2 换行处理策略

当前 `useSmoothStreamingMessage.ts` 中已经实现：

```txt
如果本帧切片正好在换行处结束
或者下一字符正好是换行
则顺手多带出换行后的少量字符
避免只渲染一个孤立换行导致高度先跳一下
```

### 4.3 当前速度参数

当前参数已经调慢一版：

```txt
BASE_SPEED = 8
MAX_SPEED = 110
FINISHING_SPEED = 150
```

以及：

```txt
targetSpeed = BASE_SPEED + queueLength * 0.22
```

这一版用户反馈：

```txt
可以了，实现不错
```

说明当前体验已进入“可接受状态”。

---

## 5. 当前环境变量

本地已新增：

- `.env.local`

当前使用的环境变量：

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=
```

说明：

- `OPENAI_API_KEY` 必填
- `OPENAI_MODEL` 可选
- `OPENAI_BASE_URL` 用于 OpenAI-compatible 网关，可留空

---

## 6. 文档同步情况

已同步文档：

- `项目结构和开发路线.md`

当前文档中的 `Phase 3` 已更新为：

```txt
前端 useChat
后端 LangChain.js
/api/chat 返回 AI SDK 兼容流
先实现最简单文本对话
```

并且原 `Phase 4` 已改成：

```txt
流式体验打磨
```

---

## 7. 下一步建议

当前可以继续推进的方向，按优先级建议如下：

### 方案 A：继续打磨当前聊天体验

可继续做：

- 停止生成 `stop`
- 重试 `retry / regenerate`
- 流中断状态提示优化
- 回到底部按钮体验微调
- 换行闪动进一步优化

### 方案 B：进入会话持久化

对应后续 Phase：

- conversations
- messages
- 会话切换
- 刷新后恢复历史消息

### 方案 C：开始为 Agent / Tool Use 预留结构

对应内容：

- 设计 `data-*` parts
- 右侧面板接 agent_step / tool_call / tool_result
- 为后续 RAG / Sources 预留流事件映射

---

## 8. 重要注意事项

### 8.1 当前不要推翻的设计

以下设计已经验证过，应尽量延续：

- `useChat` 作为前端消息主状态
- `LangChain` 作为后端模型调用主链路
- `react-virtuoso` 作为聊天区虚拟滚动方案
- 只对最后一条 streaming assistant 做平滑输出加工

### 8.2 当前仍存在的技术债

当前代码里仍有一类历史问题：

```txt
部分旧文件存在中文注释乱码
```

本轮没有统一清理，避免扩大改动面。

如果后续要清理，建议单独做一次编码/注释整理，不要夹在功能开发中一起做。

---

## 9. 新会话建议提示词

新开会话后，可以直接给 AI 这样的上下文：

```txt
请先阅读 docs/phase3-handoff-2026-05-12.md。

当前项目已经完成：
- 前端 useChat
- 后端 LangChain.js
- /api/chat 真实流式文本对话
- react-virtuoso 聊天列表
- 最后一条 assistant 的平滑打字机输出层

请基于当前实现继续推进，不要推翻现有链路。
```

