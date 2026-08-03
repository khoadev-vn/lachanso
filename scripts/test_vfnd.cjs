const fs = require('fs');
const path = require('path');

const fakeDir = 'C:\\Users\\aqqqqq\\.gemini\\antigravity-ide\\scratch\\VFND\\Dataset\\Fake\\Article_Contents';
const realDir = 'C:\\Users\\aqqqqq\\.gemini\\antigravity-ide\\scratch\\VFND\\Dataset\\Real\\Article_Contents';

function getRandomFiles(dir, count) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (let i = files.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [files[i], files[j]] = [files[j], files[i]];
  }
  return files.slice(0, count).map((f) => path.join(dir, f));
}

const fakeFiles = getRandomFiles(fakeDir, 50);
const realFiles = getRandomFiles(realDir, 50);

const dataset = [
...fakeFiles.map((f) => ({ path: f, label: 'Fake' })),
...realFiles.map((f) => ({ path: f, label: 'Real' }))];


async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBenchmark() {
  console.log(`Bắt đầu benchmark ${dataset.length} bài báo từ VFND...`);
  const results = [];

  let tp = 0,tn = 0,fp = 0,fn = 0;

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];
    const isGroundTruthFake = item.label === 'Fake';

    try {
      const data = JSON.parse(fs.readFileSync(item.path, 'utf8'));
      let text = data.title || "";
      if (data.maintext) {
        text += "\n" + data.maintext;
      }
      if (text.length > 2000) text = text.slice(0, 2000);
      if (!text.trim()) continue;

      const title = (data.title || "").substring(0, 100).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${dataset.length}] Đang xử lý (${item.label}): ${title}...`);


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
      const newsRes = await fetch("http://localhost:3001/api/verify-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: searchQuery })
      });
      const newsData = await newsRes.json();

      if (newsData.success && newsData.articles && newsData.articles.length > 0) {
        score += 20;
        reasons.push(`[Có nguồn báo chí xác nhận: +20 điểm]`);
      } else {
        if (penalty > 30) {
          score -= 30;
          reasons.push(`[Thiếu nguồn xác nhận & Văn phong đáng ngờ: -30 điểm]`);
        } else {
          score -= 30;
          reasons.push(`[Chưa được kiểm chứng bởi báo chí chính thống: -30 điểm]`);
        }
      }

      score = Math.max(0, Math.min(100, score));
      const isPredictedFake = score < 60;

      if (isPredictedFake && isGroundTruthFake) tp++;else
      if (!isPredictedFake && !isGroundTruthFake) tn++;else
      if (isPredictedFake && !isGroundTruthFake) fp++;else
      if (!isPredictedFake && isGroundTruthFake) fn++;

      results.push({
        title: title,
        label: item.label,
        predicted_fake: isPredictedFake,
        score: score,
        reasons: reasons.join(' | ')
      });

    } catch (e) {
      console.log("Lỗi:", e.message);
    }

    await sleep(1000);
  }

  const accuracy = (tp + tn) / dataset.length * 100;

  const report = {
    totalEvaluated: dataset.length,
    metrics: { accuracy, tp, tn, fp, fn },
    details: results
  };

  fs.writeFileSync('scripts/vfnd_results.json', JSON.stringify(report, null, 2));

  console.log('Hoàn tất benchmark!');
  console.log(`Độ chính xác (Accuracy): ${accuracy.toFixed(2)}%`);
  console.log(`True Positives: ${tp}`);
  console.log(`True Negatives: ${tn}`);
  console.log(`False Positives: ${fp}`);
  console.log(`False Negatives: ${fn}`);
}

runBenchmark();
