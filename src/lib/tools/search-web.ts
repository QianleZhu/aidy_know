import { TavilySearch, type TavilySearchResponse } from "@langchain/tavily";

export type SearchWebInput = {
  query: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  searchDepth?: "basic" | "advanced";
  topic?: "general" | "news" | "finance";
  timeRange?: "day" | "week" | "month" | "year";
  includeImages?: boolean;
};

export type SearchWebSource = {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
};

export type SearchWebOutput = {
  query: string;
  answer?: string;
  sources: SearchWebSource[];
  responseTime?: number;
};

// 创建 Tavily 搜索工具：统一承接中文搜索偏好和结果深度配置。
export function createSearchWebTool() {
  return new TavilySearch({
    name: "search_web",
    description:
      "联网搜索工具。适合查询最新信息、新闻、官方文档和网页资料。输入应为明确的搜索问题。",
    maxResults: 5,
    topic: "general",
    searchDepth: "advanced",
    includeAnswer: true,
    includeRawContent: false,
    includeImages: false,
    includeFavicon: true,
    includeUsage: false,
    country: "china",
  });
}

// 将 Tavily 原始结果规范化为前端时间线更容易消费的结构。
export function normalizeSearchWebOutput(
  query: string,
  rawOutput: TavilySearchResponse,
): SearchWebOutput {
  const rawSources = Array.isArray(rawOutput.results) ? rawOutput.results : [];

  return {
    query,
    answer:
      typeof rawOutput.answer === "string" ? rawOutput.answer.trim() : undefined,
    responseTime:
      typeof rawOutput.response_time === "number"
        ? rawOutput.response_time
        : undefined,
    sources: rawSources.map((result) => ({
      title:
        typeof result.title === "string" && result.title.trim().length > 0
          ? result.title.trim()
          : typeof result.url === "string"
            ? result.url
            : "未命名来源",
      url: typeof result.url === "string" ? result.url : "",
      snippet:
        typeof result.content === "string" && result.content.trim().length > 0
          ? result.content.trim()
          : "该来源未返回摘要内容。",
      favicon:
        typeof result.favicon === "string" ? result.favicon : undefined,
    })),
  };
}

// 将搜索结果拼接成时间线里可直接阅读的摘要文本。
export function formatSearchWebDetail(output: SearchWebOutput) {
  const sections: string[] = [];

  if (output.answer) {
    sections.push(`结论摘要\n${output.answer}`);
  }

  if (output.sources.length > 0) {
    const sourceSummaries = output.sources
      .map(
        (source, index) =>
          `${index + 1}. ${source.title}\n${source.snippet}\n${source.url}`,
      )
      .join("\n\n");

    sections.push(`搜索结果\n${sourceSummaries}`);
  }

  if (sections.length === 0) {
    return "未获取到可展示的联网搜索结果。";
  }

  return sections.join("\n\n");
}
