(function(){
  if(!window.location.search.includes('edit')) return;

  var style = document.createElement('style');
  style.textContent = [
    '.ref-tag{position:absolute;z-index:9999;background:#E84848;color:#fff;font-size:10px;',
    'font-family:monospace;font-weight:bold;padding:1px 5px;border-radius:3px;',
    'pointer-events:none;line-height:1.4;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.5);}',
    '.ref-outline{outline:1px dashed rgba(232,72,72,.4)!important;}'
  ].join('');
  document.head.appendChild(style);

  var map = [
    // NAV (all pages) #1-7
    {s:'.nav-logo', n:1},
    {s:'.nav-links a:nth-child(1)', n:2},
    {s:'.nav-links a:nth-child(2)', n:3},
    {s:'.nav-links a:nth-child(3)', n:4},
    {s:'.nav-links a:nth-child(4)', n:5},
    {s:'.nav-links a:nth-child(5)', n:6},
    {s:'.nav-links a:nth-child(6)', n:7},
  ];

  var page = window.location.pathname.split('/').pop() || 'index.html';
  if(page === '' || page === '/') page = 'index.html';

  // HOME PAGE
  if(page === 'index.html') {
    map = map.concat([
      {s:'.hero-logo', n:8},
      {s:'.hero-content .btn-primary', n:9},
      {s:'.hero-content .btn-outline', n:10},
      {s:'#intro .section-label', n:11},
      {s:'#intro .section-title', n:12},
      {s:'#intro .section-subtitle', n:13},
      {s:'#intro .section-text', n:14},
      {s:'#services-overview .section-label', n:15},
      {s:'#services-overview .section-title', n:16},
      {s:'.services-grid .service-card:nth-child(1) img', n:17},
      {s:'.services-grid .service-card:nth-child(1) .service-icon', n:18},
      {s:'.services-grid .service-card:nth-child(1) h3', n:19},
      {s:'.services-grid .service-card:nth-child(1) p', n:20},
      {s:'.services-grid .service-card:nth-child(2) img', n:21},
      {s:'.services-grid .service-card:nth-child(2) .service-icon', n:22},
      {s:'.services-grid .service-card:nth-child(2) h3', n:23},
      {s:'.services-grid .service-card:nth-child(2) p', n:24},
      {s:'.services-grid .service-card:nth-child(3) img', n:25},
      {s:'.services-grid .service-card:nth-child(3) .service-icon', n:26},
      {s:'.services-grid .service-card:nth-child(3) h3', n:27},
      {s:'.services-grid .service-card:nth-child(3) p', n:28},
      {s:'#services-overview .btn-outline', n:29},
      {s:'#featured-work .section-label', n:30},
      {s:'#featured-work .section-title', n:31},
      {s:'#featured-work .section-subtitle', n:32},
      {s:'.portfolio-grid .portfolio-item:nth-child(1) img', n:33},
      {s:'.portfolio-grid .portfolio-item:nth-child(1) span', n:34},
      {s:'.portfolio-grid .portfolio-item:nth-child(1) h3', n:35},
      {s:'.portfolio-grid .portfolio-item:nth-child(2) img', n:36},
      {s:'.portfolio-grid .portfolio-item:nth-child(2) span', n:37},
      {s:'.portfolio-grid .portfolio-item:nth-child(2) h3', n:38},
      {s:'.portfolio-grid .portfolio-item:nth-child(3) img', n:39},
      {s:'.portfolio-grid .portfolio-item:nth-child(3) span', n:40},
      {s:'.portfolio-grid .portfolio-item:nth-child(3) h3', n:41},
      {s:'#featured-work .btn-outline', n:42},
      {s:'.testimonial blockquote', n:43},
      {s:'.testimonial cite', n:44},
      {s:'.cta-section .section-label', n:45},
      {s:'.cta-section .section-title', n:46},
      {s:'.cta-section .section-subtitle', n:47},
      {s:'.cta-section .section-text', n:48},
      {s:'.cta-section .btn-primary', n:49},
    ]);
  }

  // FOOTER (all pages) #50-57
  map = map.concat([
    {s:'.footer .nav-logo', n:50},
    {s:'.footer-brand > p', n:51},
    {s:'.footer .social-links a:nth-child(1)', n:52},
    {s:'.footer .social-links a:nth-child(2)', n:53},
    {s:'.footer .social-links a:nth-child(3)', n:54},
    {s:'.footer .social-links a:nth-child(4)', n:55},
    {s:'.footer-bottom p:nth-child(1)', n:56},
    {s:'.footer-bottom p:nth-child(2)', n:57},
  ]);

  // ABOUT PAGE
  if(page === 'about.html') {
    map = map.concat([
      {s:'.page-header .section-label', n:58},
      {s:'.page-header .section-title', n:59},
      {s:'.page-header .section-subtitle', n:60},
      {s:'.about-image img', n:61},
      {s:'.about-grid .section-label', n:62},
      {s:'.about-grid .section-title', n:63},
      {s:'.about-grid .section-text:nth-of-type(1)', n:64},
      {s:'.about-grid .section-text:nth-of-type(2)', n:65},
      {s:'.about-grid .section-text:nth-of-type(3)', n:66},
      {s:'section:nth-of-type(3) .section-label', n:67},
      {s:'section:nth-of-type(3) .section-title', n:68},
      {s:'section:nth-of-type(3) .section-subtitle', n:69},
      {s:'.services-grid .service-card:nth-child(1) .service-icon', n:70},
      {s:'.services-grid .service-card:nth-child(1) h3', n:71},
      {s:'.services-grid .service-card:nth-child(1) p', n:72},
      {s:'.services-grid .service-card:nth-child(2) .service-icon', n:73},
      {s:'.services-grid .service-card:nth-child(2) h3', n:74},
      {s:'.services-grid .service-card:nth-child(2) p', n:75},
      {s:'.services-grid .service-card:nth-child(3) .service-icon', n:76},
      {s:'.services-grid .service-card:nth-child(3) h3', n:77},
      {s:'.services-grid .service-card:nth-child(3) p', n:78},
      {s:'.stat-item:nth-child(1) h4', n:79},
      {s:'.stat-item:nth-child(2) h4', n:80},
      {s:'.stat-item:nth-child(3) h4', n:81},
      {s:'section:nth-of-type(5) .section-label', n:82},
      {s:'section:nth-of-type(5) .section-title', n:83},
      {s:'section:nth-of-type(5) .section-subtitle', n:84},
    ]);
    // Team members - use the second services-grid
    var teamCards = document.querySelectorAll('section:nth-of-type(5) .service-card');
    if(teamCards[0]) {
      map.push({e:teamCards[0].querySelector('img'), n:85});
      map.push({e:teamCards[0].querySelector('h3'), n:86});
      map.push({e:teamCards[0].querySelector('p[style]'), n:87});
    }
    if(teamCards[1]) {
      map.push({e:teamCards[1].querySelector('img'), n:88});
      map.push({e:teamCards[1].querySelector('h3'), n:89});
      map.push({e:teamCards[1].querySelector('p[style]'), n:90});
    }
    if(teamCards[2]) {
      map.push({e:teamCards[2].querySelector('img'), n:91});
      map.push({e:teamCards[2].querySelector('h3'), n:92});
      map.push({e:teamCards[2].querySelector('p[style]'), n:93});
    }
    map = map.concat([
      {s:'.cta-section .section-title', n:94},
      {s:'.cta-section .section-subtitle', n:95},
      {s:'.cta-section .btn-primary', n:96},
    ]);
  }

  // SERVICES PAGE
  if(page === 'services.html') {
    map = map.concat([
      {s:'.page-header .section-label', n:97},
      {s:'.page-header .section-title', n:98},
      {s:'.page-header .section-subtitle', n:99},
      {s:'.service-detail:nth-of-type(1) img', n:100},
      {s:'.service-detail:nth-of-type(1) .service-number', n:101},
      {s:'.service-detail:nth-of-type(1) .section-title', n:102},
      {s:'.service-detail:nth-of-type(1) .section-subtitle', n:103},
      {s:'.service-detail:nth-of-type(1) .section-text', n:104},
      {s:'.service-detail:nth-of-type(1) .service-list', n:105},
      {s:'.service-detail:nth-of-type(2) img', n:106},
      {s:'.service-detail:nth-of-type(2) .service-number', n:107},
      {s:'.service-detail:nth-of-type(2) .section-title', n:108},
      {s:'.service-detail:nth-of-type(2) .section-subtitle', n:109},
      {s:'.service-detail:nth-of-type(2) .section-text', n:110},
      {s:'.service-detail:nth-of-type(2) .service-list', n:111},
      {s:'.service-detail:nth-of-type(3) img', n:112},
      {s:'.service-detail:nth-of-type(3) .service-number', n:113},
      {s:'.service-detail:nth-of-type(3) .section-title', n:114},
      {s:'.service-detail:nth-of-type(3) .section-subtitle', n:115},
      {s:'.service-detail:nth-of-type(3) .section-text', n:116},
      {s:'.service-detail:nth-of-type(3) .service-list', n:117},
      {s:'.testimonial-section .section-label', n:118},
      {s:'.testimonial-section .section-title', n:119},
      {s:'.testimonial-section .section-subtitle', n:120},
      {s:'.testimonial-section .service-card:nth-child(1) h3', n:121},
      {s:'.testimonial-section .service-card:nth-child(1) p', n:122},
      {s:'.testimonial-section .service-card:nth-child(2) h3', n:123},
      {s:'.testimonial-section .service-card:nth-child(2) p', n:124},
      {s:'.testimonial-section .service-card:nth-child(3) h3', n:125},
      {s:'.testimonial-section .service-card:nth-child(3) p', n:126},
      {s:'.cta-section .section-title', n:127},
      {s:'.cta-section .section-subtitle', n:128},
      {s:'.cta-section .btn-primary', n:129},
    ]);
  }

  // PORTFOLIO PAGE
  if(page === 'portfolio.html') {
    map = map.concat([
      {s:'.page-header .section-label', n:130},
      {s:'.page-header .section-title', n:131},
      {s:'.page-header .section-subtitle', n:132},
      {s:'.filter-btn:nth-child(1)', n:133},
      {s:'.filter-btn:nth-child(2)', n:134},
      {s:'.filter-btn:nth-child(3)', n:135},
      {s:'.filter-btn:nth-child(4)', n:136},
      {s:'.filter-btn:nth-child(5)', n:137},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(1) img', n:138},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(1) h3', n:139},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(2) img', n:140},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(2) h3', n:141},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(3) img', n:142},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(3) h3', n:143},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(4) img', n:144},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(4) h3', n:145},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(5) img', n:146},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(5) h3', n:147},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(6) img', n:148},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(6) h3', n:149},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(7) img', n:150},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(7) h3', n:151},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(8) img', n:152},
      {s:'.portfolio-grid-full .portfolio-item:nth-child(8) h3', n:153},
      {s:'.cta-section .section-title', n:154},
      {s:'.cta-section .section-subtitle', n:155},
      {s:'.cta-section .btn-primary', n:156},
    ]);
  }

  // BLOG PAGE
  if(page === 'blog.html') {
    map = map.concat([
      {s:'.page-header .section-label', n:157},
      {s:'.page-header .section-title', n:158},
      {s:'.page-header .section-subtitle', n:159},
      {s:'.blog-card:nth-child(1) img', n:160},
      {s:'.blog-card:nth-child(1) .blog-card-meta', n:161},
      {s:'.blog-card:nth-child(1) h3', n:162},
      {s:'.blog-card:nth-child(1) .blog-card-content > p:not(.blog-card-meta)', n:163},
      {s:'.blog-card:nth-child(2) img', n:164},
      {s:'.blog-card:nth-child(2) .blog-card-meta', n:165},
      {s:'.blog-card:nth-child(2) h3', n:166},
      {s:'.blog-card:nth-child(2) .blog-card-content > p:not(.blog-card-meta)', n:167},
      {s:'.blog-card:nth-child(3) img', n:168},
      {s:'.blog-card:nth-child(3) .blog-card-meta', n:169},
      {s:'.blog-card:nth-child(3) h3', n:170},
      {s:'.blog-card:nth-child(3) .blog-card-content > p:not(.blog-card-meta)', n:171},
      {s:'.blog-card:nth-child(4) img', n:172},
      {s:'.blog-card:nth-child(4) .blog-card-meta', n:173},
      {s:'.blog-card:nth-child(4) h3', n:174},
      {s:'.blog-card:nth-child(4) .blog-card-content > p:not(.blog-card-meta)', n:175},
      {s:'.blog-card:nth-child(5) img', n:176},
      {s:'.blog-card:nth-child(5) .blog-card-meta', n:177},
      {s:'.blog-card:nth-child(5) h3', n:178},
      {s:'.blog-card:nth-child(5) .blog-card-content > p:not(.blog-card-meta)', n:179},
      {s:'.blog-card:nth-child(6) img', n:180},
      {s:'.blog-card:nth-child(6) .blog-card-meta', n:181},
      {s:'.blog-card:nth-child(6) h3', n:182},
      {s:'.blog-card:nth-child(6) .blog-card-content > p:not(.blog-card-meta)', n:183},
    ]);
  }

  // CONTACT PAGE
  if(page === 'contact.html') {
    map = map.concat([
      {s:'.page-header .section-label', n:184},
      {s:'.page-header .section-title', n:185},
      {s:'.page-header .section-subtitle', n:186},
      {s:'input[name="name"]', n:187},
      {s:'input[name="email"]', n:188},
      {s:'input[name="subject"]', n:189},
      {s:'select[name="service"]', n:190},
      {s:'textarea[name="message"]', n:191},
      {s:'.contact-form .btn-primary', n:192},
      {s:'.contact-info .section-label', n:193},
      {s:'.contact-info .section-title', n:194},
      {s:'.contact-info .section-text', n:195},
      {s:'.contact-info-item:nth-of-type(1) a', n:196},
      {s:'.contact-info-item:nth-of-type(2) a', n:197},
      {s:'.contact-info-item:nth-of-type(3) p', n:198},
      {s:'.contact-info .social-links a:nth-child(1)', n:199},
      {s:'.contact-info .social-links a:nth-child(2)', n:200},
      {s:'.contact-info .social-links a:nth-child(3)', n:201},
      {s:'.contact-info .social-links a:nth-child(4)', n:202},
      {s:'.contact-info .social-links a:nth-child(5)', n:203},
    ]);
  }

  // BLOG POST
  if(page === 'post-01.html') {
    map = map.concat([
      {s:'.page-header .section-label', n:204},
      {s:'.page-header .section-title', n:205},
      {s:'.page-header .section-subtitle', n:206},
      {s:'.blog-post', n:207},
      {s:'.blog-post .section-text', n:208},
      {s:'.blog-post .btn-primary', n:209},
    ]);
  }

  // Add toggle button
  var toggle = document.createElement('button');
  toggle.textContent = 'REF #s ON';
  toggle.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#E84848;color:#fff;border:none;padding:10px 18px;font-family:monospace;font-size:12px;font-weight:bold;cursor:pointer;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.4);';
  document.body.appendChild(toggle);

  var tags = [];
  var visible = false;

  function createTags(){
    map.forEach(function(item){
      var el = item.e || document.querySelector(item.s);
      if(!el) return;

      var parent = el.offsetParent || el.parentElement;
      if(parent && getComputedStyle(parent).position === 'static'){
        parent.style.position = 'relative';
      }

      var tag = document.createElement('span');
      tag.className = 'ref-tag';
      tag.textContent = '#' + item.n;
      tag.style.display = 'none';

      // Position tag at top-left of element
      var rect = el.getBoundingClientRect();
      var parentRect = (el.offsetParent || el.parentElement).getBoundingClientRect();
      tag.style.top = (rect.top - parentRect.top - 2) + 'px';
      tag.style.left = (rect.left - parentRect.left - 2) + 'px';

      (el.offsetParent || el.parentElement).appendChild(tag);
      tags.push({tag: tag, el: el});
    });
  }

  function showTags(){
    tags.forEach(function(t){
      t.tag.style.display = 'block';
      t.el.classList.add('ref-outline');
    });
    visible = true;
    toggle.textContent = 'REF #s OFF';
    toggle.style.background = '#333';
  }

  function hideTags(){
    tags.forEach(function(t){
      t.tag.style.display = 'none';
      t.el.classList.remove('ref-outline');
    });
    visible = false;
    toggle.textContent = 'REF #s ON';
    toggle.style.background = '#E84848';
  }

  toggle.addEventListener('click', function(){
    if(tags.length === 0) createTags();
    if(visible) hideTags();
    else showTags();
  });

  // Auto-show on load
  window.addEventListener('load', function(){
    setTimeout(function(){
      createTags();
      showTags();
    }, 500);
  });

})();
