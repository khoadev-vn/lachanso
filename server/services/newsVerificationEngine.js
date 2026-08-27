const axios = require('axios');
const { aggregateNews } = require('./newsAggregator');
const { extractClaims, detectSensationalism, extractNumbers, checkSourceReliability } = require('./claimAnalyzer');
const { fullDomainAnalysis, analyzeDomainName } = require('./domainReputation');
const { googleFactCheck, claimBusterCheck, fullFactCheck } = require('./factCheckApis');
const { detectVNFakePatterns, getTrustedSourceScore, crossReferenceWithTrustedSources, checkGovWarnings, TRUSTED_VN_SOURCES } = require('./vietnameseFactCheck');
const { verifyBlogContent, classifyContentType, calculateBlogScore, CONTENT_TYPES } = require('./blogVerifier');

// ============ COMPREHENSIVE NEWS VERIFICATION ENGINE ============

async function verifyNewsComprehensive(text, options = {}) {
  const startTime = Date.now();
  const url = options.url || null;
  const results = {
    text: text.substring(0, 200),
    fullText: text,
    url,
    timestamp: new Date().toISOString(),
    tools_used: [],
    signals: [],
    cross_references: [],
    fact_check_results: [],
    domain_analysis: null,
    claim_analysis: null,
    sensationalism: null,
    vietnamese_specific: null,
    blog_verification: null,
    numeric_verification: null,
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

  // 3.5 Entity mismatch detection — compare input keywords vs article keywords
  console.log('[Verify] Step 3.5: Entity mismatch check');
  const mismatch = detectKeywordMismatch(text, crossRefs);
  if (mismatch.detected) {
    results.entity_mismatch = mismatch;
    results.signals.push({
      type: 'negative',
      reason: `Entity mismatch: ${mismatch.detail}`,
      impact: -20
    });
  }

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

  // 8. Blog-specific verification (for non-news content OR when URL is provided)
  console.log('[Verify] Step 8: Blog verification');
  let blogVerification = null;
  const hasNoTrustedSources = !results.cross_references?.some(r => r.is_trusted);
  const isLowCredibility = results.sensationalism?.level === 'high' || 
                           results.claim_analysis?.source_reliability?.reliability < 50 ||
                           hasNoTrustedSources;
  
  // Always run blog verification if URL is provided or content looks like a blog
  if (url || isLowCredibility) {
    try {
      blogVerification = await verifyBlogContent(text, url);
      results.blog_verification = blogVerification;
      results.tools_used.push('blogVerifier');
    } catch (e) {
      console.error('[Verify] Blog verification error:', e.message);
    }
  }

  // 9. Calculate overall verdict
  console.log('[Verify] Step 9: Scoring');
  const scoring = calculateComprehensiveScore(results, blogVerification);
  results.overall_verdict = scoring.verdict;
  results.confidence = scoring.confidence;
  results.score = scoring.score;
  results.signals = scoring.signals;
  
  results.execution_time_ms = Date.now() - startTime;
  console.log(`[Verify] Completed in ${results.execution_time_ms}ms. Verdict: ${scoring.verdict}, Score: ${scoring.score}`);

  return results;
}

function calculateComprehensiveScore(results, blogVerification = null) {
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

  // Blog verification impact (NUANCED)
  if (blogVerification) {
    // Content type classification
    if (blogVerification.content_type_id) {
      const contentType = CONTENT_TYPES[blogVerification.content_type_id];
      if (contentType) {
        signals.push({ 
          type: 'info', 
          reason: `Nội dung phân loại: ${blogVerification.content_type} (trust weight: ${blogVerification.trust_weight})`, 
          impact: 0 
        });
      }
    }
    
    // Blog score (nuanced by content type)
    if (blogVerification.score !== undefined) {
      const blogDiff = blogVerification.score - 50;
      const trustWeight = blogVerification.trust_weight || 1.0;
      const weightedImpact = Math.round(blogDiff * trustWeight * 0.4);
      score += weightedImpact;
      
      if (blogVerification.score < 40) {
        signals.push({ 
          type: 'negative', 
          reason: `Blog score thấp (${blogVerification.score}/100): ${blogVerification.adjustments?.filter(a => a.impact < 0).map(a => a.detail).join(', ') || 'Multiple issues'}`, 
          impact: weightedImpact 
        });
      } else if (blogVerification.score >= 70) {
        signals.push({ 
          type: 'positive', 
          reason: `Blog score cao (${blogVerification.score}/100): ${blogVerification.content_type}`, 
          impact: weightedImpact 
        });
      }
    }
    
    // Fact-check required warning
    if (blogVerification.fact_check_required) {
      score -= 5;
      signals.push({ 
        type: 'warning', 
        reason: 'Nội dung y tế/tài chính - cần fact-check kỹ', 
        impact: -5 
      });
    }
  }

  // Numeric claim verification — detect modified numbers from real articles
  // Use results.text (the original input text passed through from verifyNewsComprehensive)
  const inputText = results.fullText || results.text || '';
  if (results.cross_references && results.cross_references.length > 0) {
    const textNumbers = [];
    const percentPattern = /(\d+(?:\.\d+)?)\s*%/g;
    const countPattern = /(\d+(?:\.\d+)?)\s*(?:phiếu|người|tỷ|triệu|nghìn|ngàn|đồng|USD|VND|năm|ngày|tháng)/gi;
    let match;
    while ((match = percentPattern.exec(inputText)) !== null) {
      textNumbers.push({ value: parseFloat(match[1]), type: 'percent', context: inputText.substring(Math.max(0, match.index - 40), match.index + match[0].length + 40) });
    }
    while ((match = countPattern.exec(inputText)) !== null) {
      textNumbers.push({ value: parseFloat(match[1]), type: 'count', context: inputText.substring(Math.max(0, match.index - 40), match.index + match[0].length + 40) });
    }

    if (textNumbers.length > 0) {
      const mismatches = [];
      let verifiedCount = 0;

      for (const ref of results.cross_references.slice(0, 5)) {
        const articleText = ((ref.title || '') + ' ' + (ref.snippet || '')).toLowerCase();
        const articleNums = [];
        for (const am of (articleText.matchAll(/(\d+(?:\.\d+)?)\s*%/g) || [])) articleNums.push(parseFloat(am[1]));
        for (const am of (articleText.matchAll(/(\d+(?:\.\d+)?)\s*(?:phiếu|người|tỷ|triệu|nghìn|ngàn|đồng|USD|VND|năm|ngày|tháng)/gi) || [])) articleNums.push(parseFloat(am[1]));

        for (const tn of textNumbers) {
          for (const an of articleNums) {
            if (tn.value > 0 && an > 0) {
              const ratio = an / tn.value;
              if (ratio > 3 || ratio < 0.33) {
                mismatches.push({ textNumber: tn.value, articleNumber: an, articleTitle: ref.title, context: tn.context.trim(), source: ref.source });
              } else {
                verifiedCount++;
              }
            }
          }
        }
      }

      if (mismatches.length > 0) {
        // Direct mismatch: numbers in text differ from article numbers
        const penalty = Math.min(60, mismatches.length * 20);
        score -= penalty;
        results.numeric_verification = { hasMismatch: true, mismatches: mismatches.slice(0, 5), penalty, type: 'modified' };
        signals.push({
          type: 'negative',
          reason: `Phát hiện ${mismatches.length} số liệu bị chỉnh sửa so với bài báo gốc (mức phạt: -${penalty})`,
          impact: -penalty
        });
        results.tools_used.push('numericVerification');
      } else if (verifiedCount === 0 && textNumbers.length > 0) {
        // No numbers in articles match — unverified specific claim
        // The text has specific numbers but articles about the same topic don't mention them
        const penalty = 25;
        score -= penalty;
        results.numeric_verification = { hasMismatch: false, mismatches: [], penalty, type: 'unverified', textNumbers: textNumbers.map(n => ({ value: n.value, context: n.context.trim() })) };
        signals.push({
          type: 'negative',
          reason: `Có ${textNumbers.length} số liệu cụ thể trong bài nhưng không được bài báo nào xác nhận (mức phạt: -${penalty})`,
          impact: -penalty
        });
        results.tools_used.push('numericVerification');
      } else {
        results.numeric_verification = { hasMismatch: false, mismatches: [], penalty: 0, type: 'verified' };
      }
    } else {
      results.numeric_verification = { hasMismatch: false, mismatches: [], penalty: 0, type: 'no_numbers' };
    }
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

// ============ ENTITY EXTRACTION & MISMATCH DETECTION ============

// ============ ENTITY MISMATCH DETECTION ============

const COUNTRY_NAMES = [
  'Nepal', 'Portugal', 'Pakistan', 'Ukraine', 'Vietnam', 'Thailand', 'Cambodia',
  'Myanmar', 'Malaysia', 'Indonesia', 'Philippines', 'Singapore', 'Australia',
  'India', 'China', 'Japan', 'Korea', 'Russia', 'Germany', 'France', 'Spain',
  'Italy', 'Brazil', 'Mexico', 'Canada', 'Egypt', 'Turkey', 'Iran', 'Iraq',
  'Israel', 'Syria', 'Afghanistan', 'Bangladesh', 'Sri Lanka', 'Taiwan', 'Tibet',
  'Nepal', 'Kathmandu', 'Lisbon', 'Hanoi', 'Bangkok', 'Jakarta', 'Manila',
  'Delhi', 'Beijing', 'Tokyo', 'Seoul', 'Moscow', 'Berlin', 'Paris', 'Madrid',
  'Rome', 'London', 'Washington', 'New York', 'Texas', 'California', 'Florida',
];

function extractCountries(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = COUNTRY_NAMES.filter(c => lower.includes(c.toLowerCase()));

  // Also check for fuzzy matches (typos): if a word is 1-2 edits from a country name
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (word.length < 4) continue;
    for (const country of COUNTRY_NAMES) {
      const cl = country.toLowerCase();
      if (word === cl) continue;
      const dist = levenshteinSimple(word, cl);
      if (dist >= 1 && dist <= 2 && Math.abs(word.length - cl.length) <= 2) {
        found.push(country); // Add the correct country name
      }
    }
  }
  return [...new Set(found)];
}

function levenshteinSimple(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function detectKeywordMismatch(inputText, articles) {
  if (!articles || articles.length === 0) return { detected: false };

  const inputCountries = extractCountries(inputText);
  const articleText = articles.map(a => a.title).join(' ');
  const articleCountries = extractCountries(articleText);

  // If input has countries but articles mention different countries
  if (inputCountries.length > 0 && articleCountries.length > 0) {
    const inputSet = new Set(inputCountries.map(c => c.toLowerCase()));
    const articleSet = new Set(articleCountries.map(c => c.toLowerCase()));
    const unmatched = inputCountries.filter(c => !articleSet.has(c.toLowerCase()));

    if (unmatched.length > 0) {
      return {
        detected: true,
        inputKeywords: unmatched,
        articleKeywords: articleCountries.slice(0, 5),
        detail: `Bạn đề cập "${unmatched.join('", "')}" nhưng các nguồn tin nói về "${articleCountries.slice(0, 3).join('", ')}". Có sự không khớp giữa nội dung nhập và thực tế.`,
        severity: 'warning'
      };
    }
  }

  // Also check: if input has NO countries but articles clearly mention specific countries
  // This means the input might be fake/made up
  if (inputCountries.length === 0 && articleCountries.length >= 2) {
    const uniqueCountries = [...new Set(articleCountries)];
    if (uniqueCountries.length >= 2) {
      return {
        detected: true,
        inputKeywords: [],
        articleKeywords: uniqueCountries.slice(0, 5),
        detail: `Nội dung nhập không đề cập địa điểm cụ thể, nhưng các nguồn tin nói về "${uniqueCountries.slice(0, 3).join('", ')}". Hãy kiểm tra lại thông tin.`,
        severity: 'warning'
      };
    }
  }

  return { detected: false };
}

module.exports = { verifyNewsComprehensive };
