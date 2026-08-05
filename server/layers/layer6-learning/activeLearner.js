/**
 * Layer 6: Active Learning
 * Collects high-uncertainty samples for human review
 */

const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const REVIEW_QUEUE_FILE = path.join(DATA_DIR, 'reviewQueue.json');

let redis = null;
function getRedis() {
  if (redis) return redis;
  try {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true, connectTimeout: 3000 });
    return redis;
  } catch (e) {
    return null;
  }
}

// Load review queue from disk
function loadReviewQueue() {
  try {
    if (fs.existsSync(REVIEW_QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(REVIEW_QUEUE_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

// Save review queue to disk
function saveReviewQueue(queue) {
  try {
    fs.writeFileSync(REVIEW_QUEUE_FILE, JSON.stringify(queue.slice(-500), null, 2)); // Keep last 500
  } catch (e) {}
}

// Check if sample should be queued for review
function shouldReview(input, result) {
  const { score, confidence } = result;
  
  // High uncertainty: score near 50 with low confidence
  const isUncertain = Math.abs(score - 50) < 15 && confidence.confidence < 0.5;
  
  // Conflicting signals: high keyword score but trusted source
  const hasConflict = (input.keywordScan?.totalPenalty > 30) && (input.trustedVerification?.trustedCount > 0);
  
  // New pattern detected
  const hasNewPattern = input.patterns?.homoglyphs?.length > 0 || input.patterns?.clickbait?.length > 2;
  
  return isUncertain || hasConflict || hasNewPattern;
}

// Queue sample for review
async function queueForReview(input, result, reason) {
  const sample = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    text: (input.originalText || input.normalizedText || '').substring(0, 500),
    score: result.score,
    verdict: result.verdict,
    confidence: result.confidence?.confidence,
    reason,
    timestamp: new Date().toISOString(),
    reviewed: false
  };
  
  // Try Redis first
  const r = getRedis();
  if (r) {
    try {
      await r.lpush('review:queue', JSON.stringify(sample));
      await r.ltrim('review:queue', 0, 499);
      return sample.id;
    } catch (e) {}
  }
  
  // Fallback to file
  const queue = loadReviewQueue();
  queue.push(sample);
  saveReviewQueue(queue);
  return sample.id;
}

// Get pending reviews
async function getPendingReviews(limit = 50) {
  const r = getRedis();
  if (r) {
    try {
      const items = await r.lrange('review:queue', 0, limit - 1);
      return items.map(i => JSON.parse(i));
    } catch (e) {}
  }
  
  return loadReviewQueue().filter(s => !s.reviewed).slice(0, limit);
}

// Mark sample as reviewed
async function markReviewed(sampleId, verdict, notes) {
  const r = getRedis();
  if (r) {
    try {
      const items = await r.lrange('review:queue', 0, -1);
      for (let i = 0; i < items.length; i++) {
        const item = JSON.parse(items[i]);
        if (item.id === sampleId) {
          item.reviewed = true;
          item.reviewedVerdict = verdict;
          item.reviewedNotes = notes;
          item.reviewedAt = new Date().toISOString();
          await r.lset('review:queue', i, JSON.stringify(item));
          break;
        }
      }
    } catch (e) {}
  }
}

module.exports = { shouldReview, queueForReview, getPendingReviews, markReviewed };
