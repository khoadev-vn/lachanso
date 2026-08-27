// Prerender service — render SPA thành HTML tĩnh cho bot (Googlebot/bingbot/GPTBot/ClaudeBot...)
// Dùng Chromium headless để execute JS rồi lấy DOM hoàn chỉnh. Cache kết quả theo TTL.
const fs = require('fs');
const path = require('path');

const PRERENDER_ROUTES = ['/', '/kiem-tra', '/huong-dan', '/de-doa', '/blog', '/dieu-khoan', '/chinh-sach', '/tai-nguyen', '/dong-hanh', '/su-menh'];
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 giờ
const CACHE_DIR = path.join(__dirname, '..', 'data', 'prerender');

const memoryCache = new Map(); // route -> { html, expiresAt }
let browserPromise = null;

function isBotUA(ua) {
  const u = String(ua || '').toLowerCase();
  const botPatterns = [
    'googlebot', 'bingbot', 'gptbot', 'claudebot', 'anthropic-ai', 'ccbot',
    'bytespider', 'facebookexternalhit', 'twitterbot', 'slurp', 'duckduckbot',
    'applebot', 'semrushbot', 'ahrefsbot', 'yandexbot', 'baiduspider',
    'petalbot', 'amazonbot', 'meta-externalagent', 'google-extended',
    'chatgpt-user', 'perplexitybot', 'dotbot', 'archive.org_bot', 'ia_archiver'
  ];
  return botPatterns.some((p) => u.includes(p));
}

async function getBrowser() {
  if (browserPromise) return browserPromise;
  const puppeteer = require('puppeteer');
  browserPromise = puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote'
    ]
  }).catch((e) => {
    browserPromise = null;
    throw e;
  });
  return browserPromise;
}

function cacheKey(route) {
  return route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '__');
}

function readFromDisk(key) {
  try {
    const file = path.join(CACHE_DIR, `${key}.html`);
    if (!fs.existsSync(file)) return null;
    const stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function writeToDisk(key, html) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.html`), html, 'utf8');
  } catch (e) {
    console.warn(`[prerender] disk cache write failed (${key}):`, e.message);
  }
}

async function renderRoute(route) {
  const key = cacheKey(route);
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.html;

  const fromDisk = readFromDisk(key);
  if (fromDisk) {
    memoryCache.set(key, { html: fromDisk, expiresAt: Date.now() + CACHE_TTL_MS });
    return fromDisk;
  }

  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://lachansovn.com';
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (compatible; PrerenderBot/1.0; +https://lachansovn.com)');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}${route === '/' ? '' : route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    // Chờ thêm để React hoàn tất hydrate & hiện đầy đủ nội dung
    await new Promise((r) => setTimeout(r, 2500));
    const html = await page.content();
    memoryCache.set(key, { html, expiresAt: Date.now() + CACHE_TTL_MS });
    writeToDisk(key, html);
    return html;
  } finally {
    await page.close();
  }
}

async function prerenderMiddleware(req, res, next) {
  try {
    // Chỉ xử lý bot & chỉ GET, không chạm /api/*
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    const ua = req.get('user-agent') || '';
    // Tránh tự-render (vòng lặp vô hạn) nếu request nội bộ từ chính Chromium
    if (ua.includes('PrerenderBot')) return next();
    if (!isBotUA(ua)) return next();

    const route = req.path || '/';
    // Chỉ prerender các route chính; phần còn lại (vd /blog/<slug>) để Google render JS bình thường
    const matchedRoute = PRERENDER_ROUTES.includes(route)
      ? route
      : (route.startsWith('/blog/') ? '/blog' : null);

    if (!matchedRoute) {
      // Bot vào path không nằm trong danh sách prerender → trả index.html shell (SPA fallback)
      const distIndex = process.env.PUBLIC_DIR || '/opt/lachanso/dist/index.html';
      try {
        const shell = fs.readFileSync(distIndex, 'utf8');
        return res.status(200).type('html').set('Cache-Control', 'public, max-age=600').send(shell);
      } catch {
        return next();
      }
    }

    console.log(`[prerender] ${route} cho bot: ${ua.slice(0, 40)}`);
    const html = await renderRoute(matchedRoute);
    return res
      .status(200)
      .type('html')
      .set('Cache-Control', 'public, max-age=600')
      .send(html);
  } catch (e) {
    console.error('[prerender] error:', e.message);
    return next();
  }
}

module.exports = { prerenderMiddleware, isBotUA, PRERENDER_ROUTES };