/* ============================================
   JUSTBROKENCOOKIES — Premium Cinematic Engine
   Dark Luxe Edition
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---- PRELOADER ----
  const preloader = document.querySelector('.preloader');
  if (preloader) {
    const dismissPreloader = () => preloader.classList.add('loaded');
    window.addEventListener('load', dismissPreloader);
    // Fallback if load already fired
    if (document.readyState === 'complete') {
      dismissPreloader();
    }
  }

  // ---- PAGE TRANSITIONS ----
  const pageTransition = document.querySelector('.page-transition');
  if (pageTransition) {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
          href.startsWith('tel:') || href.startsWith('http') ||
          link.hasAttribute('data-no-transition')) return;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        pageTransition.classList.add('active');
        setTimeout(() => { window.location.href = href; }, 600);
      });
    });
  }

  // ---- CUSTOM CURSOR ----
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');

  if (cursorDot && cursorRing && window.matchMedia('(hover:hover)').matches) {
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top = mouseY + 'px';
    });

    // Smooth follow for ring
    function animateRing() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    // Hover state for interactive elements
    document.querySelectorAll('a, button, .btn, .filter-btn, .portfolio-item, .service-card, .blog-card').forEach(el => {
      el.addEventListener('mouseenter', () => cursorRing.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursorRing.classList.remove('hover'));
    });
  }

  // ---- NAVBAR SCROLL EFFECT ----
  const navbar = document.getElementById('navbar');
  if (navbar) {
    let lastScroll = 0;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          navbar.classList.toggle('scrolled', scrollY > 50);

          if (scrollY > 300) {
            navbar.style.transform = scrollY > lastScroll
              ? 'translateY(-100%)' : 'translateY(0)';
          } else {
            navbar.style.transform = 'translateY(0)';
          }
          lastScroll = scrollY;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ---- HAMBURGER MENU ----
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ---- BLUR-TO-SHARP SCROLL REVEAL ----
  const revealElements = document.querySelectorAll(
    '.fade-up, .reveal, .service-card, .value-card, .process-card, .blog-card, ' +
    '.portfolio-item, .team-card, .stat-item, .contact-info-item, ' +
    '.service-detail, .section-title, .section-label, .section-subtitle, ' +
    '.sec-header, .about-text, .testi-content, .about-image'
  );

  if (revealElements.length > 0) {
    revealElements.forEach(el => {
      /* Never touch user-added custom elements */
      if (el.classList.contains('jbc-custom') || el.closest('.jbc-custom')) return;
      if (!el.classList.contains('fade-up') && !el.classList.contains('reveal')) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.filter = 'blur(4px)';
        el.style.transition = 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), ' +
                              'transform 0.8s cubic-bezier(0.16,1,0.3,1), ' +
                              'filter 0.8s cubic-bezier(0.16,1,0.3,1)';
      }
    });

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Stagger siblings for card groups
          const parent = entry.target.parentElement;
          const cardClasses = ['service-card','value-card','process-card',
                               'blog-card','portfolio-item','team-card','stat-item'];
          const isCard = cardClasses.some(c => entry.target.classList.contains(c));

          let delay = 0;
          if (isCard && parent) {
            const siblings = Array.from(parent.children).filter(c =>
              cardClasses.some(cc => c.classList.contains(cc))
            );
            const idx = siblings.indexOf(entry.target);
            delay = Math.max(0, idx) * 100;
          }

          setTimeout(() => {
            if (entry.target.classList.contains('fade-up') || entry.target.classList.contains('reveal')) {
              entry.target.classList.add('visible');
            } else {
              entry.target.style.opacity = '1';
              entry.target.style.transform = 'translateY(0)';
              entry.target.style.filter = 'blur(0)';
            }
          }, delay);

          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.06,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ---- IMAGE CLIP REVEAL ----
  document.querySelectorAll('.about-image, .service-detail-image').forEach(el => {
    el.style.clipPath = 'inset(100% 0 0 0)';
    el.style.transition = 'clip-path 1.2s cubic-bezier(0.16,1,0.3,1)';

    const imgObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.clipPath = 'inset(0 0 0 0)';
          }, 200);
          imgObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    imgObs.observe(el);
  });

  // ---- PARALLAX ON HERO ----
  const hero = document.querySelector('.hero');
  if (hero) {
    const heroMega = hero.querySelector('.hero-mega');
    const heroTag = hero.querySelector('.tag');
    const heroBottom = hero.querySelector('.hero-bottom');

    let heroTicking = false;
    window.addEventListener('scroll', () => {
      if (!heroTicking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const heroHeight = hero.offsetHeight;
          if (scrollY < heroHeight) {
            const ratio = scrollY / heroHeight;
            if (heroMega) {
              heroMega.style.transform = `translateY(${scrollY * 0.18}px)`;
              heroMega.style.opacity = 1 - ratio * 0.7;
            }
            if (heroTag) {
              heroTag.style.transform = `translateY(${scrollY * 0.1}px)`;
              heroTag.style.opacity = 1 - ratio * 0.5;
            }
            if (heroBottom) {
              heroBottom.style.opacity = 1 - ratio * 1.5;
            }
          }
          heroTicking = false;
        });
        heroTicking = true;
      }
    }, { passive: true });

    // ---- OIL-ON-WATER HERO TEXT REVEAL ----
    // Two identical layers of text stacked exactly on top of each other.
    // Bottom layer: white text with broken-cookie crackle pattern
    // Top layer: the normal colored text, with a CSS mask hole on hover
    // Hovering "pushes aside" the colored oil to reveal the white pattern beneath
    if (heroMega) {

      // 1. Wrap heroMega so we can stack the underlay perfectly on top
      const wrapper = document.createElement('div');
      wrapper.classList.add('hero-oil-wrap');
      heroMega.parentElement.insertBefore(wrapper, heroMega);
      wrapper.appendChild(heroMega);

      // 2. Clone and insert the underlay INSIDE the same wrapper
      //    Keep .hero-mega class so .hero-mega .l1/.l2/.l3 CSS rules still apply
      const underlay = heroMega.cloneNode(true);
      underlay.classList.add('hero-underlay');
      underlay.removeAttribute('style');
      wrapper.insertBefore(underlay, heroMega); // underlay first = behind

      // 3. Inject CSS — both layers are position:absolute inside wrapper
      const oilCSS = document.createElement('style');
      oilCSS.textContent = `
        /* Wrapper takes the natural size of the text */
        .hero-oil-wrap {
          position: relative;
          display: inline-block;
          width: 100%;
        }

        /* --- Underlay: white patterned text (bottom layer) --- */
        .hero-underlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none;
          z-index: 1;
          user-select: none;
        }
        .hero-underlay .l1,
        .hero-underlay .l2,
        .hero-underlay .l3 {
          color: transparent !important;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* JUST — Camera lens: aperture rings, iris blades, radial ticks */
        .hero-underlay .l1 {
          background:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3Cstyle%3Ecircle,line,path%7Bfill:none;stroke:rgba(255,255,255,0.13);stroke-width:0.5%7D%3C/style%3E%3C/defs%3E%3Ccircle cx='60' cy='60' r='55'/%3E%3Ccircle cx='60' cy='60' r='45'/%3E%3Ccircle cx='60' cy='60' r='35'/%3E%3Ccircle cx='60' cy='60' r='24'/%3E%3Ccircle cx='60' cy='60' r='14' stroke-width='0.8'/%3E%3Ccircle cx='60' cy='60' r='6' stroke='rgba(255,255,255,0.18)' stroke-width='1'/%3E%3C!-- aperture blades --%3E%3Cpath d='M60 5 L65 25' stroke='rgba(255,255,255,0.08)'/%3E%3Cpath d='M95 15 L78 33' stroke='rgba(255,255,255,0.08)'/%3E%3Cpath d='M115 60 L95 58' stroke='rgba(255,255,255,0.08)'/%3E%3Cpath d='M95 105 L78 87' stroke='rgba(255,255,255,0.08)'/%3E%3Cpath d='M60 115 L55 95' stroke='rgba(255,255,255,0.08)'/%3E%3Cpath d='M25 105 L42 87' stroke='rgba(255,255,255,0.08)'/%3E%3Cpath d='M5 60 L25 62' stroke='rgba(255,255,255,0.08)'/%3E%3Cpath d='M25 15 L42 33' stroke='rgba(255,255,255,0.08)'/%3E%3C!-- fine tick marks around outer ring --%3E%3Cline x1='60' y1='2' x2='60' y2='8' stroke='rgba(255,255,255,0.1)'/%3E%3Cline x1='90' y1='8' x2='87' y2='13' stroke='rgba(255,255,255,0.06)'/%3E%3Cline x1='112' y1='30' x2='107' y2='33' stroke='rgba(255,255,255,0.06)'/%3E%3Cline x1='118' y1='60' x2='112' y2='60' stroke='rgba(255,255,255,0.1)'/%3E%3Cline x1='112' y1='90' x2='107' y2='87' stroke='rgba(255,255,255,0.06)'/%3E%3Cline x1='90' y1='112' x2='87' y2='107' stroke='rgba(255,255,255,0.06)'/%3E%3Cline x1='60' y1='118' x2='60' y2='112' stroke='rgba(255,255,255,0.1)'/%3E%3Cline x1='30' y1='112' x2='33' y2='107' stroke='rgba(255,255,255,0.06)'/%3E%3Cline x1='8' y1='90' x2='13' y2='87' stroke='rgba(255,255,255,0.06)'/%3E%3Cline x1='2' y1='60' x2='8' y2='60' stroke='rgba(255,255,255,0.1)'/%3E%3C!-- iris blade curves --%3E%3Cpath d='M38 20 Q60 35 82 20' stroke='rgba(255,255,255,0.06)' fill='none'/%3E%3Cpath d='M100 38 Q85 60 100 82' stroke='rgba(255,255,255,0.06)' fill='none'/%3E%3Cpath d='M82 100 Q60 85 38 100' stroke='rgba(255,255,255,0.06)' fill='none'/%3E%3Cpath d='M20 82 Q35 60 20 38' stroke='rgba(255,255,255,0.06)' fill='none'/%3E%3C/svg%3E") 0 0 / 120px 120px repeat,
            linear-gradient(135deg, #fff 0%, #e8e0d8 40%, #fff 60%, #d4c8b8 100%);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
        }

        /* BROKEN — Strategy: constellation network, nodes, geometric paths */
        .hero-underlay .l2 {
          background:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cdefs%3E%3Cstyle%3Ecircle%7Bfill:rgba(255,255,255,0.15)%7Dline,path%7Bfill:none;stroke:rgba(255,255,255,0.08);stroke-width:0.5%7D%3C/style%3E%3C/defs%3E%3C!-- primary nodes --%3E%3Ccircle cx='30' cy='25' r='2.5'/%3E%3Ccircle cx='95' cy='18' r='2'/%3E%3Ccircle cx='70' cy='55' r='3' fill='rgba(255,255,255,0.18)'/%3E%3Ccircle cx='25' cy='80' r='2'/%3E%3Ccircle cx='110' cy='70' r='2.5'/%3E%3Ccircle cx='55' cy='110' r='2'/%3E%3Ccircle cx='120' cy='120' r='2'/%3E%3Ccircle cx='15' cy='130' r='1.5'/%3E%3C!-- secondary micro nodes --%3E%3Ccircle cx='50' cy='35' r='1' fill='rgba(255,255,255,0.1)'/%3E%3Ccircle cx='85' cy='42' r='1' fill='rgba(255,255,255,0.1)'/%3E%3Ccircle cx='42' cy='72' r='1' fill='rgba(255,255,255,0.1)'/%3E%3Ccircle cx='90' cy='95' r='1' fill='rgba(255,255,255,0.1)'/%3E%3Ccircle cx='130' cy='40' r='1' fill='rgba(255,255,255,0.08)'/%3E%3C!-- connecting lines --%3E%3Cline x1='30' y1='25' x2='50' y2='35'/%3E%3Cline x1='50' y1='35' x2='70' y2='55'/%3E%3Cline x1='70' y1='55' x2='95' y2='18'/%3E%3Cline x1='70' y1='55' x2='85' y2='42'/%3E%3Cline x1='85' y1='42' x2='110' y2='70'/%3E%3Cline x1='70' y1='55' x2='42' y2='72'/%3E%3Cline x1='42' y1='72' x2='25' y2='80'/%3E%3Cline x1='25' y1='80' x2='55' y2='110'/%3E%3Cline x1='110' y1='70' x2='120' y2='120'/%3E%3Cline x1='55' y1='110' x2='90' y2='95'/%3E%3Cline x1='90' y1='95' x2='120' y2='120'/%3E%3Cline x1='95' y1='18' x2='130' y2='40'/%3E%3Cline x1='130' y1='40' x2='110' y2='70'/%3E%3Cline x1='15' y1='130' x2='55' y2='110'/%3E%3C!-- dashed orbital arcs --%3E%3Cpath d='M30 25 Q10 50 25 80' stroke='rgba(255,255,255,0.05)' stroke-dasharray='3 4'/%3E%3Cpath d='M95 18 Q120 45 110 70' stroke='rgba(255,255,255,0.05)' stroke-dasharray='3 4'/%3E%3Cpath d='M70 55 Q65 85 55 110' stroke='rgba(255,255,255,0.05)' stroke-dasharray='3 4'/%3E%3C!-- diamond accent at center node --%3E%3Cpath d='M70 49 L76 55 L70 61 L64 55 Z' stroke='rgba(255,255,255,0.1)' stroke-width='0.5' fill='none'/%3E%3C/svg%3E") 0 0 / 140px 140px repeat,
            linear-gradient(135deg, #fff 0%, #e8e0d8 40%, #fff 60%, #d4c8b8 100%);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
        }

        /* COOKIES — Writing: calligraphic flourishes, quill curves, ink swashes */
        .hero-underlay .l3 {
          background:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='140' viewBox='0 0 160 140'%3E%3Cdefs%3E%3Cstyle%3Epath,line%7Bfill:none;stroke-linecap:round%7D%3C/style%3E%3C/defs%3E%3C!-- flowing quill flourish --%3E%3Cpath d='M10 70 Q30 30 60 50 T110 35 T150 55' stroke='rgba(255,255,255,0.1)' stroke-width='0.8'/%3E%3Cpath d='M5 95 Q25 75 50 85 T95 70 T140 80' stroke='rgba(255,255,255,0.07)' stroke-width='0.6'/%3E%3C!-- script-like baseline strokes --%3E%3Cpath d='M15 110 Q35 100 55 108 Q75 116 95 105 Q115 94 135 102' stroke='rgba(255,255,255,0.06)' stroke-width='0.5'/%3E%3C!-- quill nib detail --%3E%3Cpath d='M20 45 L25 35 L22 30' stroke='rgba(255,255,255,0.12)' stroke-width='0.7'/%3E%3Cpath d='M25 35 Q28 38 25 42' stroke='rgba(255,255,255,0.1)' stroke-width='0.5'/%3E%3C!-- ink dots (as if freshly written) --%3E%3Ccircle cx='25' cy='42' r='1.2' fill='rgba(255,255,255,0.12)' xmlns='http://www.w3.org/2000/svg'/%3E%3Ccircle cx='110' cy='34' r='0.8' fill='rgba(255,255,255,0.08)' xmlns='http://www.w3.org/2000/svg'/%3E%3Ccircle cx='65' cy='52' r='0.6' fill='rgba(255,255,255,0.06)' xmlns='http://www.w3.org/2000/svg'/%3E%3Ccircle cx='130' cy='78' r='1' fill='rgba(255,255,255,0.09)' xmlns='http://www.w3.org/2000/svg'/%3E%3C!-- elegant spiral flourish --%3E%3Cpath d='M120 20 Q130 15 135 22 Q140 30 132 35 Q124 40 118 33 Q112 26 120 20' stroke='rgba(255,255,255,0.08)' stroke-width='0.5'/%3E%3C!-- feather barb lines --%3E%3Cline x1='18' y1='48' x2='10' y2='55' stroke='rgba(255,255,255,0.05)' stroke-width='0.4'/%3E%3Cline x1='19' y1='50' x2='12' y2='58' stroke='rgba(255,255,255,0.05)' stroke-width='0.4'/%3E%3Cline x1='20' y1='52' x2='14' y2='61' stroke='rgba(255,255,255,0.05)' stroke-width='0.4'/%3E%3Cline x1='21' y1='54' x2='16' y2='64' stroke='rgba(255,255,255,0.05)' stroke-width='0.4'/%3E%3C!-- open book pages hint --%3E%3Cpath d='M75 120 Q80 112 85 120' stroke='rgba(255,255,255,0.07)' stroke-width='0.5'/%3E%3Cpath d='M65 122 Q80 110 95 122' stroke='rgba(255,255,255,0.06)' stroke-width='0.4'/%3E%3Cline x1='80' y1='110' x2='80' y2='125' stroke='rgba(255,255,255,0.05)' stroke-width='0.3'/%3E%3C!-- manuscript text lines --%3E%3Cline x1='45' y1='18' x2='90' y2='18' stroke='rgba(255,255,255,0.04)' stroke-width='0.4'/%3E%3Cline x1='42' y1='23' x2='88' y2='23' stroke='rgba(255,255,255,0.04)' stroke-width='0.4'/%3E%3Cline x1='48' y1='28' x2='85' y2='28' stroke='rgba(255,255,255,0.04)' stroke-width='0.4'/%3E%3C/svg%3E") 0 0 / 160px 140px repeat,
            linear-gradient(135deg, #fff 0%, #e8e0d8 40%, #fff 60%, #d4c8b8 100%);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
        }

        /* --- Top layer: colored text with mask on hover --- */
        .hero-oil-wrap .hero-mega:not(.hero-underlay) {
          position: relative;
          z-index: 2;
          --mx: -300px;
          --my: -300px;
          -webkit-mask-image: none;
          mask-image: none;
        }
        .hero-oil-wrap .hero-mega.oil-active:not(.hero-underlay) {
          -webkit-mask-image:
            radial-gradient(
              ellipse 180px 200px at var(--mx) var(--my),
              transparent 0%,
              transparent 35%,
              rgba(0,0,0,0.3) 50%,
              rgba(0,0,0,0.7) 65%,
              rgba(0,0,0,1) 80%
            );
          mask-image:
            radial-gradient(
              ellipse 180px 200px at var(--mx) var(--my),
              transparent 0%,
              transparent 35%,
              rgba(0,0,0,0.3) 50%,
              rgba(0,0,0,0.7) 65%,
              rgba(0,0,0,1) 80%
            );
        }
      `;
      document.head.appendChild(oilCSS);

      // 4. Mouse tracking — smooth with lerp for fluid feel
      let targetX = -300, targetY = -300;
      let currentX = -300, currentY = -300;
      let oilActive = false;
      let oilRAF = null;

      function lerpOil() {
        currentX += (targetX - currentX) * 0.12;
        currentY += (targetY - currentY) * 0.12;
        heroMega.style.setProperty('--mx', currentX + 'px');
        heroMega.style.setProperty('--my', currentY + 'px');
        if (oilActive || Math.abs(targetX - currentX) > 0.5) {
          oilRAF = requestAnimationFrame(lerpOil);
        } else {
          oilRAF = null;
        }
      }

      heroMega.addEventListener('mouseenter', () => {
        oilActive = true;
        heroMega.classList.add('oil-active');
        if (!oilRAF) oilRAF = requestAnimationFrame(lerpOil);
      });

      heroMega.addEventListener('mouseleave', () => {
        oilActive = false;
        heroMega.classList.remove('oil-active');
        targetX = -300;
        targetY = -300;
      });

      heroMega.addEventListener('mousemove', (e) => {
        const rect = heroMega.getBoundingClientRect();
        targetX = e.clientX - rect.left;
        targetY = e.clientY - rect.top;
        if (!oilRAF) oilRAF = requestAnimationFrame(lerpOil);
      });
    }
  }

  // ---- PARALLAX ON IMAGES ----
  document.querySelectorAll('.portfolio-item img, .about-image img, .service-detail-image img').forEach(img => {
    img.style.transition = 'transform 0.8s cubic-bezier(0.16,1,0.3,1), filter 0.6s ease';

    const imgParallax = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const onScroll = () => {
            const rect = entry.target.getBoundingClientRect();
            const viewH = window.innerHeight;
            const progress = (viewH - rect.top) / (viewH + rect.height);
            const offset = (progress - 0.5) * 30;
            entry.target.style.transform = `translateY(${offset}px) scale(1.02)`;
          };
          window.addEventListener('scroll', onScroll, { passive: true });
        }
      });
    }, { threshold: 0 });
    imgParallax.observe(img);
  });

  // ---- PORTFOLIO FILTER ----
  const filterButtons = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item[data-category]');

  if (filterButtons.length > 0) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;

        portfolioItems.forEach((item, i) => {
          if (filter === 'all' || item.dataset.category === filter) {
            item.style.display = '';
            setTimeout(() => {
              item.style.opacity = '1';
              item.style.transform = 'translateY(0) scale(1)';
              item.style.filter = 'blur(0)';
            }, i * 80);
          } else {
            item.style.opacity = '0';
            item.style.transform = 'translateY(10px) scale(0.97)';
            item.style.filter = 'blur(3px)';
            setTimeout(() => { item.style.display = 'none'; }, 500);
          }
        });
      });
    });
  }

  // ---- CONTACT FORM ----
  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(contactForm);
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;

      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        contactForm.style.opacity = '0';
        contactForm.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          contactForm.style.display = 'none';
          if (formSuccess) {
            formSuccess.classList.add('show');
            formSuccess.style.opacity = '0';
            formSuccess.style.transform = 'translateY(10px)';
            setTimeout(() => {
              formSuccess.style.transition = 'all 0.6s cubic-bezier(0.16,1,0.3,1)';
              formSuccess.style.opacity = '1';
              formSuccess.style.transform = 'translateY(0)';
            }, 50);
          }
        }, 400);
      } catch (err) {
        contactForm.style.display = 'none';
        if (formSuccess) formSuccess.classList.add('show');
      }

      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.style.opacity = '';
    });
  }

  // ---- SMOOTH SCROLL ----
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---- MAGNETIC CURSOR ON BUTTONS ----
  if (window.matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.btn, .filter-btn').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
      });
    });
  }

  // ---- COUNTER ANIMATION FOR STATS ----
  document.querySelectorAll('.stat-item h4').forEach(stat => {
    const text = stat.textContent.trim();
    const match = text.match(/^(\d+)(\+?)$/);
    if (!match) return;

    const target = parseInt(match[1]);
    const suffix = match[2] || '';
    stat.textContent = '0' + suffix;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          let current = 0;
          const duration = 1800;
          const startTime = performance.now();

          function updateCount(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quart
            const eased = 1 - Math.pow(1 - progress, 4);
            current = Math.round(eased * target);
            stat.textContent = current + suffix;
            if (progress < 1) requestAnimationFrame(updateCount);
          }
          requestAnimationFrame(updateCount);

          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    obs.observe(stat);
  });

  // ---- HERO TEXT ENTRANCE ----
  const heroLines = document.querySelectorAll('.hero-mega .l1, .hero-mega .l2, .hero-mega .l3');
  heroLines.forEach((line, i) => {
    line.style.opacity = '0';
    line.style.transform = 'translateY(80px)';
    line.style.filter = 'blur(8px)';
    line.style.transition = `opacity 1s cubic-bezier(0.16,1,0.3,1) ${i * 180 + 400}ms, ` +
                            `transform 1s cubic-bezier(0.16,1,0.3,1) ${i * 180 + 400}ms, ` +
                            `filter 1s cubic-bezier(0.16,1,0.3,1) ${i * 180 + 400}ms`;
    setTimeout(() => {
      line.style.opacity = '1';
      line.style.transform = 'translateY(0)';
      line.style.filter = 'blur(0)';
    }, 100);
  });

  // ---- HERO BOTTOM ENTRANCE ----
  const heroBottom = document.querySelector('.hero-bottom');
  if (heroBottom) {
    heroBottom.style.opacity = '0';
    heroBottom.style.transform = 'translateY(25px)';
    heroBottom.style.filter = 'blur(4px)';
    heroBottom.style.transition = 'opacity 0.9s cubic-bezier(0.16,1,0.3,1) 1.2s, ' +
                                  'transform 0.9s cubic-bezier(0.16,1,0.3,1) 1.2s, ' +
                                  'filter 0.9s cubic-bezier(0.16,1,0.3,1) 1.2s';
    setTimeout(() => {
      heroBottom.style.opacity = '1';
      heroBottom.style.transform = 'translateY(0)';
      heroBottom.style.filter = 'blur(0)';
    }, 100);
  }

  // ---- HERO TAG ENTRANCE ----
  const heroTag = document.querySelector('.hero .tag');
  if (heroTag) {
    heroTag.style.opacity = '0';
    heroTag.style.filter = 'blur(4px)';
    heroTag.style.transition = 'opacity 1s cubic-bezier(0.16,1,0.3,1) 1.6s, ' +
                                'filter 1s cubic-bezier(0.16,1,0.3,1) 1.6s';
    setTimeout(() => {
      heroTag.style.opacity = '1';
      heroTag.style.filter = 'blur(0)';
    }, 100);
  }

  // ---- SECTION BORDER REVEAL ----
  document.querySelectorAll('.sec-header, .hero-bottom, .testimonial-section, .section-divider').forEach(el => {
    const borderEl = el.querySelector('[style*="border"]') || el;
    // Already handled by main reveal
  });

  // ---- MARQUEE PAUSE ON HOVER ----
  const manifesto = document.querySelector('.manifesto-inner');
  if (manifesto) {
    const marqueeParent = manifesto.parentElement;
    marqueeParent.addEventListener('mouseenter', () => {
      manifesto.style.animationPlayState = 'paused';
    });
    marqueeParent.addEventListener('mouseleave', () => {
      manifesto.style.animationPlayState = 'running';
    });
  }

  // ---- MOBILE: REVEAL COLOR ON SCROLL ----
  if (!window.matchMedia('(hover:hover)').matches) {
    const allImages = document.querySelectorAll(
      '.portfolio-item img, .blog-card-image img, .team-card img, ' +
      '.about-image img, .service-detail-image img'
    );
    const colorObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('color-revealed');
          }, 300);
          colorObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    allImages.forEach(img => colorObserver.observe(img));
  }

});
