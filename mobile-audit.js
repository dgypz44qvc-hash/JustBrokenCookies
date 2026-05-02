const puppeteer = require('puppeteer');
const path = require('path');

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
    path: 'mobile-audit-home.png',
    fullPage: true
  });

  const report = await page.evaluate(() => {
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = window.innerWidth;

    const overflowing = [...document.querySelectorAll('*')]
      .map(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);

        return {
          selector:
            el.id ? '#' + el.id :
            el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().replace(/\s+/g, '.')
              : el.tagName.toLowerCase(),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          height: Math.round(r.height),
          display: cs.display,
          position: cs.position,
          overflow: cs.overflow
        };
      })
      .filter(x => x.right > viewportWidth + 2 || x.left < -2)
      .slice(0, 50);

    const sections = [...document.querySelectorAll('section, footer, nav')]
      .map(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);

        return {
          selector:
            el.id ? '#' + el.id :
            el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().replace(/\s+/g, '.')
              : el.tagName.toLowerCase(),
          top: Math.round(r.top + window.scrollY),
          height: Math.round(r.height),
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom,
          marginTop: cs.marginTop,
          marginBottom: cs.marginBottom,
          overflow: cs.overflow,
          position: cs.position
        };
      });

    const bigElements = [...document.querySelectorAll('*')]
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          selector:
            el.id ? '#' + el.id :
            el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().replace(/\s+/g, '.')
              : el.tagName.toLowerCase(),
          width: Math.round(r.width),
          height: Math.round(r.height),
          top: Math.round(r.top + window.scrollY)
        };
      })
      .filter(x => x.width > viewportWidth + 2 || x.height > 1200)
      .slice(0, 50);

    return {
      viewportWidth,
      bodyWidth,
      hasHorizontalOverflow: bodyWidth > viewportWidth + 2,
      overflowing,
      sections,
      bigElements
    };
  });

  console.log(JSON.stringify(report, null, 2));
  console.log("\\nScreenshot saved as: mobile-audit-home.png");

  await browser.close();
})();
