import express from "express";
import threatDetection from "../server/services/threatDetection.js";
import linkAnalysis from "../server/services/linkAnalysis.js";
import factCheckService from "../server/services/factCheckService.js";

export const config = {
  runtime: "nodejs",
  api: {
    bodyParser: false // Tắt bodyParser mặc định của Vercel để hỗ trợ stream raw body mượt mà
  }
};

// Cấu hình URL Backend Vietnix và Secret Key kết nối
const BACKEND_URL = (process.env.LCS_BACKEND_URL || "").replace(/\/+$/, "");
const BACKEND_SECRET = process.env.LCS_BACKEND_SECRET || "";

const app = express();

// Middleware hỗ trợ parse JSON cho các endpoint xử lý nội bộ trên Vercel
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// 1. Check Domain Cờ Bạc / Lừa Đảo
app.post("/api/check-domain", (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "Missing url input" });
    const isGambling = threatDetection.isGamblingDomainInput(url);
    return res.json({ isGambling });
  } catch (err) {
    return res.status(500).json({ error: "Check domain failed", details: err.message });
  }
});

// 2. Phân Tích Văn Bản Bằng Từ Khóa / Mẫu Câu Lừa Đảo Cục Bộ
app.post("/api/analyze-text", (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text input" });
    const matches = threatDetection.analyzeTextByKeywords(text) || [];
    const contactFindings = threatDetection.detectContactScam(text) || [];
    return res.json({ matches: [...matches, ...contactFindings] });
  } catch (err) {
    return res.status(500).json({ error: "Analyze text failed", details: err.message });
  }
});

// 3. Phân Tích Liên Kết Chi Tiết
app.post("/api/analyze-link", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "Missing url input" });

    const startTime = Date.now();
    const isGambling = threatDetection.isGamblingDomainInput(url);
    const result = await linkAnalysis.analyzeLink(url);

    if (isGambling && !result.reasons.some((r) => r.id === "LINK_GAMBLING")) {
      result.reasons.unshift({
        id: "LINK_GAMBLING",
        name: "CỜ BẠC / CÁ CƯỢC LỪA ĐẢO",
        detail: "Tên miền nằm trong danh sách đen cờ bạc lừa đảo của Lá Chắn Số.",
        status: "danger",
        scoreDelta: -80
      });
      result.score = Math.max(0, result.score - 80);
    }

    return res.json({
      success: true,
      ...result,
      isGambling,
      executionTimeMs: Date.now() - startTime
    });
  } catch (e) {
    console.error("[API Vercel] Lỗi analyze-link:", e.message);
    return res.status(500).json({ error: "Internal server error during link analysis" });
  }
});

// 4. Kiểm Tra Sự Thật Cục Bộ
app.post("/api/fact-check", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text input" });
    const result = await factCheckService.checkFact(text);
    return res.json(result);
  } catch (e) {
    console.error("[API Vercel] Lỗi FactCheck:", e.message);
    return res.status(500).json({ error: "Internal server error during fact check" });
  }
});

// 5. Kiểm Tra Trạng Thái Hệ Thống AI
app.get("/api/ai/status", (req, res) => {
  return res.json({
    status: "OK",
    data: {
      backend: "serverless-lite",
      ollama: { available: false },
      deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
      enabled: Boolean(process.env.DEEPSEEK_API_KEY)
    }
  });
});

// 6. Cache Tin Tức Mặc Định
app.get("/api/cached-news", (req, res) => {
  return res.json({ status: "OK", data: [] });
});

// Danh Sách Các Endpoints Nặng & Proxy Cần Chuyển Tiếp Sang Backend Vietnix
const HEAVY_PREFIXES = [
  "/api/verify-news",
  "/api/full-scan",
  "/api/verify-nli",
  "/api/proxy"
];

// Hàm Đọc Stream Body Chuẩn Cho Vercel Serverless
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Hàm Forward Request Sang Backend Vietnix
async function forwardToBackend(req, res) {
  if (!BACKEND_URL) {
    return res.status(503).json({
      error: "Backend Vietnix chưa được cấu hình. Vui lòng thêm LCS_BACKEND_URL trên Vercel."
    });
  }

  // Lấy chính xác path và query string
  const fullUrl = req.url || "";
  const queryIndex = fullUrl.indexOf("?");
  const path = queryIndex >= 0 ? fullUrl.slice(0, queryIndex) : fullUrl;
  const query = queryIndex >= 0 ? fullUrl.slice(queryIndex) : "";

  // Tạo Header gửi tới Vietnix Backend
  const forwardHeaders = {
    "content-type": req.headers["content-type"] || "application/json",
    accept: req.headers["accept"] || "application/json, text/plain, */*",
    "x-lcs-backend-secret": BACKEND_SECRET,
    "user-agent": req.headers["user-agent"] || "lachanso-vercel-proxy",
    "x-forwarded-for": req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""
  };

  try {
    const rawBody = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
      ? await readRawBody(req)
      : undefined;

    const targetUrl = `${BACKEND_URL}${path}${query}`;

    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: rawBody,
      signal: AbortSignal.timeout(60000) // Timeout 60 giây cho các tác vụ phân tích AI nặng
    });

    // Trả Header & Status Code từ Vietnix về lại cho Client
    res.status(upstreamResponse.status);
    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    res.setHeader("cache-control", upstreamResponse.headers.get("cache-control") || "no-store");

    const responseData = await upstreamResponse.text();
    return res.send(responseData);
  } catch (error) {
    console.error("[Vercel Proxy] Lỗi kết nối tới Backend Vietnix:", error.message);
    return res.status(502).json({
      error: "Không thể kết nối tới máy chủ Vietnix",
      details: error.message
    });
  }
}

// Entrypoint Chính Cho Vercel Serverless Function
export default async function handler(req, res) {
  const urlPath = (req.url || "").split("?")[0];

  // Kiểm tra nếu route khớp với danh sách Nặng / Proxy -> Forward sang Vietnix
  const isHeavyOrProxy = HEAVY_PREFIXES.some(
    (prefix) => urlPath === prefix || urlPath.startsWith(prefix + "/") || urlPath.startsWith(prefix + "?")
  );

  if (isHeavyOrProxy) {
    return forwardToBackend(req, res);
  }

  // Nếu là request nhẹ -> Parse body và cho Express xử lý local
  if (["POST", "PUT", "PATCH"].includes(req.method) && !req.body) {
    try {
      const raw = await readRawBody(req);
      if (raw.length > 0) {
        req.body = JSON.parse(raw.toString("utf-8"));
      }
    } catch {
      req.body = {};
    }
  }

  return app(req, res);
}