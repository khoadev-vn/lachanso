// ============ CLAIM EXTRACTION & STANCE DETECTION ============
// Extract verifiable claims from text and detect stance

// Vietnamese claim patterns
const CLAIM_PATTERNS = [
  // Fact claims
  /(?:cho rằng|nói rằng|khẳng định|tuyên bố|cho biết|theo|trích|đưa tin)\s+(.+)/i,
  /(?:đã|sẽ|đang|không)\s+(?:làm|thực hiện|đạt|được|thất bại|vượt)\s+(.+)/i,
  // Statistics
  /(\d+[\.,]?\d*)\s*(%|phần trăm|triệu|nghìn|tỷ|đô la|USD|VND)/i,
  // Dates
  /(?:ngày|tháng|năm)\s+\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4}/i,
  // Cause-effect
  /(?:gây ra|dẫn đến|kết quả|làm cho|vì|do)\s+(.+)/i,
  // Urgency
  /(?:cảnh báo|cấm|buộc|phải|tức thì|ngay lập tức|khẩn cấp)\s+(.+)/i,
  // Health claims
  /(?:chữa|điều trị|phòng chống|bệnh|thuốc|vắc xin)\s+(.+)/i,
  // Financial
  /(?:tăng|giảm|lỗ|lãi|giá|thị trường|cổ phiếu|tiền ảo|Bitcoin)\s+(.+)/i,
];

// Clickbait/sensational words
const SENSATIONAL_PATTERNS = [
  { pattern: /(?:shock|sốc|cực sốc|kinh hoàng|đau lòng|thảm)|惨/gi, weight: 3, type: 'sensational' },
  { pattern: /(?:bí mật|bí ẩn|không ai biết|chỉ 1%|ai cũng phải|ai cũng sẽ)/gi, weight: 3, type: 'clickbait' },
  { pattern: /(?:phát hiện|tiết lộ|lộ|bật mí|choáng|ngã ngửa)/gi, weight: 2, type: 'clickbait' },
  { pattern: /(?:cảnh báo|cảnh giác|đừng bỏ qua|tuyệt đối|bắt buộc)/gi, weight: 2, type: 'urgency' },
  { pattern: /(?:!|¡|！)/g, weight: 1, type: 'exclamation' },
  { pattern: /(?:bạn sẽ không tin|không thể tin được|đáng sợ|đáng lo ngại)/gi, weight: 3, type: 'clickbait' },
  { pattern: /(?:LỘ|LỘT|BÓC|CHỐT|HOT|XÔN XAO)/g, weight: 2, type: 'sensational_vn' },
];

// Unreliable source indicators
const UNRELIABLE_INDICATORS = [
  /(?:theo\.vn|tinmoi\.vn|kenh14\.vn|yan\.vn|bestie\.vn)/gi,
  /(?:facebook\.com|tiktok\.com|zalo\.me)/gi,
  /(?:thongtin24h|tinhot24h|baomoi24h|doisong24h|tinmoi24h)/gi,
];

function extractClaims(text) {
  if (!text || text.length < 10) return [];
  
  const claims = [];
  const sentences = text.split(/[.!?。！？\n]+/).filter(s => s.trim().length > 15);
  
  for (const sentence of sentences) {
    for (const { pattern, weight, type } of SENSATIONAL_PATTERNS) {
      const matches = sentence.match(pattern);
      if (matches) {
        claims.push({
          text: sentence.trim(),
          type,
          weight,
          matches: matches.slice(0, 3)
        });
      }
    }
    
    for (const pattern of CLAIM_PATTERNS) {
      const match = sentence.match(pattern);
      if (match) {
        claims.push({
          text: sentence.trim(),
          type: 'factual_claim',
          weight: 1,
          claimText: match[1]?.substring(0, 100)
        });
      }
    }
  }
  
  return claims;
}

function detectSensationalism(text) {
  if (!text) return { score: 0, patterns: [], level: 'low' };
  
  const found = [];
  let totalWeight = 0;
  
  for (const { pattern, weight, type } of SENSATIONAL_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      found.push({ type, matches: matches.slice(0, 3), weight });
      totalWeight += weight * matches.length;
    }
  }
  
  for (const pattern of UNRELIABLE_INDICATORS) {
    const matches = text.match(pattern);
    if (matches) {
      found.push({ type: 'unreliable_source', matches: matches.slice(0, 3), weight: 5 });
      totalWeight += 5 * matches.length;
    }
  }
  
  const exclamationRatio = (text.match(/[!！¡]/g) || []).length / Math.max(text.length, 1);
  const capsRatio = (text.match(/[A-Z]{3,}/g) || []).join('').length / Math.max(text.length, 1);
  
  totalWeight += exclamationRatio * 50;
  totalWeight += capsRatio * 20;
  
  let level = 'low';
  if (totalWeight >= 10) level = 'high';
  else if (totalWeight >= 5) level = 'medium';
  
  return {
    score: Math.min(totalWeight, 30),
    patterns: found,
    level,
    exclamationRatio,
    capsRatio
  };
}

function extractNumbers(text) {
  if (!text) return [];
  const numbers = [];
  const patterns = [
    /(\d+[\.,]\d+)\s*(%|phần trăm)/gi,
    /(\d+)\s*(triệu|nghìn|ngàn|tỷ)/gi,
    /(\d+[\.,]?\d*)\s*(USD|VND|đô la|đồng)/gi,
    /(?:ngày|tháng|năm)\s*(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      numbers.push({
        value: match[1],
        unit: match[2],
        context: text.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30)
      });
    }
  }
  return numbers;
}

function checkSourceReliability(text) {
  const indicators = [];
  let reliability = 100;
  
  for (const pattern of UNRELIABLE_INDICATORS) {
    if (pattern.test(text)) {
      indicators.push(pattern.source);
      reliability -= 20;
    }
  }
  
  const hasAuthor = /(?:tác giả|biên tập viên|phóng viên|PV\.|TBT\.|editor|author)/i.test(text);
  const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text);
  const hasSource = /(?:theo|theo nguồn|trích dẫn|nguồn tin|citing|according to)/i.test(text);
  
  if (!hasAuthor) reliability -= 5;
  if (!hasDate) reliability -= 5;
  if (!hasSource) reliability -= 10;
  
  return {
    reliability: Math.max(0, reliability),
    indicators,
    hasAuthor,
    hasDate,
    hasSource
  };
}

module.exports = {
  extractClaims,
  detectSensationalism,
  extractNumbers,
  checkSourceReliability,
  CLAIM_PATTERNS,
  SENSATIONAL_PATTERNS
};
