// Vercel serverless function (Hướng B):
// - Các endpoint NHẸ (không cần model ML): xử lý trực tiếp ngay trên Vercel.
// - Các endpoint NẶNG (verify-news, full-scan, verify-nli): nếu LCS_BACKEND_URL
//   đã set (khi đưa lên Vietnix) thì proxy sang backend; chưa set thì trả 503
//   để frontend dùng fallback client-side.
import express from "express";
import threatDetection from "../server/services/threatDetection.js";
import linkAnalysis from "../server/services/linkAnalysis.js";
import apiProxy from "../server/services/apiProxy.js";
import factCheckService from "../server/services/factCheckService.js";

export const config = { runtime: "nodejs" };

const BACKEND_URL = (process.env.LCS_BACKEND_URL || "").replace(/\/+$/, "");
const BACKEND_SECRET = process.env.LCS_BACKEND_SECRET || "";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.post("/api/check-domain", (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Missing url input" });
  const isGambling = threatDetection.isGamblingDomainInput(url);
  res.json({ isGambling });
});

app.post("/api/analyze-text", (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "Missing text input" });
  const matches = threatDetection.analyzeTextByKeywords(text);
  const contactFindings = threatDetection.detectContactScam(text);
  res.json({ matches: [...matches, ...contactFindings] });
});

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

    res.json({
      success: true,
      ...result,
      isGambling,
      executionTimeMs: Date.now() - startTime
    });
  } catch (e) {
    console.error("[API] Lỗi analyze-link:", e.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/fact-check", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text input" });
    const result = await factCheckService.checkFact(text);
    res.json(result);
  } catch (e) {
    console.error("[API] Lỗi FactCheck:", e.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/proxy/*path", (req, res) => {
  apiProxy.handleProxy(req, res);
});

app.get("/api/ai/status", (req, res) => {
  res.json({
    status: "OK",
    data: {
      backend: "serverless-lite",
      ollama: { available: false },
      deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
      enabled: Boolean(process.env.DEEPSEEK_API_KEY)
    }
  });
});

app.get("/api/cached-news", (req, res) => {
  res.json({ status: "OK", data: [] });
});

const HEAVY_ENDPOINTS = ["/api/verify-news", "/api/verify-news/ai", "/api/full-scan", "/api/verify-nli"];

async function forwardToBackend(req, res) {
  if (!BACKEND_URL) {
    return res.status(503).json({ error: "Backend chưa được cấu hình (LCS_BACKEND_URL)" });
  }

  const path = req.url.split("?")[0];
  const queryIndex = req.url.indexOf("?");
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";

  const headers = {
    "content-type": req.headers["content-type"] || "application/json",
    accept: req.headers["accept"] || "application/json, text/plain",
    "x-lcs-backend-secret": BACKEND_SECRET,
    "user-agent": "lachanso-vercel-proxy",
    "x-forwarded-for": req.headers["x-forwarded-for"] || ""
  };

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  try {
    const upstream = await fetch(`${BACKEND_URL}${path}${query}`, {
      method: req.method,
      headers,
      body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : body,
      signal: AbortSignal.timeout(60000)
    });
    const text = await upstream.text();
    res.status(upstream.status);
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    res.setHeader("cache-control", upstream.headers.get("cache-control") || "no-store");
    res.end(text);
  } catch (e) {
    res.status(502).json({ error: "Backend không thể truy cập: " + e.message });
  }
}

export default async function handler(req, res) {
  const urlPath = req.url.split("?")[0];

  const isHeavy = HEAVY_ENDPOINTS.some((ep) => urlPath === ep || urlPath.startsWith(ep + "/"));
  if (isHeavy) {
    return forwardToBackend(req, res);
  }

  app(req, res);
}
