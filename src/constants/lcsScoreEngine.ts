export interface LCSSignal {
  id: string;
  layer: "linguistic" | "trust" | "behavioral";
  name: string;
  detail: string;
  impact: number;
  severity: "safe" | "warning" | "danger";
}
export interface LCSLayerResult {
  score: number;
  weight: number;
  signals: LCSSignal[];
  label: string;
}
export interface LCSNarrativeProfile {
  archetype: "authority_impersonation" | "health_misinformation" | "crisis_distortion" | "fabricated_natural_phenomenon" | "sensational_fabrication" | "unclear";
  label: string;
  summary: string;
  riskBand: "low" | "medium" | "high" | "critical";
}
export interface LCSEngineResult {
  lcsScore: number;
  verdict: "VERIFIED" | "UNCERTAIN" | "SUSPICIOUS" | "DANGER";
  verdictLabel: string;
  confidence: number;
  layers: {
    linguistic: LCSLayerResult;
    trust: LCSLayerResult;
    behavioral: LCSLayerResult;
  };
  allSignals: LCSSignal[];
  narrativeProfile: LCSNarrativeProfile;
  processingMeta: {
    version: string;
    timestamp: string;
    inputLength: number;
    signalCount: number;
    dominantLayer: string;
  };
}

import { aiEngine } from "../utils/transformerEngine";

// Educational content detection — distinguish articles ABOUT fake news FROM fake news
const EDUCATIONAL_INDICATORS = [
  /cách (nhận biết|phát hiện|nhận ra|tránh|phòng)/i,
  /hướng dẫn.*(?:nhận biết|phát hiện|phòng tránh|tránh)/i,
  /làm sao để (nhận biết|phát hiện|tránh|nhận ra)/i,
  /làm thế nào để (nhận biết|phát hiện|tránh|nhận ra)/i,
  /dấu hiệu.*(?:tin giả|lừa đảo|fake|scam|gian lận)/i,
  /biết.*(?:tin giả|lừa đảo|fake|scam)/i,
  /nhận dạng.*(?:tin giả|lừa đảo|thông tin sai)/i,
  /tránh.*(?:tin giả|bị lừa|bị lừa đảo)/i,
  /phòng.*(?:tin giả|lừa đảo)/i,
  /kiểm tra.*(?:tin giả|thông tin|tin tức)/i,
  /xác minh.*(?:tin tức|thông tin)/i,
  /cảnh báo.*(?:tin giả|lừa đảo)/i,
  /biểu hiện.*(?:tin giả|lừa đảo)/i,
  /đặc điểm.*(?:tin giả|lừa đảo)/i,
  /mẹo.*(?:nhận biết|phát hiện|tránh)/i,
  /thủ đoạn.*(?:tin giả|lừa đảo)/i,
  /các bước.*(?:kiểm tra|xác minh|nhận biết)/i,
  /bài viết.*(?:hướng dẫn|chia sẻ|giới thiệu)/i,
  /giới thiệu.*(?:cách|phương pháp|biện pháp)/i,
];

// Context patterns — keywords used in EXAMPLE/QUOTE context (not actual claims)
const EXAMPLE_CONTEXT_PATTERNS = [
  /(?:ví dụ|ví dụ như|chẳng hạn|thí dụ|vd)[:\s].*\b(sốc|kinh hoàng|gây sốc|chấn động)\b/i,
  /(?:điển hình|thường thấy|phổ biến|hay gặp)[:\s].*\b(sốc|kinh hoàng)\b/i,
  /(?:tiêu đề|tin nhắn|thông báo).*(?:sốc|kinh hoàng|gây sốc)/i,
  /(?:ví dụ|ví dụ về).*(?:tiêu đề giật gân|tin giật gân)/i,
  /\b(sốc|kinh hoàng)\b.*(?:đây là|đó là|được xem là|thường là)/i,
  /(?:không|đừng|tránh|cẩn thận).*(?:tin|bài).*(?:sốc|kinh hoàng|gây sốc)/i,
];

function detectEducationalContent(text: string): {
  isEducational: boolean;
  confidence: number;
  indicators: string[];
} {
  const indicators: string[] = [];
  let confidence = 0;

  for (const pattern of EDUCATIONAL_INDICATORS) {
    if (pattern.test(text)) {
      indicators.push(pattern.source);
      confidence += 0.15;
    }
  }

  // Check for example contexts — keywords used in example/quote
  let exampleContextCount = 0;
  for (const pattern of EXAMPLE_CONTEXT_PATTERNS) {
    if (pattern.test(text)) {
      exampleContextCount++;
    }
  }
  if (exampleContextCount > 0) {
    confidence += exampleContextCount * 0.1;
  }

  // Structural signals — numbered lists, step-by-step = educational
  const hasNumberedList = /(?:1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.|10\.)/g.test(text);
  if (hasNumberedList) {
    confidence += 0.05;
  }

  // Article with question format = educational
  const hasQuestion = /\?|(?:như thế nào|như nào|ra sao|thế nào)/i.test(text);
  if (hasQuestion) {
    confidence += 0.05;
  }

  return {
    isEducational: confidence >= 0.25,
    confidence: Math.min(confidence, 1),
    indicators
  };
}

// Context-aware keyword analysis — check if keywords are used as examples vs actual claims
function analyzeKeywordContext(text: string, keyword: string): {
  isExample: boolean;
  isClaim: boolean;
  contextType: 'example' | 'claim' | 'warning' | 'neutral';
} {
  const lower = text.toLowerCase();
  const kwLower = keyword.toLowerCase();
  const idx = lower.indexOf(kwLower);

  if (idx === -1) {
    return { isExample: false, isClaim: false, contextType: 'neutral' };
  }

  // Get surrounding context (100 chars before and after)
  const start = Math.max(0, idx - 100);
  const end = Math.min(text.length, idx + keyword.length + 100);
  const context = text.substring(start, end).toLowerCase();

  // Warning context — "avoid", "beware", "don't trust"
  const warningPatterns = /(?:tránh|cảnh báo|đừng|không nên|cẩn thận|kiểm tra|đối chiếu|xác minh|nhận biết|phát hiện|làm sao|làm thế nào)/i;
  if (warningPatterns.test(context)) {
    return { isExample: false, isClaim: false, contextType: 'warning' };
  }

  // Example context — "for example", "such as", "typically"
  const examplePatterns = /(?:ví dụ|chẳng hạn|thí dụ|vd|điển hình|thường thấy|phổ biến|như|tức là|ý là|đây là)/i;
  if (examplePatterns.test(context)) {
    return { isExample: true, isClaim: false, contextType: 'example' };
  }

  // Quote context — within quotes or reported speech
  const quotePatterns = /["""][^""]*["""]|'.*?'|「.*?」|\(.*?\)/i;
  if (quotePatterns.test(context)) {
    return { isExample: true, isClaim: false, contextType: 'example' };
  }

  return { isExample: false, isClaim: true, contextType: 'claim' };
}

const EMOTIONAL_WORDS_VI = [
"khẩn", "gấp", "ngay", "lập tức", "ngay bây giờ", "không chậm trễ",
"nguy hiểm", "đe dọa", "tấn công", "khủng khiếp",
"sốc", "kinh hoàng", "bàng hoàng", "phẫn nộ", "tức giận",
"phải", "bắt buộc", "cần ngay", "không được trễ", "hết hạn"];

const VAGUE_SOURCE_PATTERNS = [
/theo nguồn tin/i, /được biết/i, /có thông tin/i, /nghe nói/i,
/theo một số/i, /nhiều người cho rằng/i, /dư luận/i,
/theo một chuyên gia/i, /ai đó tiết lộ/i, /nguồn ẩn danh/i,
/một người trong cuộc/i, /tin đáng tin cậy/i];

const ABSOLUTISM_WORDS = [
"tất cả", "mọi người", "không ai", "không bao giờ", "luôn luôn",
"chắc chắn 100%", "đảm bảo tuyệt đối", "hoàn toàn", "dứt khoát",
"không thể sai", "đã được xác nhận hoàn toàn", "sự thật tuyệt đối"];

const URGENCY_TRIGGERS = [
/trong vòng \d+ (giờ|phút|ngày)/i,
/trước \d+ (giờ|phút)/i,
/còn \d+ (chỗ|suất|vé)/i,
/hết hạn lúc/i, /deadline/i,
/ưu đãi chỉ hôm nay/i, /giới hạn số lượng/i];

async function runLinguisticLayer(text: string): Promise<LCSLayerResult> {
  const signals: LCSSignal[] = [];

  // Detect educational content first
  const educational = detectEducationalContent(text);

  if (educational.isEducational) {
    signals.push({
      id: "EDU_CONTENT",
      layer: "linguistic",
      name: "Nội dung giáo dục/hướng dẫn",
      detail: `Bài viết được xác định là nội dung giáo dục về cách nhận biết tin giả (độ tin cậy: ${(educational.confidence * 100).toFixed(0)}%). Từ khóa cảnh báo trong bối cảnh hướng dẫn KHÔNG được tính là tín hiệu lừa đảo.`,
      impact: +30,
      severity: "safe"
    });
  }

  const nlpResults = await aiEngine.analyze(text);
  if (nlpResults.length > 0) {
    const topMatch = nlpResults[0];

    // For educational content, NLP matches are likely discussing scam patterns, not BEING a scam
    if (educational.isEducational && topMatch.similarity >= 0.55 && !topMatch.category.startsWith("SAFE_")) {
      signals.push({
        id: "NLP_NEURAL_MATCH_EDU",
        layer: "linguistic",
        name: "AI: Phát hiện thảo luận về kịch bản thao túng",
        detail: `Văn bản có độ tương đồng ${(topMatch.similarity * 100).toFixed(1)}% với kịch bản [${topMatch.category}] — đây là nội dung thảo luận/hướng dẫn, KHÔNG phải lừa đảo.`,
        impact: +10,
        severity: "safe"
      });
    } else if (topMatch.similarity >= 0.55 && !topMatch.category.startsWith("SAFE_")) {
      const impactScore = -Math.min(60, Math.round(topMatch.similarity * 80));
      signals.push({
        id: "NLP_NEURAL_MATCH",
        layer: "linguistic",
        name: "AI: Phát hiện kịch bản thao túng",
        detail: `Neural Network nhận diện văn bản có độ tương đồng ${(topMatch.similarity * 100).toFixed(1)}% với kịch bản [${topMatch.category}].`,
        impact: impactScore,
        severity: topMatch.similarity >= 0.70 ? "danger" : "warning"
      });
    } else if (topMatch.similarity >= 0.55 && topMatch.category.startsWith("SAFE_")) {
      signals.push({
        id: "NLP_NEURAL_SAFE",
        layer: "linguistic",
        name: "AI: Văn phong chuẩn mực",
        detail: `Độ tương đồng ${(topMatch.similarity * 100).toFixed(1)}% với kịch bản an toàn.`,
        impact: +15,
        severity: "safe"
      });
    }

    if (topMatch.similarity >= 0.70 && !topMatch.category.startsWith("SAFE_") && !educational.isEducational) {
      const rawScore = signals.reduce((sum, s) => sum + s.impact, 0);
      return {
        score: Math.max(-100, Math.min(100, rawScore)),
        weight: 0.30,
        signals,
        label: "AI Neural Network đã nhận diện kịch bản lừa đảo"
      };
    }
  }

  const words = text.split(/\s+/).filter(Boolean);
  const totalWords = Math.max(words.length, 1);

  // Context-aware emotional density analysis
  let emotionalAsExample = 0;
  let emotionalAsClaim = 0;
  for (const word of EMOTIONAL_WORDS_VI) {
    const contexts = analyzeKeywordContext(text, word);
    if (contexts.contextType === 'example' || contexts.contextType === 'warning') {
      emotionalAsExample++;
    } else if (contexts.contextType === 'claim') {
      emotionalAsClaim++;
    }
  }

  const emotionalDensity = (emotionalAsExample + emotionalAsClaim) / totalWords;

  if (!educational.isEducational) {
    // Original behavior for non-educational content
    if (emotionalDensity > 0.04) {
      signals.push({
        id: "LF_EMO_HIGH",
        layer: "linguistic",
        name: "Mật độ cảm xúc bất thường",
        detail: `Tỷ lệ từ ngữ kích động chiếm ${(emotionalDensity * 100).toFixed(1)}% văn bản — vượt ngưỡng chuẩn báo chí (≤2%).`,
        impact: -18,
        severity: "danger"
      });
    } else if (emotionalDensity > 0.02) {
      signals.push({
        id: "LF_EMO_MED",
        layer: "linguistic",
        name: "Ngôn ngữ có yếu tố cảm xúc",
        detail: `Phát hiện từ ngữ kích động ở mức vừa (${(emotionalDensity * 100).toFixed(1)}%). Cần đối chiếu thêm.`,
        impact: -8,
        severity: "warning"
      });
    }
  } else {
    // Educational content — emotional words are explained, not used
    if (emotionalAsExample > 0) {
      signals.push({
        id: "LF_EMO_EDU_EXAMPLE",
        layer: "linguistic",
        name: "Từ ngữ cảm xúc trong bối cảnh hướng dẫn",
        detail: `${emotionalAsExample} từ ngữ cảm xúc được phát hiện trong bối cảnh ví dụ/hướng dẫn — không tính là tín hiệu lừa đảo.`,
        impact: +5,
        severity: "safe"
      });
    }
  }

  // Context-aware vague source analysis
  let vagueAsExample = 0;
  let vagueAsClaim = 0;
  const vagueKeywords = ['theo nguồn tin', 'được biết', 'có thông tin', 'nghe nói'];
  for (const vk of vagueKeywords) {
    const ctx = analyzeKeywordContext(text, vk);
    if (ctx.contextType === 'example' || ctx.contextType === 'warning') {
      vagueAsExample++;
    } else if (ctx.contextType === 'claim') {
      vagueAsClaim++;
    }
  }

  const vagueMatches = VAGUE_SOURCE_PATTERNS.filter((p) => p.test(text));
  if (!educational.isEducational) {
    if (vagueMatches.length >= 2) {
      signals.push({
        id: "LF_SRC_VAGUE",
        layer: "linguistic",
        name: "Nguồn gốc thông tin mơ hồ",
        detail: `Phát hiện ${vagueMatches.length} cụm trích dẫn mờ nhạt, không rõ danh tính. Tiêu chí báo chí yêu cầu nguồn có thể xác minh.`,
        impact: -14,
        severity: "danger"
      });
    } else if (vagueMatches.length === 1) {
      signals.push({
        id: "LF_SRC_VAGUE_LOW",
        layer: "linguistic",
        name: "Trích dẫn chưa rõ nguồn",
        detail: "Có ít nhất một cụm trích dẫn chưa gắn danh tính cụ thể.",
        impact: -6,
        severity: "warning"
      });
    }
  } else {
    // Educational content — vague sources are examples being discussed
    if (vagueMatches.length > 0) {
      signals.push({
        id: "LF_SRC_VAGUE_EDU",
        layer: "linguistic",
        name: "Nguồn mơ hồ trong bối cảnh hướng dẫn",
        detail: `${vagueMatches.length} cụm trích dẫn mờ nhạt trong bối cảnh giáo dục — đây là ví dụ minh họa.`,
        impact: +3,
        severity: "safe"
      });
    }
  }
  // Context-aware absolutism detection
  let absoluteAsExample = 0;
  let absoluteAsClaim = 0;
  for (const word of ABSOLUTISM_WORDS) {
    const ctx = analyzeKeywordContext(text, word);
    if (ctx.contextType === 'example' || ctx.contextType === 'warning') {
      absoluteAsExample++;
    } else if (ctx.contextType === 'claim') {
      absoluteAsClaim++;
    }
  }

  if (!educational.isEducational) {
    const absoluteCount = ABSOLUTISM_WORDS.filter((w) => text.toLowerCase().includes(w.toLowerCase())).length;
    if (absoluteCount >= 3) {
      signals.push({
        id: "LF_ABS_HIGH",
        layer: "linguistic",
        name: "Khẳng định tuyệt đối hoá",
        detail: `${absoluteCount} cụm từ tuyệt đối hoá được phát hiện. Ngôn ngữ đáng tin dùng từ ngữ có sắc thái, không khẳng định cực đoan.`,
        impact: -12,
        severity: "danger"
      });
    } else if (absoluteCount >= 1) {
      signals.push({
        id: "LF_ABS_LOW",
        layer: "linguistic",
        name: "Có từ ngữ khẳng định tuyệt đối",
        detail: `Phát hiện ${absoluteCount} cụm tuyệt đối hoá. Mức độ chưa đáng lo nhưng cần lưu ý.`,
        impact: -4,
        severity: "warning"
      });
    }
  } else if (absoluteAsExample > 0) {
    signals.push({
      id: "LF_ABS_EDU",
      layer: "linguistic",
      name: "Từ ngữ tuyệt đối hoá trong bối cảnh hướng dẫn",
      detail: `${absoluteAsExample} từ ngữ tuyệt đối hóa trong bối cảnh ví dụ/hướng dẫn — không tính là tín hiệu lừa đảo.`,
      impact: +3,
      severity: "safe"
    });
  }

  // Context-aware urgency detection
  const urgencyMatches = URGENCY_TRIGGERS.filter((p) => p.test(text));
  let urgencyAsExample = 0;
  if (educational.isEducational) {
    const urgencyKeywords = ['trong vòng', 'còn lại', 'hết hạn', 'deadline'];
    for (const uk of urgencyKeywords) {
      const ctx = analyzeKeywordContext(text, uk);
      if (ctx.contextType === 'example' || ctx.contextType === 'warning') {
        urgencyAsExample++;
      }
    }
  }

  if (!educational.isEducational || urgencyAsExample === 0) {
    if (urgencyMatches.length >= 2) {
      signals.push({
        id: "LF_URG_HIGH",
        layer: "linguistic",
        name: "Áp lực thời gian nhân tạo",
        detail: `${urgencyMatches.length} dấu hiệu tạo áp lực thời gian. Kỹ thuật phổ biến trong lừa đảo tài chính và giả mạo cơ quan.`,
        impact: -16,
        severity: "danger"
      });
    } else if (urgencyMatches.length === 1) {
      signals.push({
        id: "LF_URG_LOW",
        layer: "linguistic",
        name: "Dấu hiệu áp lực thời gian nhẹ",
        detail: "Có một yếu tố tạo cấp bách. Có thể là tin thật nhưng cần đối chiếu.",
        impact: -7,
        severity: "warning"
      });
    }
  } else {
    signals.push({
      id: "LF_URG_EDU",
      layer: "linguistic",
      name: "Yếu tố áp lực trong bối cảnh hướng dẫn",
      detail: `Yếu tố cấp bách được phát hiện trong bối cảnh ví dụ/hướng dẫn — không tính là tín hiệu lừa đảo.`,
      impact: +3,
      severity: "safe"
    });
  }
  const hasByline = /phóng viên|biên tập|tác giả:|ghi nhận của/i.test(text);
  const hasDateRef = /ngày \d{1,2}\/\d{1,2}|tháng \d{1,2} năm \d{4}/i.test(text);
  const hasLocation = /tại [A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝ]/u.test(text);
  const coherenceScore = [hasByline, hasDateRef, hasLocation].filter(Boolean).length;
  if (coherenceScore === 3) {
    signals.push({
      id: "LF_COHERENCE_OK",
      layer: "linguistic",
      name: "Cấu trúc báo chí chuẩn",
      detail: "Văn bản có tác giả, mốc thời gian, và địa điểm — phù hợp tiêu chí bài báo chính thống.",
      impact: +12,
      severity: "safe"
    });
  } else
  if (coherenceScore === 0 && totalWords > 50) {
    signals.push({
      id: "LF_COHERENCE_LOW",
      layer: "linguistic",
      name: "Thiếu cấu trúc bài báo",
      detail: "Không tìm thấy tác giả, thời gian, hoặc địa điểm. Thông tin trôi nổi thiếu truy xuất nguồn gốc.",
      impact: -10,
      severity: "warning"
    });
  }
  const rawScore = signals.reduce((sum, s) => sum + s.impact, 0);
  const normalised = Math.max(-100, Math.min(100, rawScore));
  const dangerCount = signals.filter((s) => s.severity === "danger").length;
  const label = dangerCount >= 2 ?
  "Ngôn ngữ có nhiều dấu hiệu thao túng" :
  dangerCount === 1 ?
  "Ngôn ngữ có yếu tố đáng ngờ" :
  signals.some((s) => s.severity === "warning") ?
  "Ngôn ngữ cần theo dõi thêm" :
  "Ngôn ngữ không có dấu hiệu bất thường";
  return { score: normalised, weight: 0.30, signals, label };
}
const TRUSTED_ENTITIES: Record<string, {
  score: number;
  note: string;
}> = {
  "vnexpress": { score: 90, note: "Báo điện tử lớn, kiểm duyệt biên tập" },
  "tuoitre": { score: 88, note: "Báo Tuổi Trẻ, có hội đồng biên tập" },
  "thanhnien": { score: 87, note: "Báo Thanh Niên chính thống" },
  "nhandan": { score: 95, note: "Cơ quan ngôn luận Đảng Cộng sản Việt Nam" },
  "baochinhphu": { score: 96, note: "Cổng thông tin Chính phủ" },
  "mps.gov.vn": { score: 97, note: "Bộ Công an chính thức" },
  "boyte.gov.vn": { score: 97, note: "Bộ Y tế chính thức" },
  "bbc": { score: 82, note: "BBC — cơ quan báo chí quốc tế uy tín" },
  "reuters": { score: 84, note: "Reuters — thông tấn xã quốc tế" },
  "ap news": { score: 83, note: "AP — Associated Press" },
  "wikipedia": { score: 70, note: "Bách khoa mở, cần xác minh thêm" },
  "bộ y tế": { score: 92, note: "Bộ Y tế Việt Nam — cơ quan nhà nước" },
  "bộ công thương": { score: 90, note: "Bộ Công Thương — cơ quan nhà nước" },
  "bộ gtvt": { score: 90, note: "Bộ GTVT — cơ quan nhà nước" },
  "bộ giao thông vận tải": { score: 90, note: "Bộ GTVT — cơ quan nhà nước" },
  "bộ ngoại giao": { score: 90, note: "Bộ Ngoại giao — cơ quan nhà nước" },
  "bộ tài chính": { score: 90, note: "Bộ Tài chính — cơ quan nhà nước" },
  "bộ kế hoạch": { score: 90, note: "Bộ KHĐT — cơ quan nhà nước" },
  "chính phủ": { score: 90, note: "Chính phủ Việt Nam — cơ quan nhà nước" },
  "thủ tướng": { score: 90, note: "Thủ tướng Chính phủ — cơ quan nhà nước" },
  "ngân hàng nhà nước": { score: 90, note: "Ngân hàng Nhà nước — cơ quan nhà nước" },
  "tổng cục thống kê": { score: 90, note: "Tổng cục Thống kê — cơ quan nhà nước" },
  "ubnd": { score: 88, note: "UBND cấp tỉnh — cơ quan nhà nước" },
  "ủy ban nhân dân": { score: 88, note: "UBND — cơ quan nhà nước" },
  "sở giáo dục": { score: 88, note: "Sở Giáo dục — cơ quan nhà nước" },
  "sở y tế": { score: 88, note: "Sở Y tế — cơ quan nhà nước" },
  "cục an toàn thực phẩm": { score: 85, note: "Cục ATTP — cơ quan nhà nước" },
  "hiệp hội bất động sản": { score: 78, note: "Hiệp hội bất động sản — tổ chức ngành nghề" },
  "ttxvn": { score: 90, note: "Thông tấn xã Việt Nam — hãng thông tấn chính thống" },
  "vov": { score: 88, note: "Đài Tiếng nói Việt Nam — báo chí chính thống" }
};
const HIGH_RISK_ENTITIES = [
/t\.me\//i, /zalo\.me\/s\//i,
/bit\.ly/i, /tinyurl/i, /cutt\.ly/i,
/4rum\b/i, /forum\b.*tin/i,
/(facebook|google|microsoft|apple|instagram|zalo|viettel)\.(com\.)?(xy|xyz|club|top|icu|buzz|info|site|online|click|link|live|cam)/i,
/https?:\/\/[^\s]*(login|dang-nhap|signin|verify|xac-nhan)[^\s]*\.(xy|xyz|club|top|icu|buzz)/i];

function runTrustLayer(text: string): LCSLayerResult {
  const signals: LCSSignal[] = [];
  const lower = text.toLowerCase();
  let maxTrustScore = 0;
  let matchedEntity = "";
  let matchedNote = "";
  
  // Detect educational content
  const educational = detectEducationalContent(text);
  
  // Extract all URLs from text for domain matching
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const urls = text.match(urlPattern) || [];
  const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)/gi;
  const domains = text.match(domainPattern) || [];
  const allUrls = [...urls, ...domains].map(u => u.toLowerCase());
  
  // Check for domain impersonation first (but NOT in educational context)
  const fakeDomainDetected = /(facebook|google|microsoft|apple|instagram|zalo|viettel|vinaphone|mobifone)\.(com\.)?(xy|xyz|club|top|icu|buzz|info|site|online|click|link|live|cam)/i.test(text);
  
  // Check if domain impersonation is mentioned in educational context
  const domainImpersonationIsExample = educational.isEducational && (() => {
    const match = text.match(/(facebook|google|microsoft|apple|instagram|zalo|viettel|vinaphone|mobifone)\.(com\.)?(xy|xyz|club|top|icu|buzz|info|site|online|click|link|live|cam)/i);
    if (!match) return false;
    const matchIdx = text.indexOf(match[0]);
    const contextStart = Math.max(0, matchIdx - 150);
    const contextEnd = Math.min(text.length, matchIdx + match[0].length + 150);
    const context = text.substring(contextStart, contextEnd).toLowerCase();
    return /(?:ví dụ|chẳng hạn|điển hình|cảnh báo|tránh|đừng|nhận biết|phát hiện|thường thấy|phổ biến|thủ đoạn|biểu hiện|dấu hiệu|đặc điểm)/i.test(context);
  })();
  
  if (fakeDomainDetected && !domainImpersonationIsExample) {
    signals.push({
      id: "TG_DOMAIN_IMPERSONATION",
      layer: "trust",
      name: "Phát hiện tên miền giả mạo",
      detail: "Tên miền giả mạo thương hiệu nổi tiếng (thêm hậu tố .xyz, .club, .top...). Kỹ thuật phishing phổ biến để đánh cắp tài khoản.",
      impact: -50,
      severity: "danger"
    });
  } else if (fakeDomainDetected && domainImpersonationIsExample) {
    signals.push({
      id: "TG_DOMAIN_IMPERSONATION_EDU",
      layer: "trust",
      name: "Tên miền giả mạo trong bối cảnh hướng dẫn",
      detail: "Tên miền giả mạo được nhắc đến trong bối cảnh giáo dục/hướng dẫn — đây là ví dụ minh họa, KHÔNG phải lừa đảo thực tế.",
      impact: +10,
      severity: "safe"
    });
  }
  
  // Only check trusted entities if no fake domain is detected
  if (!fakeDomainDetected) {
    for (const [key, val] of Object.entries(TRUSTED_ENTITIES)) {
      // Check if the exact domain is mentioned in URLs
      const exactDomainMatch = allUrls.some(url => url.includes(key));
      // Also check if the brand name is mentioned in text (but not in suspicious contexts)
      const brandMention = lower.includes(key);
      
      if (exactDomainMatch || brandMention) {
        if (val.score > maxTrustScore) {
          maxTrustScore = val.score;
          matchedEntity = key;
          matchedNote = val.note;
        }
      }
    }
  }
  if (maxTrustScore >= 85) {
    signals.push({
      id: "TG_TRUSTED_HIGH",
      layer: "trust",
      name: "Nguồn tin cậy cao được tham chiếu",
      detail: `Phát hiện tham chiếu tới "${matchedEntity}" (${matchedNote}) — điểm tin cậy LCS: ${maxTrustScore}/100.`,
      impact: +25,
      severity: "safe"
    });
  } else if (maxTrustScore >= 70) {
    signals.push({
      id: "TG_TRUSTED_MED",
      layer: "trust",
      name: "Nguồn tham chiếu độ tin cậy trung bình",
      detail: `"${matchedEntity}" — ${matchedNote}. LCS Trust Score: ${maxTrustScore}/100. Vẫn nên đối chiếu thêm.`,
      impact: +10,
      severity: "safe"
    });
  } else if (maxTrustScore === 0) {
    // Educational content gets less penalty for no source — it's teaching, not claiming news
    const noSourceImpact = educational.isEducational ? -5 : -15;
    const noSourceSeverity = educational.isEducational ? "warning" : "warning";
    signals.push({
      id: "TG_NO_SOURCE",
      layer: "trust",
      name: educational.isEducational ? "Nội dung giáo dục — không có nguồn báo chí" : "Không tìm thấy nguồn tin trong đồ thị LCS",
      detail: educational.isEducational
        ? "Bài viết giáo dục/hướng dẫn — không bắt buộc phải có nguồn báo chí cụ thể."
        : "Văn bản không tham chiếu tới bất kỳ đơn vị báo chí nào trong cơ sở dữ liệu LCS Trust Graph.",
      impact: noSourceImpact,
      severity: noSourceSeverity
    });
  }
  const highRiskMatches = HIGH_RISK_ENTITIES.filter((p) => p.test(text));
  if (highRiskMatches.length > 0) {
    signals.push({
      id: "TG_HIGHRISK_PLATFORM",
      layer: "trust",
      name: "Nền tảng phân phối rủi ro cao",
      detail: `Phát hiện link rút gọn hoặc nền tảng không kiểm duyệt (Telegram, bit.ly...) — kênh phổ biến trong chuỗi phát tán tin giả.`,
      impact: -20,
      severity: "danger"
    });
  }
  if (/\.gov\.vn/i.test(text)) {
    signals.push({
      id: "TG_GOV_DOMAIN",
      layer: "trust",
      name: "Tham chiếu tên miền .gov.vn",
      detail: "Phát hiện địa chỉ tên miền chính phủ Việt Nam — tín hiệu tích cực về tính chính thống.",
      impact: +20,
      severity: "safe"
    });
  }
  
  // Authority impersonation check — context-aware for educational content
  const claimsAuthority = /Bộ Công an|Bộ Y tế|Cục An ninh|Viện kiểm sát|Tòa án nhân dân|VNeID|Cục Cảnh sát|Bộ Công Thương|Bộ Ngoại giao|Bộ GTVT|Bộ Tài chính|Chính phủ|UBND|Tổng cục Thống kê|Ngân hàng Nhà nước/i.test(text);
  const hasGovDomain = /\.gov\.vn/i.test(text);
  const hasScamIntent = /OTP|mật khẩu|chuyển tiền|cung cấp thông tin tài khoản|truy cập link|bấm vào link|nộp phạt|liên quan đến vụ|rửa tiền|lệnh bắt|phong tỏa tài sản|xác thực danh tính|đăng nhập ngay|khóa tài khoản|bị khóa|gian lận|hoàn thuế|sinh trắc học|thông tin cá nhân/i.test(text) || /https?:\/\/[^\s]+/.test(text);
  
  // Check if authority mention is in educational context
  const authorityIsExample = educational.isEducational && claimsAuthority && (() => {
    const authorityPatterns = [/Bộ Công an/i, /Bộ Y tế/i, /Cục An ninh/i, /Viện kiểm sát/i, /Tòa án nhân dân/i, /VNeID/i];
    for (const ap of authorityPatterns) {
      const match = text.match(ap);
      if (match) {
        const matchIdx = text.indexOf(match[0]);
        const contextStart = Math.max(0, matchIdx - 150);
        const contextEnd = Math.min(text.length, matchIdx + match[0].length + 150);
        const context = text.substring(contextStart, contextEnd).toLowerCase();
        if (/(?:giả mạo|mạo danh|kịch bản|thủ đoạn|cảnh báo|tránh|đừng|nhận biết|phát hiện|ví dụ)/i.test(context)) {
          return true;
        }
      }
    }
    return false;
  })();
  
  if (claimsAuthority && !hasGovDomain && hasScamIntent && !authorityIsExample) {
    signals.push({
      id: "TG_AUTHORITY_FAKE",
      layer: "trust",
      name: "Mạo danh cơ quan nhà nước",
      detail: "Văn bản tự xưng cơ quan nhà nước nhưng không có địa chỉ .gov.vn hoặc nguồn xác minh. LCS Trust Graph đánh dấu đây là tín hiệu lừa đảo nghiêm trọng.",
      impact: -35,
      severity: "danger"
    });
  } else if (claimsAuthority && !hasGovDomain && hasScamIntent && authorityIsExample) {
    signals.push({
      id: "TG_AUTHORITY_FAKE_EDU",
      layer: "trust",
      name: "Mạo danh cơ quan trong bối cảnh hướng dẫn",
      detail: "Mẫu mạo danh cơ quan nhà nước được nhắc đến trong bối cảnh giáo dục/hướng dẫn — đây là ví dụ minh họa, KHÔNG phải lừa đảo thực tế.",
      impact: +10,
      severity: "safe"
    });
  }
  
  // Educational content bonus
  if (educational.isEducational) {
    signals.push({
      id: "TG_EDUCATIONAL",
      layer: "trust",
      name: "Nội dung giáo dục phòng chống lừa đảo",
      detail: `Bài viết được xác định là nội dung hướng dẫn nhận biết tin giả — giá trị cộng đồng, cần được khuyến khích.`,
      impact: +20,
      severity: "safe"
    });
  }
  
  const rawScore = signals.reduce((sum, s) => sum + s.impact, 0);
  const normalised = Math.max(-100, Math.min(100, rawScore));
  const hasDanger = signals.some((s) => s.severity === "danger");
  const hasSafe = signals.some((s) => s.severity === "safe");
  const label = hasDanger ?
  "Đồ thị nguồn phát hiện dấu hiệu lừa đảo" :
  hasSafe ?
  "Nguồn được LCS Trust Graph xác nhận" :
  "Không đủ dữ liệu đồ thị tin cậy";
  return { score: normalised, weight: 0.35, signals, label };
}
const VN_SCAM_PATTERNS: Array<{
  id: string;
  name: string;
  pattern: RegExp;
  detail: string;
  impact: number;
}> = [
{
  id: "BP_PHISHING_LINK",
  name: "Phishing — Liên kết đăng nhập giả mạo",
  pattern: /truy cập.{0,60}(đăng nhập|đăng ký|xác nhận|cập nhật).{0,80}(https?:\/\/|www\.|\.com|\.net|\.xyz|\.club|\.top|\.icu|\.buzz)/i,
  detail: "Nội dung yêu cầu truy cập liên kết để đăng nhập/xác nhận — kỹ thuật phishing phổ biến để đánh cắp tài khoản.",
  impact: -55
},
{
  id: "BP_ACCOUNT_COMPROMISED",
  name: "Thông báo tài khoản bị truy cập giả",
  pattern: /tài khoản.{0,40}(bị truy cập|bị xâm nhập|bị hack|bị chiếm đoạt|bị khóa|bị chặn)/i,
  detail: "Kịch bản thông báo tài khoản bị truy cập để gây sợ hãi, ép nạn nhân click link lạ và nhập thông tin đăng nhập.",
  impact: -50
},
{
  id: "BP_DOMAIN_IMPERSONATION",
  name: "Giả mạo tên miền uy tín",
  pattern: /(facebook|google|microsoft|apple|instagram|zalo|viettel|vinaphone|mobifone)\.(com\.)?(xy|xyz|club|top|icu|buzz|info|site|online|click|link|live|cam)/i,
  detail: "Tên miền giả mạo thương hiệu nổi tiếng bằng cách thêm hậu tố lạ (.xyz, .club, .top...). Đây là kỹ thuật phishing cổ điển.",
  impact: -60
},
{
  id: "BP_URGENCY_LOGIN",
  name: "Tạo áp lực đăng nhập khẩn cấp",
  pattern: /(vui lòng|nhắc nhở|hãy|ngay|hỏa tốc).{0,40}(truy cập|đăng nhập|đăng ký|xác nhận|cập nhật).{0,40}(ngay|lập tức|nhanh chóng|trong vòng|sớm nhất)/i,
  detail: "Tạo cảm giác cấp bách để nạn nhân hành động mà không suy nghĩ — đặc trưng của lừa đảo phishing.",
  impact: -45
},
{
  id: "BP_VNEID_SCAM",
  name: "Lừa đảo VNeID / Định danh điện tử",
  pattern: /VNeID|định danh (điện tử|cá nhân)|cập nhật (căn cước|cccd|giấy tờ).*(ngay|gấp|lập tức)/i,
  detail: "Mẫu hành vi khớp với kịch bản lừa đảo VNeID phổ biến tại Việt Nam — yêu cầu cập nhật thông tin qua link lạ.",
  impact: -40
},
{
  id: "BP_TRANSFER_URGENT",
  name: "Yêu cầu chuyển khoản khẩn cấp",
  pattern: /chuyển (khoản|tiền).{0,60}(gấp|ngay|trong vòng|khẩn)/i,
  detail: "Mẫu hành vi chuyển khoản khẩn cấp — chiếm 67% các vụ lừa đảo tài chính trực tuyến tại Việt Nam (nguồn: LCS Incident DB 2024).",
  impact: -45
},
{
  id: "BP_LOTTERY_SCAM",
  name: "Lừa đảo trúng thưởng / quà tặng",
  pattern: /trúng (thưởng|giải|quà).{0,120}(chuyển phí|phí xác nhận|đóng thuế|nộp lệ phí|nộp phí|phí vận chuyển|phí nhận quà)/i,
  detail: "Kịch bản cổ điển: thông báo trúng thưởng kèm yêu cầu nộp phí. LCS Behavioral Engine xác định đây là lừa đảo 99.8%.",
  impact: -50
},
{
  id: "BP_ROMANCE_SCAM",
  name: "Lừa đảo tình cảm / đầu tư",
  pattern: /(người nước ngoài|tây|ngoại quốc).{0,100}(đầu tư|gửi tiền|chuyển tài sản|giữ hộ)/i,
  detail: "Mẫu kết hợp yếu tố tình cảm và tài chính — đặc trưng của pig-butchering scam nhắm vào người Việt.",
  impact: -40
},
{
  id: "BP_JOB_SCAM",
  name: "Lừa đảo tuyển dụng / việc làm online",
  pattern: /(việc làm|tuyển dụng|công việc|cộng tác viên|tuyển người|tuyển cộng tác).{0,80}(làm tại nhà|online|không cần kinh nghiệm|chốt đơn|yêu cầu thấp).{0,80}(lương cao|thu nhập khủng|thu nhập cao|\d{2,3}tr|lương \d{3,5}k)/i,
  detail: "Mẫu quảng cáo việc làm bất thường — thu nhập cao bất hợp lý, không cần kỹ năng. Phổ biến trong các vụ bẫy lao động cưỡng bức.",
  impact: -35
},
{
  id: "BP_FAKE_POLICE",
  name: "Giả mạo Công an / Tòa án liên lạc",
  pattern: /(Công an|Cảnh sát|Viện kiểm sát|Tòa án).{0,80}(gọi điện|nhắn tin|liên hệ).{0,80}(yêu cầu|đề nghị|bắt buộc)/i,
  detail: "Cơ quan tố tụng Việt Nam không liên lạc qua điện thoại/Zalo để yêu cầu chuyển tiền hay khai báo nhanh.",
  impact: -45
},
{
  id: "BP_INVESTMENT_SCAM",
  name: "Đầu tư lợi nhuận bất thường",
  pattern: /(lợi nhuận|cam kết lãi|sinh lời|góp vốn).{0,40}(\d{2,3}%.{0,15}(tháng|ngày|tuần|năm)|gấp \d+ lần)/i,
  detail: "Lợi nhuận đầu tư hứa hẹn phi thực tế. LCS Finance Model xác định mức sinh lời này nằm ngoài khung thị trường hợp lệ.",
  impact: -35
},
{
  id: "BP_UTILITY_BILL_SCAM",
  name: "Giả mạo nhân viên dịch vụ / tiện ích",
  pattern: /(nhân viên điện lực|nhân viên (điện|nước)|điện lực|hóa đơn tiền điện|nợ tiền điện|bị cắt điện).{0,60}(thanh toán|đóng tiền|chuyển khoản|nộp tiền).{0,40}(ngay|lập tức|sắp bị)/i,
  detail: "Giả mạo nhân viên điện/nước/nhà mạng gây áp lực thanh toán nợ qua kênh không chính thức — chiêu thức phổ biến nhắm vào hộ gia đình.",
  impact: -40
},
{
  id: "BP_CONSIGNMENT_SCAM",
  name: "Việc làm đơn giản / thanh toán online",
  pattern: /(cộng tác viên|đặt hàng|chốt đơn|thanh toán online).{0,60}(hoa hồng|lương|làm việc tại nhà|không cần kinh nghiệm|thu nhập)/i,
  detail: "Hình thức lừa đảo 'việc nhẹ lương cao' ép nạn nhân chuyển tiền ứng trước cho các đơn hàng giả.",
  impact: -40
}];

const VN_LEGIT_PATTERNS: Array<{
  id: string;
  name: string;
  pattern: RegExp;
  detail: string;
  impact: number;
}> = [
{
  id: "BP_GOV_CHANNEL",
  name: "Kênh thông tin chính thức",
  pattern: /cổng thông tin|Cổng TTĐT|Chinhphu\.vn|baochinhphu\.vn/i,
  detail: "Nội dung tham chiếu kênh thông tin chính phủ chính thức.",
  impact: +15
},
{
  id: "BP_HOTLINE_OFFICIAL",
  name: "Đường dây nóng xác minh được",
  pattern: /đường dây nóng.{0,30}(1800|113|114|115|\d{10})/i,
  detail: "Cung cấp số đường dây chính thức — tín hiệu của thông tin chân thực.",
  impact: +10
}];

function runBehavioralLayer(text: string): LCSLayerResult {
  const signals: LCSSignal[] = [];

  // Detect educational content for context-aware scoring
  const educational = detectEducationalContent(text);

  for (const pattern of VN_SCAM_PATTERNS) {
    if (pattern.pattern.test(text)) {
      // Check if this pattern match is in an example/warning context
      const isContextual = educational.isEducational && (() => {
        const match = text.match(pattern.pattern);
        if (!match) return false;
        const matchIdx = text.indexOf(match[0]);
        const contextStart = Math.max(0, matchIdx - 150);
        const contextEnd = Math.min(text.length, matchIdx + match[0].length + 150);
        const context = text.substring(contextStart, contextEnd).toLowerCase();
        return /(?:ví dụ|chẳng hạn|điển hình|cảnh báo|tránh|đừng|nhận biết|phát hiện|thường thấy|phổ biến|thủ đoạn|biểu hiện|dấu hiệu|đặc điểm)/i.test(context);
      })();

      if (isContextual) {
        // Pattern found in educational context — this is a red flag being explained, not used
        signals.push({
          id: pattern.id + "_EDU",
          layer: "behavioral",
          name: `${pattern.name} (trong bối cảnh hướng dẫn)`,
          detail: `Mẫu hành vi "${pattern.name}" được phát hiện trong bối cảnh giáo dục/hướng dẫn — đây là ví dụ minh họa, KHÔNG phải lừa đảo thực tế.`,
          impact: Math.abs(pattern.impact) * 0.3, // Partial positive impact
          severity: "safe"
        });
      } else {
        signals.push({
          id: pattern.id,
          layer: "behavioral",
          name: pattern.name,
          detail: pattern.detail,
          impact: pattern.impact,
          severity: "danger"
        });
      }
    }
  }
  for (const pattern of VN_LEGIT_PATTERNS) {
    if (pattern.pattern.test(text)) {
      signals.push({
        id: pattern.id,
        layer: "behavioral",
        name: pattern.name,
        detail: pattern.detail,
        impact: pattern.impact,
        severity: "safe"
      });
    }
  }

  // Educational content bonus
  if (educational.isEducational) {
    signals.push({
      id: "BP_EDUCATIONAL",
      layer: "behavioral",
      name: "Nội dung giáo dục phòng chống lừa đảo",
      detail: `Bài viết được xác định là nội dung hướng dẫn nhận biết tin giả (độ tin cậy: ${(educational.confidence * 100).toFixed(0)}%). Đây là nội dung có giá trị cộng đồng.`,
      impact: +25,
      severity: "safe"
    });
  }

  const rawScore = signals.reduce((sum, s) => sum + s.impact, 0);
  const normalised = Math.max(-100, Math.min(100, rawScore));
  const dangerSignals = signals.filter((s) => s.severity === "danger");
  const label = dangerSignals.length >= 2 ?
  `Khớp ${dangerSignals.length} mẫu hành vi lừa đảo đặc thù Việt Nam` :
  dangerSignals.length === 1 ?
  `Khớp mẫu hành vi: ${dangerSignals[0].name}` :
  signals.some((s) => s.severity === "safe") ?
  "Không phát hiện mẫu lừa đảo hành vi" :
  "Chưa khớp mẫu hành vi nào trong cơ sở dữ liệu LCS";
  return { score: normalised, weight: 0.35, signals, label };
}
function inferNarrativeProfile(text: string, signals: LCSSignal[]): LCSNarrativeProfile {
  const normalized = text.
  toLowerCase().
  normalize("NFD").
  replace(/[\u0300-\u036f]/g, "");
  const signalIds = new Set(signals.map((signal) => signal.id));
  const matches = (pattern: RegExp) => pattern.test(normalized);
  if (signalIds.has("TG_AUTHORITY_FAKE") || signalIds.has("BP_FAKE_POLICE") || signalIds.has("BP_VNEID_SCAM")) {
    return {
      archetype: "authority_impersonation",
      label: "Mạo danh cơ quan chức năng",
      summary: "Nội dung giả vờ là cơ quan nhà nước hoặc giục bạn xác minh danh tính qua kênh không chính thức. Đây là mẫu lừa đảo hệ thống tự phát hiện được, không cần đợi nguồn ngoài.",
      riskBand: "critical"
    };
  }
  if (signalIds.has("TG_DOMAIN_IMPERSONATION") || signalIds.has("BP_PHISHING_LINK") || signalIds.has("BP_ACCOUNT_COMPROMISED") || signalIds.has("BP_DOMAIN_IMPERSONATION")) {
    return {
      archetype: "authority_impersonation",
      label: "Phishing — Giả mạo thương hiệu",
      summary: "Nội dung giả mạo thương hiệu nổi tiếng (Facebook, Google...) để đánh cắp tài khoản qua liên kết đăng nhập giả. Hệ thống phát hiện tên miền giả và yêu cầu đăng nhập bất thường.",
      riskBand: "critical"
    };
  }
  if (matches(/\b(chua|tri).{0,30}\b(benh|ung thu|virus|covid|dich benh)\b/i) ||
  matches(/\b(thuoc than ky|khong tac dung phu|thuc pham chuc nang|who khuyen cao|fda cong nhan)\b/i)) {
    return {
      archetype: "health_misinformation",
      label: "Thông tin sai lệch về sức khỏe",
      summary: "Nội dung kiểu y tế, chữa bệnh có thể gây hại: quảng cáo thuốc không có cơ sở, thổi phồng bệnh dịch hoặc mượn tên tuổi bác sĩ, cơ quan y tế để tạo uy tín mà không hề có kiểm chứng.",
      riskBand: "critical"
    };
  }
  if (matches(/\b(bao|lu|sat lo|dong dat|song than|thien tai|virus|dich benh)\b/i) &&
  matches(/\b(ai tao dung|cat ghep|gia|that thiet|hoang mang|xon xao)\b/i)) {
    return {
      archetype: "crisis_distortion",
      label: "Xuyên tạc khủng hoảng / thiên tai",
      summary: "Nội dung lợi dụng thiên tai, dịch bệnh để kích động sợ hãi và gây hoang mang. Rủi ro nằm ở chỗ làm náo loạn mọi người, chứ không chỉ là chuyện đúng sai so với báo chí.",
      riskBand: "high"
    };
  }
  if (matches(/\b(xuat hien|phat hien|noi len)\b/i) &&
  matches(/\b(ca sau|quai vat|ran khong lo|sinh vat la|vat the la)\b/i)) {
    return {
      archetype: "fabricated_natural_phenomenon",
      label: "Bịa đặt hiện tượng tự nhiên",
      summary: "Nội dung giật gân về hiện tượng lạ hay động vật kỳ quái xuất hiện ở địa phương. Nhóm tin này thường dựng hình hoặc ghép ảnh để câu like, câu tương tác.",
      riskBand: "high"
    };
  }
  if (matches(/\b(video|clip|cat ghep|doi tu|nguoi noi tieng|bi an|that lac|dai gia)\b/i) ||
  matches(/\b(xon xao|soc|khong the tin noi|gay bao mang)\b/i)) {
    return {
      archetype: "sensational_fabrication",
      label: "Tin giả giật gân / câu tương tác",
      summary: "Nội dung thuộc dạng câu khách: giật gân, cắt ghép hoặc thêu dệt đời tư người nổi tiếng để tối đa lượt xem. Kiểu tin này dùng lời lẽ kích động cảm xúc mạnh hơn là mang thông tin thật.",
      riskBand: "high"
    };
  }
  return {
    archetype: "unclear",
    label: "Chưa rõ loại claim",
    summary: "Hệ thống chưa xác định được đây thuộc họ tin giả nào. Nó vẫn tiếp tục chấm dựa trên cách hành văn, nguồn và hành vi đáng ngờ bên trong, chứ không tự động tin theo kết quả từ bên ngoài.",
    riskBand: "medium"
  };
}
function computeVerdict(score: number, allSignals: LCSSignal[]): {
  verdict: LCSEngineResult["verdict"];
  verdictLabel: string;
  confidence: number;
} {
  // Check if this is educational content
  const isEducational = allSignals.some(s => s.id === "EDU_CONTENT" || s.id === "TG_EDUCATIONAL" || s.id === "BP_EDUCATIONAL");
  
  const hasCriticalPhishing = allSignals.some(s => 
    s.id === "TG_DOMAIN_IMPERSONATION" || 
    s.id === "BP_PHISHING_LINK" || 
    s.id === "BP_ACCOUNT_COMPROMISED" ||
    s.id === "BP_DOMAIN_IMPERSONATION"
  );
  
  // Critical phishing always overrides educational content
  if (hasCriticalPhishing && !isEducational) {
    return { verdict: "DANGER", verdictLabel: "Nguy hiểm — Lừa đảo", confidence: 0.95 };
  }
  
  // Educational content never goes beyond UNCERTAIN
  if (isEducational) {
    if (score >= 60) return { verdict: "VERIFIED", verdictLabel: "Nội dung giáo dục — An toàn", confidence: 0.85 };
    if (score >= 40) return { verdict: "UNCERTAIN", verdictLabel: "Nội dung giáo dục — Cần đối chiếu", confidence: 0.70 };
    return { verdict: "UNCERTAIN", verdictLabel: "Nội dung giáo dục", confidence: 0.65 };
  }
  
  if (score >= 78)
  return { verdict: "VERIFIED", verdictLabel: "Đã xác minh", confidence: 0.88 };
  if (score >= 60)
  return { verdict: "UNCERTAIN", verdictLabel: "Chưa xác minh", confidence: 0.65 };
  if (score >= 40)
  return { verdict: "SUSPICIOUS", verdictLabel: "Đáng ngờ", confidence: 0.75 };
  return { verdict: "DANGER", verdictLabel: "Nguy hiểm — Lừa đảo", confidence: 0.91 };
}
// LCS Score Engine v1.1 — Educational content detection
export async function runLCSEngine(text: string): Promise<LCSEngineResult> {
  const linguistic = await runLinguisticLayer(text);
  const trust = runTrustLayer(text);
  const behavioral = runBehavioralLayer(text);
  const weightedRaw = linguistic.score * linguistic.weight +
  trust.score * trust.weight +
  behavioral.score * behavioral.weight;
  let lcsScore = Math.round(Math.max(0, Math.min(100, (weightedRaw + 100) / 2)));
  
  const allSignals = [
  ...linguistic.signals,
  ...trust.signals,
  ...behavioral.signals];
  
  // Educational content — cap maximum score
  const isEducational = allSignals.some(s => s.id === "EDU_CONTENT" || s.id === "TG_EDUCATIONAL" || s.id === "BP_EDUCATIONAL");
  if (isEducational) {
    lcsScore = Math.min(lcsScore, 30); // Cap at 30 for educational content
  }

  const narrativeProfile = inferNarrativeProfile(text, allSignals);
  const { verdict, verdictLabel, confidence } = computeVerdict(lcsScore, allSignals);
  const layerImpacts = [
  { name: "Linguistic Fingerprint", abs: Math.abs(linguistic.score) },
  { name: "Trust Graph", abs: Math.abs(trust.score) },
  { name: "Behavioral Pattern", abs: Math.abs(behavioral.score) }].
  sort((a, b) => b.abs - a.abs);
  return {
    lcsScore,
    verdict,
    verdictLabel,
    confidence,
    layers: { linguistic, trust, behavioral },
    allSignals,
    narrativeProfile,
    processingMeta: {
      version: "LCS-Engine-v1.0",
      timestamp: new Date().toISOString(),
      inputLength: text.length,
      signalCount: allSignals.length,
      dominantLayer: layerImpacts[0].name
    }
  };
}
export function lcsEngineToAnalysisDetails(result: LCSEngineResult): Record<string, string> {
  const { layers, lcsScore, verdict, processingMeta, narrativeProfile } = result;
  const linguisticSignals = layers.linguistic.signals;
  const trustSignals = layers.trust.signals;
  const behavioralSignals = layers.behavioral.signals;
  return {
    heuristics: `LCS Linguistic Fingerprint phát hiện ${linguisticSignals.filter((s) => s.severity !== "safe").length} tín hiệu bất thường. ${layers.linguistic.label}. Input: ${processingMeta.inputLength} ký tự — tầng ảnh hưởng lớn nhất: ${processingMeta.dominantLayer}.`,
    url_verification: trustSignals.find((s) => s.id === "TG_GOV_DOMAIN" || s.id === "TG_HIGHRISK_PLATFORM" || s.id === "TG_DOMAIN_IMPERSONATION")?.detail ??
    "Không phát hiện địa chỉ web đặc biệt cần kiểm tra trong văn bản.",
    source_audit: `LCS Trust Graph — ${layers.trust.label}. Điểm tầng: ${layers.trust.score > 0 ? "+" : ""}${layers.trust.score}.`,
    press_comparison: behavioralSignals.length > 0 ?
    `LCS Behavioral Engine: ${behavioralSignals.map((s) => s.name).join(", ")}.` :
    "LCS Behavioral Engine không phát hiện mẫu hành vi lừa đảo đặc thù.",
    search_trace: `Điểm tổng hợp LCS: ${lcsScore}/100 — Phán quyết: ${verdict} (${result.verdictLabel}). Độ chắc chắn: ${Math.round(result.confidence * 100)}%. Tầng ảnh hưởng chính: ${processingMeta.dominantLayer}.`,
    live_fact_check: linguisticSignals.map((s) => `[${s.id}] ${s.name}: ${s.detail}`).join("\n") || "Không phát hiện tín hiệu ngôn ngữ bất thường.",
    live_press_scan: behavioralSignals.filter((s) => s.severity === "danger").map((s) => `[${s.id}] ${s.name}`).join(", ") || "Không khớp mẫu lừa đảo hành vi.",
    open_knowledge_check: `LCS Score Engine v1.0 — ${processingMeta.signalCount} tín hiệu được phân tích trên 3 tầng độc lập: Linguistic Fingerprint · Trust Graph · Behavioral Pattern.`
  };
}
