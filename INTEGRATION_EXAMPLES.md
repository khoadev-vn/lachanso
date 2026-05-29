# Integration Examples - Enhanced News Verification

## Quick Start

### Basic Usage (Drop-in Replacement)

```typescript
import { runEnhancedNewsVerification } from "./constants/newsVerification";

// Verify a news claim
const result = await runEnhancedNewsVerification(
  "Donald Trump was born on June 14, 1946 in New York City"
);

console.log(`Score: ${result.scoreDelta}`);  // e.g., +25 (verified)
console.log(`Consensus: ${result.consensusDetails}`);
```

---

## Example 1: Verify Biography Claim

```typescript
async function verifyBiographyClaim(personName: string, birthYear: number) {
  const text = `${personName} was born in ${birthYear}`;
  
  const result = await runEnhancedNewsVerification(text);
  
  if (result.scoreDelta > 15) {
    console.log("✅ Biography verified via Wikipedia");
  } else if (result.scoreDelta < -30) {
    console.log("❌ Biography is false");
  } else {
    console.log("⚠️ Biography inconclusive");
  }
  
  return result;
}

// Usage
await verifyBiographyClaim("Donald Trump", 1946);
// Output: ✅ Biography verified via Wikipedia
```

---

## Example 2: Detect Manipulation Patterns

```typescript
async function analyzeForManipulation(text: string) {
  const result = await runEnhancedNewsVerification(text);
  
  const manipulationRisk = result.manipulationScore;
  
  if (manipulationRisk > 0.7) {
    return {
      status: "HIGH MANIPULATION RISK",
      level: "🔴 DANGER",
      details: "Text contains strong psychological triggers"
    };
  } else if (manipulationRisk > 0.4) {
    return {
      status: "MODERATE MANIPULATION",
      level: "🟡 WARNING",
      details: "Some emotional language detected"
    };
  } else {
    return {
      status: "LOW MANIPULATION",
      level: "🟢 SAFE",
      details: "Minimal emotional triggers"
    };
  }
}

// Usage
await analyzeForManipulation(
  "BREAKING!!! This shocking secret will DESTROY your health! Click now!!!"
);
// Output: HIGH MANIPULATION RISK (🔴 DANGER)
```

---

## Example 3: Check Temporal Relevance

```typescript
async function checkClaimRelevance(claim: string) {
  const result = await runEnhancedNewsVerification(claim);
  
  const relevance = result.temporalRelevance;
  
  if (relevance > 0.8) {
    console.log("⏰ This claim is very current and relevant");
  } else if (relevance > 0.5) {
    console.log("⏰ This claim has moderate relevance");
  } else {
    console.log("⏰ This claim is outdated or has no time relevance");
  }
}

// Usage
await checkClaimRelevance(
  "Ho Chi Minh was born on May 19, 1890"
);
// Output: ⏰ This claim has moderate relevance (historical but stable fact)
```

---

## Example 4: Get Detailed Verification Report

```typescript
async function generateFullReport(news: string) {
  const result = await runEnhancedNewsVerification(news);
  
  return {
    summary: {
      scoreAdjustment: result.scoreDelta,
      manipulationRisk: `${Math.round(result.manipulationScore * 100)}%`,
      temporalRelevance: `${Math.round(result.temporalRelevance * 100)}%`,
      consensus: result.consensusDetails
    },
    
    findings: result.reasons.map(r => ({
      category: r.name,
      detail: r.detail,
      severity: r.status // 'danger', 'warning', 'success'
    })),
    
    summaries: {
      sourceAudit: result.summary.source_audit,
      pressComparison: result.summary.press_comparison,
      searchTrace: result.summary.search_trace,
      factCheck: result.summary.fact_check
    }
  };
}

// Usage
const report = await generateFullReport(
  "According to Reuters, the economy grew by 3% last quarter"
);

console.log(report.summary);
/* Output:
{
  scoreAdjustment: 28,
  manipulationRisk: "12%",
  temporalRelevance: "95%",
  consensus: "Multi-source consensus: VERIFIED (82% confidence)..."
}
*/
```

---

## Example 5: Batch Verification

```typescript
async function verifyMultipleClaims(claims: string[]) {
  const results = await Promise.all(
    claims.map(claim => runEnhancedNewsVerification(claim))
  );
  
  return {
    total: claims.length,
    verified: results.filter(r => r.scoreDelta > 15).length,
    false: results.filter(r => r.scoreDelta < -30).length,
    inconclusive: results.filter(r => r.scoreDelta >= -30 && r.scoreDelta <= 15).length,
    
    details: results.map((r, i) => ({
      claim: claims[i],
      score: r.scoreDelta,
      manipulation: r.manipulationScore
    }))
  };
}

// Usage
const report = await verifyMultipleClaims([
  "The Great Wall of China is over 13,000 miles long",
  "Einstein was born in 1879",
  "COVID-19 vaccines contain microchips" // This will flag as FALSE
]);

console.log(report);
/* Output:
{
  total: 3,
  verified: 2,
  false: 1,
  inconclusive: 0,
  ...
}
*/
```

---

## Example 6: Real-Time News Analysis (React Component)

```typescript
import { useState, useEffect } from 'react';
import { runEnhancedNewsVerification } from './constants/newsVerification';

export function NewsVerifier({ article }: { article: string }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      try {
        const verification = await runEnhancedNewsVerification(article);
        if (isMounted) setResult(verification);
      } catch (e) {
        if (isMounted) setError(e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verify();
    return () => { isMounted = false; };
  }, [article]);

  if (loading) return <div>Verifying...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!result) return null;

  const score = Math.max(0, Math.min(100, 50 + result.scoreDelta));
  const color = score > 70 ? 'green' : score > 50 ? 'yellow' : 'red';
  const manipulation = Math.round(result.manipulationScore * 100);

  return (
    <div className={`border-l-4 border-${color}-500 p-4`}>
      <div>Trust Score: {score}/100</div>
      <div>Manipulation Risk: {manipulation}%</div>
      <div className="text-sm mt-2">{result.consensusDetails}</div>
      
      <div className="mt-4 space-y-2">
        {result.reasons.map(reason => (
          <div key={reason.id} className={`text-${reason.status === 'danger' ? 'red' : reason.status === 'success' ? 'green' : 'yellow'}-600`}>
            <strong>{reason.name}</strong>: {reason.detail}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Example 7: Processing Large News Archives

```typescript
async function analyzeNewsArchive(articles: Article[]) {
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(article => 
        runEnhancedNewsVerification(article.content)
      )
    );
    
    results.push(...batchResults.map((result, idx) => ({
      articleId: batch[idx].id,
      title: batch[idx].title,
      trustScore: Math.max(0, Math.min(100, 50 + result.scoreDelta)),
      manipulationRisk: Math.round(result.manipulationScore * 100),
      status: result.scoreDelta > 15 ? 'VERIFIED' : result.scoreDelta < -30 ? 'FALSE' : 'MIXED'
    })));
    
    // Wait between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

// Usage
const archiveResults = await analyzeNewsArchive(articlesFromDatabase);
console.log(`Verified: ${archiveResults.filter(r => r.status === 'VERIFIED').length}`);
console.log(`False: ${archiveResults.filter(r => r.status === 'FALSE').length}`);
```

---

## Example 8: Custom Threshold Configuration

```typescript
function createCustomVerifier(thresholds = {}) {
  const defaultThresholds = {
    verifiedMin: 15,
    falseMax: -30,
    manipulationMax: 0.5,
    temporalMin: 0.3
  };
  
  const config = { ...defaultThresholds, ...thresholds };
  
  return async function verify(text: string) {
    const result = await runEnhancedNewsVerification(text);
    
    const isVerified = result.scoreDelta >= config.verifiedMin;
    const isFalse = result.scoreDelta <= config.falseMax;
    const hasHighManipulation = result.manipulationScore > config.manipulationMax;
    const isOutdated = result.temporalRelevance < config.temporalMin;
    
    return {
      ...result,
      classification: {
        verified: isVerified && !hasHighManipulation && !isOutdated,
        false: isFalse,
        suspicious: hasHighManipulation,
        outdated: isOutdated
      }
    };
  };
}

// Usage with custom thresholds
const strictVerifier = createCustomVerifier({
  verifiedMin: 25,  // Require more evidence
  manipulationMax: 0.3,  // Lower tolerance for manipulation
});

const result = await strictVerifier(someNewsArticle);
```

---

## Performance Tips

### 1. Cache Results
```typescript
const cache = new Map();

async function cachedVerify(text: string) {
  const key = text.toLowerCase().substring(0, 100);
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const result = await runEnhancedNewsVerification(text);
  cache.set(key, result);
  return result;
}
```

### 2. Set Timeouts for Production
```typescript
async function verifyWithTimeout(text: string, timeoutMs = 5000) {
  return Promise.race([
    runEnhancedNewsVerification(text),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Verification timeout')), timeoutMs)
    )
  ]);
}
```

### 3. Handle Network Errors Gracefully
```typescript
async function robustVerify(text: string) {
  try {
    return await runEnhancedNewsVerification(text);
  } catch (error) {
    console.warn('Enhanced verification failed, falling back to basic:', error);
    // Fallback to original system
    return runNewsVerificationLayers(text);
  }
}
```

---

## API Configuration

Make sure these environment variables are set:

```env
# Required (Google Fact Check API)
VITE_GOOGLE_FACT_CHECK_API_KEY=your_key_here

# Optional (News API - can use without)
VITE_NEWS_API_KEY=your_key_here

# Wikipedia & Wikidata APIs are public (no key needed)
```

---

## Summary

The enhanced verification system provides:
- ✅ Detailed multi-source verification
- ✅ Manipulation pattern detection
- ✅ Temporal relevance checking
- ✅ Fast performance with caching
- ✅ Graceful degradation
- ✅ Easy integration

Start with **Example 1** for basic usage, then explore others based on your needs!
