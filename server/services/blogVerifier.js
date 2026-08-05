const axios = require('axios');
const cheerio = require('cheerio');

// ============ BLOG & INDEPENDENT CONTENT VERIFICATION ============

// Known blog platforms with varying credibility
const BLOG_PLATFORMS = {
  'wordpress.com': { type: 'hosted', baseCredibility: 40, note: 'Blog WordPress.com miễn phí' },
  'wordpress.org': { type: 'self-hosted', baseCredibility: 50, note: 'Blog WordPress tự host' },
  'blogspot.com': { type: 'hosted', baseCredibility: 35, note: 'Blogspot/Blogger' },
  'blogger.com': { type: 'hosted', baseCredibility: 35, note: 'Google Blogger' },
  'medium.com': { type: 'platform', baseCredibility: 55, note: 'Medium' },
  'substack.com': { type: 'platform', baseCredibility: 50, note: 'Substack newsletter' },
  'ghost.io': { type: 'platform', baseCredibility: 50, note: 'Ghost blog' },
  'wixsite.com': { type: 'hosted', baseCredibility: 30, note: 'Wix website' },
  'webs.com': { type: 'hosted', baseCredibility: 25, note: 'Webs.com' },
  'tumblr.com': { type: 'hosted', baseCredibility: 30, note: 'Tumblr' },
  'facebook.com': { type: 'social', baseCredibility: 25, note: 'Facebook' },
  'youtube.com': { type: 'video', baseCredibility: 40, note: 'YouTube' },
  'tiktok.com': { type: 'video', baseCredibility: 20, note: 'TikTok' },
};

// High-risk blog indicators
const HIGH_RISK_BLOG_PATTERNS = [
  { pattern: /(?:affiliate|referral|commission|kiếm tiền|thu nhập|passive income)/gi, weight: 15, type: 'affiliate' },
  { pattern: /(?:sponsored|được tài trợ|hợp tác|quảng cáo)/gi, weight: 10, type: 'sponsored' },
  { pattern: /(?:click here|click ngay|mua ngay|đăng ký ngay|nhanh tay)/gi, weight: 20, type: 'cta_spam' },
  { pattern: /(?:guaranteed|cam kết|100%|tuyệt đối|chắc chắn|không rủi ro)/gi, weight: 15, type: 'guarantee' },
  { pattern: /(?:secret|bí mật|hidden|hidden gem|only few know|chỉ ít người biết)/gi, weight: 20, type: 'secret_selling' },
  { pattern: /(?:before it's too late|trước khi quá muộn|hôm nay only|limited time)/gi, weight: 25, type: 'urgency_scam' },
];

// Vietnamese blog misinformation patterns
const VN_BLOG_MISINFO = [
  { pattern: /(?:chia sẻ|kinh nghiệm|của tôi|tôi đã thử|tôi đã dùng)\s+(?:thành công|hiệu quả|tuyệt vời)/gi, type: 'personal_anecdote', weight: 10 },
  { pattern: /(?:bài thuốc|công thức|cách làm|bí quyết)\s+(?:của bà|của ông|gia truyền|đông y)/gi, type: 'folk_medicine', weight: 20 },
  { pattern: /(?:phát hiện|nghiên cứu mới|khoa học chứng minh|nghiên cứu cho thấy)/gi, type: 'fake_science', weight: 15 },
  { pattern: /(?:ai cũng không nói|báo chí không đưa|kh ai biết|bí mật bị giấu)/gi, type: 'conspiracy', weight: 25 },
  { pattern: /(?:đầu tư|invest|crypto|bitcoin|token)\s+(?:lợi nhuận|return|ROI)\s+\d+%/gi, type: 'investment_scam', weight: 30 },
];

// Content quality indicators
const QUALITY_INDICATORS = {
  positive: [
    { pattern: /(?:nguồn|source|tham khảo|reference|citation|trích dẫn)/gi, weight: 10, type: 'has_references' },
    { pattern: /(?:tác giả|author|viết bởi|written by|bio|giới thiệu)/gi, weight: 8, type: 'has_author' },
    { pattern: /(?:cập nhật|updated|lần cuối|last modified|ngày đăng)/gi, weight: 5, type: 'has_date' },
    { pattern: /(?:lưu ý|chú ý|disclaimer|từ chối|miễn trừ)/gi, weight: 5, type: 'has_disclaimer' },
    { pattern: /(?:thảo luận|bình luận|comment|discussion)/gi, weight: 3, type: 'has_engagement' },
  ],
  negative: [
    { pattern: /(?:copy|sao chép|đăng lại|repost|share lại)/gi, weight: 15, type: 'copied_content' },
    { pattern: /(?:ai cũng|tất cả|100%|tuyệt đối|chắc chắn|không bao giờ)/gi, weight: 10, type: 'absolute_claims' },
    { pattern: /(?:cảnh báo|warning|cẩn thận|danger|nguy hiểm)\s*!/gi, weight: 8, type: 'fear_mongering' },
    { pattern: /(?:link\s+(?:affiliate|referral|ad))/gi, weight: 20, type: 'affiliate_links' },
  ]
};

// Extract blog metadata from HTML
function extractBlogMetadata(html, url) {
  try {
    const $ = cheerio.load(html);
    const metadata = {
      title: $('title').text().trim() || $('h1').first().text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      author: $('meta[name="author"]').attr('content') || 
              $('[rel="author"]').text().trim() ||
              $('.author').first().text().trim() ||
              $('[class*="author"]').first().text().trim(),
      publishDate: $('meta[property="article:published_time"]').attr('content') ||
                   $('time[datetime]').first().attr('datetime') ||
                   $('[class*="date"]').first().text().trim(),
      modifiedDate: $('meta[property="article:modified_time"]').attr('content') ||
                    $('meta[name="last-modified"]').attr('content'),
      keywords: $('meta[name="keywords"]').attr('content') || '',
      ogImage: $('meta[property="og:image"]').attr('content'),
      canonical: $('link[rel="canonical"]').attr('href'),
      wordCount: $('article, .post-content, .entry-content, .content').text().split(/\s+/).length,
      links: $('article a, .post-content a, .entry-content a').length,
      images: $('article img, .post-content img, .entry-content img').length,
      headings: {
        h1: $('h1').length,
        h2: $('h2').length,
        h3: $('h3').length
      },
      hasComments: $('.comments, #comments, [class*="comment"]').length > 0,
      hasShareButtons: $('[class*="share"], [class*="social"]').length > 0,
      hasRelatedPosts: $('[class*="related"], [class*="suggested"]').length > 0,
    };
    
    return metadata;
  } catch (e) {
    return { error: e.message };
  }
}

// Analyze blog credibility
async function analyzeBlogCredibility(url) {
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase();
    const rootDomain = hostname.split('.').slice(-2).join('.');
    
    const result = {
      url,
      hostname,
      rootDomain,
      platform: null,
      credibility_score: 50,
      factors: [],
      warnings: []
    };
    
    // Check platform
    for (const [platform, info] of Object.entries(BLOG_PLATFORMS)) {
      if (hostname.includes(platform)) {
        result.platform = { name: platform, ...info };
        result.credibility_score = info.baseCredibility;
        result.factors.push({ type: 'platform', impact: info.baseCredibility - 50, detail: info.note });
        break;
      }
    }
    
    // Check if custom domain (higher credibility)
    if (!result.platform) {
      result.credibility_score = 60;
      result.factors.push({ type: 'custom_domain', impact: 10, detail: 'Sử dụng tên miền riêng' });
    }
    
    // Try to fetch and analyze the page
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 10000
      });
      
      const metadata = extractBlogMetadata(data, url);
      result.metadata = metadata;
      
      // Author check
      if (metadata.author) {
        result.credibility_score += 5;
        result.factors.push({ type: 'has_author', impact: 5, detail: `Tác giả: ${metadata.author}` });
      } else {
        result.credibility_score -= 10;
        result.warnings.push('Không tìm thấy thông tin tác giả');
      }
      
      // Date check
      if (metadata.publishDate) {
        const pubDate = new Date(metadata.publishDate);
        const daysOld = Math.floor((Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOld > 365) {
          result.credibility_score -= 5;
          result.warnings.push(`Bài viết cũ (${daysOld} ngày)`);
        } else if (daysOld < 1) {
          result.credibility_score -= 3;
          result.warnings.push('Bài viết rất mới (có thể là tin tức chưa xác thực)');
        }
      } else {
        result.credibility_score -= 5;
        result.warnings.push('Không tìm thấy ngày đăng');
      }
      
      // Word count check
      if (metadata.wordCount) {
        if (metadata.wordCount < 100) {
          result.credibility_score -= 15;
          result.warnings.push('Nội dung quá ngắn (dưới 100 từ)');
        } else if (metadata.wordCount > 500) {
          result.credibility_score += 5;
          result.factors.push({ type: 'substantial_content', impact: 5, detail: `${metadata.wordCount} từ` });
        }
      }
      
      // Reference check
      if (metadata.links > 5) {
        result.credibility_score += 5;
        result.factors.push({ type: 'has_references', impact: 5, detail: `${metadata.links} liên kết` });
      }
      
      // Image check
      if (metadata.images > 2) {
        result.credibility_score += 3;
        result.factors.push({ type: 'has_images', impact: 3, detail: `${metadata.images} hình ảnh` });
      }
      
      // Comment section
      if (metadata.hasComments) {
        result.credibility_score += 3;
        result.factors.push({ type: 'has_comments', impact: 3, detail: 'Có phần bình luận' });
      }
      
    } catch (e) {
      result.warnings.push(`Không thể đọc nội dung: ${e.message}`);
    }
    
    result.credibility_score = Math.max(0, Math.min(100, result.credibility_score));
    result.level = result.credibility_score >= 70 ? 'high' : 
                   result.credibility_score >= 45 ? 'medium' : 'low';
    
    return result;
  } catch (e) {
    return { error: e.message, credibility_score: 0, level: 'unknown' };
  }
}

// Analyze blog content quality
function analyzeBlogContent(text) {
  if (!text || text.length < 50) return { score: 0, issues: [] };
  
  const results = {
    score: 50,
    issues: [],
    positive_signals: [],
    negative_signals: []
  };
  
  // Check quality indicators
  for (const indicator of QUALITY_INDICATORS.positive) {
    const matches = text.match(indicator.pattern);
    if (matches) {
      results.score += indicator.weight;
      results.positive_signals.push({ type: indicator.type, matches: matches.slice(0, 2) });
    }
  }
  
  for (const indicator of QUALITY_INDICATORS.negative) {
    const matches = text.match(indicator.pattern);
    if (matches) {
      results.score -= indicator.weight;
      results.negative_signals.push({ type: indicator.type, matches: matches.slice(0, 2) });
    }
  }
  
  // Check blog misinformation patterns
  for (const pattern of VN_BLOG_MISINFO) {
    const matches = text.match(pattern.pattern);
    if (matches) {
      results.score -= pattern.weight;
      results.issues.push({ type: pattern.type, weight: pattern.weight, matches: matches.slice(0, 2) });
    }
  }
  
  // Check high-risk patterns
  for (const pattern of HIGH_RISK_BLOG_PATTERNS) {
    const matches = text.match(pattern.pattern);
    if (matches) {
      results.score -= pattern.weight;
      results.issues.push({ type: pattern.type, weight: pattern.weight, matches: matches.slice(0, 2) });
    }
  }
  
  // Text structure analysis
  const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 10);
  const avgSentenceLength = text.length / Math.max(sentences.length, 1);
  
  if (avgSentenceLength > 100) {
    results.score -= 5;
    results.issues.push({ type: 'long_sentences', weight: 5, detail: 'Câu quá dài, khó đọc' });
  }
  
  // Check for excessive capitalization
  const capsWords = (text.match(/[A-Z]{3,}/g) || []).length;
  const totalWords = text.split(/\s+/).length;
  if (capsWords / totalWords > 0.1) {
    results.score -= 10;
    results.issues.push({ type: 'excessive_caps', weight: 10, detail: 'Quá nhiều chữ in hoa' });
  }
  
  results.score = Math.max(0, Math.min(100, results.score));
  return results;
}

// Cross-verify blog claims with other sources
async function crossVerifyBlogClaims(text, keywords) {
  const results = {
    other_blogs_mentioning: [],
    news_sources_mentioning: [],
    fact_check_sites: [],
    overall_corroboration: 'none'
  };
  
  const query = keywords.slice(0, 3).join(' ');
  
  // Search for other blogs discussing the same topic
  try {
    const { data } = await axios.get(
      `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss&setlang=vi`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }
    );
    const $ = cheerio.load(data, { xmlMode: true });
    
    $('item').each((i, el) => {
      if (i >= 10) return;
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const source = $(el).find('source').text().trim() || '';
      
      if (title && link) {
        const domain = new URL(link).hostname;
        const isNewsSource = ['vnexpress.net', 'tuoitre.vn', 'thanhnien.vn', 'dantri.com.vn', 'vietnamnet.vn'].some(d => domain.includes(d));
        
        if (isNewsSource) {
          results.news_sources_mentioning.push({ title, link, source });
        } else {
          results.other_blogs_mentioning.push({ title, link, source });
        }
      }
    });
  } catch {}
  
  // Determine corroboration level
  if (results.news_sources_mentioning.length >= 3) {
    results.overall_corroboration = 'strong';
  } else if (results.news_sources_mentioning.length >= 1) {
    results.overall_corroboration = 'moderate';
  } else if (results.other_blogs_mentioning.length >= 3) {
    results.overall_corroboration = 'weak';
  }
  
  return results;
}

// Main blog verification function
async function verifyBlogContent(text, url = null) {
  const startTime = Date.now();
  const results = {
    text: text.substring(0, 200),
    url,
    timestamp: new Date().toISOString(),
    blog_credibility: null,
    content_quality: null,
    cross_verification: null,
    tools_used: [],
    overall_score: 50,
    verdict: null,
    confidence: 0,
    execution_time_ms: 0
  };
  
  // 1. Blog credibility analysis (if URL provided)
  if (url) {
    console.log('[BlogVerify] Step 1: Blog credibility');
    try {
      results.blog_credibility = await analyzeBlogCredibility(url);
      results.tools_used.push('blogCredibility');
    } catch (e) {
      console.error('[BlogVerify] Blog credibility error:', e.message);
    }
  }
  
  // 2. Content quality analysis
  console.log('[BlogVerify] Step 2: Content quality');
  results.content_quality = analyzeBlogContent(text);
  results.tools_used.push('blogContentQuality');
  
  // 3. Cross-verification
  console.log('[BlogVerify] Step 3: Cross-verification');
  const keywords = text.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
  try {
    results.cross_verification = await crossVerifyBlogClaims(text, keywords);
    results.tools_used.push('crossVerify');
  } catch (e) {
    console.error('[BlogVerify] Cross-verification error:', e.message);
  }
  
  // 4. Calculate overall score
  let score = 50;
  
  // Blog credibility impact
  if (results.blog_credibility?.credibility_score) {
    const credDiff = results.blog_credibility.credibility_score - 50;
    score += credDiff * 0.3; // 30% weight
  }
  
  // Content quality impact
  if (results.content_quality?.score) {
    const qualDiff = results.content_quality.score - 50;
    score += qualDiff * 0.4; // 40% weight
  }
  
  // Cross-verification impact
  if (results.cross_verification) {
    const corroboration = results.cross_verification.overall_corroboration;
    if (corroboration === 'strong') score += 15;
    else if (corroboration === 'moderate') score += 8;
    else if (corroboration === 'weak') score -= 5;
    else score -= 10; // No corroboration
  }
  
  score = Math.max(0, Math.min(100, score));
  results.overall_score = score;
  
  // Determine verdict
  if (score >= 75) results.verdict = 'Blog có độ tin cậy cao';
  else if (score >= 55) results.verdict = 'Blog cần kiểm chứng thêm';
  else if (score >= 35) results.verdict = 'Blog có dấu hiệu nghi vấn';
  else results.verdict = 'Blog có khả năng cao là không đáng tin';
  
  // Calculate confidence
  let confidence = 30;
  if (results.blog_credibility) confidence += 15;
  if (results.content_quality) confidence += 15;
  if (results.cross_verification) confidence += 10;
  if (results.cross_verification?.news_sources_mentioning?.length > 0) confidence += 10;
  results.confidence = Math.min(90, confidence);
  
  results.execution_time_ms = Date.now() - startTime;
  console.log(`[BlogVerify] Completed in ${results.execution_time_ms}ms. Score: ${score}`);
  
  return results;
}

module.exports = {
  analyzeBlogCredibility,
  analyzeBlogContent,
  crossVerifyBlogClaims,
  verifyBlogContent,
  BLOG_PLATFORMS,
  HIGH_RISK_BLOG_PATTERNS,
  VN_BLOG_MISINFO
};
