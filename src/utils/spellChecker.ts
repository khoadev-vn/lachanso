/**
 * Spell-checker: detect misspelled words using Levenshtein distance.
 * Focuses on country names, brands, and common words that appear in news headlines.
 */

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// Dictionary: countries, common brands, news-relevant terms
const DICTIONARY: Record<string, string[]> = {
  // Countries
  "nepal": ["nepal"],
  "portugal": ["portugal"],
  "pakistan": ["pakistan"],
  "ukraine": ["ukraine"],
  "vietnam": ["vietnam"],
  "thailand": ["thailand"],
  "cambodia": ["cambodia"],
  "myanmar": ["myanmar"],
  "malaysia": ["malaysia"],
  "indonesia": ["indonesia"],
  "philippines": ["philippines"],
  "singapore": ["singapore"],
  "australia": ["australia"],
  "india": ["india"],
  "china": ["china"],
  "japan": ["japan"],
  "korea": ["korea"],
  "russia": ["russia"],
  "germany": ["germany"],
  "france": ["france"],
  "spain": ["spain"],
  "italy": ["italy"],
  "brazil": ["brazil"],
  "mexico": ["mexico"],
  "canada": ["canada"],
  "egypt": ["egypt"],
  "turkey": ["turkey"],
  "iran": ["iran"],
  "iraq": ["iraq"],
  "israel": ["israel"],
  "syria": ["syria"],
  // Common news words
  "flood": ["flood"],
  "earthquake": ["earthquake"],
  "typhoon": ["typhoon"],
  "cyclone": ["cyclone"],
  "hurricane": ["hurricane"],
  "tsunami": ["tsunami"],
  "rescue": ["rescue"],
  "helicopter": ["helicopter"],
  "survivors": ["survivors"],
  "victims": ["victims"],
  "missing": ["missing"],
  "killed": ["killed"],
  "dead": ["dead"],
  "disaster": ["disaster"],
  "crisis": ["crisis"],
  "emergency": ["emergency"],
  // Brands
  "facebook": ["facebook"],
  "google": ["google"],
  "twitter": ["twitter"],
  "amazon": ["amazon"],
  "apple": ["apple"],
  "microsoft": ["microsoft"],
  "netflix": ["netflix"],
  "shopee": ["shopee"],
  "lazada": ["lazada"],
};

// Build reverse lookup: word -> canonical form
const WORD_LOOKUP: Map<string, string> = new Map();
for (const canonical of Object.keys(DICTIONARY)) {
  WORD_LOOKUP.set(canonical, canonical);
}

interface TypoMatch {
  input: string;
  suggestion: string;
  distance: number;
}

/**
 * Find misspelled words in text and suggest corrections.
 * Only flags words that are 1-2 edits away from a dictionary word.
 */
export function detectTypos(text: string): TypoMatch[] {
  // Extract words (3+ chars, alpha only)
  const words = text.match(/[a-zA-Z]{3,}/g) || [];
  const results: TypoMatch[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    const lower = word.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    // Skip if exact match
    if (WORD_LOOKUP.has(lower)) continue;

    // Find closest dictionary word
    let bestMatch: TypoMatch | null = null;
    for (const [canonical] of WORD_LOOKUP) {
      const dist = levenshtein(lower, canonical);
      if (dist >= 1 && dist <= 2) {
        // Don't flag if lengths differ by more than 2
        if (Math.abs(lower.length - canonical.length) > 2) continue;
        if (!bestMatch || dist < bestMatch.distance) {
          bestMatch = { input: word, suggestion: canonical, distance: dist };
        }
      }
    }

    if (bestMatch) {
      results.push(bestMatch);
    }
  }

  return results;
}