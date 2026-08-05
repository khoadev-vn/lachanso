/**
 * Layer 4: Fact Verifier (Groq-powered)
 * Strict JSON schema enforcement for fact verification
 */

const { groqChat } = require('../../services/groqClient');

const FACT_VERIFICATION_PROMPT = `Bạn là chuyên gia xác minh thông tin. So sánh đoạn tin với các bài báo được cung cấp và trả về JSON:

{
  "verdict": "confirmed" | "contradicted" | "unverified" | "partially_true",
  "confidence": <0-1>,
  "evidence": [
    {
      "claim": "tuyên bố trong đoạn tin",
      "status": "confirmed" | "contradicted" | "unverified",
      "source": "nguồn xác nhận/bác bỏ",
      "detail": "giải thích ngắn gọn"
    }
  ],
  "numeric_mismatches": [
    {
      "claim": "số liệu trong tin",
      "actual": "số liệu thực tế từ bài báo",
      "source": "nguồn"
    }
  ],
  "summary": "Tóm tắt kết quả trong 1 câu"
}

Quy tắc:
1. Nếu đoạn tin chứa số liệu khác bài báo → verdict = "contradicted"
2. Nếu đoạn tin trích nguồn nhưng không có URL → ghi nhận
3. Nếu không tìm thấy bài báo liên quan → verdict = "unverified"
4. Chỉ trả JSON, không giải thích thêm`;

async function verifyFact(text, articles = []) {
  const startTime = Date.now();
  
  try {
    const truncatedText = text.substring(0, 1500);
    const articleList = articles.slice(0, 5).map((a, i) => 
      `#${i} [${a.source || 'unknown'}] ${a.title || 'No title'} | ${(a.snippet || a.description || '').substring(0, 150)}`
    ).join('\n');
    
    if (!articleList) {
      return {
        verdict: 'unverified',
        confidence: 0.2,
        evidence: [],
        numericMismatches: [],
        summary: 'Không tìm thấy bài báo để đối chiếu',
        source: 'groq',
        executionTimeMs: Date.now() - startTime
      };
    }
    
    const result = await groqChat([
      { role: 'system', content: FACT_VERIFICATION_PROMPT },
      { role: 'user', content: `ĐOẠN TIN:\n${truncatedText}\n\nBÀI BÁO:\n${articleList}` }
    ], {
      jsonMode: true,
      maxTokens: 1000,
      timeout: 20000
    });
    
    if (!result || typeof result !== 'object') {
      return {
        verdict: 'unverified',
        confidence: 0.3,
        evidence: [],
        numericMismatches: [],
        summary: 'LLM trả kết quả không hợp lệ',
        source: 'groq-fallback',
        executionTimeMs: Date.now() - startTime
      };
    }
    
    return {
      verdict: result.verdict || 'unverified',
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      evidence: Array.isArray(result.evidence) ? result.evidence : [],
      numericMismatches: Array.isArray(result.numeric_mismatches) ? result.numeric_mismatches : [],
      summary: result.summary || '',
      source: 'groq',
      executionTimeMs: Date.now() - startTime
    };
  } catch (e) {
    console.error('[FactVerifier] Groq error:', e.message);
    return {
      verdict: 'unverified',
      confidence: 0.2,
      evidence: [],
      numericMismatches: [],
      summary: 'Lỗi khi gọi LLM',
      source: 'error',
      executionTimeMs: Date.now() - startTime
    };
  }
}

module.exports = { verifyFact };
