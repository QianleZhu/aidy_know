"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isReasoningUIPart, isTextUIPart, type UIMessage } from "ai";

import type { ChatMessage } from "./MessageList";

const BASE_SPEED = 6;
const MAX_SPEED = 42;
const FINISHING_SPEED = 64;
const MAX_CHARS_PER_FRAME = 8;
const MIN_CHARS_PER_FRAME = 1;
const MIN_SPEED_CHANGE_RATE = 0.005;
const MAX_SPEED_CHANGE_RATE = 0.08;
const NEWLINE_FOLLOWUP_CHARS = 6;

type MessageMetadata = {
  thinkingMode?: boolean;
};

function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

function getMessageReasoningParts(message: UIMessage) {
  return message.parts.filter(isReasoningUIPart);
}

function getMessageThinkingMode(message: UIMessage) {
  const metadata = message.metadata as MessageMetadata | undefined;
  return metadata?.thinkingMode === true;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTargetSpeed(queueLength: number, isFinishing: boolean) {
  if (isFinishing) {
    return FINISHING_SPEED;
  }

  return clamp(BASE_SPEED + queueLength * 0.08, BASE_SPEED, MAX_SPEED);
}

function getSpeedChangeRate(queueLength: number, lastQueueLength: number) {
  return clamp(
    Math.abs(queueLength - lastQueueLength) * 0.0006 + MIN_SPEED_CHANGE_RATE,
    MIN_SPEED_CHANGE_RATE,
    MAX_SPEED_CHANGE_RATE,
  );
}

function takeChunkWithNewlineStabilization(
  queuedText: string,
  preferredLength: number,
) {
  let nextChunk = queuedText.slice(0, preferredLength);
  let consumedLength = nextChunk.length;

  if (consumedLength === 0) {
    return {
      consumedLength: 0,
      nextChunk: "",
    };
  }

  const lastNewlineIndex = nextChunk.lastIndexOf("\n");
  const nextChar = queuedText[consumedLength];

  if (lastNewlineIndex === consumedLength - 1) {
    const extraLength = Math.min(
      NEWLINE_FOLLOWUP_CHARS,
      queuedText.length - consumedLength,
    );

    nextChunk = queuedText.slice(0, consumedLength + extraLength);
    consumedLength = nextChunk.length;
  } else if (nextChar === "\n") {
    const extraLength = Math.min(
      1 + NEWLINE_FOLLOWUP_CHARS,
      queuedText.length - consumedLength,
    );

    nextChunk = queuedText.slice(0, consumedLength + extraLength);
    consumedLength = nextChunk.length;
  }

  return {
    consumedLength,
    nextChunk,
  };
}

// 平滑流式消息 Hook：仅平滑最后一条 assistant 的正文文本，同时根据 reasoning part 状态映射顶部提示。
export function useSmoothStreamingMessage(
  messages: UIMessage[],
  status: "submitted" | "streaming" | "ready" | "error",
  thinkingMode: boolean,
) {
  const [displayText, setDisplayText] = useState("");
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null);

  const queuedTextRef = useRef("");
  const lastRawTextRef = useRef("");
  const animationFrameRef = useRef<number | null>(null);
  const streamFinishedRef = useRef(false);
  const currentSpeedRef = useRef(BASE_SPEED);
  const accumulatedTimeRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastQueueLengthRef = useRef(0);

  const lastAssistantMessage = useMemo(() => {
    const lastMessage = messages.at(-1);

    if (!lastMessage || lastMessage.role !== "assistant") {
      return null;
    }

    return lastMessage;
  }, [messages]);

  const lastAssistantText = lastAssistantMessage
    ? getMessageText(lastAssistantMessage)
    : "";

  const isStreamingAssistant = !!lastAssistantMessage && status === "streaming";

  useEffect(() => {
    if (!animatedMessageId || animationFrameRef.current !== null) {
      return;
    }

    const flushQueue = (frameTime: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = frameTime;
      }

      const frameDuration = frameTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = frameTime;
      accumulatedTimeRef.current += frameDuration;

      const queueLength = queuedTextRef.current.length;
      const targetSpeed = getTargetSpeed(
        queueLength,
        streamFinishedRef.current && queueLength > 0,
      );
      const speedChangeRate = getSpeedChangeRate(
        queueLength,
        lastQueueLengthRef.current,
      );

      currentSpeedRef.current +=
        (targetSpeed - currentSpeedRef.current) * speedChangeRate;
      lastQueueLengthRef.current = queueLength;

      let charsToProcess = Math.floor(
        (accumulatedTimeRef.current * currentSpeedRef.current) / 1000,
      );

      charsToProcess = clamp(
        charsToProcess,
        queueLength > 0 ? MIN_CHARS_PER_FRAME : 0,
        MAX_CHARS_PER_FRAME,
      );

      if (charsToProcess > 0) {
        const { consumedLength, nextChunk } = takeChunkWithNewlineStabilization(
          queuedTextRef.current,
          charsToProcess,
        );

        queuedTextRef.current = queuedTextRef.current.slice(consumedLength);
        setDisplayText((currentText) => currentText + nextChunk);

        accumulatedTimeRef.current -=
          (consumedLength * 1000) / currentSpeedRef.current;
      }

      const shouldContinue =
        queuedTextRef.current.length > 0 || !streamFinishedRef.current;

      if (!shouldContinue) {
        animationFrameRef.current = null;
        lastFrameTimeRef.current = null;
        accumulatedTimeRef.current = 0;
        currentSpeedRef.current = BASE_SPEED;
        lastQueueLengthRef.current = 0;
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(flushQueue);
    };

    animationFrameRef.current = window.requestAnimationFrame(flushQueue);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [animatedMessageId]);

  useEffect(() => {
    if (!lastAssistantMessage) {
      queuedTextRef.current = "";
      lastRawTextRef.current = "";
      streamFinishedRef.current = true;
      currentSpeedRef.current = BASE_SPEED;
      accumulatedTimeRef.current = 0;
      lastFrameTimeRef.current = null;
      lastQueueLengthRef.current = 0;
      setAnimatedMessageId(null);
      setDisplayText("");
      return;
    }

    const messageId = lastAssistantMessage.id;
    const rawText = lastAssistantText;

    if (animatedMessageId !== messageId) {
      queuedTextRef.current = rawText;
      lastRawTextRef.current = rawText;
      streamFinishedRef.current = !isStreamingAssistant;
      currentSpeedRef.current = BASE_SPEED;
      accumulatedTimeRef.current = 0;
      lastFrameTimeRef.current = null;
      lastQueueLengthRef.current = rawText.length;
      setAnimatedMessageId(messageId);
      setDisplayText("");
      return;
    }

    if (rawText.length > lastRawTextRef.current.length) {
      const appendedText = rawText.slice(lastRawTextRef.current.length);
      queuedTextRef.current += appendedText;
      lastRawTextRef.current = rawText;
    }

    streamFinishedRef.current = !isStreamingAssistant;
  }, [
    animatedMessageId,
    isStreamingAssistant,
    lastAssistantMessage,
    lastAssistantText,
  ]);

  const viewMessages = useMemo<ChatMessage[]>(() => {
    let latestUserThinkingMode = thinkingMode;

    return messages.flatMap((message, index) => {
      if (message.role === "user") {
        latestUserThinkingMode = getMessageThinkingMode(message);
      }

      if (message.role !== "user" && message.role !== "assistant") {
        return [];
      }

      const isLastAssistant =
        message.role === "assistant" && index === messages.length - 1;
      const content =
        isLastAssistant && animatedMessageId === message.id
          ? displayText
          : getMessageText(message);
      const reasoningParts = getMessageReasoningParts(message);
      const hasReasoningContent = reasoningParts.some((part) => part.text.trim().length > 0);
      const reasoningIsStreaming = reasoningParts.some(
        (part) => part.state !== "done",
      );
      //思考组件状态控制
      const reasoningIsDone =
        hasReasoningContent &&
        reasoningParts.length > 0 &&
        reasoningParts.every((part) => part.state === "done");

      const isLoading = isLastAssistant && status === "streaming";
      const assistantThinkingMode =
        message.role === "assistant" ? latestUserThinkingMode : false;
      const hasThinking = assistantThinkingMode && (hasReasoningContent || reasoningIsStreaming);
      const thinkingLabel = hasThinking
        ? reasoningIsDone
          ? "已思考"
          : "思考中..."
        : undefined;

      if (!content && !isLoading && !hasThinking) {
        return [];
      }

      return [
        {
          id: message.id,
          role: message.role,
          content,
          isLoading,
          hasThinking,
          thinkingLabel,
        },
      ];
    });
  }, [animatedMessageId, displayText, messages, status, thinkingMode]);

  return {
    viewMessages,
  };
}
