/**
 * Fraud Database Manager
 * Manages public fraud lists and domain blacklists
 */

interface FraudDatabaseMatch {
  isBlacklisted: boolean;
  database: string;
  fraudType: string;
  lastUpdated: Date;
  description: string;
}

interface FraudDatabase {
  name: string;
  type: "gambling" | "financial" | "phishing" | "ecommerce" | "malware" | "general";
  domains: Set<string>;
  keywords: string[];
  lastUpdated: Date;
}

// In-memory cache for fraud databases
const fraudDatabases = new Map<string, FraudDatabase>();
let databasesLoaded = false;

/**
 * Initialize and load fraud databases
 */
async function initializeFraudDatabases(): Promise<void> {
  if (databasesLoaded) return;

  // Load Vietnamese gambling sites database
  const gamblingDomains = new Set([
    "sunwin.com", "sunwin.vn", "sunwin-app.com",
    "vin777.com", "vin777.vn",
    "iwin.com", "iwin.vn",
    "f8bet.com", "f8bet.vn",
    "fun88.com", "fun88.vn", "fun88asia.com",
    "188bet.com", "188bet.vn",
    "12play.com", "12play.vn",
    "w88.com", "w88.vn",
    "ae888.com", "ae888.vn",
    "sands.vn", "sands88.vn",
    "kingbet.vn",
    "bet88.com", "bet88.vn",
    "casino.com", "online-casino.vn",
  ]);

  fraudDatabases.set("gambling", {
    name: "Gambling/Betting Sites",
    type: "gambling",
    domains: gamblingDomains,
    keywords: ["casino", "betting", "poker", "slots", "jackpot", "odds", "deposit", "withdraw"],
    lastUpdated: new Date(),
  });

  // Load financial fraud database
  const financialDomains = new Set([
    "crypto-profit.vn", "bitcoin-boost.vn", "forex-master.vn",
    "quick-loan.vn", "instant-cash.vn", "fast-credit.vn",
    "investment-guarantee.vn", "profit-machine.vn",
    "wealth-builder.vn", "money-multiplier.vn",
    "mlm-network.vn", "pyramid-scheme.vn",
  ]);

  fraudDatabases.set("financial", {
    name: "Financial Fraud",
    type: "financial",
    domains: financialDomains,
    keywords: ["guaranteed profit", "quick return", "investment opportunity", "crypto profit"],
    lastUpdated: new Date(),
  });

  // Load phishing database
  const phishingDomains = new Set([
    "verify-account.vn", "confirm-identity.vn", "security-alert.vn",
    "update-password.vn", "reset-login.vn", "urgent-action.vn",
  ]);

  fraudDatabases.set("phishing", {
    name: "Phishing Sites",
    type: "phishing",
    domains: phishingDomains,
    keywords: ["verify", "confirm", "password", "login", "account", "security"],
    lastUpdated: new Date(),
  });

  // Load malware database
  const malwareDomains = new Set([
    "virus-download.vn", "malware-script.vn", "trojan-host.vn",
    "ransomware-site.vn", "botnet-master.vn",
  ]);

  fraudDatabases.set("malware", {
    name: "Malware Distribution",
    type: "malware",
    domains: malwareDomains,
    keywords: ["download", "install", "executable", "setup", "virus", "malware"],
    lastUpdated: new Date(),
  });

  // Load general e-commerce fraud
  const ecommerceDomains = new Set([
    "fake-shop.vn", "counterfeit-goods.vn", "no-shipping-shop.vn",
    "payment-scam.vn", "fake-payment.vn",
  ]);

  fraudDatabases.set("ecommerce", {
    name: "Fake E-commerce",
    type: "ecommerce",
    domains: ecommerceDomains,
    keywords: ["checkout", "payment", "limited stock", "free shipping"],
    lastUpdated: new Date(),
  });

  databasesLoaded = true;
  console.log("[v0] Fraud databases loaded:", fraudDatabases.size);
}

/**
 * Check if a domain is in fraud database
 */
export async function checkFraudDatabase(domain: string): Promise<FraudDatabaseMatch[]> {
  await initializeFraudDatabases();

  const matches: FraudDatabaseMatch[] = [];
  const domainLower = domain.toLowerCase();

  for (const [key, database] of fraudDatabases.entries()) {
    // Check exact match
    if (database.domains.has(domainLower)) {
      matches.push({
        isBlacklisted: true,
        database: database.name,
        fraudType: database.type,
        lastUpdated: database.lastUpdated,
        description: `Domain found in ${database.name} database`,
      });
    }

    // Check for domain variations (with/without www, different TLDs)
    const domainVariations = [
      domainLower,
      `www.${domainLower}`,
      domainLower.replace("www.", ""),
      domainLower.split(".")[0], // Just the main domain part
    ];

    for (const variation of domainVariations) {
      if (database.domains.has(variation)) {
        if (!matches.some((m) => m.database === database.name)) {
          matches.push({
            isBlacklisted: true,
            database: database.name,
            fraudType: database.type,
            lastUpdated: database.lastUpdated,
            description: `Domain variation found in ${database.name} database`,
          });
        }
      }
    }
  }

  return matches;
}

/**
 * Check if content contains fraud keywords from databases
 */
export async function checkFraudKeywords(textContent: string): Promise<{
  hasKeywords: boolean;
  detectedTypes: string[];
  matches: { fraudType: string; keywords: string[] }[];
}> {
  await initializeFraudDatabases();

  const matches: { fraudType: string; keywords: string[] }[] = [];
  const detectedTypes: string[] = [];
  const contentLower = textContent.toLowerCase();

  for (const [, database] of fraudDatabases.entries()) {
    const foundKeywords = database.keywords.filter((keyword) =>
      contentLower.includes(keyword.toLowerCase())
    );

    if (foundKeywords.length > 0) {
      matches.push({
        fraudType: database.type,
        keywords: foundKeywords,
      });
      if (!detectedTypes.includes(database.type)) {
        detectedTypes.push(database.type);
      }
    }
  }

  return {
    hasKeywords: matches.length > 0,
    detectedTypes,
    matches,
  };
}

/**
 * Get all fraud database statistics
 */
export async function getFraudDatabaseStats(): Promise<{
  totalDatabases: number;
  totalDomains: number;
  databases: Array<{
    name: string;
    type: string;
    domainCount: number;
    lastUpdated: Date;
  }>;
}> {
  await initializeFraudDatabases();

  let totalDomains = 0;
  const databases = Array.from(fraudDatabases.values()).map((db) => {
    const domainCount = db.domains.size;
    totalDomains += domainCount;
    return {
      name: db.name,
      type: db.type,
      domainCount,
      lastUpdated: db.lastUpdated,
    };
  });

  return {
    totalDatabases: fraudDatabases.size,
    totalDomains,
    databases,
  };
}

/**
 * Add custom domain to fraud database
 */
export async function addFraudDomain(domain: string, fraudType: string, reason: string): Promise<void> {
  await initializeFraudDatabases();

  const db = fraudDatabases.get(fraudType);
  if (db) {
    db.domains.add(domain.toLowerCase());
    console.log(`[v0] Added ${domain} to ${fraudType} database. Reason: ${reason}`);
  }
}

/**
 * Check domain similarity to known fraud domains
 * Uses simple string matching and fuzzy logic
 */
export async function checkDomainSimilarity(domain: string): Promise<{
  hasSimilar: boolean;
  similarDomains: string[];
  riskScore: number;
}> {
  await initializeFraudDatabases();

  const similarDomains: string[] = [];
  const domainParts = domain.split(".");
  const mainDomain = domainParts[0];

  // Check for typosquatting attempts
  for (const [, database] of fraudDatabases.entries()) {
    for (const fraudDomain of database.domains) {
      const fraudDomainParts = fraudDomain.split(".");
      const fraudMainDomain = fraudDomainParts[0];

      // Check for very similar domains (typosquatting)
      if (calculateSimilarity(mainDomain, fraudMainDomain) > 0.85) {
        if (!similarDomains.includes(fraudDomain)) {
          similarDomains.push(fraudDomain);
        }
      }
    }
  }

  return {
    hasSimilar: similarDomains.length > 0,
    similarDomains,
    riskScore: Math.min(20, similarDomains.length * 5),
  };
}

/**
 * Simple string similarity calculation (Levenshtein-like)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}
