const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const CUSTOM_GEMINI_API_KEY = process.env.CUSTOM_GEMINI_API_KEY || '';
const CUSTOM_GEMINI_BASE_URL = process.env.CUSTOM_GEMINI_BASE_URL || 'https://ai.aashutoshjoshi.com/v1';
const CUSTOM_GEMINI_MODEL = process.env.CUSTOM_GEMINI_MODEL || 'gemini-2.0-flash';

let stats = { calls: 0, errors: 0, lastError: 0, lastErrorTime: 0, totalTokens: 0 };

function isCustomGeminiConfigured() {
  return Boolean(CUSTOM_GEMINI_API_KEY);
}

async function customGeminiChat(messages, options = {}) {
  if (!isCustomGeminiConfigured()) {
    console.warn('[CustomGemini] Chưa cấu hình CUSTOM_GEMINI_API_KEY. Bỏ qua.');
    return null;
  }

  const {
    temperature = 0.2,
    maxTokens = 4096,
    jsonMode = false,
    timeout = 60000,
    model = CUSTOM_GEMINI_MODEL
  } = options;

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  try {
    stats.calls++;
    const response = await axios.post(`${CUSTOM_GEMINI_BASE_URL}/chat/completions`, payload, {
      headers: {
        'Authorization': `Bearer ${CUSTOM_GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout
    });

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[CustomGemini] Empty response from API.');
      return null;
    }

    if (response.data?.usage?.total_tokens) {
      stats.totalTokens += response.data.usage.total_tokens;
    }

    if (jsonMode) {
      try {
        return JSON.parse(content);
      } catch (e) {
        // Strip markdown code blocks: ```json ... ``` or ``` ... ```
        let cleaned = content.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
        try {
          return JSON.parse(cleaned);
        } catch (e2) {
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
          console.error('[CustomGemini] JSON parse error:', e.message, '— raw:', String(content).slice(0, 200));
          return null;
        }
      }
    }
    return content.trim();
  } catch (error) {
    stats.errors++;
    stats.lastError = error.response?.status || 0;
    stats.lastErrorTime = Date.now();
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`[CustomGemini] Lỗi: ${errMsg} (status: ${error.response?.status || 'N/A'})`);
    return null;
  }
}

function getCustomGeminiStats() {
  return {
    configured: isCustomGeminiConfigured(),
    baseUrl: CUSTOM_GEMINI_BASE_URL,
    model: CUSTOM_GEMINI_MODEL,
    stats: { ...stats }
  };
}

module.exports = { customGeminiChat, isCustomGeminiConfigured, getCustomGeminiStats, CUSTOM_GEMINI_MODEL };
