/**
 * Layer 5: Explainability Engine (SHAP-style Feature Impact)
 * Explains WHY a score was given
 */

const FEATURE_WEIGHTS = {
  // Negative features (reduce trust)
  KEYWORD_DANGER: { weight: -25, label: 'Từ khóa nguy hiểm', category: 'content' },
  LINK_PHISHING: { weight: -40, label: 'Liên kết phishing', category: 'link' },
  LINK_BLACKLIST: { weight: -50, label: 'Domain blacklist', category: 'link' },
  NUMERIC_MISMATCH: { weight: -30, label: 'Số liệu sai lệch', category: 'content' },
  NO_TRUSTED_SOURCE: { weight: -15, label: 'Không có nguồn uy tín', category: 'source' },
  EMOTIONAL_MANIPULATION: { weight: -20, label: 'Thao túng tâm lý', category: 'content' },
  CLICKBAIT: { weight: -15, label: 'Giật tít câu view', category: 'content' },
  FACT_CONTRADICTED: { weight: -35, label: 'Bị nguồn uy tín bác bỏ', category: 'source' },
  URGENCY_LANGUAGE: { weight: -10, label: 'Ngôn ngữ khẩn cấp', category: 'content' },
  GOV_WARNING: { weight: -45, label: 'Cảnh báo từ Chính phủ', category: 'source' },
  
  // Positive features (increase trust)
  TRUSTED_SOURCE: { weight: 20, label: 'Nguồn tin uy tín', category: 'source' },
  FACT_CONFIRMED: { weight: 25, label: 'Được fact-check xác nhận', category: 'source' },
  EDUCATIONAL_CONTENT: { weight: 15, label: 'Nội dung giáo dục', category: 'content' },
  CLEAR_AUTHOR: { weight: 10, label: 'Tác giả rõ ràng', category: 'content' },
  DATA_SOURCES: { weight: 10, label: 'Dẫn nguồn dữ liệu', category: 'content' }
};

function generateExplanations(input, score) {
  const features = [];
  
  // Analyze keyword signals
  if (input.keywordScan?.totalPenalty > 30) {
    features.push({
      ...FEATURE_WEIGHTS.KEYWORD_DANGER,
      impact: Math.min(-25, -input.keywordScan.totalPenalty * 0.3),
      detail: `Phát hiện ${input.keywordScan.totalMatches} từ khóa nguy hiểm`
    });
  }
  
  // Analyze link signals
  if (input.linkAnalysis) {
    const phishingLinks = input.linkAnalysis.filter(l => l.isPhishing);
    const blacklistedLinks = input.linkAnalysis.filter(l => l.isBlacklisted || l.isScamDomain);
    
    if (phishingLinks.length > 0) {
      features.push({ ...FEATURE_WEIGHTS.LINK_PHISHING, impact: -40, detail: `${phishingLinks.length} link phishing` });
    }
    if (blacklistedLinks.length > 0) {
      features.push({ ...FEATURE_WEIGHTS.LINK_BLACKLIST, impact: -50, detail: `${blacklistedLinks.length} link trong blacklist` });
    }
  }
  
  // Analyze numeric verification
  if (input.factVerification?.numericMismatches?.length > 0) {
    features.push({
      ...FEATURE_WEIGHTS.NUMERIC_MISMATCH,
      impact: -30,
      detail: `${input.factVerification.numericMismatches.length} số liệu sai lệch`
    });
  }
  
  // Analyze source verification
  if (input.trustedVerification) {
    if (input.trustedVerification.trustedCount === 0 && input.trustedVerification.totalCount > 0) {
      features.push({ ...FEATURE_WEIGHTS.NO_TRUSTED_SOURCE, impact: -15, detail: 'Không có nguồn uy tín xác nhận' });
    } else if (input.trustedVerification.trustedCount >= 3) {
      features.push({ ...FEATURE_WEIGHTS.TRUSTED_SOURCE, impact: 20, detail: `${input.trustedVerification.trustedCount} nguồn uy tín xác nhận` });
    }
  }
  
  // Analyze context analysis
  if (input.contextAnalysis) {
    if (input.contextAnalysis.manipulationScore > 50) {
      features.push({
        ...FEATURE_WEIGHTS.EMOTIONAL_MANIPULATION,
        impact: -20,
        detail: `Điểm thao túng: ${input.contextAnalysis.manipulationScore}/100`
      });
    }
    if (input.contextAnalysis.panicIndex > 50) {
      features.push({
        ...FEATURE_WEIGHTS.URGENCY_LANGUAGE,
        impact: -10,
        detail: `Chỉ số hoảng loạn: ${input.contextAnalysis.panicIndex}/100`
      });
    }
  }
  
  // Educational content boost
  if (input.educational?.isEducational) {
    features.push({
      ...FEATURE_WEIGHTS.EDUCATIONAL_CONTENT,
      impact: 15,
      detail: `Nội dung giáo dục (${input.educational.confidence * 100}% confidence)`
    });
  }
  
  // Sort by absolute impact
  features.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  
  // Calculate feature contributions percentage
  const totalAbsImpact = features.reduce((sum, f) => sum + Math.abs(f.impact), 0);
  const featureContributions = features.map(f => ({
    ...f,
    percentage: totalAbsImpact > 0 ? Math.round((Math.abs(f.impact) / totalAbsImpact) * 100) : 0
  }));
  
  return {
    features: featureContributions,
    topContributors: featureContributions.slice(0, 5),
    summary: generateSummary(featureContributions, score)
  };
}

function generateSummary(features, score) {
  const positive = features.filter(f => f.impact > 0);
  const negative = features.filter(f => f.impact < 0);
  
  let summary = `Điểm tin cậy: ${score}%. `;
  
  if (negative.length > 0) {
    summary += `Yếu tố giảm điểm chính: ${negative.slice(0, 3).map(f => f.label).join(', ')}. `;
  }
  if (positive.length > 0) {
    summary += `Yếu tố tăng điểm: ${positive.slice(0, 2).map(f => f.label).join(', ')}. `;
  }
  
  return summary;
}

module.exports = { generateExplanations, FEATURE_WEIGHTS };
