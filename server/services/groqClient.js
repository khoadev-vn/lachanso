const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

let stats = { calls: 0, errors: 0, lastError: 0, lastErrorTime: 0 };

function isGroqConfigured() {
  return Boolean(GROQ_API_KEY);
}

async function groqChat(messages, options = {}) {
  if (!isGroqConfigured()) {
    console.warn('[Groq] Chưa cấu hình GROQ_API_KEY. Bỏ qua.');
    return null;
  }

  const {
    temperature = 0.2,
    maxTokens = 1200,
    jsonMode = false,
    timeout = 30000
  } = options;

  const payload = {
    model: GROQ_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  try {
    stats.calls++;
    const response = await axios.post(`${GROQ_BASE_URL}/chat/completions`, payload, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout
    });

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[Groq] Empty response from API.');
      return null;
    }

    if (jsonMode) {
      try {
        return JSON.parse(content);
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        console.error('[Groq] JSON parse error:', e.message);
        return null;
      }
    }
    return content.trim();
  } catch (error) {
    stats.errors++;
    stats.lastError = error.response?.status || 0;
    stats.lastErrorTime = Date.now();

    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`[Groq] Lỗi: ${errMsg} (status: ${error.response?.status || 'N/A'})`);
    return null;
  }
}

function getGroqStats() {
  return {
    configured: isGroqConfigured(),
    model: GROQ_MODEL,
    stats: { ...stats }
  };
}

module.exports = { groqChat, isGroqConfigured, getGroqStats, GROQ_MODEL };
