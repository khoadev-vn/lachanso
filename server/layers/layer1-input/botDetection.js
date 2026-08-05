/**
 * Layer 1: Bot Detection & Rate Limiting
 * Uses Redis for token bucket rate limiting
 */

const Redis = require('ioredis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redis = null;
let redisAvailable = false;

function getRedis() {
  if (redis) return redis;
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
      connectTimeout: 3000
    });
    redis.on('connect', () => { redisAvailable = true; });
    redis.on('error', (err) => {
      if (redisAvailable) {
        console.warn('[Redis] Connection error:', err.message);
        redisAvailable = false;
      }
    });
    return redis;
  } catch (e) {
    console.warn('[Redis] Failed to create client:', e.message);
    return null;
  }
}

// Token bucket rate limiter
async function checkRateLimit(key, maxTokens = 30, refillRate = 1) {
  const r = getRedis();
  if (!r || !redisAvailable) return { allowed: true, remaining: maxTokens, source: 'memory' };

  const now = Date.now();
  const bucketKey = `ratelimit:${key}`;

  try {
    const pipeline = r.pipeline();
    pipeline.hgetall(bucketKey);
    const results = await pipeline.exec();
    const bucket = results[0][1] || {};

    let tokens = parseFloat(bucket.tokens) || maxTokens;
    let lastRefill = parseInt(bucket.lastRefill) || now;

    // Refill tokens
    const elapsed = (now - lastRefill) / 1000;
    tokens = Math.min(maxTokens, tokens + elapsed * refillRate);

    if (tokens >= 1) {
      tokens -= 1;
      const pipe2 = r.pipeline();
      pipe2.hset(bucketKey, 'tokens', tokens, 'lastRefill', now);
      pipe2.expire(bucketKey, 60);
      await pipe2.exec();
      return { allowed: true, remaining: Math.floor(tokens), source: 'redis' };
    } else {
      return { allowed: false, remaining: 0, retryAfter: Math.ceil((1 - tokens) / refillRate), source: 'redis' };
    }
  } catch (e) {
    console.warn('[RateLimit] Redis error:', e.message);
    return { allowed: true, remaining: maxTokens, source: 'memory-fallback' };
  }
}

// Bot fingerprint detection
function detectBotFingerprint(headers, body) {
  const signals = [];

  // Missing or suspicious User-Agent
  const ua = headers?.['user-agent'] || '';
  if (!ua) {
    signals.push({ type: 'missing_ua', severity: 'high' });
  } else if (/bot|crawler|spider|curl|wget|python|go-http/i.test(ua)) {
    signals.push({ type: 'bot_ua', severity: 'medium', detail: ua.substring(0, 50) });
  }

  // Check for rapid repeated requests
  if (body && typeof body === 'string' && body.length > 10000) {
    signals.push({ type: 'large_payload', severity: 'low', detail: `${body.length} bytes` });
  }

  // Missing Accept-Language header
  if (!headers?.['accept-language']) {
    signals.push({ type: 'missing_accept_language', severity: 'low' });
  }

  return {
    isBot: signals.some(s => s.severity === 'high'),
    confidence: signals.length > 0 ? Math.min(1, signals.length * 0.25) : 0,
    signals
  };
}

// Track suspicious IPs
async function trackSuspiciousIp(ip, reason) {
  const r = getRedis();
  if (!r || !redisAvailable) return;

  try {
    const key = `suspicious:${ip}`;
    await r.zadd(key, Date.now(), reason);
    await r.expire(key, 3600); // 1 hour TTL
  } catch (e) {
    // Silent fail
  }
}

async function isSuspiciousIp(ip) {
  const r = getRedis();
  if (!r || !redisAvailable) return false;

  try {
    const key = `suspicious:${ip}`;
    const count = await r.zcard(key);
    return count >= 5; // 5+ suspicious events = blocked
  } catch (e) {
    return false;
  }
}

module.exports = { checkRateLimit, detectBotFingerprint, trackSuspiciousIp, isSuspiciousIp };
