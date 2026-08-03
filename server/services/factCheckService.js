





const FACT_CHECK_API_KEY = process.env.VITE_GOOGLE_FACT_CHECK_API_KEY;
const FACT_CHECK_BASE_URL = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';







async function checkFact(query, languageCode = 'vi') {
  if (!FACT_CHECK_API_KEY) {
    console.warn('[FactCheck] Thiếu VITE_GOOGLE_FACT_CHECK_API_KEY trong .env');
    return { found: false, claims: [] };
  }


  const trimmedQuery = query.trim().substring(0, 200);

  const url = new URL(FACT_CHECK_BASE_URL);
  url.searchParams.set('query', trimmedQuery);
  url.searchParams.set('languageCode', languageCode);
  url.searchParams.set('pageSize', '5');
  url.searchParams.set('key', FACT_CHECK_API_KEY);

  try {
    const res = await fetch(url.toString(), { timeout: 5000 });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[FactCheck] API lỗi ${res.status}: ${errText.substring(0, 200)}`);
      return { found: false, claims: [] };
    }

    const data = await res.json();
    const claims = data.claims || [];

    if (claims.length === 0) {

      if (languageCode === 'vi') {
        return checkFact(query, 'en');
      }
      return { found: false, claims: [] };
    }


    const normalizedClaims = claims.map((claim) => {
      const review = claim.claimReview?.[0] || {};
      return {
        text: claim.text || '',
        claimant: claim.claimant || '',
        claimDate: claim.claimDate || '',
        publisher: review.publisher?.name || '',
        publisherSite: review.publisher?.site || '',
        rating: review.textualRating || '',
        title: review.title || '',
        url: review.url || '',
        languageCode: review.languageCode || languageCode
      };
    });


    const verdict = analyzeVerdict(normalizedClaims);

    console.log(`[FactCheck] Tìm thấy ${claims.length} fact-check. Verdict: ${verdict.label}`);

    return {
      found: true,
      claims: normalizedClaims,
      verdict
    };

  } catch (err) {
    console.error('[FactCheck] Lỗi kết nối:', err.message);
    return { found: false, claims: [] };
  }
}






function analyzeVerdict(claims) {

  const fakeKeywords = [
  'false', 'fake', 'incorrect', 'inaccurate', 'misleading', 'fabricated',
  'sai', 'sai sự thật', 'không đúng', 'giả mạo', 'bịa đặt', 'không chính xác',
  'tin giả', 'phần lớn sai', 'largely false', 'mostly false', 'pants on fire',
  'four pinocchios', 'thông tin sai', 'thất thiệt'];



  const trueKeywords = [
  'true', 'correct', 'accurate', 'verified',
  'đúng', 'chính xác', 'xác nhận', 'sự thật',
  'mostly true', 'largely true', 'phần lớn đúng'];


  let fakeCount = 0;
  let trueCount = 0;

  for (const claim of claims) {
    const rating = (claim.rating || '').toLowerCase();
    if (fakeKeywords.some((k) => rating.includes(k))) fakeCount++;else
    if (trueKeywords.some((k) => rating.includes(k))) trueCount++;
  }

  if (fakeCount > 0) {
    return {
      label: 'FAKE',
      isFake: true,
      isReal: false,
      confidence: Math.min(fakeCount / claims.length + 0.5, 1.0),
      topRating: claims.find((c) => {
        const r = (c.rating || '').toLowerCase();
        return fakeKeywords.some((k) => r.includes(k));
      })?.rating || 'False'
    };
  }

  if (trueCount > 0) {
    return {
      label: 'TRUE',
      isFake: false,
      isReal: true,
      confidence: Math.min(trueCount / claims.length + 0.5, 1.0),
      topRating: claims[0]?.rating || 'True'
    };
  }

  return {
    label: 'UNVERIFIED',
    isFake: false,
    isReal: false,
    confidence: 0,
    topRating: claims[0]?.rating || 'Unverified'
  };
}

module.exports = { checkFact, analyzeVerdict };
