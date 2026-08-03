import { pipeline, env } from '@xenova/transformers';


env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineSingleton {
  static task = 'feature-extraction';
  static model = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
  static instance: any = null;

  static async getInstance(progress_callback: any = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        progress_callback,
        quantized: true
      });
    }
    return this.instance;
  }
}


self.addEventListener('message', async (event) => {
  const { id, text, type } = event.data;

  if (type === 'load') {
    try {
      await PipelineSingleton.getInstance((x: any) => {
        self.postMessage({ id, status: 'progress', progress: x });
      });
      self.postMessage({ id, status: 'ready' });
    } catch (error: any) {
      self.postMessage({ id, status: 'error', error: error.message });
    }
    return;
  }

  if (type === 'analyze') {
    try {
      const extractor = await PipelineSingleton.getInstance();

      const output = await extractor(text, { pooling: 'mean', normalize: true });
      self.postMessage({ id, status: 'complete', embedding: Array.from(output.data) });
    } catch (error: any) {
      self.postMessage({ id, status: 'error', error: error.message });
    }
  }
});
