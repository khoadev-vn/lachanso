import { analyzeUrl, normalizeUrl, extractDomain } from "./urlAnalyzer";
import { analyzeHtmlContent } from "./htmlContentAnalyzer";
import { detectSuspiciousPatterns, calculateManipulationRisk } from "./suspiciousPatternDetector";
import { checkFraudDatabase, checkDomainSimilarity, checkFraudKeywords } from "./fraudDatabaseManager";
import { analyzeScreenshot } from "./screenshotAnalyzer";
import { calculateFraudScore, generateFraudReport, determineVerdict } from "./fraudScoringEngine";
import type { FraudAnalysisResult } from "./fraudScoringEngine";
const analysisCache = new Map<string, {
  result: FraudAnalysisResult;
  timestamp: Date;
}>();
const CACHE_TTL = 1000 * 60 * 60;
export async function analyzeWebsiteForFraud(urlInput: string): Promise<FraudAnalysisResult> {
  try {
    const normalizedUrl = normalizeUrl(urlInput);
    const domain = extractDomain(normalizedUrl);
    const cached = analysisCache.get(domain);
    if (cached && Date.now() - cached.timestamp.getTime() < CACHE_TTL) {
      console.log("[v0] Using cached result for:", domain);
      return cached.result;
    }
    console.log("[v0] Starting web fraud analysis for:", normalizedUrl);
    console.log("[v0] Phase 1: Analyzing URL...");
    const urlAnalysis = await analyzeUrl(normalizedUrl);
    const urlScore = urlAnalysis.urlScore;
    console.log("[v0] Phase 2: Analyzing HTML content...");
    let htmlContent = "";
    let contentScore = 0;
    let htmlAnalysis: any = null;
    let fraudKeywords: any = null;
    try {
      const response = await fetch(normalizedUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      }).catch(() => null);
      if (response && response.ok) {
        htmlContent = await response.text();
        htmlAnalysis = await analyzeHtmlContent(htmlContent);
        contentScore = htmlAnalysis.htmlScore;
        fraudKeywords = await checkFraudKeywords(htmlAnalysis.textContent);
      }
    }
    catch (error) {
      console.error("[v0] Error fetching HTML content:", error);
      contentScore = 5;
    }
    console.log("[v0] Phase 3: Detecting suspicious patterns...");
    const patterns = detectSuspiciousPatterns(htmlAnalysis?.textContent || "", htmlContent);
    const manipulationScore = calculateManipulationRisk(patterns);
    console.log("[v0] Phase 4: Checking fraud databases...");
    const databaseMatches = await checkFraudDatabase(domain);
    const similarDomains = await checkDomainSimilarity(domain);
    let databaseScore = 0;
    if (databaseMatches.length > 0) {
      databaseScore = 25;
      console.log("[v0] Domain found in fraud database:", databaseMatches);
    } else
    if (similarDomains.hasSimilar) {
      databaseScore = Math.min(22, similarDomains.riskScore + 15);
      console.log("[v0] Similar domain detected:", similarDomains.similarDomains);
    }
    console.log("[v0] Phase 5: Analyzing visual elements...");
    const visualAnalysis = await analyzeScreenshot(htmlContent, normalizedUrl);
    const visualScore = visualAnalysis.visualScore;
    const fraudTypes: string[] = [];
    if (fraudKeywords?.detectedTypes) {
      fraudTypes.push(...fraudKeywords.detectedTypes);
    }
    if (databaseMatches.length > 0) {
      fraudTypes.push(...databaseMatches.map((m) => m.fraudType));
    }
    const analysisData = {
      urlScore: (urlScore as 0) - 25,
      contentScore: (contentScore as 0) - 30,
      visualScore: (visualScore as 0) - 20,
      databaseScore: (databaseScore as 0) - 25,
      manipulationScore: (manipulationScore as 0) - 100,
      fraudTypes: Array.from(new Set(fraudTypes)),
      databaseMatches: databaseMatches.map((m) => ({
        database: m.database,
        fraudType: m.fraudType
      })),
      suspiciousPatterns: patterns.detectedPatterns,
      urlDetails: urlAnalysis.details,
      contentDetails: htmlAnalysis?.details || [],
      visualDetails: visualAnalysis.details,
      manipulationDetails: patterns.recommendations
    };
    console.log("[v0] Phase 6: Generating final verdict...");
    const result = generateFraudReport(normalizedUrl, analysisData);
    analysisCache.set(domain, { result, timestamp: new Date() });
    console.log("[v0] Analysis complete. Verdict:", result.verdict, "Score:", result.fraudScore);
    return result;
  }
  catch (error) {
    console.error("[v0] Web fraud analysis error:", error);
    return {
      url: urlInput,
      verdict: "SUSPICIOUS",
      fraudScore: 35,
      confidenceLevel: 20,
      fraudTypes: [],
      riskLevel: "MEDIUM",
      details: {
        urlScore: 0,
        contentScore: 0,
        visualScore: 0,
        databaseScore: 0,
        patternScore: 0
      },
      reasons: ["Unable to complete full analysis"],
      recommendations: ["Verify this website through official channels"],
      warnings: ["Analysis encountered errors - result may be incomplete"],
      lastAnalyzed: new Date()
    };
  }
}
export async function quickCheckWebsite(urlInput: string): Promise<FraudAnalysisResult> {
  const normalizedUrl = normalizeUrl(urlInput);
  const domain = extractDomain(normalizedUrl);
  const cached = analysisCache.get(domain);
  if (cached && Date.now() - cached.timestamp.getTime() < CACHE_TTL) {
    return cached.result;
  }
  const urlAnalysis = await analyzeUrl(normalizedUrl);
  const databaseMatches = await checkFraudDatabase(domain);
  const similarDomains = await checkDomainSimilarity(domain);
  let databaseScore = 0;
  if (databaseMatches.length > 0) {
    databaseScore = 25;
  } else
  if (similarDomains.hasSimilar) {
    databaseScore = Math.min(20, similarDomains.riskScore + 10);
  }
  const { score } = calculateFraudScore({
    urlScore: urlAnalysis.urlScore,
    contentScore: 0,
    visualScore: 0,
    databaseScore: (databaseScore as 0) - 25,
    manipulationScore: 0
  });
  const result: FraudAnalysisResult = {
    url: normalizedUrl,
    verdict: determineVerdict(score),
    fraudScore: score,
    confidenceLevel: databaseMatches.length > 0 ? 90 : 40,
    fraudTypes: Array.from(new Set(databaseMatches.map((m) => m.fraudType))),
    riskLevel: score > 50 ? "HIGH" : score > 25 ? "MEDIUM" : "LOW",
    details: {
      urlScore: urlAnalysis.urlScore,
      contentScore: 0,
      visualScore: 0,
      databaseScore: (databaseScore as 0) - 25,
      patternScore: 0
    },
    reasons: [
    ...urlAnalysis.details,
    ...(databaseMatches.length > 0 ? [`Found in ${databaseMatches[0].database}`] : [])],

    recommendations: urlAnalysis.suspiciousReason.length > 0 ?
    ["Verify this website carefully before proceeding"] :
    ["Website appears safe based on initial check"],
    warnings: [...urlAnalysis.suspiciousReason],
    lastAnalyzed: new Date()
  };
  analysisCache.set(domain, { result, timestamp: new Date() });
  return result;
}
export function clearAnalysisCache(): void {
  analysisCache.clear();
  console.log("[v0] Analysis cache cleared");
}
export function getCacheStats(): {
  size: number;
  entries: string[];
} {
  return {
    size: analysisCache.size,
    entries: Array.from(analysisCache.keys())
  };
}
