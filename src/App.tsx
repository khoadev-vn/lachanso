import { motion, AnimatePresence } from "motion/react";
import { Shield, ChevronRight, Menu, X, Search, Command, CheckCircle2, AlertTriangle, Globe, ShieldCheck, Database, ExternalLink, Loader2, Sparkles, Zap, User, Heart, Target, Users, Landmark, Scale, HeartPulse, Info } from "lucide-react";
import { useState, useEffect, FormEvent } from "react";
import { extractArticleForAnalysis } from "./constants/articleExtraction";
import { FAKE_NEWS_LAWS } from "./constants/fakeNewsLaws";
import { analyzeTextByKeywords } from "./constants/fakeNewsKeywords";
import { runLiveNewsCheck } from "./constants/liveNewsCheck";
import { runNewsVerificationLayers } from "./constants/newsVerification";
import { isDomainTrusted, isGovVnDomain, isSuspiciousTLD, extractLinksFromText } from "./constants/trustedDomains";
import { analyzeWebsite } from "./constants/webVerification";

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

function isGamblingDomainInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  let host = trimmed.toLowerCase().replace(/^www\./, "");

  try {
    host = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    host = host.split(/[/?#\s]/)[0];
  }

  return Array.from(GAMBLING_DOMAINS).some((domain) => host === domain || host.endsWith(`.${domain}`));
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

    if (isGamblingDomainInput(searchQuery)) {
      setIsChecking(false);
      setLoadingStep(0);
      setShowResults(true);
      navigateToPage("check");
      setResultData({
        isSafe: false,
        isWarning: false,
        isDanger: true,
        type: "web",
        url: searchQuery.trim(),
        score: 0,
        title: "CẢNH BÁO: CỜ BẠC LỪA ĐẢO",
        description: "Hệ thống phát hiện đây là tên miền thuộc danh sách cờ bạc lừa đảo. Điểm đánh giá được đặt về 0 để tránh nhầm lẫn với nội dung an toàn.",
        screenshot: "https://images.search.yahoo.com/search/images;_ylt=AwrKCZZT2hlqMQIASKiJzbkF;_ylu=Y29sbwNzZzMEcG9zAzIyBHZ0aWQDBHNlYwNzcg--?fr=mcafee&p=c%E1%BA%A3nh+b%C3%A1o&imgurl=https%3A%2F%2Fpng.pngtree.com%2Fpng-clipart%2F20220909%2Foriginal%2Fpngtree-traffic-warning-3d-warning-png-image_8521088.png",
        previewCandidates: [],
        analysisReasons: [
          {
            id: "GAMBLING_SCAM",
            name: "Website cờ bạc, cá cược lừa đảo",
            detail: "Tên miền nằm trong danh sách đen cờ bạc lừa đảo của Lá Chắn Số.",
            status: "danger",
            icon: AlertTriangle
          }
        ],
        textContent: searchQuery.trim()
      });
      return;
    }

    // Guard chống chồng job
    const jobId = (window as any).__LCS_JOB_ID__ = ((window as any).__LCS_JOB_ID__ ?? 0) + 1;

    setIsChecking(true);
    setShowResults(false);
    navigateToPage("check");
    setLoadingStep(0);

    // Simulate steps
    const stepInterval = window.setInterval(() => {
      setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 600);

    // Simulate check process
    setTimeout(async () => {
      clearInterval(stepInterval);

      // Yield để trình duyệt kịp paint loading
      await new Promise<void>(requestAnimationFrame);
      await new Promise<void>(requestAnimationFrame);

      // Nếu job cũ (bấm lại), bỏ qua
      if ((window as any).__LCS_JOB_ID__ !== jobId) return;

      setIsChecking(false);
      setShowResults(true);

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

      // --- NEWS CHECK LOGIC (Upgraded) ---
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

      // 1. Link Analysis Layer
      const links = extractLinksFromText(searchQuery);
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
        links.forEach(link => {
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
          } else {
            // General link check
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

      // 2. Keyword & Mood Analysis Layer
      const keywordMatches = analyzeTextByKeywords(text);
      keywordMatches.forEach(match => {
        score -= match.penalty;
        violatedRules.push(match.groupId);
        reasons.push({
          id: match.groupId,
          name: match.groupName,
          detail: `Phát hiện các từ khóa: ${match.matchedKeywords.slice(0, 5).join(", ")}${match.matchedKeywords.length > 5 ? "..." : ""}. ${match.isPositive ? "Tín hiệu tích cực." : "Dấu hiệu nghi vấn cao."}`,
          status: match.isPositive ? "success" : (match.penalty > 40 ? "danger" : "warning"),
          icon: match.isPositive ? ShieldCheck : (match.penalty > 40 ? AlertTriangle : Info)
        });
      });

      // 3. Structural & Legal Analysis Layer (Existing Laws)
      FAKE_NEWS_LAWS.forEach(law => {
        const skipIds = ["L161", "L176", "L180"];
        if (skipIds.includes(law.id)) return;

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

      // 4. Advanced Correlation & Inverse Logic (Logic Đảo)
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
        analysisDetails.google_fact_check = "MÂU THUẪN: Không tìm thấy bất kỳ thông báo tương tự trên các trang tin chính thống (mps.gov.vn, chinhphu.vn).";
      } else if (mentionsAuthority && (hasGovLink || hasTrustedLink)) {
        analysisDetails.google_fact_check = "KHỚP: Nội dung có tham chiếu tới các địa chỉ tin cậy của cơ quan chức năng.";
      } else {
        analysisDetails.google_fact_check = "KHÔNG TÌM THẤY: Tin tức không xuất hiện trên các trang báo lớn trong 48h qua.";
      }

      const hasPanic = reasons.some(r => r.id === "KG_PANIC" || r.id === "L042");
      const hasFinancial = reasons.some(r => r.id === "KG_FINANCIAL" || r.id === "L081");

      if (mentionsAuthority && (hasPanic || hasFinancial)) {
        score -= 25;
        violatedRules.push("CORR_01");
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
        analysisDetails.google_fact_check = verificationLayers.summary.fact_check;
      } else if (verificationLayers.summary.fact_check) {
        if (analysisDetails.google_fact_check === "KHÔNG TÌM THẤY: Tin tức không xuất hiện trên các trang báo lớn trong 48h qua.") {
          analysisDetails.google_fact_check = `KHÔNG TÌM THẤY: Tin tức không xuất hiện trên các trang báo lớn trong 48h qua. ${verificationLayers.summary.fact_check}`;
        } else {
          analysisDetails.google_fact_check = `${analysisDetails.google_fact_check} ${verificationLayers.summary.fact_check}`;
        }
      }

      verificationLayers.reasons.forEach((reason) => {
        if (!reasons.some((item) => item.id === reason.id)) {
          reasons.push(reason);
        }
        if (!violatedRules.includes(reason.id) && reason.status !== "success") {
          violatedRules.push(reason.id);
        }
      });

      const liveNewsCheck = await runLiveNewsCheck(text);
      score += liveNewsCheck.scoreDelta;
      analysisDetails.live_fact_check = liveNewsCheck.summary.live_fact_check;
      analysisDetails.live_press_scan = liveNewsCheck.summary.live_press_scan;
      analysisDetails.open_knowledge_check = liveNewsCheck.summary.open_knowledge_check;

      if (liveNewsCheck.summary.headline_verification) {
        analysisDetails["headline_verification"] = liveNewsCheck.summary.headline_verification;
      }

      liveNewsCheck.reasons.forEach((reason) => {
        if (!reasons.some((item) => item.id === reason.id)) {
          reasons.push(reason);
        }
        if (!violatedRules.includes(reason.id) && reason.status !== "success") {
          violatedRules.push(reason.id);
        }
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
      ]);
      const hasBlockingMismatch = reasons.some((item) => blockingMismatchIds.has(item.id) || (item.status === "danger" && /MISMATCH|SAI|KNOWN|WIKIPEDIA/i.test(item.id || "")));

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
      } else if (hasBlockingMismatch) {
        score = Math.min(score, 42);
      } else if (!verificationLayers.hasTrustedEvidence && reasons.some((item) => item.status !== "success")) {
        score = Math.min(score, 69);
      }

      if (articleExtraction && score < 75 && liveNewsCheck.enabled) {
        score = Math.max(score, 58);
      }

      analysisDetails.heuristics = `Phát hiện ${violatedRules.filter(id => id.startsWith('L') || id.startsWith('KG')).length} mẫu hình tin giả phổ biến và ${verificationLayers.trustedSourceCount} đầu mối nguồn có thể truy vết. Cấu trúc văn bản có dấu hiệu ${score < 50 ? 'bất thường nghiêm trọng' : 'cần lưu ý'}.`;

      // Final score cap
      score = Math.max(0, Math.min(100, score));

      setResultData({
        isSafe: score >= 75,
        isWarning: score >= 50 && score < 75,
        isDanger: score < 50,
        type: "news",
        url: articleExtraction?.originalUrl ?? searchQuery.substring(0, 50) + (searchQuery.length > 50 ? "..." : ""),
        score: score,
        confidence: score >= 75 ? "Độ tin cậy cao" : score >= 50 ? "Cần kiểm chứng thêm" : "Độ rủi ro rất cao",
        title: score >= 75 ? "Thông tin có độ tin cậy" : score >= 50 ? "Tin tức chưa được xác minh" : "CẢNH BÁO: Tin giả độc hại",
        description: score >= 75
          ? "Nội dung tuân thủ các quy chuẩn thông tin chính thống. Hệ thống không phát hiện các dấu hiệu thao túng tâm lý hoặc kỹ thuật né bộ lọc."
          : score >= 50
            ? "Văn bản chứa một số dấu hiệu bất thường về ngôn ngữ hoặc cấu trúc. Đề nghị kiểm chứng thêm từ các nguồn tin chính thống."
            : "Văn bản chứa nhiều dấu hiệu đặc thù của tin giả lừa đảo: Thao túng tâm lý, đe dọa, né bộ lọc hoặc thông tin tài chính phi lý.",
        analysisReasons: reasons.length > 0 ? reasons : [{ name: "Chưa đủ dữ kiện xác minh", status: "warning", detail: "Nội dung không có tín hiệu nguy hiểm rõ, nhưng cũng chưa có nguồn đủ mạnh để coi là chính xác tuyệt đối.", icon: Info }],
        analysis: analysisDetails,
        violated_rules: violatedRules,
        textContent: articleExtraction?.markdownContent ?? searchQuery,
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
                  {/* Background Image Overlay */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src="https://i.postimg.cc/Ls0LBMvc/image.png?auto=format&fit=crop&q=80&w=2000"
                      alt="Background"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Content */}
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
                      Lá chắn số trước những cạm bẫy không gian mạng.
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

            {/* Info Section */}
            <section className="py-24 px-6 bg-white w-full max-w-[1572.67px] min-h-[1190.22px] mx-auto">
              <div className="w-full">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
                  <div className="max-w-xl">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Lá Chắn Số là gì?</h2>
                    <button className="px-8 py-3 bg-[#1A1A1A] text-white font-semibold rounded-full hover:bg-gray-800 transition-all active:scale-95">
                      Tìm hiểu thêm
                    </button>
                  </div>
                  <div className="max-w-md">
                    <p className="text-lg text-gray-600 leading-relaxed">
                      Lá Chắn Số: Định nghĩa lại sự an toàn trực tuyến. Chúng tôi xây dựng một lớp lọc thông tin minh bạch, giúp người dùng phân định giữa thực tại - tin giả và chống khỏi lừa đảo . Một giải pháp bảo mật tinh gọn, hiệu quả và luôn sẵn sàng bảo vệ bạn.
                    </p>
                  </div>
                </div>

                {/* Grid Section */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.15,
                      },
                    },
                  }}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
                >
                  {/* Large Card */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="md:col-span-2 relative rounded-[32px] overflow-hidden bg-[#E8E8ED] p-10 min-h-[400px] flex flex-col justify-between group"
                  >
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold mb-4">CÔNG NGHỆ XÁC THỰC LỚP SÂU</h3>
                      <p className="text-gray-600 max-w-2xl">
                        Lá Chắn Số vận hành trên nền tảng phân tích đa tầng, cho phép bóc tách dữ liệu và nhận diện hành vi độc hại trong thời gian thực. Bằng cách kết hợp thuật toán thông minh và mạng lưới dữ liệu thực thi, chúng tôi kiến tạo một lớp lọc minh bạch giúp bạn phân định xác thực giữa thực tại và tin giả. Đây là giải pháp bảo mật tinh gọn, chủ động ngăn chặn lừa đảo và bảo vệ an toàn tuyệt đối cho hành trình số của bạn.
                      </p>
                    </div>
                  </motion.div>

                  {/* Small Card 1 */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="rounded-[32px] bg-[#1A1A1A] p-10 flex flex-col justify-between min-h-[400px] text-white"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-4">QUY CHUẨN & NỀN TẢNG RIÊNG</h3>
                    </div>
                    <p className="text-gray-400">
                      Thiết lập bộ quy tắc đánh giá độc lập kết hợp công nghệ nội bộ. Đảm bảo mọi thông tin đều được gán nhãn minh bạch dựa trên cơ sở khoa học và pháp lý.
                    </p>
                  </motion.div>

                  {/* Small Card 2 */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="rounded-[32px] bg-[#2D2D35] p-10 flex flex-col justify-between min-h-[400px] text-white"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-4">DỮ LIỆU THỰC THI</h3>
                    </div>
                    <p className="text-gray-400">
                      Kết nối mạng lưới dữ liệu từ các cộng đồng bảo mật uy tín. Mọi cảnh báo đều dựa trên sự đối soát thực tế, kiến tạo một bản đồ an toàn cho người dùng Việt.
                    </p>
                  </motion.div>

                  {/* Small Card 3 */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="rounded-[32px] bg-[#3D3D45] p-10 flex flex-col justify-between min-h-[400px] text-white"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-4">TRẢI NGHIỆM AN TOÀN</h3>
                    </div>
                    <p className="text-gray-400">
                      Thiết kế tinh gọn, ưu tiên sự đơn giản và minh bạch trong mọi tương tác. Lá Chắn Số không chỉ bảo vệ dữ liệu, mà còn kiến tạo một môi trường số đáng tin cậy, giúp bạn luôn tự tin và an tâm trên hành trình trực tuyến.
                    </p>
                  </motion.div>

                  {/* Small Card 4 */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.8, ease: "easeOut" }
                      },
                    }}
                    className="rounded-[32px] bg-[#4D4D55] p-10 flex flex-col justify-between h-[400px] text-white"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-4">TIẾN HÓA LIÊN TỤC</h3>
                    </div>
                    <p className="text-gray-400">
                      Hệ thống kết nối mạng lưới dữ liệu động, liên tục cập nhật và vô hiệu hóa các phương thức lừa đảo mới nhất từ cộng đồng. Bằng cách hợp nhất các nguồn tin thực thi, Lá Chắn Số kiến tạo một lớp phòng thủ chủ động, giúp bạn đi trước kẻ xấu một bước trên mọi nền tảng số.
                    </p>
                  </motion.div>
                </motion.div>
              </div>
            </section>

            {/* Global Threat Map Section */}
            <section className="py-24 bg-[#F9F9FB] text-[#1A1A1A] overflow-hidden border-t border-gray-100">
              <div className="w-full relative">
                <div className="flex flex-col items-center text-center mb-16 relative z-10">
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-purple-600 font-mono text-sm tracking-[0.2em] uppercase mb-4"
                  >
                    Mạng lưới giám sát toàn cầu
                  </motion.span>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
                  >
                    Tin giả và lừa đảo có ở khắp mọi nơi
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-600 max-w-2xl text-lg"
                  >
                    Lá Chắn Số kết nối với các trung tâm dữ liệu bảo mật trên toàn thế giới để cập nhật và ngăn chặn các mối đe dọa xuyên biên giới trong thời gian thực.
                  </motion.p>
                </div>

                {/* World Map Container */}
                <div className="relative w-full aspect-[2/1] mx-auto">
                  {/* Detailed World Map Image (Black on Light) */}
                  <div className="absolute inset-0 z-0 opacity-100">
                    <img
                      src="https://i.postimg.cc/6QyyKbNd/image.png"
                      alt="Detailed World Map"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Logo Marquee Section */}
            <section className="py-20 bg-white border-t border-gray-100 overflow-hidden">
              <div className="max-w-[1600px] mx-auto px-6 mb-12 text-center">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mb-8">Đồng hành cùng các đơn vị uy tín</h3>
              </div>

              <div className="relative flex overflow-x-hidden">
                <div className="flex animate-marquee whitespace-nowrap py-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-24 mx-12">
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">DNS-BLOCKLISTS</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">MALWARE-FILTER</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">TINGIA.GOV</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">VNEXPRESS</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">TUỔI TRẺ</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">BÁO THANH NIÊN</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">DANTRI</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">PhishTank</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">Google Fact</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">Google News</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">GITHUB COMMUNITY</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">OpenPhish</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">The New York Times</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">CNN</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">AFP</span>
                      <span className="text-2xl font-bold text-gray-800 opacity-40 hover:opacity-100 transition-opacity cursor-default">AP News</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
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

              {/* Search Bar */}
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

              {/* Results Area */}
              <div className="w-full">
                {isChecking ? (
                  // Enhanced Loading State
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

                    <div className="mt-12">
                      <p className="text-sm text-purple-600 font-mono animate-pulse uppercase tracking-widest">
                        Hệ thống đang quét lớp sâu
                      </p>
                    </div>
                  </motion.div>
                ) : showResults && resultData ? (
                  // Actual Results
                  <div className="space-y-8">
                    {/* Expert AI Deep Analysis Section - Full Width for News */}
                    {resultData.type === "news" && resultData.analysis && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1A1A1A] text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden group"
                      >
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-white/10 pb-8">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-purple-400" />
                              </div>
                              <div className="font-analysis-heading">
                                <h4 className="text-2xl font-bold tracking-tight">Thẩm Định Chuyên Gia Phân Tích</h4>
                                <p className="text-gray-400 text-sm mt-1">Hệ thống bóc tách 230 quy chuẩn dữ liệu thời gian thực</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`px-5 py-2 rounded-xl text-sm font-bold border ${resultData.score >= 75 ? "bg-green-500/10 border-green-500/30 text-green-400" :
                                resultData.score >= 50 ? "bg-orange-500/10 border-orange-500/30 text-orange-400" :
                                  "bg-red-500/10 border-red-500/30 text-red-400"
                                }`}>
                                {resultData.isSafe ? "AN TOÀN" : resultData.isWarning ? "CẦN XÁC THỰC" : "NGUY HIỂM"}
                              </div>
                              <div className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold flex items-center gap-2">
                                <Target className="w-4 h-4 text-purple-400" />
                                {resultData.score}% Tin cậy
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-purple-400">
                                <Database className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Heuristics</span>
                              </div>
                              <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors h-full min-h-[140px]">
                                <p className="text-[15px] text-gray-200 leading-relaxed font-analysis-body">
                                  "{resultData.analysis.heuristics}"
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-blue-400">
                                <Search className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Google Fact Check</span>
                              </div>
                              <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors h-full min-h-[140px]">
                                <p className="text-[15px] text-gray-200 leading-relaxed font-analysis-body">
                                  "{resultData.analysis.google_fact_check}"
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-green-400">
                                <Globe className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">URL Verification</span>
                              </div>
                              <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors h-full min-h-[140px]">
                                <p className="text-[15px] text-gray-200 leading-relaxed font-analysis-body">
                                  "{resultData.analysis.url_verification}"
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-cyan-400">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Source Audit</span>
                              </div>
                              <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors h-full min-h-[140px]">
                                <p className="text-[15px] text-gray-200 leading-relaxed font-analysis-body">
                                  "{resultData.analysis.source_audit}"
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-orange-300">
                                <Database className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Press Comparison</span>
                              </div>
                              <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors h-full min-h-[140px]">
                                <p className="text-[15px] text-gray-200 leading-relaxed font-analysis-body">
                                  "{resultData.analysis.press_comparison}"
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-pink-300">
                                <Search className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Search Trace</span>
                              </div>
                              <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors h-full min-h-[140px]">
                                <p className="text-[15px] text-gray-200 leading-relaxed font-analysis-body">
                                  "{resultData.analysis.search_trace}"
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-emerald-300">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Live Fact API</span>
                              </div>
                              <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors h-full min-h-[140px]">
                                <p className="text-[15px] text-gray-200 leading-relaxed font-analysis-body">
                                  "{resultData.analysis.live_fact_check}"
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-sky-300">
                                <Globe className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Google News / Press</span>
                              </div>
                              <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors h-full min-h-[140px]">
                                <p className="text-[15px] text-gray-200 leading-relaxed font-analysis-body">
                                  "{resultData.analysis.live_press_scan}"
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-lime-300">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Wikipedia / Open Knowledge</span>
                              </div>
                              <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors h-full min-h-[140px]">
                                <p className="text-[15px] text-gray-200 leading-relaxed font-analysis-body">
                                  "{resultData.analysis.open_knowledge_check}"
                                </p>
                              </div>
                            </div>

                          </div>

                          {resultData.violated_rules && resultData.violated_rules.length > 0 && (
                            <div className="mt-10 pt-8 border-t border-white/10">
                              <div className="flex flex-wrap gap-2.5">
                                {resultData.violated_rules.map((rule: string) => (
                                  <span
                                    key={rule}
                                    className="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-bold font-mono border border-red-500/20"
                                  >
                                    {rule}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {resultData.type === "news" && resultData.pressArticles && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                      >
                        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="text-lg font-black tracking-tight text-gray-950">Bài báo đối chiếu Google News</h4>
                            <p className="mt-1 text-sm text-gray-500">
                              Danh sách các bài viết trùng hoặc tương tự được tìm thấy qua Google News.
                            </p>
                          </div>
                          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
                            <Search className="h-4 w-4" />
                            {resultData.pressSourceLabel ?? "Google News"}
                          </span>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {resultData.pressArticles.length > 0 ? (
                            resultData.pressArticles.map((article: any, index: number) => (
                              <a
                                key={`${article.title}-${index}`}
                                href={article.link ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="block px-6 py-5 transition-colors hover:bg-gray-50"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-950 line-clamp-2">{article.title}</p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {article.source} {article.publishedAt ? `· ${new Date(article.publishedAt).toLocaleDateString('vi-VN')}` : ""}
                                    </p>
                                  </div>
                                  {article.link ? (
                                    <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-[11px] font-bold uppercase text-purple-700 sm:mt-0">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Xem bài
                                    </span>
                                  ) : null}
                                </div>
                              </a>
                            ))
                          ) : (
                            <div className="p-6 text-sm text-gray-600">Không tìm thấy bài báo trùng lặp rõ ràng trên Google News với truy vấn hiện tại.</div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Smart Result Dashboard */}
                    <div className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                      >
                        <div className={`h-1.5 ${resultData.isSafe ? "bg-green-500" : resultData.isWarning ? "bg-amber-500" : "bg-red-500"
                          }`} />
                        <div className="grid gap-6 p-6 lg:grid-cols-[220px_1fr_auto] lg:items-center">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                              {resultData.type === "news" ? "Kiểm tra tin tức" : "Kiểm tra website"}
                            </p>
                            <div className="mt-3 flex items-baseline gap-2">
                              <span className="text-5xl font-black leading-none text-gray-950">{resultData.score}</span>
                              <span className="text-lg font-black text-gray-400">%</span>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${resultData.isSafe ? "bg-green-50 text-green-700" : resultData.isWarning ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                              }`}>
                              {resultData.isSafe ? <ShieldCheck className="h-4 w-4" /> : resultData.isWarning ? <AlertTriangle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                              {resultData.isSafe ? "An toàn" : resultData.isWarning ? "Cần xác thực" : "Nguy hiểm"}
                            </div>
                            <h4 className="truncate text-2xl font-black tracking-tight text-gray-950">{resultData.title}</h4>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{resultData.description}</p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 p-4 lg:min-w-[260px]">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                              <Globe className="h-4 w-4" />
                              Đối tượng
                            </div>
                            <p className="mt-2 break-all text-sm font-bold text-gray-900">{resultData.url}</p>
                          </div>
                        </div>
                      </motion.div>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08 }}
                          className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                        >
                          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h4 className="text-lg font-black tracking-tight text-gray-950">
                                {resultData.type === "news" ? "Nội dung đã phân tích" : "Preview an toàn"}
                              </h4>
                              <p className="mt-1 text-sm text-gray-500">
                                {resultData.type === "news" ? "Văn bản hoặc bài viết được đưa vào pipeline kiểm chứng." : "Ảnh chụp được render qua dịch vụ trung gian, không nhúng website trực tiếp."}
                              </p>
                            </div>
                            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">
                              <Shield className="h-4 w-4" />
                              {resultData.type === "news" ? "Text source" : "Safe preview"}
                            </span>
                          </div>

                          <div className="relative min-h-[520px] bg-gray-50">
                            {resultData.type === "news" ? (
                              <div className="h-[620px] overflow-y-auto bg-white p-7 custom-scrollbar">
                                <p className="whitespace-pre-wrap text-[15px] font-medium leading-8 text-gray-900">
                                  {resultData.textContent}
                                </p>
                              </div>
                            ) : (
                              <div className="relative h-[620px] overflow-hidden bg-gray-100">
                                <img
                                  src={activePreview ?? resultData.screenshot}
                                  alt="Website preview"
                                  className="h-full w-full object-cover object-top"
                                  referrerPolicy="no-referrer"
                                  onError={() => {
                                    if ((resultData.previewCandidates?.length ?? 0) > previewCandidateIndex + 1) {
                                      setPreviewCandidateIndex((current) => current + 1);
                                    }
                                  }}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-6">
                                  <p className="text-base font-black text-white">{resultData.title}</p>
                                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/75">{resultData.description}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.14 }}
                          className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
                        >
                          <div className="mb-5 flex items-center justify-between gap-3">
                            <h4 className="flex items-center gap-2 text-lg font-black tracking-tight text-gray-950">
                              <Database className="h-5 w-5 text-gray-700" />
                              Bằng chứng
                            </h4>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-gray-500">
                              {resultData.analysisReasons.length} tín hiệu
                            </span>
                          </div>

                          <div className="max-h-[690px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                            {resultData.analysisReasons.map((res: any, idx: number) => (
                              <div
                                key={idx}
                                className={`rounded-2xl border p-4 ${res.status === "danger" ? "border-red-200 bg-red-50/70" :
                                  res.status === "warning" ? "border-amber-200 bg-amber-50/70" :
                                    "border-emerald-200 bg-emerald-50/70"
                                  }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${res.status === "danger" ? "bg-red-100 text-red-700" :
                                    res.status === "warning" ? "bg-amber-100 text-amber-700" :
                                      "bg-emerald-100 text-emerald-700"
                                    }`}>
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
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    {/* Standard Result Grid */}
                    <div className="hidden">
                      {/* Column 1: Verdict & Summary Dashboard */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm flex flex-col items-center text-center"
                      >
                        <h4 className="text-lg font-bold mb-8 text-gray-800 tracking-tight">Cổng Giám Sát Cấp Cao</h4>

                        <div className="relative w-48 h-48 mb-10">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-gray-100" />
                            <motion.circle
                              cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="14" fill="transparent" strokeDasharray={528}
                              initial={{ strokeDashoffset: 528 }}
                              animate={{ strokeDashoffset: 528 - (528 * resultData.score) / 100 }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className={resultData.isSafe ? "text-green-500" : resultData.isWarning ? "text-orange-500" : "text-red-500"}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-gray-900 leading-none">{resultData.score}%</span>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Độ Tin Cậy</span>
                          </div>
                        </div>

                        <div className={`w-full py-5 rounded-3xl mb-10 flex items-center justify-center gap-3 ${resultData.isSafe ? "bg-green-500/10 text-green-600" : resultData.isWarning ? "bg-orange-500/10 text-orange-600" : "bg-red-500/10 text-red-600"
                          }`}>
                          {resultData.isSafe ? <ShieldCheck className="w-6 h-6" /> : resultData.isWarning ? <AlertTriangle className="w-6 h-6" /> : <X className="w-6 h-6" />}
                          <span className="text-2xl font-black tracking-widest">
                            {resultData.isSafe ? "AN TOÀN" : resultData.isWarning ? "CẦN XÁC THỰC" : "NGUY HIỂM"}
                          </span>
                        </div>

                        <div className="w-full space-y-4 mb-10">
                          <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            <span>Phân cấp rủi ro</span>
                            <span className={resultData.isSafe ? "text-green-500" : resultData.isWarning ? "text-orange-500" : "text-red-500"}>
                              {resultData.isSafe ? "Cấp độ 1 (An toàn)" : resultData.isWarning ? "Cấp độ 2 (Cảnh báo)" : "Cấp độ 3 (Khẩn cấp)"}
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${100 - resultData.score}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className={`h-full ${resultData.isSafe ? "bg-green-500" : resultData.isWarning ? "bg-orange-500" : "bg-red-500"}`}
                            />
                          </div>
                        </div>

                        <div className="mt-auto pt-10 w-full border-t border-gray-50">
                          <div className="p-5 rounded-3xl bg-blue-50/50 border border-blue-100 flex items-start gap-4 text-left">
                            <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                            <div>
                              <p className="text-sm font-bold text-blue-900 leading-none mb-1">Xác thực bởi chuyên gia</p>
                              <p className="text-[11px] text-blue-700/70 leading-relaxed">Được bảo chứng bởi mạng lưới 500+ thâm định viên bảo mật độc lập.</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Column 2: Detailed Evidence Dashboard */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm flex flex-col h-full"
                      >
                        <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                          <h4 className="text-xl font-bold flex items-center gap-3">
                            <Database className="w-7 h-7 text-purple-600" />
                            Bằng Chứng Phân Tích
                          </h4>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
                            {resultData.analysisReasons.length} Tín hiệu
                          </span>
                        </div>

                        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                          {resultData.analysisReasons.map((res: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start gap-4 p-5 rounded-3xl border border-gray-50 bg-white hover:border-purple-200 hover:shadow-[0_8px_30px_rgb(139,92,246,0.04)] transition-all group cursor-default"
                            >
                              <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${res.status === "danger" ? "bg-red-50 text-red-500" :
                                res.status === "warning" ? "bg-orange-50 text-orange-500" :
                                  "bg-green-50 text-green-500"
                                }`}>
                                <res.icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  {res.id && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold font-mono tracking-tighter uppercase">{res.id}</span>}
                                  <span className="text-[15px] font-bold text-gray-900 truncate tracking-tight">{res.name}</span>
                                </div>
                                <p className={`text-[12px] leading-relaxed line-clamp-3 font-medium ${res.status === "danger" ? "text-red-600/80" :
                                  res.status === "warning" ? "text-orange-600/80" :
                                    "text-green-700/80"
                                  }`}>
                                  {res.detail}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Column 3: Sandbox/Text Extraction Panel */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm flex flex-col h-full"
                      >
                        <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                          <h4 className="text-xl font-bold text-gray-900 tracking-tight">
                            {resultData.type === "news" ? "Dữ Liệu Văn Bản" : "Kiểm Soát Sandbox"}
                          </h4>
                          <div className="px-4 py-1.5 bg-green-50 text-green-700 text-[11px] font-bold rounded-full border border-green-100 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            {resultData.type === "news" ? "TEXT QUANTUM" : "SAFE PREVIEW"}
                          </div>
                        </div>

                        <div className="relative flex-1 rounded-[32px] overflow-hidden bg-gray-50/50 border border-gray-200 group min-h-[500px] shadow-inner">
                          {resultData.type === "news" ? (
                            <div className="p-8 h-full bg-white overflow-y-auto custom-scrollbar">
                              <div className="flex items-center gap-3 mb-6">
                                <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                                <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                              </div>
                              <div className="prose prose-sm max-w-none">
                                <p className="text-[#1A1A1A] text-[16px] leading-[1.8] font-medium whitespace-pre-wrap selection:bg-purple-100">
                                  {resultData.textContent}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <img
                                src={activePreview ?? resultData.screenshot}
                                alt="Website preview"
                                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                                referrerPolicy="no-referrer"
                                onError={() => {
                                  if ((resultData.previewCandidates?.length ?? 0) > previewCandidateIndex + 1) {
                                    setPreviewCandidateIndex((current) => current + 1);
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                              <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/95 backdrop-blur-xl rounded-[24px] border border-white/20 shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 invisible group-hover:visible opacity-0 group-hover:opacity-100">
                                <p className="text-base font-black text-gray-900 leading-tight mb-2">{resultData.title}</p>
                                <p className="text-xs text-gray-600/80 leading-relaxed line-clamp-2">{resultData.description}</p>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="mt-8 flex items-center justify-between text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em] px-4">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-purple-400" />
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
                  </div>

                ) : (
                  // Initial State
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400">Chưa có dữ liệu kiểm tra</h3>
                    <p className="text-gray-400">Vui lòng nhập URL để bắt đầu phân tích an toàn.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === "partners" && (
          <motion.div
            key="partners"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 px-6 min-h-screen bg-white"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-purple-600 font-mono text-sm tracking-[0.3em] uppercase mb-4 block"
                >
                  Mạng lưới hợp tác
                </motion.span>
                <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">Đồng hành cùng Lá Chắn Số</h2>
                <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                  Chúng tôi tự hào được đồng hành cùng các tổ chức bảo mật toàn cầu, cơ quan báo chí và đơn vị xác thực uy tín để kiến tạo một không gian mạng an toàn.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-12">
                {/* Group 1 */}
                <div className="bg-[#F9F9FB] rounded-[40px] p-12 flex flex-col md:flex-row gap-12 border border-gray-100">
                  <div className="md:w-1/3">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Nhóm 1: Global Security Intelligence</h3>
                    <p className="text-purple-600 font-medium">(Dữ liệu bảo mật)</p>
                  </div>
                  <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {["DNS-BLOCKLISTS", "MALWARE-FILTER", "PhishTank", "OpenPhish", "GITHUB COMMUNITY"].map((name) => (
                      <div key={name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4 group hover:border-purple-200 transition-all">
                        <div className="w-2 h-2 bg-purple-400 rounded-full group-hover:scale-150 transition-transform" />
                        <span className="font-bold text-gray-800 tracking-wide">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group 2 */}
                <div className="bg-[#F9F9FB] rounded-[40px] p-12 flex flex-col md:flex-row gap-12 border border-gray-100">
                  <div className="md:w-1/3">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Nhóm 2: Fact-Check & Global Media</h3>
                    <p className="text-purple-600 font-medium">(Xác thực & Báo chí quốc tế)</p>
                  </div>
                  <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {["Google Fact", "Google News", "AP News", "AFP", "CNN", "The New York Times"].map((name) => (
                      <div key={name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4 group hover:border-purple-200 transition-all">
                        <div className="w-2 h-2 bg-purple-400 rounded-full group-hover:scale-150 transition-transform" />
                        <span className="font-bold text-gray-800 tracking-wide">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group 3 */}
                <div className="bg-[#F9F9FB] rounded-[40px] p-12 flex flex-col md:flex-row gap-12 border border-gray-100">
                  <div className="md:w-1/3">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Nhóm 3: Vietnam Verification Hub</h3>
                    <p className="text-purple-600 font-medium">(Tin tức & Xác thực Việt Nam)</p>
                  </div>
                  <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {["TINGIA.GOV", "VNEXPRESS", "TUỔI TRẺ", "BÁO THANH NIÊN", "DANTRI"].map((name) => (
                      <div key={name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4 group hover:border-purple-200 transition-all">
                        <div className="w-2 h-2 bg-purple-400 rounded-full group-hover:scale-150 transition-transform" />
                        <span className="font-bold text-gray-800 tracking-wide">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === "resources" && (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 px-6 min-h-screen bg-white"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-purple-600 font-mono text-sm tracking-[0.3em] uppercase mb-4 block"
                >
                  Trung tâm tài nguyên
                </motion.span>
                <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">Dữ liệu cảnh báo</h2>
                <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                  Danh sách các trang web lừa đảo và tin giả được hệ thống Lá Chắn Số cập nhật liên tục để bảo vệ người dùng.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Scam Websites Table */}
                <div className="bg-white rounded-[32px] border border-red-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-red-50 rounded-xl">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Trang web lừa đảo</h3>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-red-50">
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">STT</th>
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Link trang</th>
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Ngày</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-50/30">
                        {[
                          { id: 1, link: "shopee-khuyenmai-2026.com", date: "02/04" },
                          { id: 2, link: "nganhang-abc-login.net", date: "01/04" },
                          { id: 3, link: "nhan-qua-mien-phi.org", date: "31/03" },
                          { id: 4, link: "facebook-verify-account.com", date: "30/03" },
                          { id: 5, link: "crypto-invest-bonus.io", date: "29/03" },
                        ].map((item) => (
                          <tr key={item.id} className="group hover:bg-red-50/30 transition-colors">
                            <td className="py-4 font-medium text-gray-900 text-sm">{item.id}</td>
                            <td className="py-4 text-red-600 font-medium hover:underline cursor-pointer text-sm truncate max-w-[150px]">{item.link}</td>
                            <td className="py-4 text-gray-500 text-sm">{item.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fake News Table */}
                <div className="bg-white rounded-[32px] border border-red-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-red-50 rounded-xl">
                      <Sparkles className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Tin giả cảnh báo</h3>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-red-50">
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">STT</th>
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Tiêu đề tin</th>
                          <th className="pb-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Ngày</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-50/30">
                        {[
                          { id: 1, title: "Phong tỏa tài khoản ngân hàng hàng loạt", date: "02/04" },
                          { id: 2, title: "Thông tin sai về chính sách hỗ trợ mới", date: "01/04" },
                          { id: 3, title: "Tin đồn thất thiệt về dịch bệnh", date: "31/03" },
                          { id: 4, title: "Giả mạo văn bản xử phạt giao thông", date: "30/03" },
                          { id: 5, title: "Tin giả về chương trình tặng quà tri ân", date: "29/03" },
                        ].map((item) => (
                          <tr key={item.id} className="group hover:bg-red-50/30 transition-colors">
                            <td className="py-4 font-medium text-gray-900 text-sm">{item.id}</td>
                            <td className="py-4 text-gray-800 font-medium text-sm line-clamp-1">{item.title}</td>
                            <td className="py-4 text-gray-500 text-sm">{item.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}
        {currentPage === "mission" && (
          <motion.div
            key="mission"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-32 pb-20 min-h-screen bg-white"
          >
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-6 text-center py-24 border-b border-gray-100">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center mb-8"
              >
                <div className="flex items-center gap-3 px-4 py-2 bg-red-50 rounded-full border border-red-100">
                  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm shadow-sm">
                    <rect width="24" height="16" fill="#DA251D" />
                    <path d="M12 4L13.1756 7.61803H16.9789L13.9016 9.8541L15.0773 13.4721L12 11.2361L8.92272 13.4721L10.0984 9.8541L7.02114 7.61803H10.8244L12 4Z" fill="#FFFF00" />
                  </svg>
                  <span className="text-red-600 font-bold text-sm tracking-wide uppercase">Khát vọng Việt</span>
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-6xl md:text-8xl font-bold tracking-tighter mb-12 leading-[0.9]"
              >
                Lá Chắn Số bảo vệ <br /> thế giới số của bạn.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed"
              >
                Nền tảng của chúng tôi cung cấp giải pháp xác thực và bảo mật để xây dựng, mở rộng và <span className="text-purple-600 font-semibold">bảo vệ</span> một không gian mạng an toàn, tin cậy hơn cho người dùng Việt Nam.
              </motion.p>
            </div>

            {/* Values Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 border-b border-gray-100">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="p-12 border-b md:border-b-0 md:border-r border-gray-100 group hover:bg-purple-50/30 transition-colors"
              >
                <div className="mb-8 p-3 bg-purple-50 w-fit rounded-2xl group-hover:bg-purple-100 transition-colors">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-4">
                  <span className="text-purple-600">Dễ dàng.</span> Kiểm tra và xác thực thông tin chỉ với một cú chạm đơn giản.
                </h3>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="p-12 border-b md:border-b-0 md:border-r border-gray-100 group hover:bg-purple-50/30 transition-colors"
              >
                <div className="mb-8 p-3 bg-purple-50 w-fit rounded-2xl group-hover:bg-purple-100 transition-colors">
                  <Globe className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-4">
                  <span className="text-purple-600">Toàn diện.</span> Kết nối dữ liệu bảo mật toàn cầu, bảo vệ bạn ở mọi nơi.
                </h3>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="p-12 group hover:bg-purple-50/30 transition-colors"
              >
                <div className="mb-8 p-3 bg-purple-50 w-fit rounded-2xl group-hover:bg-purple-100 transition-colors">
                  <User className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-4">
                  <span className="text-purple-600">Tin cậy.</span> Sự tỉ mỉ trong phân tích và công nghệ hiện đại giúp mọi người an tâm hơn.
                </h3>
              </motion.div>
            </div>

            {/* Detailed Mission Section */}
            <div className="max-w-7xl mx-auto px-6 py-32 border-b border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div>
                  <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-purple-600 font-mono text-sm tracking-[0.3em] uppercase mb-6 block"
                  >
                    Tầm nhìn chiến lược
                  </motion.span>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 leading-tight">
                    Kiến tạo hệ sinh thái <br /> tín nhiệm số quốc gia.
                  </h2>
                  <div className="space-y-8">
                    <div className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <Target className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">Mục tiêu 2030</h4>
                        <p className="text-gray-500 leading-relaxed">Trở thành nền tảng xác thực tin cậy hàng đầu, bảo vệ 100% người dùng internet Việt Nam khỏi các mối đe dọa lừa đảo trực tuyến.</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">Vì cộng đồng</h4>
                        <p className="text-gray-500 leading-relaxed">Xây dựng cộng đồng cùng nhau chia sẻ và cảnh báo các dấu hiệu lừa đảo, tạo nên một "lá chắn" vững chắc từ chính sức mạnh tập thể.</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                        <Heart className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">Trách nhiệm xã hội</h4>
                        <p className="text-gray-500 leading-relaxed">Hỗ trợ các đối tượng yếu thế, người cao tuổi và trẻ em nâng cao kỹ năng nhận diện và phòng chống tội phạm mạng.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-purple-100 to-red-50 rounded-[60px] overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-64 h-64">
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ duration: 10, repeat: Infinity }}
                          className="absolute inset-0 bg-white/40 backdrop-blur-3xl rounded-full border border-white/50"
                        />
                        <Shield className="absolute inset-0 m-auto w-32 h-32 text-purple-600 opacity-20" />
                        <div className="absolute inset-0 m-auto w-24 h-24 flex items-center justify-center">
                          <svg width="60" height="40" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
                            <rect width="24" height="16" fill="#DA251D" />
                            <path d="M12 4L13.1756 7.61803H16.9789L13.9016 9.8541L15.0773 13.4721L12 11.2361L8.92272 13.4721L10.0984 9.8541L7.02114 7.61803H10.8244L12 4Z" fill="#FFFF00" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-12 left-12 w-4 h-4 bg-purple-400 rounded-full animate-pulse" />
                    <div className="absolute bottom-24 right-16 w-6 h-6 bg-red-400 rounded-full opacity-30 animate-bounce" />
                  </div>
                </div>
              </div>
            </div>

            {/* Large Background Text Watermark */}
            <div className="relative w-full overflow-hidden pt-24 pb-10 pointer-events-none select-none bg-white">
              <div className="max-w-[1600px] mx-auto px-6">
                <motion.h2
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  viewport={{ once: true }}
                  className="text-[16vw] font-black leading-none tracking-tighter italic whitespace-nowrap select-none bg-clip-text text-transparent bg-gradient-to-t from-gray-900/[0.08] to-gray-900/[0.01]"
                >
                  Lá Chắn Số
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tighter">Lá Chắn Số</span>
          </div>
          <p className="text-gray-500 text-sm">
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
      `}} />
    </div>
  );
}
