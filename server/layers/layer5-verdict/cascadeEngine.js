/**
 * Layer 5: Cascade Engine (Short-Circuit Logic)
 * Early exit for confirmed fake/scam, saves LLM costs
 */

// Early exit conditions (Layer 1/2 confirmed)
const EARLY_EXIT_CONDITIONS = [
  {
    id: 'BLACKLIST_DOMAIN',
    check: (input) => input.linkAnalysis?.some(l => l.isBlacklisted || l.isScamDomain),
    verdict: 'FRAUD_CONFIRMED',
    score: 100,
    message: 'Domain nằm trong blacklist lừa đảo'
  },
  {
    id: 'PHISHING_LINK',
    check: (input) => input.linkAnalysis?.some(l => l.isPhishing),
    verdict: 'FRAUD_CONFIRMED',
    score: 95,
    message: 'Phát hiện liên kết phishing'
  },
  {
    id: 'GOV_WARNING',
    check: (input) => input.trustedVerification?.hasWarning,
    verdict: 'FRAUD_CONFIRMED',
    score: 90,
    message: 'Cảnh báo từ cơ quan Chính phủ'
  },
  {
    id: 'TRUSTED_SOURCE_CONTRADICTS',
    check: (input) => input.factVerification?.verdict === 'contradicted' && input.factVerification?.confidence > 0.8,
    verdict: 'FRAUD_CONFIRMED',
    score: 95,
    message: 'Nguồn uy tín bác bỏ thông tin'
  },
  {
    id: 'NUMERIC_MISMATCH_CONFIRMED',
    check: (input) => input.factVerification?.numericMismatches?.length > 0 && input.factVerification?.confidence > 0.7,
    verdict: 'FRAUD_CONFIRMED',
    score: 85,
    message: 'Số liệu bị chỉnh sửa so với nguồn gốc'
  }
];

// Soft conditions (reduce score but don't exit early)
const SOFT_SIGNALS = [
  {
    id: 'HIGH_KEYWORD_SCORE',
    check: (input) => input.keywordScan?.totalPenalty > 50,
    scoreModifier: 0.3,
    message: 'Nhiều từ khóa nguy hiểm'
  },
  {
    id: 'EMOTIONAL_MANIPULATION',
    check: (input) => input.contextAnalysis?.manipulationScore > 60,
    scoreModifier: 0.4,
    message: 'Thao túng tâm lý mạnh'
  },
  {
    id: 'NO_TRUSTED_SOURCE',
    check: (input) => input.trustedVerification?.trustedCount === 0 && input.trustedVerification?.totalCount > 0,
    scoreModifier: 0.2,
    message: 'Không có nguồn tin uy tín nào xác nhận'
  },
  {
    id: 'EDUCATIONAL_CONTENT',
    check: (input) => input.educational?.isEducational,
    scoreModifier: 2.0, // Boost score for educational content
    message: 'Nội dung giáo dục/hướng dẫn'
  }
];

function evaluateCascade(input) {
  const startTime = Date.now();
  const triggered = [];
  let earlyExit = null;
  let scoreModifier = 1.0;
  let totalModifier = 0;
  
  // Check early exit conditions first
  for (const condition of EARLY_EXIT_CONDITIONS) {
    try {
      if (condition.check(input)) {
        earlyExit = {
          id: condition.id,
          verdict: condition.verdict,
          score: condition.score,
          message: condition.message
        };
        triggered.push(condition.id);
        break; // Exit on first match
      }
    } catch (e) {
      // Skip failed checks
    }
  }
  
  // If no early exit, check soft signals
  if (!earlyExit) {
    for (const signal of SOFT_SIGNALS) {
      try {
        if (signal.check(input)) {
          triggered.push(signal.id);
          if (signal.scoreModifier < 1) {
            scoreModifier *= signal.scoreModifier;
            totalModifier += signal.scoreModifier;
          } else {
            scoreModifier *= signal.scoreModifier;
            totalModifier += signal.scoreModifier - 1;
          }
        }
      } catch (e) {
        // Skip failed checks
      }
    }
  }
  
  return {
    earlyExit,
    triggered,
    scoreModifier: Math.max(0.1, Math.min(2.0, scoreModifier)),
    totalModifier,
    hasEarlyExit: earlyExit !== null,
    executionTimeMs: Date.now() - startTime
  };
}

module.exports = { evaluateCascade, EARLY_EXIT_CONDITIONS, SOFT_SIGNALS };
