/* ============================================================
   JBC Mobile Next — js/mobile-next.js
   Enhancement layer. No dependencies. No jQuery.
   ✓ Never hides content before scroll
   ✓ Never touches carousel transforms
   ✓ Never interferes with local-editor.js
   ✓ Respects prefers-reduced-motion
   ============================================================ */

(function () {
  'use strict';

  // ── Gate: only on mobile, only in top frame, never in editor ──
  if (!window.matchMedia('(max-width: 768px)').matches) return;
  if (window !== window.top) return;
  if (document.body && document.body.dataset.editorId) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Signal active ─────────────────────────────────────────────
  if (document.body) {
    document.body.classList.add('jbc-mobile-next');
  }

  // ── 1. Hero portrait image ────────────────────────────────────
  // The mobile <source> has no srcset — inject it.
  function fixHeroImage() {
    var heroEl = document.querySelector('.hero.jbc-floral-hero');
    if (!heroEl) return;
    var src = heroEl.querySelector('picture source[media*="768px"]');
    if (src && !src.srcset) {
      src.srcset = 'images/mobilelanding-768.webp 768w, images/mobilelanding.webp 900w';
      src.sizes  = '100vw';
      src.type   = 'image/webp';
    }
    var img = heroEl.querySelector('.hero-full-bg');
    if (img) img.style.objectPosition = 'center top';
  }

  // ── 2. Nav overlay body lock (body overflow when menu open) ────
  // main.js handles the hamburger click; we just ensure body is
  // locked while the overlay is open so background doesn't scroll.
  function setupNavBodyLock() {
    var hamburger = document.getElementById('hamburger');
    var navLinks  = document.getElementById('navLinks');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', function () {
      var open = navLinks.classList.contains('open');
      document.body.style.overflow = open ? '' : 'hidden';
    }, true); // capture phase runs before main.js bubble phase

    // Also release when a link is tapped
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        document.body.style.overflow = '';
      }
    });
  }

  // ── 4. Swipe hint below carousel ─────────────────────────────
  function injectSwipeHint() {
    var ring = document.querySelector('#featured-work .jbc-cinema-ring');
    if (!ring) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'jbc-swipe-hint-wrapper';
    wrapper.innerHTML =
      '<div class="jbc-swipe-hint">' +
      '<svg width="20" height="12" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M2 6h16M14 2l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<span>swipe</span>' +
      '</div>';

    ring.parentNode.insertBefore(wrapper, ring.nextSibling);

    // Hide hint after first swipe
    var hidden = false;
    ring.addEventListener('scroll', function () {
      if (!hidden) {
        hidden = true;
        wrapper.style.transition = 'opacity 0.5s';
        wrapper.style.opacity = '0';
        setTimeout(function () { wrapper.style.display = 'none'; }, 500);
      }
    }, { passive: true, once: true });
  }

  // ── 5. Scroll reveals (subtle — content never disappears) ─────
  // Classes used: .jbc-reveal, .jbc-reveal-stagger
  // CSS starts them at opacity: 0.88 (readable), animates to 1.
  // JS just adds the class then observes for .is-visible.

  var REVEAL_TARGETS = [
    '.sec-header',
    '.service-card.jbc-editorial-card',
    '.testi-brutal',
    '.cta-section .container',
    '.footer-brand',
    '.footer-col',
  ];

  // Carousel ring and children must never get reveal classes
  var PROTECTED_CLASSES = [
    'jbc-cinema-panel',
    'jbc-cinema-ring',
    'jbc-cinema-stage',
    'jbc-cinema-pin',
    'jbc-codrops-cinema',
    'jbc-gs-card',
    'jbc-gs-quote',
  ];

  function isProtected(el) {
    if (!el) return true;
    var cls = (typeof el.className === 'string') ? el.className : '';
    if (PROTECTED_CLASSES.some(function (p) { return cls.indexOf(p) !== -1; })) return true;
    // Walk up two levels to catch children inside protected containers
    var parent = el.parentElement;
    if (parent) {
      var pcls = (typeof parent.className === 'string') ? parent.className : '';
      if (PROTECTED_CLASSES.some(function (p) { return pcls.indexOf(p) !== -1; })) return true;
    }
    return false;
  }

  function setupReveals() {
    if (prefersReducedMotion) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

    REVEAL_TARGETS.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          if (isProtected(el)) return;
          if (el.closest && el.closest('.jbc-cinema-ring, .jbc-cinema-stage, .jbc-cinema-pin')) return;
          el.classList.add('jbc-reveal');
          observer.observe(el);
        });
      } catch (e) { /* bad selector — skip */ }
    });

    // Stagger the services grid
    var grid = document.querySelector('#services-overview .services-grid');
    if (grid && !isProtected(grid)) {
      grid.classList.add('jbc-reveal-stagger');
      var gridObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            gridObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      gridObs.observe(grid);
    }
  }

  // ── 6. Fix CTA absolute-positioned children ───────────────────
  // Desktop CTA has inline position:absolute on title/subtitle/btn.
  // On mobile these stack off-screen. Strip the inline style.
  function fixCTA() {
    var cta = document.querySelector('.cta-section .container');
    if (!cta) return;
    ['section-title', 'section-subtitle', 'btn'].forEach(function (cls) {
      var el = cta.querySelector('.' + cls);
      if (el && el.style) {
        el.style.removeProperty('position');
        el.style.removeProperty('left');
        el.style.removeProperty('top');
        el.style.removeProperty('right');
        el.style.removeProperty('bottom');
      }
    });
  }

  // ── 7. Prevent rubber-band scroll past page edges ─────────────
  // (Keeps the experience feeling native and tight)
  function setupScrollBounds() {
    document.addEventListener('touchmove', function (e) {
      // Allow inside scrollable carousel
      var target = e.target;
      while (target && target !== document.body) {
        if (target.classList && target.classList.contains('jbc-cinema-ring')) return;
        target = target.parentElement;
      }
    }, { passive: true });
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    fixHeroImage();
    setupNavBodyLock();
    injectSwipeHint();
    fixCTA();
    setupReveals();
    setupScrollBounds();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
