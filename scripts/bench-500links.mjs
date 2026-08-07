// Bộ test 500 link đa dạng qua đường Vercel proxy + async + poll.
// Output: phân bố trạng thái, latency, cache hit, lỗi, fallback.
const BASE = 'https://lachansovn-seven.vercel.app/api/v2/web-verify';
const CONC = 12;
const POLL_MAX = 90000;
const POLL_INT = 1500;

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260707);

const TLDs = ['.com', '.online', '.top', '.net', '.xyz', '.cc', '.shop', '.site', '.club'];
const BRANDS = ['binance', 'vietcombank', 'tiki', 'shopee', 'facebook', 'google', 'zalo', 'viettel', 'fpt', 'lazada', 'vnpost', 'ghn', 'momo', 'zalopay', 'tpbank', 'vcb', 'tcb', 'mbbank', 'vietinbank', 'bvcncc', 'xsmb'];
const SMALL_BRANDS = ['moh.gov.vn', 'example.com', 'vnpay.vn', 'vaccine-covid19.moh.gov.vn', 'vietjetair.com'];
const LEGIT_TOP = ['chinhphu.vn', 'vnexpress.net', 'web2.0-example.org', 'example.com', 'vnpay.vn', 'momo.vn'];
const SCAM_WORDS = ['lucky', 'bonus', 'gift', 'jackpot', 'promo', 'cashback', 'nhanh', '24h', 'online', 'mienphi', 'tragdiem', 'kien', 'award', 'reward', 'support', 'daily'];
const GAMBLE_WORDS = ['casino', 'bet', 'ku', 'w88', 'fun88', 'live', 'gamb', 'poker', 'bacc', 'xoso', 'taixiu'];
const TYPE_TLD = (i) => TLDs[i % TLDs.length];

function chooseCat() {
  const r = rnd();
  if (r < 0.28) return 'legit';
  if (r < 0.46) return 'typo';
  if (r < 0.62) return 'scamword';
  if (r < 0.76) return 'gamble';
  if (r < 0.88) return 'random';
  return 'brand-new';
}
function buildUrl(cat, i) {
  let h;
  switch (cat) {
    case 'legit': h = LEGIT_TOP[i % LEGIT_TOP.length]; break;
    case 'typo': { const b = BRANDS[i % BRANDS.length]; h = b + (rnd() < 0.5 ? '' : 's') + TLDs[i % TLDs.length]; break; }
    case 'scamword': { const w = SCAM_WORDS[i % SCAM_WORDS.length]; h = 'nhan' + w + '-' + Math.floor(rnd() * 9000 + 1000) + TLDs[i % TLDs.length]; break; }
    case 'gamble': h = GAMBLE_WORDS[i % GAMBLE_WORDS.length] + '-trochoi' + TLDs[i % TLDs.length]; break;
    case 'random': h = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 4) + '.xyz'; break;
    case 'brand-new': h = BRANDS[(i * 7) % BRANDS.length] + '.secure.daily' + Math.floor(rnd() * 9999) + '.com'; break;
    default: h = LEGIT_TOP[i % LEGIT_TOP.length];
  }
  return `https://${h}`;
}

async function submit(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 20000);
  try {
    const r = await fetch(`${BASE}/async`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), signal: c.signal });
    clearTimeout(t);
    if (!r.ok) return { status: 'http_' + r.status };
    return await r.json();
  } catch { clearTimeout(t); return null; }
}
async function poll(jobId) {
  const dl = Date.now() + POLL_MAX;
  while (Date.now() < dl) {
    await new Promise((r) => setTimeout(r, POLL_INT));
    try {
      const r = await fetch(`${BASE}/status?jobId=${encodeURIComponent(jobId)}`);
      if (!r.ok) continue;
      const d = await r.json();
      if (d.status === 'done') return { ok: true, result: d.result };
      if (d.status === 'error') return { ok: false, error: d.error };
    } catch {}
  }
  return { ok: false, error: 'POLL_TIMEOUT' };
}
async function runOne(url, cat, i) {
  const t0 = Date.now();
  const sub = await submit(url);
  const submitMs = Date.now() - t0;
  if (!sub || sub.status === 'http_403') return { i, cat, url, ok: false, cached: false, fail: true, ms: submitMs, error: sub ? sub.status : 'submit_fail' };
  let res;
  if (sub.status === 'done' && sub.result) res = { ok: true, result: sub.result, cached: true };
  else if (sub.jobId) res = await poll(sub.jobId);
  else res = { ok: false, error: 'NO_JOBID' };
  return {
    i, cat, url, submitMs, ms: Date.now() - t0,
    cached: !!sub.result,
    ok: res.ok,
    result: res.ok ? { state: res.result.state, R: res.result.R, C: res.result.C, blacklisted: res.result.blacklisted, third: Array.isArray(res.result.thirdParty) ? res.result.thirdParty.length : 0 } : null,
    error: res.ok ? null : (res.error || 'POLL_ERR')
  };
}

async function main() {
  const total = Number(process.env.TOTAL || 500);
  const conc = Number(process.env.CONC || 12);
  const plans = [];
  for (let i = 0; i < total; i++) {
    const cat = catRepro(i);
    plans.push({ cat, url: buildUrl(cat, i) });
  }

  const counts = plans.reduce((a, p) => (a[p.cat] = (a[p.cat] || 0) + 1, a), {});
  console.log('Cohort:', Object.entries(counts).map(([k, v]) => `${k}:${v}`).join('  '));

  let idx = 0;
  const results = [];
  async function worker() {
    for (;;) {
      const p = idx++;
      if (p >= plans.length) return;
      results.push(await runOne(plans[p].url, plans[p].cat, p));
      if ((p + 1) % 50 === 0) console.log(`  progress ${p + 1}/${total}`);
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));

  // aggregate
  const stAll = {}; let ok = 0, fail = 0, cached = 0, sumMs = 0, blacklisted = 0;
  for (const r of results) {
    const s = r.result ? r.result.state : (r.fail ? 'fail' : 'no-result');
    stAll[s] = (stAll[s] || 0) + 1;
    if (r.ok) ok++; else fail++;
    if (r.cached) cached++;
    if (r.result && r.result.blacklisted) blacklisted++;
    sumMs += r.ms;
  }
  console.log('\n========== SUMMARY ==========');
  console.log('Total:', results.length, ' OK:', ok, ' FAIL:', fail, ' cache-hit:', cached);
  console.log('State distribution:', JSON.stringify(stAll));
  console.log('Total blacklist hit:', blacklisted);
  console.log('Avg total latency:', Math.round(sumMs / (results.length || 1)), 'ms');

  const byCat = {};
  for (const r of results) {
    const b = byCat[r.cat] || (byCat[r.cat] = { n: 0, ok: 0, fail: 0, cached: 0, bl: 0, sum: 0, states: {} });
    b.n++; if (r.ok) b.ok++; else b.fail++; if (r.cached) b.cached++; if (r.result && r.result.blacklisted) b.bl++; b.sum += r.ms;
    const s = r.result ? r.result.state : 'fail'; b.states[s] = (b.states[s] || 0) + 1;
  }
  for (const [cat, b] of Object.entries(byCat)) {
    console.log(`\n[${cat}] n=${b.n} ok=${b.ok} fail=${b.fail} cached=${b.cached} blacklist=${b.bl} avg=${Math.round(b.sum / (b.n || 1))}ms states=${JSON.stringify(b.states)}`);
  }

  const slow = results.filter((r) => r.ok).sort((a, b) => b.ms - a.ms).slice(0, 8);
  console.log('\nSlowest:');
  for (const s of slow) console.log(`  ${s.ms}ms ${s.cat} ${s.url} -> ${s.result.state} R${s.result.R}`);
  const fails = results.filter((r) => !r.ok);
  console.log('\nFailures:', fails.length);
  for (const f of fails.slice(0, 12)) console.log(`  ${f.cat} ${f.url} -> ${f.error || '?'} (submit ${f.submitMs}ms)`);
}

// reproducible per-index category
function catRepro(i) {
  const r = mulberry32(20260707 + i)();
  if (r < 0.28) return 'legit';
  if (r < 0.46) return 'typo';
  if (r < 0.62) return 'scamword';
  if (r < 0.76) return 'gamble';
  if (r < 0.88) return 'random';
  return 'brand-new';
}

main().catch((e) => { console.error(e); process.exit(1); });
