const KeywordExtractor = require('./keywordExtractor');
const { llmChat } = require('./llmClient');

class QueryGenerator {
  static async generateSearchQuery(text) {
    console.log("[LCS AI] Đang phân tích cú pháp để tóm tắt sự kiện...");

    const llmQuery = await this.generateWithDeepSeek(text);
    if (llmQuery) {
      return llmQuery;
    }

    return this.generateWithHeuristic(text);
  }

  static async generateWithDeepSeek(text) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'Bạn là chuyên gia tạo truy vấn tìm kiếm tin tức tiếng Việt. Hãy rút gọn sự kiện trong đoạn văn bản thành MỘT truy vấn tìm kiếm ngắn (5-8 từ, gồm: nhân vật/tổ chức/địa danh quan trọng + hành động chính). Không thêm dấu câu, không thêm từ thừa. Chỉ trả về JSON: {"query": "..."}'
        },
        {
          role: 'user',
          content: `Đoạn văn bản cần tìm kiếm:\n"""\n${text.substring(0, 1500)}\n"""`
        }
      ];

      const result = await llmChat(messages, { jsonMode: true, maxTokens: 120, timeout: 60000 });
      if (result && typeof result.query === 'string' && result.query.trim().length >= 3) {
        console.log(`[DeepSeek Query] ${result.query}`);
        return result.query.trim();
      }
      return null;
    } catch (error) {
      console.error('[DeepSeek Query] Lỗi:', error.message);
      return null;
    }
  }

  static async generateWithHeuristic(text) {
    try {
      const extracted = await KeywordExtractor.extractKeywords(text);
      let entities = extracted.searchKeywords || [];

      const actionKeywords = [
        'phát hiện', 'bắt giữ', 'khởi tố', 'cháy', 'tai nạn',
        'đình chỉ', 'lừa đảo', 'xâm nhập', 'đóng băng', 'phong tỏa',
        'tịch thu', 'đảo chính', 'cá sấu', 'tử vong', 'nhập viện'
      ];

      let foundActions = [];
      let lowerText = text.toLowerCase();

      for (let action of actionKeywords) {
        if (lowerText.includes(action)) {
          foundActions.push(action);
        }
      }

      if (entities.length === 0 && foundActions.length === 0) {
        return null;
      }

      let queryParts = [];

      if (foundActions.length > 0) {
        queryParts.push(...foundActions.slice(0, 2));
      }

      if (entities.length > 0) {
        const cleanEntities = entities.filter((e) => e.split(' ').length <= 3).slice(0, 3);
        queryParts.push(...cleanEntities);
      }

      return queryParts.join(' ').trim();
    } catch (error) {
      console.error("[LCS AI] Lỗi phân tích cụm từ:", error);
      return null;
    }
  }
}

module.exports = QueryGenerator;
