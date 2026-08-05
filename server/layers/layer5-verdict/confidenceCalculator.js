/**
 * Layer 5: Confidence Calculator (Bayesian)
 * Calculates confidence score based on evidence quality
 */

function calculateConfidence(signals) {
  const {
    articleCount = 0,
    trustedArticleCount = 0,
    factCheckResults = [],
    llmConfidence = 0.5,
    hasNumericMismatch = false,
    hasEarlyExit = false,
    isEducational = false,
    executionTimeMs = 0
  } = signals;
  
  // Base confidence from evidence quantity
  let evidenceConfidence = 0;
  if (articleCount > 0) {
    evidenceConfidence = Math.min(0.4, articleCount * 0.05);
  }
  if (trustedArticleCount > 0) {
    evidenceConfidence += Math.min(0.3, trustedArticleCount * 0.1);
  }
  
  // Fact-check confidence
  let factCheckConfidence = 0;
  if (factCheckResults.length > 0) {
    const confirmed = factCheckResults.filter(r => r.verdict === 'confirmed').length;
    const contradicted = factCheckResults.filter(r => r.verdict === 'contradicted').length;
    factCheckConfidence = Math.min(0.3, (confirmed - contradicted) * 0.1);
  }
  
  // LLM confidence contribution
  const llmContrib = llmConfidence * 0.2;
  
  // Penalties for low confidence
  let penalty = 0;
  if (articleCount === 0) penalty += 0.15;
  if (!hasNumericMismatch && articleCount > 3) penalty -= 0.05;
  if (executionTimeMs > 10000) penalty += 0.05;
  
  // Boosts for high confidence
  let boost = 0;
  if (hasEarlyExit) boost += 0.2;
  if (isEducational) boost += 0.1;
  if (trustedArticleCount >= 3) boost += 0.15;
  
  // Calculate final confidence
  const rawConfidence = evidenceConfidence + factCheckConfidence + llmContrib + boost - penalty;
  const confidence = Math.min(0.95, Math.max(0.1, rawConfidence));
  
  // Determine confidence level
  let level = 'low';
  if (confidence >= 0.7) level = 'high';
  else if (confidence >= 0.4) level = 'medium';
  
  return {
    confidence: Math.round(confidence * 100) / 100,
    level,
    breakdown: {
      evidence: Math.round(evidenceConfidence * 100) / 100,
      factCheck: Math.round(factCheckConfidence * 100) / 100,
      llm: Math.round(llmContrib * 100) / 100,
      boost: Math.round(boost * 100) / 100,
      penalty: Math.round(penalty * 100) / 100
    },
    factors: {
      articleCount,
      trustedArticleCount,
      factCheckCount: factCheckResults.length,
      hasNumericMismatch,
      hasEarlyExit,
      isEducational
    }
  };
}

module.exports = { calculateConfidence };
