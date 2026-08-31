const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { deepseekChat } = require('./deepseekClient');
const { geminiChat, isGeminiConfigured, getKeyCount, getKeyStats, GEMINI_MODEL } = require('./geminiClient');
const { groqChat, isGroqConfigured, getGroqStats, GROQ_MODEL } = require('./groqClient');
const { openrouterChat, isOpenRouterConfigured, getOpenRouterStats } = require('./openrouterClient');
const { customGeminiChat, isCustomGeminiConfigured, getCustomGeminiStats } = require('./customGeminiClient');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';
const OLLAMA_COMPARE_MODEL = process.env.OLLAMA_COMPARE_MODEL || OLLAMA_MODEL;
const OLLAMA_FORCE_CPU = String(process.env.OLLAMA_FORCE_CPU || '').toLowerCase() === 'true';

let ollamaStatus = null;
let ollamaCheckPromise = null;
let lastCheck = 0;
const OLLAMA_CHECK_TTL = 30000;

const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000;

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function getCacheKey(messages, model) {
  return hashString(model + '|' + JSON.stringify(messages));
}

async function checkOllama(force = false) {
  const now = Date.now();
  if (!force && ollamaStatus !== null && now - lastCheck < OLLAMA_CHECK_TTL) {
    return ollamaStatus;
  }
  if (ollamaCheckPromise) return ollamaCheckPromise;

  ollamaCheckPromise = (async () => {
    try {
      const res = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 3000 });
      const models = (res.data && res.data.models) || [];
      ollamaStatus = {
        available: true,
        models: models.map((m) => m.name),
        modelReady: models.some((m) => {
          const name = typeof m === 'string' ? m : m?.name;
          return name === OLLAMA_MODEL || (name && name.startsWith(OLLAMA_MODEL.split(':')[0]));
        })
      };
      console.log(`[LLM Client] Ollama OK tại ${OLLAMA_BASE_URL}. Model có sẵn: ${ollamaStatus.models.join(', ') || '(chưa pull model)'}`);
    } catch (e) {
      ollamaStatus = { available: false, models: [], modelReady: false };
      console.warn(`[LLM Client] Ollama không truy cập được tại ${OLLAMA_BASE_URL}: ${e.message}`);
    }
    lastCheck = Date.now();
    return ollamaStatus;
  })();

  const result = await ollamaCheckPromise;
  ollamaCheckPromise = null;
  return result;
}

async function ollamaChat(messages, options = {}) {
  const { temperature = 0.2, maxTokens = 1200, jsonMode = false, timeout = 120000, model } = options;
  const activeModel = model || OLLAMA_MODEL;

  const buildPayload = (forceCpu = false) => {
    const payload = {
      model: activeModel,
      messages,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens
      }
    };
    if (jsonMode) {
      payload.format = 'json';
    }
    if (forceCpu || OLLAMA_FORCE_CPU) {
      payload.options.num_gpu = 0;
    }
    return payload;
  };

  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, buildPayload(false), { timeout });
    return parseOllamaResponse(response, jsonMode);
  } catch (error) {
    const shouldRetryCpu = !/num_gpu|overrun|CUDA|PTX|toolchain/i.test(String(error.response?.data?.error || error.message));
    if (shouldRetryCpu) {
      console.error('[LLM Client] Ollama chat lỗi:', error.response?.data?.error || error.message);
      return null;
    }
    console.warn('[LLM Client] GPU lỗi (CUDA/PTX), thử lại bằng CPU...');
    try {
      const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, buildPayload(true), { timeout });
      return parseOllamaResponse(response, jsonMode);
    } catch (retryError) {
      console.error('[LLM Client] Ollama chat (CPU) lỗi:', retryError.response?.data?.error || retryError.message);
      return null;
    }
  }
}

function parseOllamaResponse(response, jsonMode) {
  const content = response.data && response.data.message && response.data.message.content;
  if (!content) return null;

  if (jsonMode) {
    try {
      return JSON.parse(content);
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      console.error('[LLM Client] Ollama JSON parse lỗi:', e.message);
      return null;
    }
  }
  return content.trim();
}

async function llmChat(messages, options = {}) {
  const modelForCache = options.model || OLLAMA_MODEL;
  const cacheKey = getCacheKey(messages, modelForCache + (options.jsonMode ? ':json' : ''));
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    console.log('[LLM Client] Cache hit.');
    return cached.value;
  }

  let result = null;
  let mode = null;

  // 1. Custom Gemini (primary — mạnh nhất, unlimited tokens)
  if (!result && isCustomGeminiConfigured()) {
    result = await customGeminiChat(messages, options);
    if (result) mode = 'custom-gemini';
  }

  // 2. OpenRouter free (NVIDIA Nemotron) — nhanh, miễn phí, giỏi tiếng Việt
  //    Bỏ qua khi preferFastProvider (warmup) — OpenRouter hay trả reasoning text không JSON.
  if (!result && isOpenRouterConfigured() && !options.preferFastProvider) {
    result = await openrouterChat(messages, options);
    if (result) mode = 'openrouter';
  }

  // 3. Try Groq first (fast, 280 tok/s)
  if (!result && isGroqConfigured()) {
    result = await groqChat(messages, options);
    if (result) mode = 'groq';
  }

  // 4. Try Gemini (round-robin keys, good Vietnamese)
  if (!result && isGeminiConfigured()) {
    result = await geminiChat(messages, options);
    if (result) mode = 'gemini';
  }

  // 5. Fallback to DeepSeek
  if (!result) {
    result = await deepseekChat(messages, options);
    if (result) mode = 'deepseek';
  }

  // 6. Fallback to Ollama (local, free)
  if (!result) {
    const ollama = await checkOllama();
    if (ollama.available) {
      const requestedModel = options.model || OLLAMA_MODEL;
      const baseName = requestedModel ? requestedModel.split(':')[0] : '';
      const hasModel = ollama.models.some((m) => {
        const name = typeof m === 'string' ? m : m?.name;
        return name === requestedModel || (baseName && name?.startsWith(baseName));
      });
      if (hasModel) {
        result = await ollamaChat(messages, options);
        if (result) mode = 'ollama';
      }
    }
  }

  if (result && mode) {
    cache.set(cacheKey, { value: result, expires: Date.now() + CACHE_TTL });
    console.log(`[LLM Client] Xử lý bằng ${mode}.`);
  }

  return result;
}

async function getLLMStatus() {
  const ollama = await checkOllama(true);
  return {
    customGemini: getCustomGeminiStats(),
    openrouter: getOpenRouterStats(),
    groq: getGroqStats(),
    ollama: {
      baseUrl: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL,
      available: ollama.available,
      modelReady: ollama.modelReady,
      models: ollama.models
    },
    gemini: {
      configured: isGeminiConfigured(),
      keyCount: getKeyCount(),
      model: GEMINI_MODEL,
      stats: getKeyStats()
    },
    deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
    enabled: isCustomGeminiConfigured() || isOpenRouterConfigured() || isGroqConfigured() || ollama.available || isGeminiConfigured() || Boolean(process.env.DEEPSEEK_API_KEY)
  };
}

async function isLLMConfigured() {
  const ollama = await checkOllama();
  return isCustomGeminiConfigured() || isOpenRouterConfigured() || isGroqConfigured() || ollama.available || isGeminiConfigured() || Boolean(process.env.DEEPSEEK_API_KEY);
}

module.exports = {
  llmChat,
  isLLMConfigured,
  getLLMStatus,
  OLLAMA_MODEL,
  OLLAMA_COMPARE_MODEL,
  OLLAMA_BASE_URL
};
