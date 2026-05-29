/**
 * HTML Content Analyzer for Web Fraud Detection
 * Extracts text, forms, keywords, and suspicious patterns from HTML
 */

interface ContentAnalysisResult {
  htmlScore: 0-30;
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

// Fraud-specific keyword patterns - MASSIVELY EXPANDED for Vietnamese gambling
const FRAUD_KEYWORDS = {
  gambling: [
    // Common gambling terms
    "deposit", "withdraw", "bonus", "jackpot", "casino", "poker", "betting",
    "odds", "baccarat", "slots", "roulette", "sports betting", "live betting",
    // Major gambling brands
    "sunwin", "vin777", "iwin", "f8bet", "fun88", "188bet", "12play", "w88", "ae888",
    "sands", "kingbet", "bet88", "online-casino",
    // Vietnamese gambling terms
    "cờ bạc", "tài xỉu", "đánh bạc", "sòng bạc", "cá cược", "chơi bài",
    "chơi game", "nạp tiền", "rút tiền", "thưởng", "người chơi",
    // Action terms
    "play now", "chơi ngay", "đăng ký", "tham gia", "tái nạp",
    // Payment/Reward terms
    "thưởng miễn phí", "bonus tặng", "cashback", "hoàn tiền", "khuyến mãi",
    // Gambling game types
    "game", "slots", "live dealer", "bingo", "keno", "video poker",
    "table games", "card games", "thể thao", "esports",
    // Deceptive guarantee terms
    "guaranteed", "guaranteed win", "sure", "chắc chắn thắng", "100%",
    "high payout", "tỷ lệ thắng cao", "luôn thắng",
    // More specific variants
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

// Suspicious HTML patterns
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

/**
 * Analyze HTML content for fraud indicators
 */
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

  // Extract text content (simulate - in real impl would use DOMParser/cheerio)
  const textContent = extractTextContent(html);
  const metaTags = extractMetaTags(html);
  const externalLinks = extractLinks(html);

  // 1. Analyze forms
  const formAnalysis = analyzeFormsInHtml(html);

  // 2. Detect fraud keywords
  for (const [fraudType, keywords] of Object.entries(FRAUD_KEYWORDS)) {
    const foundKeywords = keywords.filter((kw) =>
      textContent.toLowerCase().includes(kw.toLowerCase())
    );
    if (foundKeywords.length > 0) {
      fraudKeywords[fraudType as keyof typeof fraudKeywords] = foundKeywords;
    }
  }

  // 3. Check for suspicious HTML patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(html)) {
      suspiciousPatterns.push(`Found suspicious pattern: ${pattern.source}`);
      details.push("HTML contains potentially malicious JavaScript");
    }
  }

  // 4. Check for iframe injections
  const iframeCount = (html.match(/<iframe/gi) || []).length;
  if (iframeCount > 3) {
    suspiciousPatterns.push("Excessive number of iframes detected");
    details.push("Multiple iframes can hide malicious content");
  }

  // 5. Check for suspicious external links
  for (const link of externalLinks) {
    if (isSuspiciousLink(link)) {
      suspiciousLinks.push(link);
    }
  }

  // 6. Check for credential harvesting forms
  if (formAnalysis.hasPasswordField && formAnalysis.hasSubmit) {
    if (!textContent.toLowerCase().includes("login") && 
        !textContent.toLowerCase().includes("sign in")) {
      suspiciousPatterns.push("Password form detected but not clearly labeled");
      details.push("This pattern is common in phishing attacks");
    }
  }

  // 7. Check for hidden form fields
  const hiddenFieldCount = (html.match(/type\s*=\s*["']hidden["']/gi) || []).length;
  if (hiddenFieldCount > 2) {
    suspiciousPatterns.push("Multiple hidden form fields detected");
    details.push("Hidden fields can be used to collect unauthorized data");
  }

  // Calculate HTML score (0-30) - STRICT SCORING
  let htmlScore = 0;
  
  // Each fraud keyword found = 3 points (very aggressive)
  const totalFraudKeywords = Object.values(fraudKeywords).reduce((sum, arr) => sum + arr.length, 0);
  htmlScore += Math.min(15, totalFraudKeywords * 3); // Cap at 15 for keywords
  
  // Suspicious patterns = 4 points each
  htmlScore += Math.min(10, suspiciousPatterns.length * 4);
  
  // Suspicious links = 2 points each
  htmlScore += suspiciousLinks.length * 2;
  
  // Password field without login context = high risk
  htmlScore += formAnalysis.hasPasswordField && !formAnalysis.isLoginPage ? 5 : 0;
  
  // Multiple forms = indicator of data harvesting
  htmlScore += formAnalysis.totalForms > 2 ? 5 : 0;
  
  // If gambling keywords detected, boost score significantly
  if (fraudKeywords.gambling.length > 0) {
    htmlScore += 8; // Extra 8 points for gambling keywords
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
    textContent: textContent.substring(0, 500), // Limit text content
    metaTags,
    externalLinks,
    suspiciousLinks,
    details,
  };
}

/**
 * Extract visible text content from HTML
 */
function extractTextContent(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  return text;
}

/**
 * Extract meta tags from HTML
 */
function extractMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {};
  const metaRegex = /<meta\s+(?:[^>]*?\s+)?name\s*=\s*["']([^"']+)["']\s+content\s*=\s*["']([^"']*)["']/gi;
  
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    metaTags[match[1].toLowerCase()] = match[2];
  }
  
  return metaTags;
}

/**
 * Extract external links from HTML
 */
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
  
  return links.slice(0, 20); // Limit to first 20 links
}

/**
 * Check if a link looks suspicious
 */
function isSuspiciousLink(link: string): boolean {
  try {
    const url = new URL(link);
    const domain = url.hostname.toLowerCase();
    
    // Check if external link looks like it's impersonating legitimate services
    const impersonationPatterns = [
      /google/, /facebook/, /apple/, /microsoft/, /amazon/,
      /bank/, /paypal/, /stripe/, /crypto/,
    ];
    
    for (const pattern of impersonationPatterns) {
      if (pattern.test(domain)) {
        // Check if it's actually the real domain
        const legitimateDomains = [
          "google.com", "facebook.com", "apple.com", "microsoft.com", "amazon.com",
        ];
        if (!legitimateDomains.some((d) => domain.endsWith(d))) {
          return true;
        }
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Analyze forms in HTML
 */
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
