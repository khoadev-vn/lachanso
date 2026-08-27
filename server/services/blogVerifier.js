const axios = require('axios');
const cheerio = require('cheerio');
const ssrfGuard = require('./ssrfGuard');

// ============ NUANCED BLOG & INDEPENDENT CONTENT VERIFICATION ============

// ============ CONTENT TYPE CLASSIFICATION ============
const CONTENT_TYPES = {
  PERSONAL_EXPERIENCE: {
    id: 'personal_experience',
    label: 'Kinh nghiệm cá nhân',
    description: 'Blog chia sẻ kinh nghiệm, mẹo vặt cá nhân',
    trustWeight: 0.7, // Giảm trọng số tin cậy vì là chủ quan
    factCheckRequired: false, // Không cần fact-check vì là kinh nghiệm
    typicalPatterns: [
      /(?:kinh nghiệm|chia sẻ|của tôi|tôi đã|bản thân|cá nhân)/gi,
      /(?:mẹo|tip|thủ thuật|cách|phương pháp)/gi,
      /(?:review|đánh giá|trải nghiệm|sử dụng)/gi,
    ],
    redFlags: [
      { pattern: /(?:cam kết|guarantee|100%|tuyệt đối)\s+(?:thành công|hiệu quả)/gi, weight: 25, type: 'overclaim' },
      { pattern: /(?:bán|buy|order|mua|đặt hàng)\s+(?:link|liên kết)/gi, weight: 20, type: 'selling' },
    ],
    greenFlags: [
      { pattern: /(?:lưu ý|tùy người|có thể|không phải ai cũng)/gi, weight: 10, type: 'honest_disclaimer' },
      { pattern: /(?:thất bại|không hiệu quả|không phù hợp)/gi, weight: 15, type: 'honest_failure' },
    ]
  },

  PRODUCT_REVIEW: {
    id: 'product_review',
    label: 'Đánh giá sản phẩm',
    description: 'Blog review, so sánh sản phẩm',
    trustWeight: 0.8,
    factCheckRequired: false,
    typicalPatterns: [
      /(?:review|đánh giá|so sánh|compare|versus|vs)/gi,
      /(?:sản phẩm|product|thiết bị|device|tool)/gi,
      /(?:điểm|score|rating|sao|star)/gi,
    ],
    redFlags: [
      { pattern: /(?:tốt nhất|best|tốt nhất thị trường|#1)/gi, weight: 15, type: 'superlative' },
      { pattern: /(?:affiliate|referral|commission|hoa hồng)/gi, weight: 10, type: 'affiliate' },
      { pattern: /(?:chỉ có|exclusive|độc quyền)\s+(?:tại|only)/gi, weight: 15, type: 'exclusive_deal' },
    ],
    greenFlags: [
      { pattern: /(?:nhược điểm|điểm yếu|drawback|cons|không tốt)/gi, weight: 15, type: 'balanced_review' },
      { pattern: /(?:giá|price|cost|chi phí)\s+(?:cao|đắt|reasonable)/gi, weight: 10, type: 'price_awareness' },
      { pattern: /(?:alternative|thay thế|phương án khác)/gi, weight: 10, type: 'offers_alternatives' },
    ]
  },

  HEALTH_MEDICAL: {
    id: 'health_medical',
    label: 'Y tế / Sức khỏe',
    description: 'Blog về sức khỏe, y tế, thuốc',
    trustWeight: 1.3, // Tăng trọng số vì ảnh hưởng đến sức khỏe
    factCheckRequired: true,
    typicalPatterns: [
      /(?:sức khỏe|health|bệnh|disease|thuốc|medicine)/gi,
      /(?:điều trị|treatment|chữa|cure|khỏi)/gi,
      /(?:bác sĩ|doctor|y sĩ|physician)/gi,
    ],
    redFlags: [
      { pattern: /(?:bài thuốc|công thức|thảo dược|herbal)\s+(?:gia truyền|cổ truyền)/gi, weight: 30, type: 'folk_medicine' },
      { pattern: /(?:chữa khỏi|khỏi hoàn toàn|100% hiệu quả)/gi, weight: 35, type: 'miracle_cure' },
      { pattern: /(?:bác sĩ không nói|thuốc giấu|bí mật y tế)/gi, weight: 40, type: 'conspiracy' },
      { pattern: /(?:không cần|bỏ thuốc|từ bỏ)\s+(?:điều trị|thuốc)/gi, weight: 45, type: 'anti_medical' },
      { pattern: /(?:vắc-xin|vaccine|tiêm)\s+(?:gây|có hại|độc)/gi, weight: 40, type: 'anti_vax' },
    ],
    greenFlags: [
      { pattern: /(?:tham khảo|consult|consulting)\s+(?:bác sĩ|chuyên gia)/gi, weight: 15, type: 'recommends_professional' },
      { pattern: /(?:nghiên cứu|study|research)\s+(?:khoa học|scientific)/gi, weight: 10, type: 'references_research' },
      { pattern: /(?:phụ thuộc|tùy|cơ địa|tùy người)/gi, weight: 10, type: 'acknowledges_variation' },
    ]
  },

  FINANCIAL_INVESTMENT: {
    id: 'financial_investment',
    label: 'Tài chính / Đầu tư',
    description: 'Blog về đầu tư, tài chính, tiền ảo',
    trustWeight: 1.2,
    factCheckRequired: true,
    typicalPatterns: [
      /(?:đầu tư|invest|investment|tài chính|finance)/gi,
      /(?:tiền ảo|crypto|bitcoin|token|coin)/gi,
      /(?:lợi nhuận|return|profit|ROI|lãi)/gi,
    ],
    redFlags: [
      { pattern: /(?:lợi nhuận|return)\s+(?:cao|lớn|siêu)\s+\d+%/gi, weight: 40, type: 'guaranteed_return' },
      { pattern: /(?:cam kết|guarantee|bảo đảm)\s+(?:lợi nhuận|không lỗ)/gi, weight: 45, type: 'guarantee' },
      { pattern: /(?:risk-free|không rủi ro|an toàn 100%)/gi, weight: 40, type: 'no_risk' },
      { pattern: /(?:trước khi|before|limited time|hết hạn)/gi, weight: 30, type: 'urgency' },
      { pattern: /(?:tuyển đại lý|nhà phân phối|MLM|network marketing)/gi, weight: 35, type: 'mlm' },
    ],
    greenFlags: [
      { pattern: /(?:rủi ro|risk|có thể mất|potential loss)/gi, weight: 15, type: 'acknowledges_risk' },
      { pattern: /(?:nghiên cứu|research|phân tích|analysis)\s+(?:thị trường|market)/gi, weight: 10, type: 'due_diligence' },
      { pattern: /(?:đa dạng|hedge|phòng ngừa)\s+(?:đầu tư|rủi ro)/gi, weight: 10, type: 'diversification' },
    ]
  },

  TECHNICAL_TUTORIAL: {
    id: 'technical_tutorial',
    label: 'Kỹ thuật / Hướng dẫn',
    description: 'Blog hướng dẫn kỹ thuật, lập trình, IT',
    trustWeight: 0.9,
    factCheckRequired: false,
    typicalPatterns: [
      /(?:hướng dẫn|tutorial|guide|how to|cách)/gi,
      /(?:lập trình|programming|coding|develop)/gi,
      /(?:cài đặt|install|setup|config|cấu hình)/gi,
    ],
    redFlags: [
      { pattern: /(?:tải|download|crack|keygen|patch)\s+(?:miễn phí|free)/gi, weight: 30, type: 'piracy' },
      { pattern: /(?:bypass|hack|exploit|attack)/gi, weight: 20, type: 'security_risk' },
    ],
    greenFlags: [
      { pattern: /(?:source code|github|gitlab|repository)/gi, weight: 15, type: 'open_source' },
      { pattern: /(?:cập nhật|update|version|mới nhất)/gi, weight: 10, type: 'up_to_date' },
      { pattern: /(?:test|thử|demo|example)/gi, weight: 10, type: 'provides_examples' },
    ]
  },

  OPINION_EDITORIAL: {
    id: 'opinion_editorial',
    label: 'Ý kiến / Bình luận',
    description: 'Blog ý kiến, editorial, commentary',
    trustWeight: 0.6, // Ý kiến cá nhân không cần fact-check
    factCheckRequired: false,
    typicalPatterns: [
      /(?:ý kiến|opinion|quan điểm|viewpoint|góc nhìn)/gi,
      /(?:bình luận|commentary|phân tích|analysis)/gi,
      /(?:nên|should|cần|need|phải|must)/gi,
    ],
    redFlags: [
      { pattern: /(?:sự thật|truth|fact|chính xác)\s+(?:là|is)/gi, weight: 15, type: 'presents_opinion_as_fact' },
    ],
    greenFlags: [
      { pattern: /(?:theo tôi|cá nhân|personal|my opinion)/gi, weight: 10, type: 'clearly_opinion' },
      { pattern: /(?:có thể sai|quan điểm khác|disagree)/gi, weight: 10, type: 'acknowledges_other_views' },
    ]
  },

  NEWS_ANALYSIS: {
    id: 'news_analysis',
    label: 'Phân tích tin tức',
    description: 'Blog phân tích, bình luận tin tức',
    trustWeight: 0.85,
    factCheckRequired: true,
    typicalPatterns: [
      /(?:phân tích|analysis|bình luận|commentary)/gi,
      /(?:tin tức|news|sự kiện|event|happening)/gi,
      /(?:nguồn tin|source|theo|citing)/gi,
    ],
    redFlags: [
      { pattern: /(?:fake|giả|đạo nhái|fabricated)/gi, weight: 25, type: 'fake_news' },
    ],
    greenFlags: [
      { pattern: /(?:nguồn|source|trích dẫn|citation)/gi, weight: 10, type: 'cites_sources' },
      { pattern: /(?:đối chiếu|cross-reference|verify)/gi, weight: 10, type: 'verification' },
    ]
  }
};

// ============ CONTENT TYPE CLASSIFICATION ============
function classifyContentType(text) {
  const scores = {};
  
  for (const [key, contentType] of Object.entries(CONTENT_TYPES)) {
    let score = 0;
    for (const pattern of contentType.typicalPatterns) {
      const matches = text.match(pattern);
      if (matches) score += matches.length;
    }
    scores[key] = score;
  }
  
  // Find the highest scoring content type
  let maxScore = 0;
  let classifiedType = 'PERSONAL_EXPERIENCE'; // Default
  
  for (const [key, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      classifiedType = key;
    }
  }
  
  return {
    type: CONTENT_TYPES[classifiedType],
    scores,
    confidence: maxScore > 3 ? 'high' : maxScore > 1 ? 'medium' : 'low'
  };
}

// ============ NUANCED SCORING ============
function calculateBlogScore(text, contentType, url = null) {
  const result = {
    baseScore: 50,
    adjustments: [],
    finalScore: 50,
    category: contentType.type.id,
    categoryLabel: contentType.type.label,
    trustWeight: contentType.type.trustWeight,
    factCheckRequired: contentType.type.factCheckRequired
  };
  
  // Apply red flags (with category-specific weights)
  if (contentType.type.redFlags) {
    for (const flag of contentType.type.redFlags) {
      const matches = text.match(flag.pattern);
      if (matches) {
        const adjustedWeight = Math.round(flag.weight * contentType.type.trustWeight);
        result.adjustments.push({
          type: 'red_flag',
          pattern: flag.type,
          impact: -adjustedWeight,
          matches: matches.slice(0, 2)
        });
        result.baseScore -= adjustedWeight;
      }
    }
  }
  
  // Apply green flags (with category-specific weights)
  if (contentType.type.greenFlags) {
    for (const flag of contentType.type.greenFlags) {
      const matches = text.match(flag.pattern);
      if (matches) {
        const adjustedWeight = Math.round(flag.weight * contentType.type.trustWeight);
        result.adjustments.push({
          type: 'green_flag',
          pattern: flag.type,
          impact: adjustedWeight,
          matches: matches.slice(0, 2)
        });
        result.baseScore += adjustedWeight;
      }
    }
  }
  
  // Platform-specific adjustments
  if (url) {
    const platformAdjustment = getPlatformAdjustment(url);
    if (platformAdjustment) {
      result.adjustments.push(platformAdjustment);
      result.baseScore += platformAdjustment.impact;
    }
  }
  
  // Content length adjustment
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 50) {
    result.adjustments.push({ type: 'length', impact: -10, detail: 'Nội dung quá ngắn' });
    result.baseScore -= 10;
  } else if (wordCount > 500) {
    result.adjustments.push({ type: 'length', impact: 5, detail: 'Nội dung chi tiết' });
    result.baseScore += 5;
  } else if (wordCount > 1000) {
    result.adjustments.push({ type: 'length', impact: 10, detail: 'Nội dung rất chi tiết' });
    result.baseScore += 10;
  }
  
  // Language quality
  const languageQuality = analyzeLanguageQuality(text);
  result.adjustments.push(...languageQuality.adjustments);
  result.baseScore += languageQuality.score;
  
  // Clamp score
  result.finalScore = Math.max(0, Math.min(100, result.baseScore));
  
  return result;
}

// ============ PLATFORM ADJUSTMENTS ============
function getPlatformAdjustment(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Premium platforms (higher trust)
    if (hostname.includes('medium.com')) {
      return { type: 'platform', impact: 10, detail: 'Medium (nền tảng uy tín)' };
    }
    if (hostname.includes('substack.com')) {
      return { type: 'platform', impact: 8, detail: 'Substack (newsletter chuyên nghiệp)' };
    }
    if (hostname.includes('dev.to') || hostname.includes('hashnode.dev')) {
      return { type: 'platform', impact: 10, detail: 'Nền tảng dev uy tín' };
    }
    
    // Free hosted (lower trust)
    if (hostname.includes('blogspot.com') || hostname.includes('blogger.com')) {
      return { type: 'platform', impact: -8, detail: 'Blogspot (nền tảng miễn phí)' };
    }
    if (hostname.includes('wixsite.com') || hostname.includes('webs.com')) {
      return { type: 'platform', impact: -12, detail: 'Website builder miễn phí' };
    }
    
    // Social media (lower trust for facts)
    if (hostname.includes('facebook.com')) {
      return { type: 'platform', impact: -15, detail: 'Facebook (mạng xã hội)' };
    }
    if (hostname.includes('tiktok.com')) {
      return { type: 'platform', impact: -20, detail: 'TikTok (nền tảng ngắn)' };
    }
    
    // Custom domain (neutral to positive)
    return null;
  } catch {
    return null;
  }
}

// ============ LANGUAGE QUALITY ANALYSIS ============
function analyzeLanguageQuality(text) {
  const result = { score: 0, adjustments: [] };
  
  // Check for excessive capitalization
  const capsWords = (text.match(/[A-Z]{3,}/g) || []).length;
  const totalWords = text.split(/\s+/).length;
  if (capsWords / totalWords > 0.1) {
    result.score -= 10;
    result.adjustments.push({ type: 'language', impact: -10, detail: 'Quá nhiều chữ in hoa' });
  }
  
  // Check for excessive punctuation
  const exclamationMarks = (text.match(/[!！]{2,}/g) || []).length;
  if (exclamationMarks > 2) {
    result.score -= 5;
    result.adjustments.push({ type: 'language', impact: -5, detail: 'Quá nhiều dấu !' });
  }
  
  // Check for spammy words
  const spammyWords = (text.match(/(?:free|miễn phí|click|ngay|now|urgent|hot|new|free)/gi) || []).length;
  if (spammyWords > 3) {
    result.score -= 8;
    result.adjustments.push({ type: 'language', impact: -8, detail: 'Từ ngữ spam' });
  }
  
  // Check for proper paragraphs
  const paragraphs = text.split(/\n\s*\n/).length;
  if (paragraphs < 2 && totalWords > 100) {
    result.score -= 5;
    result.adjustments.push({ type: 'language', impact: -5, detail: 'Thiếu đoạn văn' });
  }
  
  return result;
}

// ============ BLOG METADATA EXTRACTION ============
function extractBlogMetadata(html) {
  try {
    const $ = cheerio.load(html);
    return {
      title: $('title').text().trim() || $('h1').first().text().trim(),
      author: $('meta[name="author"]').attr('content') || 
              $('[rel="author"]').text().trim() ||
              $('.author').first().text().trim(),
      publishDate: $('meta[property="article:published_time"]').attr('content') ||
                   $('time[datetime]').first().attr('datetime'),
      wordCount: $('article, .post-content, .entry-content').text().split(/\s+/).length,
      hasComments: $('.comments, #comments').length > 0,
      images: $('article img, .post-content img').length,
      links: $('article a, .post-content a').length,
    };
  } catch {
    return null;
  }
}

// ============ MAIN BLOG VERIFICATION ============
async function verifyBlogContent(text, url = null) {
  const startTime = Date.now();
  
  // 1. Classify content type
  const contentType = classifyContentType(text);
  
  // 2. Calculate nuanced score
  const blogScore = calculateBlogScore(text, contentType, url);
  
  // 3. Extract metadata if URL provided
  let metadata = null;
  if (url) {
    try {
      const safe = await ssrfGuard.assertSafeUrl(url);
      if (safe.ok) {
        const { data } = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 8000
        });
        metadata = extractBlogMetadata(data);
      }
    } catch {}
  }
  
  // 4. Generate verdict based on category
  let verdict = '';
  const score = blogScore.finalScore;
  
  if (contentType.type.factCheckRequired) {
    // For health/finance, be stricter
    if (score >= 70) verdict = 'Nội dung có cơ sở,但仍 cần verify thêm';
    else if (score >= 45) verdict = 'Cần kiểm chứng kỹ trước khi tin';
    else verdict = 'Có dấu hiệu nguy hiểm, không nên tin';
  } else {
    // For personal/opinion, be more lenient
    if (score >= 75) verdict = 'Blog có chất lượng tốt';
    else if (score >= 55) verdict = 'Blog ở mức trung bình, nên đọc có chọn lọc';
    else verdict = 'Blog có nhiều vấn đề, nên cẩn trọng';
  }
  
  return {
    text: text.substring(0, 200),
    url,
    timestamp: new Date().toISOString(),
    content_type: contentType.type.label,
    content_type_id: contentType.type.id,
    content_type_confidence: contentType.confidence,
    trust_weight: contentType.type.trustWeight,
    fact_check_required: contentType.type.factCheckRequired,
    score: score,
    verdict: verdict,
    adjustments: blogScore.adjustments,
    metadata: metadata,
    tools_used: ['classifyContentType', 'calculateBlogScore', 'analyzeLanguageQuality'],
    execution_time_ms: Date.now() - startTime
  };
}

module.exports = {
  classifyContentType,
  calculateBlogScore,
  verifyBlogContent,
  analyzeLanguageQuality,
  CONTENT_TYPES
};
