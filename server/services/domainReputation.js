const axios = require('axios');
const dns = require('dns').promises;

// ============ DOMAIN REPUTATION & WHOIS ANALYSIS ============

// Known suspicious TLDs
const SUSPICIOUS_TLDS = [
  '.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.club', '.work', '.buzz',
  '.icu', '.vip', '.loan', '.racing', '.win', '.bid', '.stream', '.download',
  '.cricket', '.science', '.party', '.date', '.faith', '.accountant', '.review',
  '.accountant', '.men', '.click', '.link', '.space', '.surf', '.tokyo', '.cam'
];

// High-risk domain patterns
const HIGH_RISK_PATTERNS = [
  { pattern: /(?:bank|ngan-hang|nganhang|pay|payment|login|secure|verify).*(?:\d+\.){2,}/i, risk: 'high', reason: 'Banking phishing pattern' },
  { pattern: /(?:fb|facebook|google|microsoft|apple|amazon).*(?:support|help|verify|secure)/i, risk: 'high', reason: 'Brand impersonation' },
  { pattern: /(?:free|gift|bonus|reward|prize|winner|lottery).*(?:\d+|now|today)/i, risk: 'high', reason: 'Prize/gift scam pattern' },
  { pattern: /(?:covid|corona|vaccine|pandemic|ncov).*(?:cure|treatment|prevent)/i, risk: 'high', reason: 'Health misinformation pattern' },
  { pattern: /(?:invest|trading|crypto|bitcoin|forex).*(?:guarantee|profit|returns)/i, risk: 'high', reason: 'Investment scam pattern' },
];

async function getWHOISInfo(domain) {
  try {
    const { data } = await axios.get(`https://rdap.org/domain/${domain}`, { timeout: 8000 });
    
    const events = data.events || [];
    const registrationEvent = events.find(e => e.eventAction === 'registration');
    const expirationEvent = events.find(e => e.eventAction === 'expiration');
    
    const nameservers = (data.nameservers || []).map(ns => ns.ldhName || ns.name);
    
    return {
      available: true,
      name: data.ldhName || domain,
      status: data.status || [],
      registrationDate: registrationEvent?.eventDate,
      expirationDate: expirationEvent?.eventDate,
      nameservers,
      registrar: data.registrar?.name || 'Unknown',
      handle: data.handle
    };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

async function checkDNSReputation(domain) {
  const results = {
    hasMX: false,
    hasSPF: false,
    hasDMARC: false,
    hasDKIM: false,
    hasA: false,
    hasAAAA: false,
    txtRecords: [],
    issues: []
  };
  
  try {
    const mx = await dns.resolveMx(domain);
    results.hasMX = mx.length > 0;
  } catch {}
  
  try {
    const txt = await dns.resolveTxt(domain);
    results.txtRecords = txt.flat();
    results.hasSPF = results.txtRecords.some(r => r.includes('v=spf1'));
    
    // Check DKIM (common selectors)
    const selectors = ['default', 'google', 'selector1', 'selector2', 'k1', 'mandrill'];
    for (const sel of selectors) {
      try {
        const dkim = await dns.resolveTxt(`${sel}._domainkey.${domain}`);
        if (dkim.flat().some(r => r.includes('v=DKIM1'))) {
          results.hasDKIM = true;
          break;
        }
      } catch {}
    }
  } catch {}
  
  try {
    const dmarc = await dns.resolveTxt(`_dmarc.${domain}`);
    results.hasDMARC = dmarc.flat().some(r => r.includes('v=DMARC1'));
  } catch {}
  
  try {
    await dns.resolve4(domain);
    results.hasA = true;
  } catch {}
  
  try {
    await dns.resolve6(domain);
    results.hasAAAA = true;
  } catch {}
  
  if (!results.hasSPF) results.issues.push('Missing SPF record');
  if (!results.hasDMARC) results.issues.push('Missing DMARC record');
  if (!results.hasMX && !results.hasA) results.issues.push('No MX or A record');
  
  return results;
}

function analyzeDomainName(domain) {
  const results = {
    suspiciousTLD: false,
    highRiskPattern: false,
    longDomain: false,
    manySubdomains: false,
    hasIP: false,
    issues: [],
    riskScore: 0
  };
  
  const tld = '.' + domain.split('.').pop();
  results.suspiciousTLD = SUSPICIOUS_TLDS.includes(tld.toLowerCase());
  if (results.suspiciousTLD) {
    results.issues.push(`Suspicious TLD: ${tld}`);
    results.riskScore += 15;
  }
  
  for (const { pattern, risk, reason } of HIGH_RISK_PATTERNS) {
    if (pattern.test(domain)) {
      results.highRiskPattern = true;
      results.issues.push(reason);
      results.riskScore += risk === 'high' ? 25 : 15;
    }
  }
  
  results.longDomain = domain.length > 30;
  if (results.longDomain) {
    results.issues.push('Unusually long domain name');
    results.riskScore += 5;
  }
  
  const parts = domain.split('.');
  results.manySubdomains = parts.length > 3;
  if (results.manySubdomains) {
    results.issues.push('Multiple subdomains (possible phishing)');
    results.riskScore += 10;
  }
  
  results.hasIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
  if (results.hasIP) {
    results.issues.push('Domain is an IP address (highly suspicious)');
    results.riskScore += 30;
  }
  
  const hasOnlyNumbers = /^\d+[\.\-]?\d+[\.\-]?\d+[\.\-]?\d+$/.test(domain.split('.')[0]);
  if (hasOnlyNumbers) {
    results.issues.push('Domain name is mostly numbers');
    results.riskScore += 15;
  }
  
  const homoglyphCheck = /[аеорстрехАЕОРСТРЕХ]{3,}/i.test(domain);
  if (homoglyphCheck) {
    results.issues.push('Possible homograph attack (Cyrillic characters)');
    results.riskScore += 25;
  }
  
  return results;
}

async function fullDomainAnalysis(url) {
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    const hostname = parsed.hostname;
    const rootDomain = hostname.split('.').slice(-2).join('.');
    
    const [whois, dnsInfo, domainAnalysis] = await Promise.all([
      getWHOISInfo(rootDomain),
      checkDNSReputation(rootDomain).catch(() => ({})),
      Promise.resolve(analyzeDomainName(hostname))
    ]);
    
    let ageDays = null;
    if (whois.registrationDate) {
      ageDays = Math.floor((Date.now() - new Date(whois.registrationDate).getTime()) / (1000 * 60 * 60 * 24));
    }
    
    let totalRiskScore = domainAnalysis.riskScore;
    if (ageDays !== null && ageDays < 30) {
      totalRiskScore += 20;
      domainAnalysis.issues.push(`Domain registered ${ageDays} days ago (very new)`);
    } else if (ageDays !== null && ageDays < 90) {
      totalRiskScore += 10;
      domainAnalysis.issues.push(`Domain registered ${ageDays} days ago (relatively new)`);
    }
    
    if (dnsInfo.issues) {
      totalRiskScore += dnsInfo.issues.length * 5;
    }
    
    return {
      hostname,
      rootDomain,
      whois: {
        ...whois,
        ageDays
      },
      dns: dnsInfo,
      domainAnalysis: {
        ...domainAnalysis,
        riskScore: Math.min(totalRiskScore, 100)
      },
      overallRisk: totalRiskScore >= 40 ? 'high' : totalRiskScore >= 20 ? 'medium' : 'low'
    };
  } catch (e) {
    return { error: e.message, overallRisk: 'unknown' };
  }
}

module.exports = {
  getWHOISInfo,
  checkDNSReputation,
  analyzeDomainName,
  fullDomainAnalysis,
  SUSPICIOUS_TLDS,
  HIGH_RISK_PATTERNS
};
