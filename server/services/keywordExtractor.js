const { pipeline } = require('@xenova/transformers');

class KeywordExtractor {
  static instance = null;

  static async getInstance() {
    if (!this.instance) {
      console.log("Loading NER Model: Xenova/bert-base-multilingual-cased-ner-hrl...");

      this.instance = await pipeline('token-classification', 'Xenova/bert-base-multilingual-cased-ner-hrl');
      console.log("NER Model Loaded Successfully.");
    }
    return this.instance;
  }

  static async extractKeywords(text) {
    try {
      const extractor = await this.getInstance();
      const results = await extractor(text);

      let keywords = [];
      let currentEntity = "";
      let currentType = "";

      for (let i = 0; i < results.length; i++) {
        const token = results[i];


        if (token.entity.startsWith('B-')) {
          if (currentEntity) {
            keywords.push({ word: currentEntity, type: currentType });
          }
          currentEntity = token.word.replace('##', '');
          currentType = token.entity.replace('B-', '');
        } else

        if (token.entity.startsWith('I-')) {
          if (token.word.startsWith('##')) {
            currentEntity += token.word.replace('##', '');
          } else {
            currentEntity += ' ' + token.word;
          }
        }
      }


      if (currentEntity) {
        keywords.push({ word: currentEntity, type: currentType });
      }



      const uniqueKeywords = [...new Set(keywords.map((k) => k.word))];

      return {
        entities: keywords,
        searchKeywords: uniqueKeywords
      };

    } catch (error) {
      console.error("Keyword Extractor Error:", error);
      return { entities: [], searchKeywords: [] };
    }
  }
}

module.exports = KeywordExtractor;
