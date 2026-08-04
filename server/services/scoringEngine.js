const factCheckService = require('./factCheckService');
const threatDetection = require('./threatDetection');
const keywordExtractor = require('./keywordExtractor');
const searchEngine = require('./searchEngine');
const semanticFilter = require('./semanticFilter');
const nliChecker = require('./nliChecker');
const vectorCache = require('./vectorCache');


function calculateBaseContentScore(text) {
    const analysis = threatDetection.analyzeTextByKeywords(text);
    const contactFindings = threatDetection.detectContactScam(text);
    const allFindings = [...analysis, ...contactFindings];
    let totalWeight = 0;
    
    
    allFindings.forEach(match => {
        totalWeight += match.penalty;
    });

    
    
    
    const k = 0.0183;
    
    let baseScore = 0;
    if (totalWeight > 0) {
        baseScore = 100 * (1 - Math.exp(-k * totalWeight));
    }
    
    
    baseScore = Math.min(100, Math.max(0, baseScore));
    return { score: baseScore, weight: totalWeight, keywordMatches: allFindings };
}

async function analyzeAndScore(text) {
    
    const cachedResult = await vectorCache.checkCache(text);
    if (cachedResult) {
        cachedResult.fromCache = true;
        return cachedResult;
    }

    
    const baseContent = calculateBaseContentScore(text);
    let finalScore = baseContent.score;
    let verdict = "SAFE";
    let isFactCheckedFake = false;
    let nliModifier = 1.0;
    let logs = [];

    
    logs.push("Calling Fact Check API...");
    const factCheckResult = await factCheckService.checkFact(text);
    
    if (factCheckResult && factCheckResult.claims && factCheckResult.claims.length > 0) {
        
        const hasFakeClaim = factCheckResult.claims.some(claim => {
            const rating = (claim.claimReview?.[0]?.textualRating || claim.rating || "").toLowerCase();
            return rating.includes("false") || rating.includes("fake") || rating.includes("sai") || rating.includes("không đúng") || rating.includes("chưa chính xác") || rating.includes("might_be_fake");
        });
        
        if (hasFakeClaim) {
            isFactCheckedFake = true;
            finalScore = 100;
            verdict = "FRAUD_CONFIRMED";
            logs.push("Fact Check confirmed FAKE.");
            
            return {
                finalScore,
                verdict,
                baseScore: baseContent.score,
                modifier: 'MAX_RISK',
                isFactCheckedFake,
                factCheckResult,
                keywordMatches: baseContent.keywordMatches,
                logs
            };
        }
    }

    
    logs.push("Extracting keywords for search...");
    const extracted = await keywordExtractor.extractKeywords(text);
    let searchQuery = extracted.searchKeywords.join(' ');
    if (!searchQuery) searchQuery = text.substring(0, 100);

    logs.push("Searching news...");
    const articles = await searchEngine.searchVietnameseNews(searchQuery);
    
    let nliResults = [];
    let maxEntailment = 0;
    let maxContradiction = 0;
    let filtered = [];

    if (articles && articles.length > 0) {
        logs.push("Filtering articles...");
        filtered = await semanticFilter.filterArticles(text, articles, 0.15);
        
        
        const topArticles = filtered.slice(0, 3);
        
        for (let article of topArticles) {
            
            const hypothesis = text.length > 500 ? text.substring(0, 500) : text; 
            const premise = article.title + " " + (article.snippet || "");
            const nliRes = await nliChecker.check(premise, hypothesis);
            if (nliRes) {
                if (nliRes.entailment > maxEntailment) maxEntailment = nliRes.entailment;
                if (nliRes.contradiction > maxContradiction) maxContradiction = nliRes.contradiction;
                nliResults.push({ article: article.title, url: article.link, result: nliRes });
            }
        }
    }

    
    if (maxContradiction > 0.70) {
        logs.push(`NLI Contradiction = ${maxContradiction.toFixed(2)}. Modifier = MAX_RISK`);
        finalScore = 100;
        nliModifier = 'MAX_RISK';
        verdict = "FRAUD_CONFIRMED";
    } else if (maxEntailment > 0.70) {
        logs.push(`NLI Entailment = ${maxEntailment.toFixed(2)}. Modifier = 0.1`);
        nliModifier = 0.1;
        finalScore = baseContent.score * nliModifier;
    } else {
        // Có bài báo trùng khớp nhưng NLI neutral → giảm rủi ro mạnh
        const pressMatch = filtered.length > 0;
        if (pressMatch) {
            logs.push(`NLI Neutral + Press Match (${filtered.length} bài). Modifier = 0.25`);
            nliModifier = 0.25;
        } else {
            logs.push(`NLI Neutral. Modifier = 1.0`);
            nliModifier = 1.0;
        }
        finalScore = baseContent.score * nliModifier;
    }

    finalScore = Math.min(100, finalScore);
    
    
    if (finalScore >= 80) verdict = "FRAUD_CONFIRMED";
    else if (finalScore >= 60) verdict = "HIGH_RISK";
    else if (finalScore >= 35) verdict = "SUSPICIOUS";
    else verdict = "SAFE";

    const resultObj = {
        finalScore: Math.round(finalScore),
        verdict,
        baseScore: Math.round(baseContent.score),
        modifier: nliModifier,
        isFactCheckedFake,
        factCheckResult,
        nliDetails: { maxEntailment, maxContradiction, nliResults },
        keywordMatches: baseContent.keywordMatches,
        filteredArticles: filtered,
        logs
    };

    
    const hasClearPressEvidence = filtered.length > 0 && (maxEntailment >= 0.70 || maxContradiction >= 0.70);
    const isExplicitScam = baseContent.keywordMatches.some(match => 
        ['KG_PHISHING', 'KG_FINANCIAL', 'KG_VN_SCAM', 'KG_SMS_PHONE', 'KG_COD_SHIPPING', 'KG_FAKE_UTILITY', 'KG_CRYPTO', 'CTX_CRYPTO_WALLET', 'CTX_PHONE', 'CTX_BANK_ACCOUNT'].includes(match.groupId) || match.id?.startsWith('CTX_')
    );

    if (isFactCheckedFake || hasClearPressEvidence || isExplicitScam) {
        vectorCache.saveToCache(text, resultObj).catch(err => console.error("[Vector Cache] Lỗi lưu:", err));
    }

    return resultObj;
}

module.exports = { analyzeAndScore };
