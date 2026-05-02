const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 1400 }
  });

  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/index.html', { waitUntil: 'networkidle0' });

  const data = await page.evaluate(() => {
    const services = document.querySelector('#services-overview');
    const featured = document.querySelector('#featured-work');
    if (!services || !featured) return [];

    const servicesRect = services.getBoundingClientRect();
    const featuredRect = featured.getBoundingClientRect();

    const children = [...services.querySelectorAll('*')].map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);

      return {
        selector:
          el.id ? '#' + el.id :
          el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().replace(/\s+/g, '.')
            : el.tagName.toLowerCase(),
        top: Math.round(r.top + window.scrollY),
        bottom: Math.round(r.bottom + window.scrollY),
        height: Math.round(r.height),
        display: cs.display,
        position: cs.position,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        minHeight: cs.minHeight
      };
    });

    const tallest = children
      .filter(x => x.height > 50)
      .sort((a, b) => b.bottom - a.bottom)
      .slice(0, 25);

    return {
      services: {
        top: Math.round(servicesRect.top + window.scrollY),
        bottom: Math.round(servicesRect.bottom + window.scrollY),
        height: Math.round(servicesRect.height)
      },
      featured: {
        top: Math.round(featuredRect.top + window.scrollY),
        bottom: Math.round(featuredRect.bottom + window.scrollY),
        height: Math.round(featuredRect.height)
      },
      gapBetweenServicesAndFeatured: Math.round(
        (featuredRect.top + window.scrollY) - (servicesRect.bottom + window.scrollY)
      ),
      deepestChildrenInServices: tallest
    };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
