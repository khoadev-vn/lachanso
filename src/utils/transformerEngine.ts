import { SCAM_CORPUS } from "../constants/scamDataset";

export interface ScoredMatch {
  text: string;
  similarity: number;
  category: string;
}

class TransformerNLP {
  private worker: Worker | null = null;
  private callbacks: Map<string, (data: any) => void> = new Map();
  private corpusEmbeddings: {category: string;text: string;embedding: number[];}[] = [];
  private isReady: boolean = false;
  private isInitializing: boolean = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;


    this.worker = new Worker(new URL('./aiWorker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (event) => {
      const { id, status, progress, error } = event.data;
      if (this.callbacks.has(id)) {
        if (status === 'progress') {

          window.dispatchEvent(new CustomEvent('ai-progress', { detail: progress }));
        } else if (status === 'error') {
          console.error("AI Worker Error:", error);
          const cb = this.callbacks.get(id);
          if (cb) cb({ error });
          this.callbacks.delete(id);
        } else {
          const cb = this.callbacks.get(id);
          if (cb) cb(event.data);
          if (status !== 'progress') {
            this.callbacks.delete(id);
          }
        }
      }
    };
  }

  private async runWorkerTask(type: string, text?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker not initialized"));
        return;
      }
      const id = Math.random().toString(36).substring(7);
      this.callbacks.set(id, (data) => {
        if (data.error) reject(new Error(data.error));else
        resolve(data);
      });
      this.worker.postMessage({ id, type, text });
    });
  }





  public async initialize() {
    if (this.isReady) return;
    if (this.isInitializing) {

      while (!this.isReady) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return;
    }

    this.isInitializing = true;
    try {
      console.log("[LCS AI] Đang tải mô hình Neural Network cục bộ...");
      await this.runWorkerTask('load');
      console.log("[LCS AI] Tải thành công. Đang thiết lập ma trận vector cho Corpus...");

      for (const item of SCAM_CORPUS) {
        const res = await this.runWorkerTask('analyze', item.text);
        this.corpusEmbeddings.push({
          category: item.category,
          text: item.text,
          embedding: res.embedding
        });
      }
      console.log("[LCS AI] Sẵn sàng phân tích!");
      this.isReady = true;
    } catch (e) {
      console.error("[LCS AI] Lỗi khởi tạo:", e);
    } finally {
      this.isInitializing = false;
    }
  }

  public cosineSimilarity(vecA: number[], vecB: number[]): number {
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

  public async getRawEmbedding(text: string): Promise<number[] | null> {
    if (!this.isReady) {
      await this.initialize();
    }
    try {
      const res = await this.runWorkerTask('analyze', text);
      return res.embedding;
    } catch (e) {
      console.error("[LCS AI] Raw Embedding failed:", e);
      return null;
    }
  }




  public async analyze(text: string): Promise<ScoredMatch[]> {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      const res = await this.runWorkerTask('analyze', text);
      const inputEmbedding = res.embedding;

      const results: ScoredMatch[] = this.corpusEmbeddings.map((doc) => {
        const similarity = this.cosineSimilarity(inputEmbedding, doc.embedding);
        return {
          text: doc.text,
          similarity: similarity,
          category: doc.category
        };
      });

      return results.sort((a, b) => b.similarity - a.similarity);
    } catch (e) {
      console.error("[LCS AI] Analysis failed:", e);
      return [];
    }
  }
}

export const aiEngine = new TransformerNLP();
