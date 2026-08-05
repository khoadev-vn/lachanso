const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
].filter(Boolean);

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

let currentIndex = 0;
const keyStats = GEMINI_API_KEYS.map((_, i) => ({ index: i, calls: 0, errors: 0, lastError: 0 }));

function getNextKey() {
  if (GEMINI_API_KEYS.length === 0) return null;
  const key = GEMINI_API_KEYS[currentIndex];
  currentIndex = (currentIndex + 1) % GEMINI_API_KEYS.length;
  return key;
}

function isGeminiConfigured() {
  return GEMINI_API_KEYS.length > 0;
}

function getKeyCount() {
  return GEMINI_API_KEYS.length;
}

async function geminiChat(messages, options = {}) {
  if (!isGeminiConfigured()) {
    console.warn('[Gemini] Chưa cấu hình GEMINI_API_KEY. Bỏ qua.');
    return null;
  }

  const {
    temperature = 0.2,
    maxTokens = 1200,
    jsonMode = false,
    timeout = 30000
  } = options;

  // Convert messages to Gemini format
  const contents = [];
  let systemInstruction = null;

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  }

  if (contents.length === 0) {
    console.warn('[Gemini] No user messages found.');
    return null;
  }

  // Try each key with round-robin
  const maxRetries = Math.min(GEMINI_API_KEYS.length, 3);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getNextKey();
    if (!apiKey) return null;

    const keyIndex = GEMINI_API_KEYS.indexOf(apiKey);
    keyStats[keyIndex].calls++;

    try {
      const payload = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = systemInstruction;
      }

      if (jsonMode) {
        payload.generationConfig.responseMimeType = 'application/json';
      }

      const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

      const response = await axios.post(url, payload, { timeout });

      const candidate = response.data?.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text;

      if (!content) {
        console.warn('[Gemini] Empty response from API.');
        continue;
      }

      if (jsonMode) {
        try {
          return JSON.parse(content);
        } catch (e) {
          const match = content.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
          console.error('[Gemini] JSON parse error:', e.message);
          return null;
        }
      }

      return content.trim();

    } catch (error) {
      keyStats[keyIndex].errors++;
      keyStats[keyIndex].lastError = Date.now();

      const status = error.response?.status;
      const errMsg = error.response?.data?.error?.message || error.message;

      console.error(`[Gemini] Key #${keyIndex + 1} error (${status}): ${errMsg}`);

      // Rate limited — try next key
      if (status === 429) {
        console.warn(`[Gemini] Rate limited on key #${keyIndex + 1}, trying next...`);
        continue;
      }

      // Quota exceeded — try next key
      if (status === 403 || errMsg.includes('quota')) {
        console.warn(`[Gemini] Quota exceeded on key #${keyIndex + 1}, trying next...`);
        continue;
      }

      // Other errors — don't retry
      return null;
    }
  }

  console.error('[Gemini] All keys exhausted or failed.');
  return null;
}

function getKeyStats() {
  return keyStats.map((s, i) => ({
    index: i + 1,
    configured: Boolean(GEMINI_API_KEYS[i]),
    calls: s.calls,
    errors: s.errors,
    lastError: s.lastError ? new Date(s.lastError).toISOString() : null
  }));
}

module.exports = {
  geminiChat,
  isGeminiConfigured,
  getKeyCount,
  getKeyStats,
  GEMINI_MODEL
};
