interface PatternDetectionResult {
    detectedPatterns: {
        name: string;
        severity: "low" | "medium" | "high";
        description: string;
    }[];
    urgencyScore: number;
    trustScore: number;
    hasRedFlags: boolean;
    recommendations: string[];
}
const URGENCY_PATTERNS = [
    { pattern: /act\s+now|hurry|limited\s+time|expires?\s+(today|soon|in\s+\d+\s+hours)/i, weight: 10 },
    { pattern: /deadline|rush|quick|immediately|don't\s+wait/i, weight: 8 },
    { pattern: /last\s+chance|final\s+offer|today\s+only|while\s+supplies\s+last/i, weight: 9 },
    { pattern: /urgent|emergency|critical|important\s+alert/i, weight: 10 },
    { pattern: /confirm\s+now|verify\s+immediately|update\s+password\s+now/i, weight: 11 },
];
const FEAR_PATTERNS = [
    { pattern: /unusual\s+activity|suspicious\s+login|unauthorized\s+access/i, weight: 11 },
    { pattern: /account\s+locked|account\s+suspended|account\s+disabled/i, weight: 12 },
    { pattern: /confirm\s+identity|verify\s+identity|security\s+check/i, weight: 10 },
    { pattern: /update\s+payment|billing\s+problem|payment\s+failed/i, weight: 10 },
    { pattern: /action\s+required|attention\s+required|please\s+confirm/i, weight: 9 },
];
const FINANCIAL_PATTERNS = [
    { pattern: /guaranteed\s+profit|risk-free\s+return|guaranteed\s+return/i, weight: 12 },
    { pattern: /easy\s+money|passive\s+income|earn\s+while\s+sleep/i, weight: 11 },
    { pattern: /(\d{2,3})%\s+profit|high\s+yield|exceptional\s+return/i, weight: 10 },
    { pattern: /limited\s+offer|exclusive\s+opportunity|special\s+opportunity/i, weight: 8 },
    { pattern: /invest\s+now|double\s+your\s+money|multiply\s+your\s+investment/i, weight: 10 },
];
const CONSPIRACY_PATTERNS = [
    { pattern: /hidden\s+from\s+public|secret\s+investment|private\s+network/i, weight: 10 },
    { pattern: /insider\s+information|special\s+access|exclusive\s+membership/i, weight: 9 },
    { pattern: /millionaires?\s+only|high-net-worth|elite\s+members/i, weight: 8 },
    { pattern: /government\s+secret|classified|not\s+available\s+in\s+your\s+country/i, weight: 10 },
    { pattern: /celebrities?\s+endorse|celebrity\s+use|celebrities?\s+invest/i, weight: 9 },
];
const PRESSURE_PATTERNS = [
    { pattern: /limited\s+spaces?|only\s+\d+\s+left|slots?\s+available/i, weight: 9 },
    { pattern: /everyone\s+else|join\s+thousands|success\s+stories|real\s+people/i, weight: 8 },
    { pattern: /don't\s+miss\s+out|last\s+chance|before\s+it's\s+gone/i, weight: 9 },
    { pattern: /testimonials?|proof|results|earnings\s+screenshot/i, weight: 7 },
    { pattern: /your\s+friend|referred\s+by|exclusive\s+referral/i, weight: 6 },
];
const MALWARE_PATTERNS = [
    { pattern: /download\s+now|install\s+now|run\s+now/i, weight: 10 },
    { pattern: /\.exe|\.scr|\.bat|\.com(?!\s*$)|\.zip|\.rar|\.7z/i, weight: 12 },
    { pattern: /setup|installer|executable|application/i, weight: 8 },
    { pattern: /flash\s+player\s+update|java\s+update|windows\s+update/i, weight: 11 },
    { pattern: /plugin|codec|driver\s+update/i, weight: 9 },
];
export function detectSuspiciousPatterns(textContent: string, htmlContent: string): PatternDetectionResult {
    const detectedPatterns: PatternDetectionResult["detectedPatterns"] = [];
    let urgencyScore = 0;
    let trustScore = 100;
    const recommendations: string[] = [];
    const fullContent = `${textContent} ${htmlContent}`.toLowerCase();
    for (const { pattern, weight } of URGENCY_PATTERNS) {
        if (pattern.test(fullContent)) {
            urgencyScore += weight;
            detectedPatterns.push({
                name: "Urgency Trigger",
                severity: "high",
                description: "Content uses time pressure and urgency language",
            });
            recommendations.push("Be cautious of websites pushing you to act quickly");
            break;
        }
    }
    for (const { pattern, weight } of FEAR_PATTERNS) {
        if (pattern.test(fullContent)) {
            urgencyScore += weight;
            trustScore -= 15;
            detectedPatterns.push({
                name: "Fear/Alarm Trigger",
                severity: "high",
                description: "Website uses fear and alarm to trigger action",
            });
            recommendations.push("Verify account issues directly with official channels");
            break;
        }
    }
    for (const { pattern, weight } of FINANCIAL_PATTERNS) {
        if (pattern.test(fullContent)) {
            urgencyScore += weight;
            trustScore -= 20;
            detectedPatterns.push({
                name: "Financial Promise",
                severity: "high",
                description: "Unrealistic financial promises or guaranteed returns",
            });
            recommendations.push("No investment can guarantee risk-free returns");
            break;
        }
    }
    for (const { pattern, weight } of CONSPIRACY_PATTERNS) {
        if (pattern.test(fullContent)) {
            urgencyScore += weight;
            trustScore -= 18;
            detectedPatterns.push({
                name: "Conspiracy/Exclusivity",
                severity: "medium",
                description: "Claims of secret or exclusive information",
            });
            recommendations.push("Legitimate services don't hide behind conspiracy language");
            break;
        }
    }
    for (const { pattern, weight } of PRESSURE_PATTERNS) {
        if (pattern.test(fullContent)) {
            urgencyScore += weight / 2;
            detectedPatterns.push({
                name: "Social Pressure",
                severity: "medium",
                description: "Artificial scarcity or social proof tactics",
            });
            recommendations.push("Don't let artificial scarcity pressure your decision");
            break;
        }
    }
    for (const { pattern, weight } of MALWARE_PATTERNS) {
        if (pattern.test(fullContent)) {
            trustScore -= 25;
            detectedPatterns.push({
                name: "Executable/Malware Risk",
                severity: "high",
                description: "Website offers executable files or suspicious downloads",
            });
            recommendations.push("Never download files from suspicious websites");
            break;
        }
    }
    const clonedBrandPatterns = [
        /appl[ie]+/i, /gooqle|g00gle/i, /f4c3b00k|f4c3book/i,
        /amaz0n|amaz[o0]n/i, /pa[yp4]+p4l/i, /str[i1]p[e3]/i,
    ];
    for (const pattern of clonedBrandPatterns) {
        if (pattern.test(fullContent)) {
            trustScore -= 15;
            detectedPatterns.push({
                name: "Brand Cloning",
                severity: "high",
                description: "Website uses misspelled or cloned brand names",
            });
            recommendations.push("Verify you're on the official website by typing the URL directly");
            break;
        }
    }
    const blackmailPatterns = [
        /video.*of.*you|screenshot|embarrassing|secret|expose/i,
        /malware.*found|virus.*detected|illegal.*content/i,
        /payment.*within|hours?.*or.*will|unless.*pay/i,
    ];
    for (const pattern of blackmailPatterns) {
        if (pattern.test(fullContent)) {
            trustScore -= 30;
            detectedPatterns.push({
                name: "Extortion/Blackmail",
                severity: "high",
                description: "Website contains extortion or blackmail threats",
            });
            recommendations.push("This is a scam. Do not respond or pay. Report to authorities.");
            break;
        }
    }
    return {
        detectedPatterns,
        urgencyScore: Math.min(100, urgencyScore) as PatternDetectionResult["urgencyScore"],
        trustScore: Math.max(0, trustScore) as PatternDetectionResult["trustScore"],
        hasRedFlags: detectedPatterns.length > 0,
        recommendations,
    };
}
export function calculateManipulationRisk(patterns: PatternDetectionResult): number {
    if (!patterns.hasRedFlags)
        return 0;
    return Math.min(100, patterns.urgencyScore + (100 - patterns.trustScore));
}
export function getPatternSeveritySummary(patterns: PatternDetectionResult): "none" | "low" | "medium" | "high" {
    if (patterns.detectedPatterns.length === 0)
        return "none";
    const hasHighSeverity = patterns.detectedPatterns.some((p) => p.severity === "high");
    if (hasHighSeverity)
        return "high";
    const hasMediumSeverity = patterns.detectedPatterns.some((p) => p.severity === "medium");
    if (hasMediumSeverity)
        return "medium";
    return "low";
}
