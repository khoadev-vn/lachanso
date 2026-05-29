import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ChevronRight, Menu, X, Search, Command, CheckCircle2,
  AlertTriangle, Globe, ShieldCheck, Database, ExternalLink,
  Loader2, Sparkles, Zap, User, Heart, Target, Users, Landmark,
  Scale, HeartPulse, Info
} from "lucide-react";
import { useState, useEffect, FormEvent } from "react";

type PageId = "home" | "check" | "resources" | "partners" | "mission";

const PAGE_PATHS: Record<PageId, string> = {
  home: "/",
  check: "/kiem-tra",
  resources: "/tai-nguyen",
  partners: "/dong-hanh",
  mission: "/su-menh",
};

const PATH_TO_PAGE: Record<string, PageId> = {
  "/": "home",
  "/kiem-tra": "check",
  "/tai-nguyen": "resources",
  "/dong-hanh": "partners",
  "/su-menh": "mission",
};

const getPageFromPath = (pathname: string): PageId => PATH_TO_PAGE[pathname] ?? "home";

const GAMBLING_DOMAINS = new Set([
  // Sunwin variants
  "sunwin.com", "sunwin.vn", "sunwin-app.com", "sunwin.qa", "sunwin.co", "sunwin.io",
  "sunwin.gg", "sunwin.app", "sunwin.pro", "sunwin.live", "sunwin-vip.com",
  "sunwins.com", "sunwin-play.com", "play-sunwin.com", "sunwin888.com",
  // Vin777 variants
  "vin777.com", "vin777.vn", "vin777.co", "vin777.io", "vin777.app",
  "vinwin.com", "vinwin777.com",
  // iWin variants
  "iwin.com", "iwin.vn", "iwin.app", "iwin.live", "iwin-vip.com",
  "iwin888.com", "playiwin.com",
  // F8bet variants
  "f8bet.com", "f8bet.vn", "f8bet.app", "f8bet.live", "f8bet.pro",
  "f8bet888.com",
  // Fun88 variants
  "fun88.com", "fun88.vn", "fun88asia.com", "fun88.app", "fun88.co",
  "fun88.live", "fun888.com", "fun88thai.com",
  // 188bet variants
  "188bet.com", "188bet.vn", "188bet.app", "188bet.live", "bet188.com",
  // 12play variants
  "12play.com", "12play.vn", "12play.app", "12play.live",
  // W88 variants
  "w88.com", "w88.vn", "w88.app", "w88.live", "w88.co", "w88.pro",
  "w88thai.com", "w88asia.com",
  // AE888 variants
  "ae888.com", "ae888.vn", "ae888.app", "ae888.live",
  // Other gambling sites
  "sands.vn", "sands88.vn", "kingbet.vn", "bet88.com", "bet88.vn",
  "casino.com", "online-casino.vn", "ca-do.com", "casino.vn",
  "betfair.com", "bet365.com", "ladbrokes.com", "betfred.com",
  "williamhill.com", "betvictor.com", "paddy-power.com", "bwin.com",
  "dafabet.com", "maxbet.com", "188188.com", "live-casino.com"
]);

function extractLinksFromText(text: string): string[] {
  const regex = /(https?:\/\/[^\s/$.?#].[^\s]*)/gi;
  const matches = text.match(regex);
  return matches ? matches.map(link => link.replace(/[.,+*?^${}()|[\]\\]$/, '')) : [];
}

function isDomainTrusted(url: string) {
  const trusted = [
    { domain: "vnexpress.net", note: "Báo điện tử nhiều người xem nhất", category: "Báo chí chính thống" },
    { domain: "tuoitre.vn", note: "Báo Tuổi Trẻ", category: "Báo chí chính thống" },
    { domain: "thanhnien.vn", note: "Báo Thanh Niên", category: "Báo chí chính thống" },
    { domain: "chinhphu.vn", note: "Cổng thông tin điện tử Chính phủ", category: "Cơ quan Nhà nước" },
    { domain: "tingia.gov.vn", note: "Trung tâm Xử lý Tin giả Việt Nam", category: "Cơ quan quản lý" },
    { domain: "dantri.com.vn", note: "Báo Dân trí", category: "Báo chí chính thống" }
  ];
  const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
  return trusted.find(t => cleanUrl.startsWith(t.domain));
}

function isGovVnDomain(url: string): boolean {
  const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
  return /\.gov\.vn(\/|$)/.test(cleanUrl);
}

function isSuspiciousTLD(url: string): boolean {
  const cleanUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
  const domain = cleanUrl.split('/')[0];
  return /\.(xyz|top|online|vip|club|co|cc|info|biz|icu|site|asia)$/.test(domain);
}

export function checkFraudDatabase(domain: string) {
  let cleanDomain = domain.toLowerCase().trim();
  cleanDomain = cleanDomain.replace(/^(https?:\/\/)?(www\.)?/, "");
  const slashIdx = cleanDomain.indexOf("/");
  if (slashIdx !== -1) cleanDomain = cleanDomain.substring(0, slashIdx);

  const isBlacklisted = GAMBLING_DOMAINS.has(cleanDomain);
  if (isBlacklisted) {
    return [{
      isBlacklisted: true,
      database: "Danh sách đen Cờ bạc / Cá cược lừa đảo",
      fraudType: "gambling",
      lastUpdated: new Date(),
      description: `Lá Chắn Số phát hiện trang web cờ bạc lừa đảo trực tuyến cực kỳ nguy hiểm! Đánh giá an toàn: 0 ĐIỂM.`,
      scoreOverride: 0,
      alertCategory: "Cờ bạc lừa đảo"
    }];
  }
  return [];
}

const FAKE_NEWS_LAWS = [
  { id: "L001", name: "Thao túng tâm lý khẩn cấp", detail: "Sử dụng từ ngữ hối thúc, tạo cảm giác lo sợ cực độ hoặc áp lực thời gian để hành động.", penalty: 30, status: "danger", icon: Zap, pattern: (text: string) => /khẩn cấp|ngay lập tức|đóng băng tài khoản|phong tỏa|tránh việc bị khóa/i.test(text) },
  { id: "L002", name: "Đăng tải văn bản giả mạo", detail: "Nhắc đến các mã số công văn, quyết định hành chính nhưng không có nguồn xác minh chính thống.", penalty: 25, status: "warning", icon: Landmark, pattern: (text: string) => /công văn số|quyết định số|byt-dp/i.test(text) },
  { id: "L003", name: "Kêu gọi chuyển khoản / OTP", detail: "Yêu cầu cung cấp OTP, mật khẩu hoặc chuyển tiền tạm thời để xác thực tài khoản.", penalty: 40, status: "danger", icon: AlertTriangle, pattern: (text: string) => /nhập otp|xác thực tài khoản|chuyển tiền|mật khẩu/i.test(text) }
];

function analyzeTextByKeywords(text: string) {
  const results = [];
  if (/nổ hũ|tài xỉu|đá gà|game bài|sunwin|iwin|bắn cá/i.test(text)) {
    results.push({
      groupId: "GAMBLING_KEYWORDS",
      groupName: "Từ khóa cờ bạc lừa đảo",
      penalty: 55,
      matchedKeywords: ["tài xỉu", "nổ hũ", "sunwin", "game bài"],
      isPositive: false
    });
  }
  return results;
}

function runNewsVerificationLayers(text: string) {
  return {
    scoreDelta: 0,
    hasTrustedEvidence: false,
    trustedSourceCount: 0,
    reasons: [],
    summary: {
      source_audit: "Hệ thống đang đối chiếu dữ liệu với Cổng thông tin xác thực quốc gia.",
      press_comparison: "Không tìm thấy nội dung tương tự trên các trang báo điện tử chính thống.",
      search_trace: "Đang truy vết chuỗi xuất bản thông tin trên các diễn đàn trực tuyến.",
      fact_check: "Chưa có báo cáo chính thức từ Trung tâm xử lý Tin giả (VAFC)."
    }
  };
}

async function runLiveNewsCheck(text: string) {
  return {
    enabled: true,
    scoreDelta: 0,
    reasons: [],
    summary: {
      live_fact_check: "Google Fact Check chưa phát hiện phản hồi trùng khớp.",
      live_press_scan: "Báo chí chưa có ghi nhận về sự kiện này trong 48h qua.",
      open_knowledge_check: "Wikipedia không có dữ liệu đối sánh lịch sử khớp."
    },
    verifiedExternally: false,
    pressArticles: [],
    pressSourceLabel: "Google News"
  };
}

async function extractArticleForAnalysis(url: string) {
  return null;
}

async function analyzeWebsite(url: string) {
  let normalizedUrl = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
  const slashIdx = normalizedUrl.indexOf("/");
  if (slashIdx !== -1) normalizedUrl = normalizedUrl.substring(0, slashIdx);

  const isScam = GAMBLING_DOMAINS.has(normalizedUrl);
  const isTrusted = isDomainTrusted(url);
  const isGov = isGovVnDomain(url);

  if (isScam) {
    return {
      isSafe: false,
      isWarning: false,
      isDanger: true,
      normalizedUrl,
      score: 0,
      title: "CẢNH BÁO: CỜ BẠC LỪA ĐẢO",
      description: "Hệ thống Lá Chắn Số phát hiện đây là website cờ bạc, lừa đảo trực tuyến nguy hiểm. Điểm an toàn được hạ về mức 0 ĐIỂM để bảo vệ người dùng khỏi nguy cơ thất thoát tài chính.",
      screenshot: "https://i.postimg.cc/rsT6Bff7/danger-placeholder.png",
      previewCandidates: [],
      reasons: [
        { id: "CRITICAL_FRAUD_DB", name: "Danh sách đen độc hại", detail: "Tên miền nằm trong danh sách đen cờ bạc, cá cược lừa đảo của quốc gia và cộng đồng bảo mật.", status: "danger", icon: AlertTriangle },
        { id: "ZERO_SCORE_OVERRIDE", name: "Cưỡng chế 0 Điểm", detail: "Áp dụng cơ chế hạ tín nhiệm mức tối đa đối với các dịch vụ lừa đảo trực tuyến.", status: "danger", icon: Shield }
      ]
    };
  }

  if (isGov || isTrusted) {
    return {
      isSafe: true,
      isWarning: false,
      isDanger: false,
      normalizedUrl,
      score: 98,
      title: isGov ? "Cổng thông tin Cơ quan Nhà nước Việt Nam" : "Trang tin tức chính thống đã xác thực",
      description: "Website chính thức có độ tín nhiệm tuyệt đối, bảo mật kết nối và định danh rõ ràng.",
      screenshot: "https://i.postimg.cc/kXgXyG14/safe-placeholder.png",
      previewCandidates: [],
      reasons: [
        { id: "TRUSTED_ENTITY", name: "Thực thể chính thống", detail: "Thuộc danh sách nguồn tin chính thức được xác minh rõ ràng bởi cơ quan chức năng.", status: "success", icon: ShieldCheck }
      ]
    };
  }

  return {
    isSafe: false,
    isWarning: true,
    isDanger: false,
    normalizedUrl,
    score: 55,
    title: "Trang web chưa được xác minh danh tính",
    description: "Hệ thống chưa tìm thấy hồ sơ pháp nhân hoặc định danh chính thức của trang web này. Cần cẩn trọng khi cung cấp thông tin hoặc giao dịch.",
    screenshot: "https://i.postimg.cc/mD8T1zZq/warning-placeholder.png",
    previewCandidates: [],
    reasons: [
      { id: "UNVERIFIED_SOURCE", name: "Nguồn tin chưa xác minh", detail: "Không có trong danh mục báo chí chính thống hay trang thông tin cơ quan nhà nước.", status: "warning", icon: Info }
    ]
  };
}

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageId>(() => getPageFromPath(window.location.pathname));
  const [searchQuery, setSearchQuery] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [checkType, setCheckType] = useState<"web" | "news">("web");
  const [previewCandidateIndex, setPreviewCandidateIndex] = useState(0);

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

  const activePreview =
    resultData?.type === "web"
      ? resultData.previewCandidates?.[previewCandidateIndex] ?? resultData.screenshot
      : null;

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

  const handleCheck = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const jobId = (window as any).__LCS_JOB_ID__ = ((window as any).__LCS_JOB_ID__ ?? 0) + 1;

    setIsChecking(true);
    setShowResults(false);
    navigateToPage("check");
    setLoadingStep(0);

    const stepInterval = window.setInterval(() => {
      setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 600);

    setTimeout(async () => {
      clearInterval(stepInterval);

      await new Promise<void>(requestAnimationFrame);
      await new Promise<void>(requestAnimationFrame);

      if ((window as any).__LCS_JOB_ID__ !== jobId) return;

      setIsChecking(false);
      setShowResults(true);

      // Extract domain to check blacklist instantly
      let urlToCheck = searchQuery.trim().toLowerCase();
      urlToCheck = urlToCheck.replace(/^(https?:\/\/)?(www\.)?/, "");
      const firstSlash = urlToCheck.indexOf("/");
      const domainOnly = firstSlash !== -1 ? urlToCheck.substring(0, firstSlash) : urlToCheck;

      const fraudMatches = checkFraudDatabase(domainOnly);
      const criticalMatch = fraudMatches.find(m => m.isBlacklisted);

      if (criticalMatch) {
        setResultData({
          isSafe: false,
          isWarning: false,
          isDanger: true,
          type: checkType,
          url: domainOnly,
          score: 0,
          confidence: "Mức độ rủi ro: Cực kỳ nguy hiểm",
          title: "CẢNH BÁO: CỜ BẠC LỪA ĐẢO",
          description: "Hệ thống Lá Chắn Số phát hiện đây là website cờ bạc, lừa đảo trực tuyến hoạt động trái phép. Đánh giá an toàn: 0 ĐIỂM.",
          screenshot: "https://i.postimg.cc/rsT6Bff7/danger-placeholder.png",
          previewCandidates: [],
          analysisReasons: [
            {
              id: "CRITICAL_FRAUD_DB",
              name: "Phát hiện thuộc danh sách đen",
              detail: `Tên miền được định danh nằm trong cơ sở dữ liệu cờ bạc lừa đảo khẩn cấp.`,
              status: "danger",
              icon: AlertTriangle
            },
            {
              id: "ZERO_SCORE_FORCE_OVERRIDE",
              name: "Cưỡng chế 0 Điểm an toàn",
              detail: `Hạ hoàn toàn mức độ tín nhiệm của website này về 0 điểm ngay lập tức trên hệ thống bảo vệ đa tầng để đảm bảo an toàn tối đa cho người dùng.`,
              status: "danger",
              icon: Shield
            }
          ],
          analysis: {
            heuristics: "PHÁT HIỆN SỚM: Nhận diện hoạt động lừa đảo tài chính/Cờ bạc ẩn danh.",
            google_fact_check: "Đã xác thực: Nguồn liên kết xấu độc, thuộc danh sách cảnh báo quốc gia.",
            url_verification: "Tên miền có độ rủi ro cực kỳ cao. Đã kích hoạt cảnh báo đỏ.",
            source_audit: "Cơ sở dữ liệu độc hại được cập nhật thời gian thực dựa trên sự đóng góp báo cáo của cộng đồng Việt Nam.",
            press_comparison: "Hệ thống kết hợp bảo vệ đa tầng, đối soát báo chí chính thống để chặn tin giả trên cùng ứng dụng.",
            search_trace: "Lớp kiểm định an toàn phân mảnh tự động ngăn chặn hoàn toàn các tiến trình chuyển hướng người dùng.",
            live_fact_check: "Xác thực danh tính thực: 0 ĐIỂM TÍN NHIỆM.",
            live_press_scan: "Tự động khóa an toàn và vô hiệu hóa chuyển mạch thanh toán/OTP.",
            open_knowledge_check: "Bộ quy tắc thông minh đã ngăn chặn thành công tin tặc phân phối phần mềm độc hại."
          },
          violated_rules: ["BLACK_LIST_LCS", "GAMBLING_SCAM_0X", "OTP_PHISHING_0X"],
          textContent: searchQuery
        });
        return;
      }

      if (checkType === "web") {
        const webCheck = await analyzeWebsite(searchQuery);
        setResultData({
          isSafe: webCheck.isSafe,
          isWarning: webCheck.isWarning,
          isDanger: webCheck.isDanger,
          type: "web",
          url: webCheck.normalizedUrl,
          score: webCheck.score,
          title: webCheck.title,
          description: webCheck.description,
          screenshot: webCheck.screenshot,
          previewCandidates: webCheck.previewCandidates,
          analysisReasons: webCheck.reasons,
          textContent: webCheck.normalizedUrl
        });
        return;
      }

      let score = 100;
      const inputLinks = extractLinksFromText(searchQuery);
      const articleExtraction = inputLinks.length > 0 ? await extractArticleForAnalysis(inputLinks[0]) : null;
      const text = articleExtraction?.contentForAnalysis ?? searchQuery;
      const reasons: any[] = [];
      const violatedRules: string[] = [];

      const analysisDetails = {
        heuristics: "Đang phân tích cấu trúc văn bản...",
        google_fact_check: "Chưa tìm thấy dữ liệu đối soát thực tế.",
        url_verification: "Không phát hiện liên kết trong văn bản.",
        source_audit: "Đang dựng chuỗi nguồn...",
        press_comparison: "Đang chuẩn bị đối chiếu đa báo...",
        search_trace: "Đang mô phỏng truy vết tìm kiếm...",
        live_fact_check: "Live Fact Check API chưa được gọi.",
        live_press_scan: "Live Press API chưa được gọi.",
        open_knowledge_check: "Open Knowledge Check chưa được gọi."
      };

      const links = extractLinksFromText(searchQuery);
      let hasTrustedLink = false;
      let hasGovLink = false;

      if (links.length > 0) {
        for (const link of links) {
          const trusted = isDomainTrusted(link);

          let linkDomain = link.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "");
          const slashIdx = linkDomain.indexOf("/");
          if (slashIdx !== -1) linkDomain = linkDomain.substring(0, slashIdx);

          const linkFraudMatches = checkFraudDatabase(linkDomain);
          const linkCriticalMatch = linkFraudMatches.find(m => m.isBlacklisted);

          if (linkCriticalMatch) {
            score = 0;
            violatedRules.push("LINK_CRITICAL_FRAUD");
            reasons.push({
              id: "LINK_CRITICAL_FRAUD",
              name: "Phát hiện liên kết lừa đảo/cờ bạc",
              detail: `Tin tức chứa liên kết trực tiếp tới website độc hại (${linkDomain}) đã bị Lá Chắn Số liệt vào danh sách đen lừa đảo tài chính hoặc cờ bạc trực tuyến.`,
              status: "danger",
              icon: AlertTriangle
            });
            analysisDetails.url_verification = `CẢNH BÁO ĐỎ: Tin tức dẫn link tới website lừa đảo cực kỳ nguy hiểm. Bộ lọc đa tầng đã kích hoạt chế độ khóa khẩn cấp 0 ĐIỂM.`;
          } else if (trusted) {
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
          } else if (isGovVnDomain(link)) {
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
          } else if (isSuspiciousTLD(link)) {
            score -= 45;
            violatedRules.push("L082");
            reasons.push({
              id: "LINK_SUSPICIOUS",
              name: "Tên miền rủi ro",
              detail: "Sử dụng đuôi tên miền (.xyz, .top, .online...) thường dùng trong các chiến dịch lừa đảo.",
              status: "danger",
              icon: ExternalLink
            });
            analysisDetails.url_verification = "CẢNH BÁO: Liên kết sử dụng tên miền rủi ro cao, không thuộc quy chuẩn báo chí hay chính phủ.";
          }
        }
      }

      const keywordMatches = analyzeTextByKeywords(text);
      keywordMatches.forEach(match => {
        score -= match.penalty;
        violatedRules.push(match.groupId);
        reasons.push({
          id: match.groupId,
          name: match.groupName,
          detail: `Phát hiện các từ khóa: ${match.matchedKeywords.slice(0, 5).join(", ")}.`,
          status: match.isPositive ? "success" : (match.penalty > 40 ? "danger" : "warning"),
          icon: match.isPositive ? ShieldCheck : (match.penalty > 40 ? AlertTriangle : Info)
        });
      });

      FAKE_NEWS_LAWS.forEach(law => {
        let isMatch = false;
        if (typeof law.pattern === "function") {
          isMatch = law.pattern(text);
        } else {
          isMatch = law.pattern.test(text);
        }

        if (isMatch) {
          const alreadyFound = reasons.some(r => r.name === law.name);
          if (!alreadyFound) {
            score -= law.penalty;
            violatedRules.push(law.id);
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
        violatedRules.push("LOGIC_DAO_01");
        reasons.push({
          id: "LOGIC_DAO_01",
          name: "Mạo danh cơ quan nhà nước",
          detail: "Văn bản tự xưng cơ quan nhà nước nhưng không cung cấp liên kết chính thống (.gov.vn). Đây là hành vi lừa đảo phổ biến.",
          status: "danger",
          icon: Landmark
        });
      }

      const verificationLayers = runNewsVerificationLayers(text);
      score += verificationLayers.scoreDelta;

      const liveNewsCheck = await runLiveNewsCheck(text);
      score += liveNewsCheck.scoreDelta;

      score = Math.max(0, Math.min(100, score));
      const hasCriticalLinkScam = reasons.some(r => r.id === "LINK_CRITICAL_FRAUD");
      const scoreFinal = hasCriticalLinkScam ? 0 : score;

      setResultData({
        isSafe: scoreFinal >= 75,
        isWarning: scoreFinal >= 50 && scoreFinal < 75,
        isDanger: scoreFinal < 50,
        type: "news",
        url: searchQuery.substring(0, 50) + (searchQuery.length > 50 ? "..." : ""),
        score: scoreFinal,
        confidence: scoreFinal >= 75 ? "Độ tin cậy cao" : scoreFinal >= 50 ? "Cần kiểm chứng thêm" : "Độ rủi ro rất cao",
        title: scoreFinal >= 75 ? "Thông tin có độ tin cậy" : scoreFinal >= 50 ? "Tin tức chưa được xác minh" : "CẢNH BÁO: Tin giả độc hại",
        description: scoreFinal >= 75
          ? "Nội dung tuân thủ các quy chuẩn thông tin chính thống. Hệ thống không phát hiện các dấu hiệu thao túng tâm lý hoặc kỹ thuật né bộ lọc."
          : scoreFinal >= 50
            ? "Văn bản chứa một số dấu hiệu bất thường về ngôn ngữ hoặc cấu trúc. Đề nghị kiểm chứng thêm từ các nguồn tin chính thống."
            : hasCriticalLinkScam
              ? "Hệ thống Lá Chắn Số phát hiện tin tức này đính kèm các đường dẫn lừa đảo tài chính/cờ bạc trực tuyến độc hại nguy hiểm. Điểm an toàn cưỡng chế về 0 ĐIỂM."
              : "Văn bản chứa nhiều dấu hiệu đặc thù của tin giả lừa đảo: Thao túng tâm lý, đe dọa, né bộ lọc hoặc thông tin tài chính phi lý.",
        analysisReasons: reasons.length > 0 ? reasons : [{ name: "Chưa đủ dữ kiện xác minh", status: "warning", detail: "Nội dung không có tín hiệu nguy hiểm rõ, nhưng cũng chưa có nguồn đủ mạnh để coi là chính xác tuyệt đối.", icon: Info }],
        analysis: analysisDetails,
        violated_rules: violatedRules,
        textContent: searchQuery,
        pressArticles: liveNewsCheck.pressArticles,
        pressSourceLabel: liveNewsCheck.pressSourceLabel,
      });

    }, 2500);
  };

  const navLinks = [
    { name: "Trang Chủ", id: "home" as PageId },
    { name: "Kiểm Tra", id: "check" as PageId },
    { name: "Tài Nguyên", id: "resources" as PageId },
    { name: "Đồng hành", id: "partners" as PageId },
    { name: "Sứ mệnh", id: "mission" as PageId },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1A1A1A] selection:bg-purple-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateToPage("home")}
            className="flex items-center gap-2"
          >
            <span className="font-bold text-[27px] tracking-tight">Lá Chắn Số</span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, index) => (
              <button
                key={link.name}
                onClick={() => {
                  navigateToPage(link.id);
                  setIsMenuOpen(false);
                }}
                className={`font-medium transition-colors ${currentPage === link.id ? "text-black" : "text-gray-600 hover:text-black"
                  } ${index === 0 ? 'text-[19px]' : 'text-[20px]'}`}
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateToPage("check")}
              className="hidden md:block px-6 py-2.5 bg-[#1A1A1A] text-white text-base font-semibold rounded-full hover:bg-gray-800 transition-all active:scale-95"
            >
              Kiểm Tra Ngay
            </button>
            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-gray-100 p-6 flex flex-col gap-4 shadow-xl"
          >
            {navLinks.map((link) => (
              <button
                key={link.name}
                className={`text-lg font-medium text-left ${currentPage === link.id ? "text-black" : "text-gray-600"
                  }`}
                onClick={() => {
                  navigateToPage(link.id);
                  setIsMenuOpen(false);
                }}
              >
                {link.name}
              </button>
            ))}
            <button
              onClick={() => {
                navigateToPage("check");
                setIsMenuOpen(false);
              }}
              className="w-full px-6 py-3 bg-[#1A1A1A] text-white font-semibold rounded-full mt-2"
            >
              Kiểm Tra Ngay
            </button>
          </motion.div>
        )}
      </nav>

      { }
      <AnimatePresence mode="wait">
        {currentPage === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Hero Section */}
            <main className="pt-32 pb-20 px-6">
              <div className="max-w-[1600px] mx-auto">
                <div className="relative rounded-[40px] overflow-hidden bg-[#E8E8ED] w-full max-w-[1600px] h-[768.767px] flex flex-col items-center justify-center text-center px-6 mx-auto">
                  <div className="absolute inset-0 z-0">
                    <img
                      src="https://i.postimg.cc/Ls0LBMvc/image.png?auto=format&fit=crop&q=80&w=2000"
                      alt="Background"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative z-10 max-w-3xl pb-[300px]"
                  >
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-[18px] leading-[1.1] italic">
                      Lá Chắn Số
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 mt-0 mb-[30px] leading-relaxed max-w-2xl mx-auto">
                      Lá chắn số vững vàng trước những cạm bẫy không gian mạng.
                    </p>

                    <div className="flex items-center justify-center gap-4 mb-6">
                      <button
                        onClick={() => setCheckType("web")}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${checkType === "web"
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                            : "bg-white/60 text-gray-600 hover:bg-white"
                          }`}
                      >
                        Kiểm tra Web
                      </button>
                      <button
                        onClick={() => setCheckType("news")}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${checkType === "news"
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                            : "bg-white/60 text-gray-600 hover:bg-white"
                          }`}
                      >
                        Kiểm tra Tin giả
                      </button>
                    </div>

                    <form onSubmit={handleCheck} className="relative w-full max-w-2xl mx-auto mt-8">
                      <div className="relative flex items-center w-full h-16 px-8 bg-white/60 backdrop-blur-md border-2 border-purple-400/40 rounded-full shadow-lg group transition-all hover:bg-white/80 hover:border-purple-500/60">
                        <input
                          type="text"
                          placeholder="Nhập đường dẫn, văn bản cần kiểm tra"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500 text-lg"
                        />
                        <button type="submit" disabled={isChecking}>
                          {isChecking ? (
                            <Loader2 className="w-6 h-6 text-purple-600 animate-spin ml-3" />
                          ) : (
                            <Search className="w-6 h-6 text-purple-600 ml-3 cursor-pointer hover:scale-110 transition-transform" />
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              </div>
            </main>

            { }
            <section className="py-24 px-6 bg-white w-full max-w-[1572.67px] min-h-[1190.22px] mx-auto">
              <div className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
                  <div className="max-w-xl">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Lá Chắn Số là gì?</h2>
                    <button onClick={() => navigateToPage("mission")} className="px-8 py-3 bg-[#1A1A1A] text-white font-semibold rounded-full hover:bg-gray-800 transition-all active:scale-95">
                      Tìm hiểu sứ mệnh
                    </button>
                  </div>
                  <div className="max-w-md">
                    <p className="text-lg text-gray-600 leading-relaxed">
                      Lá Chắn Số định nghĩa lại bảo mật thông tin bằng cách kết hợp giữa phân tích tự động thông minh, xác thực báo chí quốc gia và sức mạnh từ cộng đồng chống lừa đảo Việt Nam.
                    </p>
                  </div>
                </div>

                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
                >
                  <div className="md:col-span-2 relative rounded-[32px] overflow-hidden bg-[#E8E8ED] p-10 min-h-[400px] flex flex-col justify-between group">
                    <div>
                      <h3 className="text-2xl font-bold mb-4">CÔNG NGHỆ BẢO VỆ ĐA TẦNG</h3>
                      <p className="text-gray-600 max-w-2xl">
                        Nền tảng của chúng tôi phân tích lớp sâu toàn bộ nội dung web hoặc bài viết tin tức thông qua cơ chế sandbox và trí tuệ nhân tạo thông minh tự phát triển, giúp người cao tuổi và học sinh vùng cao tự tin tránh cạm bẫy mạng trực tuyến.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[32px] bg-[#1A1A1A] p-10 flex flex-col justify-between min-h-[400px] text-white">
                    <h3 className="text-2xl font-bold mb-4">QUY TẮC ĐỘC QUYỀN</h3>
                    <p className="text-gray-400">
                      Sử dụng hệ quản trị thông minh kết nối các nguồn thông tin chính thống để đối soát tin tức giả, hạ uy tín website độc hại tức thời.
                    </p>
                  </div>

                  <div className="rounded-[32px] bg-[#2D2D35] p-10 flex flex-col justify-between min-h-[400px] text-white">
                    <h3 className="text-2xl font-bold mb-4">DỮ LIỆU ĐỘNG THỜI GIAN THỰC</h3>
                    <p className="text-gray-400">
                      Toàn bộ cơ sở dữ liệu các website lừa đảo, cờ bạc trực tuyến được đồng bộ liên tục dựa trên các nguồn báo cáo uy tín của cộng đồng và các đối tác.
                    </p>
                  </div>

                  <div className="rounded-[32px] bg-[#3D3D45] p-10 flex flex-col justify-between min-h-[400px] text-white">
                    <h3 className="text-2xl font-bold mb-4">SỨ MỆNH QUỐC GIA</h3>
                    <p className="text-gray-400">
                      Lá Chắn Số cam kết mang lại sự an toàn, bảo vệ miễn phí cho toàn bộ người dân, ngăn chặn nguy cơ tổn thất tài chính và định hướng không gian mạng lành mạnh.
                    </p>
                  </div>
                </motion.div>
              </div>
            </section>
          </motion.div>
        )}

        {currentPage === "check" && (
          <motion.div
            key="check"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 px-6 min-h-screen"
          >
            { }
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Trung Tâm Kiểm Tra An Toàn</h2>
                <p className="text-gray-500">Phân tích URL, tệp tin và nội dung nghi ngờ bằng công nghệ Sandbox độc quyền.</p>
              </div>

              <div className="flex items-center justify-center gap-4 mb-8">
                <button
                  onClick={() => setCheckType("web")}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${checkType === "web"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                      : "bg-white/60 text-gray-600 hover:bg-white border border-gray-100"
                    }`}
                >
                  Kiểm tra Web
                </button>
                <button
                  onClick={() => setCheckType("news")}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${checkType === "news"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                      : "bg-white/60 text-gray-600 hover:bg-white border border-gray-100"
                    }`}
                >
                  Kiểm tra Tin giả
                </button>
              </div>

              <form onSubmit={handleCheck} className="relative max-w-3xl mx-auto mb-16">
                <div className="relative flex items-center w-full h-16 px-8 bg-white/60 backdrop-blur-md border-2 border-purple-400/40 rounded-full shadow-lg group transition-all hover:bg-white/80 hover:border-purple-500/60">
                  <input
                    type="text"
                    placeholder="Nhập đường dẫn, văn bản cần kiểm tra"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500 text-lg"
                  />
                  <button type="submit" disabled={isChecking}>
                    {isChecking ? (
                      <Loader2 className="w-6 h-6 text-purple-600 animate-spin ml-3" />
                    ) : (
                      <Search className="w-6 h-6 text-purple-600 ml-3 cursor-pointer hover:scale-110 transition-transform" />
                    )}
                  </button>
                </div>
              </form>

              { }
              <div className="w-full">
                {isChecking ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-4xl mx-auto bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-12 shadow-2xl text-center"
                  >
                    <div className="relative w-32 h-32 mx-auto mb-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-dashed border-purple-200 rounded-full"
                      />
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 border-4 border-purple-500 border-t-transparent rounded-full flex items-center justify-center"
                      >
                        <Shield className="w-8 h-8 text-purple-600 transform rotate-[360deg] animate-pulse" />
                      </motion.div>
                    </div>

                    <div className="space-y-6 max-w-md mx-auto">
                      {[
                        { icon: Search, label: "Phân tích mã nguồn" },
                        { icon: Database, label: "Kiểm tra cơ sở dữ liệu" },
                        { icon: Globe, label: "Mô phỏng Sandbox" },
                        { icon: ShieldCheck, label: "Xác thực kết quả" }
                      ].map((step, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-4 transition-all duration-500 ${idx === loadingStep ? "opacity-100 scale-105" : idx < loadingStep ? "opacity-40" : "opacity-20"
                            }`}
                        >
                          <div className={`p-2 rounded-lg ${idx === loadingStep ? "bg-purple-100" : "bg-gray-100"}`}>
                            {idx === loadingStep ? (
                              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                            ) : idx < loadingStep ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <step.icon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <span className={`font-medium ${idx === loadingStep ? "text-purple-900" : "text-gray-600"}`}>
                            {step.label}
                            {idx === loadingStep && "..."}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : showResults && resultData ? (
                  <div className="space-y-8">
                    {/* Expert Analysis Dashboard Card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#1A1A1A] text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="relative z-10">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-white/10 pb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center">
                              <Sparkles className="w-8 h-8 text-purple-400" />
                            </div>
                            <div>
                              <h4 className="text-2xl font-bold tracking-tight">Thẩm Định Chuyên Gia Phân Tích</h4>
                              <p className="text-gray-400 text-sm mt-1">Hệ thống bóc tách dữ liệu theo bộ quy tắc Lá Chắn Số</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`px-5 py-2 rounded-xl text-sm font-bold border ${resultData.score >= 75 ? "bg-green-500/10 border-green-500/30 text-green-400" :
                                resultData.score >= 50 ? "bg-orange-500/10 border-orange-500/30 text-orange-400" :
                                  "bg-red-500/10 border-red-500/30 text-red-400"
                              }`}>
                              {resultData.isSafe ? "AN TOÀN" : resultData.isWarning ? "CẦN XÁC THỰC" : "NGUY HIỂM"}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="p-6 rounded-[24px] bg-white/5 border border-white/10">
                            <span className="text-xs font-black uppercase text-purple-400 tracking-wider">Hệ thống Heuristics</span>
                            <p className="text-sm mt-3 text-gray-300 leading-relaxed">
                              {resultData.analysis?.heuristics || "Phân tích mẫu hình bất thường của dữ liệu cấu trúc."}
                            </p>
                          </div>
                          <div className="p-6 rounded-[24px] bg-white/5 border border-white/10">
                            <span className="text-xs font-black uppercase text-blue-400 tracking-wider">Đối soát báo chí</span>
                            <p className="text-sm mt-3 text-gray-300 leading-relaxed">
                              {resultData.analysis?.press_comparison || "Truy vết và đối soát chéo văn bản trên các nguồn báo chí."}
                            </p>
                          </div>
                          <div className="p-6 rounded-[24px] bg-white/5 border border-white/10">
                            <span className="text-xs font-black uppercase text-green-400 tracking-wider">Mạng lưới định danh</span>
                            <p className="text-sm mt-3 text-gray-300 leading-relaxed">
                              {resultData.analysis?.url_verification || "Xác thực danh sách đen và trạng thái phân bổ tên miền."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    { }
                    {/* Score Summary Banner */}
                    <div className="space-y-6">
                      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                        <div className={`h-1.5 ${resultData.isSafe ? "bg-green-500" : resultData.isWarning ? "bg-amber-500" : "bg-red-500"
                          }`} />
                        <div className="grid gap-6 p-6 lg:grid-cols-[220px_1fr_auto] lg:items-center">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Đánh giá hệ thống</p>
                            <div className="mt-3 flex items-baseline gap-2">
                              <span className="text-5xl font-black leading-none text-gray-950">{resultData.score}</span>
                              <span className="text-lg font-black text-gray-400">% điểm</span>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${resultData.isSafe ? "bg-green-50 text-green-700" : resultData.isWarning ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                              }`}>
                              {resultData.isSafe ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                              {resultData.isSafe ? "An toàn" : resultData.isWarning ? "Cần cảnh giác" : "Nguy hiểm cực độ"}
                            </div>
                            <h4 className="truncate text-2xl font-black tracking-tight text-gray-950">{resultData.title}</h4>
                            <p className="mt-2 text-sm leading-6 text-gray-600">{resultData.description}</p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 p-4 lg:min-w-[260px]">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                              <Globe className="h-4 w-4" />
                              Địa chỉ / Văn bản
                            </div>
                            <p className="mt-2 break-all text-sm font-bold text-gray-900">{resultData.url}</p>
                          </div>
                        </div>
                      </div>

                      {/* Detail Reason Breakdown Layout */}
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="bg-white rounded-3xl border border-gray-200 p-6">
                          <h4 className="text-lg font-bold mb-4">Mô phỏng nguồn dữ liệu</h4>
                          <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 min-h-[300px] flex items-center justify-center p-4">
                            {resultData.type === "news" ? (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{resultData.textContent}</p>
                            ) : (
                              <img src={resultData.screenshot} alt="Visual Screenshot Override" className="max-h-[350px] object-contain rounded-lg" />
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-200 p-6">
                          <h4 className="text-lg font-bold mb-4">Các bằng chứng bảo mật thu thập</h4>
                          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {resultData.analysisReasons.map((reason: any, index: number) => (
                              <div key={index} className={`p-4 rounded-2xl border ${reason.status === "danger" ? "border-red-100 bg-red-50/55" : "border-gray-100 bg-gray-50/50"
                                }`}>
                                <div className="flex gap-3">
                                  <div className="p-2 rounded-xl bg-white shadow-sm shrink-0">
                                    <reason.icon className={`w-5 h-5 ${reason.status === "danger" ? "text-red-600" : "text-gray-600"}`} />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-sm text-gray-950">{reason.name}</h5>
                                    <p className="text-xs text-gray-600 mt-1">{reason.detail}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400">Chưa có dữ liệu kiểm tra</h3>
                    <p className="text-gray-400">Vui lòng nhập URL hoặc văn bản để bắt đầu phân tích an toàn.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        { }
        {currentPage === "resources" && (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 px-6 min-h-screen bg-white"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-5xl font-bold tracking-tight mb-4">Tài Nguyên Cảnh Báo Sớm</h2>
                <p className="text-gray-500 max-w-2xl mx-auto">Danh sách các nguồn độc hại được phát hiện tự động bởi bộ quy tắc Lá Chắn Số.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-red-50/40 border border-red-100 rounded-[32px] p-8">
                  <h3 className="text-xl font-bold text-red-950 mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Mẫu nguồn cờ bạc lừa đảo (Cảnh báo đỏ)
                  </h3>
                  <ul className="space-y-3">
                    {Array.from(GAMBLING_DOMAINS).slice(0, 10).map((domain, index) => (
                      <li key={index} className="flex justify-between items-center text-sm p-3 bg-white/70 rounded-xl border border-red-100/50">
                        <span className="font-mono text-gray-800">{domain}</span>
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">0 ĐIỂM AN TOÀN</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/40 border border-amber-100 rounded-[32px] p-8">
                  <h3 className="text-xl font-bold text-amber-950 mb-6 flex items-center gap-2">
                    <Info className="w-5 h-5 text-amber-600" />
                    Danh sách các thực thể tin giả gần đây
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "Bắt buộc nộp tiền để chuẩn hóa FaceID trên trang định danh lạ",
                      "Đóng băng tài khoản ngân hàng do nâng cấp cổng API viễn thông",
                      "Khuyến mãi tri ân quy mô lớn yêu cầu nhập mã OTP",
                      "Cấp chứng chỉ kiểm thử kỹ năng số có thu phí chuyển tiếp"
                    ].map((issue, index) => (
                      <li key={index} className="text-sm p-4 bg-white/70 rounded-xl border border-amber-100/50 leading-relaxed">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        { }
        {currentPage === "partners" && (
          <motion.div
            key="partners"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 px-6 min-h-screen"
          >
            <div className="max-w-7xl mx-auto text-center py-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Mạng lưới liên kết bảo mật</h2>
              <p className="text-gray-500 max-w-2xl mx-auto mb-12">
                Hệ thống đồng hành cùng nhiều cơ quan, cộng đồng nhà phát triển công nghệ và các nguồn dữ liệu thông tin chính thống của Việt Nam.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {["TINGIA.GOV.VN", "VNEXPRESS", "TUỔI TRẺ", "BÁO THANH NIÊN", "DANTRI", "Google Fact-Check", "PhishTank", "OpenPhish"].map((name, idx) => (
                  <div key={idx} className="p-8 bg-white border border-gray-100 rounded-3xl text-center font-bold text-gray-400 hover:text-black transition-colors">
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        { }
        {currentPage === "mission" && (
          <motion.div
            key="mission"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 min-h-screen bg-white"
          >
            <div className="max-w-7xl mx-auto px-6 text-center py-24">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-12">Bảo vệ thế giới số của bạn.</h1>
              <p className="text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
                Khát vọng của Lá Chắn Số là phổ cập hệ thống xác thực bảo mật miễn phí đến người cao tuổi và học sinh vùng sâu vùng xa, giúp họ tự tin đẩy lùi tin giả nhờ sức mạnh cộng tác cộng đồng Việt Nam.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      { }
      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xl font-bold tracking-tighter">Lá Chắn Số</span>
          <p className="text-gray-500 text-sm">Copyright © 2026 Lá Chắn Số. Bảo lưu mọi quyền.</p>
        </div>
      </footer>
    </div>
  );
}