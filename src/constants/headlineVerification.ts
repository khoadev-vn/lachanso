import { CheckCircle2, AlertTriangle, Globe, Database, ShieldCheck, Zap } from "lucide-react";
import type { NewsAnalysisReason } from "./newsVerification";
export interface ArticleMatch {
  title: string;
  source: string;
  link?: string;
  publishedAt?: string;
  similarityScore: number;
  stance: "supporting" | "contradicting" | "neutral";
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
  hasContradictingCoverage: boolean;
}
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
"VOA"];

const HEADLINE_INDICATORS = [
/^(tin|news|sự kiện|thông tin|báo cáo)[\s:]/i,
/[!?]$/,
/^[A-ZÁÀẢÃẠĂẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zá-ỵ\s]+:\s+/];

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
  "VOA": ["voa.gov", "voiceofamerica.com"]
};
function normalizeText(text: string): string {
  return text.
  toLowerCase().
  normalize("NFD").
  replace(/[\u0300-\u036f]/g, "").
  replace(/[^\w\s-]/g, "").
  trim();
}
const CONTRADICTING_PATTERNS = [
/\btin gia\b/i,
/\bsai su that\b/i,
/\bkhong co that\b/i,
/\bkhong dung su that\b/i,
/\bdan dung\b/i,
/\bai tao dung\b/i,
/\btao dung\b/i,
/\bgia mao\b/i,
/\bbia dat\b/i,
/\bthat thiet\b/i,
/\bdebunk(?:ed)?\b/i,
/\bfake\b/i,
/\bfalse\b/i,
/\bhoax\b/i,
/\bfabricated\b/i,
/\bmisleading\b/i,
/\bkhong phai\b/i,
/\bkhong thuoc\b/i,
/\bchua bao gio\b/i,
/\bkhong co\b/i,
/\bkhong phai la\b/i,
/\bchuyen gia\b/i,
/\bac ky\b/i,
/\bnham lan\b/i,
/\bsai lech\b/i,
/\bkhong dung\b/i,
/\bdoan ngu\b/i,
/\bvu ban\b/i,
/\bloi dan\b/i];

const TEAM_NAME_MISMATCH_PATTERNS: Array<{claim: RegExp; reality: RegExp[]}> = [
  {
    claim: /ronaldo.*inter\s*miami|inter\s*miami.*ronaldo/i,
    reality: [/al\s*nassr/i, /manchester\s*united/i, /real\s*madrid/i, /juventus/i]
  },
  {
    claim: /messi.*al\s*nassr|al\s*nassr.*messi/i,
    reality: [/inter\s*miami/i, /paris\s*saint-germain/i, /barcelona/i]
  },
  {
    claim: /ronaldo.*viet\s*(nam|football)|viet\s*(nam|football).*ronaldo/i,
    reality: [/al\s*nassr/i, /manchester/i, /real\s*madrid/i]
  },
  {
    claim: /messi.*viet\s*(nam|football)|viet\s*(nam|football).*messi/i,
    reality: [/inter\s*miami/i, /paris/i, /barcelona/i]
  },
  {
    claim: /nguyen\s*van\s*toan.*messi|messi.*nguyen\s*van\s*toan/i,
    reality: [/inter\s*miami/i, /paris/i, /barcelona/i]
  },
  {
    claim: /ha\s*lan.*messi|messi.*ha\s*lan/i,
    reality: [/inter\s*miami/i, /paris/i, /barcelona/i]
  },
  {
    claim: /phuong\s*van\s*dao.*ronaldo|ronaldo.*phuong\s*van\s*dao/i,
    reality: [/al\s*nassr/i, /manchester/i, /real\s*madrid/i]
  },
  {
    claim: /club.*world.*cup.*viet\s*nam|viet\s*nam.*club.*world.*cup/i,
    reality: [/inter\s*miami/i, /real\s*madrid/i, /manchester/i]
  },
  {
    claim: /nguyen\s*ti\s*en\s*linh.*messi|messi.*nguyen\s*ti\s*en\s*linh/i,
    reality: [/inter\s*miami/i, /paris/i, /barcelona/i]
  }
];

export function getArticleClaimStance(title: string): "supporting" | "contradicting" | "neutral" {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) {
    return "neutral";
  }
  if (CONTRADICTING_PATTERNS.some((pattern) => pattern.test(normalizedTitle))) {
    return "contradicting";
  }
  return "supporting";
}

export function getClaimContradictionFromArticles(
  claimText: string,
  articles: Array<{title: string; snippet?: string}>
): {isContradicting: boolean; reason: string} {
  const claimLower = claimText.toLowerCase();
  
  for (const pattern of TEAM_NAME_MISMATCH_PATTERNS) {
    if (pattern.claim.test(claimText)) {
      for (const article of articles) {
        const articleText = `${article.title} ${article.snippet || ""}`.toLowerCase();
        for (const realityPattern of pattern.reality) {
          if (realityPattern.test(articleText)) {
            const realityMatch = articleText.match(realityPattern);
            const claimTeamMatch = claimText.match(pattern.claim);
            return {
              isContradicting: true,
              reason: `Báo chí cho thấy ${realityMatch?.[0]} là đội thật của cầu thủ, không phải đội trong tin đồn`
            };
          }
        }
      }
    }
  }
  
  return {isContradicting: false, reason: ""};
}
function extractHeadlineFromText(text: string): string | null {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length >= 10 &&
    firstLine.length <= 200 &&
    !firstLine.endsWith(".") &&
    !firstLine.startsWith("http") &&
    !firstLine.includes("://")) {
      for (const pattern of HEADLINE_INDICATORS) {
        if (pattern.test(firstLine)) {
          return firstLine;
        }
      }
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
  if (norm1 === norm2)
  return 1.0;
  const words1 = norm1.split(/\s+/).filter(Boolean);
  const words2 = norm2.split(/\s+/).filter(Boolean);
  if (words1.length === 0 || words2.length === 0)
  return 0;
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let matchCount = 0;
  for (const word of set1) {
    if (set2.has(word))
    matchCount++;
  }
  const jaccardSimilarity = matchCount / (set1.size + set2.size - matchCount);
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
    const url = new URL("/api/proxy/google-news/rss/search", window.location.origin);
    url.searchParams.set("q", headline);
    url.searchParams.set("hl", "vi");
    url.searchParams.set("gl", "VN");
    url.searchParams.set("ceid", "VN:vi");
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml"
      }
    });
    if (!response.ok)
    return [];
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      return [];
    }
    const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 8);
    const articles: ArticleMatch[] = items.
    map((item) => {
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
        stance: getArticleClaimStance(title)
      };
    }).
    filter((article) => article.title && article.similarityScore > 0.5).
    sort((a, b) => b.similarityScore - a.similarityScore).
    slice(0, 5);
    return articles;
  }
  catch {
    return [];
  }
}
async function searchHeadlineInNewsApi(headline: string): Promise<ArticleMatch[]> {
  try {
    const url = new URL("/api/proxy/bing-news/", window.location.origin);
    url.searchParams.set("q", headline);
    url.searchParams.set("format", "rss");
    url.searchParams.set("setlang", "vi");
    const response = await fetch(url.toString());
    if (!response.ok)
    return [];
    const xmlText = await response.text();
    if (!xmlText)
    return [];
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    if (xml.getElementsByTagName("parsererror").length > 0)
    return [];
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 8);
    return items.map((item) => {
      const title = item.querySelector("title")?.textContent?.trim() ?? "";
      const link = item.querySelector("link")?.textContent?.trim();
      const source = item.querySelector("News\\:Source")?.textContent?.trim() ?? item.querySelector("source")?.textContent?.trim() ?? "Bing News";
      const publishedAt = item.querySelector("pubDate")?.textContent?.trim();
      const similarity = calculateSimilarity(headline, title);
      return {
        title,
        source,
        link,
        publishedAt,
        similarityScore: similarity,
        stance: getArticleClaimStance(title)
      };
    }).filter((article) => article.title && article.similarityScore > 0.5).
    sort((a, b) => b.similarityScore - a.similarityScore).
    slice(0, 5);
  }
  catch {
    return [];
  }
}
async function searchHeadlineInFactCheck(headline: string): Promise<ArticleMatch[]> {
  try {
    const url = new URL("/api/proxy/bing-news/", window.location.origin);
    url.searchParams.set("q", headline + " fact check");
    url.searchParams.set("format", "rss");
    url.searchParams.set("setlang", "vi");
    const response = await fetch(url.toString());
    if (!response.ok)
    return [];
    const xmlText = await response.text();
    if (!xmlText)
    return [];
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    if (xml.getElementsByTagName("parsererror").length > 0)
    return [];
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 5);
    return items.map((item) => {
      const title = item.querySelector("title")?.textContent?.trim() ?? "";
      const link = item.querySelector("link")?.textContent?.trim();
      const source = item.querySelector("News\\:Source")?.textContent?.trim() ?? item.querySelector("source")?.textContent?.trim() ?? "Bing News";
      const similarity = calculateSimilarity(headline, title);
      return {
        title,
        source,
        link,
        publishedAt: item.querySelector("pubDate")?.textContent?.trim(),
        similarityScore: similarity,
        stance: getArticleClaimStance(title)
      };
    }).filter((article) => article.similarityScore > 0.45);
  }
  catch {
    return [];
  }
}
async function searchHeadlineInBingNews(headline: string): Promise<ArticleMatch[]> {
  try {
    const url = new URL("/api/proxy/bing-news/", window.location.origin);
    url.searchParams.set("q", headline);
    url.searchParams.set("format", "rss");
    url.searchParams.set("setlang", "vi");
    const response = await fetch(url.toString());
    if (!response.ok)
    return [];
    const xmlText = await response.text();
    if (!xmlText)
    return [];
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    if (xml.getElementsByTagName("parsererror").length > 0)
    return [];
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 5);
    return items.map((item) => {
      const title = item.querySelector("title")?.textContent?.trim() ?? "";
      const link = item.querySelector("link")?.textContent?.trim();
      const source = item.querySelector("News\\:Source")?.textContent?.trim() ?? item.querySelector("source")?.textContent?.trim() ?? "Bing News";
      const similarity = calculateSimilarity(headline, title);
      return {
        title,
        source,
        link,
        publishedAt: item.querySelector("pubDate")?.textContent?.trim(),
        similarityScore: similarity,
        stance: getArticleClaimStance(title)
      };
    }).filter((article) => article.title && article.similarityScore > 0.45);
  }
  catch {
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
      hasContradictingCoverage: false
    };
  }
  const [googleNewsArticles, newsApiArticles, factCheckArticles] = await Promise.all([
  searchHeadlineInGoogle(extractedHeadline),
  searchHeadlineInNewsApi(extractedHeadline),
  searchHeadlineInFactCheck(extractedHeadline).then((articles) => articles.length > 0 ? articles : searchHeadlineInBingNews(extractedHeadline))]
  );
  const allArticles = [...googleNewsArticles, ...newsApiArticles, ...factCheckArticles];
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
  const matchedOutlets: VerifiedOutletMatch[] = Array.from(outletMap.entries()).
  map(([outlet, articles]) => {
    const scores = outletScores.get(outlet) ?? [];
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;
    return {
      outlet,
      articles: articles.sort((a, b) => b.similarityScore - a.similarityScore),
      matchScore: avgScore
    };
  }).
  filter((m) => m.matchScore > 0.6).
  sort((a, b) => b.matchScore - a.matchScore);
  const verifiedByMajor = matchedOutlets.some((m) => MAJOR_OUTLETS.some((outlet) => m.outlet.toLowerCase().includes(outlet.toLowerCase())) && m.matchScore > 0.7);
  const verifiedByMultiple = matchedOutlets.length >= 3 && (matchedOutlets[0]?.matchScore ?? 0) > 0.65;
  const contradictingMatches = allArticles.filter((article) => article.stance === "contradicting" && article.similarityScore >= 0.45);
  const hasContradictingCoverage = contradictingMatches.length > 0;
  const verificationReasons: NewsAnalysisReason[] = [];
  let scoreDelta = 0;
  if (hasContradictingCoverage) {
    const topContradiction = contradictingMatches.sort((a, b) => b.similarityScore - a.similarityScore)[0];
    scoreDelta -= 45;
    verificationReasons.push({
      id: "HEADLINE_CONTRADICTED_BY_PRESS",
      name: "Tieu de bi bao chi bac bo",
      detail: `Tim thay bai doi chieu trung khop nhung theo huong bac bo claim; nguon dau: ${topContradiction.source} - ${topContradiction.title}.`,
      status: "danger",
      icon: AlertTriangle
    });
  } else
  if (matchedOutlets.length > 0) {
    const topOutlet = matchedOutlets[0];
    if (verifiedByMajor && topOutlet.matchScore > 0.7) {
      scoreDelta += 25;
      verificationReasons.push({
        id: "HEADLINE_VERIFIED_MAJOR",
        name: "Tiêu đề được báo lớn đưa tin",
        detail: `Tìm thấy ${topOutlet.articles.length} bài viết tương ứng từ ${topOutlet.outlet} (độ khớp: ${(topOutlet.matchScore * 100).toFixed(0)}%).`,
        status: "success",
        icon: CheckCircle2
      });
    } else
    if (verifiedByMultiple && topOutlet.matchScore > 0.65) {
      scoreDelta += 18;
      verificationReasons.push({
        id: "HEADLINE_VERIFIED_MULTIPLE",
        name: "Tiêu đề được nhiều nguồn đưa tin",
        detail: `Tìm thấy ${matchedOutlets.length} nguồn báo chí đưa tin về tiêu đề này (nguồn hàng đầu: ${topOutlet.outlet}).`,
        status: "success",
        icon: Database
      });
    } else
    if (matchedOutlets.length > 0 && topOutlet.matchScore > 0.55) {
      scoreDelta += 12;
      verificationReasons.push({
        id: "HEADLINE_PARTIAL_MATCH",
        name: "Tiêu đề được báo chí đưa tin một phần",
        detail: `Tìm thấy ${topOutlet.articles.length} bài viết liên quan từ ${topOutlet.outlet} (độ khớp: ${(topOutlet.matchScore * 100).toFixed(0)}%).`,
        status: "success",
        icon: ShieldCheck
      });
    }
    const factCheckOutlets = matchedOutlets.filter((m) => m.outlet.toLowerCase().includes("fact") || m.outlet.includes("Google"));
    if (factCheckOutlets.length > 0) {
      scoreDelta += 8;
      verificationReasons.push({
        id: "HEADLINE_FACTCHECK_COVERAGE",
        name: "Có kiểm chứng từ Fact Check",
        detail: `Google Fact Check có bài kiểm chứng liên quan với độ khớp ${(factCheckOutlets[0].matchScore * 100).toFixed(0)}%.`,
        status: "success",
        icon: Zap
      });
    }
  } else
  if (allArticles.length > 0) {
    const topArticle = allArticles[0];
    scoreDelta -= 5;
    verificationReasons.push({
      id: "HEADLINE_LOW_MATCH",
      name: "Tiêu đề không được báo chí lớn đưa tin",
      detail: `Không tìm thấy bài viết khớp hoàn toàn, chỉ tìm thấy bài liên quan từ ${topArticle.source}.`,
      status: "warning",
      icon: AlertTriangle
    });
  }
  return {
    isHeadline: true,
    extractedHeadline,
    matchedOutlets,
    verificationReasons,
    scoreDelta,
    hasVerifiedCoverage: (verifiedByMajor || verifiedByMultiple) && !hasContradictingCoverage,
    hasContradictingCoverage
  };
}
export function isHeadlineText(text: string): boolean {
  return extractHeadlineFromText(text) !== null;
}
