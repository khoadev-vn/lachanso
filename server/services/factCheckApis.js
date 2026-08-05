const axios = require('axios');

// ============ Google Fact Check Tools API ============
async function googleFactCheck(query, apiKey = process.env.GOOGLE_FACTCHECK_API_KEY) {
  if (!apiKey) return { available: false, results: [], note: 'No API key' };
  try {
    const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?key=${apiKey}&query=${encodeURIComponent(query)}&languageCode=vi&pageSize=10`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const claims = (data.claims || []).map(c => ({
      text: c.claimReview?.[0]?.headline || c.text,
      publisher: c.claimReview?.[0]?.publisher?.name || 'Unknown',
      rating: c.claimReview?.[0]?.textRating || c.claimReview?.[0]?.reviewer?.organization || 'Unknown',
      url: c.claimReview?.[0]?.url || '',
      claimDate: c.claimDate || c.publishDate,
      source: 'Google Fact Check'
    }));
    return { available: true, results: claims };
  } catch (e) {
    return { available: false, results: [], error: e.message };
  }
}

// ============ ClaimBuster API (free tier) ============
async function claimBusterCheck(text, apiKey = process.env.CLAIMBUSTER_API_KEY) {
  if (!apiKey) return { available: false, claims: [], note: 'No API key' };
  try {
    const { data } = await axios.post('https://api.claimbuster.org/v2/claim-check',
      { text },
      { headers: { 'Authorization': `Bearer ${apiKey}` }, timeout: 10000 }
    );
    return {
      available: true,
      claims: data.results || [],
      score: data.score || 0
    };
  } catch (e) {
    return { available: false, claims: [], error: e.message };
  }
}

// ============ Full Fact API (free, no key) ============
async function fullFactCheck(query) {
  try {
    const { data } = await axios.get(`https://api.fullfact.org/v0.1/search/?q=${encodeURIComponent(query)}&page_size=5`, { timeout: 8000 });
    const items = (data.items || []).map(item => ({
      text: item.title || item.text,
      claimDate: item.firstPublishedAt,
      source: 'Full Fact',
      verdict: item.verdict?.shortSummary || 'Unclear',
      url: item.url
    }));
    return { available: true, results: items };
  } catch (e) {
    return { available: false, results: [], error: e.message };
  }
}

// ============ Africa Check API (free) ============
async function africaCheckSearch(query) {
  try {
    const { data } = await axios.get(`https://africacheck.org/api/v1/search?q=${encodeURIComponent(query)}&per_page=5`, { timeout: 8000 });
    const results = (data.data || data.results || []).map(item => ({
      text: item.title || item.claim,
      source: 'Africa Check',
      verdict: item.rating || item.verdict,
      url: item.url
    }));
    return { available: true, results };
  } catch (e) {
    return { available: false, results: [], error: e.message };
  }
}

// ============ TinEye Reverse Image Search ============
async function tineyeSearch(imageUrl, apiKey = process.env.TINEYE_API_KEY) {
  if (!apiKey) return { available: false, results: [], note: 'No API key' };
  try {
    const { data } = await axios.post('https://api.tineye.com/rest/search/',
      { url: imageUrl },
      { headers: { 'Authorization': `Bearer ${apiKey}` }, timeout: 15000 }
    );
    return {
      available: true,
      totalResults: data.total_results || 0,
      results: (data.matches || []).slice(0, 10).map(m => ({
        url: m.url,
        domain: m.domain,
        size: m.size,
        backlink: m.backlinks?.[0]?.url
      }))
    };
  } catch (e) {
    return { available: false, results: [], error: e.message };
  }
}

// ============ TinEye (free scraping fallback) ============
async function tineyeFreeSearch(imageUrl) {
  try {
    const { data } = await axios.get(`https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 10000
    });
    const matchCount = (data.match(/(\d+)\s+results?/i) || [])[1] || '0';
    return { available: true, totalResults: parseInt(matchCount), note: 'Free scraping' };
  } catch (e) {
    return { available: false, results: [], error: e.message };
  }
}

module.exports = {
  googleFactCheck,
  claimBusterCheck,
  fullFactCheck,
  africaCheckSearch,
  tineyeSearch,
  tineyeFreeSearch
};
