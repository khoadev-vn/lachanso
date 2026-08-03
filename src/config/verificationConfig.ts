export const VERIFICATION_CONFIG = {
  performance: {
    targetAnalysisTime: 3000,
    maxParallelRequests: 6,
    requestTimeout: 5000,
    cacheHitTarget: 0.6
  },
  cache: {
    wikipedia: parseInt(import.meta.env.VITE_CACHE_TTL_WIKIPEDIA || "86400") * 1000,
    factCheck: parseInt(import.meta.env.VITE_CACHE_TTL_FACT_CHECK || "43200") * 1000,
    news: parseInt(import.meta.env.VITE_CACHE_TTL_NEWS || "3600") * 1000,
    manipulation: parseInt(import.meta.env.VITE_CACHE_TTL_MANIPULATION || "259200") * 1000,
    general: 5 * 60 * 1000
  },
  confidence: {
    minThreshold: parseFloat(import.meta.env.VITE_MIN_CONFIDENCE_THRESHOLD || "0.65"),
    highConfidence: 0.8,
    mediumConfidence: 0.65,
    lowConfidence: 0.4
  },
  apis: {
    factCheck: {
      enabled: true,
      endpoint: "https://factchecktools.googleapis.com/v1alpha1/claims:search",
      maxClaims: 3,
      timeout: 5000
    },
    news: {
      enabled: true,
      endpoint: "https://newsapi.org/v2/everything",
      maxResults: 15,
      timeout: 5000,
      batchSize: 3
    },
    wikipedia: {
      enabled: true,
      viEndpoint: "https://vi.wikipedia.org/api/rest_v1/page/summary",
      enEndpoint: "https://en.wikipedia.org/api/rest_v1/page/summary",
      maxResults: 3,
      timeout: 4000
    },
    googleNews: {
      enabled: true,
      endpoint: "https://news.google.com/rss/search",
      timeout: 4000
    }
  },
  layers: {
    wikipedia: {
      weight: 0.3,
      enabled: true,
      extractentities: true,
      compareFactsThreshold: 0.7
    },
    factCheck: {
      weight: 0.35,
      enabled: true,
      minConfidence: 0.65,
      requireMultipleSources: true
    },
    press: {
      weight: 0.2,
      enabled: true,
      trustSourceOnly: true,
      minCoverage: 2
    },
    manipulation: {
      weight: 0.15,
      enabled: true,
      patterns: 7,
      threshold: 0.6
    }
  },
  manipulationPatterns: {
    urgency: {
      patterns: ["NOW", "ASAP", "IMMEDIATELY", "BREAKING", "ALERT", "URGENT"],
      weight: 0.8
    },
    fear: {
      patterns: ["DANGER", "WARNING", "THREAT", "ATTACK", "RISK", "CRITICAL"],
      weight: 0.85
    },
    conspiracy: {
      patterns: ["COVER-UP", "HIDDEN", "SECRET", "EXPOSED", "TRUTH", "CONSPIRACY"],
      weight: 0.9
    },
    financial: {
      patterns: ["MONEY", "RICH", "POOR", "EXPLOIT", "STEAL", "FRAUD"],
      weight: 0.75
    },
    polarization: {
      patterns: ["ALWAYS", "NEVER", "ALL", "NONE", "EVERYONE", "NOBODY"],
      weight: 0.7
    },
    authority: {
      patterns: ["SCIENTIST SAYS", "EXPERT CLAIMS", "OFFICIAL STATEMENT"],
      weight: 0.65
    },
    emotion: {
      patterns: ["LOVE", "HATE", "ANGRY", "FURIOUS", "DEVASTATED", "HEARTBROKEN"],
      weight: 0.6
    }
  },
  scoring: {
    trustedSourceBonus: 25,
    manipulationPenalty: 30,
    factCheckConfirmation: 40,
    wikiVerification: 20,
    pressConsensus: 15,
    outdatedPenalty: 15,
    unverifiablePenalty: 20
  },
  languages: {
    supported: ["vi", "en"],
    default: "vi"
  },
  rateLimit: {
    newsApi: { requests: 5, windowMs: 100 },
    factCheckApi: { requests: 10, windowMs: 1000 },
    wikipedia: { requests: 20, windowMs: 1000 }
  },
  features: {
    enableEnhancedVerification: true,
    enableManipulationDetection: true,
    enableTemporalAnalysis: true,
    enablePressIntegration: true,
    enableConsensusScoring: true,
    enableMetricsTracking: true
  }
} as const;
export function isApiEnabled(apiName: keyof typeof VERIFICATION_CONFIG.apis): boolean {
  return VERIFICATION_CONFIG.apis[apiName].enabled;
}
export function getCacheTTL(type: keyof typeof VERIFICATION_CONFIG.cache): number {
  return VERIFICATION_CONFIG.cache[type];
}
export function getLayerWeight(layer: keyof typeof VERIFICATION_CONFIG.layers): number {
  return VERIFICATION_CONFIG.layers[layer].weight;
}
export function validateConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isApiEnabled("factCheck")) {
    errors.push("Google Fact Check API key not configured");
  }
  if (!isApiEnabled("news")) {
    errors.push("News API key not configured");
  }
  const totalWeight = Object.values(VERIFICATION_CONFIG.layers).reduce((sum, layer) => sum + layer.weight, 0);
  if (Math.abs(totalWeight - 1.0) > 0.05) {
    errors.push(`Layer weights sum to ${totalWeight}, should be ~1.0`);
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
