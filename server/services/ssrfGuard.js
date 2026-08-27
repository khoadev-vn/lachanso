// ============ SSRF GUARD — Chặn backend truy cập tài nguyên nội bộ ============
// Bảo vệ các endpoint nhận URL từ người dùng (web-verify, analyze-link, proxy):
//   - Chỉ cho phép http/https
//   - Chặn IP nội bộ / loopback / link-local / metadata cloud (169.254.169.254)
//   - Chặn tên miền nội bộ (localhost, *.local, *.internal)
//   - Chặn cổng nhạy cảm (redis, mysql, ssh, docker, k8s...)
//   - DNS-resolve hostname rồi kiểm tra toàn bộ IP trước khi cho fetch
const dns = require('dns').promises;

const PRIVATE_IP_RANGES = [
  { re: /^10\./, name: '10/8' },
  { re: /^127\./, name: 'loopback' },
  { re: /^169\.254\./, name: 'link-local/metadata' },
  { re: /^172\.(1[6-9]|2[0-9]|3[01])\./, name: '172.16/12' },
  { re: /^192\.168\./, name: '192.168/16' },
  { re: /^0\./, name: '0/8' },
  { re: /^224\./, name: 'multicast' },
  { re: /^240\./, name: 'reserved' },
  { re: /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, name: 'CGNAT' },
  { re: /^::1$/, name: 'v6 loopback' },
  { re: /^::$/, name: 'v6 unspecified' },
  { re: /^fc[0-9a-f]{2}:/i, name: 'v6 unique-local' },
  { re: /^fd[0-9a-f]{2}:/i, name: 'v6 unique-local' },
  { re: /^fe80:/i, name: 'v6 link-local' },
  { re: /^fec0:/i, name: 'v6 site-local' },
  { re: /^2001:db8:/i, name: 'v6 documentation' },
  { re: /^64:ff9b:/i, name: 'v6 NAT64' }
];

const BLOCKED_PORTS = new Set([
  20, 21, 22, 23, 25, 53, 110, 111, 135, 137, 139, 143, 161, 389, 445, 465,
  587, 636, 873, 1080, 1099, 1433, 1521, 2181, 2375, 2376, 2379, 2380, 3306,
  3389, 4369, 5432, 5433, 5672, 5984, 6379, 7000, 7001, 8009, 8161, 9000,
  9042, 9092, 9200, 9300, 10250, 10255, 11211, 15672, 27017, 27018, 27019, 61616
]);

function isPrivateIp(ip) {
  const clean = String(ip || '').replace(/^\[|\]$/g, '').toLowerCase();
  const v4Mapped = clean.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4Mapped) return isPrivateIp(v4Mapped[1]);
  for (const r of PRIVATE_IP_RANGES) {
    if (r.re.test(clean)) return true;
  }
  return false;
}

function isIpLiteral(hostname) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || /^\[?[0-9a-f:]+\]?$/i.test(hostname);
}

// Kiểm tra an toàn 1 URL trước khi backend fetch.
// Trả về { ok: true } hoặc { ok: false, reason }.
async function assertSafeUrl(rawInput) {
  let url;
  try {
    url = new URL(String(rawInput || ''));
  } catch {
    return { ok: false, reason: 'URL không hợp lệ' };
  }

  if (!/^https?:$/i.test(url.protocol)) {
    return { ok: false, reason: 'Chỉ hỗ trợ giao thức http/https' };
  }

  if (url.username || url.password) {
    return { ok: false, reason: 'URL không được chứa thông tin đăng nhập' };
  }

  const port = url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
  if (BLOCKED_PORTS.has(port)) {
    return { ok: false, reason: `Cổng ${port} không được phép truy cập` };
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname) return { ok: false, reason: 'Thiếu tên miền' };
  if (hostname === 'localhost' || hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') || hostname.endsWith('.internal') ||
      hostname.endsWith('.home.arpa') || hostname.endsWith('.lan')) {
    return { ok: false, reason: 'Tên miền nội bộ bị chặn' };
  }

  if (isIpLiteral(hostname)) {
    if (isPrivateIp(hostname)) return { ok: false, reason: 'Địa chỉ IP nội bộ bị chặn' };
    return { ok: true };
  }

  // Resolve DNS: chặn nếu bất kỳ IP nào là nội bộ (chống DNS rebinding + metadata cloud)
  let ips = [];
  try { ips = ips.concat(await dns.resolve4(hostname)); } catch {}
  try { ips = ips.concat(await dns.resolve6(hostname)); } catch {}
  for (const ip of ips) {
    if (isPrivateIp(ip)) {
      return { ok: false, reason: `Tên miền trỏ tới địa chỉ nội bộ (${ip})` };
    }
  }

  return { ok: true };
}

module.exports = { assertSafeUrl, isPrivateIp, isIpLiteral, BLOCKED_PORTS };
