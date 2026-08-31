/**
 * Deep Web Analyzer - Phân tích chuyên sâu nội dung website
 * Phát hiện lừa đảo, cloaking, redirect ẩn, JavaScript độc hại
 */

const axios = require('axios');
const cheerio = require('cheerio');

// User agents for cloaking detection
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36';

// Paths to scan for hidden content
const SCAN_PATHS = [
  '/', '/index.html', '/index.php',
  '/payment', '/pay', '/claim', '/reward',
  '/zalo', '/zalopay', '/momo', '/momopay',
  '/gift', '/promotion', '/sale',
  '/api', '/api/j.php', '/pague/api/j.php',
  '/emit/404/p'
];

// Scam patterns in JavaScript
const JS_SCAM_PATTERNS = [
  // Cloaking patterns
  { pattern: /navigator\.platform.*(?:Win|Mac|X11)/i, name: 'platform_detection', risk: 30 },
  { pattern: /screen\.availWidth.*screen\.availHeight/i, name: 'screen_size_check', risk: 25 },
  { pattern: /top\.location\.href\s*=/i, name: 'top_redirect', risk: 35 },
  { pattern: /window\.location\.href\s*=/i, name: 'window_redirect', risk: 20 },
  { pattern: /document\.createElement\s*\(\s*['"]a['"]\s*\)/i, name: 'dynamic_link', risk: 25 },
  { pattern: /\.setAttribute\s*\(\s*['"]href['"]/i, name: 'set_href', risk: 15 },
  { pattern: /noreferrer|noopener/i, name: 'noreferrer_noopener', risk: 10 },
  
  // Redirect to suspicious domains
  { pattern: /https?:\/\/[a-z0-9-]+\.(top|xyz|club|buzz|link|click|fun|live)/i, name: 'suspicious_tld', risk: 40 },
  { pattern: /https?:\/\/[a-z0-9]{10,}\.(com|net|org)/i, name: 'long_subdomain', risk: 20 },
  
  // Scam content patterns
  { pattern: /(?:khuyến mãi|nhận ngay|trúng thưởng|voucher|giảm giá|free|claim|reward)/i, name: 'promotion_keywords', risk: 15 },
  { pattern: /(?:zalo\s*pay|momo|vnpay|airpay|zingpay)/i, name: 'payment_brand', risk: 25 },
  { pattern: /(?: independence day|quốc khánh|tết|noel|black friday)/i, name: 'event_keywords', risk: 10 },
  
  // Obfuscation patterns
  { pattern: /eval\s*\(/i, name: 'eval_usage', risk: 40 },
  { pattern: /atob\s*\(/i, name: 'atob_decode', risk: 30 },
  { pattern: /fromCharCode/i, name: 'fromCharCode', risk: 25 },
  { pattern: /\\x[0-9a-f]{2}/i, name: 'hex_encode', risk: 20 },
  { pattern: /\\u[0-9a-f]{4}/i, name: 'unicode_encode', risk: 20 },
];

// HTML/Content scam patterns
const CONTENT_SCAM_PATTERNS = [
  // Vietnamese scam patterns
  { pattern: /(?:nhận ngay|trúng thưởng|khuyến mãi|giảm giá|voucher|coupon)/i, name: 'vn_promotion', risk: 15 },
  { pattern: /(?:zalo\s*pay|momo|vnpay|airpay|zingpay|shopee\s*pay)/i, name: 'vn_payment_brand', risk: 25 },
  { pattern: /(?:quốc khánh|tết|noel|black friday|sinh nhật)/i, name: 'vn_event', risk: 10 },
  { pattern: /(?:farmácias|pague menos|drogasil|drogaraia)/i, name: 'br_pharmacy', risk: 30 },
  
  // English scam patterns
  { pattern: /(?:congratulations|you have won|claim now|act now)/i, name: 'en_prize', risk: 30 },
  { pattern: /(?:free gift|limited time|exclusive offer)/i, name: 'en_promotion', risk: 20 },
  { pattern: /(?:pharmacy|drugstore|medication)/i, name: 'en_pharmacy', risk: 25 },
  
  // Generic scam indicators
  { pattern: /(?:click here|claim reward|verify account)/i, name: 'generic_cta', risk: 20 },
  { pattern: /(?:urgent|act now|limited time|expires today)/i, name: 'urgency', risk: 25 },
];

class DeepWebAnalyzer {
  constructor() {
    this.results = {
      paths: [],
      jsAnalysis: {},
      contentAnalysis: {},
      cloakingDetected: false,
      redirectChains: [],
      scamIndicators: [],
      overallRisk: 0
    };
  }

  /**
   * Main analysis function
   */
  async analyze(url) {
    console.log(`[DeepAnalyzer] Starting deep analysis: ${url}`);
    
    try {
      // Step 1: Scan multiple paths
      await this.scanPaths(url);
      
      // Step 2: Analyze JavaScript content
      this.analyzeJavaScript();
      
      // Step 3: Analyze HTML content
      this.analyzeContent();
      
      // Step 4: Detect cloaking
      this.detectCloaking();
      
      // Step 5: Calculate overall risk
      this.calculateRisk();
      
      return this.results;
    } catch (error) {
      console.error('[DeepAnalyzer] Error:', error.message);
      return this.results;
    }
  }

  /**
   * Scan multiple paths on the website
   */
  async scanPaths(baseUrl) {
    const parsedUrl = new URL(baseUrl);
    const baseUrlStr = parsedUrl.origin;
    
    for (const path of SCAN_PATHS) {
      try {
        const fullUrl = `${baseUrlStr}${path}`;
        const response = await axios.get(fullUrl, {
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: () => true,
          headers: {
            'User-Agent': MOBILE_UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        
        const content = response.data || '';
        const finalUrl = response.request?.res?.responseUrl || fullUrl;
        
        this.results.paths.push({
          path,
          status: response.status,
          contentLength: content.length,
          content: content.substring(0, 5000), // Store first 5000 chars
          finalUrl,
          redirected: finalUrl !== fullUrl
        });
        
        console.log(`[DeepAnalyzer] ${path} → ${response.status} (${content.length} bytes)`);
      } catch (error) {
        this.results.paths.push({
          path,
          status: 0,
          error: error.message,
          contentLength: 0
        });
      }
    }
  }

  /**
   * Analyze JavaScript content for scam patterns
   */
  analyzeJavaScript() {
    const jsFindings = [];
    
    for (const pathResult of this.results.paths) {
      if (!pathResult.content) continue;
      
      // Extract JavaScript from content
      const jsMatches = pathResult.content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
      
      for (const jsMatch of jsMatches) {
        const jsCode = jsMatch.replace(/<\/?script[^>]*>/gi, '');
        
        for (const pattern of JS_SCAM_PATTERNS) {
          if (pattern.pattern.test(jsCode)) {
            jsFindings.push({
              path: pathResult.path,
              pattern: pattern.name,
              risk: pattern.risk,
              codeSnippet: jsCode.substring(0, 200)
            });
          }
        }
      }
      
      // Also check inline JavaScript in href attributes
      const hrefMatches = pathResult.content.match(/href\s*=\s*["']javascript:[^"']*["']/gi) || [];
      for (const hrefMatch of hrefMatches) {
        jsFindings.push({
          path: pathResult.path,
          pattern: 'javascript_href',
          risk: 35,
          codeSnippet: hrefMatch
        });
      }
    }
    
    this.results.jsAnalysis = {
      findings: jsFindings,
      totalRisk: jsFindings.reduce((sum, f) => sum + f.risk, 0),
      hasCloaking: jsFindings.some(f => ['platform_detection', 'screen_size_check', 'top_redirect'].includes(f.pattern)),
      hasObfuscation: jsFindings.some(f => ['eval_usage', 'atob_decode', 'fromCharCode'].includes(f.pattern)),
      hasRedirect: jsFindings.some(f => ['window_redirect', 'top_redirect', 'dynamic_link'].includes(f.pattern))
    };
  }

  /**
   * Analyze HTML content for scam patterns
   */
  analyzeContent() {
    const contentFindings = [];
    
    for (const pathResult of this.results.paths) {
      if (!pathResult.content) continue;
      
      const $ = cheerio.load(pathResult.content);
      
      // Check meta tags
      const ogTitle = $('meta[property="og:title"]').attr('content') || '';
      const ogDescription = $('meta[property="og:description"]').attr('content') || '';
      const title = $('title').text() || '';
      
      const metaContent = `${title} ${ogTitle} ${ogDescription}`;
      
      for (const pattern of CONTENT_SCAM_PATTERNS) {
        if (pattern.pattern.test(metaContent)) {
          contentFindings.push({
            path: pathResult.path,
            pattern: pattern.name,
            risk: pattern.risk,
            content: metaContent.substring(0, 200)
          });
        }
      }
      
      // Check for suspicious links
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href') || '';
        if (/https?:\/\/[a-z0-9-]+\.(top|xyz|club|buzz)/i.test(href)) {
          contentFindings.push({
            path: pathResult.path,
            pattern: 'suspicious_link',
            risk: 30,
            content: href
          });
        }
      });
      
      // Check for hidden elements
      $('[style*="display:none"], [style*="visibility:hidden"], [hidden]').each((i, elem) => {
        const text = $(elem).text() || '';
        if (text.length > 0) {
          contentFindings.push({
            path: pathResult.path,
            pattern: 'hidden_content',
            risk: 25,
            content: text.substring(0, 200)
          });
        }
      });
    }
    
    this.results.contentAnalysis = {
      findings: contentFindings,
      totalRisk: contentFindings.reduce((sum, f) => sum + f.risk, 0)
    };
  }

  /**
   * Detect cloaking (different content for desktop vs mobile)
   */
  async detectCloaking() {
    // Compare first path (usually root) with suspicious paths
    const rootContent = this.results.paths.find(p => p.path === '/')?.content || '';
    const paymentContent = this.results.paths.find(p => p.path === '/payment')?.content || '';
    const payContent = this.results.paths.find(p => p.path === '/pay')?.content || '';
    
    // Check if root is 404 but other paths have content
    const rootIs404 = rootContent.includes('404') || rootContent.includes('Not Found');
    const hasPaymentContent = paymentContent.length > 100 || payContent.length > 100;
    
    if (rootIs404 && hasPaymentContent) {
      this.results.cloakingDetected = true;
      this.results.scamIndicators.push({
        type: 'cloaking',
        detail: 'Root returns 404 but payment paths have content',
        risk: 50
      });
    }
    
    // Check for platform-based redirection
    const hasPlatformDetection = this.results.jsAnalysis.findings.some(
      f => ['platform_detection', 'screen_size_check'].includes(f.pattern)
    );
    
    if (hasPlatformDetection) {
      this.results.cloakingDetected = true;
      this.results.scamIndicators.push({
        type: 'platform_cloaking',
        detail: 'JavaScript detects platform/screen size for conditional rendering',
        risk: 45
      });
    }
  }

  /**
   * Calculate overall risk score
   */
  calculateRisk() {
    let totalRisk = 0;
    
    // JavaScript risk (40% weight)
    totalRisk += this.results.jsAnalysis.totalRisk * 0.4;
    
    // Content risk (30% weight)
    totalRisk += this.results.contentAnalysis.totalRisk * 0.3;
    
    // Cloaking risk (30% weight)
    if (this.results.cloakingDetected) {
      totalRisk += 40;
    }
    
    // Additional penalties
    if (this.results.jsAnalysis.hasObfuscation) totalRisk += 15;
    if (this.results.jsAnalysis.hasRedirect) totalRisk += 10;
    
    this.results.overallRisk = Math.min(100, Math.round(totalRisk));
    
    // Generate summary
    this.results.summary = this.generateSummary();
  }

  /**
   * Generate human-readable summary
   */
  generateSummary() {
    const findings = [];
    
    if (this.results.cloakingDetected) {
      findings.push('Phát hiện cloaking - nội dung khác nhau cho desktop/mobile');
    }
    
    if (this.results.jsAnalysis.hasObfuscation) {
      findings.push('Phát hiện JavaScript obfuscation (mã hóa)');
    }
    
    if (this.results.jsAnalysis.hasRedirect) {
      findings.push('Phát hiện redirect ẩn trong JavaScript');
    }
    
    if (this.results.contentAnalysis.totalRisk > 30) {
      findings.push('Nội dung có nhiều dấu hiệu lừa đảo');
    }
    
    if (this.results.scamIndicators.length > 0) {
      findings.push(`Phát hiện ${this.results.scamIndicators.length} chỉ báo lừa đảo`);
    }
    
    return findings.length > 0 ? findings.join('. ') : 'Không phát hiện dấu hiệu lừa đảo rõ ràng';
  }
}

module.exports = DeepWebAnalyzer;
