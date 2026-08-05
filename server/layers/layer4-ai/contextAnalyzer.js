/**
 * Layer 4: Context Analyzer (Groq-powered)
 * Deep context analysis: psychological manipulation, logical fallacies, panic index
 */

const { groqChat } = require('../../services/groqClient');

const CONTEXT_ANALYSIS_PROMPT = `Bạn là chuyên gia phân tích ngôn ngữ và tâm lý học truyền thông. Phân tích đoạn tin và trả về JSON với các trường sau:

{
  "panic_index": <0-100>,
  "manipulation_score": <0-100>,
  "logical_fallacies": [<danh sách các ngụy biện phát hiện được>],
  "emotional_appeals": [<danh sách các kêu gọi cảm xúc>],
  "credibility_signals": [<tín hiệu tin cậy nếu có>],
  "red_flags": [<danh sách các dấu hiệu bất thường>],
  "summary": "Tóm tắt phân tích trong 1 câu"
}

Phân tích các yếu tố:
1. Panic Index: Mức độ gây sợ hãi/hoang mang (đe dọa, khẩn cấp, cảnh báo giả)
2. Manipulation Score: Kỹ thuật thao túng tâm lý (lặp lại, tạo nhóm đối lập, bằng chứng giả)
3. Logical Fallacies: Ngụy biện (authority appeal, slippery slope, false dilemma, ad hominem)
4. Emotional Appeals: Kêu gọi cảm xúc (sợ hãi, tham lam, giận dữ, thương cảm)
5. Credibility Signals: Tín hiệu tin-cậy (dẫn nguồn, số liệu cụ thể, tác giả rõ ràng)
6. Red Flags: Dấu hiệu bất thường (quá nhiều cảm thán, số liệu không rõ nguồn)`;

async function analyzeContext(text) {
  const startTime = Date.now();
  
  try {
    const truncatedText = text.substring(0, 2000);
    
    const result = await groqChat([
      { role: 'system', content: CONTEXT_ANALYSIS_PROMPT },
      { role: 'user', content: `Phân tích đoạn tin sau:\n\n${truncatedText}` }
    ], {
      jsonMode: true,
      maxTokens: 800,
      timeout: 20000
    });
    
    if (!result || typeof result !== 'object') {
      return generateHeuristicAnalysis(text, Date.now() - startTime);
    }
    
    return {
      panicIndex: Math.min(100, Math.max(0, result.panic_index || 0)),
      manipulationScore: Math.min(100, Math.max(0, result.manipulation_score || 0)),
      logicalFallacies: Array.isArray(result.logical_fallacies) ? result.logical_fallacies : [],
      emotionalAppeals: Array.isArray(result.emotional_appeals) ? result.emotional_appeals : [],
      credibilitySignals: Array.isArray(result.credibility_signals) ? result.credibility_signals : [],
      redFlags: Array.isArray(result.red_flags) ? result.red_flags : [],
      summary: result.summary || '',
      source: 'groq',
      executionTimeMs: Date.now() - startTime
    };
  } catch (e) {
    console.error('[ContextAnalyzer] Groq error:', e.message);
    return generateHeuristicAnalysis(text, Date.now() - startTime);
  }
}

function generateHeuristicAnalysis(text, elapsedMs) {
  // Heuristic fallback when LLM fails
  const panicWords = /(?:đe dọa|khủng hoảng|hoảng loạn|tử vong|chết|tai nạn|nguy hiểm|cảnh báo|khẩn cấp)/gi;
  const manipulationWords = /(?:bạn sẽ|ai cũng|chắc chắn|cam kết|tuyệt đối|100%)/gi;
  const urgencyWords = /(?:ngay lập tức|tức khắc|click ngay|trong hôm nay|hết hạn)/gi;
  
  const panicMatches = text.match(panicWords) || [];
  const manipulationMatches = text.match(manipulationWords) || [];
  const urgencyMatches = text.match(urgencyWords) || [];
  
  return {
    panicIndex: Math.min(100, panicMatches.length * 15),
    manipulationScore: Math.min(100, manipulationMatches.length * 20),
    logicalFallacies: [],
    emotionalAppeals: [],
    credibilitySignals: [],
    redFlags: [...panicMatches.slice(0, 3), ...urgencyMatches.slice(0, 3)],
    summary: 'Phân tích heuristic do LLM không khả dụng',
    source: 'heuristic',
    executionTimeMs: elapsedMs
  };
}

module.exports = { analyzeContext, generateHeuristicAnalysis };
