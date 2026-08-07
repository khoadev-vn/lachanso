const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const BASE_URL = 'https://openrouter.ai/api/v1';

// Ưu tiên dùng trong chuỗi OpenRouter: model free phân loại nhanh → model mạnh hơn.
// Mỗi client có thể tự chọn MODEL riêng; khi gọi openrouterChat ta có thể truyền model.
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
const SAFETY_MODEL = process.env.OPENROUTER_SAFETY_MODEL || 'nvidia/nemotron-3.5-content-safety:free';

let stats = { calls: 0, errors: 0, lastError: 0, lastErrorTime: 0 };

function isOpenRouterConfigured() {
  return Boolean(OPENROUTER_API_KEY);
}

/**
 * Gọi OpenRouter chat completions.
 * @param {Array} messages - [{role, content}]
 * @param {object} options - { temperature, maxTokens, model, timeout, jsonMode, reasoning }
 */
async function openrouterChat(messages, options = {}) {
  if (!isOpenRouterConfigured()) {
    console.warn('[OpenRouter] Chưa cấu hình OPENROUTER_API_KEY. Bỏ qua.');
    return null;
  }

  const {
    temperature = 0.2,
    maxTokens = 1024,
    jsonMode = false,
    timeout = 45000,
    model = DEFAULT_MODEL
  } = options;

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  // Content-Safety (guardrail) không hỗ trợ JSON mode, chỉ dùng text thô.
  if (jsonMode && model !== SAFETY_MODEL) {
    payload.response_format = { type: 'json_object' };
  }

  // HTTP REFERER + title tốt cho chính sách OpenRouter (miễn phí khi đăng ký site)
  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.APP_URL || 'https://lachansovn-seven.vercel.app',
    'X-Title': process.env.APP_NAME || 'LaChanSo'
  };

  try {
    stats.calls++;
    const response = await axios.post(`${BASE_URL}/chat/completions`, payload, { headers, timeout });
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[OpenRouter] Empty response.');
      return null;
    }

    if (jsonMode) {
      try {
        return JSON.parse(content);
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        console.error('[OpenRouter] JSON parse error:', e.message, '— raw:', String(content).slice(0, 300));
        return null;
      }
    }
    return content.trim();
  } catch (error) {
    stats.errors++;
    stats.lastError = error.response?.status || 0;
    stats.lastErrorTime = Date.now();
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`[OpenRouter] Lỗi ${model}: ${errMsg} (status: ${error.response?.status || 'N/A'})`);
    return null;
  }
}

function getOpenRouterStats() {
  return {
    configured: isOpenRouterConfigured(),
    model: DEFAULT_MODEL,
    safetyModel: SAFETY_MODEL,
    stats: { ...stats }
  };
}

module.exports = {
  openrouterChat, isOpenRouterConfigured, getOpenRouterStats,
  OPENROUTER_MODEL: DEFAULT_MODEL, OPENROUTER_SAFETY_MODEL: SAFETY_MODEL
};