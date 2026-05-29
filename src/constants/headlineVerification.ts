import { CheckCircle2, AlertTriangle, Globe, Database, ShieldCheck, Zap } from "lucide-react";
import { NEWS_API_CONFIG, NEWS_API_KEYS } from "../config/newsApis";
import type { NewsAnalysisReason } from "./newsVerification";

export interface ArticleMatch {
  title: string;
  source: string;
  link?: string;
  publishedAt?: string;
  similarityScore: number;
}

export interface VerifiedOutletMatch {
  outlet: string;
  articles: ArticleMatch[];
  matchScore: number;
}

export interface HeadlineVerificationResult {
  isHeadline: boolean;
  extractedHeadline?: string;
  matchedOutlets: VerifiedOutletMatch[];
  verificationReasons: NewsAnalysisReason[];
  scoreDelta: number;
  hasVerifiedCoverage: boolean;
}

const NEWS_API_KEY = NEWS_API_KEYS.newsApiKey;
const FACT_CHECK_API_KEY = NEWS_API_KEYS.googleFactCheckApiKey;

// Major news outlets to verify against
const MAJOR_OUTLETS = [
  "VnExpress",
  "Tuổi Trẻ",
  "Thanh Niên",
  "Dân Trí",
  "VTV",
  "VOV",
  "Nhân Dân",
  "Reuters",
  "AP",
  "AFP",
  "BBC",
  "CNN",
  "RFA",
  "VOA",
];

// Headline indicators (keywords that suggest the text is a headline)
const HEADLINE_INDICATORS = [
  /^(tin|news|sự kiện|thông tin|báo cáo)[\s:]/i,
  /[!?]$/,
  /^[A-ZÁÀẢÃẠĂẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zá-ỵ\s]+:\s+/,
];

// Trusted major news outlets domains
const TRUSTED_OUTLET_DOMAINS: Record<string, string[]> = {
  "VnExpress": ["vnexpress.net", "vnexpress.vn"],
  "Tuổi Trẻ": ["tuoitre.vn", "tuoitre.com"],
  "Thanh Niên": ["thanhnien.vn", "thanhnien.com"],
  "Dân Trí": ["dantri.vn", "dantri.com"],
  "VTV": ["vtv.vn", "vtv1.vn", "vtv2.vn"],
  "VOV": ["vov.vn", "voicofvietnam.vn"],
  "Nhân Dân": ["nhandan.vn", "nhandan.com"],
  "Reuters": ["reuters.com"],
  "AP": ["apnews.com"],
  "AFP": ["afp.com"],
  "BBC": ["bbc.com"],
  "CNN": ["cnn.com"],
  "RFA": ["rfa.org"],
  "VOA": ["voa.gov", "voiceofamerica.com"],
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

function extractHeadlineFromText(text: string): string | null {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  // If first line looks like a headline, extract it
  if (lines.length > 0) {
    const firstLine = lines[0];
    // Headline is typically 10-200 characters and doesn't have full sentence structure
    if (
      firstLine.length >= 10 &&
      firstLine.length <= 200 &&
      !firstLine.endsWith(".") &&
      !firstLine.startsWith("http") &&
      !firstLine.includes("://")
    ) {
      // Check if it matches headline patterns
      for (const pattern of HEADLINE_INDICATORS) {
        if (pattern.test(firstLine)) {
          return firstLine;
        }
      }
      // If it looks like a title (no common sentence patterns)
      if (!firstLine.includes("because") && !firstLine.includes("vì") && !firstLine.includes("do")) {
        return firstLine;
      }
    }
  }

  return null;
}

function calculateSimilarity(headline: string, articleTitle: string): number {
  const norm1 = normalizeText(headline);
  const norm2 = normalizeText(articleTitle);

  if (norm1 === norm2) return 1.0;

  // Split into words
  const words1 = norm1.split(/\s+/).filter(Boolean);
  const words2 = norm2.split(/\s+/).filter(Boolean);

  if (words1.length === 0 || words2.length === 0) return 0;

  // Calculate Jaccard similarity
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  let matchCount = 0;
  for (const word of set1) {
    if (set2.has(word)) matchCount++;
  }

  const jaccardSimilarity = matchCount / (set1.size + set2.size - matchCount);

  // Boost score if words appear in order
  let orderBonus = 0;
  let w1Index = 0;
  for (let i = 0; i < words2.length && w1Index < words1.length; i++) {
    if (words1[w1Index] === words2[i]) {
      orderBonus += 0.1;
      w1Index++;
    }
  }

  const finalScore = Math.min(1.0, jaccardSimilarity + orderBonus * 0.2);
  return finalScore;
}

function extractOutletFromSource(source: string): string | null {
  const normalizedSource = source.toLowerCase();
  
  for (const [outlet, domains] of Object.entries(TRUSTED_OUTLET_DOMAINS)) {
    if (domains.some((domain) => normalizedSource.includes(domain))) {
      return outlet;
    }
    if (normalizedSource.includes(outlet.toLowerCase())) {
      return outlet;
    }
  }

  return null;
}

async function searchHeadlineInGoogle(headline: string): Promise<ArticleMatch[]> {
  try {
    const url = new URL(NEWS_API_CONFIG.googleNews.rssSearchEndpoint);
    url.searchParams.set("q", headline);
    url.searchParams.set("hl", "vi");
    url.searchParams.set("gl", "VN");
    url.searchParams.set("ceid", "VN:vi");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) return [];

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    // Check for XML parsing errors
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      return [];
    }

    const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 8);

    const articles: ArticleMatch[] = items
      .map((item) => {
        const title = item.querySelector("title")?.textContent?.trim() ?? "";
        const source = item.querySelector("source")?.textContent?.trim() ?? "Google News";
        const link = item.querySelector("link")?.textContent?.trim();
        const publishedAt = item.querySelector("pubDate")?.textContent?.trim();
        const similarity = calculateSimilarity(headline, title);

        return {
          title,
          source,
          link,
          publishedAt,
          similarityScore: similarity,
        };
      })
      .filter((article) => article.title && article.similarityScore > 0.3)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);

    return articles;
  } catch {
    return [];
  }
}

async function searchHeadlineInNewsApi(headline: string): Promise<ArticleMatch[]> {
  if (!NEWS_API_KEY) return [];

  try {
    const url = new URL(NEWS_API_CONFIG.newsApi.everythingEndpoint);
    url.searchParams.set("q", headline);
    url.searchParams.set("searchIn", "title");
    url.searchParams.set("sortBy", "relevancy");
    url.searchParams.set("pageSize", "8");

    const response = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": NEWS_API_KEY,
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const articles: ArticleMatch[] = (data.articles ?? [])
      .map((article: any) => {
        const title = article.title ?? "";
        const source = article.source?.name ?? "NewsAPI";
        const link = article.url;
        const publishedAt = article.publishedAt;
        const similarity = calculateSimilarity(headline, title);

        return {
          title,
          source,
          link,
          publishedAt,
          similarityScore: similarity,
        };
      })
      .filter((article) => article.title && article.similarityScore > 0.35)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);

    return articles;
  } catch {
    return [];
  }
}

async function searchHeadlineInFactCheck(headline: string): Promise<ArticleMatch[]> {
  if (!FACT_CHECK_API_KEY) return [];

  try {
    const url = new URL(NEWS_API_CONFIG.googleFactCheck.claimSearchEndpoint);
    url.searchParams.set("query", headline);
    url.searchParams.set("languageCode", "vi");
    url.searchParams.set("pageSize", "5");
    url.searchParams.set("key", FACT_CHECK_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    const data = await response.json();
    const claims = data.claims ?? [];

    const articles: ArticleMatch[] = claims
      .filter((claim: any) => claim.claimReview && claim.claimReview.length > 0)
      .slice(0, 3)
      .map((claim: any) => {
        const title = claim.text ?? "Fact Check Result";
        const review = claim.claimReview[0];
        const source = review?.publisher?.name ?? "Google Fact Check";
        const link = review?.url;
        const similarity = calculateSimilarity(headline, title);

        return {
          title,
          source,
          link,
          publishedAt: undefined,
          similarityScore: similarity,
        };
      })
      .filter((article) => article.similarityScore > 0.2);

    return articles;
  } catch {
    return [];
  }
}

export async function verifyHeadline(text: string): Promise<HeadlineVerificationResult> {
  const extractedHeadline = extractHeadlineFromText(text);

  if (!extractedHeadline) {
    return {
      isHeadline: false,
      matchedOutlets: [],
      verificationReasons: [],
      scoreDelta: 0,
      hasVerifiedCoverage: false,
    };
  }

  // Search for the headline across sources
  const [googleNewsArticles, newsApiArticles, factCheckArticles] = await Promise.all([
    searchHeadlineInGoogle(extractedHeadline),
    searchHeadlineInNewsApi(extractedHeadline),
    searchHeadlineInFactCheck(extractedHeadline),
  ]);

  const allArticles = [...googleNewsArticles, ...newsApiArticles, ...factCheckArticles];

  // Group by outlet
  const outletMap = new Map<string, ArticleMatch[]>();
  const outletScores = new Map<string, number[]>();

  for (const article of allArticles) {
    const outlet = extractOutletFromSource(article.source) || article.source;

    if (!outletMap.has(outlet)) {
      outletMap.set(outlet, []);
      outletScores.set(outlet, []);
    }

    outletMap.get(outlet)!.push(article);
    outletScores.get(outlet)!.push(article.similarityScore);
  }

  // Calculate average scores per outlet
  const matchedOutlets: VerifiedOutletMatch[] = Array.from(outletMap.entries())
    .map(([outlet, articles]) => {
      const scores = outletScores.get(outlet) ?? [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;

      return {
        outlet,
        articles: articles.sort((a, b) => b.similarityScore - a.similarityScore),
        matchScore: avgScore,
      };
    })
    .filter((m) => m.matchScore > 0.3)
    .sort((a, b) => b.matchScore - a.matchScore);

  // Check if verified by major outlets
  const verifiedByMajor = matchedOutlets.some(
    (m) => MAJOR_OUTLETS.some((outlet) => m.outlet.toLowerCase().includes(outlet.toLowerCase())) && m.matchScore > 0.5
  );

  const verifiedByMultiple = matchedOutlets.length >= 2;
  const verificationReasons: NewsAnalysisReason[] = [];
  let scoreDelta = 0;

  if (matchedOutlets.length > 0) {
    const topOutlet = matchedOutlets[0];
    const topArticles = topOutlet.articles.slice(0, 3);

    if (verifiedByMajor && topOutlet.matchScore > 0.6) {
      scoreDelta += 25;
      verificationReasons.push({
        id: "HEADLINE_VERIFIED_MAJOR",
        name: "Tiêu đề được báo lớn đưa tin",
        detail: `Tìm thấy ${topOutlet.articles.length} bài viết tương ứng từ ${topOutlet.outlet} (độ khớp: ${(topOutlet.matchScore * 100).toFixed(0)}%).`,
        status: "success",
        icon: CheckCircle2,
      });
    } else if (verifiedByMultiple && topOutlet.matchScore > 0.5) {
      scoreDelta += 18;
      verificationReasons.push({
        id: "HEADLINE_VERIFIED_MULTIPLE",
        name: "Tiêu đề được nhiều nguồn đưa tin",
        detail: `Tìm thấy ${matchedOutlets.length} nguồn báo chí đưa tin về tiêu đề này (nguồn hàng đầu: ${topOutlet.outlet}).`,
        status: "success",
        icon: Database,
      });
    } else if (matchedOutlets.length > 0 && topOutlet.matchScore > 0.4) {
      scoreDelta += 12;
      verificationReasons.push({
        id: "HEADLINE_PARTIAL_MATCH",
        name: "Tiêu đề được báo chí đưa tin một phần",
        detail: `Tìm thấy ${topOutlet.articles.length} bài viết liên quan từ ${topOutlet.outlet} (độ khớp: ${(topOutlet.matchScore * 100).toFixed(0)}%).`,
        status: "success",
        icon: ShieldCheck,
      });
    }

    // Add fact-check coverage info
    const factCheckOutlets = matchedOutlets.filter(
      (m) => m.outlet.toLowerCase().includes("fact") || m.outlet.includes("Google")
    );
    if (factCheckOutlets.length > 0) {
      scoreDelta += 8;
      verificationReasons.push({
        id: "HEADLINE_FACTCHECK_COVERAGE",
        name: "Có kiểm chứng từ Fact Check",
        detail: `Google Fact Check có bài kiểm chứng liên quan với độ khớp ${(factCheckOutlets[0].matchScore * 100).toFixed(0)}%.`,
        status: "success",
        icon: Zap,
      });
    }
  } else if (allArticles.length > 0) {
    // Low similarity matches
    const topArticle = allArticles[0];
    scoreDelta -= 5;
    verificationReasons.push({
      id: "HEADLINE_LOW_MATCH",
      name: "Tiêu đề không được báo chí lớn đưa tin",
      detail: `Không tìm thấy bài viết khớp hoàn toàn, chỉ tìm thấy bài liên quan từ ${topArticle.source}.`,
      status: "warning",
      icon: AlertTriangle,
    });
  }

  return {
    isHeadline: true,
    extractedHeadline,
    matchedOutlets,
    verificationReasons,
    scoreDelta,
    hasVerifiedCoverage: verifiedByMajor || verifiedByMultiple,
  };
}

export function isHeadlineText(text: string): boolean {
  // Quick check if text looks like a headline
  return extractHeadlineFromText(text) !== null;
}
