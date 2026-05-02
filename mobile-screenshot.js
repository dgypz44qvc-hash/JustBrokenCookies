const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    }
  });

  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/index.html', {
    waitUntil: 'networkidle0'
  });

  await page.screenshot({
    path: 'mobile-screenshot-home.png',
    fullPage: true
  });

  await browser.close();
  console.log('Saved screenshot: mobile-screenshot-home.png');
})();
