const puppeteer = require('/opt/lachanso/server/node_modules/puppeteer');
(async () => {
  console.log('launching...');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process','--no-zygote'] });
  console.log('launched ok');
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (compatible; PrerenderBot/1.0)');
  console.log('goto...');
  await page.goto('http://127.0.0.1:3001/su-menh', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForTimeout(1200);
  const html = await page.content();
  console.log('html length:', html.length);
  console.log('has founders:', html.includes('Nguyễn Võ Anh Khoa'));
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });