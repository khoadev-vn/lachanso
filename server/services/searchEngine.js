const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const GOOGLE_CSE_KEY = process.env.GOOGLE_CSE_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
};

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u00e0-\u1ef9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeArticles(articles) {
  const seen = new Map();
  for (const article of articles) {
    const key = normalizeTitle(article.title);
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, article);
    } else {
      const existing = seen.get(key);
      if (!existing.description && article.description) {
        existing.description = article.description;
      }
      if (!existing.link && article.link) {
        existing.link = article.link;
      }
    }
  }
  return Array.from(seen.values());
}

async function scrapeVnExpress(query, limit = 6) {
  try {
    const url = `https://timkiem.vnexpress.net/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: DEFAULT_HEADERS,
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.item-news').each((i, el) => {
      if (i >= limit) return;

      const titleElement = $(el).find('h3.title-news a');
      const descriptionElement = $(el).find('p.description a');

      const title = titleElement.attr('title') || titleElement.text().trim();
      const link = titleElement.attr('href');
      const description = descriptionElement.text().trim();

      if (title && link) {
        articles.push({
          title,
          description,
          link,
          source: 'VnExpress'
        });
      }
    });

    return articles;
  } catch (error) {
    console.error('[Search Engine] Lỗi khi scrape VnExpress:', error.message);
    return [];
  }
}

async function scrapeDantri(query, limit = 10) {
  try {
    const slug = query.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u00e0-\u1ef9-]/gi, '');
    const url = `https://dantri.com.vn/tim-kiem/${encodeURIComponent(slug)}.htm`;
    const response = await axios.get(url, {
      headers: DEFAULT_HEADERS,
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('article, .article-item, .article-content, li.article').each((i, el) => {
      if (i >= limit) return;

      const titleElement = $(el).find('a.article-title, h3 a, h2 a, .article-title a, a[title]').first();
      const title = titleElement.attr('title') || titleElement.text().trim() || $(el).find('a').first().attr('title');
      const link = titleElement.attr('href') || $(el).find('a').first().attr('href');
      const description = $(el).find('.article-excerpt, p').first().text().trim() || '';

      if (title && link) {
        const absoluteLink = link.startsWith('http') ? link : `https://dantri.com.vn${link}`;
        articles.push({
          title,
          description,
          link: absoluteLink,
          source: 'Dân Trí'
        });
      }
    });

    if (articles.length === 0) {
      $('a[href*="/dantri.com.vn"], a[href^="/"]').each((i, el) => {
        if (i >= limit) return;
        const title = $(el).attr('title') || $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link && title.length > 15 && !link.includes('javascript')) {
          articles.push({
            title,
            description: '',
            link: link.startsWith('http') ? link : `https://dantri.com.vn${link}`,
            source: 'Dân Trí'
          });
        }
      });
    }

    return articles;
  } catch (error) {
    console.error('[Search Engine] Lỗi khi scrape Dân Trí:', error.message);
    return [];
  }
}

async function scrapeVietnamNet(query, limit = 10) {
  try {
    const url = `https://vietnamnet.vn/tim-kiem?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: DEFAULT_HEADERS,
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.verticalPost__main-title a, .Item a, .list-news .item a, article a').each((i, el) => {
      if (i >= limit) return;

      const title = $(el).attr('title') || $(el).text().trim();
      const link = $(el).attr('href');

      if (title && link && title.length > 10) {
        const absoluteLink = link.startsWith('http') ? link : `https://vietnamnet.vn${link}`;
        articles.push({
          title,
          description: '',
          link: absoluteLink,
          source: 'VietnamNet'
        });
      }
    });

    return articles;
  } catch (error) {
    console.error('[Search Engine] Lỗi khi scrape VietnamNet:', error.message);
    return [];
  }
}

async function scrapeTuoitre(query, limit = 10) {
  try {
    const url = `https://tuoitre.vn/tim-kiem.htm?keywords=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: DEFAULT_HEADERS,
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.news-item, .box-category-item, article').each((i, el) => {
      if (i >= limit) return;

      const titleElement = $(el).find('h3 a, .title a, .box-category-link-title').first();
      const title = titleElement.text().trim() || titleElement.attr('title');
      const link = titleElement.attr('href');
      const description = $(el).find('.description, .sapo, .box-category-sapo').first().text().trim() || '';

      if (title && link) {
        const absoluteLink = link.startsWith('http') ? link : `https://tuoitre.vn${link}`;
        articles.push({
          title,
          description,
          link: absoluteLink,
          source: 'Tuổi Trẻ'
        });
      }
    });

    return articles;
  } catch (error) {
    console.error('[Search Engine] Lỗi khi scrape Tuổi Trẻ:', error.message);
    return [];
  }
}

async function scrapeGoogleNewsRSS(query, limit = 15) {
  try {
    const extendedQuery = query + " after:2020-01-01";
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(extendedQuery)}&hl=vi&gl=VN&ceid=VN:vi`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      timeout: 8000
    });

    const $xml = cheerio.load(response.data, { xmlMode: true });
    const results = [];

    $xml('item').each((i, el) => {
      if (i >= limit) return;
      const title = $xml(el).find('title').text().trim();
      const link = $xml(el).find('link').text().trim();
      const source = $xml(el).find('source').text().trim() || 'Google News';
      const description = $xml(el).find('description').text().trim() || title;

      if (title && link) {
        results.push({ title, description, link, source });
      }
    });
    return results;
  } catch (error) {
    console.error('[Search Engine] Lỗi khi scrape Google News RSS:', error.message);
    return [];
  }
}

async function scrapeBingNews(query, limit = 15) {
  try {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&setlang=vi`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      timeout: 8000
    });

    const $xml = cheerio.load(response.data, { xmlMode: true });
    const results = [];

    $xml('item').each((i, el) => {
      if (i >= limit) return;
      const title = $xml(el).find('title').text().trim();
      const link = $xml(el).find('link').text().trim();
      const source = $xml(el).find('source').text().trim() || 'Bing News';
      const description = $xml(el).find('description').text().trim() || title;

      if (title && link) {
        results.push({ title, description, link, source });
      }
    });
    return results;
  } catch (error) {
    console.error('[Search Engine] Lỗi khi scrape Bing News:', error.message);
    return [];
  }
}

async function searchVietnameseNews(query) {
  const fallbackQuery = query.replace(/"/g, '');

  console.warn('[Search Engine] Đang tìm kiếm đa nguồn (Bing News + Google News + VnExpress + Dân Trí + VietnamNet + Tuổi Trẻ)...');

  const [bingNews, googleNews, vnexpress, dantri, vietnamnet, tuoitre] = await Promise.allSettled([
    scrapeBingNews(fallbackQuery),
    scrapeGoogleNewsRSS(fallbackQuery),
    scrapeVnExpress(fallbackQuery),
    scrapeDantri(fallbackQuery),
    scrapeVietnamNet(fallbackQuery),
    scrapeTuoitre(fallbackQuery)
  ]);

  const merged = [
    ...(bingNews.status === 'fulfilled' ? bingNews.value : []),
    ...(googleNews.status === 'fulfilled' ? googleNews.value : []),
    ...(vnexpress.status === 'fulfilled' ? vnexpress.value : []),
    ...(dantri.status === 'fulfilled' ? dantri.value : []),
    ...(vietnamnet.status === 'fulfilled' ? vietnamnet.value : []),
    ...(tuoitre.status === 'fulfilled' ? tuoitre.value : [])
  ];

  const deduped = dedupeArticles(merged).slice(0, 20);
  console.log(`[Search Engine] Tìm thấy ${deduped.length} bài báo.`);
  return deduped;
}

module.exports = {
  searchVietnameseNews,
  scrapeVnExpress,
  scrapeGoogleNewsRSS,
  scrapeBingNews,
  scrapeDantri,
  scrapeVietnamNet,
  scrapeTuoitre
};
