/* ============================================
   JUSTBROKENCOOKIES — Premium Interactions
   1950s Polished Illustration Edition
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---- NAVBAR SCROLL EFFECT ----
  const navbar = document.getElementById('navbar');
  if (navbar) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      navbar.classList.toggle('scrolled', scrollY > 50);
      // Hide nav on scroll down, show on scroll up
      if (scrollY > 300) {
        navbar.style.transform = scrollY > lastScroll ? 'translateY(-100%)' : 'translateY(0)';
      } else {
        navbar.style.transform = 'translateY(0)';
      }
      lastScroll = scrollY;
    });
  }

  // ---- HAMBURGER MENU ----
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  // ---- STAGGERED SCROLL REVEAL ----
  const revealElements = document.querySelectorAll(
    '.fade-up, .service-card, .value-card, .process-card, .blog-card, ' +
    '.portfolio-item, .team-card, .stat-item, .contact-info-item, ' +
    '.service-detail, .section-title, .section-label, .section-subtitle'
  );

  if (revealElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger siblings in the same parent
          const parent = entry.target.parentElement;
          const siblings = parent ? Array.from(parent.children).filter(
            c => revealElements.length > 0 && (
              c.classList.contains('service-card') ||
              c.classList.contains('value-card') ||
              c.classList.contains('process-card') ||
              c.classList.contains('blog-card') ||
              c.classList.contains('portfolio-item') ||
              c.classList.contains('team-card') ||
              c.classList.contains('stat-item')
            )
          ) : [];

          const staggerIndex = siblings.indexOf(entry.target);
          const delay = staggerIndex > 0 ? staggerIndex * 120 : 0;

          setTimeout(() => {
            entry.target.classList.add('visible');
            entry.target.style.transitionDelay = '0ms';
          }, delay);

          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => {
      // Set initial state for non-fade-up elements
      if (!el.classList.contains('fade-up')) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      }
      observer.observe(el);
    });

    // Override the observer callback for non-fade-up elements
    const revealObserver = new MutationObserver(() => {});
    revealElements.forEach(el => {
      if (!el.classList.contains('fade-up')) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const parent = entry.target.parentElement;
              const cards = parent ? Array.from(parent.children).filter(c =>
                c.style && c.style.opacity === '0'
              ) : [];
              const idx = cards.indexOf(entry.target);
              const delay = Math.max(0, idx) * 120;

              setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
              }, delay);

              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        obs.observe(el);
      }
    });
  }

  // ---- PARALLAX ON HERO ----
  const hero = document.querySelector('.hero');
  if (hero) {
    const heroMega = hero.querySelector('.hero-mega');
    const heroTag = hero.querySelector('.tag');

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const heroHeight = hero.offsetHeight;
      if (scrollY < heroHeight) {
        const ratio = scrollY / heroHeight;
        if (heroMega) {
          heroMega.style.transform = `translateY(${scrollY * 0.15}px)`;
          heroMega.style.opacity = 1 - ratio * 0.6;
        }
        if (heroTag) {
          heroTag.style.transform = `translateY(${scrollY * 0.08}px)`;
        }
      }
    }, { passive: true });
  }

  // ---- IMAGE ZOOM ON HOVER (portfolio, blog, team) ----
  document.querySelectorAll('.portfolio-item img, .blog-card-image img, .team-card img, .about-image img, .service-detail-image img').forEach(img => {
    img.style.transition = 'transform 0.8s ease, filter 0.6s ease';
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
            }, i * 80);
          } else {
            item.style.opacity = '0';
            item.style.transform = 'translateY(10px) scale(0.97)';
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

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        contactForm.style.display = 'none';
        if (formSuccess) formSuccess.classList.add('show');
      } catch (err) {
        contactForm.style.display = 'none';
        if (formSuccess) formSuccess.classList.add('show');
      }

      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
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
  document.querySelectorAll('.btn, .filter-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

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
          const step = Math.max(1, Math.floor(target / 40));
          const interval = setInterval(() => {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(interval);
            }
            stat.textContent = current + suffix;
          }, 30);
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
    line.style.transform = 'translateY(60px)';
    line.style.transition = `opacity 0.9s ease ${i * 200 + 300}ms, transform 0.9s ease ${i * 200 + 300}ms`;
    setTimeout(() => {
      line.style.opacity = '1';
      line.style.transform = 'translateY(0)';
    }, 50);
  });

  // ---- HERO BOTTOM ENTRANCE ----
  const heroBottom = document.querySelector('.hero-bottom');
  if (heroBottom) {
    heroBottom.style.opacity = '0';
    heroBottom.style.transform = 'translateY(20px)';
    heroBottom.style.transition = 'opacity 0.8s ease 1.1s, transform 0.8s ease 1.1s';
    setTimeout(() => {
      heroBottom.style.opacity = '1';
      heroBottom.style.transform = 'translateY(0)';
    }, 50);
  }

  // ---- HERO TAG ENTRANCE ----
  const heroTag = document.querySelector('.hero .tag');
  if (heroTag) {
    heroTag.style.opacity = '0';
    heroTag.style.transition = 'opacity 1s ease 1.5s';
    setTimeout(() => { heroTag.style.opacity = '1'; }, 50);
  }

});
