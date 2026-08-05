/**
 * Layer 1: Input Processing & Fast Shield
 * Handles: text normalization, URL extraction, claim extraction, link safety
 */

const { analyzeLink } = require('../../services/linkAnalysis');
const { fullDomainAnalysis } = require('../../services/domainReputation');
const { extractClaims, detectSensationalism, extractNumbers, checkSourceReliability } = require('../../services/claimAnalyzer');

// Zero-width character patterns for cleaning
const ZERO_WIDTH_PATTERN = /[\u200B\u200C\u200D\uFEFF\u00AD]/g;
const HOMOGLYPH_MAP = {
  'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'â': 'a', 'đ': 'd', 'é': 'e', 'è': 'e',
  'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e', 'ê': 'e', 'í': 'i',
  'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i', 'ó': 'o',
  'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o', 'ô': 'o',
  'ơ': 'o', 'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u',
  'ụ': 'u', 'ư': 'u', 'ý': 'y', 'ỳ': 'y', 'ỷ': 'y',
  'ỹ': 'y', 'ỵ': 'y'
};

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  // NFC normalization for Vietnamese
  let normalized = text.normalize('NFC');
  
  // Remove zero-width characters
  normalized = normalized.replace(ZERO_WIDTH_PATTERN, '');
  
  // Remove hidden Unicode characters (but keep Vietnamese diacritics)
  normalized = normalized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  // Remove excessive whitespace
  normalized = normalized.replace(/\s{3,}/g, '  ');
  
  return normalized.trim();
}

function extractUrls(text) {
  if (!text) return [];
  
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const urls = [];
  let match;
  
  while ((match = urlPattern.exec(text)) !== null) {
    urls.push({
      url: match[0],
      position: match.index,
      context: text.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50)
    });
  }
  
  return urls;
}

function extractEntities(text) {
  const entities = {
    people: [],
    organizations: [],
    locations: [],
    dates: [],
    numbers: []
  };
  
  // Vietnamese date patterns
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/gi,
    /(\d{1,2})\s+(tháng\s+\d{1,2}|thg\s+\d{1,2})\s+(\d{4})/gi
  ];
  
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.dates.push({ value: match[0], position: match.index });
    }
  }
  
  // Extract numbers with context
  const numberPattern = /(\d+(?:\.\d+)?)\s*(%|phần trăm|tỷ|triệu|nghìn|ngàn|đồng|USD|VND|người|phiếu|năm|ngày|tháng|giờ|phút)/gi;
  let match;
  while ((match = numberPattern.exec(text)) !== null) {
    entities.numbers.push({
      value: parseFloat(match[1]),
      unit: match[2],
      context: text.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30),
      position: match.index
    });
  }
  
  return entities;
}

async function processInput(input, options = {}) {
  const startTime = Date.now();
  const result = {
    originalText: input,
    normalizedText: '',
    urls: [],
    entities: {},
    claims: [],
    sensationalism: null,
    sourceReliability: null,
    linkAnalysis: [],
    domainAnalysis: [],
    executionTimeMs: 0
  };
  
  // Step 1: Normalize text
  result.normalizedText = normalizeText(input);
  
  // Step 2: Extract URLs
  result.urls = extractUrls(result.normalizedText);
  
  // Step 3: Extract entities
  result.entities = extractEntities(result.normalizedText);
  
  // Step 4: Extract claims and analyze
  result.claims = extractClaims(result.normalizedText);
  result.sensationalism = detectSensationalism(result.normalizedText);
  result.sourceReliability = checkSourceReliability(result.normalizedText);
  
  // Step 5: Analyze links (parallel)
  if (result.urls.length > 0) {
    const linkAnalyses = await Promise.allSettled(
      result.urls.map(async (urlObj) => {
        try {
          const analysis = await analyzeLink(urlObj.url);
          return { ...analysis, position: urlObj.position, context: urlObj.context };
        } catch (e) {
          return { url: urlObj.url, error: e.message, position: urlObj.position };
        }
      })
    );
    result.linkAnalysis = linkAnalyses.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message });
  }
  
  // Step 6: Domain analysis for unique domains
  const uniqueDomains = [...new Set(result.urls.map(u => {
    try { return new URL(u.url).hostname; } catch { return null; }
  }).filter(Boolean))];
  
  if (uniqueDomains.length > 0) {
    const domainAnalyses = await Promise.allSettled(
      uniqueDomains.map(async (domain) => {
        try {
          return await fullDomainAnalysis(domain);
        } catch (e) {
          return { domain, error: e.message };
        }
      })
    );
    result.domainAnalysis = domainAnalyses.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message });
  }
  
  result.executionTimeMs = Date.now() - startTime;
  return result;
}

module.exports = { processInput, normalizeText, extractUrls, extractEntities };
