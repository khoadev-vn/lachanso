// ============ VERIFIED DOMAINS — Domain đã xác minh chủ web ============
// Được quản lý động qua endpoint admin (POST /api/v2/admin/trusted), KHÔNG sửa file tay.
// riskEngineV2 đọc file này để ép trạng thái 'safe' cho domain đã được duyệt.
// Lưu tại server/data/verifiedDomains.json (chỉ đổi 1 file trên VPS khi duyệt).

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../data/verifiedDomains.json');

function normalize(domain) {
  return String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

function load() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function save(list) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

function list() {
  return load();
}

// Kiểm tra hostname có trong danh sách đã xác minh (khớp exact / chính / subdomain)
function isTrusted(hostname) {
  const list = load();
  const host = normalize(hostname);
  if (!host) return null;
  const root = host.split('.').slice(-2).join('.');
  for (const item of list) {
    const d = normalize(item.domain);
    if (!d) continue;
    if (host === d || host.endsWith('.' + d)) return item;
    // tin cậy subdomain dưới root đã xác minh
    if (root === d) return item;
  }
  return null;
}

function add(entry) {
  const list = load();
  const d = normalize(entry.domain);
  if (!d || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)) return { ok: false, error: 'Domain không hợp lệ' };

  const trustScore = Math.max(50, Math.min(100, Number(entry.trustScore) || 90));
  const item = {
    domain: d,
    category: String(entry.category || 'general'),
    country: String(entry.country || 'VN'),
    trustScore,
    note: String(entry.note || 'Xác minh chủ web thủ công'),
    verifiedAt: new Date().toISOString()
  };

  const idx = list.findIndex((i) => normalize(i.domain) === d);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...item, verifiedAt: new Date().toISOString() };
  } else {
    list.push(item);
  }
  save(list);
  return { ok: true, entry: item };
}

function remove(domain) {
  const d = normalize(domain);
  let list = load();
  const before = list.length;
  list = list.filter((i) => normalize(i.domain) !== d);
  save(list);
  return { ok: true, removed: list.length < before };
}

module.exports = { load, save, list, add, remove, isTrusted, normalize };