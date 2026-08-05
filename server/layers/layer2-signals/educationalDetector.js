/**
 * Layer 2: Educational Content Detector
 * Specialized detection for educational/tutorial/anti-fraud content
 */

// Educational content patterns (Vietnamese)
const EDUCATIONAL_PATTERNS = [
  // Guide/tutorial markers
  { pattern: /(?:hướng\s*dẫn|cách\s*(?:thực\s*hiện|làm|sử\s*dụng|tải|cài\s*đặt|thiết\s*lập))/gi, weight: 0.3 },
  { pattern: /(?:bài\s*hướng\s*dẫn|tutorial|hướng\s*dẫn\s*chi\s*tiết|step[\s-]*by[\s-]*step)/gi, weight: 0.25 },
  { pattern: /(?:cách\s*(?:nhận\s*biết|phát\s*hiện|tránh|phòng\s*tránh|đối\s*phó))/gi, weight: 0.35 },
  
  // Anti-fraud/anti-scam content
  { pattern: /(?:phòng\s*chống\s*lừa\s*đảo|cảnh\s*báo\s*lừa\s*đảo|nhận\s*biết\s*lừa\s*đảo)/gi, weight: 0.4 },
  { pattern: /(?:cách\s*(?:bảo\s*vệ|tự\s*bảo\s*vệ|giữ\s*an\s*toàn))/gi, weight: 0.25 },
  { pattern: /(?:mẹo|kinh\s*nghiệm|lưu\s*ý|thủ\s*thuật)\s*(?:khi|để|cho)/gi, weight: 0.2 },
  
  // Educational institutions
  { pattern: /(?:bộ\s*giáo\s*dục|bộ\s*GD&ĐT|sở\s*giáo\s*dục|trường\s*(?:đại\s*học|cao\s*đẳng|thpt|thcs))/gi, weight: 0.3 },
  { pattern: /(?:bài\s*kiểm\s*tra|bài\s*thi|kỳ\s*thi|đề\s*thi|lộ\s*trình)/gi, weight: 0.25 },
  
  // Disclaimer/educational markers
  { pattern: /(?:chỉ\s*mang\s*tính\s*chất|dành\s*cho\s*mục\s*đích|để\s*tham\s*khảo)/gi, weight: 0.3 },
  { pattern: /(?:lưu\s*ý|chú\s*ý|quan\s*trọng)\s*[:：]\s*(?:đây\s*là|nội\s*dung\s*này)/gi, weight: 0.2 },
  
  // Health/medical disclaimers
  { pattern: /(?:tham\s*khảo\s*bác\s*sĩ|tư\s*vấn\s*chuyên\s*môn|không\s*phải\s*lời\s*khuyên\s*y\s*khoa)/gi, weight: 0.3 },
  
  // Financial disclaimers
  { pattern: /(?:đầu\s*tư\s*có\s*rủi\s*ro|tham\s*khảo\s*chuyên\s*gia|không\s*phải\s*lời\s*khuyên\s*tài\s*chính)/gi, weight: 0.3 }
];

// Known educational domains
const EDUCATIONAL_DOMAINS = [
  'vietjack.com', 'hocmai.vn', 'moon.vn', 'khoahoc.vietjack.com',
  'topchuan.com', 'thptqg.vn', 'moet.gov.vn', 'vlsc.edu.vn',
  'khoigiang.day', 'violet.vn', 'loigiaihay.com', 'vndoc.com'
];

// Educational content types
const CONTENT_TYPES = {
  TUTORIAL: { label: 'Hướng dẫn', trustBonus: 15 },
  ANTI_FRAUD: { label: 'Phòng chống lừa đảo', trustBonus: 20 },
  ACADEMIC: { label: 'Học thuật', trustBonus: 10 },
  DISCLAIMER: { label: 'Cảnh báo/Lưu ý', trustBonus: 10 },
  NONE: { label: 'Không phải nội dung giáo dục', trustBonus: 0 }
};

function detectEducationalContent(text, urls = []) {
  const startTime = Date.now();
  
  const normalizedText = text.toLowerCase().normalize('NFC');
  let totalWeight = 0;
  const matchedPatterns = [];
  
  // Check patterns
  for (const { pattern, weight } of EDUCATIONAL_PATTERNS) {
    const matches = normalizedText.match(pattern);
    if (matches) {
      totalWeight += weight * matches.length;
      matchedPatterns.push({ pattern: pattern.source, matches: matches.slice(0, 3), weight });
    }
  }
  
  // Check educational domains in URLs
  let hasEducationalUrl = false;
  for (const url of urls) {
    if (EDUCATIONAL_DOMAINS.some(domain => url.includes(domain))) {
      hasEducationalUrl = true;
      totalWeight += 0.3;
      break;
    }
  }
  
  // Determine confidence and type
  const confidence = Math.min(1, totalWeight);
  let contentType = 'NONE';
  
  if (confidence >= 0.3) {
    if (matchedPatterns.some(p => p.pattern.includes('lừa\s*đảo|cảnh\s*báo'))) {
      contentType = 'ANTI_FRAUD';
    } else if (matchedPatterns.some(p => p.pattern.includes('hướng\s*dẫn|cách\s*thực\s*hiện'))) {
      contentType = 'TUTORIAL';
    } else if (matchedPatterns.some(p => p.pattern.includes('bộ\s*giáo|trường|thi'))) {
      contentType = 'ACADEMIC';
    } else {
      contentType = 'DISCLAIMER';
    }
  }
  
  const isEducational = confidence >= 0.25;
  
  return {
    isEducational,
    contentType,
    contentTypeLabel: CONTENT_TYPES[contentType].label,
    trustBonus: CONTENT_TYPES[contentType].trustBonus,
    confidence: Math.min(1, confidence),
    matchedPatterns: matchedPatterns.slice(0, 5),
    hasEducationalUrl,
    executionTimeMs: Date.now() - startTime
  };
}

module.exports = { detectEducationalContent, EDUCATIONAL_DOMAINS, CONTENT_TYPES };
