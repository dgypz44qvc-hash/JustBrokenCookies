const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 1100, deviceScaleFactor: 1 }
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

    function info(selector) {
      const el = document.querySelector(selector);
      if (!el) {
        return { selector, exists: false };
      }

      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);

      return {
        selector,
        exists: true,
        text: (el.innerText || el.textContent || '').trim(),
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
        color: cs.color,
        background: cs.background,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        transform: cs.transform,
        overflow: cs.overflow
      };
    }

    const items = selectors.map(info);

    const featured = document.querySelector('#featured-work');
    const featuredRect = featured ? featured.getBoundingClientRect() : null;

    let stackAtHeader = [];
    if (featuredRect) {
      const x = Math.round(featuredRect.left + 140);
      const y = Math.round(featuredRect.top + 80);
      stackAtHeader = document.elementsFromPoint(x, y).slice(0, 12).map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
        text: (el.innerText || el.textContent || '').trim().slice(0, 80),
        zIndex: getComputedStyle(el).zIndex,
        position: getComputedStyle(el).position,
        pointerEvents: getComputedStyle(el).pointerEvents
      }));
    }

    const titleCandidates = [...document.querySelectorAll('#featured-work *')]
      .filter(el => {
        const text = (el.innerText || el.textContent || '').trim();
        return /selected work|what we create|the work/i.test(text);
      })
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

    return {
      pageY: window.scrollY,
      featuredWorkExists: !!featured,
      inspectedElements: items,
      titleCandidates,
      elementsStackAtExpectedHeaderPoint: stackAtHeader
    };
  });

  console.log(JSON.stringify(report, null, 2));

  await page.screenshot({
    path: 'selected-work-title-audit.png',
    fullPage: true
  });

  await browser.close();
  console.log('\nScreenshot saved: selected-work-title-audit.png');
})();
