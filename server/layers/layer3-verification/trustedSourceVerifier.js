/**
 * Layer 3: Trusted Source Verifier
 * Cross-references with trusted Vietnamese sources and government warnings
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Trusted Vietnamese news sources
const TRUSTED_SOURCES = {
  'vnexpress.net': { name: 'VnExpress', trust: 90, category: 'Tin tức' },
  'tuoitre.vn': { name: 'Tuổi Trẻ', trust: 88, category: 'Tin tức' },
  'thanhnien.vn': { name: 'Thanh Niên', trust: 88, category: 'Tin tức' },
  'dantri.com.vn': { name: 'Dân Trí', trust: 85, category: 'Tin tức' },
  'vietnamnet.vn': { name: 'VietnamNet', trust: 85, category: 'Tin tức' },
  'nld.com.vn': { name: 'Người Lao Động', trust: 85, category: 'Tin tức' },
  'tienphong.vn': { name: 'Tiền Phong', trust: 85, category: 'Tin tức' },
  'vietnamplus.vn': { name: 'VietnamPlus', trust: 87, category: 'Tin tức' },
  'baochinhphu.vn': { name: 'Báo Chính Phủ', trust: 95, category: 'Chính phủ' },
  'chinhphu.vn': { name: 'Cổng Thông tin Chính phủ', trust: 95, category: 'Chính phủ' },
  'moet.gov.vn': { name: 'Bộ GD&ĐT', trust: 92, category: 'Chính phủ' },
  'moh.gov.vn': { name: 'Bộ Y tế', trust: 92, category: 'Chính phủ' },
  'mp.gov.vn': { name: 'Bộ Công an', trust: 92, category: 'Chính phủ' },
  'vbpl.chinhphu.vn': { name: 'Văn bản pháp luật', trust: 95, category: 'Pháp luật' }
};

// Government warning domains
const GOV_WARNING_DOMAINS = [
  'antigianlan.gov.vn', 'khonggianmang.vn', 'ncsc.gov.vn',
  'cuk.gov.vn', 'aicc.gov.vn'
];

// Fact-check sources
const FACTCHECK_SOURCES = [
  { name: 'Tin Fact', domain: 'tinfact.vn', trust: 85 },
  { name: 'VietFactCheck', domain: 'vietfactcheck.vn', trust: 80 },
  { name: 'FactCheck VN', domain: 'factcheck.vn', trust: 80 }
];

function getTrustedSourceScore(domain) {
  const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
  
  for (const [key, source] of Object.entries(TRUSTED_SOURCES)) {
    if (normalizedDomain.includes(key) || key.includes(normalizedDomain)) {
      return { ...source, matched: true };
    }
  }
  
  return { matched: false, trust: 0, category: 'unknown' };
}

async function crossReferenceWithTrustedSources(text, keywords = []) {
  const startTime = Date.now();
  const searchQuery = keywords.length > 0 ? keywords.join(' ') : text.substring(0, 100);
  
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=vi&gl=VN&ceid=VN:vi`;
    const { data } = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data, { xmlMode: true });
    
    const crossRefs = [];
    $('item').each((i, el) => {
      if (i >= 10) return false;
      const link = $(el).find('link').text() || $(el).find('link').next().text();
      const title = $(el).find('title').text();
      
      // Extract domain from link
      try {
        const domain = new URL(link).hostname.replace(/^www\./, '');
        const sourceInfo = getTrustedSourceScore(domain);
        
        crossRefs.push({
          title: title.replace(/<[^>]*>/g, ''),
          link,
          domain,
          source: sourceInfo.name || domain,
          trustScore: sourceInfo.trust,
          isTrusted: sourceInfo.trust >= 80,
          category: sourceInfo.category
        });
      } catch (e) {
        // Invalid URL, skip
      }
    });
    
    return {
      crossReferences: crossRefs,
      trustedCount: crossRefs.filter(r => r.isTrusted).length,
      totalCount: crossRefs.length,
      executionTimeMs: Date.now() - startTime
    };
  } catch (e) {
    console.warn('[TrustedSourceVerifier] Cross-reference error:', e.message);
    return { crossReferences: [], trustedCount: 0, totalCount: 0, executionTimeMs: Date.now() - startTime };
  }
}

async function checkGovWarnings(query) {
  const startTime = Date.now();
  
  try {
    const url = `https://antigianlan.gov.vn/tim-kiem?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    
    const warnings = [];
    $('article, .news-item, .warning-item').each((i, el) => {
      if (i >= 5) return false;
      warnings.push({
        title: $(el).find('h2, h3, .title').first().text().trim(),
        link: $(el).find('a').first().attr('href'),
        source: 'antigianlan.gov.vn'
      });
    });
    
    return {
      warnings,
      hasWarning: warnings.length > 0,
      executionTimeMs: Date.now() - startTime
    };
  } catch (e) {
    return { warnings: [], hasWarning: false, executionTimeMs: Date.now() - startTime };
  }
}

module.exports = {
  getTrustedSourceScore,
  crossReferenceWithTrustedSources,
  checkGovWarnings,
  TRUSTED_SOURCES,
  GOV_WARNING_DOMAINS,
  FACTCHECK_SOURCES
};
