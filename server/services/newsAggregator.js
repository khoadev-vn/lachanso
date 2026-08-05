const axios = require('axios');
const cheerio = require('cheerio');

// ============ MULTI-SOURCE NEWS AGGREGATOR ============

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

// ============ RSS FEEDS ============
const RSS_FEEDS = {
  'Google News VN': 'https://news.google.com/rss/search?q={query}&hl=vi&gl=VN&ceid=VN:vi',
  'Bing News VN': 'https://www.bing.com/news/search?q={query}&format=rss&setlang=vi',
  'Google News Fact Check': 'https://news.google.com/rss/search?q={query}+factcheck&hl=vi&gl=VN&ceid=VN:vi',
  'Google News Chính trị': 'https://news.google.com/rss/search?q={query}+chính+trị&hl=vi&gl=VN&ceid=VN:vi',
  'Google News Kinh tế': 'https://news.google.com/rss/search?q={query}+kinh+tế&hl=vi&gl=VN&ceid=VN:vi',
  'Google News Sức khỏe': 'https://news.google.com/rss/search?q={query}+sức+khỏe&hl=vi&gl=VN&ceid=VN:vi',
};

// ============ VIETNAMESE NEWS SCRAPERS ============
async function scrapeVnExpress(query, limit = 8) {
  try {
    const url = `https://timkiem.vnexpress.net/?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const articles = [];
    
    $('.item-news, .item-news-full').each((i, el) => {
      if (i >= limit) return;
      const titleEl = $(el).find('h3.title-news a, h2 a').first();
      const descEl = $(el).find('p.description a, .sapo').first();
      const title = titleEl.attr('title') || titleEl.text().trim();
      const link = titleEl.attr('href');
      const description = descEl.text().trim();
      if (title && link) articles.push({ title, description, link, source: 'VnExpress' });
    });
    return articles;
  } catch { return []; }
}

async function scrapeTuoitre(query, limit = 8) {
  try {
    const url = `https://tuoitre.vn/tim-kiem.htm?keywords=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const articles = [];
    
    $('.news-item, .box-category-item').each((i, el) => {
      if (i >= limit) return;
      const titleEl = $(el).find('h3 a, .title a').first();
      const descEl = $(el).find('.description, .sapo').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      const description = descEl.text().trim();
      if (title && link) {
        articles.push({ title, description, link: link.startsWith('http') ? link : `https://tuoitre.vn${link}`, source: 'Tuổi Trẻ' });
      }
    });
    return articles;
  } catch { return []; }
}

async function scrapeThanhnien(query, limit = 8) {
  try {
    const url = `https://thanhnien.vn/tim-kiem/?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const articles = [];
    
    $('.story, .article-item, .item-news').each((i, el) => {
      if (i >= limit) return;
      const titleEl = $(el).find('h2 a, h3 a, .title a').first();
      const descEl = $(el).find('.summary, .sapo, p').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      const description = descEl.text().trim();
      if (title && link) {
        articles.push({ title, description, link: link.startsWith('http') ? link : `https://thanhnien.vn${link}`, source: 'Thanh Niên' });
      }
    });
    return articles;
  } catch { return []; }
}

async function scrapeDantri(query, limit = 8) {
  try {
    const slug = query.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u00e0-\u1ef9-]/gi, '');
    const url = `https://dantri.com.vn/tim-kiem/${encodeURIComponent(slug)}.htm`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const articles = [];
    
    $('article, .article-item').each((i, el) => {
      if (i >= limit) return;
      const titleEl = $(el).find('a.article-title, h3 a').first();
      const descEl = $(el).find('.article-excerpt, p').first();
      const title = titleEl.attr('title') || titleEl.text().trim();
      const link = titleEl.attr('href');
      const description = descEl.text().trim();
      if (title && link) {
        articles.push({ title, description, link: link.startsWith('http') ? link : `https://dantri.com.vn${link}`, source: 'Dân Trí' });
      }
    });
    return articles;
  } catch { return []; }
}

async function scrapeVietnamNet(query, limit = 8) {
  try {
    const url = `https://vietnamnet.vn/tim-kiem?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const articles = [];
    
    $('.verticalPost__main-title a, .Item a').each((i, el) => {
      if (i >= limit) return;
      const title = $(el).attr('title') || $(el).text().trim();
      const link = $(el).attr('href');
      if (title && link && title.length > 10) {
        articles.push({ title, description: '', link: link.startsWith('http') ? link : `https://vietnamnet.vn${link}`, source: 'VietnamNet' });
      }
    });
    return articles;
  } catch { return []; }
}

async function scrapeNld(query, limit = 8) {
  try {
    const url = `https://nld.com.vn/tim-kiem.htm?keywords=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const articles = [];
    
    $('.news-item, .item-news').each((i, el) => {
      if (i >= limit) return;
      const titleEl = $(el).find('h3 a, .title a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      if (title && link) {
        articles.push({ title, description: '', link: link.startsWith('http') ? link : `https://nld.com.vn${link}`, source: 'Người Lao Động' });
      }
    });
    return articles;
  } catch { return []; }
}

async function scrapeTienphong(query, limit = 8) {
  try {
    const url = `https://tienphong.vn/tim-kiem/?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const articles = [];
    
    $('.story, .article-item').each((i, el) => {
      if (i >= limit) return;
      const titleEl = $(el).find('h2 a, h3 a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      if (title && link) {
        articles.push({ title, description: '', link: link.startsWith('http') ? link : `https://tienphong.vn${link}`, source: 'Tiền Phong' });
      }
    });
    return articles;
  } catch { return []; }
}

// ============ RSS PARSER ============
async function fetchRSSFeed(url, sourceName, limit = 10) {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, application/xml, text/xml' },
      timeout: 8000
    });
    const $ = cheerio.load(data, { xmlMode: true });
    const results = [];
    
    $('item').each((i, el) => {
      if (i >= limit) return;
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const source = $(el).find('source').text().trim() || sourceName;
      const pubDate = $(el).find('pubDate').text().trim();
      const description = $(el).find('description').text().trim() || title;
      
      if (title && link) {
        results.push({ title, description, link, source, pubDate });
      }
    });
    return results;
  } catch { return []; }
}

async function aggregateNews(query, options = {}) {
  const { maxResults = 25, includeRSS = true } = options;
  
  console.log(`[NewsAggregator] Aggregating for: "${query}"`);
  
  const scrapers = [
    scrapeVnExpress(query),
    scrapeTuoitre(query),
    scrapeThanhnien(query),
    scrapeDantri(query),
    scrapeVietnamNet(query),
    scrapeNld(query),
    scrapeTienphong(query),
  ];
  
  if (includeRSS) {
    for (const [name, template] of Object.entries(RSS_FEEDS)) {
      scrapers.push(fetchRSSFeed(template.replace('{query}', encodeURIComponent(query)), name));
    }
  }
  
  const results = await Promise.allSettled(scrapers);
  const allArticles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
  
  // Dedupe by normalized title
  const seen = new Map();
  for (const article of allArticles) {
    const key = article.title.toLowerCase().replace(/[^a-z0-9\u00e0-\u1ef9\s]/gi, '').replace(/\s+/g, ' ').trim();
    if (!key || key.length < 10) continue;
    if (!seen.has(key)) {
      seen.set(key, article);
    }
  }
  
  const deduped = Array.from(seen.values()).slice(0, maxResults);
  console.log(`[NewsAggregator] Found ${deduped.length} unique articles from ${results.length} sources`);
  return deduped;
}

module.exports = {
  aggregateNews,
  fetchRSSFeed,
  scrapeVnExpress,
  scrapeTuoitre,
  scrapeThanhnien,
  scrapeDantri,
  scrapeVietnamNet,
  scrapeNld,
  scrapeTienphong,
  RSS_FEEDS
};
