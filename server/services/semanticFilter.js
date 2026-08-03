let pipeline = null;





async function getPipeline() {
  if (pipeline === null) {

    const transformers = await import('@xenova/transformers');


    transformers.env.allowLocalModels = false;

    console.log('[Semantic Filter] Đang tải mô hình paraphrase-multilingual-MiniLM-L12-v2 vào RAM...');
    pipeline = await transformers.pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
      quantized: true
    });
    console.log('[Semantic Filter] Tải mô hình thành công!');
  }
  return pipeline;
}




async function getRawEmbedding(text) {
  try {
    const extractor = await getPipeline();

    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (e) {
    console.error('[Semantic Filter] Lỗi khi tạo Embedding:', e.message);
    return null;
  }
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





async function filterArticles(originalText, articles, threshold = 0.40) {
  if (!articles || articles.length === 0) return [];

  const inputEmbedding = await getRawEmbedding(originalText);
  if (!inputEmbedding) return articles;

  const filtered = [];

  for (const article of articles) {

    const articleContent = `${article.title}. ${article.description || ''}`;
    const articleEmbedding = await getRawEmbedding(articleContent);

    if (articleEmbedding) {
      const similarity = cosineSimilarity(inputEmbedding, articleEmbedding);
      article.similarityScore = similarity;

      if (similarity >= threshold) {
        filtered.push(article);
      }
    } else {

      filtered.push(article);
    }
  }


  filtered.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));

  return filtered;
}


getPipeline().catch((e) => console.error('[Semantic Filter] Lỗi khởi động model:', e));

module.exports = {
  getRawEmbedding,
  cosineSimilarity,
  filterArticles
};
