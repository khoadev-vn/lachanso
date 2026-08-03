export type FraudVerdict = "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "FRAUD_CONFIRMED";
export interface FraudAnalysisResult {
    url: string;
    verdict: FraudVerdict;
    fraudScore: number;
    confidenceLevel: number;
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
export function calculateFraudScore(analysisData: {
    urlScore: number;
    contentScore: number;
    visualScore: number;
    databaseScore: number;
    manipulationScore: number;
}): {
    score: number;
    confidence: number;
} {
    let totalScore = 0;
    if (analysisData.databaseScore > 20) {
        totalScore += 35;
    }
    else {
        totalScore += analysisData.databaseScore * 1.4;
    }
    if (analysisData.contentScore > 25) {
        totalScore += 28;
    }
    else {
        totalScore += analysisData.contentScore * 1.2;
    }
    totalScore += analysisData.urlScore * 1.1;
    totalScore += analysisData.visualScore * 1.0;
    totalScore += Math.min(25, analysisData.manipulationScore / 4);
    const scores = [
        analysisData.urlScore,
        analysisData.contentScore,
        analysisData.visualScore,
        analysisData.databaseScore,
    ];
    const maxScore = Math.max(...scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    let confidence = 50 + Math.min(50, avg * 1.5);
    if (analysisData.databaseScore > 20) {
        confidence = Math.min(100, confidence + 30);
    }
    if (analysisData.contentScore > 20) {
        confidence = Math.min(100, confidence + 20);
    }
    return {
        score: Math.min(100, totalScore) as FraudAnalysisResult["fraudScore"],
        confidence: Math.min(100, confidence) as FraudAnalysisResult["confidenceLevel"],
    };
}
export function determineVerdict(score: number): FraudVerdict {
    if (score <= 15)
        return "SAFE";
    if (score <= 35)
        return "SUSPICIOUS";
    if (score <= 60)
        return "HIGH_RISK";
    return "FRAUD_CONFIRMED";
}
export function determineRiskLevel(score: number): FraudAnalysisResult["riskLevel"] {
    if (score <= 25)
        return "LOW";
    if (score <= 50)
        return "MEDIUM";
    if (score <= 75)
        return "HIGH";
    return "CRITICAL";
}
export function generateFraudReport(url: string, analysisData: {
    urlScore: number;
    contentScore: number;
    visualScore: number;
    databaseScore: number;
    manipulationScore: number;
    fraudTypes: string[];
    databaseMatches: Array<{
        database: string;
        fraudType: string;
    }>;
    suspiciousPatterns: Array<{
        name: string;
        severity: string;
    }>;
    urlDetails: string[];
    contentDetails: string[];
    visualDetails: string[];
    manipulationDetails: string[];
}): FraudAnalysisResult {
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
    const fraudTypes = Array.from(new Set(analysisData.fraudTypes));
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
export function getVerdictColor(verdict: FraudVerdict): string {
    switch (verdict) {
        case "SAFE":
            return "#10b981";
        case "SUSPICIOUS":
            return "#f59e0b";
        case "HIGH_RISK":
            return "#ef6632";
        case "FRAUD_CONFIRMED":
            return "#ef4444";
    }
}
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
