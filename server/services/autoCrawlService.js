/**
 * Auto-Crawl Service - Liên tục cập nhật dữ liệu lừa đảo và tin giả
 * Chạy mỗi 6 giờ để cập nhật dữ liệu mới nhất
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class AutoCrawlService {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.scamDomainsPath = path.join(this.dataDir, 'scamDomains.json');
    this.fakeNewsPath = path.join(this.dataDir, 'fakeNews.json');
    this.crawlInterval = null;
    this.isRunning = false;
    
    // Initialize data files if they don't exist
    this.initializeDataFiles();
  }

  /**
   * Initialize data files
   */
  initializeDataFiles() {
    if (!fs.existsSync(this.scamDomainsPath)) {
      fs.writeFileSync(this.scamDomainsPath, JSON.stringify({ scamDomains: [] }, null, 2));
    }
    if (!fs.existsSync(this.fakeNewsPath)) {
      fs.writeFileSync(this.fakeNewsPath, JSON.stringify({ fakeNews: [] }, null, 2));
    }
  }

  /**
   * Start auto-crawl service
   */
  start(intervalHours = 6) {
    if (this.crawlInterval) {
      console.log('[AutoCrawl] Already running');
      return;
    }

    console.log(`[AutoCrawl] Starting auto-crawl service (every ${intervalHours} hours)`);
    
    // Run immediately on start
    this.crawlAll();
    
    // Then run periodically
    this.crawlInterval = setInterval(() => {
      this.crawlAll();
    }, intervalHours * 60 * 60 * 1000);
  }

  /**
   * Stop auto-crawl service
   */
  stop() {
    if (this.crawlInterval) {
      clearInterval(this.crawlInterval);
      this.crawlInterval = null;
      console.log('[AutoCrawl] Stopped');
    }
  }

  /**
   * Crawl all data sources
   */
  async crawlAll() {
    if (this.isRunning) {
      console.log('[AutoCrawl] Already crawling, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('[AutoCrawl] Starting crawl...');

    try {
      await Promise.all([
        this.crawlScamDomains(),
        this.crawlFakeNews()
      ]);
      console.log('[AutoCrawl] Crawl completed successfully');
    } catch (error) {
      console.error('[AutoCrawl] Crawl failed:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Crawl scam domains from multiple sources
   */
  async crawlScamDomains() {
    console.log('[AutoCrawl] Crawling scam domains...');
    
    const sources = [
      // Source 1: phish_destroy
      {
        name: 'phish_destroy',
        url: 'https://raw.githubusercontent.com/phishdestroy/destroylist/main/rootlist/formats/primary_active/hosts.txt',
        parser: (data) => {
          const domains = [];
          const lines = data.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!')) {
              // Extract domain from hosts file format (127.0.0.1 domain.com)
              const parts = trimmed.split(/\s+/);
              if (parts.length >= 2) {
                const domain = parts[1].toLowerCase();
                if (domain && !domain.startsWith('localhost')) {
                  domains.push(domain);
                }
              }
            }
          }
          return domains;
        }
      },
      // Source 2: URLhaus
      {
        name: 'urlhaus',
        url: 'https://urlhaus.abuse.ch/downloads/json_recent/',
        parser: (data) => {
          const domains = [];
          try {
            const json = JSON.parse(data);
            if (json.urls) {
              for (const item of json.urls) {
                try {
                  const url = new URL(item.url);
                  domains.push(url.hostname.toLowerCase());
                } catch {}
              }
            }
          } catch {}
          return domains;
        }
      }
    ];

    const newDomains = [];
    
    for (const source of sources) {
      try {
        console.log(`[AutoCrawl] Fetching from ${source.name}...`);
        const response = await axios.get(source.url, { timeout: 10000 });
        const domains = source.parser(response.data);
        newDomains.push(...domains.map(d => ({
          domain: d,
          source: source.name,
          discoveredAt: new Date().toISOString()
        })));
        console.log(`[AutoCrawl] Found ${domains.length} domains from ${source.name}`);
      } catch (error) {
        console.error(`[AutoCrawl] Failed to fetch from ${source.name}:`, error.message);
      }
    }

    // Load existing data
    let existingData = { scamDomains: [] };
    try {
      const raw = JSON.parse(fs.readFileSync(this.scamDomainsPath, 'utf8'));
      // Handle both formats: { scamDomains: [...] } and { SCAM_DOMAINS: [...] }
      const domains = raw.scamDomains || raw.SCAM_DOMAINS || [];
      existingData = { scamDomains: Array.isArray(domains) ? domains : [] };
    } catch {}

    // Merge new domains (avoid duplicates)
    const existingDomains = new Set(existingData.scamDomains.map(d => typeof d === 'string' ? d : d.domain));
    let addedCount = 0;
    
    for (const newDomain of newDomains) {
      if (!existingDomains.has(newDomain.domain)) {
        existingData.scamDomains.push(newDomain);
        existingDomains.add(newDomain.domain);
        addedCount++;
      }
    }

    // Save updated data (preserve SCAM_BRAND_PATTERNS)
    let existingRaw = {};
    try {
      existingRaw = JSON.parse(fs.readFileSync(this.scamDomainsPath, 'utf8'));
    } catch {}
    existingRaw.scamDomains = existingData.scamDomains;
    existingRaw.SCAM_DOMAINS = existingData.scamDomains;
    fs.writeFileSync(this.scamDomainsPath, JSON.stringify(existingRaw, null, 2));
    console.log(`[AutoCrawl] Added ${addedCount} new scam domains (total: ${existingData.scamDomains.length})`);
    
    return addedCount;
  }

  /**
   * Crawl fake news from Vietnamese news sources
   */
  async crawlFakeNews() {
    console.log('[AutoCrawl] Crawling fake news...');
    
    // Sources for fake news detection
    const sources = [
      // Source 1: Tinhte fact-check
      {
        name: 'tinhte',
        url: 'https://tinhte.vn/fact-check.r139/',
        parser: (html) => {
          const articles = [];
          // Simple regex to extract article titles and dates
          const titleRegex = /<h2[^>]*>(.*?)<\/h2>/gi;
          const dateRegex = /<time[^>]*datetime="([^"]*)"[^>]*>/gi;
          
          let match;
          while ((match = titleRegex.exec(html)) !== null) {
            articles.push({
              title: match[1].replace(/<[^>]*>/g, '').trim(),
              source: 'tinhte',
              discoveredAt: new Date().toISOString()
            });
          }
          return articles;
        }
      },
      // Source 2: Vfactcheck
      {
        name: 'vfactcheck',
        url: 'https://vfactcheck.vn/',
        parser: (html) => {
          const articles = [];
          const titleRegex = /<h[2-4][^>]*class="[^"]*entry-title[^"]*"[^>]*>(.*?)<\/h[2-4]>/gi;
          
          let match;
          while ((match = titleRegex.exec(html)) !== null) {
            articles.push({
              title: match[1].replace(/<[^>]*>/g, '').trim(),
              source: 'vfactcheck',
              discoveredAt: new Date().toISOString()
            });
          }
          return articles;
        }
      }
    ];

    const newArticles = [];
    
    for (const source of sources) {
      try {
        console.log(`[AutoCrawl] Fetching from ${source.name}...`);
        const response = await axios.get(source.url, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const articles = source.parser(response.data);
        newArticles.push(...articles);
        console.log(`[AutoCrawl] Found ${articles.length} articles from ${source.name}`);
      } catch (error) {
        console.error(`[AutoCrawl] Failed to fetch from ${source.name}:`, error.message);
      }
    }

    // Load existing data
    let existingData = { fakeNews: [] };
    try {
      existingData = JSON.parse(fs.readFileSync(this.fakeNewsPath, 'utf8'));
    } catch {}

    // Merge new articles (avoid duplicates by title)
    const existingTitles = new Set(existingData.fakeNews.map(a => a.title));
    let addedCount = 0;
    
    for (const newArticle of newArticles) {
      if (!existingTitles.has(newArticle.title)) {
        existingData.fakeNews.push(newArticle);
        existingTitles.add(newArticle.title);
        addedCount++;
      }
    }

    // Keep only last 1000 articles
    if (existingData.fakeNews.length > 1000) {
      existingData.fakeNews = existingData.fakeNews.slice(-1000);
    }

    // Save updated data
    fs.writeFileSync(this.fakeNewsPath, JSON.stringify(existingData, null, 2));
    console.log(`[AutoCrawl] Added ${addedCount} new fake news articles (total: ${existingData.fakeNews.length})`);
    
    return addedCount;
  }

  /**
   * Get crawl statistics
   */
  getStats() {
    let scamCount = 0;
    let fakeNewsCount = 0;
    
    try {
      const scamData = JSON.parse(fs.readFileSync(this.scamDomainsPath, 'utf8'));
      scamCount = scamData.scamDomains?.length || 0;
    } catch {}
    
    try {
      const fakeNewsData = JSON.parse(fs.readFileSync(this.fakeNewsPath, 'utf8'));
      fakeNewsCount = fakeNewsData.fakeNews?.length || 0;
    } catch {}
    
    return {
      scamDomains: scamCount,
      fakeNews: fakeNewsCount,
      isRunning: this.isRunning,
      lastCrawl: this.lastCrawlTime || null
    };
  }
}

// Singleton instance
const autoCrawlService = new AutoCrawlService();

module.exports = autoCrawlService;
