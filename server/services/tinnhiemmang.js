// ============ TINNHIEMMANG.VN — LIVE SEARCH VIA /filterObj ============
// Cổng thông tin tín nhiệm mạng (cảnh báo website lừa đảo của Việt Nam).
//
// Cơ chế tìm kiếm đúng (đã kiểm chứng):
//   - /website-lua-dao?q=<domain> hoặc ?name_obj=<domain> KHÔNG filter thật,
//     chỉ trả trang 1 (20 item mới nhất). -> KHÔNG DÙNG.
//   - Form filter thật: GET /filterObj?_token=<csrf>&type=fake&name_obj=<domain>
//     trả về đúng item khớp (0 hoặc 1+), cấu trúc <li class="item1">.
//   - Cần _token (Laravel CSRF) lấy từ trang /website-lua-dao
//     (<meta name="csrf-token"> hoặc <input name="_token">).
//
// Kết quả mỗi item: domain, ngày phát hiện, tổ chức bị mạo danh (+ slug),
// trạng thái (Đang chờ/Đang xác minh/Đang xử lý/Đã xử lý), loại (website/social).

const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const LIST_URL = 'https://tinnhiemmang.vn/website-lua-dao';
const FILTER_URL = 'https://tinnhiemmang.vn/filterObj';

let cachedToken = { value: null, expiresAt: 0 };
const resultCache = new Map(); // domain -> { expiresAt, data }

async function fetchToken() {
  if (cachedToken.value && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const r = await axios.get(LIST_URL, {
    timeout: 6000,
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    validateStatus: (s) => s < 400
  });
  const html = String(r.data || '');
  const meta = html.match(/<meta name="csrf-token" content="([^"]+)"/i);
  const input = html.match(/<input type="hidden" name="_token" value="([^"]+)"/i);
  const token = (meta && meta[1]) || (input && input[1]);
  if (!token) throw new Error('no-csrf-token');
  cachedToken = { value: token, expiresAt: Date.now() + 10 * 60 * 1000 };
  return token;
}

function stripSvg(html) {
  return String(html).replace(/<svg[\s\S]*?<\/svg>/gi, '');
}

function cleanText(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function parseItems(raw) {
  const items = String(raw || '').match(/<li class="item[^"]*">([\s\S]*?)<\/li>/g) || [];
  const out = [];
  for (const li of items) {
    const it = stripSvg(li);
    const dom = it.match(/webkit-box-2">\s*(?:<[^>]+>\s*)*(?:https?:\/\/)?\s*([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,63})\b/i);
    if (!dom) continue;
    const date = it.match(/Đã phát hiện ngày\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
    const orgA = it.match(/danh-ba-tin-nhiem\/([a-z0-9-]+)">\s*<label>[^<]*<\/label>\s*([^<]+)</i);
    const orgB = it.match(/<label>Mạo danh tổ chức:\s*<\/label>\s*([^<]+)/i);
    const status = it.match(/(Đang chờ|Đang xác minh|Đang xử lý|Đã xử lý)/i);
    const type = /icon_fb|facebook/i.test(li) ? 'social' : 'website';
    out.push({
      domain: dom[1].toLowerCase().replace(/^www\./, ''),
      detectedDate: date ? date[1] : null,
      org: cleanText(orgA ? orgA[2] : (orgB ? orgB[1] : null)),
      orgSlug: orgA ? orgA[1] : null,
      status: status ? status[1] : null,
      type
    });
  }
  return out;
}

/**
 * Live search một domain trong danh sách lừa đảo tinnhiemmang.vn.
 * @returns {{available:boolean, listed:boolean, item:object|null, error?:string}}
 */
async function searchTinnhiemmang(hostname) {
  const key = String(hostname || '').toLowerCase().replace(/^www\./, '');
  if (!key) return { available: false, listed: false, item: null, error: 'no-host' };

  const cached = resultCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  let result;
  try {
    const token = await fetchToken();
    const r = await axios.get(FILTER_URL, {
      timeout: 7000,
      params: { _token: token, type: 'fake', name_obj: key },
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'X-Requested-With': 'XMLHttpRequest' },
      validateStatus: (s) => s < 400
    });
    const items = parseItems(r.data);
    const item = items.find((i) => i.domain === key) || items.find((i) => key.includes(i.domain)) || items[0] || null;
    result = { available: true, listed: !!item, item };
  } catch (e) {
    result = { available: false, listed: false, item: null, error: e.message || 'network-error' };
  }

  resultCache.set(key, { expiresAt: Date.now() + 30 * 60 * 1000, data: result });
  return result;
}

module.exports = { searchTinnhiemmang };
