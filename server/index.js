const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { searchVietnameseNews } = require('./services/searchEngine');
const { filterArticles } = require('./services/semanticFilter');
const keywordExtractor = require('./services/keywordExtractor');
const nliChecker = require('./services/nliChecker');
const ArticleComparator = require('./services/articleComparator');
const { isLLMConfigured, getLLMStatus } = require('./services/llmClient');

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Tin cậy proxy trung gian (Vercel / Nginx) để req.ip đúng IP thật ----
app.set('trust proxy', true);

// ---- Secret gate: backend CHỈ chấp nhận yêu cầu có header x-lcs-backend-secret đúng ----
// Vercel proxy function sẽ chèn header này. Nếu chưa set LCS_BACKEND_SECRET (bản dev local)
// thì mở cho toàn bộ (chỉ nên dùng khi chạy local).
const BACKEND_SECRET = process.env.LCS_BACKEND_SECRET || '';
const secretGate = (req, res, next) => {
  if (!BACKEND_SECRET) return next();
  const received = req.get('x-lcs-backend-secret');
  if (received !== BACKEND_SECRET) {
    return res.status(403).json({ error: 'Forbidden: backend access denied' });
  }
  next();
};

// ---- CORS: chỉ cho phép frontend dev/prod, không mở bừa ----
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'https://la-chan-so.vercel.app',
  'https://lachansovn.vercel.app',
  process.env.APP_ORIGIN
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'x-lcs-backend-secret']
}));

app.use(express.json({ limit: '2mb' }));

// ---- Security headers ----
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ---- Rate limiter nhẹ (in-memory) để chống spam API ----
const rateLimitBuckets = new Map();
function rateLimiter(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);
    if (bucket.count > maxRequests) {
      return res.status(429).json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.' });
    }
    next();
  };
}
const throttleAnalysis = rateLimiter(20, 60 * 1000);
const throttleGeneral = rateLimiter(60, 60 * 1000);

// Secret gate áp cho toàn bộ /api/* (trừ khi chạy local không có LCS_BACKEND_SECRET)
app.use('/api', secretGate);
app.use('/api/full-scan', throttleAnalysis);
app.use('/api/verify-news', throttleAnalysis);
app.use('/api/verify-news/ai', throttleAnalysis);
app.use('/api/analyze-link', throttleAnalysis);
app.use('/api/analyze-text', throttleGeneral);
app.use('/api/fact-check', throttleGeneral);
app.use('/api/check-domain', throttleGeneral);
app.use('/api/verify-nli', throttleGeneral);


app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

app.get('/api/ai/status', async (req, res) => {
  try {
    const status = await getLLMStatus();
    res.json({ status: 'OK', data: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const vectorCache = require('./services/vectorCache');
app.get('/api/cached-news', (req, res) => {
  try {
    const items = vectorCache.getAllCachedItems();
    res.json({ status: 'OK', data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});






app.post('/api/verify-news', async (req, res) => {
  try {
    const { text, query } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text input' });
    }

    console.log(`\n[API] Bắt đầu xử lý văn bản: "${text.substring(0, 50)}..."`);
    const startTime = Date.now();


    const KeywordExtractor = require('./services/keywordExtractor');
    const extracted = await KeywordExtractor.extractKeywords(text);

    console.log(`[ML Extractor] Tìm thấy ${extracted.searchKeywords.length} keywords:`, extracted.searchKeywords);


    const QueryGenerator = require('./services/queryGenerator');
    let searchQuery = (query && String(query).trim().length >= 5) ? String(query).trim() : null;

    if (searchQuery) {
      console.log(`[Fast Query] Dùng query frontend: "${searchQuery}"`);
    } else {
      searchQuery = await QueryGenerator.generateWithHeuristic(text);
      if (searchQuery) {
        console.log(`[Fast Query] Tóm tắt heuristic: "${searchQuery}"`);
      } else {
        console.log(`[Fast Query] Fallback NER.`);
        if (extracted.searchKeywords.length > 0) {

          searchQuery = extracted.searchKeywords.join(' ');
        }
      }
    }

    if (!searchQuery) {
      searchQuery = text.substring(0, 100);
    }

    console.log(`[API] Truy vấn tìm kiếm (Search Query): ${searchQuery}`);


    const articles = await searchVietnameseNews(searchQuery);

    if (!articles || articles.length === 0) {
      return res.json({
        success: true,
        totalFound: 0,
        extractedEntities: extracted.searchKeywords,
        filteredArticles: [],
        message: 'Không tìm thấy bài báo nào.'
      });
    }

    console.log(`[API] Tìm thấy ${articles.length} bài báo. Tiến hành lọc ngữ cảnh...`);


    const filteredArticles = await filterArticles(text, articles, 0.15);
    const compareSet = filteredArticles.slice(0, 5);

    let comparison = null;
    try {
      comparison = await ArticleComparator.compare(text, compareSet);
    } catch (compareError) {
      console.error('[API] Lỗi AI so sánh trong fast path:', compareError.message);
      comparison = null;
    }

    console.log(`[API] Đã lọc còn ${filteredArticles.length} bài báo liên quan, AI đối chiếu ${compareSet.length} bài nổi bật. (AI đối chiếu: ${comparison ? comparison.mode : 'lỗi'})`);

    const executionTime = Date.now() - startTime;
    console.log(`[API] Fast-path hoàn thành trong ${executionTime}ms.`);

    const outArticles = comparison && comparison.articles
      ? comparison.articles
      : compareSet.map((a) => ({ ...a, stance: 'neutral' }));

    return res.json({
      success: true,
      totalFound: articles.length,
      extractedEntities: extracted.searchKeywords,
      filteredArticles: outArticles,
      aiComparison: comparison ? {
        enabled: true,
        mode: comparison.mode,
        summary: comparison.summary
      } : {
        enabled: false,
        mode: 'fast',
        summary: null,
        note: 'AI đối chiếu thất bại trong fast path.'
      },
      executionTimeMs: executionTime
    });

  } catch (error) {
    console.error('[API] Lỗi server:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const crypto = require('crypto');
const aiCompareCache = new Map();
const AI_CACHE_TTL = 6 * 60 * 60 * 1000;

app.post('/api/verify-news/ai', async (req, res) => {
  try {
    const { text, query } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text input' });
    }

    const cacheKey = crypto.createHash('sha1').update(text).digest('hex');
    const cached = aiCompareCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return res.json({ success: true, cached: true, ...cached.data });
    }

    const startTime = Date.now();

    const KeywordExtractor = require('./services/keywordExtractor');
    const extracted = await KeywordExtractor.extractKeywords(text);

    const QueryGenerator = require('./services/queryGenerator');
    let searchQuery = await QueryGenerator.generateSearchQuery(text);
    if (!searchQuery && extracted.searchKeywords.length > 0) {
      searchQuery = extracted.searchKeywords.join(' ');
    }
    if (!searchQuery) {
      searchQuery = text.substring(0, 100);
    }

    const articles = await searchVietnameseNews(searchQuery);
    if (!articles || articles.length === 0) {
      return res.json({
        success: true,
        mode: 'none',
        summary: null,
        filteredArticles: [],
        extractedEntities: extracted.searchKeywords
      });
    }

    const filteredArticles = await filterArticles(text, articles, 0.15);
    const compareSet = filteredArticles.slice(0, 5);
    const comparison = await ArticleComparator.compare(text, compareSet);

    const data = {
      mode: comparison.mode,
      summary: comparison.summary,
      filteredArticles: comparison.articles,
      extractedEntities: extracted.searchKeywords,
      executionTimeMs: Date.now() - startTime
    };

    aiCompareCache.set(cacheKey, { data, expires: Date.now() + AI_CACHE_TTL });
    console.log(`[AI Compare] ${comparison.mode} trong ${data.executionTimeMs}ms, ${filteredArticles.length} bài.`);

    return res.json({ success: true, cached: false, ...data });
  } catch (error) {
    console.error('[API] Lỗi AI compare:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/verify-nli', async (req, res) => {
  try {
    const { premise, hypothesis } = req.body;
    if (!premise || !hypothesis) {
      return res.status(400).json({ error: 'Thiếu premise hoặc hypothesis' });
    }

    const result = await nliChecker.check(premise, hypothesis);
    if (!result) {
      return res.status(500).json({ error: 'NLI Analysis failed' });
    }

    return res.json({
      success: true,
      entailment: result.entailment,
      contradiction: result.contradiction,
      neutral: result.neutral
    });
  } catch (error) {
    console.error('[API] Lỗi NLI:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const threatDetection = require('./services/threatDetection');
const linkAnalysis = require('./services/linkAnalysis');
const apiProxy = require('./services/apiProxy');

// Proxy API giữ key server-side (không lộ key trong bundle client)
app.get('/api/proxy/*path', throttleGeneral, (req, res) => {
  apiProxy.handleProxy(req, res);
});

app.post('/api/check-domain', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url input' });
  const isGambling = threatDetection.isGamblingDomainInput(url);
  res.json({ isGambling });
});

app.post('/api/analyze-link', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing url input' });

    const startTime = Date.now();
    const isGambling = threatDetection.isGamblingDomainInput(url);
    const result = await linkAnalysis.analyzeLink(url);

    if (isGambling && !result.reasons.some((r) => r.id === 'LINK_GAMBLING')) {
      result.reasons.unshift({
        id: 'LINK_GAMBLING',
        name: 'CỜ BẠC / CÁ CƯỢC LỪA ĐẢO',
        detail: 'Tên miền nằm trong danh sách đen cờ bạc lừa đảo của Lá Chắn Số.',
        status: 'danger',
        scoreDelta: -80
      });
      result.score = Math.max(0, result.score - 80);
    }

    res.json({
      success: true,
      ...result,
      isGambling,
      executionTimeMs: Date.now() - startTime
    });
  } catch (error) {
    console.error('[API] Lỗi analyze-link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/analyze-text', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text input' });
  const matches = threatDetection.analyzeTextByKeywords(text);
  const contactFindings = threatDetection.detectContactScam(text);
  res.json({ matches: [...matches, ...contactFindings] });
});

const factCheckService = require('./services/factCheckService');

app.post('/api/fact-check', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Missing text input' });
        
        const result = await factCheckService.checkFact(text);
        res.json(result);
    } catch (error) {
        console.error('[API] Lỗi FactCheck:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const scoringEngine = require('./services/scoringEngine');

app.post('/api/full-scan', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Missing text input' });
        
        console.log(`\n[API] Bắt đầu Full Scan: "${text.substring(0, 50)}..."`);
        const result = await scoringEngine.analyzeAndScore(text);
        
        res.json(result);
    } catch (error) {
        console.error('[API] Lỗi Full Scan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại port ${PORT}`);
  console.log(`✅ Mô hình phân tích ngôn ngữ đã sẵn sàng`);
  console.log(`🔗 Endpoint xác thực: POST http://localhost:${PORT}/api/verify-news`);
  console.log(`🔗 Endpoint full-scan: POST http://localhost:${PORT}/api/full-scan`);
  console.log(`🔗 Endpoint NLI: POST http://localhost:${PORT}/api/verify-nli`);
  console.log(`🔗 Endpoint Fact Check: POST http://localhost:${PORT}/api/fact-check`);

  const { llmChat } = require('./services/llmClient');
  llmChat([
    { role: 'system', content: 'Trả về JSON duy nhất.' },
    { role: 'user', content: 'Warmup: {"ok":true}' }
  ], { jsonMode: true, maxTokens: 8, timeout: 60000 }).then(() => {
    console.log('🔥 Model LLM đã warm (sẵn sàng phản hồi nhanh).');
  }).catch((e) => {
    console.warn('⚠️ Warmup LLM thất bại (sẽ tự nạp khi có yêu cầu):', e.message);
  });
});
