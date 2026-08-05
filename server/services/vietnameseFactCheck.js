const axios = require('axios');
const cheerio = require('cheerio');

// ============ VIETNAMESE FACT-CHECKING & NEWS VERIFICATION ============

// Trusted Vietnamese news sources (editorial standards)
const TRUSTED_VN_SOURCES = [
  { domain: 'vnexpress.net', name: 'VnExpress', trustScore: 85, type: 'mainstream' },
  { domain: 'tuoitre.vn', name: 'Tuổi Trẻ', trustScore: 85, type: 'mainstream' },
  { domain: 'thanhnien.vn', name: 'Thanh Niên', trustScore: 85, type: 'mainstream' },
  { domain: 'dantri.com.vn', name: 'Dân Trí', trustScore: 80, type: 'mainstream' },
  { domain: 'vietnamnet.vn', name: 'VietnamNet', trustScore: 80, type: 'mainstream' },
  { domain: 'nld.com.vn', name: 'Người Lao Động', trustScore: 80, type: 'mainstream' },
  { domain: 'phapluattp.vn', name: 'Pháp Luật TP.HCM', trustScore: 80, type: 'mainstream' },
  { domain: 'tienphong.vn', name: 'Tiền Phong', trustScore: 80, type: 'mainstream' },
  { domain: 'giaoduc.net.vn', name: 'Giáo Dục', trustScore: 75, type: 'mainstream' },
  { domain: 'vietnamplus.vn', name: 'VietnamPlus', trustScore: 80, type: 'mainstream' },
  { domain: 'baochinhphu.vn', name: 'Báo Chính phủ', trustScore: 90, type: 'government' },
  { domain: 'chinhphu.vn', name: 'Chính phủ', trustScore: 90, type: 'government' },
  { domain: 'moh.gov.vn', name: 'Bộ Y tế', trustScore: 90, type: 'government' },
  { domain: 'molisa.gov.vn', name: 'Bộ LĐTBXH', trustScore: 90, type: 'government' },
  { domain: 'mpa.gov.vn', name: 'Bộ Công an', trustScore: 90, type: 'government' },
  { domain: 'danhgia.nhandan.vn', name: 'Nhân Dân', trustScore: 85, type: 'party' },
  { domain: 'nhandan.vn', name: 'Nhân Dân', trustScore: 85, type: 'party' },
  { domain: 'ttxvn.vn', name: 'TTXVN', trustScore: 85, type: 'state_news' },
  { domain: 'vietnamplus.vn', name: 'VietnamPlus', trustScore: 80, type: 'state_news' },
];

// Fact-check websites
const FACTCHECK_SOURCES = [
  { domain: 'factcheck.vietnam.vn', name: 'Vietnam Fact-check', url: 'https://factcheck.vietnam.vn' },
  { domain: 'tinnhanh.vn', name: 'Tin Nhanh', url: 'https://tinnhanh.vn' },
  { domain: 'vietcheck.vn', name: 'VietCheck', url: 'https://vietcheck.vn' },
  { domain: 'anhbasam.com', name: 'Anh Ba Sàm', url: 'https://anhbasam.com' },
  { domain: 'thoiday.com', name: 'Thời Đại', url: 'https://thoiday.com' },
];

// Vietnamese government warning domains
const GOV_WARNING_SOURCES = [
  { url: 'https://www.moh.gov.vn', name: 'Bộ Y tế', type: 'health' },
  { url: 'https://covid19.gov.vn', name: 'COVID-19', type: 'health' },
  { url: 'https://ais.gov.vn', name: 'An toàn thông tin', type: 'cyber' },
  { url: 'https://mic.gov.vn', name: 'BTTTT', type: 'telecom' },
  { url: 'https://www.csgt.vn', name: 'Cảnh sát PCCC', type: 'safety' },
];

// Vietnamese-specific fake news patterns
const VN_FAKE_PATTERNS = [
  { pattern: /(?:Bộ Y tế|WHO|CDC)\s+(?:khuyến cáo|cảnh báo|cấm)\s+(?:vắc-xin|thuốc|vacxin)/gi, type: 'health_misinfo', severity: 'high' },
  { pattern: /(?:CHÍNH THỨC|CHÍNH PHỦ)\s+(?:ban hành|cấm|buộc)\s+(?:lệnh|quyết định)/gi, type: 'fake_official', severity: 'high' },
  { pattern: /(?:Facebook|Zalo|TikTok)\s+(?:xóa|block|cấm)\s+(?:tài khoản|video)/gi, type: 'platform_fake', severity: 'medium' },
  { pattern: /(?:bí quyết|bài thuốc|thảo dược)\s+(?:chữa|điều trị)\s+(?:ung thư|tiểu đường|COVID)/gi, type: 'health_fraud', severity: 'high' },
  { pattern: /(?:lãi suất|đầu tư|tiền ảo)\s+(?:siêu lợi nhuận|cam kết|100%)/gi, type: 'financial_scam', severity: 'high' },
  { pattern: /(?:thảm họa|thiên tai|động đất|tsunami)\s+(?:sắp xảy ra|cận kề)/gi, type: 'disaster_fake', severity: 'high' },
  { pattern: /(?:sĩ quan|bộ đội|công an)\s+(?:bị bắt|tự tử|đánh nhau)/gi, type: 'military_fake', severity: 'medium' },
  { pattern: /(?:học sinh|sinh viên)\s+(?:tử vong|bị bắt|đánh nhau)\s+(?:vì|do)/gi, type: 'education_fake', severity: 'medium' },
  { pattern: /(?:Thủ tướng|Chủ tịch nước|Bộ trưởng)\s+(?:từ chức|bị bắt|qua đời)/gi, type: 'political_fake', severity: 'high' },
  { pattern: /(?:thị trường|giá vàng|giá USD)\s+(?:sập|laos dốc|tăng vọt)/gi, type: 'market_fake', severity: 'medium' },
];

// Vietnamese common misinfo topics
const VN_MISINFO_TOPICS = [
  'vắc xin COVID-19',
  'thuốc chữa COVID-19',
  'giá xăng dầu',
  'lãi suất ngân hàng',
  'thị trường chứng khoán',
  'bão lũ',
  'động đất',
  'thảm họa môi trường',
  'ô nhiễm nguồn nước',
  'an toàn thực phẩm',
  'trẻ em bị bắt cóc',
  'người mất tích',
  'tai nạn giao thông nghiêm trọng',
];

async function checkVNFactCheckSources(query) {
  const results = [];
  
  for (const source of FACTCHECK_SOURCES) {
    try {
      const searchUrl = `${source.url}/?s=${encodeURIComponent(query)}`;
      const { data } = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 6000
      });
      
      const $ = cheerio.load(data);
      const articles = [];
      
      $('article, .post, .entry, .article-item').each((i, el) => {
        if (i >= 3) return;
        const title = $(el).find('h2 a, h3 a, .entry-title a').first().text().trim();
        const link = $(el).find('h2 a, h3 a, .entry-title a').first().attr('href');
        const excerpt = $(el).find('.entry-content, .excerpt, p').first().text().trim();
        
        if (title && link) {
          articles.push({ title, link, excerpt, source: source.name });
        }
      });
      
      if (articles.length > 0) {
        results.push({ source: source.name, articles });
      }
    } catch {}
  }
  
  return results;
}

function detectVNFakePatterns(text) {
  const detected = [];
  
  for (const { pattern, type, severity } of VN_FAKE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      detected.push({ type, severity, matches: matches.slice(0, 3) });
    }
  }
  
  return detected;
}

function getTrustedSourceScore(domain) {
  const source = TRUSTED_VN_SOURCES.find(s => domain.includes(s.domain));
  if (source) {
    return { trusted: true, name: source.name, score: source.trustScore, type: source.type };
  }
  return { trusted: false, score: 30, type: 'unknown' };
}

async function checkGovWarnings(query) {
  const warnings = [];
  
  for (const source of GOV_WARNING_SOURCES) {
    try {
      const { data } = await axios.get(source.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });
      
      const $ = cheerio.load(data);
      const keywords = query.toLowerCase().split(/\s+/);
      
      $('a, h2, h3, .title, .news-title').each((i, el) => {
        const text = $(el).text().toLowerCase();
        if (keywords.some(kw => text.includes(kw))) {
          const link = $(el).attr('href') || $(el).find('a').attr('href');
          if (link) {
            warnings.push({
              source: source.name,
              type: source.type,
              text: $(el).text().trim().substring(0, 100),
              url: link.startsWith('http') ? link : `${source.url}${link}`
            });
          }
        }
      });
    } catch {}
  }
  
  return warnings.slice(0, 5);
}

async function crossReferenceWithTrustedSources(text, keywords) {
  const results = [];
  const query = keywords.slice(0, 3).join(' ');
  
  for (const source of TRUSTED_VN_SOURCES.filter(s => s.type === 'mainstream').slice(0, 4)) {
    try {
      const searchUrl = `https://${source.domain}/tim-kiem?q=${encodeURIComponent(query)}`;
      const { data } = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 6000
      });
      
      const $ = cheerio.load(data);
      const articles = [];
      
      $('h3 a, h2 a, .title a, .article-title a').each((i, el) => {
        if (i >= 3) return;
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link) {
          const absoluteLink = link.startsWith('http') ? link : `https://${source.domain}${link}`;
          articles.push({ title, link: absoluteLink, source: source.name });
        }
      });
      
      if (articles.length > 0) {
        results.push({ source: source.name, trustScore: source.trustScore, articles });
      }
    } catch {}
  }
  
  return results;
}

module.exports = {
  checkVNFactCheckSources,
  detectVNFakePatterns,
  getTrustedSourceScore,
  checkGovWarnings,
  crossReferenceWithTrustedSources,
  TRUSTED_VN_SOURCES,
  FACTCHECK_SOURCES,
  VN_FAKE_PATTERNS,
  VN_MISINFO_TOPICS
};
