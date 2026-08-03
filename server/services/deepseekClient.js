const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

function isDeepSeekConfigured() {
  return Boolean(DEEPSEEK_API_KEY);
}

async function deepseekChat(messages, options = {}) {
  if (!isDeepSeekConfigured()) {
    console.warn('[DeepSeek] Chưa cấu hình DEEPSEEK_API_KEY. Đang chuyển sang chế độ dự phòng heuristic.');
    return null;
  }

  const {
    temperature = 0.2,
    maxTokens = 1200,
    jsonMode = false,
    timeout = 20000
  } = options;

  try {
    const payload = {
      model: DEEPSEEK_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    };
    if (jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const response = await axios.post(`${DEEPSEEK_BASE_URL}/chat/completions`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      timeout
    });

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) return null;

    if (jsonMode) {
      try {
        return JSON.parse(content);
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        console.error('[DeepSeek] Không thể parse JSON response:', e.message);
        return null;
      }
    }

    return content.trim();
  } catch (error) {
    console.error('[DeepSeek] API error:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

module.exports = {
  deepseekChat,
  isDeepSeekConfigured,
  DEEPSEEK_MODEL
};
