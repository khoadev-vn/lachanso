/**
 * Layer 2: Keyword Scanner (Aho-Corasick Multi-Pattern Matcher)
 * Scans text against multiple keyword groups simultaneously
 */

const fs = require('fs');
const path = require('path');

// Load keyword groups
const keywordsPath = path.join(__dirname, '..', '..', 'data', 'keywords.json');
let keywordGroups = {};
try {
  keywordGroups = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
} catch (e) {
  console.warn('[KeywordScanner] Failed to load keywords.json:', e.message);
}

// Simple Aho-Corasick implementation for Vietnamese text
class AhoCorasick {
  constructor() {
    this.trie = {};
    this.output = {};
    this.fail = {};
    this.patterns = new Map();
  }

  addPattern(pattern, id, groupId, penalty) {
    let node = this.trie;
    const normalized = this.normalize(pattern);
    for (const char of normalized) {
      if (!node[char]) node[char] = {};
      node = node[char];
    }
    if (!this.output[node]) this.output[node] = [];
    this.output[node].push({ id, groupId, penalty, pattern });
    this.patterns.set(id, { pattern, groupId, penalty });
  }

  normalize(text) {
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  build() {
    const queue = [];
    this.fail = {};

    // Initialize depth-1 nodes
    for (const char in this.trie) {
      this.fail[this.trie[char]] = this.trie;
      queue.push(this.trie[char]);
    }

    // BFS to build failure links
    while (queue.length > 0) {
      const current = queue.shift();
      for (const char in current) {
        const child = current[char];
        let failNode = this.fail[current];
        while (failNode && !failNode[char]) {
          failNode = this.fail[failNode];
        }
        this.fail[child] = failNode ? failNode[char] : this.trie;
        
        if (this.output[this.fail[child]]) {
          this.output[child] = [...(this.output[child] || []), ...this.output[this.fail[child]]];
        }
        queue.push(child);
      }
    }
  }

  search(text) {
    const normalized = this.normalize(text);
    const matches = [];
    let node = this.trie;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      while (node && !node[char]) {
        node = this.fail[node];
      }
      node = node ? node[char] : this.trie;
      
      if (node && this.output[node]) {
        for (const match of this.output[node]) {
          matches.push({
            ...match,
            position: i - match.pattern.length + 1,
            context: text.substring(Math.max(0, i - 30), Math.min(text.length, i + 30))
          });
        }
      }
    }

    return matches;
  }
}

let ahoCorasickInstance = null;
let ahoCorasickReady = false;

function buildAhoCorasick() {
  if (ahoCorasickReady) return;
  
  const startTime = Date.now();
  ahoCorasickInstance = new AhoCorasick();
  
  for (const [groupId, group] of Object.entries(keywordGroups)) {
    if (!group.keywords || !Array.isArray(group.keywords)) continue;
    
    for (const keyword of group.keywords) {
      const id = `${groupId}_${keyword.replace(/\s+/g, '_').substring(0, 20)}`;
      ahoCorasickInstance.addPattern(
        keyword,
        id,
        groupId,
        group.weight || 10
      );
    }
  }
  
  ahoCorasickInstance.build();
  ahoCorasickReady = true;
  console.log(`[KeywordScanner] Built Aho-Corasick in ${Date.now() - startTime}ms`);
}

function scanText(text) {
  if (!ahoCorasickReady) buildAhoCorasick();
  
  const matches = ahoCorasickInstance.search(text);
  
  // Deduplicate and aggregate by group
  const groupMatches = new Map();
  for (const match of matches) {
    if (!groupMatches.has(match.groupId)) {
      groupMatches.set(match.groupId, {
        groupId: match.groupId,
        matches: [],
        totalPenalty: 0,
        severity: 'warning'
      });
    }
    const group = groupMatches.get(match.groupId);
    group.matches.push(match);
    group.totalPenalty += match.penalty;
  }

  // Determine severity
  for (const group of groupMatches.values()) {
    if (group.totalPenalty >= 50) group.severity = 'danger';
    else if (group.totalPenalty >= 20) group.severity = 'warning';
    else group.severity = 'safe';
  }

  return {
    matches,
    groups: Array.from(groupMatches.values()),
    totalMatches: matches.length,
    totalPenalty: matches.reduce((sum, m) => sum + m.penalty, 0),
    hasDanger: Array.from(groupMatches.values()).some(g => g.severity === 'danger')
  };
}

module.exports = { scanText, buildAhoCorasick, AhoCorasick };
