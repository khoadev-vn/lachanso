const axios = require('axios');
const { aggregateNews } = require('./newsAggregator');
const { extractClaims, detectSensationalism, extractNumbers, checkSourceReliability } = require('./claimAnalyzer');
const { fullDomainAnalysis, analyzeDomainName } = require('./domainReputation');
const { googleFactCheck, claimBusterCheck, fullFactCheck } = require('./factCheckApis');
const { detectVNFakePatterns, getTrustedSourceScore, crossReferenceWithTrustedSources, checkGovWarnings, TRUSTED_VN_SOURCES } = require('./vietnameseFactCheck');

// ============ COMPREHENSIVE NEWS VERIFICATION ENGINE ============

async function verifyNewsComprehensive(text, options = {}) {
  const startTime = Date.now();
  const results = {
    text: text.substring(0, 200),
    timestamp: new Date().toISOString(),
    tools_used: [],
    signals: [],
    cross_references: [],
    fact_check_results: [],
    domain_analysis: null,
    claim_analysis: null,
    sensationalism: null,
    vietnamese_specific: null,
    overall_verdict: null,
    confidence: 0,
    execution_time_ms: 0
  };

  // 1. Extract claims and analyze sensationalism
  console.log('[Verify] Step 1: Claim extraction & sensationalism');
  const claims = extractClaims(text);
  const sensationalism = detectSensationalism(text);
  const numbers = extractNumbers(text);
  const sourceReliability = checkSourceReliability(text);
  
  results.claim_analysis = {
    claims_found: claims.length,
    claims: claims.slice(0, 5),
    numbers_found: numbers,
    source_reliability: sourceReliability
  };
  results.sensationalism = sensationalism;
  results.tools_used.push('claimAnalyzer');

  // 2. Vietnamese-specific pattern detection
  console.log('[Verify] Step 2: Vietnamese fake patterns');
  const vnPatterns = detectVNFakePatterns(text);
  results.vietnamese_specific = {
    fake_patterns_detected: vnPatterns,
    is_trusted_source: false
  };
  results.tools_used.push('vietnameseFactCheck');

  // 3. News aggregation and cross-reference
  console.log('[Verify] Step 3: News aggregation');
  let articles = [];
  try {
    articles = await aggregateNews(text, { maxResults: 20 });
  } catch (e) {
    console.error('[Verify] News aggregation error:', e.message);
  }
  
  const crossRefs = [];
  for (const article of articles.slice(0, 10)) {
    const domain = article.link ? new URL(article.link).hostname : '';
    const trustedInfo = getTrustedSourceScore(domain);
    crossRefs.push({
      title: article.title,
      source: article.source || 'Unknown',
      link: article.link,
      trust_score: trustedInfo.score || 50,
      is_trusted: trustedInfo.trusted
    });
  }
  results.cross_references = crossRefs;
  results.tools_used.push('newsAggregator');

  // 4. Domain analysis for URLs in text
  console.log('[Verify] Step 4: Domain analysis');
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlPattern) || [];
  if (urls.length > 0) {
    const domainAnalyses = [];
    for (const url of urls.slice(0, 3)) {
      try {
        const analysis = await fullDomainAnalysis(url);
        domainAnalyses.push(analysis);
      } catch {}
    }
    results.domain_analysis = domainAnalyses;
    results.tools_used.push('domainReputation');
  }

  // 5. Fact-check API calls (parallel)
  console.log('[Verify] Step 5: Fact-check APIs');
  const searchQuery = text.substring(0, 100);
  
  const [googleFact, claimBuster, fullFact] = await Promise.allSettled([
    googleFactCheck(searchQuery),
    claimBusterCheck(text),
    fullFactCheck(searchQuery)
  ]);
  
  if (googleFact.status === 'fulfilled' && googleFact.value.available) {
    results.fact_check_results.push({ source: 'Google Fact Check', ...googleFact.value });
    results.tools_used.push('googleFactCheck');
  }
  if (claimBuster.status === 'fulfilled' && claimBuster.value.available) {
    results.fact_check_results.push({ source: 'ClaimBuster', ...claimBuster.value });
    results.tools_used.push('claimBuster');
  }
  if (fullFact.status === 'fulfilled' && fullFact.value.available) {
    results.fact_check_results.push({ source: 'Full Fact', ...fullFact.value });
    results.tools_used.push('fullFactCheck');
  }

  // 6. Cross-reference with trusted Vietnamese sources
  console.log('[Verify] Step 6: Trusted source cross-reference');
  const keywords = text.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
  try {
    const trustedCrossRef = await crossReferenceWithTrustedSources(text, keywords);
    results.vietnamese_specific.trusted_sources_crossref = trustedCrossRef;
    results.tools_used.push('trustedSourceCrossRef');
  } catch {}

  // 7. Check government warnings
  console.log('[Verify] Step 7: Government warnings');
  try {
    const govWarnings = await checkGovWarnings(text.substring(0, 50));
    results.vietnamese_specific.gov_warnings = govWarnings;
    if (govWarnings.length > 0) results.tools_used.push('govWarnings');
  } catch {}

  // 8. Calculate overall verdict
  console.log('[Verify] Step 8: Scoring');
  const scoring = calculateComprehensiveScore(results);
  results.overall_verdict = scoring.verdict;
  results.confidence = scoring.confidence;
  results.score = scoring.score;
  results.signals = scoring.signals;
  
  results.execution_time_ms = Date.now() - startTime;
  console.log(`[Verify] Completed in ${results.execution_time_ms}ms. Verdict: ${scoring.verdict}, Score: ${scoring.score}`);

  return results;
}

function calculateComprehensiveScore(results) {
  let score = 50; // Start neutral
  const signals = [];

  // Sensationalism impact
  if (results.sensationalism) {
    const sens = results.sensationalism;
    if (sens.level === 'high') {
      score -= 20;
      signals.push({ type: 'negative', reason: 'High sensationalism detected', impact: -20 });
    } else if (sens.level === 'medium') {
      score -= 10;
      signals.push({ type: 'negative', reason: 'Medium sensationalism detected', impact: -10 });
    } else {
      score += 5;
      signals.push({ type: 'positive', reason: 'Low sensationalism', impact: 5 });
    }
  }

  // Vietnamese fake patterns
  if (results.vietnamese_specific?.fake_patterns_detected?.length > 0) {
    const highSeverity = results.vietnamese_specific.fake_patterns_detected.filter(p => p.severity === 'high');
    if (highSeverity.length > 0) {
      score -= 25;
      signals.push({ type: 'negative', reason: `High-severity Vietnamese fake patterns: ${highSeverity.map(p => p.type).join(', ')}`, impact: -25 });
    } else {
      score -= 10;
      signals.push({ type: 'negative', reason: 'Vietnamese fake patterns detected', impact: -10 });
    }
  }

  // Cross-reference with trusted sources
  if (results.cross_references?.length > 0) {
    const trustedCount = results.cross_references.filter(r => r.is_trusted).length;
    const totalCount = results.cross_references.length;
    
    if (trustedCount >= 3) {
      score += 20;
      signals.push({ type: 'positive', reason: `Found ${trustedCount} trusted source corroboration`, impact: 20 });
    } else if (trustedCount >= 1) {
      score += 10;
      signals.push({ type: 'positive', reason: `Found ${trustedCount} trusted source mention`, impact: 10 });
    } else if (totalCount > 0 && trustedCount === 0) {
      score -= 10;
      signals.push({ type: 'negative', reason: 'No trusted sources found', impact: -10 });
    }
  }

  // Fact-check results
  for (const fc of results.fact_check_results || []) {
    if (fc.results?.length > 0) {
      const firstResult = fc.results[0];
      const rating = (firstResult.rating || '').toLowerCase();
      if (rating.includes('false') || rating.includes('fake') || rating.includes('sai')) {
        score -= 25;
        signals.push({ type: 'negative', reason: `Fact-check (${fc.source}): FALSE`, impact: -25 });
      } else if (rating.includes('true') || rating.includes('real') || rating.includes('đúng')) {
        score += 15;
        signals.push({ type: 'positive', reason: `Fact-check (${fc.source}): TRUE`, impact: 15 });
      } else if (rating.includes('mixture') || rating.includes('partly')) {
        score -= 5;
        signals.push({ type: 'neutral', reason: `Fact-check (${fc.source}): MIXED`, impact: -5 });
      }
    }
  }

  // Domain analysis
  if (results.domain_analysis?.length > 0) {
    for (const da of results.domain_analysis) {
      if (da.overallRisk === 'high') {
        score -= 20;
        signals.push({ type: 'negative', reason: `High-risk domain: ${da.hostname}`, impact: -20 });
      } else if (da.overallRisk === 'medium') {
        score -= 10;
        signals.push({ type: 'negative', reason: `Medium-risk domain: ${da.hostname}`, impact: -10 });
      }
    }
  }

  // Source reliability
  if (results.claim_analysis?.source_reliability) {
    const rel = results.claim_analysis.source_reliability;
    if (rel.reliability < 50) {
      score -= 10;
      signals.push({ type: 'negative', reason: `Low source reliability: ${rel.reliability}%`, impact: -10 });
    } else if (rel.reliability >= 80) {
      score += 5;
      signals.push({ type: 'positive', reason: `Good source reliability: ${rel.reliability}%`, impact: 5 });
    }
  }

  // Government warnings
  if (results.vietnamese_specific?.gov_warnings?.length > 0) {
    score -= 15;
    signals.push({ type: 'negative', reason: 'Government warning found on topic', impact: -15 });
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine verdict
  let verdict = 'CÓ THỂ LÀ TIN GIẢ';
  if (score >= 80) verdict = 'CÓ KHẢ NÀNG LÀ TIN THẬT';
  else if (score >= 65) verdict = 'CHƯA XÁC ĐỊNH - CẦN KIỂM TRA THÊM';
  else if (score >= 40) verdict = 'CÓ THỂ LÀ TIN GIẢ';
  else if (score >= 20) verdict = 'RẤT CÓ THỂ LÀ TIN GIẢ';
  else verdict = 'TIN GIẢ';

  // Calculate confidence
  const toolCount = results.tools_used.length;
  const signalCount = signals.length;
  const crossRefCount = results.cross_references?.length || 0;
  let confidence = 30 + (toolCount * 3) + (signalCount * 2) + (crossRefCount * 1);
  confidence = Math.min(95, Math.max(20, confidence));

  return { verdict, score, confidence, signals };
}

module.exports = { verifyNewsComprehensive };
