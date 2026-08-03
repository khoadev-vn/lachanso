import type { FactCheckResult } from "../constants/liveFactApiEnhanced";
import type { WikipediaProfile } from "../constants/wikipediaEnhanced";
import type { PressSourceInfo, NewsArticle } from "../constants/pressSourceEnhanced";
export interface VerificationSource {
  type: "wikipedia" | "factcheck" | "press" | "pattern";
  confidence: number;
  verdict: "verified" | "false" | "mixed" | "unverified";
  weight: number;
}
export interface ConsensusVerification {
  finalVerdict: "verified" | "false" | "mixed" | "unverified";
  confidence: number;
  agreementScore: number;
  sourceCount: number;
  details: {
    wikipedia: VerificationSource | null;
    factcheck: VerificationSource | null;
    press: VerificationSource | null;
    pattern: VerificationSource | null;
  };
  manipulationScore: number;
  temporalRelevance: number;
}
export function calculateConsensus(sources: VerificationSource[]): ConsensusVerification {
  if (sources.length === 0) {
    return {
      finalVerdict: "unverified",
      confidence: 0,
      agreementScore: 0,
      sourceCount: 0,
      details: {
        wikipedia: null,
        factcheck: null,
        press: null,
        pattern: null
      },
      manipulationScore: 0,
      temporalRelevance: 0
    };
  }
  let totalWeight = 0;
  let verifiedScore = 0;
  let falseScore = 0;
  let mixedScore = 0;
  for (const source of sources) {
    const weight = source.weight * source.confidence;
    totalWeight += weight;
    switch (source.verdict) {
      case "verified":
        verifiedScore += weight;
        break;
      case "false":
        falseScore += weight;
        break;
      case "mixed":
        mixedScore += weight;
        break;
    }
  }
  const normalizedVerified = totalWeight > 0 ? verifiedScore / totalWeight : 0;
  const normalizedFalse = totalWeight > 0 ? falseScore / totalWeight : 0;
  const normalizedMixed = totalWeight > 0 ? mixedScore / totalWeight : 0;
  let finalVerdict: ConsensusVerification["finalVerdict"] = "unverified";
  if (normalizedVerified > 0.6 && normalizedFalse < 0.2) {
    finalVerdict = "verified";
  } else
  if (normalizedFalse > 0.6 && normalizedVerified < 0.2) {
    finalVerdict = "false";
  } else
  if (normalizedMixed > 0.4 || normalizedVerified > 0.3 && normalizedFalse > 0.3) {
    finalVerdict = "mixed";
  }
  const verdictCounts = [normalizedVerified, normalizedFalse, normalizedMixed];
  const maxVerdictScore = Math.max(...verdictCounts);
  const agreementScore = maxVerdictScore;
  const avgConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
  const confidence = Math.min(agreementScore * avgConfidence, 1);
  return {
    finalVerdict,
    confidence,
    agreementScore,
    sourceCount: sources.length,
    details: {
      wikipedia: sources.find((s) => s.type === "wikipedia") || null,
      factcheck: sources.find((s) => s.type === "factcheck") || null,
      press: sources.find((s) => s.type === "press") || null,
      pattern: sources.find((s) => s.type === "pattern") || null
    },
    manipulationScore: 0,
    temporalRelevance: 0
  };
}
export function detectManipulation(text: string): {
  score: number;
  patterns: Array<{
    name: string;
    severity: number;
  }>;
} {
  const patterns = [
  {
    name: "urgency_language",
    pattern: /\b(urgent|immediately|breaking|shocking|unbelievable|must|now)\b/gi,
    weight: 0.15
  },
  {
    name: "fear_mongering",
    pattern: /\b(danger|threat|crisis|catastrophe|disaster|scared|afraid)\b/gi,
    weight: 0.2
  },
  {
    name: "emotional_appeal",
    pattern: /\b(heartbreaking|terrible|horrible|disgusting|outrageous)\b/gi,
    weight: 0.1
  },
  {
    name: "financial_appeal",
    pattern: /\b(free money|get rich|make cash|unlimited income|financial breakthrough)\b/gi,
    weight: 0.25
  },
  {
    name: "conspiracy_language",
    pattern: /\b(hidden|secret|conspiracy|cover.?up|dark truth|they don't want you to know|exclusive)\b/gi,
    weight: 0.15
  },
  {
    name: "all_caps",
    pattern: /\b[A-Z]{4,}\b/g,
    weight: 0.08
  },
  {
    name: "excessive_punctuation",
    pattern: /[!?]{2,}/g,
    weight: 0.1
  }];

  let totalScore = 0;
  const detectedPatterns: Array<{
    name: string;
    severity: number;
  }> = [];
  for (const { name, pattern, weight } of patterns) {
    const matches = (text.match(pattern) || []).length;
    const wordCount = text.split(/\s+/).length;
    const normalizedMatches = Math.min(matches / Math.max(wordCount / 100, 1), 1);
    if (normalizedMatches > 0) {
      const severity = normalizedMatches * weight;
      totalScore += severity;
      detectedPatterns.push({ name, severity });
    }
  }
  return {
    score: Math.min(totalScore, 1),
    patterns: detectedPatterns.sort((a, b) => b.severity - a.severity)
  };
}
export function temporalAnalysis(claim: string, claimDate: Date | null): {
  relevance: number;
  isTimely: boolean;
  ageInDays: number;
  details: string;
} {
  const now = new Date();
  const analysisDate = claimDate || now;
  const ageInMs = now.getTime() - analysisDate.getTime();
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
  const datePatterns = [
  /\b\d{4}\b/,
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|tháng)\b/i,
  /\b(?:today|yesterday|tomorrow|this year|last year)\b/i];

  let hasTemporalRef = false;
  for (const pattern of datePatterns) {
    if (pattern.test(claim)) {
      hasTemporalRef = true;
      break;
    }
  }
  let relevance = 0.5;
  if (!hasTemporalRef) {
    relevance = 1;
  } else
  if (ageInDays <= 7) {
    relevance = 1;
  } else
  if (ageInDays <= 30) {
    relevance = 0.9;
  } else
  if (ageInDays <= 365) {
    relevance = 0.7;
  } else
  if (ageInDays <= 730) {
    relevance = 0.5;
  } else
  {
    relevance = 0.2;
  }
  return {
    relevance,
    isTimely: ageInDays <= 30 || !hasTemporalRef,
    ageInDays: Math.floor(ageInDays),
    details: `Claim is ${Math.floor(ageInDays)} days old. ${hasTemporalRef ? "Contains temporal references." : "No temporal references found."}`
  };
}
export function claimSpecificity(claim: string): {
  score: number;
  factors: {
    hasNumbers: boolean;
    hasNames: boolean;
    hasLocation: boolean;
    hasDate: boolean;
    specificity: number;
  };
} {
  const hasNumbers = /\d+/.test(claim);
  const hasNames = /\b[A-ZÀ-Ỹ][\w\s]*[A-ZÀ-Ỹ]\b/u.test(claim);
  const hasLocation = /\b(at|in|from|to|near|between)\s+[A-Z]/i.test(claim);
  const hasDate = /\d{4}|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(claim);
  let specificity = 0;
  if (hasNumbers)
  specificity += 0.25;
  if (hasNames)
  specificity += 0.25;
  if (hasLocation)
  specificity += 0.25;
  if (hasDate)
  specificity += 0.25;
  return {
    score: Math.min(specificity, 1),
    factors: {
      hasNumbers,
      hasNames,
      hasLocation,
      hasDate,
      specificity
    }
  };
}
export function verifyWithWeights(wikipediaProfile: WikipediaProfile | null, factCheckResults: FactCheckResult[], pressArticles: NewsArticle[], claim: string): ConsensusVerification {
  const sources: VerificationSource[] = [];
  if (wikipediaProfile) {
    sources.push({
      type: "wikipedia",
      verdict: "verified",
      confidence: 0.8,
      weight: 0.9
    });
  }
  if (factCheckResults.length > 0) {
    const falseCount = factCheckResults.filter((r) => r.rating === "false").length;
    const trueCount = factCheckResults.filter((r) => r.rating === "true").length;
    let verdict: VerificationSource["verdict"] = "unverified";
    if (falseCount > trueCount) {
      verdict = "false";
    } else
    if (trueCount > falseCount) {
      verdict = "verified";
    } else
    if (falseCount > 0 || trueCount > 0) {
      verdict = "mixed";
    }
    const avgConfidence = factCheckResults.reduce((sum, r) => sum + r.confidence, 0) / factCheckResults.length;
    sources.push({
      type: "factcheck",
      verdict,
      confidence: avgConfidence,
      weight: 0.85
    });
  }
  if (pressArticles.length > 0) {
    const avgCredibility = pressArticles.reduce((sum, a) => sum + a.credibilityScore, 0) / pressArticles.length;
    sources.push({
      type: "press",
      verdict: pressArticles.length >= 3 ? "verified" : "mixed",
      confidence: Math.min(pressArticles.length / 5, 1),
      weight: avgCredibility / 100
    });
  }
  return calculateConsensus(sources);
}
export function combineAnalyses(consensus: ConsensusVerification, manipulation: ReturnType<typeof detectManipulation>, temporal: ReturnType<typeof temporalAnalysis>, specificity: ReturnType<typeof claimSpecificity>): ConsensusVerification {
  const manipulationPenalty = manipulation.score * 0.3;
  const temporalBoost = temporal.relevance * 0.1;
  const specificityBoost = specificity.score * 0.1;
  const adjustedConfidence = Math.min(Math.max(consensus.confidence - manipulationPenalty + temporalBoost + specificityBoost, 0), 1);
  return {
    ...consensus,
    confidence: adjustedConfidence,
    manipulationScore: manipulation.score,
    temporalRelevance: temporal.relevance
  };
}
