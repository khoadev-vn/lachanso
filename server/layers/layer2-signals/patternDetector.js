/**
 * Layer 2: Pattern Detector
 * Detects clickbait, Unicode homoglyphs, psychological manipulation patterns
 */

// Unicode homoglyph detection
const HOMOGLYPH_MAP = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x',
  'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ꜰ': 'f',
  'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ꜰ': 'f'
};

// Clickbait patterns
const CLICKBAIT_PATTERNS = [
  { pattern: /(?:bí mật|bất ngờ|sốc|cực shock|không thể tin được)\s*[:!-]/gi, severity: 'high' },
  { pattern: /(?:bạn sẽ|ai cũng|ai cũng phải|chắc chắn sẽ)\s*[:!]?\s*(?:bất ngờ|sốc|khóc|cười)/gi, severity: 'high' },
  { pattern: /(?:đọc xong|thấy xong|xem xong)\s*[:!]?\s*(?:sẽ|rồi)\s*(?:biết|hiểu|tin)/gi, severity: 'medium' },
  { pattern: /(?:chỉ còn|còn đúng|vừa phát hiện)\s*\d+\s*(?:giờ|phút|ngày)/gi, severity: 'medium' },
  { pattern: /(?:cảnh báo|cảnh giác|lưu ý)\s*[:!]\s*(?:rất|cực kỳ|đặc biệt)\s*(?:quan trọng|nguy hiểm)/gi, severity: 'medium' }
];

// Urgency/pressure patterns
const URGENCY_PATTERNS = [
  { pattern: /(?:ngay\s*lập\s*tức|tức\s*tắc|liên\s*tục|đăng\s*ngay|click\s*ngay)/gi, weight: 30 },
  { pattern: /(?:chỉ\s*còn|vừa\s*phát\s*hiện|sắp\s*đến|hết\s*hạn)/gi, weight: 20 },
  { pattern: /(?:nếu\s*không|sẽ\s*mất|bỏ\s*lỡ|không\s*còn|lần\s*cuối)/gi, weight: 25 },
  { pattern: /(?:tự\s*động|ngay\s*bây\s*giờ|trong\s*hôm\s*nay|trong\s*24\s*giờ)/gi, weight: 20 }
];

// Emotional manipulation patterns
const EMOTIONAL_PATTERNS = [
  { pattern: /(?:đe\s*dọa|khủng\s*hoảng|hoảng\s*loạn|tử\s*vong|chết|tai\s*nạn)/gi, weight: 25, type: 'fear' },
  { pattern: /(?:giàu\s*nhanh|kiếm\s*tiền|lợi\s*nhuận\s*cao|đầu\s*tư\s*sinh\s*lời|cam\s*kết)/gi, weight: 30, type: 'greed' },
  { pattern: /(?:tố\s*cáo|bó\s*pạt|nói\s*xấu|vu\s*khống|phỉ\s*báng)/gi, weight: 20, type: 'defamation' },
  { pattern: /(?:yêu\s*nước|bảo\s*vệ|quốc\s*gia|dân\s*tộc|tổ\s*quốc)/gi, weight: 10, type: 'patriotic' }
];

// Fake authority patterns
const AUTHORITY_IMPERSONATION = [
  { pattern: /(?:bộ\s*trưởng|thủ\s*tướng|chủ\s*tịch|tổng\s*thống|giám\s*đốc)\s*(?:bảo|nói|ra\s*lệnh|yêu\s*cầu)/gi, weight: 35 },
  { pattern: /(?:công\s*an|cảnh\s*sát|bộ\s*công\s*an|interpol)\s*(?:bắt|điều\s*tra|khởi\s*tố|cảnh\s*báo)/gi, weight: 30 },
  { pattern: /(?:ngân\s*hàng|nhà\s*nước|chính\s*phủ|thuế)\s*(?:yêu\s*cầu|xác\s*nhận|cảnh\s*báo)/gi, weight: 25 }
];

function detectHomoglyphs(text) {
  const detected = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (HOMOGLYPH_MAP[char]) {
      detected.push({
        position: i,
        original: char,
        replacement: HOMOGLYPH_MAP[char],
        context: text.substring(Math.max(0, i - 20), Math.min(text.length, i + 20))
      });
    }
  }
  return detected;
}

function detectClickbait(text) {
  const matches = [];
  for (const { pattern, severity } of CLICKBAIT_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        match: match[0],
        severity,
        position: match.index,
        context: text.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30)
      });
    }
  }
  return matches;
}

function detectUrgency(text) {
  let score = 0;
  const matches = [];
  for (const { pattern, weight } of URGENCY_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      score += weight;
      matches.push({ match: match[0], weight, position: match.index });
    }
  }
  return { score: Math.min(100, score), matches };
}

function detectEmotionalManipulation(text) {
  let score = 0;
  const matches = [];
  for (const { pattern, weight, type } of EMOTIONAL_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      score += weight;
      matches.push({ match: match[0], weight, type, position: match.index });
    }
  }
  return { score: Math.min(100, score), matches };
}

function detectAuthorityImpersonation(text) {
  let score = 0;
  const matches = [];
  for (const { pattern, weight } of AUTHORITY_IMPERSONATION) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      score += weight;
      matches.push({ match: match[0], weight, position: match.index });
    }
  }
  return { score: Math.min(100, score), matches };
}

function detectPatterns(text) {
  const startTime = Date.now();
  
  const homoglyphs = detectHomoglyphs(text);
  const clickbait = detectClickbait(text);
  const urgency = detectUrgency(text);
  const emotional = detectEmotionalManipulation(text);
  const authority = detectAuthorityImpersonation(text);
  
  const totalScore = Math.min(100, 
    (homoglyphs.length > 0 ? 30 : 0) +
    clickbait.reduce((sum, c) => sum + (c.severity === 'high' ? 25 : 15), 0) +
    urgency.score * 0.3 +
    emotional.score * 0.3 +
    authority.score * 0.4
  );
  
  return {
    homoglyphs,
    clickbait,
    urgency,
    emotional,
    authority,
    totalScore,
    hasManipulation: totalScore >= 40,
    executionTimeMs: Date.now() - startTime
  };
}

module.exports = { detectPatterns, detectHomoglyphs, detectClickbait, detectUrgency, detectEmotionalManipulation, detectAuthorityImpersonation };
