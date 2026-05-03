const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 1100,
      isMobile: false,
      deviceScaleFactor: 1
    }
  });

  const page = await browser.newPage();

  await page.goto('file://' + process.cwd() + '/index.html', {
    waitUntil: 'networkidle0'
  });

  const report = await page.evaluate(() => {
    const selectors = [
      '#featured-work',
      '#featured-work > .container',
      '#featured-work .sec-header',
      '#featured-work .sec-header h2',
      '#featured-work .sec-header span',
      '#featured-work .jbc-work-created-title',
      '#featured-work .jbc-work-created-title h2',
      '#featured-work .jbc-work-created-title span',
      '#featured-work .portfolio-grid.jbc-codrops-cinema',
      '#featured-work .jbc-cinema-pin',
      '#featured-work .jbc-cinema-stage',
      '#featured-work .jbc-cinema-ring'
    ];

    function getInfo(selector) {
      const el = document.querySelector(selector);
      if (!el) return { selector, exists: false };

      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);

      return {
        selector,
        exists: true,
        text: (el.innerText || el.textContent || '').trim(),
        top: Math.round(r.top + window.scrollY),
        left: Math.round(r.left),
        bottom: Math.round(r.bottom + window.scrollY),
        width: Math.round(r.width),
        height: Math.round(r.height),
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        position: cs.position,
        zIndex: cs.zIndex,
        color: cs.color,
        fontSize: cs.fontSize,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        transform: cs.transform,
        overflow: cs.overflow
      };
    }

    const inspectedElements = selectors.map(getInfo);

    const titleCandidates = [...document.querySelectorAll('#featured-work *')]
      .filter(el => /selected work|what we create|the work/i.test((el.innerText || el.textContent || '').trim()))
      .map(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: typeof el.className === 'string' ? el.className : '',
          text: (el.innerText || el.textContent || '').trim(),
          top: Math.round(r.top + window.scrollY),
          left: Math.round(r.left),
          width: Math.round(r.width),
          height: Math.round(r.height),
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          position: cs.position,
          zIndex: cs.zIndex,
          color: cs.color,
          fontSize: cs.fontSize
        };
      });

    const featured = document.querySelector('#featured-work');
    let stackAtTitleArea = [];

    if (featured) {
      const fr = featured.getBoundingClientRect();
      const x = Math.round(fr.left + 180);
      const y = Math.round(fr.top + 80);

      stackAtTitleArea = document.elementsFromPoint(x, y).slice(0, 15).map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
        text: (el.innerText || el.textContent || '').trim().slice(0, 100),
        zIndex: getComputedStyle(el).zIndex,
        position: getComputedStyle(el).position,
        display: getComputedStyle(el).display,
        opacity: getComputedStyle(el).opacity
      }));
    }

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      inspectedElements,
      titleCandidates,
      stackAtTitleArea
    };
  });

  console.log(JSON.stringify(report, null, 2));

  await page.screenshot({
    path: 'selected-work-desktop-title-audit.png',
    fullPage: true
  });

  await browser.close();
  console.log('\nSaved screenshot: selected-work-desktop-title-audit.png');
})();
