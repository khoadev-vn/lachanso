const { pipeline } = require('@xenova/transformers');

class NLIChecker {
  constructor() {
    this.classifier = null;
    this.initPromise = null;
  }

  async init() {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          console.log('Loading NLI Model: Xenova/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7...');

          this.classifier = await pipeline('text-classification', 'Xenova/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7');
          console.log('NLI Model Loaded Successfully.');
        } catch (error) {
          console.error('Error loading NLI model:', error);
          throw error;
        }
      })();
    }
    return this.initPromise;
  }

  async check(premise, hypothesis) {
    if (!this.classifier) {
      await this.init();
    }

    try {

      const combined = `${premise} [SEP] ${hypothesis}`;
      const results = await this.classifier(combined, { topk: 3 });


      const scoreMap = {};
      for (const r of results) {
        scoreMap[r.label] = r.score;
      }

      return {
        entailment: scoreMap['entailment'] || 0,
        contradiction: scoreMap['contradiction'] || 0,
        neutral: scoreMap['neutral'] || 0
      };
    } catch (error) {
      console.error('[NLI Checker] Analysis failed:', error);
      return null;
    }
  }
}


const nliChecker = new NLIChecker();
module.exports = nliChecker;
