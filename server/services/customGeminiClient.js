const axios = require('axios');
const http = require('http');
const https = require('https');
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
    max_tokens: maxTokens,
    stream: false
  };

  // NOTE: response_format: json_object causes proxy truncation — rely on prompt instead

  try {
    stats.calls++;
    const url = new URL(`${CUSTOM_GEMINI_BASE_URL}/chat/completions`);
    const postData = JSON.stringify(payload);

    const content = await new Promise((resolve, reject) => {
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;
      const req = transport.request({
        hostname: url.hostname,
        port: url.port ? parseInt(url.port, 10) : (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CUSTOM_GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(postData);
      req.end();
    });

    let parsed;
    try { parsed = JSON.parse(content); } catch (e) {
      console.error('[CustomGemini] Response parse error:', e.message, '— raw:', String(content).slice(0, 300));
      stats.errors++;
      return null;
    }

    const msg = parsed?.choices?.[0]?.message?.content;
    if (!msg) {
      console.warn('[CustomGemini] Empty response from API.');
      return null;
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
        return JSON.parse(cleaned);
      } catch (e) {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try { return JSON.parse(match[0]); } catch (e2) {}
        }
        console.error('[CustomGemini] JSON parse error:', e.message, '— cleaned:', String(cleaned).slice(0, 300));
        return null;
      }
    }
    return msg.trim();
  } catch (error) {
    stats.errors++;
    stats.lastErrorTime = Date.now();
    console.error(`[CustomGemini] Lỗi: ${error.message}`);
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
