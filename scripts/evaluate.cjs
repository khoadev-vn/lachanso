const fs = require('fs');

async function evaluate() {
  const dataset = JSON.parse(fs.readFileSync('scripts/dataset.json', 'utf-8'));

  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  const results = [];

  console.log(`Bắt đầu benchmark ${dataset.length} bài báo...`);

  for (let i = 0; i < dataset.length; i++) {
    const article = dataset[i];
    console.log(`[${i + 1}/${dataset.length}] Đang xử lý: ${article.title.substring(0, 50)}...`);

    try {

      const kwRes = await fetch("http://localhost:3001/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: article.content })
      });
      const kwData = await kwRes.json();
      const matches = kwData.matches || [];

      let penalty = 0;
      matches.forEach((m) => penalty += m.penalty);



      let score = 100 - penalty;


      const newsRes = await fetch("http://localhost:3001/api/verify-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: article.title })
      });
      const newsData = await newsRes.json();

      let hasLivePressMatch = false;
      if (newsData.success && newsData.articles && newsData.articles.length > 0) {
        hasLivePressMatch = true;

        score += 20;
      } else {

        if (penalty > 30) {
          score -= 30;
        }
      }


      score = Math.max(0, Math.min(100, score));


      const isPredictedFake = score < 60;

      if (article.is_fake && isPredictedFake) truePositives++;
      if (!article.is_fake && !isPredictedFake) trueNegatives++;
      if (!article.is_fake && isPredictedFake) falsePositives++;
      if (article.is_fake && !isPredictedFake) falseNegatives++;

      results.push({
        title: article.title,
        is_fake_groundtruth: article.is_fake,
        predicted_fake: isPredictedFake,
        score,
        penalty,
        hasLivePressMatch
      });


      await new Promise((r) => setTimeout(r, 1000));

    } catch (err) {
      console.error(`Lỗi xử lý bài báo ${i}:`, err.message);
    }
  }

  const total = truePositives + trueNegatives + falsePositives + falseNegatives;
  const accuracy = (truePositives + trueNegatives) / total;

  const report = {
    totalEvaluated: total,
    metrics: {
      accuracy: accuracy * 100,
      truePositives,
      trueNegatives,
      falsePositives,
      falseNegatives
    },
    details: results
  };

  fs.writeFileSync('scripts/results.json', JSON.stringify(report, null, 2));
  console.log("Hoàn tất benchmark!");
  console.log(`Độ chính xác (Accuracy): ${(accuracy * 100).toFixed(2)}%`);
}

evaluate();
