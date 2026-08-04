const factCheckService = require('./factCheckService');
const threatDetection = require('./threatDetection');
const keywordExtractor = require('./keywordExtractor');
const searchEngine = require('./searchEngine');
const semanticFilter = require('./semanticFilter');
const nliChecker = require('./nliChecker');
const vectorCache = require('./vectorCache');

// Domain impersonation detection patterns
const DOMAIN_IMPERSONATION_PATTERNS = [
  /(facebook|google|microsoft|apple|instagram|zalo|viettel|vinaphone|mobifone)\.(com\.)?(xy|xyz|club|top|icu|buzz|info|site|online|click|link|live|cam)/i,
  /https?:\/\/[^\s]*(login|dang-nhap|signin|verify|xac-nhan)[^\s]*\.(xy|xyz|club|top|icu|buzz)/i
];

// Phishing link detection patterns
const PHISHING_LINK_PATTERNS = [
  /truy cập.{0,60}(đăng nhập|đăng ký|xác nhận|cập nhật).{0,80}(https?:\/\/|www\.|\.com|\.net|\.xyz|\.club|\.top|\.icu|\.buzz)/i,
  /tài khoản.{0,40}(bị truy cập|bị xâm nhập|bị hack|bị chiếm đoạt|bị khóa|bị chặn)/i,
  /(vui lòng|nhắc nhở|hãy|ngay|hỏa tốc).{0,40}(truy cập|đăng nhập|đăng ký|xác nhận|cập nhật).{0,40}(ngay|lập tức|nhanh chóng|trong vòng|sớm nhất)/i
];

// Weight configuration for different signal types
const WEIGHTS = {
  // Keyword-based penalties (already computed as totalWeight)
  keywordBase: { k: 0.0183, maxScore: 100 },

  // NLI signal weights
  nli: {
    contradictionHigh: 0.70,    // threshold for "contradicts"
    entailmentHigh: 0.70,       // threshold for "supports"
    contradictionWeight: 1.0,   // max risk modifier
    entailmentWeight: 0.1,      // strong support = reduce risk to 10%
    neutralPressWeight: 0.25,   // neutral + press match = reduce to 25%
    neutralNoPressWeight: 1.0   // neutral + no press = no change
  },

  // Verdict thresholds
  verdicts: {
    FRAUD_CONFIRMED: 80,
    HIGH_RISK: 60,
    SUSPICIOUS: 35
  },

  // Multi-signal cascade: when multiple danger signals align, compound the risk
  cascade: {
    enabled: true,
    thresholds: [
      { count: 3, multiplier: 1.2 },
      { count: 5, multiplier: 1.4 },
      { count: 7, multiplier: 1.6 }
    ]
  }
};

function calculateBaseContentScore(text) {
  const analysis = threatDetection.analyzeTextByKeywords(text);
  const contactFindings = threatDetection.detectContactScam(text);
  const allFindings = [...analysis, ...contactFindings];
  let totalWeight = 0;

  allFindings.forEach(match => {
    totalWeight += match.penalty;
  });

  // Check for domain impersonation
  const hasDomainImpersonation = DOMAIN_IMPERSONATION_PATTERNS.some(p => p.test(text));
  if (hasDomainImpersonation) {
    totalWeight += 80; // Heavy penalty for domain impersonation
  }

  // Check for phishing patterns
  const hasPhishingLink = PHISHING_LINK_PATTERNS.some(p => p.test(text));
  if (hasPhishingLink) {
    totalWeight += 60; // Heavy penalty for phishing patterns
  }

  const k = WEIGHTS.keywordBase.k;
  let baseScore = 0;
  if (totalWeight > 0) {
    baseScore = 100 * (1 - Math.exp(-k * totalWeight));
  }

  baseScore = Math.min(100, Math.max(0, baseScore));
  return { score: baseScore, weight: totalWeight, keywordMatches: allFindings, hasDomainImpersonation, hasPhishingLink };
}

// Analyze keyword findings to extract structured signals
function extractKeywordSignals(keywordMatches, baseContent) {
  const signals = {
    hasFinancialScam: false,
    hasPhishing: false,
    hasGambling: false,
    hasCryptoScam: false,
    hasPhoneScam: false,
    hasUrgency: false,
    hasFakeNews: false,
    hasDomainImpersonation: baseContent?.hasDomainImpersonation || false,
    hasPhishingLink: baseContent?.hasPhishingLink || false,
    severityCount: 0,
    categories: new Set()
  };

  for (const match of keywordMatches) {
    const gid = match.groupId || '';
    const id = match.id || '';

    if (['KG_PHISHING', 'KG_FINANCIAL'].includes(gid)) signals.hasFinancialScam = true;
    if (gid === 'KG_PHISHING') signals.hasPhishing = true;
    if (gid === 'KG_GAMBLING' || id?.startsWith('CTX_GAMBLING')) signals.hasGambling = true;
    if (gid === 'KG_CRYPTO' || id?.startsWith('CTX_CRYPTO')) signals.hasCryptoScam = true;
    if (gid === 'KG_SMS_PHONE' || id?.startsWith('CTX_PHONE')) signals.hasPhoneScam = true;
    if (id?.startsWith('CTX_URGENCY') || id?.startsWith('CTX_DEADLINE')) signals.hasUrgency = true;
    if (id?.startsWith('CTX_FAKE_NEWS') || id?.startsWith('CTX_MISINFO')) signals.hasFakeNews = true;

    if (match.penalty >= 40) signals.severityCount++;
    signals.categories.add(gid);
  }

  return signals;
}

// Multi-signal cascade scoring: when danger signals compound, amplify
function applyCascadeMultiplier(baseScore, keywordSignals, nliResults, articleCount) {
  if (!WEIGHTS.cascade.enabled) return baseScore;

  let dangerSignals = 0;

  // Count distinct danger signal categories
  if (keywordSignals.hasFinancialScam) dangerSignals++;
  if (keywordSignals.hasPhishing) dangerSignals++;
  if (keywordSignals.hasGambling) dangerSignals++;
  if (keywordSignals.hasCryptoScam) dangerSignals++;
  if (keywordSignals.hasPhoneScam) dangerSignals++;
  if (keywordSignals.hasFakeNews) dangerSignals++;
  if (keywordSignals.hasDomainImpersonation) dangerSignals += 2; // Extra weight for domain impersonation
  if (keywordSignals.hasPhishingLink) dangerSignals += 2; // Extra weight for phishing links
  if (nliResults.maxContradiction > 0.5) dangerSignals++;
  if (keywordSignals.severityCount >= 3) dangerSignals++;
  if (articleCount === 0) dangerSignals++; // No press coverage at all

  let multiplier = 1.0;
  for (const threshold of WEIGHTS.cascade.thresholds) {
    if (dangerSignals >= threshold.count) {
      multiplier = threshold.multiplier;
    }
  }

  return Math.min(100, baseScore * multiplier);
}

async function analyzeAndScore(text) {
  // Check cache first
  const cachedResult = await vectorCache.checkCache(text);
  if (cachedResult) {
    cachedResult.fromCache = true;
    return cachedResult;
  }

  const startTime = Date.now();
  const logs = [];

  // --- Phase 1: Base content scoring via keywords ---
  logs.push("Phase 1: Keyword analysis...");
  const baseContent = calculateBaseContentScore(text);
  const keywordSignals = extractKeywordSignals(baseContent.keywordMatches, baseContent);
  let finalScore = baseContent.score;
  let verdict = "SAFE";
  let isFactCheckedFake = false;
  let nliModifier = 1.0;

  logs.push(`Base keyword score: ${baseContent.score}, penalty weight: ${baseContent.weight}`);

  // --- Phase 2: Fact check ---
  logs.push("Phase 2: Fact Check API...");
  const factCheckResult = await factCheckService.checkFact(text);

  if (factCheckResult && factCheckResult.claims && factCheckResult.claims.length > 0) {
    const hasFakeClaim = factCheckResult.claims.some(claim => {
      const rating = (claim.claimReview?.[0]?.textualRating || claim.rating || "").toLowerCase();
      return rating.includes("false") || rating.includes("fake") || rating.includes("sai") || rating.includes("không đúng") || rating.includes("chưa chính xác") || rating.includes("might_be_fake");
    });

    if (hasFakeClaim) {
      isFactCheckedFake = true;
      finalScore = 100;
      verdict = "FRAUD_CONFIRMED";
      logs.push("Fact Check confirmed FAKE.");

      return {
        finalScore,
        verdict,
        baseScore: baseContent.score,
        modifier: 'MAX_RISK',
        isFactCheckedFake,
        factCheckResult,
        keywordMatches: baseContent.keywordMatches,
        keywordSignals,
        logs,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  // --- Phase 3: News search + NLI ---
  logs.push("Phase 3: News search + NLI...");
  const extracted = await keywordExtractor.extractKeywords(text);
  let searchQuery = extracted.searchKeywords.join(' ');
  if (!searchQuery) searchQuery = text.substring(0, 100);

  logs.push("Searching news...");
  const articles = await searchEngine.searchVietnameseNews(searchQuery);

  let nliResults = [];
  let maxEntailment = 0;
  let maxContradiction = 0;
  let filtered = [];

  if (articles && articles.length > 0) {
    logs.push(`Found ${articles.length} articles. Filtering...`);
    filtered = await semanticFilter.filterArticles(text, articles, 0.15);

    const topArticles = filtered.slice(0, 3);

    for (let article of topArticles) {
      const hypothesis = text.length > 500 ? text.substring(0, 500) : text;
      const premise = article.title + " " + (article.snippet || "");
      const nliRes = await nliChecker.check(premise, hypothesis);
      if (nliRes) {
        if (nliRes.entailment > maxEntailment) maxEntailment = nliRes.entailment;
        if (nliRes.contradiction > maxContradiction) maxContradiction = nliRes.contradiction;
        nliResults.push({ article: article.title, url: article.link, result: nliRes });
      }
    }
  }

  // --- Phase 4: NLI-based scoring ---
  logs.push("Phase 4: NLI scoring...");
  const nliSignals = { maxEntailment, maxContradiction, nliResults, filteredCount: filtered.length };

  if (maxContradiction > WEIGHTS.nli.contradictionHigh) {
    logs.push(`NLI Contradiction = ${maxContradiction.toFixed(2)} (threshold: ${WEIGHTS.nli.contradictionHigh}). → MAX_RISK`);
    finalScore = 100;
    nliModifier = 'MAX_RISK';
    verdict = "FRAUD_CONFIRMED";
  } else if (maxEntailment > WEIGHTS.nli.entailmentHigh) {
    logs.push(`NLI Entailment = ${maxEntailment.toFixed(2)} (threshold: ${WEIGHTS.nli.entailmentHigh}). Modifier = ${WEIGHTS.nli.entailmentWeight}`);
    nliModifier = WEIGHTS.nli.entailmentWeight;
    finalScore = baseContent.score * nliModifier;
  } else {
    // Neutral NLI: check if there's press match
    const pressMatch = filtered.length > 0;
    if (pressMatch) {
      logs.push(`NLI Neutral + Press Match (${filtered.length} articles). Modifier = ${WEIGHTS.nli.neutralPressWeight}`);
      nliModifier = WEIGHTS.nli.neutralPressWeight;
    } else {
      logs.push(`NLI Neutral + No Press. Modifier = ${WEIGHTS.nli.neutralNoPressWeight}`);
      nliModifier = WEIGHTS.nli.neutralNoPressWeight;
    }
    finalScore = baseContent.score * nliModifier;
  }

  finalScore = Math.min(100, finalScore);

  // --- Phase 5: Multi-signal cascade ---
  if (WEIGHTS.cascade.enabled) {
    const beforeCascade = finalScore;
    finalScore = applyCascadeMultiplier(finalScore, keywordSignals, nliSignals, filtered.length);
    if (finalScore !== beforeCascade) {
      logs.push(`Cascade multiplier applied: ${beforeCascade} → ${finalScore}`);
    }
  }

  // --- Phase 6: Verdict ---
  const t = WEIGHTS.verdicts;
  if (finalScore >= t.FRAUD_CONFIRMED) verdict = "FRAUD_CONFIRMED";
  else if (finalScore >= t.HIGH_RISK) verdict = "HIGH_RISK";
  else if (finalScore >= t.SUSPICIOUS) verdict = "SUSPICIOUS";
  else verdict = "SAFE";

  logs.push(`Final score: ${finalScore}, Verdict: ${verdict}`);

  const resultObj = {
    finalScore: Math.round(finalScore),
    verdict,
    baseScore: Math.round(baseContent.score),
    modifier: nliModifier,
    isFactCheckedFake,
    factCheckResult,
    nliDetails: nliSignals,
    keywordMatches: baseContent.keywordMatches,
    keywordSignals: {
      categories: Array.from(keywordSignals.categories),
      hasFinancialScam: keywordSignals.hasFinancialScam,
      hasPhishing: keywordSignals.hasPhishing,
      hasGambling: keywordSignals.hasGambling,
      hasCryptoScam: keywordSignals.hasCryptoScam,
      hasFakeNews: keywordSignals.hasFakeNews,
      hasDomainImpersonation: keywordSignals.hasDomainImpersonation,
      hasPhishingLink: keywordSignals.hasPhishingLink,
      severityCount: keywordSignals.severityCount
    },
    filteredArticles: filtered,
    logs,
    executionTimeMs: Date.now() - startTime
  };

  // Cache high-confidence results
  const hasClearPressEvidence = filtered.length > 0 && (maxEntailment >= 0.70 || maxContradiction >= 0.70);
  const isExplicitScam = baseContent.keywordMatches.some(match =>
    ['KG_PHISHING', 'KG_FINANCIAL', 'KG_VN_SCAM', 'KG_SMS_PHONE', 'KG_COD_SHIPPING', 'KG_FAKE_UTILITY', 'KG_CRYPTO', 'CTX_CRYPTO_WALLET', 'CTX_PHONE', 'CTX_BANK_ACCOUNT'].includes(match.groupId) || match.id?.startsWith('CTX_')
  );

  if (isFactCheckedFake || hasClearPressEvidence || isExplicitScam) {
    vectorCache.saveToCache(text, resultObj).catch(err => console.error("[Vector Cache] Lỗi lưu:", err));
  }

  return resultObj;
}

module.exports = { analyzeAndScore, WEIGHTS };
