/**
 * Layer 6: Threat Feeder
 * Syncs new scam patterns to vector DB for future detection
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const THREAT_DB_FILE = path.join(DATA_DIR, 'threatDatabase.json');

// Load threat database
function loadThreatDB() {
  try {
    if (fs.existsSync(THREAT_DB_FILE)) {
      return JSON.parse(fs.readFileSync(THREAT_DB_FILE, 'utf8'));
    }
  } catch (e) {}
  return { patterns: [], lastUpdated: null };
}

// Save threat database
function saveThreatDB(db) {
  try {
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(THREAT_DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.warn('[ThreatFeeder] Failed to save threat DB:', e.message);
  }
}

// Add new threat pattern
function addThreatPattern(pattern) {
  const db = loadThreatDB();
  
  // Check for duplicates
  const exists = db.patterns.some(p => 
    p.text === pattern.text || 
    (p.hash && p.hash === pattern.hash)
  );
  
  if (!exists) {
    db.patterns.push({
      id: Date.now().toString(36),
      text: pattern.text,
      hash: pattern.hash || null,
      type: pattern.type || 'unknown',
      severity: pattern.severity || 'medium',
      addedAt: new Date().toISOString(),
      source: pattern.source || 'system',
      verified: false
    });
    
    saveThreatDB(db);
    return true;
  }
  return false;
}

// Learn from verified samples (from activeLearner)
function learnFromReview(sample, correctVerdict) {
  if (!sample || !correctVerdict) return false;
  
  const pattern = {
    text: sample.text,
    type: correctVerdict === 'FRAUD_CONFIRMED' ? 'fake_news' : 'legitimate',
    severity: correctVerdict === 'FRAUD_CONFIRMED' ? 'high' : 'low',
    source: 'human_review',
    originalScore: sample.score,
    originalVerdict: sample.verdict
  };
  
  return addThreatPattern(pattern);
}

// Check if text matches known threat patterns
function checkThreatDB(text) {
  const db = loadThreatDB();
  const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const matches = db.patterns.filter(p => {
    if (!p.text) return false;
    const normalizedPattern = p.text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedText.includes(normalizedPattern) || normalizedPattern.includes(normalizedText);
  });
  
  return {
    matches,
    hasMatch: matches.length > 0,
    highestSeverity: matches.reduce((max, m) => 
      m.severity === 'high' ? 'high' : max, 'low')
  };
}

// Get stats
function getStats() {
  const db = loadThreatDB();
  return {
    totalPatterns: db.patterns.length,
    verifiedPatterns: db.patterns.filter(p => p.verified).length,
    lastUpdated: db.lastUpdated,
    byType: db.patterns.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {})
  };
}

module.exports = { addThreatPattern, learnFromReview, checkThreatDB, getStats, loadThreatDB };
