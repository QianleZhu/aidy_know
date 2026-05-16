"use client";

import {
  Children,
  isValidElement,
  memo,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { StrictFunction } from "katex";

import { CodeBlock } from "./CodeBlock";

type MarkdownRendererProps = {
  content: string;
};

type MarkdownProps<T extends keyof React.JSX.IntrinsicElements> =
  ComponentPropsWithoutRef<T> & {
    node?: unknown;
  };

type CodeElementProps = {
  className?: string;
  children?: ReactNode;
};

type ActiveCodeFence = {
  marker: "`" | "~";
  size: number;
};

const codeFencePattern = /^ {0,3}(`{3,}|~{3,})/;
const partialCodeFencePattern = /^ {0,3}(`+|~+)$/;

const handleKatexStrict: StrictFunction = (errorCode) => {
  if (errorCode === "unicodeTextInMathMode") {
    return "ignore";
  }

  return "warn";
};

const remarkPlugins: NonNullable<Options["remarkPlugins"]> = [
  remarkGfm,
  remarkMath,
];
const rehypePlugins: NonNullable<Options["rehypePlugins"]> = [
  [rehypeHighlight, { ignoreMissing: true }],
  [rehypeKatex, { strict: handleKatexStrict }],
];

function mergeClassNames(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function extractTextContent(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(extractTextContent).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(children)) {
    return extractTextContent(children.props.children);
  }

  return "";
}

function getCodeElement(children: ReactNode) {
  const childArray = Children.toArray(children);

  return childArray.find(
    (child): child is ReactElement<CodeElementProps> =>
      isValidElement<CodeElementProps>(child) && child.type === "code",
  );
}

function getLanguageFromClassName(className?: string) {
  return className?.match(/language-([\w-]+)/)?.[1];
}

function getCodeFence(line: string) {
  const match = line.match(codeFencePattern);

  if (!match) {
    return null;
  }

  const fence = match[1];

  return {
    marker: fence[0] as "`" | "~",
    size: fence.length,
  };
}

function isClosingFence(line: string, activeFence: ActiveCodeFence) {
  const fence = getCodeFence(line);

  if (!fence) {
    return false;
  }

  const rest = line.slice(line.indexOf(fence.marker.repeat(fence.size)) + fence.size);

  return (
    fence.marker === activeFence.marker &&
    fence.size >= activeFence.size &&
    rest.trim().length === 0
  );
}

function getUnclosedCodeFence(content: string) {
  let activeFence: ActiveCodeFence | null = null;

  for (const line of content.split(/\r?\n/)) {
    if (activeFence) {
      if (isClosingFence(line, activeFence)) {
        activeFence = null;
      }

      continue;
    }

    const fence = getCodeFence(line);

    if (fence) {
      activeFence = fence;
    }
  }

  return activeFence;
}

function getLastLine(content: string) {
  const normalizedContent = content.replace(/\r\n/g, "\n");
  const lastLineStart = normalizedContent.lastIndexOf("\n") + 1;

  return normalizedContent.slice(lastLineStart);
}

function getPartialClosingFencePatch(
  content: string,
  activeFence: ActiveCodeFence,
) {
  const lastLine = getLastLine(content);
  const match = lastLine.match(partialCodeFencePattern);

  if (!match) {
    return null;
  }

  const partialFence = match[1];
  const marker = partialFence[0] as "`" | "~";

  if (marker !== activeFence.marker || partialFence.length >= activeFence.size) {
    return null;
  }

  return activeFence.marker.repeat(activeFence.size - partialFence.length);
}

function remendUnclosedCodeFence(content: string) {
  const activeFence = getUnclosedCodeFence(content);

  if (!activeFence) {
    return content;
  }

  const partialClosingFencePatch = getPartialClosingFencePatch(
    content,
    activeFence,
  );

  if (partialClosingFencePatch) {
    return `${content}${partialClosingFencePatch}`;
  }

  // 流式期间如果已经看到 opening fence，就临时补一个 closing fence 让 pre/code 结构稳定。
  const closingFence = activeFence.marker.repeat(activeFence.size);
  const separator = content.endsWith("\n") || content.endsWith("\r\n") ? "" : "\n";

  return `${content}${separator}${closingFence}`;
}

function remendMarkdown(content: string) {
  return remendUnclosedCodeFence(content);
}

const MarkdownPre = memo(function MarkdownPre({
  children,
}: MarkdownProps<"pre">) {
  const codeElement = getCodeElement(children);
  const code = extractTextContent(children);
  const language = getLanguageFromClassName(codeElement?.props.className);

  return (
    <CodeBlock code={code} language={language}>
      {children}
    </CodeBlock>
  );
});

const MarkdownCode = memo(function MarkdownCode({
  children,
  className,
  node: _node,
  ...props
}: MarkdownProps<"code">) {
  const codeText = extractTextContent(children);
  const isBlockCode =
    className?.includes("language-") ||
    className?.includes("hljs") ||
    codeText.includes("\n");

  if (isBlockCode) {
    return (
      <code {...props} className={className}>
        {children}
      </code>
    );
  }

  return (
    <code
      {...props}
      className={mergeClassNames(
        "rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[0.9em] font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100",
        className,
      )}
    >
      {children}
    </code>
  );
});

const MarkdownAnchor = memo(function MarkdownAnchor({
  children,
  className,
  href,
  node: _node,
  ...props
}: MarkdownProps<"a">) {
  const isExternal = href?.startsWith("http://") || href?.startsWith("https://");

  return (
    <a
      {...props}
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className={mergeClassNames(
        "font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:decoration-emerald-700 dark:hover:text-emerald-200",
        className,
      )}
    >
      {children}
    </a>
  );
});

const MarkdownTable = memo(function MarkdownTable({
  children,
  className,
  node: _node,
  ...props
}: MarkdownProps<"table">) {
  return (
    <div className="my-4 w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table
        {...props}
        className={mergeClassNames(
          "w-full min-w-max border-collapse text-left text-sm",
          className,
        )}
      >
        {children}
      </table>
    </div>
  );
});

const MarkdownBlockquote = memo(function MarkdownBlockquote({
  children,
  className,
  node: _node,
  ...props
}: MarkdownProps<"blockquote">) {
  return (
    <blockquote
      {...props}
      className={mergeClassNames(
        "my-4 border-l-2 border-zinc-300 pl-4 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
        className,
      )}
    >
      {children}
    </blockquote>
  );
});

const markdownComponents: Components = {
  h1({ children, className, node: _node, ...props }) {
    return (
      <h1
        {...props}
        className={mergeClassNames(
          "mt-5 mb-3 text-xl font-semibold tracking-normal text-zinc-950 first:mt-0 dark:text-zinc-50",
          className,
        )}
      >
        {children}
      </h1>
    );
  },
  h2({ children, className, node: _node, ...props }) {
    return (
      <h2
        {...props}
        className={mergeClassNames(
          "mt-5 mb-3 text-lg font-semibold tracking-normal text-zinc-950 first:mt-0 dark:text-zinc-50",
          className,
        )}
      >
        {children}
      </h2>
    );
  },
  h3({ children, className, node: _node, ...props }) {
    return (
      <h3
        {...props}
        className={mergeClassNames(
          "mt-4 mb-2 text-base font-semibold tracking-normal text-zinc-950 first:mt-0 dark:text-zinc-50",
          className,
        )}
      >
        {children}
      </h3>
    );
  },
  h4({ children, className, node: _node, ...props }) {
    return (
      <h4
        {...props}
        className={mergeClassNames(
          "mt-4 mb-2 text-sm font-semibold tracking-normal text-zinc-900 first:mt-0 dark:text-zinc-100",
          className,
        )}
      >
        {children}
      </h4>
    );
  },
  p({ children, className, node: _node, ...props }) {
    return (
      <p
        {...props}
        className={mergeClassNames("my-3 first:mt-0 last:mb-0", className)}
      >
        {children}
      </p>
    );
  },
  ul({ children, className, node: _node, ...props }) {
    return (
      <ul
        {...props}
        className={mergeClassNames(
          "my-3 list-disc space-y-1 pl-5 first:mt-0 last:mb-0",
          className,
        )}
      >
        {children}
      </ul>
    );
  },
  ol({ children, className, node: _node, ...props }) {
    return (
      <ol
        {...props}
        className={mergeClassNames(
          "my-3 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0",
          className,
        )}
      >
        {children}
      </ol>
    );
  },
  li({ children, className, node: _node, ...props }) {
    return (
      <li {...props} className={mergeClassNames("pl-1", className)}>
        {children}
      </li>
    );
  },
  hr({ className, node: _node, ...props }) {
    return (
      <hr
        {...props}
        className={mergeClassNames(
          "my-5 border-0 border-t border-zinc-200 dark:border-zinc-800",
          className,
        )}
      />
    );
  },
  strong({ children, className, node: _node, ...props }) {
    return (
      <strong
        {...props}
        className={mergeClassNames(
          "font-semibold text-zinc-950 dark:text-zinc-50",
          className,
        )}
      >
        {children}
      </strong>
    );
  },
  a: MarkdownAnchor,
  blockquote: MarkdownBlockquote,
  pre: MarkdownPre,
  code: MarkdownCode,
  table: MarkdownTable,
  thead({ children, className, node: _node, ...props }) {
    return (
      <thead
        {...props}
        className={mergeClassNames(
          "bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100",
          className,
        )}
      >
        {children}
      </thead>
    );
  },
  th({ children, className, node: _node, ...props }) {
    return (
      <th
        {...props}
        className={mergeClassNames(
          "border-b border-r border-zinc-200 px-3 py-2 text-xs font-semibold last:border-r-0 dark:border-zinc-800",
          className,
        )}
      >
        {children}
      </th>
    );
  },
  td({ children, className, node: _node, ...props }) {
    return (
      <td
        {...props}
        className={mergeClassNames(
          "border-t border-r border-zinc-200 px-3 py-2 align-top last:border-r-0 dark:border-zinc-800",
          className,
        )}
      >
        {children}
      </td>
    );
  },
};

// Markdown 渲染器：插件和组件映射保持模块级稳定引用，避免无意义重渲染。
function MarkdownRendererComponent({ content }: MarkdownRendererProps) {
  const renderedContent = remendMarkdown(content);

  return (
    <div className="markdown-content min-w-0 break-words">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
        skipHtml
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererComponent);
