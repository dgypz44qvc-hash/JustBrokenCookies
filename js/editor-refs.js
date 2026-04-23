(function(){
  // Only activate in edit mode — add ?edit to ANY page URL
  if(window.location.search.indexOf('edit') === -1) return;

  // Inject styles
  var style = document.createElement('style');
  style.textContent = '.ref-tag{position:fixed;z-index:99999;background:#E84848;color:#fff;font-size:13px;font-family:monospace;font-weight:bold;padding:2px 7px;border-radius:4px;pointer-events:none;line-height:1.4;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.7);border:1px solid #fff;} .ref-outline{outline:2px dashed #E84848!important;outline-offset:2px!important;}';
  document.head.appendChild(style);

  // Detect current page
  var path = window.location.pathname;
  var page = 'index';
  if(path.indexOf('about') !== -1) page = 'about';
  else if(path.indexOf('services') !== -1) page = 'services';
  else if(path.indexOf('portfolio') !== -1) page = 'portfolio';
  else if(path.indexOf('blog/') !== -1 || path.indexOf('post-') !== -1) page = 'post';
  else if(path.indexOf('blog') !== -1) page = 'blog';
  else if(path.indexOf('contact') !== -1) page = 'contact';

  // Build selector map based on page
  var map = [];

  // NAV (all pages) #1-7
  map.push({s:'.nav-logo', n:1});
  map.push({s:'.nav-links a:nth-child(1)', n:2});
  map.push({s:'.nav-links a:nth-child(2)', n:3});
  map.push({s:'.nav-links a:nth-child(3)', n:4});
  map.push({s:'.nav-links a:nth-child(4)', n:5});
  map.push({s:'.nav-links a:nth-child(5)', n:6});
  map.push({s:'.nav-links a:nth-child(6)', n:7});

  // HOME PAGE #8-49
  if(page === 'index') {
    map.push({s:'.hero-logo', n:8});
    map.push({s:'.hero-content .btn-primary', n:9});
    map.push({s:'.hero-content .btn-outline', n:10});
    map.push({s:'#intro .section-label', n:11});
    map.push({s:'#intro .section-title', n:12});
    map.push({s:'#intro .section-subtitle', n:13});
    map.push({s:'#intro .section-text', n:14});
    map.push({s:'#services-overview .section-label', n:15});
    map.push({s:'#services-overview .section-title', n:16});
    map.push({s:'.services-grid .service-card:nth-child(1) img', n:17});
    map.push({s:'.services-grid .service-card:nth-child(1) .service-icon', n:18});
    map.push({s:'.services-grid .service-card:nth-child(1) h3', n:19});
    map.push({s:'.services-grid .service-card:nth-child(1) p', n:20});
    map.push({s:'.services-grid .service-card:nth-child(2) img', n:21});
    map.push({s:'.services-grid .service-card:nth-child(2) .service-icon', n:22});
    map.push({s:'.services-grid .service-card:nth-child(2) h3', n:23});
    map.push({s:'.services-grid .service-card:nth-child(2) p', n:24});
    map.push({s:'.services-grid .service-card:nth-child(3) img', n:25});
    map.push({s:'.services-grid .service-card:nth-child(3) .service-icon', n:26});
    map.push({s:'.services-grid .service-card:nth-child(3) h3', n:27});
    map.push({s:'.services-grid .service-card:nth-child(3) p', n:28});
    map.push({s:'#services-overview .btn-outline', n:29});
    map.push({s:'#featured-work .section-label', n:30});
    map.push({s:'#featured-work .section-title', n:31});
    map.push({s:'#featured-work .section-subtitle', n:32});
    map.push({s:'.portfolio-grid .portfolio-item:nth-child(1) img', n:33});
    map.push({s:'.portfolio-grid .portfolio-item:nth-child(1) span', n:34});
    map.push({s:'.portfolio-grid .portfolio-item:nth-child(1) h3', n:35});
    map.push({s:'.portfolio-grid .portfolio-item:nth-child(2) img', n:36});
    map.push({s:'.portfolio-grid .portfolio-item:nth-child(2) span', n:37});
    map.push({s:'.portfolio-grid .portfolio-item:nth-child(2) h3', n:38});
    map.push({s:'.portfolio-grid .portfolio-item:nth-child(3) img', n:39});
    map.push({s:'.portfolio-grid .portfolio-item:nth-child(3) span', n:40});
    map.push({s:'.portfolio-grid .portfolio-item:nth-child(3) h3', n:41});
    map.push({s:'#featured-work .btn-outline', n:42});
    map.push({s:'.testimonial blockquote', n:43});
    map.push({s:'.testimonial cite', n:44});
    map.push({s:'.cta-section .section-label', n:45});
    map.push({s:'.cta-section .section-title', n:46});
    map.push({s:'.cta-section .section-subtitle', n:47});
    map.push({s:'.cta-section .section-text', n:48});
    map.push({s:'.cta-section .btn-primary', n:49});
  }

  // FOOTER (all pages) #50-57
  map.push({s:'footer .nav-logo, .footer .nav-logo', n:50});
  map.push({s:'footer .footer-brand > p, .footer-brand > p', n:51});
  map.push({s:'footer .social-links a:nth-child(1), .footer .social-links a:nth-child(1)', n:52});
  map.push({s:'footer .social-links a:nth-child(2), .footer .social-links a:nth-child(2)', n:53});
  map.push({s:'footer .social-links a:nth-child(3), .footer .social-links a:nth-child(3)', n:54});
  map.push({s:'footer .social-links a:nth-child(4), .footer .social-links a:nth-child(4)', n:55});
  map.push({s:'footer .footer-bottom p:nth-child(1), .footer-bottom p:nth-child(1)', n:56});
  map.push({s:'footer .footer-bottom p:nth-child(2), .footer-bottom p:nth-child(2)', n:57});

  // ABOUT PAGE #58-96
  if(page === 'about') {
    map.push({s:'.page-header .section-label', n:58});
    map.push({s:'.page-header .section-title', n:59});
    map.push({s:'.page-header .section-subtitle', n:60});
    map.push({s:'.about-image img', n:61});
    map.push({s:'.about-grid .section-label', n:62});
    map.push({s:'.about-grid .section-title', n:63});
    map.push({s:'.about-grid .section-text', n:64});
    map.push({s:'.cta-section .section-title', n:94});
    map.push({s:'.cta-section .section-subtitle', n:95});
    map.push({s:'.cta-section .btn-primary', n:96});
  }

  // SERVICES PAGE #97-129
  if(page === 'services') {
    map.push({s:'.page-header .section-label', n:97});
    map.push({s:'.page-header .section-title', n:98});
    map.push({s:'.page-header .section-subtitle', n:99});
    map.push({s:'.cta-section .section-title', n:127});
    map.push({s:'.cta-section .section-subtitle', n:128});
    map.push({s:'.cta-section .btn-primary', n:129});
  }

  // PORTFOLIO PAGE #130-156
  if(page === 'portfolio') {
    map.push({s:'.page-header .section-label', n:130});
    map.push({s:'.page-header .section-title', n:131});
    map.push({s:'.page-header .section-subtitle', n:132});
    map.push({s:'.cta-section .section-title', n:154});
    map.push({s:'.cta-section .section-subtitle', n:155});
    map.push({s:'.cta-section .btn-primary', n:156});
  }

  // BLOG PAGE #157-183
  if(page === 'blog') {
    map.push({s:'.page-header .section-label', n:157});
    map.push({s:'.page-header .section-title', n:158});
    map.push({s:'.page-header .section-subtitle', n:159});
  }

  // CONTACT PAGE #184-203
  if(page === 'contact') {
    map.push({s:'.page-header .section-label', n:184});
    map.push({s:'.page-header .section-title', n:185});
    map.push({s:'.page-header .section-subtitle', n:186});
    map.push({s:'input[name="name"]', n:187});
    map.push({s:'input[name="email"]', n:188});
    map.push({s:'textarea[name="message"]', n:191});
    map.push({s:'.contact-form .btn-primary', n:192});
  }

  // BLOG POST #204-209
  if(page === 'post') {
    map.push({s:'.page-header .section-label', n:204});
    map.push({s:'.page-header .section-title', n:205});
    map.push({s:'.page-header .section-subtitle', n:206});
  }

  // === TOGGLE BUTTON ===
  var toggle = document.createElement('button');
  toggle.textContent = '# REF NUMBERS: ON';
  toggle.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#E84848;color:#fff;border:3px solid #fff;padding:12px 22px;font-family:monospace;font-size:14px;font-weight:bold;cursor:pointer;border-radius:8px;box-shadow:0 4px 15px rgba(232,72,72,.6);text-transform:uppercase;';
  document.body.appendChild(toggle);

  // === EDIT MODE BANNER ===
  var banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#E84848;color:#fff;text-align:center;font-family:monospace;font-size:13px;font-weight:bold;padding:8px;letter-spacing:1px;';
  banner.textContent = 'EDITOR MODE — Reference numbers are visible. Remove ?edit from URL to exit.';
  document.body.appendChild(banner);
  document.body.style.marginTop = '36px';

  var tags = [];
  var visible = false;

  function createTags(){
    try {
      map.forEach(function(item){
        var el = null;
        try {
          // Try the selector - use first match from comma-separated selectors
          var selectors = item.s.split(',');
          for(var i = 0; i < selectors.length; i++){
            el = document.querySelector(selectors[i].trim());
            if(el) break;
          }
        } catch(e){ return; }
        if(!el) return;

        // Use FIXED positioning — no need to mess with parents
        var tag = document.createElement('span');
        tag.className = 'ref-tag';
        tag.textContent = '#' + item.n;
        tag.style.display = 'none';
        document.body.appendChild(tag);
        tags.push({tag: tag, el: el, num: item.n});
      });
    } catch(e){
      console.error('Editor refs error:', e);
    }
  }

  function positionTags(){
    tags.forEach(function(t){
      if(t.tag.style.display === 'none') return;
      var rect = t.el.getBoundingClientRect();
      t.tag.style.top = (rect.top + window.scrollY - 5) + 'px';
      t.tag.style.left = (rect.left + window.scrollX - 5) + 'px';
    });
  }

  function showTags(){
    tags.forEach(function(t){
      t.tag.style.display = 'block';
      t.el.classList.add('ref-outline');
    });
    visible = true;
    positionTags();
    toggle.textContent = '# REF NUMBERS: OFF';
    toggle.style.background = '#333';
  }

  function hideTags(){
    tags.forEach(function(t){
      t.tag.style.display = 'none';
      t.el.classList.remove('ref-outline');
    });
    visible = false;
    toggle.textContent = '# REF NUMBERS: ON';
    toggle.style.background = '#E84848';
  }

  // Reposition on scroll/resize
  window.addEventListener('scroll', function(){ if(visible) positionTags(); });
  window.addEventListener('resize', function(){ if(visible) positionTags(); });

  toggle.addEventListener('click', function(){
    if(tags.length === 0) createTags();
    if(visible) hideTags();
    else showTags();
  });

  // Auto-show after page fully loads
  window.addEventListener('load', function(){
    setTimeout(function(){
      createTags();
      showTags();
      // Re-position again after images/fonts load
      setTimeout(positionTags, 1000);
    }, 800);
  });

  console.log('✅ Editor refs loaded! Page detected: ' + page + ' | Elements mapped: ' + map.length);
})();
