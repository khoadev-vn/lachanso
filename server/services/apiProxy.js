const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const SERVER_FACT_CHECK_KEY = process.env.VITE_GOOGLE_FACT_CHECK_API_KEY || process.env.GOOGLE_FACT_CHECK_API_KEY || '';
const SERVER_NEWS_API_KEY = process.env.VITE_NEWS_API_KEY || process.env.NEWS_API_KEY || '';

const ALLOWED_PARAMS = {
  factcheck: ['query', 'languageCode', 'pageSize'],
  newsapi: ['q', 'qInTitle', 'sources', 'domains', 'sortBy', 'pageSize', 'page', 'language', 'from', 'to', 'searchIn'],
  'google-news': ['q', 'hl', 'gl', 'ceid', 'when'],
  ddg: ['q', 'format', 'no_html', 'skip_disambig', 't', 'kl'],
  'bing-news': ['q', 'format', 'setlang', 'mkt', 'freshness', 'count', 'ccid']
};

const TARGETS = [
  {
    prefix: '/api/proxy/factcheck/',
    base: 'https://factchecktools.googleapis.com/',
    service: 'factcheck',
    keyParam: 'key',
    key: SERVER_FACT_CHECK_KEY
  },
  {
    prefix: '/api/proxy/newsapi/',
    base: 'https://newsapi.org/',
    service: 'newsapi',
    keyParam: 'apiKey',
    key: SERVER_NEWS_API_KEY
  },
  {
    prefix: '/api/proxy/google-news/',
    base: 'https://news.google.com/',
    service: 'google-news',
    keyParam: null,
    key: null
  },
  {
    prefix: '/api/proxy/ddg/',
    base: 'https://api.duckduckgo.com/',
    service: 'ddg',
    keyParam: null,
    key: null
  },
  {
    prefix: '/api/proxy/bing-news/',
    base: 'https://www.bing.com/news/search',
    service: 'bing-news',
    keyParam: null,
    key: null
  }
];

const cache = new Map();
const CACHE_TTL = { factcheck: 30 * 60 * 1000, newsapi: 15 * 60 * 1000, 'google-news': 10 * 60 * 1000, ddg: 6 * 60 * 60 * 1000, 'bing-news': 10 * 60 * 1000 };

function isConfigured() {
  return Boolean(SERVER_FACT_CHECK_KEY) || Boolean(SERVER_NEWS_API_KEY);
}

function findTarget(urlPath) {
  return TARGETS.find((t) => urlPath.startsWith(t.prefix)) || null;
}

function sanitizeRestPath(restPath) {
  if (restPath === undefined || restPath === null) return null;
  if (restPath.includes('..') || restPath.includes('://') || restPath.includes('@')) {
    return null;
  }
  if (/[\x00-\x1f\x7f]/.test(restPath)) return null;
  return restPath;
}

async function handleProxy(req, res) {
  const urlPath = req.path;
  const target = findTarget(urlPath);
  if (!target) {
    return res.status(404).json({ error: 'Unknown proxy target' });
  }

  const restPath = sanitizeRestPath(urlPath.slice(target.prefix.length));
  if (restPath === null) {
    return res.status(400).json({ error: 'Invalid proxy path' });
  }

  const upstream = new URL(restPath, target.base);

  const allowed = ALLOWED_PARAMS[target.service] || [];
  for (const [name, value] of Object.entries(req.query)) {
    if (allowed.includes(name) && typeof value === 'string' && value.length <= 2000) {
      upstream.searchParams.set(name, value);
    }
  }

  if (target.keyParam && target.key) {
    upstream.searchParams.set(target.keyParam, target.key);
  } else if (target.keyParam) {
    return res.status(503).json({ error: `Proxy chưa cấu hình key cho ${target.service}` });
  }

  const cacheKey = `${target.service}|${upstream.toString()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.set('X-Proxy-Cache', 'HIT');
    return res.status(cached.status).set(cached.headers).send(cached.body);
  }

  try {
    const upstreamResponse = await fetch(upstream.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LCS-Proxy/1.0',
        'Accept': target.service === 'google-news' || target.service === 'bing-news'
          ? 'application/rss+xml, application/xml, text/xml'
          : 'application/json, text/plain'
      },
      signal: AbortSignal.timeout(6000)
    });

    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';
    const bodyBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    const body = bodyBuffer.toString('utf8');

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': `max-age=${CACHE_TTL[target.service] / 1000}`,
      'X-Proxy-Service': target.service,
      'X-Proxy-Cache': 'MISS'
    };

    if (upstreamResponse.ok) {
      cache.set(cacheKey, {
        status: upstreamResponse.status,
        headers: { ...headers, 'X-Proxy-Cache': 'HIT' },
        body,
        expires: Date.now() + CACHE_TTL[target.service]
      });
    }

    res.status(upstreamResponse.status).set(headers).send(body);
  } catch (error) {
    console.error(`[API Proxy] Lỗi ${target.service}:`, error.message);
    res.status(502).json({ error: `Proxy ${target.service} thất bại` });
  }
}

module.exports = {
  handleProxy,
  isConfigured
};
