import { isDomainTrusted } from "./trustedDomains";

export interface ExtractedArticle {
  originalUrl: string;
  sourceDomain: string;
  title: string;
  publishedTime?: string;
  markdownContent: string;
  contentForAnalysis: string;
}

const READER_PREFIX = "https://r.jina.ai/http://";

function normalizeUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[_*`>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseReaderPayload(payload: string, originalUrl: string): ExtractedArticle | null {
  const titleMatch = payload.match(/Title:\s*(.+)/i);
  const publishedMatch = payload.match(/Published Time:\s*(.+)/i);
  const markdownMatch = payload.match(/Markdown Content:\s*([\s\S]+)/i);
  const markdownContent = markdownMatch?.[1]?.trim() ?? "";

  if (!markdownContent) return null;

  const cleanedContent = stripMarkdown(markdownContent);
  if (cleanedContent.length < 200) return null;

  const hostname = new URL(originalUrl).hostname.toLowerCase().replace(/^www\./, "");

  return {
    originalUrl,
    sourceDomain: hostname,
    title: titleMatch?.[1]?.trim() ?? hostname,
    publishedTime: publishedMatch?.[1]?.trim() ?? undefined,
    markdownContent,
    contentForAnalysis: cleanedContent,
  };
}

export async function extractArticleForAnalysis(rawUrl: string): Promise<ExtractedArticle | null> {
  try {
    const normalizedUrl = normalizeUrl(rawUrl);
    const trusted = isDomainTrusted(normalizedUrl);

    if (!trusted || (trusted.category !== "media_vn" && trusted.category !== "media_global" && trusted.category !== "gov_vn" && trusted.category !== "gov_global")) {
      return null;
    }

    const readerUrl = `${READER_PREFIX}${normalizedUrl.replace(/^https?:\/\//, "")}`;
    const response = await fetch(readerUrl, {
      headers: {
        Accept: "text/plain",
      },
    });

    if (!response.ok) return null;
    const payload = await response.text();
    return parseReaderPayload(payload, normalizedUrl);
  } catch {
    return null;
  }
}
