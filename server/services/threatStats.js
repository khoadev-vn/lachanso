const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/threatStats.json');

let stats = { daily: {}, total: 0 };
let dirty = false;

function load() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      stats = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch { /* keep defaults */ }
}

function persist() {
  if (!dirty) return;
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(stats, null, 2), 'utf8');
    dirty = false;
  } catch (e) {
    console.error('[threatStats] persist error:', e.message);
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function incrementThreat() {
  load();
  const key = todayKey();
  stats.daily[key] = (stats.daily[key] || 0) + 1;
  stats.total = (stats.total || 0) + 1;
  dirty = true;
  persist();
}

function getThreatStats() {
  load();
  const now = new Date();
  const today = todayKey();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;

  for (const [dateStr, count] of Object.entries(stats.daily)) {
    const d = new Date(dateStr + 'T00:00:00Z');
    todayCount += (dateStr === today) ? count : 0;
    if (d >= weekStart) weekCount += count;
    if (d >= monthStart) monthCount += count;
  }

  // Trend: từ 05/08 đến nay (8 ngày)
  const trend = [];
  const startDate = new Date('2026-08-05T00:00:00Z');
  // Tính tổng trước 05/08 làm baseline
  let baseline = 0;
  for (const [dateStr, count] of Object.entries(stats.daily)) {
    const d = new Date(dateStr + 'T00:00:00Z');
    if (d < startDate) baseline += count;
  }
  let runningTotal = baseline;
  const todayDate = new Date(now);
  const daysDiff = Math.floor((todayDate - startDate) / (24 * 60 * 60 * 1000));
  for (let i = 0; i <= daysDiff; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const dayCount = stats.daily[key] || 0;
    runningTotal += dayCount;
    const label = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    trend.push({ label, value: runningTotal });
  }

  return {
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount,
    total: stats.total || 0,
    trend
  };
}

// Persist on exit
process.on('SIGINT', () => { persist(); process.exit(0); });
process.on('SIGTERM', () => { persist(); process.exit(0); });

// Auto-save every 60s if dirty
setInterval(persist, 60000);

module.exports = { incrementThreat, getThreatStats };
