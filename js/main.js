/* ============================================
   JUSTBROKENCOOKIES — Premium Cinematic Engine
   Dark Luxe Edition
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---- PRELOADER ---- (max 1s total)
  const preloader = document.querySelector('.preloader');
  if (preloader) {
    const dismissPreloader = () => { if (!preloader.classList.contains('loaded')) preloader.classList.add('loaded'); };
    window.addEventListener('load', dismissPreloader);
    if (document.readyState === 'complete') dismissPreloader();
    // Hard cap: dismiss after 1 second no matter what
    setTimeout(dismissPreloader, 1000);
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
    const heroMega = hero.querySelector('.hero-mega:not(.hero-underlay)') || hero.querySelector('.hero-mega');
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
            // Apply parallax to the oil-wrap wrapper so both layers move together
            const oilWrap = hero.querySelector('.hero-oil-wrap');
            const parallaxTarget = oilWrap || heroMega;
            if (parallaxTarget) {
              parallaxTarget.style.transform = `translateY(${scrollY * 0.18}px)`;
              parallaxTarget.style.opacity = 1 - ratio * 0.7;
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
    if (heroMega) {
      const isTouch = !window.matchMedia('(hover:hover)').matches;

      // 1. Wrap heroMega
      const wrapper = document.createElement('div');
      wrapper.classList.add('hero-oil-wrap');
      heroMega.parentElement.insertBefore(wrapper, heroMega);
      wrapper.appendChild(heroMega);

      // 2. Clone underlay
      const underlay = heroMega.cloneNode(true);
      underlay.classList.add('hero-underlay');
      underlay.removeAttribute('style');
      wrapper.insertBefore(underlay, heroMega);

      // 3. SVG patterns — tattoo ink (black #111 on white), fine-line art
      const lensSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 110 110'%3E%3Cdefs%3E%3Cstyle%3E*%7Bfill:none;stroke:%23111;stroke-linecap:round%7D%3C/style%3E%3C/defs%3E%3Ccircle cx='55' cy='55' r='50' stroke-width='0.6' opacity='0.5'/%3E%3Ccircle cx='55' cy='55' r='42' stroke-width='0.4' opacity='0.35'/%3E%3Ccircle cx='55' cy='55' r='34' stroke-width='0.7' opacity='0.55'/%3E%3Ccircle cx='55' cy='55' r='25' stroke-width='0.4' opacity='0.35'/%3E%3Ccircle cx='55' cy='55' r='17' stroke-width='0.8' opacity='0.6'/%3E%3Ccircle cx='55' cy='55' r='9' stroke-width='1' opacity='0.7'/%3E%3Ccircle cx='55' cy='55' r='3' stroke-width='0.6' opacity='0.5'/%3E%3Cline x1='55' y1='2' x2='55' y2='10' stroke-width='0.5' opacity='0.5'/%3E%3Cline x1='55' y1='100' x2='55' y2='108' stroke-width='0.5' opacity='0.5'/%3E%3Cline x1='2' y1='55' x2='10' y2='55' stroke-width='0.5' opacity='0.5'/%3E%3Cline x1='100' y1='55' x2='108' y2='55' stroke-width='0.5' opacity='0.5'/%3E%3Cline x1='16' y1='16' x2='22' y2='22' stroke-width='0.4' opacity='0.35'/%3E%3Cline x1='94' y1='16' x2='88' y2='22' stroke-width='0.4' opacity='0.35'/%3E%3Cline x1='16' y1='94' x2='22' y2='88' stroke-width='0.4' opacity='0.35'/%3E%3Cline x1='94' y1='94' x2='88' y2='88' stroke-width='0.4' opacity='0.35'/%3E%3Cpath d='M55 5 L58 15 L55 12 L52 15Z' stroke-width='0.3' opacity='0.4'/%3E%3Cpath d='M105 55 L95 58 L98 55 L95 52Z' stroke-width='0.3' opacity='0.4'/%3E%3Cpath d='M30 12 Q55 32 80 12' stroke-width='0.4' opacity='0.3'/%3E%3Cpath d='M98 30 Q78 55 98 80' stroke-width='0.4' opacity='0.3'/%3E%3Cpath d='M80 98 Q55 78 30 98' stroke-width='0.4' opacity='0.3'/%3E%3Cpath d='M12 80 Q32 55 12 30' stroke-width='0.4' opacity='0.3'/%3E%3Cpath d='M36 22 Q44 34 55 30 Q66 26 72 18' stroke-width='0.35' opacity='0.28'/%3E%3Cpath d='M88 36 Q76 44 80 55 Q84 66 92 72' stroke-width='0.35' opacity='0.28'/%3E%3C/svg%3E";
      const constellSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='130' height='130' viewBox='0 0 130 130'%3E%3Cdefs%3E%3Cstyle%3Eline,path%7Bfill:none;stroke:%23111;stroke-linecap:round%7D%3C/style%3E%3C/defs%3E%3Ccircle cx='28' cy='22' r='3' fill='none' stroke='%23111' stroke-width='0.7' opacity='0.6'/%3E%3Ccircle cx='28' cy='22' r='1' fill='%23111' opacity='0.5'/%3E%3Ccircle cx='85' cy='16' r='2.5' fill='none' stroke='%23111' stroke-width='0.6' opacity='0.55'/%3E%3Ccircle cx='85' cy='16' r='0.8' fill='%23111' opacity='0.45'/%3E%3Ccircle cx='65' cy='52' r='4' fill='none' stroke='%23111' stroke-width='0.8' opacity='0.65'/%3E%3Ccircle cx='65' cy='52' r='1.5' fill='%23111' opacity='0.55'/%3E%3Ccircle cx='22' cy='75' r='2.5' fill='none' stroke='%23111' stroke-width='0.6' opacity='0.55'/%3E%3Ccircle cx='22' cy='75' r='0.8' fill='%23111' opacity='0.45'/%3E%3Ccircle cx='105' cy='62' r='3' fill='none' stroke='%23111' stroke-width='0.7' opacity='0.6'/%3E%3Ccircle cx='105' cy='62' r='1' fill='%23111' opacity='0.5'/%3E%3Ccircle cx='48' cy='105' r='2.5' fill='none' stroke='%23111' stroke-width='0.6' opacity='0.55'/%3E%3Ccircle cx='48' cy='105' r='0.8' fill='%23111' opacity='0.45'/%3E%3Cline x1='28' y1='22' x2='65' y2='52' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='65' y1='52' x2='85' y2='16' stroke-width='0.4' opacity='0.35'/%3E%3Cline x1='65' y1='52' x2='105' y2='62' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='65' y1='52' x2='22' y2='75' stroke-width='0.4' opacity='0.35'/%3E%3Cline x1='22' y1='75' x2='48' y2='105' stroke-width='0.5' opacity='0.4'/%3E%3Cline x1='105' y1='62' x2='110' y2='110' stroke-width='0.4' opacity='0.35'/%3E%3Cpath d='M65 46 L71 52 L65 58 L59 52Z' stroke-width='0.5' opacity='0.45'/%3E%3Cpath d='M28 22 Q12 48 22 75' stroke-width='0.3' stroke-dasharray='2 3' opacity='0.25'/%3E%3Cpath d='M85 16 Q110 38 105 62' stroke-width='0.3' stroke-dasharray='2 3' opacity='0.25'/%3E%3C/svg%3E";
      const quillSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='130' viewBox='0 0 150 130'%3E%3Cdefs%3E%3Cstyle%3Epath,line%7Bfill:none;stroke:%23111;stroke-linecap:round%7D%3C/style%3E%3C/defs%3E%3Cpath d='M20 42 L28 18 L24 8' stroke-width='1' opacity='0.6'/%3E%3Cpath d='M28 18 Q36 28 30 42' stroke-width='0.7' opacity='0.5'/%3E%3Cpath d='M22 44 L24 42 L20 42 L22 44Z' fill='%23111' opacity='0.5'/%3E%3Cline x1='18' y1='46' x2='6' y2='60' stroke-width='0.35' opacity='0.3'/%3E%3Cline x1='19' y1='49' x2='8' y2='64' stroke-width='0.35' opacity='0.3'/%3E%3Cline x1='20' y1='52' x2='10' y2='68' stroke-width='0.35' opacity='0.28'/%3E%3Cline x1='21' y1='55' x2='12' y2='72' stroke-width='0.3' opacity='0.25'/%3E%3Ccircle cx='30' cy='42' r='1.5' fill='%23111' opacity='0.45'/%3E%3Cpath d='M10 65 Q35 22 62 48 Q78 62 98 32 Q115 8 142 50' stroke-width='0.6' opacity='0.4'/%3E%3Cpath d='M5 92 Q32 68 58 82 Q80 95 108 62 Q128 38 145 72' stroke-width='0.5' opacity='0.35'/%3E%3Cpath d='M15 112 Q45 98 65 106 Q88 116 108 96 Q128 78 142 100' stroke-width='0.35' opacity='0.25'/%3E%3Cpath d='M112 10 Q124 4 128 16 Q134 30 124 36 Q112 42 108 30 Q104 18 112 10' stroke-width='0.5' opacity='0.4'/%3E%3Ccircle cx='95' cy='30' r='0.8' fill='%23111' opacity='0.35'/%3E%3Ccircle cx='58' cy='50' r='0.6' fill='%23111' opacity='0.3'/%3E%3Ccircle cx='128' cy='65' r='0.8' fill='%23111' opacity='0.3'/%3E%3Cpath d='M72 112 Q80 100 88 112' stroke-width='0.5' opacity='0.35'/%3E%3Cpath d='M64 116 Q80 96 96 116' stroke-width='0.4' opacity='0.3'/%3E%3Cline x1='80' y1='96' x2='80' y2='120' stroke-width='0.3' opacity='0.25'/%3E%3C/svg%3E";
      const gradBG = "linear-gradient(135deg, #fff 0%, #f5f0ea 40%, #fff 60%, #ede5da 100%)";

      // 4. Inject CSS
      const oilCSS = document.createElement('style');
      oilCSS.textContent = `
        .hero-oil-wrap { position:relative; display:inline-block; width:100%; overflow:hidden; }
        .hero { overflow:hidden !important; }
        .hero-underlay {
          position:absolute; top:0; left:0; width:100%; height:100%;
          pointer-events:none; z-index:1; user-select:none;
          opacity:0; visibility:hidden; transition:opacity 0.4s ease, visibility 0.4s;
        }
        .hero-underlay .l1 {
          color:transparent !important;
          background: url("${lensSVG}") 0 0/110px 110px repeat, ${gradBG};
          -webkit-background-clip:text !important; background-clip:text !important;
          -webkit-text-fill-color:transparent !important;
        }
        .hero-underlay .l2 {
          color:transparent !important;
          background: url("${constellSVG}") 0 0/130px 130px repeat, ${gradBG};
          -webkit-background-clip:text !important; background-clip:text !important;
          -webkit-text-fill-color:transparent !important;
        }
        .hero-underlay .l3 {
          color:transparent !important;
          background: url("${quillSVG}") 0 0/150px 130px repeat, ${gradBG};
          -webkit-background-clip:text !important; background-clip:text !important;
          -webkit-text-fill-color:transparent !important;
        }
        .hero-oil-wrap .hero-mega:not(.hero-underlay) {
          position:relative; z-index:2; --mx:-300px; --my:-300px;
        }
        /* DESKTOP hover reveal */
        .hero-oil-wrap.oil-hover .hero-underlay { opacity:1; visibility:visible; }
        .hero-oil-wrap.oil-hover .hero-mega:not(.hero-underlay) {
          -webkit-mask-image: radial-gradient(ellipse 200px 220px at var(--mx) var(--my),
            transparent 0%, transparent 30%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,1) 75%);
          mask-image: radial-gradient(ellipse 200px 220px at var(--mx) var(--my),
            transparent 0%, transparent 30%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,1) 75%);
        }
        /* MOBILE scroll wipe */
        .hero-oil-wrap.oil-scroll .hero-underlay { opacity:1; visibility:visible; }
        .hero-oil-wrap.oil-scroll .hero-mega:not(.hero-underlay) {
          -webkit-mask-image: linear-gradient(to bottom,
            transparent 0%, transparent var(--scroll-reveal,0%),
            rgba(0,0,0,0.3) calc(var(--scroll-reveal,0%) + 5%),
            rgba(0,0,0,1) calc(var(--scroll-reveal,0%) + 15%));
          mask-image: linear-gradient(to bottom,
            transparent 0%, transparent var(--scroll-reveal,0%),
            rgba(0,0,0,0.3) calc(var(--scroll-reveal,0%) + 5%),
            rgba(0,0,0,1) calc(var(--scroll-reveal,0%) + 15%));
        }
      `;
      document.head.appendChild(oilCSS);

      if (!isTouch) {
        // DESKTOP: mouse tracking with lerp
        let targetX=-300,targetY=-300,currentX=-300,currentY=-300,oilActive=false,oilRAF=null;
        function lerpOil(){
          currentX+=(targetX-currentX)*0.4; currentY+=(targetY-currentY)*0.4;
          heroMega.style.setProperty('--mx',currentX+'px');
          heroMega.style.setProperty('--my',currentY+'px');
          if(oilActive||Math.abs(targetX-currentX)>0.5){oilRAF=requestAnimationFrame(lerpOil);}
          else{oilRAF=null;}
        }
        heroMega.addEventListener('mouseenter',(e)=>{const r=heroMega.getBoundingClientRect();currentX=targetX=e.clientX-r.left;currentY=targetY=e.clientY-r.top;heroMega.style.setProperty('--mx',currentX+'px');heroMega.style.setProperty('--my',currentY+'px');oilActive=true;wrapper.classList.add('oil-hover');if(!oilRAF)oilRAF=requestAnimationFrame(lerpOil);});
        heroMega.addEventListener('mouseleave',()=>{oilActive=false;wrapper.classList.remove('oil-hover');targetX=-300;targetY=-300;});
        heroMega.addEventListener('mousemove',(e)=>{const r=heroMega.getBoundingClientRect();targetX=e.clientX-r.left;targetY=e.clientY-r.top;if(!oilRAF)oilRAF=requestAnimationFrame(lerpOil);});
      } else {
        // MOBILE: scroll-driven wipe — colored text peels away as you scroll
        let scrollTicking = false;
        window.addEventListener('scroll', () => {
          if (!scrollTicking) {
            requestAnimationFrame(() => {
              const heroH = hero.offsetHeight;
              const scrollY = window.scrollY;
              const progress = Math.min(Math.max((scrollY / heroH - 0.1) / 0.5, 0), 1);
              if (progress > 0) {
                wrapper.classList.add('oil-scroll');
                heroMega.style.setProperty('--scroll-reveal', (progress * 100) + '%');
              } else {
                wrapper.classList.remove('oil-scroll');
              }
              scrollTicking = false;
            });
            scrollTicking = true;
          }
        }, { passive: true });
      }
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
  // ---- HERO SECRET WORDS REVEAL ----
  // Replaces the decorative pattern underlay with elegant text:
  // Just -> ONCE, Broken -> UPON, Cookies -> A TIME
  setTimeout(() => {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const underlays = hero.querySelectorAll('.hero-mega.hero-underlay');
    if (!underlays.length) return;

    underlays.forEach((underlay) => {
      const l1 = underlay.querySelector('.l1');
      const l2 = underlay.querySelector('.l2');
      const l3 = underlay.querySelector('.l3');

      if (l1) l1.textContent = 'Once';
      if (l2) l2.textContent = 'Upon';
      if (l3) l3.textContent = 'A Time';

      underlay.classList.add('hero-secret-words');
    });
  }, 80);