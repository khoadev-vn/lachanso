const fs = require('fs');
const path = require('path');
const threatDetection = require('../server/services/threatDetection');

const fakeDir = 'C:\\Users\\aqqqqq\\.gemini\\antigravity-ide\\scratch\\VFND\\Dataset\\Fake\\Article_Contents';

function getFilteredFiles(dir, count) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (let i = files.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [files[i], files[j]] = [files[j], files[i]];
  }

  const selected = [];
  for (let f of files) {
    if (selected.length >= count) break;
    const filePath = path.join(dir, f);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let text = data.title || "";
      if (data.maintext) text += "\n" + data.maintext;

      const matches = threatDetection.analyzeTextByKeywords(text);
      const isGossip = matches.some((m) => m.groupId === 'KG_GOSSIP');
      if (!isGossip) {
        selected.push(filePath);
      }
    } catch (e) {}
  }
  return selected;
}

const fakeFiles = getFilteredFiles(fakeDir, 40);
console.log(`Đã chọn ${fakeFiles.length} bài Fake (bỏ KG_GOSSIP)`);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBenchmark() {
  let tp = 0,fn = 0;
  const results = [];

  for (let i = 0; i < fakeFiles.length; i++) {
    const filePath = fakeFiles[i];
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let text = data.title || "";
      if (data.maintext) text += "\n" + data.maintext;
      if (text.length > 2000) text = text.slice(0, 2000);
      if (!text.trim()) continue;

      const title = (data.title || "").substring(0, 80).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${fakeFiles.length}] ${title}...`);


      const textAnalysisRes = await fetch("http://localhost:3001/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const textAnalysis = await textAnalysisRes.json();
      const matches = textAnalysis.matches || [];

      let penalty = 0;
      const reasons = [];
      matches.forEach((m) => {
        penalty += m.penalty;
        reasons.push(`[${m.groupName}: ${m.matchedKeywords.join(', ')} (-${m.penalty})]`);
      });
      let score = 100 - penalty;


      const searchQuery = data.title || text.substring(0, 100);
      const newsRes = await fetch("http://127.0.0.1:3001/api/full-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: searchQuery })
      });
      let newsData;
      try {
        newsData = await newsRes.json();
      } catch (err) {
        const textRes = await newsRes.text();
        console.log(`Lỗi JSON, raw response: ${textRes.substring(0, 200)}`);
        continue;
      }
      
      let finalScore = newsData.finalScore || 0;
      let finalVerdict = newsData.verdict || "SAFE";
      let nliMatches = 0;
      
      if (newsData.nliDetails && newsData.nliDetails.nliResults && newsData.nliDetails.nliResults.length > 0) {
        nliMatches = newsData.nliDetails.nliResults.length;
      }
      
      const isFake = (finalScore >= 60 || finalVerdict === "FRAUD_CONFIRMED" || finalVerdict === "HIGH_RISK");
      
      score = 100 - finalScore;

      score = Math.max(0, Math.min(100, score));
      const isCaughtAsFake = score < 60;

      if (isCaughtAsFake) tp++;else
      fn++;

      const status = isCaughtAsFake ? '✅ BẮT ĐƯỢC' : '❌ BỎ LỌT';
      console.log(`   ${status} | Score: ${score} | ${reasons.join(' ')}`);

      results.push({ title, score, caught: isCaughtAsFake, reasons });
      await sleep(200);
    } catch (e) {
      console.error(`   Lỗi: ${e.message}`);
    }
  }

  const total = tp + fn;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`KẾT QUẢ TEST CHỈ TIN GIẢ (${total} bài)`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Bắt được (TP): ${tp}/${total} = ${(tp / total * 100).toFixed(1)}%`);
  console.log(`❌ Bỏ lọt (FN):  ${fn}/${total} = ${(fn / total * 100).toFixed(1)}%`);

  console.log(`\n--- BÀI BỎ LỌT ---`);
  results.filter((r) => !r.caught).forEach((r) => {
    console.log(`  Score=${r.score} | ${r.title}`);
    r.reasons.forEach((re) => console.log(`    → ${re}`));
  });

  fs.writeFileSync('./scripts/fake_only_results.json', JSON.stringify({ tp, fn, total, results }, null, 2));
}

runBenchmark().catch(console.error);
