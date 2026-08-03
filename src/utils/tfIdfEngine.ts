






export interface ScoredMatch {
  text: string;
  similarity: number;
  category: string;
}

export class LCSLocalNLP {
  private documents: {id: number;text: string;category: string;tokens: string[];}[] = [];
  private idf: Map<string, number> = new Map();
  private vocab: string[] = [];





  private tokenize(text: string): string[] {
    if (!text) return [];
    return text.
    toLowerCase().
    normalize("NFD").
    replace(/[\u0300-\u036f]/g, "").
    replace(/[^a-z0-9\s]/g, " ").
    split(/\s+/).
    filter((word) => word.length > 0);
  }




  public fit(corpus: {text: string;category: string;}[]) {
    this.documents = corpus.map((doc, index) => ({
      id: index,
      text: doc.text,
      category: doc.category,
      tokens: this.tokenize(doc.text)
    }));

    this.vocab = [];
    this.idf.clear();

    const N = this.documents.length;
    const df: Map<string, number> = new Map();


    for (const doc of this.documents) {
      const uniqueTokens = new Set(doc.tokens);
      for (const token of uniqueTokens) {
        df.set(token, (df.get(token) || 0) + 1);
      }
    }


    for (const [token, count] of df.entries()) {
      this.vocab.push(token);
      this.idf.set(token, Math.log(N / (count + 1)));
    }
  }




  private getVector(tokens: string[]): number[] {
    const tf: Map<string, number> = new Map();


    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }


    const vector: number[] = new Array(this.vocab.length).fill(0);
    for (let i = 0; i < this.vocab.length; i++) {
      const token = this.vocab[i];
      const termFreq = tf.get(token) || 0;
      const inverseDocFreq = this.idf.get(token) || 0;
      vector[i] = termFreq * inverseDocFreq;
    }

    return vector;
  }




  private cosineSimilarity(vecA: number[], vecB: number[]): number {
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




  public analyze(text: string): ScoredMatch[] {
    if (this.documents.length === 0) {
      console.warn("LCSLocalNLP: Dataset is empty. Please call fit() first.");
      return [];
    }

    const inputTokens = this.tokenize(text);
    if (inputTokens.length === 0) return [];

    const inputVector = this.getVector(inputTokens);

    const results: ScoredMatch[] = this.documents.map((doc) => {
      const docVector = this.getVector(doc.tokens);
      const similarity = this.cosineSimilarity(inputVector, docVector);
      return {
        text: doc.text,
        similarity: similarity,
        category: doc.category
      };
    });


    return results.sort((a, b) => b.similarity - a.similarity);
  }
}
