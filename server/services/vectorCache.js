const fs = require('fs');
const path = require('path');
const { pipeline } = require('@xenova/transformers');

const CACHE_FILE = path.join(__dirname, '../data/vectorCache.json');


let semanticCache = [];
let extractorPipeline = null;


try {
    if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        semanticCache = JSON.parse(raw);
        console.log(`[Vector Cache] Đã load ${semanticCache.length} mục từ CSDL.`);
    } else {
        fs.writeFileSync(CACHE_FILE, JSON.stringify([]));
    }
} catch (e) {
    console.error("[Vector Cache] Lỗi đọc cache:", e);
    semanticCache = [];
}

async function getExtractor() {
    if (!extractorPipeline) {
        console.log("[Vector Cache] Đang tải mô hình nhúng ngữ nghĩa (Embedding)...");
        extractorPipeline = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
            quantized: true,
        });
        console.log("[Vector Cache] Đã tải xong mô hình.");
    }
    return extractorPipeline;
}


function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}


async function getEmbedding(text) {
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}


async function checkCache(text) {
    if (semanticCache.length === 0) return null;
    
    
    const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text;
    const inputVector = await getEmbedding(truncatedText);

    let bestMatch = null;
    let highestSim = 0;

    for (const item of semanticCache) {
        const sim = cosineSimilarity(inputVector, item.vector);
        if (sim > highestSim) {
            highestSim = sim;
            bestMatch = item;
        }
    }

    if (highestSim >= 0.92 && bestMatch) {
        console.log(`[Vector Cache] HIT! Độ tương đồng: ${(highestSim * 100).toFixed(1)}%`);
        return bestMatch.result;
    }

    return null;
}


async function saveToCache(text, result) {
    const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text;
    const vector = await getEmbedding(truncatedText);

    const newItem = {
        id: Date.now().toString(),
        text: truncatedText,
        vector: vector,
        result: result,
        timestamp: new Date().toISOString()
    };

    semanticCache.push(newItem);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(semanticCache, null, 2));
    console.log(`[Vector Cache] Đã lưu mục mới vào CSDL. Tổng số: ${semanticCache.length}`);
}

function getAllCachedItems() {
    
    return semanticCache.map(item => ({
        id: item.id,
        text: item.text,
        result: item.result,
        timestamp: item.timestamp
    })).reverse(); 
}

module.exports = {
    checkCache,
    saveToCache,
    getAllCachedItems
};
