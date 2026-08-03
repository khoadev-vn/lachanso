const fs = require('fs');
const https = require('https');

async function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractItems(rssText) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(rssText)) !== null) {
    const itemBlock = match[1];
    const titleMatch = itemBlock.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemBlock.match(/<title>(.*?)<\/title>/);
    const descMatch = itemBlock.match(/<description><!\[CDATA\[.*?<\/a><br \/>(.*?)\]\]><\/description>/) || itemBlock.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);

    if (titleMatch && descMatch) {
      items.push({
        title: titleMatch[1].trim(),
        content: descMatch[1].trim().replace(/<[^>]+>/g, ''),
        is_fake: false
      });
    }
  }
  return items;
}

function generateFakeNews(realArticles) {
  const fakes = [];
  const panicWords = ["Khẩn cấp", "Sốc", "Kinh hoàng", "Tin nóng", "Không thể tin nổi"];
  const scamTemplates = [
  (title) => `${title}. Theo thông tin nội bộ rò rỉ, mọi người cần rút tiền ngay lập tức vì hệ thống sắp sụp đổ. Truy cập link lạ để bảo vệ tài sản!`,
  (title) => `Cảnh báo khẩn! ${title}. Bộ Công An thông báo yêu cầu người dân tải app dưới đây để xác thực sinh trắc học nếu không sẽ bị khóa tài khoản ngân hàng.`,
  (title) => `${title}. Sự thật đằng sau là một âm mưu động trời bị chính phủ che giấu. Cán bộ cấp cao đã bị bắt giam bí mật. Mọi người cẩn thận!`,
  (title) => `Sốc: ${title}. Lãnh đạo cao nhất vừa từ chức, kinh tế chuẩn bị lạm phát 500%. Đổi tiền ngay hôm nay!`,
  (title) => `${title}. Tin vui, tập đoàn Vingroup tri ân tặng 500k cho 1000 người nhanh tay nhất. Click để nhận tiền từ quỹ từ thiện.`];


  for (let i = 0; i < realArticles.length && i < 30; i++) {
    const template = scamTemplates[i % scamTemplates.length];
    const prefix = panicWords[Math.floor(Math.random() * panicWords.length)];
    const fakeTitle = `${prefix}: ${realArticles[i].title}`;
    const fakeContent = template(realArticles[i].content);

    fakes.push({
      title: fakeTitle,
      content: fakeTitle + " - " + fakeContent,
      is_fake: true
    });
  }
  return fakes;
}

const SPECIFIC_FAKES = [
{
  title: "CẢNH BÁO: Mã độc tống tiền lây lan qua tin nhắn Zalo",
  content: "Khẩn cấp: Bộ Công An phát cảnh báo khẩn về mã độc mới trên Zalo. Truy cập ngay đường link xác thực VNeID để không bị mất tiền trong tài khoản.",
  is_fake: true
},
{
  title: "Mourinho ký hợp đồng với Real",
  content: "Jose Mourinho đã ký hợp đồng để trở thành HLV tiếp theo của Real Madrid, nhưng đội bóng sẽ chỉ công bố sau cuộc bầu cử chủ tịch ngày 7/6. Theo tờ Athletic hôm nay, Mourinho ký các điều khoản từ tuần trước và sẽ dẫn dắt Real theo hợp đồng có thời hạn đến tháng 6/2029. Thông báo chính thức nhiều khả năng được công bố sau cuộc bầu cử chủ tịch CLB ngày 7/6. Quyết định này mang đậm dấu ấn của Chủ tịch đương nhiệm Florentino Perez. Lãnh đạo 79 tuổi thúc đẩy quá trình bổ nhiệm Mourinho, khi Real trải qua mùa giải thứ hai liên tiếp trắng tay ở các đấu trường lớn.",
  is_fake: true
}];


async function main() {
  try {
    const rssList = [
    'https://vnexpress.net/rss/thoi-su.rss',
    'https://vnexpress.net/rss/the-gioi.rss'];

    let allReal = [];
    for (const url of rssList) {
      const rssText = await fetchRSS(url);
      const items = extractItems(rssText);
      allReal = allReal.concat(items);
    }


    const real30 = allReal.slice(0, 30).map((i) => ({ ...i, content: i.title + " - " + i.content }));


    const fakeBase = allReal.slice(30, 58);
    const generatedFakes = generateFakeNews(fakeBase);

    const fake30 = [...generatedFakes, ...SPECIFIC_FAKES];

    const dataset = [...real30, ...fake30];
    fs.writeFileSync('scripts/dataset.json', JSON.stringify(dataset, null, 2));
    console.log(`Generated dataset.json with ${dataset.length} articles (30 real, ${fake30.length} fake).`);
  } catch (error) {
    console.error("Error generating dataset:", error);
  }
}

main();
