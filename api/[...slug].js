import express from "express";
import threatDetection from "../server/services/threatDetection.js";
import linkAnalysis from "../server/services/linkAnalysis.js";
import factCheckService from "../server/services/factCheckService.js";
import apiProxy from "../server/services/apiProxy.js";

export const config = {
  runtime: "nodejs",
  api: {
    bodyParser: false
  }
};

const BACKEND_URL = (process.env.LCS_BACKEND_URL || "").replace(/\/+$/, "");
const BACKEND_SECRET = process.env.LCS_BACKEND_SECRET || "";

// ============ RATE LIMITING (in-memory per instance) ============
const rateLimitBuckets = new Map();
function rateLimiter(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = req.headers["x-real-ip"] || req.socket?.remoteAddress || req.ip || "unknown";
    const now = Date.now();
    let bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateLimitBuckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      return res.status(429).json({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." });
    }
    next();
  };
}
const throttleAnalysis = rateLimiter(10, 60 * 1000);
const throttleGeneral = rateLimiter(30, 60 * 1000);

// Cleanup old buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}, 5 * 60 * 1000);

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ============ SECURITY HEADERS ============
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// 1. Check Domain Cờ Bạc / Lừa Đảo
app.post("/api/check-domain", throttleGeneral, (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "Missing url input" });
    const isGambling = threatDetection.isGamblingDomainInput(url);
    return res.json({ isGambling });
  } catch (err) {
    return res.status(500).json({ error: "Check domain failed", details: err.message });
  }
});

// 2. Phân Tích Văn Bản
app.post("/api/analyze-text", throttleGeneral, (req, res) => {
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
app.post("/api/analyze-link", throttleAnalysis, async (req, res) => {
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
app.post("/api/fact-check", throttleGeneral, async (req, res) => {
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

// 5. Proxy API Cào Báo Trực Tiếp Ngay Trên Vercel (Nếu không dùng Backend Vietnix)
app.all("/api/proxy/*", (req, res) => {
  try {
    if (apiProxy && typeof apiProxy.handleProxy === "function") {
      return apiProxy.handleProxy(req, res);
    }
    return res.status(404).json({ error: "Proxy handler not found" });
  } catch (err) {
    return res.status(500).json({ error: "Proxy execution error", details: err.message });
  }
});

// 6. Trạng Thái AI (không lộ chi tiết infrastructure)
app.get("/api/ai/status", throttleGeneral, (req, res) => {
  return res.json({
    status: "OK"
  });
});

app.get("/api/cached-news", (req, res) => {
  return res.json({ status: "OK", data: [] });
});

// Danh Sách Endpoint Nặng Bắt Buộc Cần Chuyển Tiếp Sang Backend Vietnix
const HEAVY_PREFIXES = [
  "/api/verify-news",
  "/api/full-scan",
  "/api/verify-comprehensive",
  "/api/verify-fast",
  "/api/verify-nli",
  "/api/proxy"
];

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function forwardToBackend(req, res) {
  if (!BACKEND_URL) {
    return res.status(200).json({
      success: false,
      fallback: true,
      message: "Backend Vietnix chưa kết nối. Sử dụng bộ phân tích Lite trên Client."
    });
  }

  const fullUrl = req.url || "";
  const queryIndex = fullUrl.indexOf("?");
  const path = queryIndex >= 0 ? fullUrl.slice(0, queryIndex) : fullUrl;
  const query = queryIndex >= 0 ? fullUrl.slice(queryIndex) : "";

  const forwardHeaders = {
    "content-type": req.headers["content-type"] || "application/json",
    accept: req.headers["accept"] || "application/json, text/plain, */*",
    "x-lcs-backend-secret": BACKEND_SECRET,
    "user-agent": req.headers["user-agent"] || "lachanso-vercel-proxy"
  };

  // Use Vercel's verified client IP, not user-supplied X-Forwarded-For
  const clientIp = req.headers["x-real-ip"] || req.socket?.remoteAddress;
  if (clientIp) {
    forwardHeaders["x-forwarded-for"] = clientIp;
  }

  try {
    const rawBody = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
      ? await readRawBody(req)
      : undefined;

    const targetUrl = `${BACKEND_URL}${path}${query}`;

    // Tăng tốc Timeout ngắt ở 25s cho comprehensive verification
    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: rawBody,
      signal: AbortSignal.timeout(25000)
    });

    const contentType = upstreamResponse.headers.get("content-type");
    const responseData = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      console.warn(`[Vercel Proxy] Upstream status ${upstreamResponse.status} for ${path}`);
    }

    res.status(upstreamResponse.status);
    if (contentType) res.setHeader("content-type", contentType);
    res.setHeader("cache-control", upstreamResponse.headers.get("cache-control") || "no-store");

    return res.send(responseData);
  } catch (error) {
    console.error("[Vercel Proxy] Lỗi kết nối/Timeout Vietnix:", error.message);
    
    // Trả về JSON Fallback thay vì mã lỗi 502/504 để tránh vỡ giao diện Client
    return res.status(200).json({
      success: false,
      fallback: true,
      error: "Backend Vietnix phản hồi chậm hoặc đang bận.",
      details: error.message,
      pressMatrix: [],
      verdict: {
        score: 70,
        status: "neutral",
        summary: "Không thể đối chiếu dữ liệu báo chí thời gian thực do máy chủ bận. Hãy tự kiểm chứng trên các trang báo chính thống."
      }
    });
  }
}

export default async function handler(req, res) {
  const urlPath = (req.url || "").split("?")[0];

  const isHeavy = HEAVY_PREFIXES.some(
    (prefix) => urlPath === prefix || urlPath.startsWith(prefix + "/")
  );

  if (isHeavy && BACKEND_URL) {
    return forwardToBackend(req, res);
  }

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