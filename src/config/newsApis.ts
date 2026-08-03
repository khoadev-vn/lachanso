export const NEWS_API_CONFIG = {
  newsApi: {
    envKey: "VITE_NEWS_API_KEY",
    everythingEndpoint: "https://newsapi.org/v2/everything",
    docsUrl: "https://newsapi.org/docs/get-started",
    registerUrl: "https://newsapi.org/register"
  },
  googleFactCheck: {
    envKey: "VITE_GOOGLE_FACT_CHECK_API_KEY",
    claimSearchEndpoint: "https://factchecktools.googleapis.com/v1alpha1/claims:search",
    docsUrl: "https://developers.google.com/fact-check/tools/api/",
    consoleUrl: "https://console.cloud.google.com/apis/library/factchecktools.googleapis.com"
  },
  googleNews: {
    rssSearchEndpoint: "https://news.google.com/rss/search",
    docsUrl: "https://news.google.com/"
  },
  wikipedia: {
    viSummaryEndpoint: "https://vi.wikipedia.org/api/rest_v1/page/summary",
    enSummaryEndpoint: "https://en.wikipedia.org/api/rest_v1/page/summary",
    viSearchEndpoint: "https://vi.wikipedia.org/w/rest.php/v1/search/page",
    enSearchEndpoint: "https://en.wikipedia.org/w/rest.php/v1/search/page",
    docsUrl: "https://api.wikimedia.org/wiki/REST_API"
  }
} as const;
export const NEWS_API_KEYS = {
  newsApiKey: "",
  googleFactCheckApiKey: ""
} as const;
