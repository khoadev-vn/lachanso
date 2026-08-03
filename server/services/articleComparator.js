const { llmChat, isLLMConfigured, OLLAMA_COMPARE_MODEL } = require('./llmClient');

function parseJsonContent(content) {
  if (!content) return null;
  if (typeof content === 'object') return content;
  const str = String(content).trim();
  try {
    return JSON.parse(str);
  } catch (e) {
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

const SYSTEM_PROMPT = `Bạn là chuyên gia kiểm chứng tin tức tiếng Việt. So sánh ĐOẠN TIN GỐC với TỪNG bài báo. Chỉ gán MỘT nhãn duy nhất cho mỗi bài:
- "supporting": bài báo xác nhận/ủng hộ/trùng khớp nội dung đoạn tin (xác nhận, đúng, khớp, theo nguồn, diễn ra).
- "contradicting": bài báo bác bỏ/mâu thuẫn/phủ nhận (bác bỏ, phủ nhận, lên tiếng, không đúng, không phải, cảnh báo giả mạo, thông tin sai, không có chuyện đó).
- "neutral": liên quan nhưng không khẳng định cũng không bác bỏ.
- "unrelated": không liên quan thực sự.

Trả về JSON RẤT NGẮN: {"articles":[{"id":0,"stance":"supporting","reason":"1 câu ngắn tiếng Việt"}]}. Gán stance cho ĐỦ mọi bài trong danh sách, KHÔNG bỏ sót bài nào. reason tối đa 15 từ.`;

class ArticleComparator {
  static normalizeStance(raw) {
    if (!raw) return 'neutral';
    let s = String(raw).toLowerCase().trim();

    const tokens = s.split(/[|,;]/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length > 1) {
      s = tokens[0];
    }

    const vietnameseSupport = ['xác nhận', 'trùng khớp', 'khớp với', 'đúng như', 'theo đúng', 'diễn ra đúng', 'ủng hộ', 'đồng tình', 'xác minh'];
    const vietnameseContradict = ['bác bỏ', 'phủ nhận', 'lên tiếng', 'không đúng', 'không phải', 'không có chuyện', 'cảnh báo giả', 'thông tin sai', 'sai sự thật', 'giả mạo', 'phản đối', 'bịa đặt'];

    if (vietnameseSupport.some((k) => s.includes(k)) && !vietnameseContradict.some((k) => s.includes(k))) {
      return 'supporting';
    }
    if (vietnameseContradict.some((k) => s.includes(k))) {
      return 'contradicting';
    }

    if (s.includes('support') || s.includes('confirm') || s.includes('positive') || s.includes('true') || s.includes('same')) {
      return 'supporting';
    }
    if (s.includes('contradict') || s.includes('negat') || s.includes('deny') || s.includes('false') || s.includes('oppos')) {
      return 'contradicting';
    }
    if (s.includes('unrelat') || s.includes('off-topic') || s.includes('no relation') || s.includes('không liên quan')) {
      return 'unrelated';
    }
    if (s.includes('neutral') || s.includes('unknown') || s.includes('maybe')) {
      return 'neutral';
    }
    return 'neutral';
  }

  static async compare(text, articles) {
    if (!(await isLLMConfigured())) {
      return { mode: 'heuristic', articles: articles.map((a) => ({ ...a, stance: 'neutral' })), summary: null };
    }

    if (!articles || articles.length === 0) {
      return { mode: 'ollama', articles: [], summary: null };
    }

    const batchSize = 6;
    const results = [];

    try {
      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);

        const articleList = batch.map((a, idx) => ({
          id: i + idx,
          title: (a.title || '').substring(0, 120),
          description: (a.description || '').substring(0, 180),
          source: a.source || ''
        })).map((a) => `#${a.id} [${a.source}] ${a.title}${a.description ? ' | ' + a.description : ''}`).join('\n');

        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `ĐOẠN TIN GỐC:\n"""\n${text.substring(0, 600)}\n"""\n\nDANH SÁCH BÀI BÁO:\n${articleList}\n\nHãy gán stance cho ĐỦ ${batch.length} bài.`
          }
        ];

        const parsed = await llmChat(messages, {
          jsonMode: false,
          maxTokens: 260,
          timeout: 15000,
          model: OLLAMA_COMPARE_MODEL
        });
        const json = parseJsonContent(parsed);
        if (json && Array.isArray(json.articles)) {
          results.push(...json.articles);
        } else {
          console.warn('[ArticleComparator] LLM trả kết quả không đúng định dạng, batch bỏ qua.');
        }
      }
    } catch (error) {
      console.error('[ArticleComparator] Lỗi khi gọi LLM:', error.message);
      return { mode: 'heuristic', articles: articles.map((a) => ({ ...a, stance: 'neutral' })), summary: null };
    }

    const stanceById = new Map(results.map((r) => [r.id, r]));

    const compared = articles.map((article, idx) => {
      const verdict = stanceById.get(idx);
      return {
        ...article,
        stance: verdict?.stance ? this.normalizeStance(verdict.stance) : 'neutral',
        aiReason: verdict?.reason || ''
      };
    });

    const summary = this.buildSummary(text, compared);
    return { mode: 'ollama', articles: compared, summary };
  }

  static buildSummary(text, articles) {
    const counts = { supporting: 0, contradicting: 0, neutral: 0, unrelated: 0 };
    for (const a of articles) {
      const stance = ['supporting', 'contradicting', 'neutral', 'unrelated'].includes(a.stance) ? a.stance : 'neutral';
      counts[stance] += 1;
    }

    const supporting = articles.filter((a) => a.stance === 'supporting');
    const contradicting = articles.filter((a) => a.stance === 'contradicting');

    let verdict;
    let confidence = 0;
    const total = articles.length || 1;

    if (contradicting.length > supporting.length && contradicting.length >= 2) {
      verdict = 'contradicted';
      confidence = contradicting.length / total;
    } else if (supporting.length >= 2 && supporting.length >= contradicting.length * 2) {
      verdict = 'supported';
      confidence = supporting.length / total;
    } else {
      verdict = 'inconclusive';
      confidence = Math.max(supporting.length, contradicting.length) / total;
    }

    return {
      verdict,
      confidence: Math.round(confidence * 100) / 100,
      counts,
      supportingSources: supporting.map((a) => a.source).filter(Boolean).slice(0, 5),
      contradictingSources: contradicting.map((a) => a.source).filter(Boolean).slice(0, 5),
      totalCompared: articles.length
    };
  }
}

module.exports = ArticleComparator;
