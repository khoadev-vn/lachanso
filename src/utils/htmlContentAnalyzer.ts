interface ContentAnalysisResult {
    htmlScore: number;
    hasLoginForm: boolean;
    hasPaymentForm: boolean;
    hasCreditCardField: boolean;
    hasPasswordField: boolean;
    totalForms: number;
    fraudKeywords: {
        gambling: string[];
        financial: string[];
        phishing: string[];
        ecommerce: string[];
        malware: string[];
    };
    suspiciousPatterns: string[];
    textContent: string;
    metaTags: Record<string, string>;
    externalLinks: string[];
    suspiciousLinks: string[];
    details: string[];
}
const FRAUD_KEYWORDS = {
    gambling: [
        "deposit", "withdraw", "bonus", "jackpot", "casino", "poker", "betting",
        "odds", "baccarat", "slots", "roulette", "sports betting", "live betting",
        "sunwin", "vin777", "iwin", "f8bet", "fun88", "188bet", "12play", "w88", "ae888",
        "sands", "kingbet", "bet88", "online-casino",
        "cờ bạc", "tài xỉu", "đánh bạc", "sòng bạc", "cá cược", "chơi bài",
        "chơi game", "nạp tiền", "rút tiền", "thưởng", "người chơi",
        "play now", "chơi ngay", "đăng ký", "tham gia", "tái nạp",
        "thưởng miễn phí", "bonus tặng", "cashback", "hoàn tiền", "khuyến mãi",
        "game", "slots", "live dealer", "bingo", "keno", "video poker",
        "table games", "card games", "thể thao", "esports",
        "guaranteed", "guaranteed win", "sure", "chắc chắn thắng", "100%",
        "high payout", "tỷ lệ thắng cao", "luôn thắng",
        "777", "888", "888k", "66", "win", "vip", "pro", "elite",
        "daily bonus", "weekly bonus", "monthly bonus",
    ],
    financial: [
        "invest", "return", "guaranteed profit", "bitcoin", "cryptocurrency",
        "forex", "stock", "mutual fund", "lending", "loan approval",
        "credit boost", "quick cash", "fast loan", "instant withdrawal",
        "investment opportunity", "passive income", "automatic transfer",
        "guaranteed return", "risk-free", "high return", "100% profit",
    ],
    phishing: [
        "verify account", "confirm identity", "validate password", "reset password",
        "update payment method", "confirm login", "security check",
        "unusual activity detected", "click here to verify", "act now",
        "limited time", "click below", "urgent action required",
        "verify now", "xác nhận", "cập nhật", "kiểm tra", "bảo mật",
    ],
    ecommerce: [
        "checkout", "payment gateway", "buy now", "limited stock",
        "fast shipping", "free delivery", "discount code", "special offer",
        "sale price", "original price", "clearance", "final sale",
        "95% off", "99% discount", "flash sale", "today only",
    ],
    malware: [
        "download now", "install", "setup.exe", "run this file",
        "flash player update", "java update", "windows update",
        ".exe", ".scr", ".bat", ".com", "attachment",
    ],
};
const SUSPICIOUS_PATTERNS = [
    /base\s+href\s*=\s*["']http[^https]/i,
    /document\.location\s*=\s*["']/i,
    /window\.location\s*=\s*["']/i,
    /eval\s*\(/i,
    /script.*onload/i,
    /<iframe[^>]*src\s*=\s*["']http[^https]/i,
    /onclick\s*=\s*["'][^"']*location/i,
    /setTimeout\s*\(\s*function[^}]*location/i,
];
export async function analyzeHtmlContent(html: string): Promise<ContentAnalysisResult> {
    const fraudKeywords: ContentAnalysisResult["fraudKeywords"] = {
        gambling: [],
        financial: [],
        phishing: [],
        ecommerce: [],
        malware: [],
    };
    const suspiciousPatterns: string[] = [];
    const suspiciousLinks: string[] = [];
    const details: string[] = [];
    const textContent = extractTextContent(html);
    const metaTags = extractMetaTags(html);
    const externalLinks = extractLinks(html);
    const formAnalysis = analyzeFormsInHtml(html);
    for (const [fraudType, keywords] of Object.entries(FRAUD_KEYWORDS)) {
        const foundKeywords = keywords.filter((kw) => textContent.toLowerCase().includes(kw.toLowerCase()));
        if (foundKeywords.length > 0) {
            fraudKeywords[fraudType as keyof typeof fraudKeywords] = foundKeywords;
        }
    }
    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(html)) {
            suspiciousPatterns.push(`Found suspicious pattern: ${pattern.source}`);
            details.push("HTML contains potentially malicious JavaScript");
        }
    }
    const iframeCount = (html.match(/<iframe/gi) || []).length;
    if (iframeCount > 3) {
        suspiciousPatterns.push("Excessive number of iframes detected");
        details.push("Multiple iframes can hide malicious content");
    }
    for (const link of externalLinks) {
        if (isSuspiciousLink(link)) {
            suspiciousLinks.push(link);
        }
    }
    if (formAnalysis.hasPasswordField && formAnalysis.hasSubmit) {
        if (!textContent.toLowerCase().includes("login") &&
            !textContent.toLowerCase().includes("sign in")) {
            suspiciousPatterns.push("Password form detected but not clearly labeled");
            details.push("This pattern is common in phishing attacks");
        }
    }
    const hiddenFieldCount = (html.match(/type\s*=\s*["']hidden["']/gi) || []).length;
    if (hiddenFieldCount > 2) {
        suspiciousPatterns.push("Multiple hidden form fields detected");
        details.push("Hidden fields can be used to collect unauthorized data");
    }
    let htmlScore = 0;
    const totalFraudKeywords = Object.values(fraudKeywords).reduce((sum, arr) => sum + arr.length, 0);
    htmlScore += Math.min(15, totalFraudKeywords * 3);
    htmlScore += Math.min(10, suspiciousPatterns.length * 4);
    htmlScore += suspiciousLinks.length * 2;
    htmlScore += formAnalysis.hasPasswordField && !formAnalysis.isLoginPage ? 5 : 0;
    htmlScore += formAnalysis.totalForms > 2 ? 5 : 0;
    if (fraudKeywords.gambling.length > 0) {
        htmlScore += 8;
    }
    return {
        htmlScore: Math.min(30, htmlScore) as ContentAnalysisResult["htmlScore"],
        hasLoginForm: formAnalysis.hasLoginForm,
        hasPaymentForm: formAnalysis.hasPaymentForm,
        hasCreditCardField: formAnalysis.hasCreditCardField,
        hasPasswordField: formAnalysis.hasPasswordField,
        totalForms: formAnalysis.totalForms,
        fraudKeywords,
        suspiciousPatterns,
        textContent: textContent.substring(0, 500),
        metaTags,
        externalLinks,
        suspiciousLinks,
        details,
    };
}
function extractTextContent(html: string): string {
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    text = text.replace(/<[^>]+>/g, " ");
    text = text
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
    text = text.replace(/\s+/g, " ").trim();
    return text;
}
function extractMetaTags(html: string): Record<string, string> {
    const metaTags: Record<string, string> = {};
    const metaRegex = /<meta\s+(?:[^>]*?\s+)?name\s*=\s*["']([^"']+)["']\s+content\s*=\s*["']([^"']*)["']/gi;
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
        metaTags[match[1].toLowerCase()] = match[2];
    }
    return metaTags;
}
function extractLinks(html: string): string[] {
    const links: string[] = [];
    const linkRegex = /href\s*=\s*["']([^"']+)["']/gi;
    let match;
    const seenLinks = new Set<string>();
    while ((match = linkRegex.exec(html)) !== null) {
        const link = match[1];
        if (link.startsWith("http") && !seenLinks.has(link)) {
            links.push(link);
            seenLinks.add(link);
        }
    }
    return links.slice(0, 20);
}
function isSuspiciousLink(link: string): boolean {
    try {
        const url = new URL(link);
        const domain = url.hostname.toLowerCase();
        const impersonationPatterns = [
            /google/, /facebook/, /apple/, /microsoft/, /amazon/,
            /bank/, /paypal/, /stripe/, /crypto/,
        ];
        for (const pattern of impersonationPatterns) {
            if (pattern.test(domain)) {
                const legitimateDomains = [
                    "google.com", "facebook.com", "apple.com", "microsoft.com", "amazon.com",
                ];
                if (!legitimateDomains.some((d) => domain.endsWith(d))) {
                    return true;
                }
            }
        }
        return false;
    }
    catch {
        return false;
    }
}
function analyzeFormsInHtml(html: string): {
    totalForms: number;
    hasLoginForm: boolean;
    hasPaymentForm: boolean;
    hasCreditCardField: boolean;
    hasPasswordField: boolean;
    hasSubmit: boolean;
    isLoginPage: boolean;
} {
    const formCount = (html.match(/<form/gi) || []).length;
    const hasLoginForm = /<form[^>]*method\s*=\s*["']post["']/i.test(html) &&
        /name\s*=\s*["'](username|email|login)["']/i.test(html);
    const hasPaymentForm = /name\s*=\s*["'](card|payment|credit|billing)["']/i.test(html);
    const hasCreditCardField = /name\s*=\s*["'](cc|card-number|cardnumber)["']/i.test(html);
    const hasPasswordField = /type\s*=\s*["']password["']/i.test(html);
    const hasSubmit = /<(button|input)[^>]*type\s*=\s*["']submit["']/i.test(html);
    const isLoginPage = /login|sign\s*in|signin|sign-in/i.test(html);
    return {
        totalForms: formCount,
        hasLoginForm,
        hasPaymentForm,
        hasCreditCardField,
        hasPasswordField,
        hasSubmit,
        isLoginPage,
    };
}
