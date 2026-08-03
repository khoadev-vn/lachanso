export interface KeywordMatchResult {
  groupId: string;
  groupName: string;
  matchedKeywords: string[];
  penalty: number;
  isPositive: boolean;
}

export async function analyzeTextByKeywords(text: string): Promise<KeywordMatchResult[]> {
  try {
    const response = await fetch("/api/analyze-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      console.error("Backend error during analyzeTextByKeywords");
      return [];
    }
    const data = await response.json();
    return data.matches || [];
  } catch (e) {
    console.error("Failed to fetch from /api/analyze-text", e);
    return [];
  }
}

export async function getKeywordRiskScore(text: string): Promise<number> {
  const matches = await analyzeTextByKeywords(text);
  let totalPenalty = 0;
  matches.forEach((m) => {
    totalPenalty += m.penalty;
  });
  return Math.min(100, Math.max(0, totalPenalty));
}
