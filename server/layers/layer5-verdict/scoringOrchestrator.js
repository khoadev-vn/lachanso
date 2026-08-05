/**
 * Layer 5: Scoring Orchestrator
 * Combines all signals into final trust score (0-100)
 */

const { evaluateCascade } = require('./cascadeEngine');
const { calculateConfidence } = require('./confidenceCalculator');
const { generateExplanations } = require('./explainability');

// Scoring weights for each signal type
const SCORING_WEIGHTS = {
  keyword: { weight: 0.25, maxImpact: 30 },
  link: { weight: 0.20, maxImpact: 25 },
  source: { weight: 0.25, maxImpact: 30 },
  context: { weight: 0.15, maxImpact: 20 },
  educational: { weight: 0.15, maxImpact: 15 }
};

function calculateScore(input) {
  const startTime = Date.now();
  
  // Start with base score
  let score = 50;
  
  // 1. Keyword signals
  const keywordScore = input.keywordScan?.totalPenalty || 0;
  const keywordImpact = Math.min(SCORING_WEIGHTS.keyword.maxImpact, keywordScore * 0.3);
  score -= keywordImpact;
  
  // 2. Link signals
  let linkPenalty = 0;
  if (input.linkAnalysis) {
    const phishingCount = input.linkAnalysis.filter(l => l.isPhishing).length;
    const blacklistedCount = input.linkAnalysis.filter(l => l.isBlacklisted || l.isScamDomain).length;
    linkPenalty = (phishingCount * 30) + (blacklistedCount * 40);
  }
  score -= Math.min(SCORING_WEIGHTS.link.maxImpact, linkPenalty);
  
  // 3. Source verification
  let sourceImpact = 0;
  if (input.trustedVerification) {
    const { trustedCount = 0, totalCount = 0 } = input.trustedVerification;
    if (trustedCount >= 3) sourceImpact = 25;
    else if (trustedCount >= 1) sourceImpact = 15;
    else if (totalCount > 0 && trustedCount === 0) sourceImpact = -15;
  }
  score += Math.max(-SCORING_WEIGHTS.source.maxImpact, Math.min(SCORING_WEIGHTS.source.maxImpact, sourceImpact));
  
  // 4. Context analysis
  if (input.contextAnalysis) {
    const manipulationPenalty = input.contextAnalysis.manipulationScore * 0.15;
    const panicPenalty = input.contextAnalysis.panicIndex * 0.1;
    score -= Math.min(SCORING_WEIGHTS.context.maxImpact, manipulationPenalty + panicPenalty);
  }
  
  // 5. Educational content boost
  if (input.educational?.isEducational) {
    score += SCORING_WEIGHTS.educational.maxImpact;
    score = Math.min(score, 30); // Cap for educational content
  }
  
  // 6. Fact verification
  if (input.factVerification) {
    if (input.factVerification.verdict === 'contradicted') {
      score -= 35;
    } else if (input.factVerification.verdict === 'confirmed') {
      score += 25;
    }
    if (input.factVerification.numericMismatches?.length > 0) {
      score -= 30;
    }
  }
  
  // 7. Apply cascade modifiers
  const cascade = evaluateCascade(input);
  if (cascade.hasEarlyExit) {
    score = cascade.earlyExit.score;
  } else {
    score = Math.max(0, Math.min(100, score * cascade.scoreModifier));
  }
  
  // Clamp final score
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  // Determine verdict
  let verdict = 'SAFE';
  let verdictLabel = 'An toàn';
  if (score >= 80) { verdict = 'FRAUD_CONFIRMED'; verdictLabel = 'Tin giả/Lừa đảo'; }
  else if (score >= 60) { verdict = 'HIGH_RISK'; verdictLabel = 'Rủi ro cao'; }
  else if (score >= 40) { verdict = 'SUSPICIOUS'; verdictLabel = 'Đáng ngờ'; }
  else if (score >= 20) { verdict = 'UNCERTAIN'; verdictLabel = 'Chưa xác minh'; }
  
  // Educational override
  if (input.educational?.isEducational && score < 30) {
    verdict = 'EDUCATIONAL';
    verdictLabel = 'Nội dung giáo dục — An toàn';
    score = Math.min(score, 30);
  }
  
  // Calculate confidence
  const confidence = calculateConfidence({
    articleCount: input.newsSearch?.articles?.length || 0,
    trustedArticleCount: input.trustedVerification?.trustedCount || 0,
    factCheckResults: [],
    llmConfidence: input.factVerification?.confidence || 0.5,
    hasNumericMismatch: input.factVerification?.numericMismatches?.length > 0,
    hasEarlyExit: cascade.hasEarlyExit,
    isEducational: input.educational?.isEducational || false,
    executionTimeMs: Date.now() - startTime
  });
  
  // Generate explanations
  const explanations = generateExplanations(input, score);
  
  return {
    score,
    verdict,
    verdictLabel,
    confidence,
    cascade,
    explanations,
    executionTimeMs: Date.now() - startTime
  };
}

module.exports = { calculateScore, SCORING_WEIGHTS };
