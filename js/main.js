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
