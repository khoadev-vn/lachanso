const path = require('path');
const fs = require('fs');

const keywordsPath = path.join(__dirname, '../data/keywords.json');
const { GAMBLING_DOMAINS, GAMBLING_KEYWORDS, ALL_KEYWORD_GROUPS } = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));

const gamblingDomainsSet = new Set(GAMBLING_DOMAINS);

function isGamblingDomainInput(input) {
  const trimmed = input.trim();
  if (!trimmed) return false;

  let host = trimmed.toLowerCase().replace(/^www\./, "");
  let normalizedInput = trimmed.toLowerCase();

  try {
    const parsedUrl = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    normalizedInput = `${host}${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();
  } catch {
    host = host.split(/[/?#\s]/)[0];
    normalizedInput = trimmed.toLowerCase();
  }

  const domainMatched = Array.from(gamblingDomainsSet).some((domain) => host === domain || host.endsWith(`.${domain}`));
  if (domainMatched) return true;

  return GAMBLING_KEYWORDS.some((keyword) => {
    const compactKeyword = keyword.toLowerCase();
    return host.includes(compactKeyword) || normalizedInput.includes(compactKeyword);
  });
}



const PHONE_RE = /(?:\+?84|0)(?:[3|5|7|8|9])[0-9]{8}\b/g;
const BANK_ACCOUNT_RE = /\b(?:[0-9]{8,15})\b/g;
const CRYPTO_WALLET_RE = /\b(?:0x[0-9a-fA-F]{40}|bc1[0-9a-zA-Z]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[0-9a-zA-Z]{33}|tcp[0-9a-zA-Z]{33}|ban[0-9a-zA-Z]{42})\b/g;
const CONTACT_SIGNAL_KEYWORDS = [
  'chuyển khoản', 'chuyển tiền', 'nạp tiền', 'nhận tiền', 'tài khoản ngân hàng',
  'số tài khoản', 'stk', 'mã otp', 'mã xác thực', 'thanh toán', 'phí',
  'xác minh', 'đăng nhập', 'mật khẩu', 'căn cước', 'cccd', 'cmnd', 'sinh trắc'
];

function detectContactScam(text) {
  const input = String(text || '');
  const findings = [];

  const phones = [...new Set(input.match(PHONE_RE) || [])];
  const wallets = [...new Set(input.match(CRYPTO_WALLET_RE) || [])];
  const accountCandidates = (input.match(BANK_ACCOUNT_RE) || []).filter((s) => s.length >= 8);
  const phoneSet = new Set(phones);
  const accounts = [...new Set(accountCandidates.filter((s) => !phoneSet.has(s)))];

  const lower = input.toLowerCase();
  const hasSignal = CONTACT_SIGNAL_KEYWORDS.some((k) => lower.includes(k));

  if (phones.length > 0) {
    findings.push({
      id: 'CTX_PHONE',
      groupId: 'CTX_PHONE',
      name: 'Chứa số điện thoại kèm dấu hiệu lừa đảo',
      detail: `Văn bản chứa số điện thoại (${phones.slice(0, 3).join(', ')}) xuất hiện cùng các từ khóa nhạy cảm (chuyển tiền, OTP, xác minh...). Không gọi hoặc nhắn theo số này trước khi xác minh danh tính.`,
      penalty: hasSignal ? 35 : 12,
      isPositive: false
    });
  }

  if (wallets.length > 0) {
    findings.push({
      id: 'CTX_CRYPTO_WALLET',
      groupId: 'CTX_CRYPTO_WALLET',
      name: 'Chứa địa chỉ ví tiền mã hóa',
      detail: `Văn bản chứa địa chỉ ví crypto (${wallets[0].substring(0, 12)}...). Đây thường là mồi nhử yêu cầu nạp tiền vào ví để "mở khóa" hoặc "xác minh". Tuyệt đối không chuyển tiền mã hóa.`,
      penalty: hasSignal ? 55 : 25,
      isPositive: false
    });
  }

  if (accounts.length > 0 && hasSignal) {
    findings.push({
      id: 'CTX_BANK_ACCOUNT',
      groupId: 'CTX_BANK_ACCOUNT',
      name: 'Chứa số tài khoản kèm yêu cầu chuyển tiền',
      detail: `Văn bản cung cấp số tài khoản ngân hàng (${accounts[0]}) cùng lời kêu gọi chuyển tiền/nạp tiền. Kiểm chứng chủ tài khoản trước khi chuyển bất kỳ khoản nào.`,
      penalty: 30,
      isPositive: false
    });
  }

  return findings;
}

function analyzeTextByKeywords(text) {
  const input = text.length > 8000 ? text.slice(0, 8000) : text;



  const evasionCharsRegex = /[\u0370-\u03FF\u0400-\u04FF\u1D00-\u1D7F]/g;
  const evasionMatchRaw = input.match(evasionCharsRegex);



  const stripped = input.normalize("NFD").
  replace(/[\u0332\u0331\u0330\u0333\u0334\u0335\u0336\u0337\u0338]/g, '').
  replace(/[\u0300-\u036F]/gu, (c) => {


    const code = c.codePointAt(0);


    return c;
  });
  const normalizedText = stripped.normalize("NFC").
  replace(/(?<=\p{L})[.-](?=\p{L})/gu, '').
  toLowerCase();

  const results = [];


  if (evasionMatchRaw && evasionMatchRaw.length > 3) {
    results.push({
      groupId: "KG_EVASION_FONT",
      groupName: "Sử dụng ký tự đặc biệt để lách luật",
      matchedKeywords: [...new Set(evasionMatchRaw)],
      penalty: 45,
      isPositive: false
    });
  }

  ALL_KEYWORD_GROUPS.forEach((group) => {
    const matched = [];
    group.keywords.forEach((keyword) => {
      let searchTarget = normalizedText;
      let searchKeyword = keyword.normalize("NFC").replace(/(?<=\p{L})[.-](?=\p{L})/gu, '').toLowerCase();

      if (/(?<=\p{L})[.-](?=\p{L})/u.test(keyword)) {
        searchTarget = input.toLowerCase();
        searchKeyword = keyword.toLowerCase();
      }

      const regex = new RegExp(`(^|\\s|[.,!?'"\\u201C\\u201D\\[\\](){}:\\-])${searchKeyword}((?=\\s|[.,!?'"\\u201C\\u201D\\[\\](){}:\\-])|$)`, 'i');

      if (regex.test(searchTarget)) {
        matched.push(keyword);
      }
    });
    if (matched.length > 0) {
      const scaledPenalty = group.weight * Math.min(1 + (matched.length - 1) * 0.3, 2.5);
      results.push({
        groupId: group.id,
        groupName: group.name,
        matchedKeywords: matched,
        penalty: Math.round(scaledPenalty),
        isPositive: group.weight < 0
      });
    }
  });

  const foundGroupIds = results.map((r) => r.groupId);
  results.forEach((result) => {
    const group = ALL_KEYWORD_GROUPS.find((g) => g.id === result.groupId);
    if (group?.bonusIfCombined) {
      const hasCombination = group.bonusIfCombined.some((id) => foundGroupIds.includes(id));
      if (hasCombination) {
        result.penalty = Math.round(result.penalty * 1.5);
      }
    }
  });

  return results;
}

module.exports = {
  isGamblingDomainInput,
  analyzeTextByKeywords,
  detectContactScam
};
