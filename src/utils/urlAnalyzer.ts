interface DomainAnalysis {
    domain: string;
    isDomainSuspicious: boolean;
    suspiciousReason: string[];
    sslInfo: {
        hasSSL: boolean;
        isValid: boolean;
        issuer: string;
    };
    domainAge: {
        estimatedAge: string;
        isNewDomain: boolean;
    };
    domainReputation: {
        score: number;
        isBlacklisted: boolean;
    };
    urlScore: number;
    details: string[];
}
const SUSPICIOUS_TLDS = [
    ".tk", ".ml", ".ga", ".cf", ".gq",
    ".pw", ".xyz", ".top", ".download", ".review",
    ".trade", ".info", ".online", ".site", ".space",
    ".work", ".loan", ".charity", ".click",
    ".country", ".faith", ".family", ".games",
    ".qa", ".co", ".gg", ".live", ".pro",
    ".win", ".casino", ".poker", ".bet", ".bingo",
    ".uk", ".tv", ".cc", ".ws", ".vg", ".ai",
    ".cd", ".ch", ".ky", ".mn", ".sb", ".do", ".shop",
];
const SUSPICIOUS_DOMAIN_PATTERNS = [
    /secure[\w-]*\.(bank|credit|paypal)/i,
    /verify[\w-]*\.(account|login|identity)/i,
    /confirm[\w-]*\.(password|pin|otp)/i,
    /(apple|google|facebook|amazon|bank|paypal)[\w-]*\.(?!com|org|net)/i,
    /bit[\w-]*coin/i,
    /crypto[\w-]*cash/i,
    /(\d{1,3}\.){3}\d{1,3}/,
];
const LEGITIMATE_DOMAINS = new Set([
    "google.com", "facebook.com", "youtube.com", "amazon.com",
    "wikipedia.org", "github.com", "stackoverflow.com",
    "microsoft.com", "apple.com", "netflix.com",
    "instagram.com", "twitter.com", "linkedin.com",
    "reddit.com", "ebay.com", "alibaba.com",
]);
export async function analyzeUrl(urlString: string): Promise<DomainAnalysis> {
    const urlScore: DomainAnalysis["urlScore"] = 0;
    const suspiciousReasons: string[] = [];
    const details: string[] = [];
    try {
        const url = new URL(urlString);
        const domain = url.hostname.toLowerCase();
        if (LEGITIMATE_DOMAINS.has(domain)) {
            return {
                domain,
                isDomainSuspicious: false,
                suspiciousReason: [],
                sslInfo: { hasSSL: url.protocol === "https:", isValid: true, issuer: "Legitimate" },
                domainAge: { estimatedAge: "Established", isNewDomain: false },
                domainReputation: { score: 95, isBlacklisted: false },
                urlScore: 0,
                details: ["Domain is in whitelist of legitimate services"],
            };
        }
        const ipMatch = domain.match(/^(\d{1,3}\.){3}\d{1,3}$/);
        if (ipMatch) {
            suspiciousReasons.push("Domain uses IP address instead of registered domain");
            details.push("IP-based domains are commonly used in phishing attacks");
        }
        const tld = domain.substring(domain.lastIndexOf("."));
        if (SUSPICIOUS_TLDS.includes(tld.toLowerCase())) {
            suspiciousReasons.push(`Suspicious TLD: ${tld}`);
            details.push("This TLD is commonly used for fraudulent websites");
        }
        for (const pattern of SUSPICIOUS_DOMAIN_PATTERNS) {
            if (pattern.test(domain)) {
                suspiciousReasons.push(`Suspicious domain pattern: ${pattern.source}`);
                details.push("Domain appears to impersonate a legitimate service");
                break;
            }
        }
        const isNewDomain = estimateDomainAge(domain);
        if (isNewDomain) {
            suspiciousReasons.push("Domain was registered recently");
            details.push("New domains are sometimes used for fraudulent activities");
        }
        const hasSSL = url.protocol === "https:";
        if (!hasSSL) {
            suspiciousReasons.push("Website uses HTTP instead of HTTPS");
            details.push("Unencrypted connections can be used to intercept data");
        }
        const subdomainCount = (domain.match(/\./g) || []).length;
        if (subdomainCount > 3) {
            suspiciousReasons.push("Domain has unusually many subdomains");
            details.push("This pattern is sometimes used to evade detection");
        }
        let urlAnalysisScore = 0;
        urlAnalysisScore += suspiciousReasons.length > 0 ? 8 : 0;
        urlAnalysisScore += !hasSSL ? 5 : 0;
        urlAnalysisScore += isNewDomain ? 7 : 0;
        urlAnalysisScore += SUSPICIOUS_TLDS.includes(tld) ? 5 : 0;
        return {
            domain,
            isDomainSuspicious: suspiciousReasons.length > 0,
            suspiciousReason: suspiciousReasons,
            sslInfo: {
                hasSSL,
                isValid: hasSSL,
                issuer: hasSSL ? "HTTPS Enabled" : "No SSL",
            },
            domainAge: {
                estimatedAge: isNewDomain ? "<6 months" : ">6 months",
                isNewDomain,
            },
            domainReputation: {
                score: Math.max(0, 100 - urlAnalysisScore * 4),
                isBlacklisted: suspiciousReasons.length > 2,
            },
            urlScore: Math.min(25, urlAnalysisScore) as DomainAnalysis["urlScore"],
            details,
        };
    }
    catch (error) {
        console.error("[v0] URL analysis error:", error);
        return {
            domain: urlString,
            isDomainSuspicious: true,
            suspiciousReason: ["Invalid URL format"],
            sslInfo: { hasSSL: false, isValid: false, issuer: "Unknown" },
            domainAge: { estimatedAge: "Unknown", isNewDomain: true },
            domainReputation: { score: 20, isBlacklisted: true },
            urlScore: 15,
            details: ["Failed to analyze URL properly"],
        };
    }
}
function estimateDomainAge(domain: string): boolean {
    const hasRandomChars = /\d{4,}|-{2,}|[a-z]{3,}\d{3,}/.test(domain);
    const looksGenerated = /^(bit|crypt|block|chain|coin|pay|cash|bank|secure|verify|confirm)/i.test(domain.split(".")[0]);
    return hasRandomChars || looksGenerated;
}
export function extractDomain(urlString: string): string {
    try {
        const url = new URL(urlString.startsWith("http") ? urlString : `https://${urlString}`);
        return url.hostname;
    }
    catch {
        return urlString;
    }
}
export function normalizeUrl(urlString: string): string {
    try {
        const url = new URL(urlString.startsWith("http") ? urlString : `https://${urlString}`);
        return url.toString();
    }
    catch {
        return urlString;
    }
}
