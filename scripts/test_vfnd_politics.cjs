const fs = require('fs');
const path = require('path');
const threatDetection = require('../server/services/threatDetection');

const fakeDir = 'C:\\Users\\aqqqqq\\.gemini\\antigravity-ide\\scratch\\VFND\\Dataset\\Fake\\Article_Contents';
const realDir = 'C:\\Users\\aqqqqq\\.gemini\\antigravity-ide\\scratch\\VFND\\Dataset\\Real\\Article_Contents';

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

const fakeFiles = getFilteredFiles(fakeDir, 50);
const realFiles = getFilteredFiles(realDir, 50);

const dataset = [
...fakeFiles.map((f) => ({ path: f, label: 'Fake' })),
...realFiles.map((f) => ({ path: f, label: 'Real' }))];


async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBenchmark() {
  console.log(`Bắt đầu benchmark ${dataset.length} bài báo từ VFND (đã loại bỏ tin đời sống)...`);
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

      const articlesFound = newsData.filteredArticles || newsData.articles || [];

      let maxEntailment = 0;
      let maxContradiction = 0;

      if (newsData.success && articlesFound.length > 0) {

        for (let j = 0; j < Math.min(3, articlesFound.length); j++) {
          const article = articlesFound[j];
          const premise = article.title + " " + (article.description || "");
          const hypothesis = title;

          try {
            const nliRes = await fetch("http://localhost:3001/api/verify-nli", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ premise, hypothesis })
            });
            const nliData = await nliRes.json();
            if (nliData.success) {
              if (nliData.entailment > maxEntailment) maxEntailment = nliData.entailment;
              if (nliData.contradiction > maxContradiction) maxContradiction = nliData.contradiction;
            }
          } catch (e) {}
        }





        if (maxContradiction > 0.6) {
          score -= 50;
          reasons.push(`[NLI Bác bỏ: Báo chí vạch trần (Contradiction: ${(maxContradiction * 100).toFixed(0)}%): -50 điểm]`);
        } else if (maxEntailment > 0.70) {
          score += 15;
          reasons.push(`[NLI Xác thực mạnh: Báo chí đồng thuận (Entailment: ${(maxEntailment * 100).toFixed(0)}%): +15 điểm]`);
        } else {
          score -= 30;
          reasons.push(`[Có bài báo liên quan nhưng NLI không xác thực được nội dung: -30 điểm]`);
        }
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

  fs.writeFileSync('scripts/vfnd_results_politics.json', JSON.stringify(report, null, 2));

  console.log('Hoàn tất benchmark!');
  console.log(`Độ chính xác (Accuracy): ${accuracy.toFixed(2)}%`);
  console.log(`True Positives: ${tp}`);
  console.log(`True Negatives: ${tn}`);
  console.log(`False Positives: ${fp}`);
  console.log(`False Negatives: ${fn}`);
}

runBenchmark();
