/**
 * Layer 3: News Searcher (Merged searchEngine + newsAggregator)
 * Parallel multi-source news search
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Vietnamese news sources
const NEWS_SOURCES = [
  { name: 'VnExpress', scraper: 'vnexpress', baseUrl: 'https://vnexpress.net' },
  { name: 'Tuổi Trẻ', scraper: 'tuoitre', baseUrl: 'https://tuoitre.vn' },
  { name: 'Thanh Niên', scraper: 'thanhnien', baseUrl: 'https://thanhnien.vn' },
  { name: 'Dân Trí', scraper: 'dantri', baseUrl: 'https://dantri.com.vn' },
  { name: 'VietnamNet', scraper: 'vietnamnet', baseUrl: 'https://vietnamnet.vn' }
];

// RSS feeds
const RSS_FEEDS = [
  { name: 'Google News VN', url: 'https://news.google.com/rss/search?q={query}&hl=vi&gl=VN&ceid=VN:vi' },
  { name: 'Bing News VN', url: 'https://www.bing.com/news/search?q={query}&format=rss&setlang=vi' }
];

function cleanText(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function searchGoogleNewsRSS(query, limit = 10) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`;
    const { data } = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data, { xmlMode: true });
    const articles = [];
    $('item').each((i, el) => {
      if (i >= limit) return false;
      articles.push({
        title: cleanText($(el).find('title').text()),
        link: $(el).find('link').text() || $(el).find('link').next().text(),
        snippet: cleanText($(el).find('description').text()),
        source: $(el).find('source').text() || 'Google News',
        pubDate: $(el).find('pubDate').text()
      });
    });
    return articles;
  } catch (e) {
    console.warn('[NewsSearcher] Google News RSS error:', e.message);
    return [];
  }
}

async function searchBingNewsRSS(query, limit = 10) {
  try {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&setlang=vi`;
    const { data } = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data, { xmlMode: true });
    const articles = [];
    $('item').each((i, el) => {
      if (i >= limit) return false;
      articles.push({
        title: cleanText($(el).find('title').text()),
        link: $(el).find('link').text() || $(el).find('link').next().text(),
        snippet: cleanText($(el).find('description').text()),
        source: 'Bing News',
        pubDate: $(el).find('pubDate').text()
      });
    });
    return articles;
  } catch (e) {
    console.warn('[NewsSearcher] Bing News RSS error:', e.message);
    return [];
  }
}

async function searchAllSources(query, options = {}) {
  const { limit = 10, timeout = 15000 } = options;
  const startTime = Date.now();
  
  const searchPromises = [
    searchGoogleNewsRSS(query, limit),
    searchBingNewsRSS(query, limit)
  ];
  
  const results = await Promise.allSettled(searchPromises);
  const allArticles = [];
  const sources = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
      sources.push(result.value[0]?.source || 'unknown');
    }
  }
  
  // Deduplicate by title similarity
  const seen = new Set();
  const uniqueArticles = [];
  for (const article of allArticles) {
    const normalizedTitle = article.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!seen.has(normalizedTitle) && article.title.length > 10) {
      seen.add(normalizedTitle);
      uniqueArticles.push(article);
    }
  }
  
  return {
    articles: uniqueArticles.slice(0, limit * 2),
    sources,
    totalFound: allArticles.length,
    uniqueCount: uniqueArticles.length,
    executionTimeMs: Date.now() - startTime
  };
}

module.exports = { searchAllSources, searchGoogleNewsRSS, searchBingNewsRSS, NEWS_SOURCES, RSS_FEEDS };
