export interface FraudDatabaseMatch {
  isBlacklisted: boolean;
  database: string;
  fraudType: string;
  lastUpdated: Date;
  description: string;
  scoreOverride?: number;
  alertCategory?: string;
}
export interface FraudDatabase {
  name: string;
  type: "gambling" | "financial" | "phishing" | "ecommerce" | "malware" | "general";
  domains: Set<string>;
  keywords: string[];
  lastUpdated: Date;
}
const fraudDatabases = new Map<string, FraudDatabase>();
let databasesLoaded = false;
export async function initializeFraudDatabases(): Promise<void> {
  if (databasesLoaded)
  return;
  const gamblingDomains = new Set([
  "sunwin.com", "sunwin.vn", "sunwin-app.com", "sunwin.qa", "sunwin.co", "sunwin.io",
  "sunwin.gg", "sunwin.app", "sunwin.pro", "sunwin.live", "sunwin-vip.com",
  "sunwins.com", "sunwin-play.com", "play-sunwin.com", "sunwin888.com",
  "vin777.com", "vin777.vn", "vin777.co", "vin777.io", "vin777.app",
  "vinwin.com", "vinwin777.com",
  "iwin.com", "iwin.vn", "iwin.app", "iwin.live", "iwin-vip.com",
  "iwin888.com", "playiwin.com",
  "f8bet.com", "f8bet.vn", "f8bet.app", "f8bet.live", "f8bet.pro",
  "f8bet888.com",
  "fun88.com", "fun88.vn", "fun88asia.com", "fun88.app", "fun88.co",
  "fun88.live", "fun888.com", "fun88thai.com",
  "188bet.com", "188bet.vn", "188bet.app", "188bet.live", "bet188.com",
  "12play.com", "12play.vn", "12play.app", "12play.live",
  "w88.com", "w88.vn", "w88.app", "w88.live", "w88.co", "w88.pro",
  "w88thai.com", "w88asia.com",
  "ae888.com", "ae888.vn", "ae888.app", "ae888.live",
  "sands.vn", "sands88.vn", "kingbet.vn", "bet88.com", "bet88.vn",
  "casino.com", "online-casino.vn", "ca-do.com", "casino.vn",
  "betfair.com", "bet365.com", "ladbrokes.com", "betfred.com",
  "williamhill.com", "betvictor.com", "paddy-power.com", "bwin.com",
  "dafabet.com", "maxbet.com", "188188.com", "live-casino.com"]
  );
  fraudDatabases.set("gambling", {
    name: "Danh sách đen Cờ bạc / Cá cược lừa đảo",
    type: "gambling",
    domains: gamblingDomains,
    keywords: ["casino", "betting", "poker", "slots", "jackpot", "odds", "deposit", "withdraw", "cá cược", "đá gà", "nổ hũ", "tài xỉu"],
    lastUpdated: new Date()
  });
  const financialDomains = new Set([
  "crypto-profit.vn", "bitcoin-boost.vn", "forex-master.vn",
  "quick-loan.vn", "instant-cash.vn", "fast-credit.vn",
  "investment-guarantee.vn", "profit-machine.vn",
  "wealth-builder.vn", "money-multiplier.vn",
  "mlm-network.vn", "pyramid-scheme.vn"]
  );
  fraudDatabases.set("financial", {
    name: "Danh sách đen Tài chính giả mạo",
    type: "financial",
    domains: financialDomains,
    keywords: ["guaranteed profit", "quick return", "investment opportunity", "crypto profit", "lãi suất cao", "đầu tư thông minh"],
    lastUpdated: new Date()
  });
  const phishingDomains = new Set([
  "verify-account.vn", "confirm-identity.vn", "security-alert.vn",
  "update-password.vn", "reset-login.vn", "urgent-action.vn"]
  );
  fraudDatabases.set("phishing", {
    name: "Danh sách đen Giả mạo lấy OTP / Phishing",
    type: "phishing",
    domains: phishingDomains,
    keywords: ["verify", "confirm", "password", "login", "account", "security", "xác thực tài khoản", "nhập otp"],
    lastUpdated: new Date()
  });
  const malwareDomains = new Set([
  "virus-download.vn", "malware-script.vn", "trojan-host.vn",
  "ransomware-site.vn", "botnet-master.vn"]
  );
  fraudDatabases.set("malware", {
    name: "Danh sách Mã độc độc hại",
    type: "malware",
    domains: malwareDomains,
    keywords: ["download", "install", "executable", "setup", "virus", "malware", "tải ngay", "cài đặt phần mềm"],
    lastUpdated: new Date()
  });
  const ecommerceDomains = new Set([
  "fake-shop.vn", "counterfeit-goods.vn", "no-shipping-shop.vn",
  "payment-scam.vn", "fake-payment.vn"]
  );
  fraudDatabases.set("ecommerce", {
    name: "Danh sách Cửa hàng giả mạo / Ecommerce Scam",
    type: "ecommerce",
    domains: ecommerceDomains,
    keywords: ["checkout", "payment", "limited stock", "free shipping", "khuyến mãi khủng"],
    lastUpdated: new Date()
  });
  databasesLoaded = true;
  console.log("[Lá Chắn Số] Cơ sở dữ liệu lừa đảo đã được nạp:", fraudDatabases.size);
}
export async function checkFraudDatabase(domain: string): Promise<FraudDatabaseMatch[]> {
  await initializeFraudDatabases();
  const matches: FraudDatabaseMatch[] = [];
  const domainLower = domain.toLowerCase().trim();
  for (const [key, database] of fraudDatabases.entries()) {
    const domainVariations = [
    domainLower,
    `www.${domainLower}`,
    domainLower.replace(/^www\./, "")];

    let hasMatch = false;
    let descriptionText = "";
    for (const variation of domainVariations) {
      if (database.domains.has(variation)) {
        hasMatch = true;
        descriptionText = `Tên miền nằm trong ${database.name} của hệ thống.`;
        break;
      }
    }
    if (hasMatch) {
      const isCriticalScam = database.type === "gambling" || database.type === "phishing" || database.type === "financial";
      matches.push({
        isBlacklisted: true,
        database: database.name,
        fraudType: database.type,
        lastUpdated: database.lastUpdated,
        description: isCriticalScam ?
        `Lá Chắn Số phát hiện trang web cờ bạc lừa đảo trực tuyến cực kỳ nguy hiểm! Đánh giá an toàn: 0 ĐIỂM.` :
        descriptionText,
        scoreOverride: isCriticalScam ? 0 : undefined,
        alertCategory: isCriticalScam ? "Cờ bạc lừa đảo" : undefined
      });
    }
  }
  return matches;
}
export async function checkFraudKeywords(textContent: string): Promise<{
  hasKeywords: boolean;
  detectedTypes: string[];
  matches: {
    fraudType: string;
    keywords: string[];
  }[];
}> {
  await initializeFraudDatabases();
  const matches: {
    fraudType: string;
    keywords: string[];
  }[] = [];
  const detectedTypes: string[] = [];
  const contentLower = textContent.toLowerCase();
  for (const [, database] of fraudDatabases.entries()) {
    const foundKeywords = database.keywords.filter((keyword) => contentLower.includes(keyword.toLowerCase()));
    if (foundKeywords.length > 0) {
      matches.push({
        fraudType: database.type,
        keywords: foundKeywords
      });
      if (!detectedTypes.includes(database.type)) {
        detectedTypes.push(database.type);
      }
    }
  }
  return {
    hasKeywords: matches.length > 0,
    detectedTypes,
    matches
  };
}
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
      lastUpdated: db.lastUpdated
    };
  });
  return {
    totalDatabases: fraudDatabases.size,
    totalDomains,
    databases
  };
}
export async function addFraudDomain(domain: string, fraudType: string, reason: string): Promise<void> {
  await initializeFraudDatabases();
  const db = fraudDatabases.get(fraudType);
  if (db) {
    db.domains.add(domain.toLowerCase().trim());
    console.log(`[Lá Chắn Số] Đã thêm ${domain} vào cơ sở dữ liệu ${fraudType}. Lý do: ${reason}`);
  }
}
export async function checkDomainSimilarity(domain: string): Promise<{
  hasSimilar: boolean;
  similarDomains: string[];
  riskScore: number;
}> {
  await initializeFraudDatabases();
  const similarDomains: string[] = [];
  const domainParts = domain.split(".");
  const mainDomain = domainParts[0];
  for (const [, database] of fraudDatabases.entries()) {
    for (const fraudDomain of database.domains) {
      const fraudDomainParts = fraudDomain.split(".");
      const fraudMainDomain = fraudDomainParts[0];
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
    riskScore: Math.min(20, similarDomains.length * 5)
  };
}
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0)
  return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).
  fill(null).
  map(() => Array(str1.length + 1).fill(0));
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + indicator);
    }
  }
  return track[str2.length][str1.length];
}
