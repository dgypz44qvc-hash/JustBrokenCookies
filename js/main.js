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

        /* --- Underlay: HIDDEN by default, only visible on hover --- */
        .hero-underlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none;
          z-index: 1;
          user-select: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .hero-oil-wrap.oil-hover .hero-underlay {
          opacity: 1;
        }

        /* JUST — Camera lens: bold aperture rings, iris geometry */
        .hero-underlay .l1 {
          color: transparent !important;
          background:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='none' stroke='%23fff' stroke-width='1' opacity='0.35'/%3E%3Ccircle cx='50' cy='50' r='36' fill='none' stroke='%23fff' stroke-width='0.8' opacity='0.3'/%3E%3Ccircle cx='50' cy='50' r='26' fill='none' stroke='%23fff' stroke-width='1.2' opacity='0.35'/%3E%3Ccircle cx='50' cy='50' r='16' fill='none' stroke='%23fff' stroke-width='0.6' opacity='0.25'/%3E%3Ccircle cx='50' cy='50' r='7' fill='none' stroke='%23fff' stroke-width='1.5' opacity='0.4'/%3E%3Cline x1='50' y1='2' x2='50' y2='12' stroke='%23fff' stroke-width='0.6' opacity='0.3'/%3E%3Cline x1='50' y1='88' x2='50' y2='98' stroke='%23fff' stroke-width='0.6' opacity='0.3'/%3E%3Cline x1='2' y1='50' x2='12' y2='50' stroke='%23fff' stroke-width='0.6' opacity='0.3'/%3E%3Cline x1='88' y1='50' x2='98' y2='50' stroke='%23fff' stroke-width='0.6' opacity='0.3'/%3E%3Cpath d='M50 4 L54 18 L50 14 L46 18 Z' fill='%23fff' opacity='0.12'/%3E%3Cpath d='M96 50 L82 54 L86 50 L82 46 Z' fill='%23fff' opacity='0.12'/%3E%3Cpath d='M50 96 L46 82 L50 86 L54 82 Z' fill='%23fff' opacity='0.12'/%3E%3Cpath d='M4 50 L18 46 L14 50 L18 54 Z' fill='%23fff' opacity='0.12'/%3E%3Cpath d='M26 10 Q50 28 74 10' fill='none' stroke='%23fff' stroke-width='0.5' opacity='0.2'/%3E%3Cpath d='M90 26 Q72 50 90 74' fill='none' stroke='%23fff' stroke-width='0.5' opacity='0.2'/%3E%3Cpath d='M74 90 Q50 72 26 90' fill='none' stroke='%23fff' stroke-width='0.5' opacity='0.2'/%3E%3Cpath d='M10 74 Q28 50 10 26' fill='none' stroke='%23fff' stroke-width='0.5' opacity='0.2'/%3E%3C/svg%3E") 0 0 / 100px 100px repeat,
            linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(210,200,185,0.9) 50%, rgba(255,255,255,0.95) 100%);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }

        /* BROKEN — Strategy: constellation nodes, connected network */
        .hero-underlay .l2 {
          color: transparent !important;
          background:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='25' cy='20' r='3.5' fill='%23fff' opacity='0.35'/%3E%3Ccircle cx='80' cy='15' r='3' fill='%23fff' opacity='0.3'/%3E%3Ccircle cx='60' cy='50' r='4.5' fill='%23fff' opacity='0.4'/%3E%3Ccircle cx='20' cy='70' r='3' fill='%23fff' opacity='0.3'/%3E%3Ccircle cx='100' cy='60' r='3.5' fill='%23fff' opacity='0.35'/%3E%3Ccircle cx='45' cy='100' r='3' fill='%23fff' opacity='0.3'/%3E%3Ccircle cx='105' cy='105' r='2.5' fill='%23fff' opacity='0.25'/%3E%3Ccircle cx='45' cy='30' r='1.5' fill='%23fff' opacity='0.2'/%3E%3Ccircle cx='85' cy='38' r='1.5' fill='%23fff' opacity='0.2'/%3E%3Ccircle cx='35' cy='55' r='1.5' fill='%23fff' opacity='0.15'/%3E%3Ccircle cx='80' cy='85' r='1.5' fill='%23fff' opacity='0.2'/%3E%3Cline x1='25' y1='20' x2='45' y2='30' stroke='%23fff' stroke-width='0.8' opacity='0.25'/%3E%3Cline x1='45' y1='30' x2='60' y2='50' stroke='%23fff' stroke-width='0.8' opacity='0.25'/%3E%3Cline x1='60' y1='50' x2='80' y2='15' stroke='%23fff' stroke-width='0.6' opacity='0.2'/%3E%3Cline x1='60' y1='50' x2='85' y2='38' stroke='%23fff' stroke-width='0.6' opacity='0.2'/%3E%3Cline x1='85' y1='38' x2='100' y2='60' stroke='%23fff' stroke-width='0.8' opacity='0.25'/%3E%3Cline x1='60' y1='50' x2='35' y2='55' stroke='%23fff' stroke-width='0.5' opacity='0.18'/%3E%3Cline x1='35' y1='55' x2='20' y2='70' stroke='%23fff' stroke-width='0.8' opacity='0.25'/%3E%3Cline x1='20' y1='70' x2='45' y2='100' stroke='%23fff' stroke-width='0.6' opacity='0.2'/%3E%3Cline x1='100' y1='60' x2='105' y2='105' stroke='%23fff' stroke-width='0.6' opacity='0.2'/%3E%3Cline x1='45' y1='100' x2='80' y2='85' stroke='%23fff' stroke-width='0.6' opacity='0.2'/%3E%3Cline x1='80' y1='85' x2='105' y2='105' stroke='%23fff' stroke-width='0.6' opacity='0.2'/%3E%3Cpath d='M60 44 L66 50 L60 56 L54 50 Z' fill='none' stroke='%23fff' stroke-width='0.8' opacity='0.3'/%3E%3Cpath d='M25 20 Q10 45 20 70' fill='none' stroke='%23fff' stroke-width='0.4' stroke-dasharray='3 5' opacity='0.15'/%3E%3Cpath d='M80 15 Q105 38 100 60' fill='none' stroke='%23fff' stroke-width='0.4' stroke-dasharray='3 5' opacity='0.15'/%3E%3C/svg%3E") 0 0 / 120px 120px repeat,
            linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(210,200,185,0.9) 50%, rgba(255,255,255,0.95) 100%);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }

        /* COOKIES — Writing: quill flourishes, calligraphic swashes */
        .hero-underlay .l3 {
          color: transparent !important;
          background:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='120' viewBox='0 0 140 120'%3E%3Cpath d='M8 60 Q28 20 55 42 Q70 52 90 30 Q110 10 135 45' fill='none' stroke='%23fff' stroke-width='1' stroke-linecap='round' opacity='0.3'/%3E%3Cpath d='M5 85 Q30 65 55 78 Q75 88 100 62 Q120 42 138 70' fill='none' stroke='%23fff' stroke-width='0.8' stroke-linecap='round' opacity='0.25'/%3E%3Cpath d='M12 100 Q40 90 60 98 Q80 106 100 92 Q120 80 135 95' fill='none' stroke='%23fff' stroke-width='0.5' stroke-linecap='round' opacity='0.18'/%3E%3Cpath d='M18 38 L24 22 L20 15' stroke='%23fff' stroke-width='1.2' stroke-linecap='round' opacity='0.35'/%3E%3Cpath d='M24 22 Q30 28 26 36' stroke='%23fff' stroke-width='0.8' stroke-linecap='round' opacity='0.3'/%3E%3Cline x1='16' y1='42' x2='6' y2='52' stroke='%23fff' stroke-width='0.5' opacity='0.18'/%3E%3Cline x1='17' y1='44' x2='8' y2='55' stroke='%23fff' stroke-width='0.5' opacity='0.18'/%3E%3Cline x1='18' y1='46' x2='10' y2='58' stroke='%23fff' stroke-width='0.5' opacity='0.18'/%3E%3Cline x1='19' y1='48' x2='12' y2='61' stroke='%23fff' stroke-width='0.5' opacity='0.18'/%3E%3Cline x1='20' y1='50' x2='14' y2='64' stroke='%23fff' stroke-width='0.5' opacity='0.15'/%3E%3Ccircle cx='26' cy='36' r='1.8' fill='%23fff' opacity='0.3'/%3E%3Ccircle cx='90' cy='28' r='1' fill='%23fff' opacity='0.2'/%3E%3Ccircle cx='55' cy='44' r='0.8' fill='%23fff' opacity='0.15'/%3E%3Ccircle cx='120' cy='65' r='1.2' fill='%23fff' opacity='0.2'/%3E%3Cpath d='M105 12 Q115 8 120 16 Q125 25 117 30 Q108 34 104 25 Q100 18 105 12' fill='none' stroke='%23fff' stroke-width='0.7' opacity='0.22'/%3E%3Cpath d='M70 108 Q78 98 86 108' fill='none' stroke='%23fff' stroke-width='0.6' opacity='0.2'/%3E%3Cpath d='M62 112 Q78 95 94 112' fill='none' stroke='%23fff' stroke-width='0.5' opacity='0.15'/%3E%3Cline x1='78' y1='95' x2='78' y2='115' stroke='%23fff' stroke-width='0.4' opacity='0.15'/%3E%3C/svg%3E") 0 0 / 140px 120px repeat,
            linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(210,200,185,0.9) 50%, rgba(255,255,255,0.95) 100%);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
        }

        /* --- Top layer: colored text with mask on hover --- */
        .hero-oil-wrap .hero-mega:not(.hero-underlay) {
          position: relative;
          z-index: 2;
          --mx: -300px;
          --my: -300px;
        }
        .hero-oil-wrap.oil-hover .hero-mega:not(.hero-underlay) {
          -webkit-mask-image:
            radial-gradient(
              ellipse 200px 220px at var(--mx) var(--my),
              transparent 0%,
              transparent 30%,
              rgba(0,0,0,0.4) 45%,
              rgba(0,0,0,0.8) 60%,
              rgba(0,0,0,1) 75%
            );
          mask-image:
            radial-gradient(
              ellipse 200px 220px at var(--mx) var(--my),
              transparent 0%,
              transparent 30%,
              rgba(0,0,0,0.4) 45%,
              rgba(0,0,0,0.8) 60%,
              rgba(0,0,0,1) 75%
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
        wrapper.classList.add('oil-hover');
        if (!oilRAF) oilRAF = requestAnimationFrame(lerpOil);
      });

      heroMega.addEventListener('mouseleave', () => {
        oilActive = false;
        wrapper.classList.remove('oil-hover');
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
