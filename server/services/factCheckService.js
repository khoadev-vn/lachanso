const axios = require('axios');
const cheerio = require('cheerio');

async function checkFact(query, languageCode = 'vi') {
  try {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query + " fact check")}&format=rss&setlang=vi`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      timeout: 8000
    });

    const $xml = cheerio.load(response.data, { xmlMode: true });
    const claims = [];

    $xml('item').slice(0, 5).each((i, el) => {
      const title = $xml(el).find('title').text().trim();
      const link = $xml(el).find('link').text().trim();
      const source = $xml(el).find('source').text().trim() || 'Bing News';

      if (title) {
        const rating = analyzeTitle(title);
        claims.push({
          text: title,
          publisher: source,
          url: link,
          rating: rating.label,
          ratingScore: rating.score
        });
      }
    });

    if (claims.length === 0) {
      return { found: false, claims: [] };
    }

    const verdict = analyzeVerdict(claims);
    console.log(`[FactCheck] Tìm thấy ${claims.length} bài liên quan. Verdict: ${verdict.label}`);

    return { found: true, claims, verdict };
  } catch (err) {
    console.error('[FactCheck] Lỗi kết nối:', err.message);
    return { found: false, claims: [] };
  }
}

function analyzeTitle(title) {
  const lower = title.toLowerCase();
  const fakeKeywords = ['giả', 'fake', 'sai', 'lừa đảo', 'cảnh báo', 'không đúng', 'bịa đặt', 'thất thiệt', 'misleading', 'false'];
  const trueKeywords = ['đúng', 'xác nhận', 'chính xác', 'thực tế', 'verified', 'true', 'chính thống'];

  const fakeScore = fakeKeywords.filter(k => lower.includes(k)).length;
  const trueScore = trueKeywords.filter(k => lower.includes(k)).length;

  if (fakeScore > trueScore) return { label: 'MIGHT_BE_FAKE', score: -0.3 };
  if (trueScore > fakeScore) return { label: 'MIGHT_BE_TRUE', score: 0.3 };
  return { label: 'UNVERIFIED', score: 0 };
}

function analyzeVerdict(claims) {
  const fakeKeywords = [
    'false', 'fake', 'incorrect', 'inaccurate', 'misleading', 'fabricated',
    'sai', 'sai sự thật', 'không đúng', 'giả mạo', 'bịa đặt', 'không chính xác',
    'tin giả', 'phần lớn sai', 'largely false', 'mostly false', 'pants on fire',
    'four pinocchios', 'thông tin sai', 'thất thiệt', 'might_be_fake'
  ];

  const trueKeywords = [
    'true', 'correct', 'accurate', 'verified',
    'đúng', 'chính xác', 'xác nhận', 'sự thật',
    'mostly true', 'largely true', 'phần lớn đúng', 'might_be_true'
  ];

  let fakeCount = 0;
  let trueCount = 0;

  for (const claim of claims) {
    const rating = (claim.rating || '').toLowerCase();
    if (fakeKeywords.some((k) => rating.includes(k))) fakeCount++; else
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
