/**
 * Lá Chắn Số — Layered Verification Pipeline v2.0
 * Orchestrates all 6 layers into a unified verification flow
 */

// Layer 1: Input Processing
const { processInput } = require('./layer1-input/inputProcessor');
const { checkRateLimit, detectBotFingerprint } = require('./layer1-input/botDetection');

// Layer 2: Signal Detection
const { scanText } = require('./layer2-signals/keywordScanner');
const { detectPatterns } = require('./layer2-signals/patternDetector');
const { detectEducationalContent } = require('./layer2-signals/educationalDetector');

// Layer 3: External Verification
const { searchAllSources } = require('./layer3-verification/newsSearcher');
const { crossReferenceWithTrustedSources, checkGovWarnings } = require('./layer3-verification/trustedSourceVerifier');

// Layer 4: AI Analysis
const { analyzeContext } = require('./layer4-ai/contextAnalyzer');
const { verifyFact } = require('./layer4-ai/factVerifier');

// Layer 5: Scoring & Verdict
const { calculateScore } = require('./layer5-verdict/scoringOrchestrator');

// Layer 6: Learning
const { shouldReview, queueForReview } = require('./layer6-learning/activeLearner');
const { checkThreatDB, addThreatPattern } = require('./layer6-learning/threatFeeder');

async function verifyContent(input, options = {}) {
  const startTime = Date.now();
  const { url, ip, skipLLM = false } = options;
  
  const pipeline = {
    input: null,
    keywordScan: null,
    patterns: null,
    educational: null,
    newsSearch: null,
    trustedVerification: null,
    contextAnalysis: null,
    factVerification: null,
    scoring: null,
    reviewId: null,
    executionTimeMs: 0
  };
  
  try {
    // ═══════════════════════════════════════════
    // LAYER 1: Input Processing & Fast Shield
    // ═══════════════════════════════════════════
    console.log('[Pipeline] Layer 1: Input Processing...');
    pipeline.input = await processInput(input, { url });
    
    // Rate limiting
    if (ip) {
      const rateLimit = await checkRateLimit(ip);
      if (!rateLimit.allowed) {
        return { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter };
      }
    }
    
    // Bot detection (only for real HTTP requests)
    if (ip) {
      const botCheck = detectBotFingerprint({}, input);
      if (botCheck.isBot) {
        return { error: 'Bot detected', signals: botCheck.signals };
      }
    }
    
    // Check threat database
    const threatCheck = checkThreatDB(input);
    if (threatCheck.hasMatch && threatCheck.highestSeverity === 'high') {
      return {
        score: 100,
        verdict: 'FRAUD_CONFIRMED',
        verdictLabel: 'Tin giả/Lừa đảo',
        confidence: { confidence: 0.9, level: 'high' },
        threatMatch: threatCheck.matches[0],
        executionTimeMs: Date.now() - startTime
      };
    }
    
    // ═══════════════════════════════════════════
    // LAYER 2: Signal Detection
    // ═══════════════════════════════════════════
    console.log('[Pipeline] Layer 2: Signal Detection...');
    pipeline.keywordScan = scanText(input);
    pipeline.patterns = detectPatterns(input);
    pipeline.educational = detectEducationalContent(input, pipeline.input.urls.map(u => u.url));
    
    // Short-circuit: If educational content, skip expensive layers
    if (pipeline.educational.isEducational && pipeline.educational.confidence > 0.6) {
      console.log('[Pipeline] Educational content detected — using fast path');
      const fastScore = calculateScore({
        keywordScan: pipeline.keywordScan,
        patterns: pipeline.patterns,
        educational: pipeline.educational,
        trustedVerification: { trustedCount: 0, totalCount: 0 }
      });
      
      return {
        ...fastScore,
        pipeline: 'educational-fast',
        executionTimeMs: Date.now() - startTime
      };
    }
    
    // ═══════════════════════════════════════════
    // LAYER 3: External Verification
    // ═══════════════════════════════════════════
    console.log('[Pipeline] Layer 3: External Verification...');
    
    // Parallel searches
    const [newsResult, trustedResult, govResult] = await Promise.allSettled([
      searchAllSources(pipeline.input.normalizedText.substring(0, 150)),
      crossReferenceWithTrustedSources(pipeline.input.normalizedText),
      checkGovWarnings(pipeline.input.normalizedText.substring(0, 100))
    ]);
    
    pipeline.newsSearch = newsResult.status === 'fulfilled' ? newsResult.value : { articles: [] };
    pipeline.trustedVerification = trustedResult.status === 'fulfilled' ? trustedResult.value : { trustedCount: 0, totalCount: 0 };
    pipeline.trustedVerification.hasWarning = govResult.status === 'fulfilled' ? govResult.value.hasWarning : false;
    
    // ═══════════════════════════════════════════
    // LAYER 4: AI Analysis (skip if requested)
    // ═══════════════════════════════════════════
    if (!skipLLM) {
      console.log('[Pipeline] Layer 4: AI Analysis...');
      
      const [contextResult, factResult] = await Promise.allSettled([
        analyzeContext(input),
        verifyFact(input, pipeline.newsSearch.articles)
      ]);
      
      pipeline.contextAnalysis = contextResult.status === 'fulfilled' ? contextResult.value : null;
      pipeline.factVerification = factResult.status === 'fulfilled' ? factResult.value : null;
    }
    
    // ═══════════════════════════════════════════
    // LAYER 5: Scoring & Verdict
    // ═══════════════════════════════════════════
    console.log('[Pipeline] Layer 5: Scoring...');
    pipeline.scoring = calculateScore({
      keywordScan: pipeline.keywordScan,
      patterns: pipeline.patterns,
      educational: pipeline.educational,
      newsSearch: pipeline.newsSearch,
      trustedVerification: pipeline.trustedVerification,
      contextAnalysis: pipeline.contextAnalysis,
      factVerification: pipeline.factVerification,
      linkAnalysis: pipeline.input.linkAnalysis
    });
    
    // ═══════════════════════════════════════════
    // LAYER 6: Learning
    // ═══════════════════════════════════════════
    if (shouldReview(
      { keywordScan: pipeline.keywordScan, trustedVerification: pipeline.trustedVerification, patterns: pipeline.patterns },
      { score: pipeline.scoring.score, confidence: pipeline.scoring.confidence }
    )) {
      pipeline.reviewId = await queueForReview(
        { originalText: input, normalizedText: input },
        { score: pipeline.scoring.score, verdict: pipeline.scoring.verdict, confidence: pipeline.scoring.confidence },
        'auto-queued'
      );
    }
    
    pipeline.executionTimeMs = Date.now() - startTime;
    console.log(`[Pipeline] Completed in ${pipeline.executionTimeMs}ms — Score: ${pipeline.scoring.score}, Verdict: ${pipeline.scoring.verdict}`);
    
    return {
      score: pipeline.scoring.score,
      verdict: pipeline.scoring.verdict,
      verdictLabel: pipeline.scoring.verdictLabel,
      confidence: pipeline.scoring.confidence,
      explanations: pipeline.scoring.explanations,
      cascade: pipeline.scoring.cascade,
      educational: pipeline.educational,
      contextAnalysis: pipeline.contextAnalysis,
      factVerification: pipeline.factVerification,
      newsSearch: { articles: pipeline.newsSearch.articles?.length || 0, sources: pipeline.newsSearch.sources },
      trustedVerification: pipeline.trustedVerification,
      reviewId: pipeline.reviewId,
      pipeline: 'layered-v2',
      executionTimeMs: pipeline.executionTimeMs
    };
    
  } catch (error) {
    console.error('[Pipeline] Error:', error.message);
    return {
      score: 50,
      verdict: 'ERROR',
      verdictLabel: 'Lỗi xử lý',
      confidence: { confidence: 0.1, level: 'low' },
      error: error.message,
      executionTimeMs: Date.now() - startTime
    };
  }
}

module.exports = { verifyContent };
