const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 1400 }
  });

  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'networkidle0' });

  const data = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('section, footer')];

    return sections.map((el, i) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const prev = sections[i - 1];
      const prevRect = prev ? prev.getBoundingClientRect() : null;

      return {
        index: i,
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        className: el.className || '',
        top: Math.round(r.top + window.scrollY),
        bottom: Math.round(r.bottom + window.scrollY),
        height: Math.round(r.height),
        gapFromPrevious: prevRect ? Math.round((r.top + window.scrollY) - (prevRect.bottom + window.scrollY)) : 0,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        minHeight: cs.minHeight,
        heightCss: cs.height,
        overflow: cs.overflow,
        position: cs.position
      };
    });
  });

  console.table(data);

  const suspicious = data.filter(s =>
    s.gapFromPrevious > 80 ||
    parseFloat(s.paddingTop) > 100 ||
    parseFloat(s.paddingBottom) > 100 ||
    s.height > 1400
  );

  console.log('\nPotential gap/height culprits:');
  console.table(suspicious);

  await browser.close();
})();
