/**
 * Fraud Scoring Engine
 * Combines all analysis results into final fraud verdict
 */

export type FraudVerdict = "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "FRAUD_CONFIRMED";

export interface FraudAnalysisResult {
  url: string;
  verdict: FraudVerdict;
  fraudScore: 0-100;
  confidenceLevel: 0-100;
  fraudTypes: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  details: {
    urlScore: number;
    contentScore: number;
    visualScore: number;
    databaseScore: number;
    patternScore: number;
  };
  reasons: string[];
  recommendations: string[];
  warnings: string[];
  lastAnalyzed: Date;
}

/**
 * Calculate final fraud score from all analysis layers
 */
export function calculateFraudScore(analysisData: {
  urlScore: 0-25;
  contentScore: 0-30;
  visualScore: 0-20;
  databaseScore: 0-25;
  manipulationScore: 0-100;
}): { score: 0-100; confidence: 0-100 } {
  // Weight the scores
  let totalScore = 0;
  totalScore += analysisData.urlScore * 1.0; // 25 points max
  totalScore += analysisData.contentScore * 1.0; // 30 points max
  totalScore += analysisData.visualScore * 1.0; // 20 points max
  totalScore += analysisData.databaseScore * 1.0; // 25 points max

  // Add manipulation score (but cap at 20 additional points)
  totalScore += Math.min(20, analysisData.manipulationScore / 5);

  // Calculate confidence based on data consistency
  const scores = [
    analysisData.urlScore,
    analysisData.contentScore,
    analysisData.visualScore,
    analysisData.databaseScore,
  ];

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Higher consistency = higher confidence
  const consistency = Math.max(0, 100 - stdDev * 4);
  const confidenceBoost = analysisData.databaseScore > 15 ? 15 : 0; // Boost if in database

  const confidence = Math.min(100, consistency + confidenceBoost);

  return {
    score: Math.min(100, totalScore) as FraudAnalysisResult["fraudScore"],
    confidence: confidence as FraudAnalysisResult["confidenceLevel"],
  };
}

/**
 * Determine verdict based on fraud score
 */
export function determineVerdict(score: 0-100): FraudVerdict {
  if (score <= 20) return "SAFE";
  if (score <= 40) return "SUSPICIOUS";
  if (score <= 70) return "HIGH_RISK";
  return "FRAUD_CONFIRMED";
}

/**
 * Determine risk level
 */
export function determineRiskLevel(score: 0-100): FraudAnalysisResult["riskLevel"] {
  if (score <= 25) return "LOW";
  if (score <= 50) return "MEDIUM";
  if (score <= 75) return "HIGH";
  return "CRITICAL";
}

/**
 * Generate fraud analysis report
 */
export function generateFraudReport(
  url: string,
  analysisData: {
    urlScore: 0-25;
    contentScore: 0-30;
    visualScore: 0-20;
    databaseScore: 0-25;
    manipulationScore: 0-100;
    fraudTypes: string[];
    databaseMatches: Array<{ database: string; fraudType: string }>;
    suspiciousPatterns: Array<{ name: string; severity: string }>;
    urlDetails: string[];
    contentDetails: string[];
    visualDetails: string[];
    manipulationDetails: string[];
  }
): FraudAnalysisResult {
  const { score, confidence } = calculateFraudScore({
    urlScore: analysisData.urlScore,
    contentScore: analysisData.contentScore,
    visualScore: analysisData.visualScore,
    databaseScore: analysisData.databaseScore,
    manipulationScore: analysisData.manipulationScore,
  });

  const verdict = determineVerdict(score);
  const riskLevel = determineRiskLevel(score);

  const reasons: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Build reasons based on scores
  if (analysisData.urlScore > 15) {
    reasons.push("Domain shows suspicious characteristics");
    warnings.push(...analysisData.urlDetails.slice(0, 2));
  }

  if (analysisData.contentScore > 20) {
    reasons.push("Website content contains fraud indicators");
    warnings.push(...analysisData.contentDetails.slice(0, 2));
  }

  if (analysisData.visualScore > 10) {
    reasons.push("Visual analysis detected cloning patterns");
    warnings.push(...analysisData.visualDetails.slice(0, 1));
  }

  if (analysisData.databaseScore > 15) {
    reasons.push("Domain found in fraud databases");
    const dbMatches = analysisData.databaseMatches.map((m) => `  • ${m.database} (${m.fraudType})`);
    warnings.push(...dbMatches);
  }

  if (analysisData.manipulationScore > 60) {
    reasons.push("Website uses psychological manipulation tactics");
    warnings.push(...analysisData.manipulationDetails.slice(0, 2));
  }

  // Fraud types
  const fraudTypes = Array.from(new Set(analysisData.fraudTypes));

  // Add verdict-specific details
  switch (verdict) {
    case "FRAUD_CONFIRMED":
      recommendations.push("Report this website to authorities immediately");
      recommendations.push("Do not enter any personal or financial information");
      recommendations.push("Share the URL with cybersecurity organizations");
      break;

    case "HIGH_RISK":
      recommendations.push("Avoid using this website");
      recommendations.push("Verify through official channels before proceeding");
      recommendations.push("Be extremely cautious with any transactions");
      break;

    case "SUSPICIOUS":
      recommendations.push("Exercise caution before proceeding");
      recommendations.push("Verify information through official sources");
      recommendations.push("Avoid entering sensitive information");
      break;

    case "SAFE":
      recommendations.push("Website appears to be legitimate");
      recommendations.push("Standard security practices still recommended");
      break;
  }

  // Add specific recommendations based on fraud types
  if (fraudTypes.includes("gambling")) {
    recommendations.push("Avoid gambling websites - high addiction and fraud risk");
  }

  if (fraudTypes.includes("financial")) {
    recommendations.push("Verify investment opportunities with regulatory bodies");
  }

  if (fraudTypes.includes("phishing")) {
    recommendations.push("Never provide credentials to suspicious websites");
    recommendations.push("Always access official sites by typing URLs directly");
  }

  if (fraudTypes.includes("ecommerce")) {
    recommendations.push("Check seller reviews on multiple platforms");
    recommendations.push("Use secure payment methods with buyer protection");
  }

  if (fraudTypes.includes("malware")) {
    recommendations.push("Do not download files from this website");
    recommendations.push("Keep antivirus software updated");
  }

  return {
    url,
    verdict,
    fraudScore: score,
    confidenceLevel: confidence,
    fraudTypes,
    riskLevel,
    details: {
      urlScore: analysisData.urlScore,
      contentScore: analysisData.contentScore,
      visualScore: analysisData.visualScore,
      databaseScore: analysisData.databaseScore,
      patternScore: analysisData.manipulationScore,
    },
    reasons,
    recommendations,
    warnings,
    lastAnalyzed: new Date(),
  };
}

/**
 * Generate color code for verdict
 */
export function getVerdictColor(verdict: FraudVerdict): string {
  switch (verdict) {
    case "SAFE":
      return "#10b981"; // Green
    case "SUSPICIOUS":
      return "#f59e0b"; // Amber
    case "HIGH_RISK":
      return "#ef6632"; // Orange
    case "FRAUD_CONFIRMED":
      return "#ef4444"; // Red
  }
}

/**
 * Get emoji for verdict
 */
export function getVerdictEmoji(verdict: FraudVerdict): string {
  switch (verdict) {
    case "SAFE":
      return "✅";
    case "SUSPICIOUS":
      return "⚠️";
    case "HIGH_RISK":
      return "🚨";
    case "FRAUD_CONFIRMED":
      return "🛑";
  }
}
