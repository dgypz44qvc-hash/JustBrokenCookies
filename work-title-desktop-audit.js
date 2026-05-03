const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 1100,
      isMobile: false,
      hasTouch: false,
      deviceScaleFactor: 1
    }
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  await page.goto('file://' + process.cwd() + '/index.html', {
    waitUntil: 'networkidle0'
  });

  const report = await page.evaluate(() => {
    const selectors = [
      '#featured-work',
      '#featured-work > .container',
      '#featured-work .jbc-work-created-title',
      '#featured-work .jbc-work-created-title h2',
      '#featured-work .sec-header',
      '#featured-work .sec-header h2',
      '#featured-work .portfolio-grid.jbc-codrops-cinema',
      '#featured-work .jbc-cinema-pin',
      '#featured-work .jbc-cinema-stage',
      '#featured-work .jbc-cinema-ring',
      '#featured-work a.btn'
    ];

    function info(selector) {
      const el = document.querySelector(selector);
      if (!el) return { selector, exists: false };

      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);

      return {
        selector,
        exists: true,
        text: (el.innerText || el.textContent || '').trim().slice(0, 160),
        top: Math.round(r.top + window.scrollY),
        left: Math.round(r.left),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom + window.scrollY),
        width: Math.round(r.width),
        height: Math.round(r.height),
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        position: cs.position,
        zIndex: cs.zIndex,
        overflow: cs.overflow,
        transform: cs.transform,
        color: cs.color,
        fontSize: cs.fontSize,
        pointerEvents: cs.pointerEvents
      };
    }

    const inspected = selectors.map(info);

    const title =
      document.querySelector('#featured-work .jbc-work-created-title h2') ||
      document.querySelector('#featured-work .sec-header h2');

    let stackAtTitle = [];

    if (title) {
      const r = title.getBoundingClientRect();
      const x = Math.round(r.left + Math.max(8, r.width / 2));
      const y = Math.round(r.top + Math.max(6, r.height / 2));

      stackAtTitle = document.elementsFromPoint(x, y).slice(0, 18).map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
        text: (el.innerText || el.textContent || '').trim().slice(0, 120),
        position: getComputedStyle(el).position,
        zIndex: getComputedStyle(el).zIndex,
        display: getComputedStyle(el).display,
        opacity: getComputedStyle(el).opacity,
        pointerEvents: getComputedStyle(el).pointerEvents
      }));
    }

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobileAudit: false
      },
      inspected,
      stackAtTitle
    };
  });

  console.log(JSON.stringify(report, null, 2));

  await page.screenshot({
    path: 'work-title-DESKTOP-audit.png',
    fullPage: true
  });

  await browser.close();
  console.log('\nSaved DESKTOP screenshot: work-title-DESKTOP-audit.png');
})();
