const { execFile } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const CUSTOM_GEMINI_API_KEY = process.env.CUSTOM_GEMINI_API_KEY || '';
const CUSTOM_GEMINI_BASE_URL = process.env.CUSTOM_GEMINI_BASE_URL || 'https://ai.aashutoshjoshi.com/v1';
const CUSTOM_GEMINI_MODEL = process.env.CUSTOM_GEMINI_MODEL || 'gemini-2.0-flash';

let stats = { calls: 0, errors: 0, lastErrorTime: 0, totalTokens: 0 };

function isCustomGeminiConfigured() {
  return Boolean(CUSTOM_GEMINI_API_KEY);
}

function customGeminiChat(messages, options = {}) {
  if (!isCustomGeminiConfigured()) {
    console.warn('[CustomGemini] Chưa cấu hình CUSTOM_GEMINI_API_KEY. Bỏ qua.');
    return null;
  }

  const {
    temperature = 0.2,
    maxTokens = 4096,
    jsonMode = false,
    timeout = 60,
    model = CUSTOM_GEMINI_MODEL
  } = options;

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false
  };

  const url = `${CUSTOM_GEMINI_BASE_URL}/chat/completions`;
  const payloadStr = JSON.stringify(payload);

  return new Promise((resolve) => {
    stats.calls++;
    execFile('curl', [
      '-s', '-m', String(Math.ceil(timeout / 1000)),
      '-X', 'POST', url,
      '-H', 'Authorization: Bearer ' + CUSTOM_GEMINI_API_KEY,
      '-H', 'Content-Type: application/json',
      '-H', 'Accept: application/json',
      '-d', payloadStr
    ], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        stats.errors++;
        stats.lastErrorTime = Date.now();
        console.error(`[CustomGemini] Lỗi: ${err.message}`);
        return resolve(null);
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (e) {
        console.error('[CustomGemini] Response parse error:', e.message, '— raw:', String(stdout).slice(0, 300));
        stats.errors++;
        return resolve(null);
      }

      const msg = parsed?.choices?.[0]?.message?.content;
      if (!msg) {
        console.warn('[CustomGemini] Empty response from API.');
        return resolve(null);
      }
      console.log('[CustomGemini] raw content (' + msg.length + '):', JSON.stringify(String(msg).slice(0, 500)));

      if (parsed?.usage?.total_tokens) {
        stats.totalTokens += parsed.usage.total_tokens;
      }

      if (jsonMode) {
        let cleaned = msg.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
        if (cleaned.startsWith('[')) {
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
        }
        try {
          return resolve(JSON.parse(cleaned));
        } catch (e) {
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) {
            try { return resolve(JSON.parse(match[0])); } catch (e2) {}
          }
          console.error('[CustomGemini] JSON parse error:', e.message, '— cleaned:', String(cleaned).slice(0, 300));
          return resolve(null);
        }
      }
      resolve(msg.trim());
    });
  });
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
