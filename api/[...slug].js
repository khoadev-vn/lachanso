// Vercel serverless proxy: chuyển tiếp mọi /api/* tới backend trên Vietnix.
// LCS_BACKEND_URL (vd https://api.lachansovn.vn) và LCS_BACKEND_SECRET phải
// được set trong Vercel Project Env Vars - KHÔNG nằm trong repo này.
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const BACKEND_URL = (process.env.LCS_BACKEND_URL || "").replace(/\/+$/, "");
  const SECRET = process.env.LCS_BACKEND_SECRET || "";

  if (!BACKEND_URL) {
    return res.status(500).json({ error: "LCS_BACKEND_URL chưa được cấu hình trên Vercel" });
  }

  const slug = Array.isArray(req.query.slug) ? req.query.slug.join("/") : (req.query.slug || "");
  const path = `/api/${slug}`;
  const queryIndex = req.url.indexOf("?");
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";

  const headers = {
    "content-type": req.headers["content-type"] || "application/json",
    accept: req.headers["accept"] || "application/json, text/plain",
    "x-lcs-backend-secret": SECRET,
    "user-agent": "lachanso-vercel-proxy",
    "x-forwarded-for": req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || ""
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
