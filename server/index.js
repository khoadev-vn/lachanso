const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { searchVietnameseNews } = require('./services/searchEngine');
const { filterArticles } = require('./services/semanticFilter');
const keywordExtractor = require('./services/keywordExtractor');
const nliChecker = require('./services/nliChecker');
const ArticleComparator = require('./services/articleComparator');
const { isLLMConfigured, getLLMStatus } = require('./services/llmClient');
const cacheService = require('./services/cacheService');
const autoCrawlService = require('./services/autoCrawlService');

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
const parseOrigins = (val) =>
  String(val || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'https://la-chan-so.vercel.app',
  'https://lachansovn.vercel.app',
  'https://lachansovn-seven.vercel.app',
  ...parseOrigins(process.env.APP_ORIGIN)
]);

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
app.use('/api/verify-comprehensive', throttleAnalysis);
app.use('/api/verify-fast', throttleAnalysis);
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
    
    // Check cache first
    const cached = cacheService.get('link', url);
    if (cached) {
      console.log(`[Cache] HIT for ${url}`);
      return res.json({
        success: true,
        ...cached,
        cached: true,
        cacheTTL: cacheService.getTTL('link', url),
        executionTimeMs: Date.now() - startTime
      });
    }
    
    console.log(`[Cache] MISS for ${url}`);
    
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

    const responseData = {
      success: true,
      ...result,
      isGambling,
      executionTimeMs: Date.now() - startTime
    };
    
    // Cache result for 60 minutes
    cacheService.set('link', url, responseData, 60);
    
    res.json(responseData);
  } catch (error) {
    console.error('[API] Lỗi analyze-link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/analyze-text', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text input' });
  
  // Check cache first
  const cached = cacheService.get('text', text);
  if (cached) {
    console.log(`[Cache] HIT for text (${text.substring(0, 50)}...)`);
    return res.json({
      ...cached,
      cached: true,
      cacheTTL: cacheService.getTTL('text', text)
    });
  }
  
  console.log(`[Cache] MISS for text (${text.substring(0, 50)}...)`);
  
  const matches = threatDetection.analyzeTextByKeywords(text);
  const contactFindings = threatDetection.detectContactScam(text);
  const responseData = { matches: [...matches, ...contactFindings] };
  
  // Cache result for 30 minutes
  cacheService.set('text', text, responseData, 30);
  
  res.json(responseData);
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
const { verifyNewsComprehensive } = require('./services/newsVerificationEngine');

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

// ============ COMPREHENSIVE VERIFICATION ENDPOINT ============
app.post('/api/verify-comprehensive', async (req, res) => {
    try {
        const { text, url } = req.body;
        if (!text) return res.status(400).json({ error: 'Missing text input' });
        
        console.log(`\n[API] 🔍 Bắt đầu Comprehensive Verify: "${text.substring(0, 50)}..."`);
        const startTime = Date.now();
        
        // Run comprehensive verification with URL if provided
        const verification = await verifyNewsComprehensive(text, { url });
        
        // Also run existing systems for comparison
        let legacyScoring = null;
        try {
            legacyScoring = await scoringEngine.analyzeAndScore(text);
        } catch {}
        
        let factCheck = null;
        try {
            factCheck = await factCheckService.checkFact(text);
        } catch {}
        
        const responseData = {
            success: true,
            comprehensive: verification,
            legacy_scoring: legacyScoring,
            fact_check: factCheck,
            execution_time_ms: Date.now() - startTime
        };
        
        console.log(`[API] ✅ Comprehensive Verify completed in ${responseData.execution_time_ms}ms`);
        res.json(responseData);
    } catch (error) {
        console.error('[API] ❌ Lỗi Comprehensive Verify:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============ FAST VERIFY WITH ENHANCED TOOLS ============
app.post('/api/verify-fast', async (req, res) => {
    try {
        const { text, url } = req.body;
        if (!text) return res.status(400).json({ error: 'Missing text input' });
        
        const { extractClaims, detectSensationalism, checkSourceReliability } = require('./services/claimAnalyzer');
        const { detectVNFakePatterns, getTrustedSourceScore } = require('./services/vietnameseFactCheck');
        const { aggregateNews } = require('./services/newsAggregator');
        const { classifyContentType, calculateBlogScore, CONTENT_TYPES } = require('./services/blogVerifier');
        
        const startTime = Date.now();
        
        // Fast parallel analysis
        const [claims, sensationalism, vnPatterns, articles] = await Promise.all([
            Promise.resolve(extractClaims(text)),
            Promise.resolve(detectSensationalism(text)),
            Promise.resolve(detectVNFakePatterns(text)),
            aggregateNews(text, { maxResults: 10 }).catch(() => [])
        ]);
        
        // Classify content type
        const contentType = classifyContentType(text);
        
        // Calculate nuanced blog score
        const blogScore = calculateBlogScore(text, contentType, url);
        
        // Cross-reference with trusted sources
        const crossRefs = articles.map(a => {
            const domain = a.link ? new URL(a.link).hostname : '';
            const trusted = getTrustedSourceScore(domain);
            return { ...a, trust_score: trusted.score, is_trusted: trusted.trusted };
        });
        
        // Quick scoring
        let score = 50;
        if (sensationalism.level === 'high') score -= 20;
        else if (sensationalism.level === 'medium') score -= 10;
        
        const highSeverityPatterns = vnPatterns.filter(p => p.severity === 'high');
        if (highSeverityPatterns.length > 0) score -= 25;
        else if (vnPatterns.length > 0) score -= 10;
        
        const trustedCount = crossRefs.filter(r => r.is_trusted).length;
        if (trustedCount >= 3) score += 20;
        else if (trustedCount >= 1) score += 10;
        else score -= 10;
        
        score = Math.max(0, Math.min(100, score));
        
        // Add blog verification scoring (nuanced)
        if (blogScore.finalScore !== 50) {
            const blogDiff = blogScore.finalScore - 50;
            const trustWeight = blogScore.trustWeight || 1.0;
            score += Math.round(blogDiff * trustWeight * 0.4);
        }
        
        score = Math.max(0, Math.min(100, score));
        
        res.json({
            success: true,
            score,
            verdict: score >= 70 ? 'CÓ KHẢ NÀNG LÀ TIN THẬT' : score >= 45 ? 'CHƯA XÁC ĐỊNH' : 'CÓ THỂ LÀ TIN GIẢ',
            claims,
            sensationalism,
            vn_fake_patterns: vnPatterns,
            cross_references: crossRefs.slice(0, 5),
            articles_count: articles.length,
            blog_content_type: contentType.type.label,
            blog_content_type_id: contentType.type.id,
            blog_score: blogScore.finalScore,
            blog_trust_weight: blogScore.trustWeight,
            blog_adjustments: blogScore.adjustments,
            tools_used: ['claimAnalyzer', 'vietnameseFactCheck', 'newsAggregator', 'blogVerifier'],
            execution_time_ms: Date.now() - startTime
        });
    } catch (error) {
        console.error('[API] Lỗi Fast Verify:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cache stats endpoint
app.get('/api/cache/stats', (req, res) => {
  res.json(cacheService.getStats());
});

// Clear cache endpoint (admin only)
app.post('/api/cache/clear', (req, res) => {
  cacheService.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// ============ 6-LAYER PIPELINE VERIFICATION ============
const { verifyContent: layerVerify } = require('./layers/pipeline');

app.post('/api/v2/verify', async (req, res) => {
    try {
        const { text, url } = req.body;
        if (!text) return res.status(400).json({ error: 'Missing text input' });
        
        console.log(`\n[API-v2] 🔄 Layered Pipeline Verify: "${text.substring(0, 50)}..."`);
        const startTime = Date.now();
        
        const result = await layerVerify(text, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            skipLLM: false,
            llmOverrides: {}
        });
        
        // Frontend-compatible wrapper
        const responseData = {
            success: true,
            trustScore: result.score,
            verdict: result.verdict,
            verdictLabel: result.verdictLabel,
            confidence: result.confidence,
            educational: result.educational,
            newsSearch: result.newsSearch,
            trustedVerification: result.trustedVerification,
            contextAnalysis: result.contextAnalysis,
            factVerification: result.factVerification,
            cascade: result.cascade,
            explanations: result.explanations,
            execution_time_ms: Date.now() - startTime,
            pipeline: 'layered-v2'
        };
        
        console.log(`[API-v2] ✅ Score=${result.score} Verdict=${result.verdict} (${responseData.execution_time_ms}ms)`);
        res.json(responseData);
    } catch (error) {
        console.error('[API-v2] ❌ Error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============ v2.0 RISK ENGINE — WEB/URL VERIFICATION (8 tiêu chí Zero-Trust) ============
const { verifyWebsite: verifyWebsiteV2 } = require('./services/riskEngineV2');

function webVerifyCacheKey(url) {
    return String(url).toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function buildWebVerifyResponse(result, startTime) {
    return {
        success: true,
        ...result,
        ownerVerifyEmail: process.env.PROCESS_VERIFY_EMAIL || 'kanh05113@gmail.com',
        execution_time_ms: Date.now() - startTime
    };
}

// ============ ASYNC JOB STORE — web-verify chạy nền, tránh timeout Vercel ============
// Client POST /api/v2/web-verify/async -> nhận jobId ngay (~100ms)
// Client poll GET /api/v2/web-verify/status?jobId=... mỗi 1.5s -> nhận kết quả khi xong
const webVerifyJobs = new Map(); // jobId -> { status, result, url, createdAt }
let webVerifySeq = 0;

function normalizeWebUrl(input) {
    let s = String(input || '').trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try { return new URL(s).toString(); } catch { return null; }
}

function runWebVerifyJob(jobId, url) {
    const startTime = Date.now();
    verifyWebsiteV2(url).then((result) => {
        const responseData = buildWebVerifyResponse(result, startTime);
        const cacheKey = webVerifyCacheKey(url);
        cacheService.set('web-verify', cacheKey, responseData, 10);
        const job = webVerifyJobs.get(jobId);
        if (job) {
            job.status = 'done';
            job.result = responseData;
            job.doneAt = Date.now();
        }
        console.log(`[API-v2][web:async] ✅ job=${jobId} state=${result.state} R=${result.R} C=${result.C} (${responseData.execution_time_ms}ms)`);
    }).catch((error) => {
        console.error(`[API-v2][web:async] ❌ job=${jobId} error:`, error.message);
        const job = webVerifyJobs.get(jobId);
        if (job) { job.status = 'error'; job.error = error.message; }
    });
}

app.post('/api/v2/web-verify/async', (req, res) => {
    try {
        const { url } = req.body;
        const normalized = normalizeWebUrl(url);
        if (!normalized) return res.status(400).json({ error: 'Missing or invalid url input' });

        // Trả ngay kết quả cache nếu có (lần check sau ~0ms)
        const cacheKey = webVerifyCacheKey(normalized);
        const cached = cacheService.get('web-verify', cacheKey);
        if (cached) {
            console.log(`[API-v2][web:async] ⚡ Cache hit: ${cacheKey}`);
            return res.json({ success: true, jobId: null, status: 'done', result: { ...cached, cached: true, cacheHit: true } });
        }

        const jobId = `wv_${Date.now().toString(36)}_${(webVerifySeq++).toString(36)}`;
        webVerifyJobs.set(jobId, { status: 'running', url: normalized, createdAt: Date.now() });

        // Dọn job quá cũ (> 10 phút)
        for (const [id, j] of webVerifyJobs) {
            if (Date.now() - j.createdAt > 10 * 60 * 1000) webVerifyJobs.delete(id);
        }

        // Chạy nền, KHÔNG await → response trả ngay
        runWebVerifyJob(jobId, normalized);
        console.log(`[API-v2][web:async] 🚀 job=${jobId} queued: "${normalized}"`);
        return res.json({ success: true, jobId, status: 'running', cached: false });
    } catch (error) {
        console.error('[API-v2][web:async] ❌ Error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/v2/web-verify/status', (req, res) => {
    try {
        const jobId = String(req.query.jobId || '');
        const job = webVerifyJobs.get(jobId);
        if (!job) return res.status(404).json({ success: false, status: 'not_found', error: 'Job không tồn tại' });
        if (job.status === 'done') return res.json({ success: true, jobId, status: 'done', result: job.result });
        if (job.status === 'error') return res.json({ success: false, jobId, status: 'error', error: job.error || 'Job failed' });
        return res.json({ success: true, jobId, status: 'running' });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Endpoint đồng bộ (giữ lại cho tương thích / test trực tiếp)
app.post('/api/v2/web-verify', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'Missing url input' });

        console.log(`\n[API-v2][web] 🔍 Zero-Trust Web Verify: "${String(url).substring(0, 50)}..."`);
        const startTime = Date.now();

        // Cache kết quả theo URL gốc (10 phút) — lần check sau gần như tức thì,
        // tránh tình trạng backend chậm hơn giới hạn timeout của Vercel proxy.
        const cacheKey = webVerifyCacheKey(url);
        const cached = cacheService.get('web-verify', cacheKey);
        if (cached) {
            console.log(`[API-v2][web] ⚡ Cache hit: ${cacheKey} (${Date.now() - startTime}ms)`);
            return res.json({ ...cached, cached: true, cacheHit: true });
        }

        const result = await verifyWebsiteV2(url);

        const responseData = buildWebVerifyResponse(result, startTime);

        cacheService.set('web-verify', cacheKey, responseData, 10);

        console.log(`[API-v2][web] ✅ state=${result.state} R=${result.R} C=${result.C} (${responseData.execution_time_ms}ms)`);
        res.json(responseData);
    } catch (error) {
        console.error('[API-v2][web] ❌ Error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============ REPORT / COMPLAINT ROUTES ============
const reportRoutes = require('./routes/reportRoutes');
app.use('/api/v2', reportRoutes);

// ============ ADMIN — QUẢN LÝ DOMAIN ĐÃ XÁC MINH (thêm/gỡ trusted) ============
// Được gọi TRỰC TIẾP lên VPS (kèm header x-lcs-admin-secret), không qua Vercel proxy.
const verifiedDomains = require('./services/verifiedDomains');

app.get('/api/v2/admin/trusted', (req, res) => {
  const secret = process.env.LCS_ADMIN_SECRET;
  if (secret && req.get('x-lcs-admin-secret') !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return res.json({ success: true, list: verifiedDomains.list() });
});

app.post('/api/v2/admin/trusted', (req, res) => {
  const secret = process.env.LCS_ADMIN_SECRET;
  if (secret && req.get('x-lcs-admin-secret') !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { action } = req.body || {};
  try {
    if (action === 'remove') {
      const r = verifiedDomains.remove(req.body?.domain);
      console.log(`[Admin] Gỡ domain trusted: ${req.body?.domain} (removed:${r.removed})`);
      return res.json({ success: true, ...r });
    }
    const r = verifiedDomains.add(req.body || {});
    if (!r.ok) return res.status(400).json(r);
    console.log(`[Admin] Thêm domain trusted: ${r.entry.domain} (score ${r.entry.trustScore})`);
    return res.json({ success: true, ...r });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ============ AUTO-CRAWL ENDPOINTS ============
app.get('/api/crawl/stats', (req, res) => {
  res.json(autoCrawlService.getStats());
});

app.post('/api/crawl/trigger', async (req, res) => {
  try {
    await autoCrawlService.crawlAll();
    res.json({ success: true, message: 'Crawl triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Crawl failed' });
  }
});

// Get scam domains list
app.get('/api/scam-domains', (req, res) => {
  try {
    const fs = require('fs');
    const dataPath = require('path').join(__dirname, 'data/scamDomains.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data.scamDomains || []);
  } catch (error) {
    res.json([]);
  }
});

// Get fake news list
app.get('/api/fake-news', (req, res) => {
  try {
    const fs = require('fs');
    const dataPath = require('path').join(__dirname, 'data/fakeNews.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data.fakeNews || []);
  } catch (error) {
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại port ${PORT}`);
  console.log(`✅ Mô hình phân tích ngôn ngữ đã sẵn sàng`);
  console.log(`🔗 Endpoint xác thực: POST http://localhost:${PORT}/api/verify-news`);
  console.log(`🔗 Endpoint full-scan: POST http://localhost:${PORT}/api/full-scan`);
  console.log(`🔗 Endpoint comprehensive: POST http://localhost:${PORT}/api/verify-comprehensive`);
  console.log(`🔗 Endpoint fast-verify: POST http://localhost:${PORT}/api/verify-fast`);
  console.log(`🔗 Endpoint NLI: POST http://localhost:${PORT}/api/verify-nli`);
  console.log(`🔗 Endpoint Fact Check: POST http://localhost:${PORT}/api/fact-check`);
  console.log(`🔗 Cache Stats: GET http://localhost:${PORT}/api/cache/stats`);
  console.log(`🔗 Crawl Stats: GET http://localhost:${PORT}/api/crawl/stats`);
  
  // Start auto-crawl service (every 6 hours)
  autoCrawlService.start(6);

  const { llmChat } = require('./services/llmClient');
  // Warmup: chỉ nạp provider nhanh (Groq/Gemini/Ollama), KHÔNG qua OpenRouter
  // (OpenRouter có token/reasoning phức tạp, warmup sẽ gây lỗi JSON parse ở log)
  llmChat([
    { role: 'system', content: 'Trả về JSON duy nhất.' },
    { role: 'user', content: 'Warmup: {"ok":true}' }
  ], { jsonMode: true, maxTokens: 8, timeout: 60000, preferFastProvider: true }).then(() => {
    console.log('🔥 Model LLM đã warm (sẵn sàng phản hồi nhanh).');
  }).catch((e) => {
    console.warn('⚠️ Warmup LLM thất bại (sẽ tự nạp khi có yêu cầu):', e.message);
  });
});
