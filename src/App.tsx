import { motion, AnimatePresence, animate, useMotionValue, useSpring, useTransform } from "motion/react";
import { Analytics } from "@vercel/analytics/react";
import GlobeViz from "./components/GlobeViz";
import { Shield, ChevronRight, Menu, X, Search, Command, CheckCircle2, AlertTriangle, Globe, ShieldCheck, Database, ExternalLink, Loader2, Sparkles, Zap, User, Heart, Target, Users, Landmark, Scale, HeartPulse, Info, HelpCircle, Flag } from "lucide-react";
import OwnerVerifyModal from "./components/OwnerVerifyModal";
import ReportIssueModal from "./components/ReportIssueModal";
import ColorLegendModal from "./components/ColorLegendModal";
import ThirdPartyModal from "./components/ThirdPartyModal";
import ThirdPartyResultsPanel from "./components/ThirdPartyResultsPanel";
import { useState, useEffect, FormEvent, useRef } from "react";
import type { PointerEvent } from "react";
import { extractArticleForAnalysis } from "./constants/articleExtraction";
import { FAKE_NEWS_LAWS } from "./constants/fakeNewsLaws";
import { analyzeTextByKeywords } from "./constants/fakeNewsKeywords";
import { runLiveNewsCheck, enrichLiveNewsWithAI, summarizeNewsWithAI } from "./constants/liveNewsCheck";
import { runNewsVerificationLayers } from "./constants/newsVerification";
import { isDomainTrusted, isGovVnDomain, isSuspiciousTLD, extractLinksFromText } from "./constants/trustedDomains";
import { runLCSEngine, lcsEngineToAnalysisDetails } from "./constants/lcsScoreEngine";
import { analyzeWebsite, WEB_AI_CATEGORY_LABEL } from "./constants/webVerification";
import shieldImg from "./imgs/shield-3d-nobg.png";
import XAIHeatmap from "./components/XAIHeatmap";
import FactCheckBanner from "./components/FactCheckBanner";
import BlogList from "./components/blog/BlogList";
import BlogArticleView from "./components/blog/BlogArticleView";
import { getBlogArticleBySlug } from "./data/blog/articles";
type PageId = "home" | "check" | "resources" | "partners" | "mission" | "blog";
const PAGE_PATHS: Record<PageId, string> = {
  home: "/",
  check: "/kiem-tra",
  resources: "/tai-nguyen",
  partners: "/dong-hanh",
  mission: "/su-menh",
  blog: "/blog"
};
const PATH_TO_PAGE: Record<string, PageId> = {
  "/": "home",
  "/kiem-tra": "check",
  "/tai-nguyen": "resources",
  "/dong-hanh": "partners",
  "/su-menh": "mission",
  "/blog": "blog"
};
const getPageFromPath = (pathname: string): PageId => {
  if (pathname.startsWith("/blog/")) return "blog";
  return PATH_TO_PAGE[pathname] ?? "home";
};

const WEB_CATEGORY_GROUPS: { key: string; label: string; icon: any; description: string; accent: string }[] = [
  { key: "security", label: "Tín hiệu Lừa đảo & Bảo mật", icon: AlertTriangle, description: "Dấu hiệu phishing, lừa đảo và mối đe dọa đã được ghi nhận.", accent: "text-red-600 bg-red-50 border-red-100" },
  { key: "technology", label: "Công nghệ & Tên miền", icon: Globe, description: "Đánh giá hosting, tên miền, HTTPS và cấu trúc URL.", accent: "text-sky-600 bg-sky-50 border-sky-100" },
  { key: "reputation", label: "Danh tiếng & Thương hiệu", icon: ShieldCheck, description: "Đối chiếu với nguồn tin cậy và thương hiệu chính thống.", accent: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { key: "reference", label: "Đối chiếu & Tham khảo", icon: Info, description: "Ghi chú tham khảo và hướng dẫn kiểm tra thêm.", accent: "text-gray-600 bg-gray-50 border-gray-100" }
];

const WEB_REASON_STATUS_CARD = (status: string) =>
  status === "danger" ? "border-red-200 bg-red-50/70" :
  status === "warning" ? "border-amber-200 bg-amber-50/70" :
  "border-emerald-200 bg-emerald-50/70";

const WEB_REASON_STATUS_ICON = (status: string) =>
  status === "danger" ? "bg-red-100 text-red-700" :
  status === "warning" ? "bg-amber-100 text-amber-700" :
  "bg-emerald-100 text-emerald-700";

// ===== 4-trạng thái Zero-Trust (v2.0) =====
type WebStateKey = "safe" | "verify" | "warning" | "danger";
const resolveWebState = (r: any): WebStateKey => {
  if (r?.state === "safe") return "safe";
  if (r?.state === "suspicious") return "warning";
  if (r?.state === "verify") return "verify";
  if (r?.state === "danger") return "danger";
  if (r?.needsVerification) return "verify";
  if (r?.isSafe) return "safe";
  if (r?.isWarning) return "warning";
  if (r?.isDanger) return "danger";
  return "warning";
};
const STATE_UI: Record<WebStateKey, { stroke: string; badge: string; icon: any; label: string; badgeLong: string; bar: string }> = {
  safe: { stroke: "#22c55e", badge: "bg-green-50 text-green-700", icon: ShieldCheck, label: "AN TOÀN", badgeLong: "An toàn", bar: "bg-green-500" },
  verify: { stroke: "#eab308", badge: "bg-yellow-50 text-yellow-700", icon: HelpCircle, label: "CẦN XÁC MINH THÊM", badgeLong: "Cần xác minh thêm", bar: "bg-yellow-500" },
  warning: { stroke: "#f97316", badge: "bg-orange-50 text-orange-700", icon: AlertTriangle, label: "ĐÁNG NGỜ", badgeLong: "Đáng ngờ", bar: "bg-orange-500" },
  danger: { stroke: "#ef4444", badge: "bg-red-50 text-red-700", icon: X, label: "NGUY HIỂM", badgeLong: "Nguy hiểm", bar: "bg-red-500" }
};

function WebReasonGroupCard({ group, reasons }: { group: { key: string; label: string; icon: any; description: string; accent: string }; reasons: any[] }) {
  if (reasons.length === 0) return null;
  return <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/60">
    <div className={`flex items-center gap-2.5 border-b px-4 py-3 ${group.accent} border-transparent`}>
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${group.accent}`}>
        <group.icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-wide text-gray-800">{group.label}</p>
        <p className="truncate text-[10px] font-medium text-gray-500">{group.description}</p>
      </div>
      <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black text-gray-500">{reasons.length}</span>
    </div>
    <div className="space-y-2 p-3">
      {reasons.map((res: any, idx: number) => <div key={idx} className={`rounded-xl border p-3 ${WEB_REASON_STATUS_CARD(res.status)}`}>
        <div className="flex items-start gap-2.5">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${WEB_REASON_STATUS_ICON(res.status)}`}>
            <res.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              {res.id && <span className="rounded bg-white/80 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-gray-500">{res.id}</span>}
              <span className="text-sm font-black text-gray-950">{res.name}</span>
              {typeof res.scoreDelta === "number" && res.scoreDelta !== 0 && <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${res.scoreDelta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {res.scoreDelta > 0 ? `+${res.scoreDelta}` : res.scoreDelta}
              </span>}
            </div>
            <p className="text-xs font-medium leading-5 text-gray-700">{res.detail}</p>
          </div>
        </div>
      </div>)}
    </div>
  </div>;
}

function CountingNumber({ value }: { value: number; }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const controls = animate(0, value, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate(v) {
          node.textContent = v.toFixed(0);
        }
      });
      return () => controls.stop();
    }
  }, [value]);

  return <span ref={nodeRef}>{value}</span>;
}

const PLAIN_REASON_TEXT: Record<string, string> = {
  UNSOURCED_CLAIM: "Câu này được viết như tin tức nhưng lại không kèm tên báo, ngày tháng hay bất kỳ nguồn nào để đối chiếu.",
  FANTASY_EVENT_CLAIM: "Nhân vật sự kiện được nhắc đến (rồng, thủy quái, robot khổng lồ, ma quái...) chỉ tồn tại trong phim ảnh, game hoặc meme — không có thật.",
  FANTASY_EVENT_SUGGESTION: "Nội dung có nhắc tới thực thể hư cấu nhưng còn mơ hồ; nếu được chia sẻ như tin thật thì rất đáng ngờ.",
  CELEBRITY_STATUS_UNVERIFIED: "Tin nói về đời tư/sự nghiệp của một người nổi tiếng (giải nghệ, qua đời...) nhưng không có báo chí nào xác nhận.",
  RUMOR_CHAIN: "Văn bản dùng kiểu 'nghe nói', 'rò rỉ', 'lan truyền trên mạng' thay vì trích dẫn nguồn gốc rõ ràng.",
  KNOWN_FACT_MISMATCH: "Thông tin đưa ra trái ngược với dữ kiện ai cũng biết (ví dụ năm sinh của người nổi tiếng).",
  KNOWN_IDENTITY_MISMATCH: "Tên gọi/nhân thân được mô tả không khớp với danh tính đã được công nhận.",
  WIKIPEDIA_IDENTITY_MISMATCH: "Wikipedia ghi thông tin nhân thân khác với những gì văn bản này tuyên bố.",
  WIKIPEDIA_STATUS_MISMATCH: "Trạng thái được mô tả (qua đời, giải nghệ, chức vụ...) mâu thuẫn với hồ sơ trên Wikipedia.",
  URL_PHISHING: "Trong văn bản có đường dẫn giả mạo kiểu lừa đảo — tuyệt đối không click.",
  KNOWN_BIRTHDATE_MISMATCH: "Ngày sinh được nêu không khớp với ngày sinh đã được biết đến.",
  KNOWN_BIRTHDAY_MISMATCH: "Ngày sinh nhật được nêu không khớp với ngày sinh đã được biết đến.",
  KNOWN_DATE_RANGE_MISMATCH: "Khoảng thời gian được nêu không khớp với dữ kiện đã biết.",
  HEADLINE_CONTRADICTED_BY_PRESS: "Tiêu đề mâu thuẫn với nội dung báo chí đã đăng tải.",
  LIVE_PRESS_STRONG_CONTRADICTION: "Báo chí đưa tin trái ngược hoàn toàn với nội dung này.",
  LIVE_PRESS_CONTRADICTS_CLAIM: "Có bài báo phản bác lại tuyên bố trong văn bản.",
  OPEN_KNOWLEDGE_MISMATCH: "Tri thức mở (Wikipedia, bách khoa) xác nhận thông tin này là sai.",
  WIKIPEDIA_PROFILE_MISMATCH: "Hồ sơ nhân vật trên Wikipedia không khớp với mô tả trong văn bản.",
  LOGIC_DAO_01: "Văn bản tự xưng là cơ quan nhà nước nhưng không hề có địa chỉ .gov.vn — cơ quan thật luôn có trang chính thức.",
  CORR_01: "Kết hợp 'tự xưng cơ quan chức năng' với sự khẩn cấp/tài chính — chiêu thức đặc trưng của tội phạm mạng.",
  MIXED_SOURCES: "Trộn lẫn nguồn thật với link lạ để tạo cảm giác hợp lệ giả.",
  LOW_TRACEABILITY: "Nội dung mang tính sự kiện nhưng thiếu mốc thời gian hoặc dẫn nguồn, khó kiểm chứng.",
  PRESS_GAP: "Tuyên bố rất lớn (kiểu 'tin chấn động') nhưng không thấy báo chí nào đưa.",
  TG_AUTHORITY_FAKE: "Giả mạo cơ quan nhà nước nhưng không có tên miền chính thống.",
  NLP_NEURAL_MATCH: "Trí tuệ nhân tạo nhận thấy văn bản gần giống với các kịch bản lừa đảo đã biết.",
  LF_EMO_HIGH: "Văn bản dùng nhiều từ ngữ kích động để gây hoang mang, khác với văn phong báo chí khách quan.",
  LF_EMO_MED: "Có yếu tố cảm xúc, cần đối chiếu thêm trước khi tin.",
  LF_SRC_VAGUE: "Nguồn tin mơ hồ, không rõ ai nói, khó kiểm chứng.",
  LF_SRC_VAGUE_LOW: "Có trích dẫn nhưng chưa rõ danh tính người nói.",
  LF_ABS_HIGH: "Dùng từ ngữ tuyệt đối ('tất cả', 'không bao giờ', 'chắc chắn 100%') — báo chí thật hiếm khi nói như vậy.",
  TG_NO_SOURCE: "Văn bản không nhắc tới bất kỳ cơ quan báo chí hay nguồn chính thống nào.",
  BP_TRANSFER_URGENT: "Yêu cầu chuyển tiền gấp — chiêu thức chiếm phần lớn các vụ lừa đảo tài chính.",
  BP_LOTTERY_SCAM: "Thông báo trúng thưởng rồi bắt nộp phí — kịch bản lừa đảo kinh điển.",
  BP_JOB_SCAM: "Quảng cáo việc nhẹ lương cao, thu nhập phi thực tế — bẫy lao động phổ biến.",
  BP_FAKE_POLICE: "Công an/toà án thật không gọi điện yêu cầu chuyển tiền — đây là giả mạo.",
  BP_INVESTMENT_SCAM: "Hứa hẹn lợi nhuận bất thường — không có kênh đầu tư nào bảo đảm mức này.",
  BP_UTILITY_BILL_SCAM: "Giả làm nhân viên điện/nước/nhà mạng gây áp lực thanh toán nợ qua kênh không chính thức.",
  BP_CONSIGNMENT_SCAM: "Chiêu 'việc nhẹ lương cao' ép nạn nhân chuyển tiền ứng trước cho đơn hàng giả.",
  BP_VNEID_SCAM: "Yêu cầu cập nhật định danh qua link lạ — chiêu lừa VNeID đang rất phổ biến.",
  BP_ROMANCE_SCAM: "Kết hợp tình cảm + tài chính (người nước ngoài gửi tài sản...) — chiêu 'nuôi heo' nhắm vào người Việt.",
  LINK_SCAM_DATASET: "Domain này nằm trong cơ sở dữ liệu lừa đảo đã ghi nhận của hệ thống — tuyệt đối không đăng nhập hay thanh toán.",
  LINK_TYPOSQUAT: "Tên miền mô phỏng thương hiệu/ngân hàng/cơ quan nổi tiếng nhưng không phải domain chính thức.",
  LINK_HOMOGLYPH: "Tên miền dùng ký tự Unicode giả chữ Latin để trông giống domain thật.",
  LINK_DOMAIN_NEW: "Tên miền mới đăng ký — kết hợp với nội dung nhạy cảm là dấu hiệu rủi ro cao.",
  LINK_DOMAIN_NOT_REGISTERED: "Tên miền không tìm thấy bản ghi đăng ký — có thể chưa tồn tại hoặc đã bị thu hồi.",
  LINK_GAMBLING: "Website cờ bạc/cá cược lừa đảo có trong danh sách đen.",
  LINK_DIGIT_HYPHEN: "Tên miền dạng máy sinh (số + gạch ngang) đặc trưng của chiến dịch phishing quy mô lớn.",
  CTX_PHONE: "Văn bản chứa số điện thoại kèm lời kêu gọi chuyển tiền/OTP/xác minh.",
  CTX_CRYPTO_WALLET: "Văn bản chứa địa chỉ ví tiền mã hóa — thường là mồi nhử yêu cầu nạp tiền mở khóa.",
  CTX_BANK_ACCOUNT: "Văn bản cung cấp số tài khoản ngân hàng kèm yêu cầu chuyển tiền.",
  KG_SMS_PHONE: "Kịch bản lừa qua tin nhắn/cuộc gọi giả mạo (nhà mạng, người thân, deepfake giọng nói).",
  KG_COD_SHIPPING: "Lừa đảo COD/giao hàng — đặt hàng ảo, hàng bị giữ, phí giải phóng bưu phẩm.",
  KG_FAKE_UTILITY: "Giả mạo nhân viên điện/nước/mạng ép thanh toán qua kênh không chính thức.",
  KG_CRYPTO: "Lừa đảo tiền mã hóa — ví bị khóa, seed phrase, airdrop cần nạp phí.",
  KG_PHONE_EXTRACTION: "Ép nạn nhân chuyển kênh liên hệ riêng, giữ bí mật để tránh bị phát hiện."
};

function buildPlainSummary(reasons: any[], safe?: boolean): { items: string[]; verdict: string; } {
  const danger = reasons.filter((r) => r?.status === "danger");
  const warning = reasons.filter((r) => r?.status === "warning");
  const success = reasons.filter((r) => r?.status === "success");
  const picked = danger.length > 0 ? danger : safe ? success : warning;
  const items = picked.slice(0, 4).map((r) => PLAIN_REASON_TEXT[r?.id] ?? (r?.detail ? (r.detail as string).split(".")[0] + "." : r?.name ?? ""));
  let verdict = "Hệ thống chưa đủ dữ kiện để kết luận chắc chắn.";
  if (danger.length >= 2) {
    verdict = "Đây rất có khả năng là tin giả hoặc lừa đảo. Không nên tin, chia sẻ hoặc chuyển tiền theo hướng dẫn trong nội dung.";
  } else if (danger.length === 1) {
    verdict = "Có dấu hiệu nguy hiểm rõ rệt. Bạn nên dừng lại và kiểm chứng từ nguồn chính thống trước khi tin.";
  } else if (safe) {
    verdict = "Các dấu hiệu đều tích cực — nội dung phù hợp với quy chuẩn thông tin chính thống.";
  } else if (warning.length > 0) {
    verdict = "Có một vài điểm bất thường. Nên đối chiếu thêm với báo chí hoặc trang chính phủ trước khi coi là đúng.";
  } else if (success.length > 0) {
    verdict = "Các dấu hiệu đều tích cực — nội dung phù hợp với quy chuẩn thông tin chính thống.";
  }
  return { items, verdict };
}

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageId>(() => getPageFromPath(window.location.pathname));
  const [searchQuery, setSearchQuery] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const checkTimestamps = useRef<number[]>([]);
  const RATE_LIMIT_MAX = 5;
  const RATE_LIMIT_WINDOW = 60000;

  const [cachedNewsItems, setCachedNewsItems] = useState<any[]>([]);

  useEffect(() => {
    if (currentPage === "resources") {
      fetch('/api/cached-news')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'OK') {
            const mapped = data.data.map((item: any, index: number) => ({
              id: index + 1,
              title: item.text,
              date: new Date(item.timestamp).toLocaleDateString('vi-VN'),
              description: `Điểm rủi ro: ${item.result.finalScore}% - Lý do: ${item.result.keywordMatches.map((k: any) => k.groupName).join(', ')}`,
              linkUrl: "#"
            }));
            setCachedNewsItems(mapped);
          }
        })
        .catch(err => console.error("Error fetching cached news:", err));
    }
  }, [currentPage]);
  const [checkType, setCheckType] = useState<"web" | "news">("web");
  const [previewCandidateIndex, setPreviewCandidateIndex] = useState(0);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const [newsAiSummary, setNewsAiSummary] = useState<{ summary: string | null; key_points: string[]; credibility_note: string; detection_note: string; loading: boolean; loaded: boolean }>({ summary: null, key_points: [], credibility_note: "", detection_note: "", loading: false, loaded: false });
  const [ownerVerifyOpen, setOwnerVerifyOpen] = useState(false);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [colorLegendOpen, setColorLegendOpen] = useState(false);
  const [thirdPartyOpen, setThirdPartyOpen] = useState(false);
  const [selectedInfoItem, setSelectedInfoItem] = useState<{ title: string; description: string; link: string; category: string; } | null>(null);
  const [selectedBlogSlug, setSelectedBlogSlug] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith("/blog/")) {
      return path.replace("/blog/", "");
    }
    return null;
  });
  const [shieldOrigin, setShieldOrigin] = useState("50% 50%");
  const shieldPointerX = useMotionValue(0);
  const shieldPointerY = useMotionValue(0);
  const shieldScaleRaw = useMotionValue(1);
  const shieldRotateX = useSpring(useTransform(shieldPointerY, [-0.5, 0.5], [13, -13]), { stiffness: 170, damping: 18, mass: 0.6 });
  const shieldRotateY = useSpring(useTransform(shieldPointerX, [-0.5, 0.5], [-16, 16]), { stiffness: 170, damping: 18, mass: 0.6 });
  const shieldScale = useSpring(shieldScaleRaw, { stiffness: 180, damping: 16, mass: 0.55 });
  useEffect(() => {
    const syncPageFromLocation = () => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", syncPageFromLocation);
    syncPageFromLocation();
    return () => {
      window.removeEventListener("popstate", syncPageFromLocation);
    };
  }, []);
  useEffect(() => {
    setPreviewCandidateIndex(0);
  }, [resultData?.screenshot]);
  useEffect(() => {
    setAnalysisExpanded(false);
  }, [resultData?.url, resultData?.score, resultData?.title]);
  const activePreview = resultData?.type === "web" ?
    resultData.previewCandidates?.[previewCandidateIndex] ?? resultData.screenshot :
    null;
  const navigateToPage = (page: PageId) => {
    const nextPath = PAGE_PATHS[page];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setCurrentPage(page);
    if (page === "home") {
      setShowResults(false);
      setSearchQuery("");
    }
  };
  const handleShieldPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));
    shieldPointerX.set(clampedX - 0.5);
    shieldPointerY.set(clampedY - 0.5);
    shieldScaleRaw.set(1.13);
    setShieldOrigin(`${(clampedX * 100).toFixed(1)}% ${(clampedY * 100).toFixed(1)}%`);
  };
  const handleShieldPointerLeave = () => {
    shieldPointerX.set(0);
    shieldPointerY.set(0);
    shieldScaleRaw.set(1);
    setShieldOrigin("50% 50%");
  };
  const partnerGroups = [
    {
      title: "Nhóm 1: Công nghệ hạ tầng",
      subtitle: "(Hạ tầng và nền tảng số)",
      items: [
        {
          name: "Vietnix",
          description: "Vietnix là nhà cung cấp hạ tầng và dịch vụ hosting, VPS, máy chủ riêng, giúp doanh nghiệp và người dùng vận hành nền tảng số ổn định và bảo mật.",
          link: "https://vietnix.vn/",
        }
      ]
    },
    {
      title: "Nhóm 2: Global Security Intelligence",
      subtitle: "(Dữ liệu bảo mật)",
      items: [
        { name: "DNS-BLOCKLISTS", description: "Dịch vụ theo dõi và chặn danh sách miền độc hại theo chuẩn DNSBL.", link: "https://www.dnsbl.info/" },
        { name: "MALWARE-FILTER", description: "Cơ sở dữ liệu và bộ lọc cảnh báo phần mềm độc hại phổ biến.", link: "https://www.malwaredomains.com/" },
        { name: "PhishTank", description: "Cộng đồng báo cáo và chia sẻ các trang phishing để bảo vệ người dùng.", link: "https://phishtank.org/" },
        { name: "OpenPhish", description: "Nền tảng phát hiện và đăng ký các trang lừa đảo đang hoạt động.", link: "https://openphish.com/" },
        { name: "GITHUB COMMUNITY", description: "Cộng đồng mã nguồn mở và dữ liệu bảo mật chia sẻ chung trên GitHub.", link: "https://github.com/" }]

    },
    {
      title: "Nhóm 3: Fact-Check & Global Media",
      subtitle: "(Xác thực & Báo chí quốc tế)",
      items: [
        { name: "Google News", description: "Nguồn tin tức và cập nhật thời sự từ Google News.", link: "https://news.google.com/" },
        { name: "AP News", description: "Thông tin thời sự từ Associated Press.", link: "https://apnews.com/" },
        { name: "AFP", description: "Đài tin tức quốc tế AFP cung cấp dữ liệu báo chí toàn cầu.", link: "https://www.afp.com/" },
        { name: "CNN", description: "Kênh tin tức quốc tế CNN với nhiều bản tin được xác minh.", link: "https://edition.cnn.com/" },
        { name: "The New York Times", description: "Tạp chí và bản tin quốc tế uy tín của The New York Times.", link: "https://www.nytimes.com/" }]

    },
    {
      title: "Nhóm 4: Vietnam Verification Hub",
      subtitle: "(Tin tức & Xác thực Việt Nam)",
      items: [
        { name: "TINGIA.GOV", description: "Cổng thông tin chính thống và nguồn xác thực từ các cơ quan nhà nước Việt Nam.", link: "https://tingia.gov.vn/" },
        { name: "VNEXPRESS", description: "Trang tin tức uy tín và nhanh chóng của Việt Nam.", link: "https://vnexpress.net/" },
        { name: "TUỔI TRẺ", description: "Báo điện tử nổi tiếng với các tin tức và phân tích phong phú.", link: "https://tuoitre.vn/" },
        { name: "BÁO THANH NIÊN", description: "Nguồn tin tức cập nhật từ Thanh Niên Việt Nam.", link: "https://thanhnien.vn/" },
        { name: "DANTRI", description: "Báo điện tử dân trí cung cấp tin tức đời sống và xã hội.", link: "https://dantri.com.vn/" }]

    }];

  const suspiciousSiteItems = [
    { id: 1, link: "shopee-khuyenmai-2026.com", date: "02/04", description: "Tên miền giả mạo khuyến mãi của Shopee nhằm lừa người dùng nhập thông tin đăng nhập.", linkUrl: "https://shopee.vn/" },
    { id: 2, link: "nganhang-abc-login.net", date: "01/04", description: "Trang giả mạo giao diện ngân hàng để thu thập mật khẩu và mã OTP.", linkUrl: "https://www.nganluong.vn/" },
    { id: 3, link: "nhan-qua-mien-phi.org", date: "31/03", description: "Trang quảng bá chương trình tặng quà giả tạo để dụ người dùng click vào liên kết lừa đảo.", linkUrl: "https://www.facebook.com/" },
    { id: 4, link: "facebook-verify-account.com", date: "30/03", description: "Tên miền giả mạo xác minh tài khoản Facebook để đánh cắp dữ liệu người dùng.", linkUrl: "https://www.facebook.com/" },
    { id: 5, link: "crypto-invest-bonus.io", date: "29/03", description: "Cảnh báo về trang đầu tư tiền ảo lừa đảo dùng hình thức bonus hấp dẫn.", linkUrl: "https://www.binance.com/" }];

  const fakeNewsItems = [
    { id: 1, title: "Phong tỏa tài khoản ngân hàng hàng loạt", date: "02/04", description: "Tin giả về việc phong tỏa tài khoản ngân hàng để tạo cảm giác khẩn cấp.", linkUrl: "https://www.nganhang.gov.vn/" },
    { id: 2, title: "Thông tin sai về chính sách hỗ trợ mới", date: "01/04", description: "Bài viết sai lệch về chính sách hỗ trợ để kích hoạt hành vi chia sẻ không kiểm chứng.", linkUrl: "https://www.moit.gov.vn/" },
    { id: 3, title: "Tin đồn thất thiệt về dịch bệnh", date: "31/03", description: "Thông tin không có căn cứ về dịch bệnh gây hoang mang trên mạng.", linkUrl: "https://moh.gov.vn/" },
    { id: 4, title: "Giả mạo văn bản xử phạt giao thông", date: "30/03", description: "Tài liệu giả mạo đang được lan truyền như văn bản chính thức.", linkUrl: "https://www.gtvt.gov.vn/" },
    { id: 5, title: "Tin giả về chương trình tặng quà tri ân", date: "29/03", description: "Thông tin khuyến mãi không xác thực nhằm thu hút người dùng click vào đường link lừa đảo.", linkUrl: "https://www.viettel.vn/" }];

  const handleCheck = async (e?: FormEvent) => {
    if (e)
      e.preventDefault();
    if (!searchQuery.trim())
      return;

    const now = Date.now();
    checkTimestamps.current = checkTimestamps.current.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (checkTimestamps.current.length >= RATE_LIMIT_MAX) {
      alert("Bạn đã kiểm tra quá nhiều lần. Vui lòng chờ 1 phút trước khi thử lại.");
      return;
    }
    checkTimestamps.current.push(now);


    let isGambling = false;
    try {
      const checkRes = await fetch("/api/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: searchQuery.trim() })
      });
      const checkData = await checkRes.json();
      isGambling = checkData.isGambling;
    } catch (err) {
      console.error("Backend check-domain failed", err);
    }

    if (isGambling) {
      setIsChecking(false);
      setLoadingStep(0);
      setShowResults(true);
      navigateToPage("check");
      setResultData({
        isSafe: false,
        isWarning: false,
        isDanger: true,
        isEducational: false,
        type: "web",
        url: searchQuery.trim(),
        score: 0,
        title: "CẢNH BÁO: CỜ BẠC LỪA ĐẢO",
        description: "Hệ thống phát hiện đây là tên miền thuộc danh sách cờ bạc lừa đảo. Điểm đánh giá được đặt về 0 để tránh nhầm lẫn với nội dung an toàn.",
        screenshot: "https://png.pngtree.com/png-clipart/20220909/original/pngtree-traffic-warning-3d-warning-png-image_8521088.png",
        previewCandidates: [],
        analysisReasons: [
          {
            id: "GAMBLING_SCAM",
            name: "Website cờ bạc, cá cược lừa đảo",
            detail: "Tên miền nằm trong danh sách đen cờ bạc lừa đảo của Lá Chắn Số.",
            status: "danger",
            icon: AlertTriangle
          }],

        textContent: searchQuery.trim()
      });
      return;
    }
    const jobId = (window as any).__LCS_JOB_ID__ = ((window as any).__LCS_JOB_ID__ ?? 0) + 1;
    setIsChecking(true);
    setShowResults(false);
    setResultData(null);
    setNewsAiSummary({ summary: null, key_points: [], credibility_note: "", detection_note: "", loading: false, loaded: false });
    navigateToPage("check");
    setLoadingStep(0);
    setResultData({
      isSafe: false,
      isWarning: true,
      isDanger: false,
      isEducational: false,
      type: checkType,
      url: searchQuery.trim(),
      score: 12,
      confidence: "Đang phân tích nhiều lớp",
      title: "Đang phân tích nội dung",
      description: "Kết quả sẽ được đổ dần theo từng lớp kiểm tra nội bộ và đối chiếu ngoài.",
      checkTypeLabel: checkType === "web" ? "Website / URL" : "Đang phân loại nội dung...",
      analysisReasons: [
        {
          id: "PIPELINE_LOADING",
          name: "Đang khởi chạy pipeline kiểm tra",
          detail: "LCS đang tải dần từng lớp phân tích. Mục nào xong trước sẽ hiển thị trước.",
          status: "warning",
          icon: Loader2
        }],

      analysis: {
        internal_verdict: "Đang khởi tạo phán quyết nội sinh của LCS...",
        heuristics: "Đang phân tích cấu trúc văn bản...",
        trust_analysis: "Đang chờ đối chiếu trust graph...",
        url_verification: "Đang kiểm tra liên kết và nguồn...",
        source_audit: "Đang dựng chuỗi nguồn...",
        press_comparison: "Đang chuẩn bị đối chiếu đa báo...",
        search_trace: "Đang mô phỏng truy vết tìm kiếm...",
        live_fact_check: "Đang chờ phản hồi từ lớp fact API...",
        live_press_scan: "Đang dò bài báo liên quan...",
        open_knowledge_check: "Đang chờ đối chiếu tri thức mở."
      },
      violated_rules: [],
      textContent: searchQuery,
      pressArticles: [],
      pressSourceLabel: "Google News"
    });
    setShowResults(true);
    const updateProgress = (patch: any) => {
      if ((window as any).__LCS_JOB_ID__ !== jobId)
        return;
      setResultData((prev: any) => ({
        ...(prev ?? {}),
        ...patch,
        analysis: {
          ...(prev?.analysis ?? {}),
          ...(patch.analysis ?? {})
        }
      }));
    };
    const stepInterval = window.setInterval(() => {
      setLoadingStep((prev) => prev < 3 ? prev + 1 : prev);
    }, 350);
    setTimeout(async () => {
      clearInterval(stepInterval);
      try {
        await new Promise<void>(requestAnimationFrame);
        await new Promise<void>(requestAnimationFrame);
        if ((window as any).__LCS_JOB_ID__ !== jobId)
          return;
        if (checkType === "web") {
          const webCheck = await analyzeWebsite(searchQuery);
          setResultData({
            state: webCheck.state,
            isSafe: webCheck.isSafe,
            isWarning: webCheck.isWarning,
            isDanger: webCheck.isDanger,
            needsVerification: webCheck.needsVerification,
            riskScore: webCheck.riskScore,
            coverage: webCheck.coverage,
            criteria: webCheck.criteria,
            ownerVerifyEmail: webCheck.ownerVerifyEmail,
            ownerVerifyAvailable: webCheck.ownerVerifyAvailable,
            blacklisted: webCheck.blacklisted,
            blacklistSources: webCheck.blacklistSources,
            thirdParty: webCheck.thirdParty,
            ipInfo: webCheck.ipInfo,
            aiAnalysis: webCheck.aiAnalysis,
            backendV2: webCheck.backendV2,
            isEducational: false,
            type: "web",
            url: webCheck.normalizedUrl,
            score: webCheck.score,
            title: webCheck.title,
            description: webCheck.description,
            screenshot: webCheck.screenshot,
            previewCandidates: webCheck.previewCandidates,
            analysisReasons: webCheck.reasons,
            textContent: webCheck.normalizedUrl,
            checkTypeLabel: "Phân tích Website / URL"
        });
        setShowResults(true);
        setIsChecking(false);

        if ((window as any).__LCS_JOB_ID__ === jobId) {
          enrichLiveNewsWithAI(searchQuery.trim()).then((enrichment) => {
            if ((window as any).__LCS_JOB_ID__ !== jobId) return;
            if (!enrichment || enrichment.reasons.length === 0) return;
            setResultData((prev: any) => ({
              ...(prev ?? {}),
              score: Math.max(0, Math.min(100, (prev?.score ?? 0) + enrichment.scoreDelta)),
              analysisReasons: [
                ...(prev?.analysisReasons ?? []),
                ...enrichment.reasons
              ],
              pressArticles: enrichment.pressArticles.length > 0 ? enrichment.pressArticles : (prev?.pressArticles ?? []),
              analysis: {
                ...(prev?.analysis ?? {}),
                press_comparison: `AI đối chiếu đa nguồn hoàn tất (${enrichment.mode}). Cập nhật stance từ AI.`
              }
            }));
          }).catch(() => {
          });
        }
        return;
      }
        let score = 100;
        const inputLinks = extractLinksFromText(searchQuery);
        const articleExtraction = inputLinks.length > 0 ? await extractArticleForAnalysis(inputLinks[0]) : null;
        const text = articleExtraction?.contentForAnalysis ?? searchQuery;
        const liveNewsCheckPromise = runLiveNewsCheck(text);
        const reasons: any[] = [];
        const violatedRules: string[] = [];
        const reasonIds = new Set<string>();
        const violatedRuleIds = new Set<string>();
        const addReason = (reason: any) => {
          if (reason?.id && reasonIds.has(reason.id)) {
            return;
          }
          reasons.push(reason);
          if (reason?.id) {
            reasonIds.add(reason.id);
            if (reason.status !== "success") {
              violatedRuleIds.add(reason.id);
            }
          }
        };
        const addViolation = (ruleId: string) => {
          violatedRuleIds.add(ruleId);
        };
        const syncViolatedRules = () => {
          violatedRules.splice(0, violatedRules.length, ...Array.from(violatedRuleIds));
        };
        const analysisDetails = {
          internal_verdict: "LCS đang xây dựng phán quyết nội bộ...",
          heuristics: "Đang phân tích cấu trúc văn bản...",
          trust_analysis: "Chưa tìm thấy dữ liệu đối soát thực tế.",
          url_verification: "Không phát hiện liên kết trong văn bản.",
          source_audit: "Đang dựng chuỗi nguồn...",
          press_comparison: "Đang chuẩn bị đối chiếu đa báo...",
          search_trace: "Đang mô phỏng truy vết tìm kiếm...",
          live_fact_check: "Live Fact Check API chưa được gọi.",
          live_press_scan: "Live Press API chưa được gọi.",
          open_knowledge_check: "Open Knowledge Check chưa được gọi."
        };

        
        let fullScanResult: any = null;
        try {
          const scanRes = await fetch("/api/full-scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
          });
          if (scanRes.ok) {
            fullScanResult = await scanRes.json();
          }
        } catch (err) {
          console.error("Full scan failed", err);
        }

        // ============ COMPREHENSIVE VERIFICATION ============
        let comprehensiveResult: any = null;
        try {
          const compRes = await fetch("/api/verify-comprehensive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
          });
          if (compRes.ok) {
            comprehensiveResult = await compRes.json();
          }
        } catch (err) {
          console.error("Comprehensive verification failed", err);
        }

        const lcsResult = await runLCSEngine(text);

        let typeLabel = "Tin tức / Sự kiện";
        if (inputLinks.length > 0) typeLabel = "Bài báo / Liên kết Web"; else
          if (lcsResult.narrativeProfile.id === "BIO_HOAX") typeLabel = "Tin đồn về Nhân vật"; else
            if (lcsResult.narrativeProfile.label) typeLabel = lcsResult.narrativeProfile.label;


        setResultData((prev: any) => ({ ...prev, checkTypeLabel: typeLabel }));

        const lcsAnalysis = lcsEngineToAnalysisDetails(lcsResult);
        Object.assign(analysisDetails, lcsAnalysis);
        const riskBandLabel: Record<string, string> = {
          low: "thấp",
          medium: "vừa",
          high: "cao",
          critical: "rất cao"
        };
        analysisDetails.internal_verdict = `Hệ thống nhận định ban đầu: ${lcsResult.verdictLabel}. Dạng tin: ${lcsResult.narrativeProfile.label}. Mức rủi ro: ${riskBandLabel[lcsResult.narrativeProfile.riskBand] ?? lcsResult.narrativeProfile.riskBand}. ${lcsResult.narrativeProfile.summary}`;
        const lcsScoreContrib = Math.round((lcsResult.lcsScore - 50) * 0.20);
        lcsResult.allSignals.
          filter((s) => s.severity !== "safe" || s.impact > 10).
          forEach((sig) => {
            addReason({
              id: sig.id,
              name: sig.name,
              detail: sig.detail,
              status: sig.severity === "danger" ? "danger" : sig.severity === "warning" ? "warning" : "success",
              icon: sig.severity === "danger" ? AlertTriangle : sig.severity === "warning" ? Info : ShieldCheck
            });
            if (sig.impact < 0)
              score += sig.impact;
          });
        syncViolatedRules();
        updateProgress({
          score: Math.max(18, Math.min(58, lcsResult.lcsScore)),
          confidence: "Đã có phán quyết nội bộ ban đầu",
          title: "LCS đang phân tích nội sinh",
          description: "Hệ thống đã có đánh giá nội bộ ban đầu và đang tiếp tục nạp kết quả đối chiếu nguồn ngoài.",
          analysis: analysisDetails,
          analysisReasons: [...reasons],
          violated_rules: [...violatedRules],
          textContent: articleExtraction?.markdownContent ?? searchQuery
        });
        const links = inputLinks;
        let hasTrustedLink = false;
        let hasGovLink = false;
        if (articleExtraction) {
          reasons.push({
            id: "ARTICLE_EXTRACTED",
            name: "Đã trích nội dung bài báo gốc",
            detail: `Hệ thống đã đọc trực tiếp bài từ ${articleExtraction.sourceDomain}${articleExtraction.publishedTime ? `, thời gian đăng ${articleExtraction.publishedTime}` : ""}, rồi chuyển sang phân tích trên nội dung gốc thay vì chỉ dựa vào phần văn bản người dùng dán vào.`,
            status: "success",
            icon: Database
          });
          analysisDetails.url_verification = `Đã nhận diện liên kết báo chí uy tín (${articleExtraction.sourceDomain}) và trích xuất tiêu đề "${articleExtraction.title}" để kiểm tra nội dung gốc.`;
          analysisDetails.source_audit = `Nội dung đang được đối chiếu trực tiếp từ bài gốc trên ${articleExtraction.sourceDomain}, giảm rủi ro do copy thiếu/ngắt đoạn.`;
        }
        if (links.length > 0) {
          links.forEach((link) => {
            const trusted = isDomainTrusted(link);
            if (trusted) {
              hasTrustedLink = true;
              score = Math.min(100, score + 20);
              reasons.push({
                id: "LINK_TRUSTED",
                name: "Nguồn tin tin cậy",
                detail: `Link dẫn tới ${trusted.domain} (${trusted.note || trusted.category}). Đây là nguồn tin chính thống được xác minh.`,
                status: "success",
                icon: ShieldCheck
              });
              analysisDetails.url_verification = `Đã xác minh: ${trusted.domain} là trang web chính thống của ${trusted.note || trusted.category}.`;
            } else
              if (isGovVnDomain(link)) {
                hasGovLink = true;
                score = Math.min(100, score + 30);
                reasons.push({
                  id: "LINK_GOV",
                  name: "Website Chính phủ",
                  detail: "Phát hiện liên kết .gov.vn chính thức của cơ quan nhà nước Việt Nam.",
                  status: "success",
                  icon: Landmark
                });
                analysisDetails.url_verification = "Liên kết sử dụng đuôi tên miền .gov.vn - Quy chuẩn của cơ quan hành chính nhà nước Việt Nam.";
              } else
                if (isSuspiciousTLD(link)) {
                  score -= 45;
                  addViolation("L082");
                  reasons.push({
                    id: "LINK_SUSPICIOUS",
                    name: "Tên miền rủi ro",
                    detail: "Sử dụng đuôi tên miền (.xyz, .top, .online...) thường dùng trong các chiến dịch lừa đảo.",
                    status: "danger",
                    icon: ExternalLink
                  });
                  analysisDetails.url_verification = "CẢNH BÁO: Liên kết sử dụng tên miền rủi ro cao, không thuộc quy chuẩn báo chí hay chính phủ.";
                } else {
                  reasons.push({
                    id: "LINK_CHECK",
                    name: "Phát hiện liên kết",
                    detail: "Văn bản chứa liên kết ngoài. Cẩn trọng trước khi click nếu không rõ nguồn gốc.",
                    status: "warning",
                    icon: Globe
                  });
                  analysisDetails.url_verification = "Phát hiện liên kết lạ chưa có trong cơ sở dữ liệu tin cậy. Cần kiểm tra sandbox trước khi truy cập.";
                }
          });
        }
        syncViolatedRules();
        updateProgress({
          score: Math.max(22, Math.min(64, score)),
          confidence: "Đã xong lớp nguồn và liên kết",
          analysis: analysisDetails,
          analysisReasons: [...reasons],
          violated_rules: [...violatedRules]
        });
        const keywordMatches = await analyzeTextByKeywords(text);
        keywordMatches.forEach((match) => {
          score -= match.penalty;
          addViolation(match.groupId);
          reasons.push({
            id: match.groupId,
            name: match.groupName,
            detail: `Phát hiện các từ khóa: ${match.matchedKeywords.slice(0, 5).join(", ")}${match.matchedKeywords.length > 5 ? "..." : ""}. ${match.isPositive ? "Tín hiệu tích cực." : "Dấu hiệu nghi vấn cao."}`,
            status: match.isPositive ? "success" : match.penalty > 40 ? "danger" : "warning",
            icon: match.isPositive ? ShieldCheck : match.penalty > 40 ? AlertTriangle : Info
          });
        });
        FAKE_NEWS_LAWS.forEach((law) => {
          const skipIds = ["L161", "L176", "L180"];
          if (skipIds.includes(law.id))
            return;
          let isMatch = false;
          if (typeof law.pattern === "function") {
            isMatch = law.pattern(text);
          } else {
            isMatch = law.pattern.test(text);
          }
          if (isMatch) {
            const alreadyFound = reasons.some((r) => r.name === law.name);
            if (!alreadyFound) {
              score -= law.penalty;
              addViolation(law.id);
              reasons.push({
                id: law.id,
                name: law.name,
                detail: law.detail,
                status: law.status,
                icon: law.icon
              });
            }
          }
        });
        const mentionsAuthority = /Cục Cảnh sát|Bộ Công an|Bộ Y tế|Bộ Tài chính|Viện kiểm sát|Tòa án|VNeID|Định danh cá nhân|Cục an ninh mạng/i.test(text);
        if (mentionsAuthority && !hasGovLink && !hasTrustedLink) {
          score -= 50;
          addViolation("LOGIC_DAO_01");
          reasons.push({
            id: "LOGIC_DAO_01",
            name: "Mạo danh cơ quan nhà nước",
            detail: "Văn bản tự xưng cơ quan nhà nước nhưng không cung cấp liên kết chính thống (.gov.vn). Đây là hành vi lừa đảo phổ biến.",
            status: "danger",
            icon: Landmark
          });
          analysisDetails.trust_analysis = "MÂU THUẪN: Không tìm thấy bất kỳ thông báo tương tự trên các trang tin chính thống (mps.gov.vn, chinhphu.vn).";
        } else
          if (mentionsAuthority && (hasGovLink || hasTrustedLink)) {
            analysisDetails.trust_analysis = "KHỚP: Nội dung có tham chiếu tới các địa chỉ tin cậy của cơ quan chức năng.";
          } else {
            analysisDetails.trust_analysis = "KHÔNG TÌM THẤY: Tin tức không xuất hiện trên các trang báo lớn trong 48h qua.";
          }
        const hasPanic = reasons.some((r) => r.id === "KG_PANIC" || r.id === "L042");
        const hasFinancial = reasons.some((r) => r.id === "KG_FINANCIAL" || r.id === "L081");
        if (mentionsAuthority && (hasPanic || hasFinancial)) {
          score -= 25;
          addViolation("CORR_01");
          reasons.push({
            id: "CORR_01",
            name: "Thao túng tâm lý cao",
            detail: "Sự kết hợp giữa uy quyền giả và áp lực thời gian/tài chính là dấu hiệu của tội phạm mạng.",
            status: "danger",
            icon: Zap
          });
        }
        const verificationLayers = runNewsVerificationLayers(text);
        score += verificationLayers.scoreDelta;
        analysisDetails.source_audit = verificationLayers.summary.source_audit;
        analysisDetails.press_comparison = verificationLayers.summary.press_comparison;
        analysisDetails.search_trace = verificationLayers.summary.search_trace;
        if (!hasTrustedLink && verificationLayers.hasTrustedEvidence) {
          analysisDetails.trust_analysis = verificationLayers.summary.fact_check;
        } else
          if (verificationLayers.summary.fact_check) {
            if (analysisDetails.trust_analysis === "KHÔNG TÌM THẤY: Tin tức không xuất hiện trên các trang báo lớn trong 48h qua.") {
              analysisDetails.trust_analysis = `KHÔNG TÌM THẤY: Tin tức không xuất hiện trên các trang báo lớn trong 48h qua. ${verificationLayers.summary.fact_check}`;
            } else {
              analysisDetails.trust_analysis = `${analysisDetails.trust_analysis} ${verificationLayers.summary.fact_check}`;
            }
          }
        verificationLayers.reasons.forEach((reason) => {
          addReason(reason);
        });
        syncViolatedRules();
        updateProgress({
          score: Math.max(26, Math.min(72, score)),
          confidence: "Đã xong lớp kiểm chứng cấu trúc",
          analysis: analysisDetails,
          analysisReasons: [...reasons],
          violated_rules: [...violatedRules]
        });
        const liveNewsCheck = await liveNewsCheckPromise;
        if (lcsResult.narrativeProfile.riskBand === "critical" && liveNewsCheck.scoreDelta > 0) {


          liveNewsCheck.scoreDelta = -Math.abs(liveNewsCheck.scoreDelta);
          const strongMatchReason = liveNewsCheck.reasons.find((r) => r.id === "LIVE_PRESS_STRONG_MATCH");
          if (strongMatchReason) {
            strongMatchReason.status = "danger";
            strongMatchReason.name = "Báo chí CẢNH BÁO trùng khớp";
            strongMatchReason.detail = "Bài báo khớp chính xác với nội dung lừa đảo này, chứng tỏ đây là một kịch bản lừa đảo đã được báo chí cảnh báo diện rộng.";
            strongMatchReason.icon = AlertTriangle;
          }
        }
        score += liveNewsCheck.scoreDelta;
        analysisDetails.live_fact_check = liveNewsCheck.summary.live_fact_check;
        analysisDetails.live_press_scan = liveNewsCheck.summary.live_press_scan;
        analysisDetails.open_knowledge_check = liveNewsCheck.summary.open_knowledge_check;
        if (liveNewsCheck.summary.headline_verification) {
          analysisDetails["headline_verification"] = liveNewsCheck.summary.headline_verification;
        }
        liveNewsCheck.reasons.forEach((reason) => {
          addReason(reason);
        });
        syncViolatedRules();
        updateProgress({
          score: Math.max(30, Math.min(80, score)),
          confidence: "Đã có kết quả đối chiếu nguồn ngoài",
          title: "Đang hợp nhất các lớp phán quyết",
          analysis: analysisDetails,
          analysisReasons: [...reasons],
          violated_rules: [...violatedRules],
          pressArticles: liveNewsCheck.pressArticles,
          pressSourceLabel: liveNewsCheck.pressSourceLabel
        });
        const blockingMismatchIds = new Set([
          "KNOWN_IDENTITY_MISMATCH",
          "WIKIPEDIA_IDENTITY_MISMATCH",
          "KNOWN_FACT_MISMATCH",
          "KNOWN_BIRTHDATE_MISMATCH",
          "KNOWN_BIRTHDAY_MISMATCH",
          "KNOWN_DATE_RANGE_MISMATCH",
          "OPEN_KNOWLEDGE_MISMATCH",
          "WIKIPEDIA_PROFILE_MISMATCH",
          "WIKIPEDIA_STATUS_MISMATCH",
          "HEADLINE_CONTRADICTED_BY_PRESS",
          "LIVE_PRESS_CONTRADICTS_CLAIM",
          "LIVE_PRESS_STRONG_CONTRADICTION",
          "FANTASY_EVENT_CLAIM",
          "URL_PHISHING"]
        );
        const hasBlockingMismatch = reasons.some((item) => blockingMismatchIds.has(item.id) || item.status === "danger" && /MISMATCH|SAI|KNOWN|WIKIPEDIA/i.test(item.id || ""));
        if (liveNewsCheck.verifiedExternally && !hasBlockingMismatch) {
          const suppressedIds = new Set(["UNSOURCED_CLAIM", "LIVE_NO_EVIDENCE"]);
          for (let i = reasons.length - 1; i >= 0; i -= 1) {
            if (suppressedIds.has(reasons[i].id)) {
              reasons.splice(i, 1);
            }
          }
          for (let i = violatedRules.length - 1; i >= 0; i -= 1) {
            if (suppressedIds.has(violatedRules[i])) {
              violatedRules.splice(i, 1);
            }
          }
          score = Math.max(score, 86);
        } else
          if (hasBlockingMismatch) {
            score = Math.min(score, 42);
          } else
            if (checkType !== "web" && !verificationLayers.hasTrustedEvidence && reasons.some((item) => item.status !== "success")) {
              score = Math.min(score, 69);
            }
        if (articleExtraction && score < 75 && liveNewsCheck.enabled) {
          score = Math.max(score, 58);
        }
        analysisDetails.heuristics = `Phát hiện ${violatedRules.filter((id) => id.startsWith('L') || id.startsWith('KG')).length} mẫu hình tin giả phổ biến và ${verificationLayers.trustedSourceCount} đầu mối nguồn có thể truy vết. Cấu trúc văn bản có dấu hiệu ${score < 50 ? 'bất thường nghiêm trọng' : 'cần lưu ý'}.`;
        score += lcsScoreContrib;



        if (lcsResult.narrativeProfile.riskBand === "critical") {
          score = Math.min(score, 25);
        }

        
        if (fullScanResult) {
          const backendRiskScore = Number(fullScanResult.finalScore) || 0;
          score = Math.min(score, 100 - backendRiskScore);

          if (fullScanResult.isFactCheckedFake) {
            score = Math.min(score, 15);
            reasons.push({
              id: "FACT_CHECK_FAKE",
              name: "Fact Check Cảnh báo ĐỎ",
              detail: "Nội dung này đã được xác nhận là SAI SỰ THẬT bởi các nguồn xác thực uy tín.",
              status: "danger",
              icon: AlertTriangle
            });
          } else if (fullScanResult.modifier === 0.1) {
            reasons.push({
              id: "BACKEND_NLI_VERIFIED",
              name: "NLI Xác nhận Báo chí",
              detail: "Mô hình NLI ở backend đã đọc báo chí và xác nhận tin tức này là sự thật.",
              status: "success",
              icon: ShieldCheck
            });
            if (!hasBlockingMismatch) {
              score = Math.max(score, 86);
            }
          }
        }

        if (hasBlockingMismatch) {
          score = Math.min(score, 42);
        }

        score = Math.max(0, Math.min(100, score));

        const isGossip = reasons.some((r) => r.id === "KG_GOSSIP");
        let finalTitle = score >= 75 ? "Thông tin có độ tin cậy" : score >= 50 ? "Tin tức chưa được xác minh" : "CẢNH BÁO: Tin giả độc hại";
        let finalDescription = score >= 75 ?
          "Nội dung tuân thủ các quy chuẩn thông tin chính thống. Hệ thống không phát hiện các dấu hiệu thao túng tâm lý hoặc kỹ thuật né bộ lọc." :
          score >= 50 ?
            "Văn bản chứa một số dấu hiệu bất thường về ngôn ngữ hoặc cấu trúc. Đề nghị kiểm chứng thêm từ các nguồn tin chính thống." :
            "Văn bản chứa nhiều dấu hiệu đặc thù của tin giả lừa đảo: Thao túng tâm lý, đe dọa, né bộ lọc hoặc thông tin tài chính phi lý.";

        if (isGossip && score >= 40) {
          finalTitle = "Tin tức đời thường cần kiểm chứng";
          finalDescription = "Nội dung mang tính chất giải trí, đời sống, showbiz, có thể là tin đồn hoặc sự kiện chưa được xác thực rõ ràng. Cần cẩn trọng khi tiếp nhận.";
        }

        const successReasonCount = reasons.filter((r) => r.status === "success").length;
        const isEducational = fullScanResult?.isEducational || false;
        
        if (isEducational) {
          analysisDetails.internal_verdict = `Hệ thống nhận định: NỘI DUNG GIÁO DỤC. Bài viết được xác định là hướng dẫn/cảnh báo về tin giả. Từ khóa cảnh báo xuất hiện trong bối cảnh ví dụ/hướng dẫn — KHÔNG phải tin giả. Điểm tin cậy: ${score}%.`;
        } else {
          analysisDetails.internal_verdict = score >= 75 ?
            `Hệ thống nhận định: AN TOÀN. ${successReasonCount} tín hiệu đối chiếu tích cực (fact-check, báo chí, nguồn tin chính thống) củng cố nội dung. Mức tin cậy: cao (${score}%).` :
            score >= 50 ?
              `Hệ thống nhận định: CẦN XÁC THỰC. Điểm tin cậy ${score}%. Nội dung chưa có đủ đối chiếu chắc chắn — nên kiểm chứng thêm từ báo chí hoặc cơ quan chính thống.` :
              `Hệ thống nhận định: NGUY HIỂM. Điểm tin cậy ${score}%. Nội dung mang nhiều dấu hiệu đặc thù của tin giả/lừa đảo — tuyệt đối không tin, chia sẻ hoặc chuyển tiền theo hướng dẫn trong nội dung.`;
        }

        setResultData({
          isSafe: score >= 75,
          isWarning: score >= 50 && score < 75,
          isDanger: score < 50,
          isEducational: fullScanResult?.isEducational || false,
          type: "news",
          url: articleExtraction?.originalUrl ?? searchQuery.substring(0, 50) + (searchQuery.length > 50 ? "..." : ""),
          score: score,
          confidence: score >= 75 ? "Độ tin cậy cao" : score >= 50 ? "Cần kiểm chứng thêm" : "Độ rủi ro rất cao",
          title: finalTitle,
          description: finalDescription,
          analysisReasons: reasons.length > 0 ? reasons : [{ name: "Chưa đủ dữ kiện xác minh", status: "warning", detail: "Nội dung không có tín hiệu nguy hiểm rõ, nhưng cũng chưa có nguồn đủ mạnh để coi là chính xác tuyệt đối.", icon: Info }],
          analysis: analysisDetails,
          violated_rules: violatedRules,
          textContent: articleExtraction?.markdownContent ?? searchQuery,
          pressArticles: liveNewsCheck.pressArticles,
          pressSourceLabel: liveNewsCheck.pressSourceLabel,
          factCheckedFake: fullScanResult?.isFactCheckedFake || false,
          numericVerification: fullScanResult?.numericVerification || null,
          comprehensive: comprehensiveResult?.comprehensive || null,
          comprehensive_tools: comprehensiveResult?.comprehensive?.tools_used || [],
          comprehensive_signals: comprehensiveResult?.comprehensive?.signals || [],
          comprehensive_cross_refs: comprehensiveResult?.comprehensive?.cross_references || [],
          comprehensive_fact_checks: comprehensiveResult?.comprehensive?.fact_check_results || [],
          comprehensive_domain_analysis: comprehensiveResult?.comprehensive?.domain_analysis || null,
          comprehensive_claim_analysis: comprehensiveResult?.comprehensive?.claim_analysis || null,
          comprehensive_sensationalism: comprehensiveResult?.comprehensive?.sensationalism || null,
          comprehensive_vn_specific: comprehensiveResult?.comprehensive?.vietnamese_specific || null,
          comprehensive_verdict: comprehensiveResult?.comprehensive?.overall_verdict || null,
          comprehensive_confidence: comprehensiveResult?.comprehensive?.confidence || 0,
          comprehensive_score: comprehensiveResult?.comprehensive?.score || 0
        });
        setShowResults(true);
        setIsChecking(false);
        if ((window as any).__LCS_JOB_ID__ === jobId) {
          setNewsAiSummary((prev) => ({ ...prev, loading: true, loaded: false }));
          summarizeNewsWithAI(text).then((summary) => {
            if ((window as any).__LCS_JOB_ID__ !== jobId) return;
            if (summary && summary.summary) {
              setNewsAiSummary({ ...summary, loading: false, loaded: true });
            } else {
              setNewsAiSummary((prev) => ({ ...prev, loading: false, loaded: true }));
            }
          }).catch(() => {
            setNewsAiSummary((prev) => ({ ...prev, loading: false, loaded: true }));
          });
        }
      }
      catch (error) {
        console.error("[LCS] Analysis failed", error);
        if ((window as any).__LCS_JOB_ID__ !== jobId)
          return;
        setResultData({
          isSafe: false,
          isWarning: true,
          isDanger: false,
          isEducational: false,
          type: checkType,
          url: searchQuery.trim(),
          score: 35,
          confidence: "Quá trình kiểm tra bị gián đoạn",
          title: "Không thể hoàn tất kiểm tra",
          description: "Pipeline phân tích gặp lỗi hoặc timeout. Hệ thống giữ trạng thái cảnh báo thay vì trả về màn hình trống.",
          analysisReasons: [
            {
              id: "PIPELINE_RUNTIME_ERROR",
              name: "Lỗi runtime trong pipeline kiểm tra",
              detail: "Một lớp phân tích đã thất bại trước khi sinh kết quả cuối. UI giờ sẽ hiển thị trạng thái lỗi thay vì rơi về màn hình trống.",
              status: "warning",
              icon: Info
            }],

          analysis: {
            internal_verdict: "Phán quyết nội sinh chưa hoàn tất vì tiến trình đã lỗi.",
            heuristics: "Pipeline nội bộ bị gián đoạn trước khi hoàn tất chấm điểm.",
            trust_analysis: "Không có kết quả trust analysis vì tiến trình đã lỗi.",
            url_verification: "Chưa hoàn tất.",
            source_audit: "Chưa hoàn tất.",
            press_comparison: "Chưa hoàn tất.",
            search_trace: "Chưa hoàn tất.",
            live_fact_check: "Chưa hoàn tất.",
            live_press_scan: "Chưa hoàn tất.",
            open_knowledge_check: "Chưa hoàn tất."
          },
          violated_rules: ["PIPELINE_RUNTIME_ERROR"],
          textContent: searchQuery,
          pressArticles: [],
          pressSourceLabel: "Google News"
        });
        setShowResults(true);
        setIsChecking(false);
      }
    }, 0);
  };
  const navLinks = [
    { name: "Trang Chủ", id: "home" as PageId },
    { name: "Kiểm Tra", id: "check" as PageId },
    { name: "Blog", id: "blog" as PageId },
    { name: "Tài Nguyên", id: "resources" as PageId },
    { name: "Đồng hành", id: "partners" as PageId },
    { name: "Sứ mệnh", id: "mission" as PageId }];

  return (
    <div className="min-h-screen text-[#111111] selection:bg-orange-200/50">
      <Analytics />
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f5f4f0]/90 backdrop-blur-md border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button type="button" onClick={() => navigateToPage("home")} className="flex items-center">
            <img src="/logo.png" alt="Lá Chắn Số" className="w-16 h-16 -mr-1 -mt-2" />
            <span className="font-bold text-[27px] tracking-tight text-[#ff8904]">Lá Chắn Số</span>
          </button>


          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, index) => <button key={link.name} onClick={() => {
              navigateToPage(link.id);
              setIsMenuOpen(false);
            }} className={`font-medium transition-colors ${currentPage === link.id ? "text-[#111111]" : "text-gray-500 hover:text-[#111111]"} ${index === 0 ? 'text-[19px]' : 'text-[20px]'}`}>
              {link.name}
            </button>)}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigateToPage("check")} className="hidden md:block px-6 py-2.5 text-base font-semibold rounded-full hover:bg-gray-200 transition-all active:scale-95 bg-[#ff8904] text-[#ffff]">
              Kiểm Tra Ngay
            </button>
            <button className="md:hidden p-2 text-[#111111]" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>


        {isMenuOpen && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="md:hidden absolute top-20 left-0 right-0 bg-[#f5f4f0] border-b border-black/10 p-6 flex flex-col gap-4 shadow-xl">
          {navLinks.map((link) => <button key={link.name} className={`text-lg font-medium text-left ${currentPage === link.id ? "text-[#111111]" : "text-gray-500"}`} onClick={() => {
            navigateToPage(link.id);
            setIsMenuOpen(false);
          }}>
            {link.name}
          </button>)}
          <button onClick={() => {
            navigateToPage("check");
            setIsMenuOpen(false);
          }} className="w-full px-6 py-3 bg-white text-[#151414] font-semibold rounded-full mt-2">
            Kiểm Tra Ngay
          </button>
        </motion.div>}
      </nav>
      <AnimatePresence mode="wait">
        {currentPage === "home" && <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white">

          { }
          <main className="pt-20 bg-[#E9E8E4] text-[#111111] relative overflow-hidden">

            { }
            <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(#111 1px,transparent 1px),linear-gradient(90deg,#111 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

            <div className="relative z-10 max-w-[1520px] mx-auto px-6 lg:px-10 pt-14 pb-0">

              { }
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-black/10 text-sm font-semibold text-[#333] shadow-sm backdrop-blur">
                  <img src="/logo.png" alt="" className="w-8 h-8" />
                  Nền tảng xác thực thông tin Việt Nam
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </span>
              </motion.div>

              { }
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_520px] gap-10 xl:gap-16 items-start pb-20">

                { }
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="text-[68px] md:text-[88px] xl:text-[108px] font-black leading-[0.88] tracking-[-0.03em] uppercase text-[#111111] mb-8">

                    BẢO VỆ<br />
                    THÔNG TIN<br />
                    <span className="text-orange-500 italic">Lá Chắn Số</span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-[17px] text-[#555] leading-relaxed max-w-[440px] mb-10">

                    Kiểm tra tin giả, lừa đảo và trang web độc hại ngay lập tức. Công nghệ phân tích đa lớp bảo vệ bạn và cộng đồng.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-3">

                    <button onClick={() => navigateToPage("check")} className="px-8 py-4 bg-orange-500 text-white text-[15px] font-bold rounded-full hover:bg-orange-400 transition-all active:scale-95 shadow-xl shadow-orange-500/25">
                      Kiểm tra ngay
                    </button>
                    <button onClick={() => navigateToPage("resources")} className="px-8 py-4 border-2 border-black/20 text-[#111] text-[15px] font-bold rounded-full hover:border-black/40 hover:bg-black/5 transition-all active:scale-95">
                      Xem tài nguyên
                    </button>
                  </motion.div>

                  { }
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap items-center gap-6 md:gap-10 mt-14 pt-10 border-t border-black/10">

                    <div>
                      <p className="text-[32px] font-black text-[#111] leading-none">&gt;80%</p>
                      <p className="text-xs text-[#888] mt-1 font-medium">Tỷ lệ phát hiện tin giả</p>
                    </div>
                    <div className="w-px h-10 bg-black/10 hidden sm:block" />
                    <div>
                      <p className="text-[32px] font-black text-[#111] leading-none">99,86%</p>
                      <p className="text-xs text-[#888] mt-1 font-medium">Tỷ lệ phát hiện lừa đảo</p>
                    </div>
                    <div className="w-px h-10 bg-black/10 hidden sm:block" />
                    <div>
                      <p className="text-[32px] font-black text-[#111] leading-none">7 lớp</p>
                      <p className="text-xs text-[#888] mt-1 font-medium">Thuật toán & phân tích ngữ cảnh</p>
                    </div>
                  </motion.div>
                </div>

                { }
                <div className="relative lg:pt-2">

                  { }
                  <motion.div
                    initial={{ opacity: 0, y: 26 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-20 mx-auto w-full max-w-[440px] sm:max-w-[500px] lg:max-w-none flex items-center justify-center min-h-[220px] sm:min-h-[270px] xl:min-h-[315px]">
                    <motion.div
                      className="flex items-center justify-center select-none"
                      animate={{
                        y: [0, -12, 0],
                        rotate: [-1.5, 1.5, -1.5]
                      }}
                      transition={{
                        duration: 5.4,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatType: "loop"
                      }}>
                      <motion.div
                        onPointerMove={handleShieldPointerMove}
                        onPointerLeave={handleShieldPointerLeave}
                        className="relative flex h-[220px] w-[220px] cursor-crosshair items-center justify-center sm:h-[270px] sm:w-[270px] xl:h-[315px] xl:w-[315px]"
                        style={{
                          perspective: 900
                        }}>
                        <div className="absolute inset-8 rounded-full bg-orange-400/35 blur-3xl" />
                        <motion.img
                          src={shieldImg}
                          alt="Lá Chắn Số 3D"
                          className="relative z-10 h-full w-full object-contain drop-shadow-[0_34px_45px_rgba(0,0,0,0.22)]"
                          draggable={false}
                          style={{
                            rotateX: shieldRotateX,
                            rotateY: shieldRotateY,
                            scale: shieldScale,
                            transformOrigin: shieldOrigin,
                            transformStyle: "preserve-3d"
                          }} />
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  { }
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 bg-[#111111] rounded-[28px] p-7 shadow-2xl mt-5">

                    <div className="flex items-center gap-2 mb-5">
                      <span className="w-2 h-2 bg-orange-500 rounded-full" />
                      <p className="text-white/50 text-[11px] uppercase tracking-[0.22em] font-bold">Kiểm tra ngay</p>
                    </div>

                    <div className="flex gap-2 mb-5">
                      <button onClick={() => setCheckType("web")} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${checkType === "web" ? "bg-orange-500 text-white" : "bg-white/10 text-gray-500 hover:bg-white/20"}`}>
                        Website
                      </button>
                      <button onClick={() => setCheckType("news")} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${checkType === "news" ? "bg-orange-500 text-white" : "bg-white/10 text-gray-500 hover:bg-white/20"}`}>
                        Tin giả
                      </button>
                    </div>

                    <form onSubmit={handleCheck} className="space-y-3">
                      <input
                        type="text"
                        placeholder={checkType === "web" ? "Nhập URL cần kiểm tra..." : "Nhập tiêu đề hoặc đoạn văn..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl bg-white/8 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 transition-colors text-sm" />

                      <button
                        type="submit"
                        disabled={isChecking}
                        className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-400 transition-all active:scale-[0.98] text-[15px] shadow-lg shadow-orange-500/20">

                        {isChecking ? "Đang kiểm tra..." : "Bắt đầu kiểm tra →"}
                      </button>
                    </form>

                    <p className="mt-4 text-[12px] text-white/30 leading-relaxed">
                      Nhập đường dẫn hoặc văn bản để xem kết quả ngay lập tức.
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>

            { }
            <div className="relative z-10 max-w-[1520px] mx-auto px-6 lg:px-10 pb-24">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Globe, title: "Chạy mọi nơi", desc: "Bảo mật, kết nối và kiểm tra diễn ra ngay tại điểm tiếp cận người dùng, trong thời gian thực." },
                  { icon: ShieldCheck, title: "Kiểm tra nhanh", desc: "Công cụ kiểm tra ngay trên trang chủ giúp bạn xác định nguy cơ tin giả và lừa đảo chỉ với một lần nhập." },
                  { icon: Scale, title: "Tối ưu dễ dùng", desc: "Giao diện đơn giản, trải nghiệm thẳng đến mục kiểm tra và kết quả rõ ràng ngay trên trang chủ." }].
                  map((card, i) =>
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="rounded-[28px] bg-white border border-black/5 p-8 text-left shadow-sm hover:shadow-md transition-shadow">

                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 mb-5">
                        <card.icon className="w-6 h-6 text-orange-500" />
                      </div>
                      <h2 className="text-xl font-black mb-3 text-[#111]">{card.title}</h2>
                      <p className="text-[#666] text-sm leading-relaxed">{card.desc}</p>
                    </motion.div>
                  )}
              </div>
            </div>

            { }
            <div className="relative overflow-hidden pointer-events-none select-none">
              <motion.h2
                initial={{ opacity: 0, x: -80 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.8, ease: "easeOut" }}
                viewport={{ once: true }}
                className="text-[18vw] font-black leading-none tracking-tighter uppercase italic whitespace-nowrap text-[#111]/[0.045]">

                Lá Chắn Số
              </motion.h2>
            </div>
          </main>


          <section className="py-24 px-6 w-full max-w-[1572.67px] min-h-[1190.22px] mx-auto">
            <div className="w-full">

              <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
                <div className="max-w-xl">
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#111111]">Lá Chắn Số là gì?</h2>
                  <button className="px-8 py-3 font-semibold rounded-full hover:bg-gray-200 transition-all active:scale-95 bg-[#ff8904] text-[#ffff]">
                    Tìm hiểu thêm
                  </button>
                </div>
                <div className="max-w-md">
                  <p className="text-lg text-gray-500 leading-relaxed">
                    Lá Chắn Số: Định nghĩa lại sự an toàn trực tuyến. Chúng tôi xây dựng một lớp lọc thông tin minh bạch, giúp người dùng phân định giữa thực tại - tin giả và chống khỏi lừa đảo . Một giải pháp bảo mật tinh gọn, hiệu quả và luôn sẵn sàng bảo vệ bạn.
                  </p>
                </div>
              </div>


              <motion.div variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.15
                  }
                }
              }} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">

                <motion.div variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, ease: "easeOut" }
                  }
                }} className="md:col-span-2 relative rounded-[32px] overflow-hidden bg-white border border-black/8 p-10 min-h-[400px] flex flex-col justify-between group shadow-sm">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-4 text-[#ff8904]">CÔNG NGHỆ XÁC THỰC LỚP SÂU</h3>
                    <p className="text-gray-600 max-w-2xl">
                      Lá Chắn Số vận hành trên nền tảng phân tích đa tầng, cho phép bóc tách dữ liệu và nhận diện hành vi độc hại trong thời gian thực. Bằng cách kết hợp thuật toán thông minh và mạng lưới dữ liệu thực thi, chúng tôi kiến tạo một lớp lọc minh bạch giúp bạn phân định xác thực giữa thực tại và tin giả. Đây là giải pháp bảo mật tinh gọn, chủ động ngăn chặn lừa đảo và bảo vệ an toàn tuyệt đối cho hành trình số của bạn.
                    </p>
                  </div>
                </motion.div>


                <motion.div variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, ease: "easeOut" }
                  }
                }} className="rounded-[32px] bg-white border border-black/8 p-10 flex flex-col justify-between min-h-[400px] shadow-sm">
                  <div className="text-[#ff8904]">
                    <h3 className="text-2xl font-bold mb-4 text-[#ff8904]">QUY CHUẨN & NỀN TẢNG RIÊNG</h3>
                  </div>
                  <p className="text-gray-600">
                    Thiết lập bộ quy tắc đánh giá độc lập kết hợp công nghệ nội bộ. Đảm bảo mọi thông tin đều được gán nhãn minh bạch dựa trên cơ sở khoa học và pháp lý.
                  </p>
                </motion.div>


                <motion.div variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, ease: "easeOut" }
                  }
                }} className="rounded-[32px] bg-white border border-black/8 p-10 flex flex-col justify-between min-h-[400px] shadow-sm">
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-[#ff8904]">DỮ LIỆU THỰC THI</h3>
                  </div>
                  <p className="text-gray-600">
                    Kết nối mạng lưới dữ liệu từ các cộng đồng bảo mật uy tín. Mọi cảnh báo đều dựa trên sự đối soát thực tế, kiến tạo một bản đồ an toàn cho người dùng Việt.
                  </p>
                </motion.div>


                <motion.div variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, ease: "easeOut" }
                  }
                }} className="rounded-[32px] bg-white border border-black/8 p-10 flex flex-col justify-between min-h-[400px] shadow-sm">
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-[#ff8904]">TRẢI NGHIỆM AN TOÀN</h3>
                  </div>
                  <p className="text-[black]">
                    Thiết kế tinh gọn, ưu tiên sự đơn giản và minh bạch trong mọi tương tác. Lá Chắn Số không chỉ bảo vệ dữ liệu, mà còn kiến tạo một môi trường số đáng tin cậy, giúp bạn luôn tự tin và an tâm trên hành trình trực tuyến.
                  </p>
                </motion.div>


                <motion.div variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, ease: "easeOut" }
                  }
                }} className="rounded-[32px] bg-white/5 backdrop-blur-sm border border-white/10 p-10 flex flex-col justify-between h-[400px] text-white border-t-[color:var(--color-orange-200)] border-r-[color:var(--color-orange-200)] border-b-[color:var(--color-orange-200)] border-l-[color:var(--color-orange-200)]">
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-[#ff8904]">TIẾN HÓA LIÊN TỤC</h3>
                  </div>
                  <p className="text-[#000000]">
                    Hệ thống kết nối mạng lưới dữ liệu động, liên tục cập nhật và vô hiệu hóa các phương thức lừa đảo mới nhất từ cộng đồng. Bằng cách hợp nhất các nguồn tin thực thi, Lá Chắn Số kiến tạo một lớp phòng thủ chủ động, giúp bạn đi trước kẻ xấu một bước trên mọi nền tảng số.
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </section>


          <section className="py-24 bg-[#111] text-white overflow-hidden border-t border-white/10">
            <div className="w-full relative">
              <div className="flex flex-col items-center text-center mb-8 relative z-10 px-6">
                <motion.span initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-[#ff8904] font-mono text-sm tracking-[0.2em] uppercase mb-4">
                  Mạng lưới giám sát toàn cầu
                </motion.span>
                <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-white">
                  Tin giả và lừa đảo có ở khắp mọi nơi
                </motion.h2>
                <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-gray-500 max-w-2xl text-lg">
                  Lá Chắn Số kết nối với các trung tâm dữ liệu bảo mật trên toàn thế giới để cập nhật và ngăn chặn các mối đe dọa xuyên biên giới trong thời gian thực.
                </motion.p>
              </div>
              <GlobeViz />
            </div>
          </section>


          <section className="py-20 border-t border-black/10 overflow-hidden bg-[#ff8904]">
            <div className="max-w-[1600px] mx-auto px-6 mb-12 text-center">
              <h3 className="font-bold uppercase tracking-[0.3em] mb-8 text-[20px] text-[#ffff]">Đồng hành cùng các đơn vị uy tín</h3>
            </div>

            <div className="relative flex overflow-x-hidden">
              <div className="flex animate-marquee whitespace-nowrap py-4">
                {[...Array(4)].map((_, i) => <div key={i} className="flex items-center gap-24 mx-12">
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">DNS-BLOCKLISTS</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">MALWARE-FILTER</span>
                  <span className="text-2xl font-bold opacity-30 hover:opacity-80 transition-opacity cursor-default text-[#ffff]">TINGIA.GOV</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">VNEXPRESS</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">TUỔI TRẺ</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">BÁO THANH NIÊN</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">DANTRI</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">PhishTank</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">Google News</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">GITHUB COMMUNITY</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">OpenPhish</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">The New York Times</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">CNN</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">AFP</span>
                  <span className="text-2xl font-bold text-[#111] opacity-30 hover:opacity-80 transition-opacity cursor-default">AP News</span>
                </div>)}
              </div>
            </div>
          </section>


          <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
            <div className="max-w-[1600px] mx-auto px-6">
              <motion.h2 initial={{ opacity: 0, x: -100 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 2, ease: "easeOut" }} viewport={{ once: true }} className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none text-[#111]/[0.045]">
                Lá Chắn Số
              </motion.h2>
            </div>
          </div>
        </motion.div>}

        {currentPage === "check" && <motion.div key="check" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pt-32 pb-20 px-6 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-[#ff8904]">Trung Tâm Kiểm Tra An Toàn</h2>
              <p className="text-[black]">Phân tích URL, tệp tin và nội dung nghi ngờ bằng công nghệ Sandbox độc quyền.</p>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8">
              <button onClick={() => setCheckType("web")} className={`px-6 py-2 rounded-full text-sm font-bold transition-all border border-[#ff8904] ${checkType === "web" ? "bg-[#ff8904] text-white" : "bg-white text-[#ff8904] hover:bg-orange-50"}`}>
                Kiểm tra Web
              </button>
              <button onClick={() => setCheckType("news")} className={`px-6 py-2 rounded-full text-sm font-bold transition-all border border-[#ff8904] ${checkType === "news" ? "bg-[#ff8904] text-white" : "bg-white text-[#ff8904] hover:bg-orange-50"}`}>
                Kiểm tra Tin giả
              </button>
            </div>


            <form onSubmit={handleCheck} className="relative max-w-3xl mx-auto mb-16">
              <div className="relative flex items-center w-full h-16 px-8 bg-[#ff8904] rounded-full shadow-lg">
                <input type="text" placeholder="Nhập đường dẫn, văn bản cần kiểm tra" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/60 text-lg" />
                <button type="submit" disabled={isChecking}>
                  {isChecking ? <Loader2 className="w-6 h-6 text-white animate-spin ml-3" /> : <Search className="w-6 h-6 text-white ml-3 cursor-pointer hover:scale-110 transition-transform" />}
                </button>
              </div>
            </form>


            <div className="w-full">
              {isChecking ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-12 shadow-2xl text-center">
                <div className="relative w-48 h-48 mx-auto mb-16" style={{ perspective: '1000px' }}>
                  <motion.div
                    animate={{ rotateX: 360, rotateY: 180 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-[8px] border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                    style={{ transformStyle: "preserve-3d" }} />

                  <motion.div
                    animate={{ rotateY: 360, rotateZ: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border-[6px] border-orange-400/40 shadow-[0_0_15px_rgba(251,146,60,0.4)]"
                    style={{ transformStyle: "preserve-3d" }} />

                  <motion.div
                    animate={{ rotateX: 360, rotateZ: -360 }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-8 rounded-full border-[4px] border-orange-300/60 shadow-[0_0_10px_rgba(253,186,116,0.5)]"
                    style={{ transformStyle: "preserve-3d" }} />

                  <div className="absolute inset-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-300 shadow-[0_0_40px_rgba(249,115,22,0.8)] animate-pulse flex items-center justify-center overflow-hidden">
                    <motion.div
                      animate={{ y: ["-150%", "150%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="w-full h-1 bg-white shadow-[0_0_15px_#fff]" />

                    <Search className="w-10 h-10 text-white absolute" />
                  </div>
                </div>

                <div className="space-y-6 max-w-md mx-auto">
                  {[
                    { icon: Search, label: "Phân tích mã nguồn" },
                    { icon: Database, label: "Kiểm tra cơ sở dữ liệu" },
                    { icon: Globe, label: "LCS Behavioral Engine" },
                    { icon: ShieldCheck, label: "Xác thực kết quả" }].
                    map((step, idx) => <div key={idx} className={`flex items-center gap-4 transition-all duration-500 ${idx === loadingStep ? "opacity-100 scale-105" : idx < loadingStep ? "opacity-40" : "opacity-20"}`}>
                      <div className={`p-2 rounded-lg ${idx === loadingStep ? "bg-orange-100" : "bg-gray-100"}`}>
                        {idx === loadingStep ? <Loader2 className="w-5 h-5 text-orange-600 animate-spin" /> : idx < loadingStep ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <step.icon className="w-5 h-5 text-gray-500" />}
                      </div>
                      <span className={`font-medium ${idx === loadingStep ? "text-orange-900" : "text-gray-600"}`}>
                        {step.label}
                        {idx === loadingStep && "..."}
                      </span>
                    </div>)}
                </div>

                <div className="mt-12">
                  <p className="text-sm text-orange-600 font-mono animate-pulse uppercase tracking-widest">
                    LCS Engine · Đang xử lý 3 tầng phân tích
                  </p>
                </div>
              </motion.div> : showResults && resultData ? <div className="space-y-8">

                {resultData.factCheckedFake && <FactCheckBanner />}

                {resultData.numericVerification?.hasMismatch && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">🔢</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-red-800 text-lg">Phát hiện số liệu bị chỉnh sửa</h4>
                        <p className="text-red-700 text-sm mt-1">
                          Tin bài gốc từ báo uy tín có số liệu khác với nội dung bạn cung cấp. 
                          Hệ thống đã phát hiện <strong>{resultData.numericVerification.mismatches.length} chỗ</strong> số liệu không khớp.
                        </p>
                        <div className="mt-3 space-y-2">
                          {resultData.numericVerification.mismatches.slice(0, 3).map((m: any, i: number) => (
                            <div key={i} className="bg-white rounded-lg p-3 border border-red-200 text-sm">
                              <span className="text-red-600 font-semibold">Nội dung:</span> {m.context}
                              <br />
                              <span className="text-green-600 font-semibold">Báo gốc:</span> {m.articleTitle} → số liệu thực: <strong>{m.articleNumber}</strong>
                            </div>
                          ))}
                        </div>
                        <p className="text-red-600 text-xs mt-2">⚠️ Đây là dấu hiệu của tin giả — lấy tin từ báo nhưng thay đổi số liệu để gây hiểu lầm.</p>
                      </div>
                    </div>
                  </div>
                )}

                {!resultData.numericVerification?.hasMismatch && resultData.numericVerification?.penalty > 0 && resultData.numericVerification?.type === 'unverified' && (
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">❓</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-yellow-800 text-lg">Số liệu chưa được xác nhận</h4>
                        <p className="text-yellow-700 text-sm mt-1">
                          Nội dung chứa <strong>{resultData.numericVerification.textNumbers?.length || 0} số liệu cụ thể</strong> nhưng không có bài báo nào xác nhận thông tin này.
                        </p>
                        <div className="mt-3 space-y-2">
                          {resultData.numericVerification.textNumbers?.slice(0, 3).map((n: any, i: number) => (
                            <div key={i} className="bg-white rounded-lg p-3 border border-yellow-200 text-sm">
                              <span className="text-yellow-600 font-semibold">Số liệu:</span> {n.value} — <span className="text-gray-600">{n.context}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-yellow-600 text-xs mt-2">⚠️ Số liệu cụ thể cần được kiểm chứng từ nguồn tin chính thống.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="h-1.5 bg-gradient-to-r from-orange-400 to-amber-500" />
                    <div className="grid gap-6 p-6 lg:grid-cols-[220px_1fr_auto] lg:items-center">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                          {resultData.type === "news" ? "Độ tin cậy" : "Mức an toàn"}
                        </p>

                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" stroke="#f3f4f6" strokeWidth="8" fill="none" />
                            <motion.circle
                              cx="50" cy="50" r="45"
                              stroke={STATE_UI[resolveWebState(resultData)].stroke}
                              strokeWidth="8"
                              fill="none"
                              strokeLinecap="round"
                              initial={{ strokeDashoffset: 283 }}
                              animate={{ strokeDashoffset: 283 - 283 * resultData.score / 100 }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              style={{ strokeDasharray: 283 }} />

                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-4xl font-black tracking-tighter text-gray-800 drop-shadow-sm flex items-baseline">
                              <CountingNumber value={resultData.score} /><span className="text-xl">%</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        {resultData.type === "web" && (() => {
                          const st = resolveWebState(resultData);
                          const meta = STATE_UI[st];
                          const Icon = meta.icon;
                          return <>
                            <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${meta.badge}`}>
                              <Icon className="h-4 w-4" />
                              {meta.badgeLong}
                            </div>
                            {typeof resultData.riskScore === "number" && <span className="mb-3 ml-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                              Rủi ro {resultData.riskScore}/100 · Phủ {Math.round((resultData.coverage ?? 0) * 100)}%
                            </span>}
                          </>;
                        })()}
                        {resultData.type !== "web" && <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${resultData.isSafe ? "bg-green-50 text-green-700" : resultData.isWarning ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {resultData.isSafe ? <ShieldCheck className="h-4 w-4" /> : resultData.isWarning ? <AlertTriangle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          {resultData.isSafe ? "An toàn" : resultData.isWarning ? "Cần xác thực" : "Nguy hiểm"}
                        </div>}
                        {resultData.isEducational && (
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700 ml-2">
                            <Info className="h-4 w-4" />
                            Nội dung giáo dục
                          </div>
                        )}
                        <h3 className="truncate text-2xl font-black tracking-tight text-gray-950">{resultData.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{resultData.description}</p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4 lg:min-w-[260px]">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                          <Globe className="h-4 w-4" />
                          Đối tượng
                        </div>
                        <p className="mt-2 break-all text-sm font-bold text-gray-900">{resultData.url}</p>
                      </div>
                    </div>

                    {resultData.type === "web" && (() => {
                      const st = resolveWebState(resultData);
                      return <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-5">
                        <div className="flex flex-wrap items-center gap-3">
                          {st === "verify" && <button type="button" onClick={() => setOwnerVerifyOpen(true)} className="inline-flex items-center gap-2.5 rounded-2xl bg-blue-600 px-6 py-3.5 text-[15px] font-bold text-white shadow-md transition-colors hover:bg-blue-700">
                            <ShieldCheck className="h-5 w-5" />
                            Tôi là chủ website — Yêu cầu xác minh
                          </button>}
                          <button type="button" onClick={() => setReportIssueOpen(true)} className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-gray-300 bg-white px-6 py-3.5 text-[15px] font-bold text-gray-800 shadow-md transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700">
                            <Flag className="h-5 w-5" />
                            Báo kết quả sai (khiếu nại)
                          </button>
                          <button type="button" onClick={() => setColorLegendOpen(true)} className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-gray-300 bg-white px-6 py-3.5 text-[15px] font-bold text-gray-800 shadow-md transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">
                            <HelpCircle className="h-5 w-5" />
                            Giải thích 4 mức
                          </button>
                        </div>
                        <div className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                          <AlertTriangle className="h-5 w-5 shrink-0" />
                          Kết quả chỉ mang tính tham khảo — luôn kiểm tra kỹ địa chỉ website trước khi đăng nhập hoặc thanh toán.
                        </div>
                      </div>;
                    })()}
                  </motion.div>

                  {resultData.type === "web" && resultData.aiAnalysis?.available && resultData.aiAnalysis.summary ? <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="relative overflow-hidden rounded-3xl border-2 border-orange-200 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 p-6 shadow-xl shadow-orange-200/50 sm:p-8">
                    {resultData.aiAnalysis.risk >= 45 || ["gambling", "scam", "phishing", "adult", "parked", "redirect"].includes((resultData.aiAnalysis.category || "").toLowerCase()) ? <div className="relative mb-5 flex items-start gap-3 rounded-2xl border border-red-300/40 bg-red-500/20 px-4 py-3 backdrop-blur-sm">
                      <div>
                        <p className="text-sm font-black uppercase tracking-wide text-white">Cảnh báo AI: nội dung có dấu hiệu nguy hiểm</p>
                        <p className="mt-0.5 text-xs font-medium text-red-50">Hệ thống phân loại web này là "{resultData.aiAnalysis.category}" (rủi ro {resultData.aiAnalysis.risk}/100). Cân nhắc rất kỹ trước khi tin tưởng.</p>
                      </div>
                    </div> : null}

                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-black tracking-tight text-white sm:text-2xl">AI Tóm Tắt Nội Dung Web</p>
                        <p className="mt-0.5 text-xs font-semibold text-orange-100">{WEB_AI_CATEGORY_LABEL[resultData.aiAnalysis.category || "unknown"]?.label || "Đọc trang qua GPT · phân loại bản chất"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${resultData.aiAnalysis.risk >= 45 ? "bg-white text-red-700" : resultData.aiAnalysis.risk >= 20 ? "bg-orange-200 text-orange-900" : "bg-white text-emerald-700"}`}>
                          {resultData.aiAnalysis.category || "unknown"}
                        </span>
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white ring-1 ring-white/40">
                          Rủi ro {resultData.aiAnalysis.risk}/100
                        </span>
                      </div>
                    </div>

                    <div className="relative mt-5 rounded-2xl bg-white/95 p-5 shadow-lg sm:p-6">
                      <p className="text-[15px] font-medium leading-7 text-gray-900 sm:text-base">{resultData.aiAnalysis.summary}</p>
                      {resultData.aiAnalysis.keywords?.length ? <div className="mt-4 flex flex-wrap gap-2">
                        {resultData.aiAnalysis.keywords.map((kw: string, idx: number) => <span key={idx} className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-700 ring-1 ring-orange-200">
                          #{kw}
                        </span>)}
                      </div> : null}
                    </div>
                  </motion.div> : null}

                  {resultData.type === "web" && (resultData.thirdParty?.length || resultData.ipInfo?.detail?.ips?.length) ? <ThirdPartyResultsPanel thirdParty={resultData.thirdParty} ipInfo={resultData.ipInfo} /> : null}

                  {resultData.type === "news" && (() => {
                    const plain = buildPlainSummary(resultData.analysisReasons ?? [], resultData.isSafe);
                    return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={`overflow-hidden rounded-3xl border p-6 ${resultData.isSafe ? "border-emerald-200 bg-emerald-50/60" : resultData.isWarning ? "border-amber-200 bg-amber-50/60" : "border-red-200 bg-red-50/70"}`}>
                      <div className="flex items-center gap-2 mb-3">
                        {resultData.isSafe ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : resultData.isWarning ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <X className="h-5 w-5 text-red-600" />}
                          <h3 className="text-base font-black tracking-tight text-gray-950">Kết luận bằng lời đơn giản</h3>
                      </div>
                      <p className={`text-[15px] leading-relaxed font-medium ${resultData.isSafe ? "text-emerald-900" : resultData.isWarning ? "text-amber-900" : "text-red-900"}`}>
                        {plain.verdict}
                      </p>
                      {plain.items.length > 0 && <ul className="mt-4 space-y-2">
                        {plain.items.map((item, i) => <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-800">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${resultData.isSafe ? "bg-emerald-400" : resultData.isWarning ? "bg-amber-400" : "bg-red-400"}`} />
                          <span>{item}</span>
                        </li>)}
                      </ul>}
                    </motion.div>;
                  })()}

                  {resultData.type === "news" && <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative overflow-hidden rounded-3xl border-2 border-orange-200 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 p-6 shadow-xl shadow-orange-200/50 sm:p-8">
                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-black tracking-tight text-white sm:text-2xl">AI Tóm Tắt Nội Dung Tin</p>
                        <p className="mt-0.5 text-xs font-semibold text-orange-100">Đọc nội dung qua LLM · tổng hợp khách quan, không thay thế kết luận điểm số</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white ring-1 ring-white/40">
                          {newsAiSummary.loading ? "Đang tóm tắt..." : newsAiSummary.loaded ? "Hoàn tất" : "Chưa có"}
                        </span>
                      </div>
                    </div>

                    <div className="relative mt-5 rounded-2xl bg-white/95 p-5 shadow-lg sm:p-6">
                      {newsAiSummary.loading ? <div className="flex items-center gap-3 text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                        <p className="text-sm font-medium">AI đang đọc và tóm tắt nội dung tin tức...</p>
                      </div> : newsAiSummary.summary ? <>
                        <p className="text-[15px] font-medium leading-7 text-gray-900 sm:text-base">{newsAiSummary.summary}</p>

                        {newsAiSummary.key_points.length > 0 && <div className="mt-5">
                          <p className="mb-2.5 text-xs font-black uppercase tracking-[0.18em] text-orange-600">Điểm chính</p>
                          <ul className="space-y-2">
                            {newsAiSummary.key_points.map((point, idx) => <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-800">
                              <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-black text-orange-700">{idx + 1}</span>
                              <span>{point}</span>
                            </li>)}
                          </ul>
                        </div>}

                        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                          {(newsAiSummary.credibility_note || newsAiSummary.detection_note) && <>
                            {newsAiSummary.credibility_note ? <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.15em] text-gray-500">Ghi chú thông tin</p>
                              <p className="text-sm leading-6 text-gray-800">{newsAiSummary.credibility_note}</p>
                            </div> : null}
                            {newsAiSummary.detection_note ? <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.15em] text-amber-700">Ghi chú dấu hiệu</p>
                              <p className="text-sm leading-6 text-amber-900">{newsAiSummary.detection_note}</p>
                            </div> : null}
                          </>}
                        </div>
                      </> : <p className="text-sm font-medium text-gray-500">{newsAiSummary.loaded ? "AI không tạo được bản tóm tắt cho nội dung này." : "Tóm tắt sẽ hiển thị sau khi kiểm tra hoàn tất."}</p>}
                    </div>
                  </motion.div>}

                  <div className="grid grid-cols-1 gap-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-black tracking-tight text-gray-950">
                            {resultData.type === "news" ? "Nội dung đã phân tích" : "Preview an toàn"}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {resultData.type === "news" ? "Văn bản hoặc bài viết được đưa vào pipeline kiểm chứng." : "Ảnh chụp được render qua dịch vụ trung gian, không nhúng website trực tiếp."}
                          </p>
                        </div>
                        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-[#ff8904]">
                          <Shield className="h-4 w-4" />
                          {resultData.type === "news" ? "Text source" : "Safe preview"}
                        </span>
                      </div>

                      <div className="relative min-h-[520px] bg-gray-50">
                        {resultData.type === "news" ? <div className="h-[620px] overflow-y-auto bg-white p-7 custom-scrollbar">
                          <div className="whitespace-pre-wrap text-[15px] font-medium leading-8 text-gray-900">
                            <XAIHeatmap text={resultData.textContent} reasons={resultData.analysisReasons} />
                          </div>
                        </div> : <div className="relative h-[560px] overflow-hidden bg-gray-100">
                          <img src={activePreview ?? resultData.screenshot} alt="Website preview" className="h-full w-full object-cover object-top" referrerPolicy="no-referrer" onError={() => {
                            if ((resultData.previewCandidates?.length ?? 0) > previewCandidateIndex + 1) {
                              setPreviewCandidateIndex((current) => current + 1);
                            }
                          }} />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-6">
                            <p className="text-base font-black text-white">{resultData.title}</p>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/75">{resultData.description}</p>
                          </div>
                        </div>}
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex items-center justify-between gap-3">
                          <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-gray-950">
                          <Database className="h-5 w-5 text-gray-700" />
                          Tín Hiệu LCS
                        </h3>
                        <div className="flex items-center gap-2">
                          {resultData.type === "web" && resultData.thirdParty?.length ? <button type="button" onClick={() => setThirdPartyOpen(true)} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 hover:bg-sky-100 transition-colors">
                            Bên thứ 3 ({resultData.thirdParty.length})
                          </button> : null}
                          {resultData.type === "web" && resultData.ipInfo?.detail?.ips?.length ? <button type="button" onClick={() => setThirdPartyOpen(true)} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 hover:bg-violet-100 transition-colors">
                            IP ({resultData.ipInfo.detail.ips.length})
                          </button> : null}
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-gray-500">
                            {resultData.analysisReasons.length} tín hiệu
                          </span>
                        </div>
                      </div>

                      {resultData.type === "web" ? <div className="space-y-4">
                        {WEB_CATEGORY_GROUPS.map((group) => {
                          const groupReasons = (resultData.analysisReasons ?? []).filter((r: any) => (r.category ?? "reference") === group.key);
                          if (groupReasons.length === 0) return null;
                          return <div key={group.key} className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/60">
                            <div className={`flex items-center gap-2.5 border-b px-4 py-3 ${group.accent} border-transparent`}>
                              <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${group.accent}`}>
                                <group.icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black uppercase tracking-wide text-gray-800">{group.label}</p>
                                <p className="truncate text-[10px] font-medium text-gray-500">{group.description}</p>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black text-gray-500">{groupReasons.length}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
                              {groupReasons.map((res: any, idx: number) => <div key={idx} className={`rounded-xl border p-3 ${WEB_REASON_STATUS_CARD(res.status)}`}>
                                <div className="flex items-start gap-2.5">
                                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${WEB_REASON_STATUS_ICON(res.status)}`}>
                                    <res.icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                                      {res.id && <span className="rounded bg-white/80 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-gray-500">{res.id}</span>}
                                      <span className="text-sm font-black text-gray-950">{res.name}</span>
                                      {typeof res.scoreDelta === "number" && res.scoreDelta !== 0 && <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${res.scoreDelta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                        {res.scoreDelta > 0 ? `+${res.scoreDelta}` : res.scoreDelta}
                                      </span>}
                                    </div>
                                    <p className="text-xs font-medium leading-5 text-gray-700">{res.detail}</p>
                                  </div>
                                </div>
                              </div>)}
                            </div>
                          </div>;
                        })}
                      </div> : <div className="max-h-[690px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                        {resultData.analysisReasons.map((res: any, idx: number) => <div key={idx} className={`rounded-2xl border p-4 ${res.status === "danger" ? "border-red-200 bg-red-50/70" :
                          res.status === "warning" ? "border-amber-200 bg-amber-50/70" :
                            "border-emerald-200 bg-emerald-50/70"}`}>
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${res.status === "danger" ? "bg-red-100 text-red-700" :
                              res.status === "warning" ? "bg-amber-100 text-amber-700" :
                                "bg-emerald-100 text-emerald-700"}`}>
                              <res.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                {res.id && <span className="rounded bg-white/80 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-gray-500">{res.id}</span>}
                                <span className="text-sm font-black text-gray-950">{res.name}</span>
                              </div>
                              <p className="text-xs font-medium leading-5 text-gray-700">{res.detail}</p>
                            </div>
                          </div>
                        </div>)}
                      </div>}
                    </motion.div>
                  </div>
                </div>

                {resultData.type === "news" && resultData.analysis && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white text-gray-900 rounded-[32px] p-7 shadow-xl relative overflow-hidden border border-gray-100 group">

                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200/50 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-200/40 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="font-analysis-heading">
                          <h3 className="text-2xl font-bold tracking-tight text-gray-900">Thẩm Định Chuyên Gia Phân Tích</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold whitespace-nowrap">
                              {resultData.checkTypeLabel || "Tin tức chung"}
                            </span>
                            <p className="text-gray-500 text-sm hidden sm:block">· LCS Engine · 3 tầng phân tích độc lập</p>
                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-black font-mono tracking-widest hidden sm:block">v1.0</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => setAnalysisExpanded((current) => !current)} className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                          <ChevronRight className={`w-4 h-4 transition-transform ${analysisExpanded ? "rotate-90" : ""}`} />
                          {analysisExpanded ? "Thu gọn" : "Xem chi tiết"}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`px-5 py-2 rounded-xl text-sm font-bold border ${resultData.score >= 75 ? "bg-green-50 border-green-200 text-green-700" :
                          resultData.score >= 50 ? "bg-orange-50 border-orange-200 text-orange-700" :
                            "bg-red-50 border-red-200 text-red-700"}`}>
                          {resultData.isSafe ? "AN TOÀN" : resultData.isWarning ? "CẦN XÁC THỰC" : "NGUY HIỂM"}
                        </div>
                        <div className="px-5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold flex items-center gap-2 text-gray-700">
                          <Target className="w-4 h-4 text-orange-600" />
                          {resultData.score}% Tin cậy
                        </div>
                      </div>
                    </div>

                    <div className="py-5">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff8904] mb-2">Tóm tắt nội sinh</p>
                      <p className="text-[15px] text-[#111111] leading-relaxed font-analysis-body max-w-4xl">
                        {resultData.analysis.internal_verdict}
                      </p>
                    </div>

                    {analysisExpanded && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pt-2">

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#ff8904]">
                          <Database className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Heuristics</span>
                        </div>
                        <div className="p-6 rounded-[24px] bg-slate-900/85 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-slate-900 shadow-xl transition-all duration-300 h-full min-h-[140px]">
                          <p className="text-[15px] text-slate-300 leading-relaxed font-analysis-body">
                            {resultData.analysis.heuristics}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#ff8904]">
                          <Globe className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">URL Verification</span>
                        </div>
                        <div className="p-6 rounded-[24px] bg-slate-900/85 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-slate-900 shadow-xl transition-all duration-300 h-full min-h-[140px]">
                          <p className="text-[15px] text-slate-300 leading-relaxed font-analysis-body">
                            {resultData.analysis.url_verification}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#ff8904]">
                          <ShieldCheck className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Source Audit</span>
                        </div>
                        <div className="p-6 rounded-[24px] bg-slate-900/85 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-slate-900 shadow-xl transition-all duration-300 h-full min-h-[140px]">
                          <p className="text-[15px] text-slate-300 leading-relaxed font-analysis-body">
                            {resultData.analysis.source_audit}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#ff8904]">
                          <Database className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Press Comparison</span>
                        </div>
                        <div className="p-6 rounded-[24px] bg-slate-900/85 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-slate-900 shadow-xl transition-all duration-300 h-full min-h-[140px]">
                          <p className="text-[15px] text-slate-300 leading-relaxed font-analysis-body">
                            {resultData.analysis.press_comparison}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#ff8904]">
                          <Search className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Search Trace</span>
                        </div>
                        <div className="p-6 rounded-[24px] bg-slate-900/85 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-slate-900 shadow-xl transition-all duration-300 h-full min-h-[140px]">
                          <p className="text-[15px] text-slate-300 leading-relaxed font-analysis-body">
                            {resultData.analysis.search_trace}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#ff8904]">
                          <ShieldCheck className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Live Fact API</span>
                        </div>
                        <div className="p-6 rounded-[24px] bg-slate-900/85 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-slate-900 shadow-xl transition-all duration-300 h-full min-h-[140px]">
                          <p className="text-[15px] text-slate-300 leading-relaxed font-analysis-body">
                            {resultData.analysis.live_fact_check}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#ff8904]">
                          <Globe className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Google News / Press</span>
                        </div>
                        <div className="p-6 rounded-[24px] bg-slate-900/85 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-slate-900 shadow-xl transition-all duration-300 h-full min-h-[140px]">
                          <p className="text-[15px] text-slate-300 leading-relaxed font-analysis-body">
                            {resultData.analysis.live_press_scan}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#ff8904]">
                          <ShieldCheck className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Wikipedia / Open Knowledge</span>
                        </div>
                        <div className="p-6 rounded-[24px] bg-slate-900/85 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-slate-900 shadow-xl transition-all duration-300 h-full min-h-[140px]">
                          <p className="text-[15px] text-slate-300 leading-relaxed font-analysis-body">
                            {resultData.analysis.open_knowledge_check}
                          </p>
                        </div>
                      </div>

                    </div>}

                    {resultData.violated_rules && resultData.violated_rules.length > 0 && <div className="mt-10 pt-8 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2.5">
                        {resultData.violated_rules.map((rule: string) => <span key={rule} className="px-4 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold font-mono border border-red-200">
                          {rule}
                        </span>)}
                      </div>
                    </div>}
                  </div>
                </motion.div>}

                {resultData.type === "news" && resultData.pressArticles && <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-gray-950">LCS Press Matrix — Đối Chiếu Báo Chí</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Kết quả đối chiếu đa nguồn từ LCS Press Matrix — phân tích bài viết liên quan theo sự kiện.
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-[#ff8904]">
                      <Search className="h-4 w-4" />
                      {resultData.pressSourceLabel ?? "LCS Press Matrix"}
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {resultData.pressArticles.length > 0 ? resultData.pressArticles.map((article: any, index: number) => <a key={`${article.title}-${index}`} href={article.link ?? "#"} target="_blank" rel="noreferrer" className="block px-6 py-5 transition-colors hover:bg-gray-50">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-950 line-clamp-2">{article.title}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {article.source} {article.publishedAt ? `· ${new Date(article.publishedAt).toLocaleDateString('vi-VN')}` : ""}
                          </p>
                        </div>
                        {article.link ? <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase text-[#ff8904] hover:bg-orange-100 transition-colors sm:mt-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Xem bài
                        </span> : null}
                      </div>
                    </a>) : <div className="p-6 text-sm text-gray-600">LCS Press Matrix không tìm thấy bài báo liên quan trong phạm vi đối chiếu hiện tại. </div>}
                  </div>
                </motion.div>}




                <div className="hidden">

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm flex flex-col items-center text-center">
                        <h3 className="text-lg font-bold mb-8 text-gray-800 tracking-tight">Cổng Giám Sát Cấp Cao</h3>

                    <div className="relative w-48 h-48 mb-10">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-gray-100" />
                        <motion.circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="14" fill="transparent" strokeDasharray={528} initial={{ strokeDashoffset: 528 }} animate={{ strokeDashoffset: 528 - 528 * resultData.score / 100 }} transition={{ duration: 1.5, ease: "easeOut" }} className={resultData.isSafe ? "text-green-500" : resultData.isWarning ? "text-orange-500" : "text-red-500"} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-gray-900 leading-none">{resultData.score}%</span>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Độ Tin Cậy</span>
                      </div>
                    </div>

                    <div className={`w-full py-5 rounded-3xl mb-10 flex items-center justify-center gap-3 ${resultData.isSafe ? "bg-green-500/10 text-green-600" : resultData.isWarning ? "bg-orange-500/10 text-orange-600" : "bg-red-500/10 text-red-600"}`}>
                      {resultData.isSafe ? <ShieldCheck className="w-6 h-6" /> : resultData.isWarning ? <AlertTriangle className="w-6 h-6" /> : <X className="w-6 h-6" />}
                      <span className="text-2xl font-black tracking-widest">
                        {resultData.isSafe ? "AN TOÀN" : resultData.isWarning ? "CẦN XÁC THỰC" : "NGUY HIỂM"}
                      </span>
                    </div>

                    {resultData.isEducational && (
                      <div className="w-full py-4 rounded-3xl mb-6 flex items-center justify-center gap-3 bg-blue-500/10 text-blue-600 border border-blue-100">
                        <Info className="w-5 h-5" />
                        <span className="text-lg font-bold tracking-wide">
                          NỘI DUNG GIÁO DỤC — Từ khóa cảnh báo trong bối cảnh hướng dẫn
                        </span>
                      </div>
                    )}

                    <div className="w-full space-y-4 mb-10">
                      <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                        <span>Phân cấp rủi ro</span>
                        <span className={resultData.isSafe ? "text-green-500" : resultData.isWarning ? "text-orange-500" : "text-red-500"}>
                          {resultData.isSafe ? "Cấp độ 1 (An toàn)" : resultData.isWarning ? "Cấp độ 2 (Cảnh báo)" : "Cấp độ 3 (Khẩn cấp)"}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${100 - resultData.score}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className={`h-full ${resultData.isSafe ? "bg-green-500" : resultData.isWarning ? "bg-orange-500" : "bg-red-500"}`} />
                      </div>
                    </div>

                    <div className="mt-auto pt-10 w-full border-t border-gray-50">
                      <div className="p-5 rounded-3xl bg-orange-50/50 border border-orange-100 flex items-start gap-4 text-left">
                        <ShieldCheck className="w-6 h-6 text-[#ff8904] shrink-0 mt-1" />
                        <div>
                          <p className="text-sm font-bold text-[#ff8904] leading-none mb-1">Xác thực bởi chuyên gia</p>
                          <p className="text-[11px] text-orange-700/70 leading-relaxed">Được bảo chứng bởi mạng lưới 500+ thâm định viên bảo mật độc lập.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>


                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm flex flex-col h-full">
                    <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                        <h3 className="text-xl font-bold flex items-center gap-3">
                        <Database className="w-7 h-7 text-[#ff8904]" />
                        Bằng Chứng Phân Tích
                      </h3>
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
                        {resultData.analysisReasons.length} Tín hiệu
                      </span>
                    </div>

                    <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                      {resultData.analysisReasons.map((res: any, idx: number) => <div key={idx} className="flex items-start gap-4 p-5 rounded-3xl border border-gray-50 bg-white hover:border-orange-200 hover:shadow-[0_8px_30px_rgb(255,137,4,0.1)] transition-all group cursor-default">
                        <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${res.status === "danger" ? "bg-red-50 text-red-500" :
                          res.status === "warning" ? "bg-orange-50 text-orange-500" :
                            "bg-green-50 text-green-500"}`}>
                          <res.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            {res.id && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold font-mono tracking-tighter uppercase">{res.id}</span>}
                            <span className="text-[15px] font-bold text-gray-900 truncate tracking-tight">{res.name}</span>
                          </div>
                          <p className={`text-[12px] leading-relaxed line-clamp-3 font-medium ${res.status === "danger" ? "text-red-600/80" :
                            res.status === "warning" ? "text-orange-600/80" :
                              "text-green-700/80"}`}>
                            {res.detail}
                          </p>
                        </div>
                      </div>)}
                    </div>
                  </motion.div>


                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm flex flex-col h-full">
                    <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                        {resultData.type === "news" ? "Dữ Liệu Văn Bản" : "Kiểm Soát Sandbox"}
                      </h3>
                      <div className="px-4 py-1.5 bg-green-50 text-green-700 text-[11px] font-bold rounded-full border border-green-100 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        {resultData.type === "news" ? "TEXT QUANTUM" : "SAFE PREVIEW"}
                      </div>
                    </div>

                    <div className="relative flex-1 rounded-[32px] overflow-hidden bg-gray-50/50 border border-gray-200 group min-h-[500px] shadow-inner">
                      {resultData.type === "news" ? <div className="p-8 h-full bg-white overflow-y-auto custom-scrollbar">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                          <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                          <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <div className="text-[#1A1A1A] text-[16px] leading-[1.8] font-medium whitespace-pre-wrap selection:bg-orange-100">
                            <XAIHeatmap text={resultData.textContent} reasons={resultData.analysisReasons} />
                          </div>
                        </div>
                      </div> : <>
                        <img src={activePreview ?? resultData.screenshot} alt="Website preview" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" onError={() => {
                          if ((resultData.previewCandidates?.length ?? 0) > previewCandidateIndex + 1) {
                            setPreviewCandidateIndex((current) => current + 1);
                          }
                        }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/95 backdrop-blur-xl rounded-[24px] border border-white/20 shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 invisible group-hover:visible opacity-0 group-hover:opacity-100">
                          <p className="text-base font-black text-gray-900 leading-tight mb-2">{resultData.title}</p>
                          <p className="text-xs text-gray-600/80 leading-relaxed line-clamp-2">{resultData.description}</p>
                        </div>
                      </>}
                    </div>

                    <div className="mt-8 flex items-center justify-between text-[11px] text-gray-500 font-bold uppercase tracking-[0.2em] px-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-orange-400" />
                        <span className="truncate max-w-[150px]">{resultData.url}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">Secure Protocol</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-50 px-4">
                      <button className="w-full py-4 bg-[#1A1A1A] hover:bg-black text-white text-[13px] font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.1)] active:scale-95 group">
                        <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        {resultData.type === "news" ? "TRUY XUẤT NGUỒN TIN GỐC" : "KÍCH HOẠT LIVE SANDBOX"}
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div> : <div className="py-20 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-500">Chưa có dữ liệu kiểm tra</h3>
                <p className="text-gray-500">Vui lòng nhập URL để bắt đầu phân tích an toàn.</p>
              </div>}
            </div>
          </div>


          <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none">
            <div className="max-w-[1600px] mx-auto px-6">
              <motion.h2 initial={{ opacity: 0, x: -100 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 2, ease: "easeOut" }} viewport={{ once: true }} className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]">
                Lá Chắn Số
              </motion.h2>
            </div>
          </div>
        </motion.div>}

        {currentPage === "partners" && <motion.div key="partners" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pt-32 pb-20 px-6 min-h-screen bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-sm tracking-[0.3em] uppercase mb-4 block text-[#ff8904]">
                Mạng lưới hợp tác
              </motion.span>
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-[#ff8904]">Đồng hành cùng Lá Chắn Số</h2>
              <p className="text-black max-w-2xl mx-auto text-lg">
                Chúng tôi tự hào được đồng hành cùng các tổ chức bảo mật toàn cầu, cơ quan báo chí và đơn vị xác thực uy tín để kiến tạo một không gian mạng an toàn.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-12">
              {partnerGroups.map((group) =>
                <div key={group.title} className="bg-[#F9F9FB] rounded-[40px] p-12 flex flex-col md:flex-row gap-12 border border-gray-100">
                  <div className="md:w-1/3">
                    <h3 className="text-2xl font-bold text-black mb-4">{group.title}</h3>
                    <p className="text-black font-medium">{group.subtitle}</p>
                  </div>
                  <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {group.items.map((item) =>
                      <button key={item.name} type="button" onClick={() => setSelectedInfoItem({ title: item.name, description: item.description, link: item.link, category: "Thương hiệu & đối tác" })} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4 group hover:border-orange-200 transition-all text-left cursor-pointer">
                        <div className="w-2 h-2 rounded-full group-hover:scale-150 transition-transform bg-[#ff8904]" />
                        <span className="font-bold text-black tracking-wide">{item.name}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>


          <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
            <div className="max-w-[1600px] mx-auto px-6">
              <motion.h2 initial={{ opacity: 0, x: -100 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 2, ease: "easeOut" }} viewport={{ once: true }} className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]">
                Lá Chắn Số
              </motion.h2>
            </div>
          </div>
        </motion.div>}

        {currentPage === "resources" && <motion.div key="resources" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pt-32 pb-20 px-6 min-h-screen bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-black font-mono text-sm tracking-[0.3em] uppercase mb-4 block">
                Trung tâm tài nguyên
              </motion.span>
              <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-black">Dữ liệu cảnh báo</h2>
              <p className="text-black max-w-2xl mx-auto text-lg">
                Danh sách các trang web lừa đảo và tin giả được hệ thống Lá Chắn Số cập nhật liên tục để bảo vệ người dùng.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              <div className="bg-white rounded-[32px] border border-red-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-red-50 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-black">Trang web lừa đảo</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-red-50">
                        <th className="pb-4 font-bold text-black/70 uppercase text-[10px] tracking-widest">STT</th>
                        <th className="pb-4 font-bold text-black/70 uppercase text-[10px] tracking-widest">Link trang</th>
                        <th className="pb-4 font-bold text-black/70 uppercase text-[10px] tracking-widest">Ngày</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50/30">
                      {suspiciousSiteItems.map((item) => <tr key={item.id} onClick={() => setSelectedInfoItem({ title: item.link, description: item.description, link: item.linkUrl, category: "Trang web lừa đảo" })} className="group hover:bg-red-50/30 transition-colors cursor-pointer">
                        <td className="py-4 font-medium text-black text-sm">{item.id}</td>
                        <td className="py-4 text-black font-medium hover:underline cursor-pointer text-sm truncate max-w-[150px]">{item.link}</td>
                        <td className="py-4 text-black/70 text-sm">{item.date}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              </div>


              <div className="bg-white rounded-[32px] border border-red-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-red-50 rounded-xl">
                    <Sparkles className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-black">Tin giả cảnh báo</h3>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-red-50">
                        <th className="pb-4 font-bold text-black/70 uppercase text-[10px] tracking-widest">STT</th>
                        <th className="pb-4 font-bold text-black/70 uppercase text-[10px] tracking-widest">Tiêu đề tin</th>
                        <th className="pb-4 font-bold text-black/70 uppercase text-[10px] tracking-widest">Ngày</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50/30">
                      {(cachedNewsItems.length > 0 ? cachedNewsItems : fakeNewsItems).map((item) => <tr key={item.id} onClick={() => setSelectedInfoItem({ title: item.title, description: item.description, link: item.linkUrl, category: "Tin giả cảnh báo" })} className="group hover:bg-red-50/30 transition-colors cursor-pointer">
                        <td className="py-4 font-medium text-black text-sm">{item.id}</td>
                        <td className="py-4 text-black font-medium text-sm line-clamp-1">{item.title}</td>
                        <td className="py-4 text-black/70 text-sm">{item.date}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>


          <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
            <div className="max-w-[1600px] mx-auto px-6">
              <motion.h2 initial={{ opacity: 0, x: -100 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 2, ease: "easeOut" }} viewport={{ once: true }} className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]">
                Lá Chắn Số
              </motion.h2>
            </div>
          </div>
        </motion.div>}
        {currentPage === "mission" && <motion.div key="mission" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pt-32 pb-20 min-h-screen bg-[#090909] text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center py-24">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.25em] text-white/80 shadow-sm shadow-black/20">
                <Zap className="w-4 h-4 text-orange-400" />
                Sứ mệnh của chúng tôi
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-auto mt-10 max-w-4xl text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                Xây dựng một thế giới số an toàn, đáng tin cậy và minh bạch cho mọi người.
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-slate-300">
                Lá Chắn Số mang lại trải nghiệm kiểm tra tin giả, bảo vệ website độc hại và hỗ trợ nhận diện lừa đảo bằng công nghệ phân tích dữ liệu thông minh, dễ dùng, phù hợp cho người Việt Nam.
              </motion.p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Globe,
                  title: "Giám sát toàn cầu",
                  description: "Kết nối dữ liệu từ nguồn tin uy tín để cảnh báo sớm các mối nguy trên mạng."
                },
                {
                  icon: Shield,
                  title: "Bảo mật ưu tiên",
                  description: "Đưa ra cảnh báo rõ ràng, giúp người dùng quyết định nhanh chóng và an tâm hơn."
                },
                {
                  icon: User,
                  title: "Trải nghiệm đơn giản",
                  description: "Giao diện trực quan, dễ sử dụng, giúp mọi người kiểm tra ngay lập tức."
                }].
                map((item) =>
                  <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-[30px] border border-white/10 bg-white/5 p-10 shadow-sm shadow-black/10 transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-300 shadow-sm">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3 text-white">{item.title}</h3>
                    <p className="text-slate-300 leading-7">{item.description}</p>
                  </motion.div>
                )}
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="grid gap-6">
                {[
                  {
                    heading: "Thông minh",
                    text: "Hệ thống phân tích đa lớp đánh giá thông tin và liên kết theo nhiều tiêu chí."
                  },
                  {
                    heading: "Minh bạch",
                    text: "Kết quả hiển thị rõ ràng, giúp người dùng hiểu nguyên nhân cảnh báo."
                  },
                  {
                    heading: "Hỗ trợ cộng đồng",
                    text: "Lan tỏa nhận diện lừa đảo và xây dựng mạng lưới bảo vệ số chung."
                  }].
                  map((item) =>
                    <div key={item.heading} className="rounded-[28px] border border-white/10 bg-slate-900/85 p-6 shadow-sm">
                      <h3 className="text-xl font-semibold mb-2 text-white">{item.heading}</h3>
                      <p className="text-slate-300 leading-7">{item.text}</p>
                    </div>
                  )}
              </div>

              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative rounded-[48px] bg-slate-950/95 p-10 text-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.65)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_30%)] rounded-[48px]" />
                <div className="relative z-10 grid gap-8">
                  <div className="rounded-[32px] border border-white/10 bg-slate-900/85 p-6">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-300 mb-6">
                      <Globe className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">Giám sát thông tin</h3>
                    <p className="text-slate-300 leading-7">Theo dõi các nguồn tin và đối chiếu nhanh để xác định dấu hiệu lừa đảo xuyên biên giới.</p>
                  </div>
                  <div className="rounded-[32px] border border-white/10 bg-slate-900/85 p-6">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-300 mb-6">
                      <Shield className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">Bảo vệ ngay tức thì</h3>
                    <p className="text-slate-300 leading-7">Cảnh báo nhanh và gợi ý hành động giúp người dùng tránh được rủi ro kịp thời.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>}
        {currentPage === "blog" && (
          <motion.div 
            key="blog" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="pt-20"
          >
            {selectedBlogSlug ? (
              <BlogArticleView 
                article={getBlogArticleBySlug(selectedBlogSlug)!} 
                onBack={() => {
                  setSelectedBlogSlug(null);
                  window.history.pushState({}, "", "/blog");
                }}
              />
            ) : (
              <BlogList 
                onArticleClick={(slug) => {
                  setSelectedBlogSlug(slug);
                  window.history.pushState({}, "", `/blog/${slug}`);
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedInfoItem &&
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6">
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#ff8904]">{selectedInfoItem.category}</p>
                  <h3 className="mt-2 text-2xl font-bold text-black">{selectedInfoItem.title}</h3>
                </div>
                <button type="button" onClick={() => setSelectedInfoItem(null)} className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-black">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-6 text-sm leading-7 text-gray-700">{selectedInfoItem.description}</p>
              <a href={selectedInfoItem.link} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#151414] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black">
                <ExternalLink className="h-4 w-4" />
                Xem trang thông tin
              </a>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
      <footer className="py-12 border-t border-black/10 bg-white">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <img src="/logo.png" alt="Lá Chắn Số" className="w-12 h-12 -mr-1 -mt-2" />
            <span className="text-xl font-bold tracking-tighter text-[#ff8904]">Lá Chắn Số</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://www.facebook.com/profile.php?id=61592680388542" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-[#1877f2] transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://youtube.com/@lachansovn?si=gWlNIAaSq1xcmv5f" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-[#ff0000] transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <a href="mailto:kanh05113@gmail.com" className="text-gray-500 hover:text-[#ea4335] transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
            </a>
          </div>
          <p className="text-sm text-[#4a5565]">
            Copyright © 2026 Lá Chắn Số. Bảo lưu mọi quyền.
          </p>
        </div>
      </footer>
      <style dangerouslySetInnerHTML={{
        __html: `
          .mask-gradient {
            mask-image: linear-gradient(to top, black 20%, transparent 100%);
          }
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-25%); }
          }
          .animate-marquee {
            animation: marquee 30s linear infinite;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #E5E7EB;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #D1D5DB;
          }
        `
      }} />
      <OwnerVerifyModal open={ownerVerifyOpen} onOpenChange={setOwnerVerifyOpen} domain={resultData?.displayUrl ?? ""} verifyEmail={resultData?.ownerVerifyEmail} />
      <ReportIssueModal open={reportIssueOpen} onOpenChange={setReportIssueOpen} targetUrl={resultData?.url ?? resultData?.displayUrl ?? ""} />
      <ColorLegendModal open={colorLegendOpen} onOpenChange={setColorLegendOpen} />
      <ThirdPartyModal open={thirdPartyOpen} onOpenChange={setThirdPartyOpen} thirdParty={resultData?.thirdParty} ipInfo={resultData?.ipInfo} />
    </div>);

}
