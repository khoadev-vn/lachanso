// ============ PAS HOSTS — Subdomain Phishing (PaaS/SaaS) ============
// Root domain của các hạ tầng lưu trữ miễn phí KHÔNG được kế thừa uy tín.
// Nếu hostname kết thúc bằng 1 trong các root này → coi như do người dùng tạo,
// phải đưa cả subdomain + pathname vào Levenshtein + scan content riêng.
module.exports = {
  // Map: rootDomain -> loại hạ tầng
  PAS_HOSTS: {
    'vercel.app': 'PaaS',
    'now.sh': 'PaaS',
    'github.io': 'PaaS',
    'gitlab.io': 'PaaS',
    'firebaseapp.com': 'PaaS',
    'web.app': 'PaaS (Firebase)',
    'netlify.app': 'PaaS',
    'wixsite.com': 'SaaS',
    'onrender.com': 'PaaS',
    'render.com': 'PaaS',
    'herokuapp.com': 'PaaS',
    'pages.dev': 'PaaS (Cloudflare)',
    'trycloudflare.com': 'PaaS (CF Tunnel)',
    'surge.sh': 'PaaS',
    'glitch.me': 'PaaS',
    'repl.co': 'PaaS',
    'azurewebsites.net': 'PaaS (Azure)',
    'azurestaticapps.net': 'PaaS (Azure)',
    'cloudfront.net': 'CDN',
    'amazonaws.com': 'Cloud (AWS)',
    's3.amazonaws.com': 'Cloud (AWS S3)',
    'appspot.com': 'Cloud (GCP)',
    'googleapis.com': 'Cloud (GCP)',
    'ngrok.io': 'Tunnel',
    'ngrok-free.app': 'Tunnel',
    'serveo.net': 'Tunnel',
    'localtunnel.me': 'Tunnel',
    'duckdns.org': 'DDNS',
    'freewha.com': 'PaaS',
    'topfreehost.net': 'PaaS',
    'yolasite.com': 'PaaS',
    'webs.com': 'PaaS',
    'bravesites.com': 'PaaS',
    'bitrix24.site': 'SaaS',
    'my-vue-app.vercel.app': 'PaaS'
  },

  // PAS_HOSTS dạng suffix động (vercel có "*-vercel.app", etc)
  isPaaSHost(hostname) {
    if (!hostname) return false;
    const h = hostname.toLowerCase();
    // Khớp chính xác
    if (this.PAS_HOSTS[h]) return true;
    // Khớp suffix (subdomain.vercel.app → vercel.app)
    const parts = h.split('.');
    if (parts.length < 2) return false;
    const eTLDPlusOne = parts.slice(-2).join('.');
    if (this.PAS_HOSTS[eTLDPlusOne]) return true;
    // 3-đuôi: *.github.io, *.firebaseapp.com, *.wixsite.com 2-suffix đã cover.
    return false;
  },

  // Loại hạ tầng (PaaS/SaaS/CDN/Tunnel) — chỉ khi host là PaaS
  getPaasType(hostname) {
    if (!hostname) return null;
    const h = hostname.toLowerCase();
    if (this.PAS_HOSTS[h]) return this.PAS_HOSTS[h];
    const parts = h.split('.');
    if (parts.length < 2) return null;
    const eTLDPlusOne = parts.slice(-2).join('.');
    return this.PAS_HOSTS[eTLDPlusOne] || null;
  },

  // Trả về "user token" (subdomain đứng trước root) để đưa vào Levenshtein/check.
  // Chỉ có ý nghĩa với host PaaS thực sự — nếu không phải PaaS → null.
  getUserToken(hostname) {
    if (!this.isPaaSHost(hostname)) return null;
    const h = hostname.toLowerCase();
    const parts = h.split('.');
    if (parts.length < 3) return null;
    // Bỏ www.*, *.user.paas
    const segments = parts.slice(0, -2);
    while (segments.length && ['www', 'app', 'blog', 'shop', 'store'].includes(segments[0])) {
      segments.shift();
    }
    return segments.join('') || null; // compact: momo-verifi → momoverifi
  }
};