import { ShieldCheck, Info } from "lucide-react";

interface FacebookPage {
  handles: string[];
  names: string[];
  category: "gov" | "edu" | "media";
  label: string;
}

type FbScanResult = {
  id: string;
  name: string;
  detail: string;
  status: "success" | "warning";
  icon: any;
  gain?: number;
} | null;

const OFFICIAL_FB_PAGES: FacebookPage[] = [
  { handles: ["chinhphuvn", "portalchinhphu", "vanphongchinhphu"], names: ["chính phủ", "cổng thông tin điện tử chính phủ", "chinh phu"], category: "gov", label: "Chính phủ Việt Nam" },
  { handles: ["cucantoanthongtin", "cucatt"], names: ["cục an toàn thông tin", "cục an toàn thông tin việt nam"], category: "gov", label: "Cục An toàn Thông tin – Bộ TT&TT" },
  { handles: ["bocongan", "bo cong an", "cand"], names: ["bộ công an", "cục an ninh mạng"], category: "gov", label: "Bộ Công an / Cục An ninh mạng" },
  { handles: ["boyt"], names: ["bộ y tế"], category: "gov", label: "Bộ Y tế" },
  { handles: ["moet"], names: ["bộ giáo dục", "giáo dục và đào tạo"], category: "gov", label: "Bộ Giáo dục và Đào tạo" },
  { handles: ["boquocphong"], names: ["bộ quốc phòng", "quân đội"], category: "gov", label: "Bộ Quốc phòng" },
  { handles: ["vhttdl"], names: ["bộ văn hóa", "thể thao và du lịch"], category: "gov", label: "Bộ Văn hóa, Thể thao và Du lịch" },
  { handles: ["botainguyenmoitruong"], names: ["bộ tài nguyên và môi trường"], category: "gov", label: "Bộ Tài nguyên và Môi trường" },
  { handles: ["vksnd"], names: ["viện kiểm sát"], category: "gov", label: "Viện kiểm sát nhân dân tối cao" },
  { handles: ["toaan"], names: ["tòa án nhân dân"], category: "gov", label: "Tòa án Nhân dân tối cao" }
];

const EDU_FB_PAGES: FacebookPage[] = [
  { handles: ["truongdaihoctdm", "ufm"], names: ["đại học tài chính", "tài chính marketing", "ufm"], category: "edu", label: "Trường Đại học Tài chính – Marketing (UFM)" },
  { handles: ["daihocquocgiahn"], names: ["đại học quốc gia hà nội", "dhqgc", "dhqghn"], category: "edu", label: "Đại học Quốc gia Hà Nội" },
  { handles: ["hcmut"], names: ["đại học bách khoa", "bách khoa"], category: "edu", label: "Đại học Bách khoa" },
  { handles: ["daihoekinhtequocdan"], names: ["đại học kinh tế quốc dân"], category: "edu", label: "Đại học Kinh tế Quốc dân" },
  { handles: ["daihocsupham"], names: ["đại học sư phạm"], category: "edu", label: "Đại học Sư phạm" }
];

const MEDIA_FB_PAGES: FacebookPage[] = [
  { handles: ["vtv"], names: ["đài truyền hình việt nam", "vtv24"], category: "media", label: "VTV – Đài Truyền hình Việt Nam" },
  { handles: ["vov"], names: ["đài tiếng nói việt nam", "vov"], category: "media", label: "VOV – Đài Tiếng nói VN" },
  { handles: ["vietnamnet"], names: ["vietnamnet"], category: "media", label: "VietnamNet" },
  { handles: ["vnexpress"], names: ["vnexpress", "vn express"], category: "media", label: "VnExpress" },
  { handles: ["tuoitre"], names: ["tuổi trẻ"], category: "media", label: "Báo Tuổi Trẻ" },
  { handles: ["thanhnien"], names: ["thanh niên"], category: "media", label: "Báo Thanh Niên" },
  { handles: ["dantri"], names: ["dân trí"], category: "media", label: "Báo Dân Trí" },
  { handles: ["znews"], names: ["znews"], category: "media", label: "Znews" }
];

const ALL_PAGES: FacebookPage[] = [...OFFICIAL_FB_PAGES, ...EDU_FB_PAGES, ...MEDIA_FB_PAGES];

function norm(v: string): string {
  return v.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").replace(/\s+/g, "");
}

function extractFbHandleFromUrl(text: string): string | null {
  const patterns = [
    /(?:facebook\.com|fb\.com)\/([A-Za-z0-9.\-_]+)(?:\/|\?|#|$)/i,
    /(?:facebook\.com|fb\.com)\/pages?\/[^/]+\/([0-9]+)/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    const val = String(m[1] || "").toLowerCase();
    if (["profile", "pages", "share", "watch", "groups", "stories", "photo", "login", "help"].includes(val)) continue;
    if (/^\d{5,}$/.test(val)) continue;
    return norm(val);
  }
  return null;
}

function matchByHandle(text: string): FacebookPage | null {
  const h = extractFbHandleFromUrl(text);
  if (!h) return null;
  for (const page of ALL_PAGES) {
    for (const handle of page.handles) {
      const nh = norm(handle);
      if (nh && (nh === h || h.includes(nh) || nh.includes(h))) return page;
    }
  }
  return null;
}

function matchByName(text: string): FacebookPage | null {
  const t = norm(text);
  for (const page of ALL_PAGES) {
    for (const name of page.names) {
      const nn = norm(name);
      if (nn && t.includes(nn)) return page;
    }
  }
  return null;
}

export function detectReputableFbChannel(text: string): FacebookPage | null {
  return matchByHandle(text) || matchByName(text) || null;
}

export function hasFbUrl(text: string): boolean {
  return /facebook\.com|fb\.com|facebook\./i.test(text);
}

/**
 * Phân tích "có phải bài FB + kênh FB có uy tín hay không".
 * @param text      nội dung người dùng nhập (có thể chứa URL facebook.com)
 * @param sources   danh sách nguồn từ pipeline đối chiếu (press/AI), dùng làm bằng chứng bài gốc đến từ FB
 */
export function buildFbChannelReason(text: string, sources?: string[]): FbScanResult {
  const fbInSources = (sources ?? []).some((s) => {
    const low = String(s || "").toLowerCase();
    return low.includes("facebook") || low.includes("fb.com");
  });
  const fbInText = hasFbUrl(text);
  const looksFb = fbInText || fbInSources;
  if (!looksFb) return null;

  const official = detectReputableFbChannel(`${text} ${(sources ?? []).join(" ")}`);
  if (official) {
    return {
      id: "FB_OFFICIAL_CHANNEL",
      name: "Kênh Facebook chính thức",
      detail: `Nhận diện nội dung gắn với kênh Facebook chính thức của ${official.label} — trang đã được tổ chức xác thực, có uy tín nguồn cao.`,
      status: "success",
      icon: ShieldCheck,
      gain: 14
    };
  }
  return {
    id: "FB_CHANNEL_UNVERIFIED",
    name: "Kênh Facebook chưa xác minh",
    detail: "Phát hiện nguồn bài đăng đến từ Facebook nhưng kênh chưa nằm trong danh sách trang chính thức/xanh tích xác thực. Hãy kiểm chứng thêm bằng báo chí hoặc website chính thống.",
    status: "warning",
    icon: Info
  };
}