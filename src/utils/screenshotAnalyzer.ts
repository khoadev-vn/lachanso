/**
 * Screenshot Analyzer for Web Fraud Detection
 * Analyzes visual elements of websites
 * Note: In production, use Puppeteer for actual screenshots
 */

interface ScreenshotAnalysis {
  visualScore: 0-20;
  hasClonedUI: boolean;
  uiCloneDetails: string[];
  colorAnalysis: {
    primaryColor: string;
    isLegitimateColorScheme: boolean;
  };
  layoutAnalysis: {
    isSuspiciousLayout: boolean;
    issues: string[];
  };
  textAnalysis: {
    hasObscuredText: boolean;
    hasSmallText: boolean;
    issues: string[];
  };
  imageAnalysis: {
    hasLowQualityImages: boolean;
    hasClonedImages: boolean;
    issues: string[];
  };
  details: string[];
}

/**
 * Analyze screenshot for fraud indicators
 * This is a simplified version - in production use actual image analysis
 */
export async function analyzeScreenshot(htmlContent: string, url: string): Promise<ScreenshotAnalysis> {
  const uiCloneDetails: string[] = [];
  const layoutIssues: string[] = [];
  const textIssues: string[] = [];
  const imageIssues: string[] = [];
  const details: string[] = [];

  let visualScore = 0;

  // 1. Check for cloned banking UI patterns
  const bankingUIPatterns = [
    { name: "Chase Bank UI", keywords: ["chase", "balances", "transfer", "deposit"], pattern: /balance|transfer|account|routing/i },
    { name: "Wells Fargo UI", keywords: ["wells fargo", "account summary", "pay bills"], pattern: /wells|account\s+summary|pay\s+bills/i },
    { name: "Bank of America UI", keywords: ["bofa", "quick balance", "transfers"], pattern: /bofa|bank\s+of\s+america|quick\s+balance/i },
    { name: "PayPal UI", keywords: ["paypal", "send money", "request money"], pattern: /paypal|send\s+money|request\s+money/i },
    { name: "Stripe UI", keywords: ["stripe", "payment", "checkout"], pattern: /stripe|checkout|payment/i },
  ];

  for (const { name, pattern } of bankingUIPatterns) {
    if (pattern.test(htmlContent)) {
      // Check if it's actually the legitimate service
      const domain = extractDomain(url);
      const legitimateDomains = [
        "chase.com", "wellsfargo.com", "bankofamerica.com",
        "paypal.com", "stripe.com",
      ];

      const isLegitimate = legitimateDomains.some((d) => domain.includes(d));
      if (!isLegitimate) {
        uiCloneDetails.push(`${name} interface detected on non-official domain`);
        visualScore += 7;
      }
    }
  }

  // 2. Analyze color scheme
  const colorAnalysis = analyzeColorScheme(htmlContent);
  if (!colorAnalysis.isLegitimateColorScheme) {
    layoutIssues.push("Unusual color scheme for legitimate service");
    visualScore += 3;
  }

  // 3. Check for suspicious layout patterns
  const layoutAnalysis = analyzeLayout(htmlContent);
  if (layoutAnalysis.isSuspicious) {
    layoutIssues.push(...layoutAnalysis.issues);
    visualScore += layoutAnalysis.issues.length * 2;
  }

  // 4. Check for text obfuscation
  const textAnalysis = analyzeText(htmlContent);
  if (textAnalysis.hasObscuredText || textAnalysis.hasSmallText) {
    textIssues.push(...textAnalysis.issues);
    visualScore += textAnalysis.issues.length * 2;
  }

  // 5. Check for suspicious image patterns
  const imageAnalysis = analyzeImages(htmlContent);
  if (imageAnalysis.hasSuspiciousImages) {
    imageIssues.push(...imageAnalysis.issues);
    visualScore += imageAnalysis.issues.length * 2;
  }

  // 6. Check for modal/popup abuse patterns
  const hasExcessiveModals = (htmlContent.match(/<div[^>]*modal|<div[^>]*popup|<dialog/gi) || []).length > 3;
  if (hasExcessiveModals) {
    details.push("Excessive modal/popup usage (common in scams)");
    visualScore += 4;
  }

  // 7. Check for form obfuscation
  const formAnalysis = analyzeFormPresentation(htmlContent);
  if (formAnalysis.isSuspicious) {
    details.push(...formAnalysis.issues);
    visualScore += 3;
  }

  return {
    visualScore: Math.min(20, visualScore) as ScreenshotAnalysis["visualScore"],
    hasClonedUI: uiCloneDetails.length > 0,
    uiCloneDetails,
    colorAnalysis,
    layoutAnalysis: {
      isSuspiciousLayout: layoutAnalysis.isSuspicious,
      issues: layoutIssues,
    },
    textAnalysis: {
      hasObscuredText: textAnalysis.hasObscuredText,
      hasSmallText: textAnalysis.hasSmallText,
      issues: textIssues,
    },
    imageAnalysis: {
      hasLowQualityImages: imageAnalysis.hasLowQuality,
      hasClonedImages: imageAnalysis.hasClonedImages,
      issues: imageIssues,
    },
    details,
  };
}

/**
 * Analyze color scheme of the website
 */
function analyzeColorScheme(html: string): {
  primaryColor: string;
  isLegitimateColorScheme: boolean;
} {
  // Extract primary colors from CSS
  const colorMatches = html.match(/#[0-9A-Fa-f]{6}|rgb\([^)]+\)|hsl\([^)]+\)/gi) || [];
  const primaryColor = colorMatches.length > 0 ? colorMatches[0] : "#000000";

  // Check for legitimacy of color scheme
  const isLegitimate = colorMatches.length > 2 || isProfessionalColorScheme(colorMatches);

  return {
    primaryColor,
    isLegitimateColorScheme: isLegitimate,
  };
}

/**
 * Check if color scheme looks professional
 */
function isProfessionalColorScheme(colors: string[]): boolean {
  // Professional sites typically have 3-5 well-coordinated colors
  if (colors.length < 2) return false;

  // Very bright or neon colors are suspicious
  const isBright = colors.some((color) => {
    if (color.startsWith("#")) {
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      return r > 240 && g > 240 && b > 240;
    }
    return false;
  });

  return !isBright;
}

/**
 * Analyze website layout
 */
function analyzeLayout(html: string): { isSuspicious: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for extreme scrolling requirements
  const heightStyles = html.match(/height:\s*\d{4,}px/gi) || [];
  if (heightStyles.length > 5) {
    issues.push("Excessive vertical scrolling (long, suspicious layout)");
  }

  // Check for off-screen content
  const overflowHidden = (html.match(/overflow:\s*hidden/gi) || []).length;
  const overflowAuto = (html.match(/overflow:\s*auto|overflow-y/gi) || []).length;
  if (overflowHidden > overflowAuto) {
    issues.push("Content appears to be hidden from view");
  }

  // Check for unusual aspect ratios
  const aspectRatios = html.match(/aspect-ratio:\s*[\d.]+\s*\/\s*[\d.]+/gi) || [];
  const suspiciousRatios = aspectRatios.filter((r) => {
    const parts = r.match(/[\d.]+/g);
    if (parts && parts.length >= 2) {
      const ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
      return ratio > 5 || ratio < 0.2;
    }
    return false;
  });

  if (suspiciousRatios.length > 0) {
    issues.push("Unusual layout aspect ratios");
  }

  return {
    isSuspicious: issues.length > 0,
    issues,
  };
}

/**
 * Analyze text presentation
 */
function analyzeText(html: string): {
  hasObscuredText: boolean;
  hasSmallText: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for very small text (common for hiding disclaimers)
  const smallTextSize = html.match(/font-size:\s*(?:0\.\d+|[1-9])\s*(?:px|em|rem|pt)/gi) || [];
  const verySmallText = smallTextSize.filter((s) => {
    const num = parseFloat(s);
    return num < 10; // Less than 10px
  });

  if (verySmallText.length > 3) {
    issues.push("Multiple very small text elements (may hide important info)");
  }

  // Check for text visibility issues
  const whiteTextOnWhite = html.match(/color:\s*#fff|color:\s*white|color:\s*#f+0*/gi);
  const backgroundWhite = html.match(/background:\s*#fff|background:\s*white|background-color:\s*#fff/gi);

  if (whiteTextOnWhite && backgroundWhite && whiteTextOnWhite.length > 0 && backgroundWhite.length > 0) {
    issues.push("Text may be invisible or hard to read");
  }

  // Check for text obfuscation techniques
  const hasTextShadow = html.includes("text-shadow");
  const hasTransparency = html.match(/opacity:\s*0\.\d|opacity:\s*\d*0+/gi);

  if (hasTextShadow && hasTransparency) {
    issues.push("Text obfuscation techniques detected");
  }

  return {
    hasObscuredText: issues.length > 0 && issues.some((i) => i.includes("obfuscation")),
    hasSmallText: verySmallText.length > 0,
    issues,
  };
}

/**
 * Analyze images
 */
function analyzeImages(html: string): {
  hasSuspiciousImages: boolean;
  hasLowQuality: boolean;
  hasClonedImages: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for missing alt text (can hide suspicious images)
  const imgTags = html.match(/<img[^>]+>/gi) || [];
  const imgWithoutAlt = imgTags.filter((tag) => !tag.includes('alt=')).length;

  if (imgWithoutAlt > imgTags.length / 2) {
    issues.push("Many images lack alt text (suspicious)");
  }

  // Check for tiny/transparent images
  const tinyImages = html.match(/<img[^>]*(?:width|height):\s*[1-9]\s*px/gi) || [];
  if (tinyImages.length > 2) {
    issues.push("Multiple tiny/invisible images detected");
  }

  // Check for base64 encoded images (can hide malicious content)
  const base64Images = (html.match(/src=["']data:image\/[^"']+')/gi) || []).length;
  if (base64Images > 5) {
    issues.push("Multiple embedded base64 images (may hide content)");
  }

  // Check for broken/placeholder images
  const placeholderImages = (html.match(/placeholder\.|temp\.|image\.|default\.|test\./gi) || []).length;
  if (placeholderImages > 2) {
    issues.push("Placeholder/test images found");
  }

  return {
    hasSuspiciousImages: issues.length > 0,
    hasLowQuality: placeholderImages > 0,
    hasClonedImages: false,
    issues,
  };
}

/**
 * Analyze form presentation
 */
function analyzeFormPresentation(html: string): {
  isSuspicious: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check if forms are clearly visible
  const forms = (html.match(/<form/gi) || []).length;
  const hiddenForms = (html.match(/display:\s*none|visibility:\s*hidden|opacity:\s*0/gi) || []).length;

  if (forms > 0 && hiddenForms / forms > 0.5) {
    issues.push("Forms appear to be hidden");
  }

  // Check for autocomplete disabled (common in phishing)
  const autocompleteDisa = (html.match(/autocomplete\s*=\s*["']off["']/gi) || []).length;
  if (autocompleteDisa > 2) {
    issues.push("Multiple form fields disable autocomplete (suspicious pattern)");
  }

  // Check for forms with sensitive data fields not on HTTPS
  const hasPasswordForm = /type\s*=\s*["']password["']/i.test(html);
  const hasCardForm = /card|credit|cvv/i.test(html);

  if (hasPasswordForm && hasCardForm) {
    issues.push("Form requests both passwords and card details");
  }

  return {
    isSuspicious: issues.length > 0,
    issues,
  };
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.hostname;
  } catch {
    return url;
  }
}
