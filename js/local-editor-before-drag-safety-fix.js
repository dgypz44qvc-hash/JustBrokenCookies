(() => {
  const frame = document.getElementById('site-frame');
  const status = document.getElementById('status');
  const layersEl = document.getElementById('layers');
  const imageList = document.getElementById('image-list');
  const floatingToolbar = document.getElementById('floating-toolbar');
  const floatLabel = document.getElementById('float-label');
  const contextMenu = document.getElementById('context-menu');
  const prop = id => document.getElementById(id);
  function on(id, event, handler) {
    const el = prop(id);
    if (el) el.addEventListener(event, handler);
  }
  function setValue(id, value) {
    const el = prop(id);
    if (el) el.value = value;
  }
  function getValue(id) {
    const el = prop(id);
    return el ? el.value : '';
  }
  function setText(id, value) {
    const el = prop(id);
    if (el) el.textContent = value;
  }
  function stopShortcut(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
  }
  function isEditorShortcutKey(e) {
    if (!(e.metaKey || e.ctrlKey)) return false;
    const key = String(e.key || '').toLowerCase();
    return ['z', 'y', 's', 'p', 'j', 'd', '+', '=', '-', '_', '0'].includes(key);
  }
  function numericValue(value) {
    const n = parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : '';
  }
  function unitValue(value, unit) {
    const n = numericValue(value);
    return n === '' ? '' : n + unit;
  }
  function rectValue(el, propName) {
    if (!el || !doc) return '';
    const rect = el.getBoundingClientRect();
    if (propName === 'width') return numericValue(rect.width);
    if (propName === 'height') return numericValue(rect.height);
    const parent = el.offsetParent || el.parentElement || doc.body;
    const parentRect = parent === doc.body ? { left: 0, top: 0 } : parent.getBoundingClientRect();
    if (propName === 'left') return numericValue(rect.left - parentRect.left + (parent.scrollLeft || 0));
    if (propName === 'top') return numericValue(rect.top - parentRect.top + (parent.scrollTop || 0));
    return '';
  }
  function toggleClass(id, className, force) {
    const el = prop(id);
    if (el) el.classList.toggle(className, force);
  }

  let doc;
  let selected = null;
  let selectedImagePath = '';
  let htmlSource = '';
  let editorCss = '';
  let history = [];
  let future = [];
  let dirty = false;
  let editMode = true;
  let dragState = null;
  let rafPending = false;
  let handlesBox = null;
  let assetMode = null;
  let assetCounter = 1;
  let textEditingEl = null;
  let copiedStyle = null;
  let panelResize = null;
  let suppressNextClick = false;
  let deviceMode = 'desktop';
  let zoom = 1;
  let fitRaf = null;
  let panelInputSession = null;
  let panelWatch = null;
  let restoringSnapshot = false;

  const managedStyles = [
    'position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'opacity',
    'z-index', 'color', 'background-color', 'font-size', 'font-family',
    'letter-spacing', 'padding', 'margin', 'border-radius', 'mix-blend-mode',
    'transform', 'display', 'background-image', 'background-size',
    'background-position', 'background-repeat'
  ];

  const layerGroups = [
    { title: 'Hero', items: [
      ['Hero', '[data-editor-id="hero-section"], section.hero'],
      ['Storytelling Tag', '[data-editor-id="hero-storytelling-tag"], .hero .tag'],
      ['Dotted Accent Line', '[data-editor-id="hero-dotted-accent"]'],
      ['Hero Content', '[data-editor-id="hero-content"], .hero-content'],
      ['Just', '[data-editor-id="hero-title-line-1"], .hero-mega:not(.hero-underlay) .l1'],
      ['Broken', '[data-editor-id="hero-title-line-2"], .hero-mega:not(.hero-underlay) .l2'],
      ['Cookies', '[data-editor-id="hero-title-line-3"], .hero-mega:not(.hero-underlay) .l3'],
      ['Hero Image', '[data-editor-id="hero-image-wrap"], .hero .jbc-custom.hero-photo-layer, .hero .jbc-custom img'],
      ['Corner Rose', '[data-editor-id="hero-corner-rose"], .hero-corner-rose']
    ]},
    { title: 'Manifesto', items: [['Manifesto', '[data-editor-id="manifesto-section"], .manifesto']] },
    { title: 'Process', items: [
      ['Process Section', '[data-editor-id="process-section"], #services-overview'],
      ['Process Heading', '[data-editor-id="process-heading"], #services-overview .sec-header h2'],
      ['Card 1', '[data-editor-id="process-card-1"], #services-overview .service-card:nth-of-type(1)'],
      ['Card 2', '[data-editor-id="process-card-2"], #services-overview .service-card:nth-of-type(2)'],
      ['Card 3', '[data-editor-id="process-card-3"], #services-overview .service-card:nth-of-type(3)']
    ]},
    { title: 'Selected Work', items: [
      ['Work Section', '[data-editor-id="featured-work-section"], #featured-work'],
      ['Portfolio Grid', '[data-editor-id="portfolio-grid"], #featured-work .portfolio-grid'],
      ['Work Item 1', '[data-editor-id="portfolio-item-1"], #featured-work .portfolio-item:nth-of-type(1)'],
      ['Work Item 2', '[data-editor-id="portfolio-item-2"], #featured-work .portfolio-item:nth-of-type(2)'],
      ['Work Item 3', '[data-editor-id="portfolio-item-3"], #featured-work .portfolio-item:nth-of-type(3)'],
      ['Work Item 4', '[data-editor-id="portfolio-item-4"], #featured-work .portfolio-item:nth-of-type(4)']
    ]},
    { title: 'Testimonial', items: [['Testimonial', '[data-editor-id="testimonial-section"], .testimonial-section']] },
    { title: 'CTA', items: [['CTA', '[data-editor-id="cta-section"], .cta-section']] },
    { title: 'Footer', items: [
      ['Footer', '[data-editor-id="footer-section"], footer.footer'],
      ['Footer Grid', 'footer.footer .footer-grid'],
      ['Footer Brand', 'footer.footer .footer-brand'],
      ['Footer Column 1', 'footer.footer .footer-col:nth-of-type(1)'],
      ['Footer Column 2', 'footer.footer .footer-col:nth-of-type(2)'],
      ['Footer Column 3', 'footer.footer .footer-col:nth-of-type(3)'],
      ['Footer Bottom', 'footer.footer .footer-bottom']
    ] }
  ];

  const editableTextSelector = [
    '.hero .tag', '.hero-mega .l1', '.hero-mega .l2', '.hero-mega .l3',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'cite',
    'a[href]', 'button', '.btn', '.section-title', '.footer-brand', '.footer-col h4',
    '.footer-col a', '.footer-bottom span'
  ].join(',');

  const auditSelectors = [
    ['Sections', 'section'],
    ['Hero Elements', '.hero, .hero .tag, .hero-content, .hero-mega, .hero-mega .l1, .hero-mega .l2, .hero-mega .l3, .hero .jbc-custom, .hero .jbc-custom img, .hero-corner-rose'],
    ['Images', 'img, picture'],
    ['Buttons and Links', 'a[href], button'],
    ['Headings', 'h1, h2, h3, h4, h5, h6'],
    ['Service Cards', '.service-card'],
    ['Portfolio Items', '.portfolio-item'],
    ['Decorations', '.editor-decoration, .hero-corner-rose'],
    ['Data Editor IDs', '[data-editor-id]']
  ];

  const ignoredEditableSelectors = [
    'html', 'body', 'head', 'script', 'style', 'meta', 'link', 'title',
    '#jbc-editor-runtime-css', '#jbc-editor-overrides-live', '.jbc-editor-box',
    '.jbc-editor-handle'
  ].join(',');

  const sectionTargets = {
    hero: 'section.hero',
    manifesto: '.manifesto',
    process: '#services-overview',
    work: '#featured-work',
    testimonial: '.testimonial-section',
    cta: '.cta-section',
    footer: 'footer.footer'
  };

  const assetDefaults = {
    image: { src: '', prefix: 'image', className: 'editor-decoration editor-image', blend: 'normal', width: 320, height: 220 },
    decoration: { src: '', prefix: 'decor', className: 'editor-decoration', blend: 'normal', width: 280, height: 280 },
    rose: { src: 'images/jbc-rose-pattern-bg.png', prefix: 'rose', className: 'editor-decoration editor-rose', blend: 'screen', width: 300, height: 300 },
    vector: { src: '', prefix: 'vector', className: 'editor-decoration editor-vector', blend: 'normal', width: 280, height: 280 }
  };

  const allowedAssetExt = /\.(png|jpe?g|webp|gif|svg)$/i;

  function setStatus(msg) { if (status) status.textContent = msg; }
  function uid(prefix) { return (prefix || 'el') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6); }
  function cssEscape(value) { return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }

  function selectorFor(el) {
    if (!el) return '';
    if (!el.dataset.editorId) el.dataset.editorId = uid(el.dataset.assetType || (el.classList.contains('editor-decoration') ? 'decor' : 'jbc'));
    return '[data-editor-id="' + cssEscape(el.dataset.editorId) + '"]';
  }

  function describe(el) {
    if (!el) return 'Nothing selected';
    let name = el.tagName.toLowerCase();
    if (el.id) name += '#' + el.id;
    const classes = String(el.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (classes.length) name += '.' + classes.join('.');
    return name;
  }

  function isTextElement(el) {
    if (!el || el.querySelector('img, picture, video, iframe')) return false;
    return el.matches(editableTextSelector) || el.childElementCount === 0 || ['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'A', 'BUTTON', 'CITE', 'BLOCKQUOTE'].includes(el.tagName);
  }

  function selectedImage(el) {
    if (!el) return null;
    if (el.tagName === 'IMG') return el;
    if (el.tagName === 'PICTURE') return el.querySelector('img');
    return el.querySelector?.('img') || null;
  }

  function pickEditable(target) {
    if (!target || target.nodeType !== 1) return null;
    if (target.closest('.jbc-editor-handle')) return null;
    const exactText = target.closest(editableTextSelector);
    if (exactText && !exactText.matches('footer.footer, section.hero, .hero-content, .hero-mega')) return exactText;
    const priority = ['.editor-decoration', '.hero-mega:not(.hero-underlay) .l1', '.hero-mega:not(.hero-underlay) .l2', '.hero-mega:not(.hero-underlay) .l3', '.hero .tag', '.hero .jbc-custom.hero-photo-layer', '.hero .jbc-custom img', '.hero-corner-rose', '.service-card h3', '.service-card p', '.service-card', '.portfolio-item h3', '.portfolio-item p', '.portfolio-item', '.testi-brutal', '.cta-section .btn', '.cta-section .section-title', '.manifesto-inner h2', '.manifesto-inner p', '.manifesto-inner'];
    for (const sel of priority) {
      const found = target.closest(sel);
      if (found) return found;
    }
    const fallback = target.closest('[data-editor-id], .footer-grid, .footer-brand, .footer-col, .footer-bottom, section.hero, .manifesto, #services-overview, #featured-work, .testimonial-section, .cta-section, footer.footer');
    if (!fallback) return isVisibleEditable(target) ? target : null;
    if (fallback.matches('section.hero, .hero-content, .hero-mega')) return target.closest('.hero-mega:not(.hero-underlay) .l1, .hero-mega:not(.hero-underlay) .l2, .hero-mega:not(.hero-underlay) .l3, .hero .tag, .hero .jbc-custom.hero-photo-layer, .hero .jbc-custom img, .hero-corner-rose') || fallback;
    if (isVisibleEditable(target)) return target;
    return fallback;
  }

  function pickHeroTagAtPoint(e) {
    if (!doc || !e) return null;
    const tag = doc.querySelector('[data-editor-id="hero-storytelling-tag"], .hero .tag');
    if (!tag) return null;
    const rect = tag.getBoundingClientRect();
    const padX = 34;
    const padY = 14;
    const inside = e.clientX >= rect.left - padX && e.clientX <= rect.right + padX && e.clientY >= rect.top - padY && e.clientY <= rect.bottom + padY;
    return inside ? tag : null;
  }

  function pickHeroDottedAccentAtPoint(e) {
    if (!doc || !e) return null;
    const line = doc.querySelector('[data-editor-id="hero-dotted-accent"]');
    if (!line) return null;
    const rect = line.getBoundingClientRect();
    const pad = 4;
    const inside = e.clientX >= rect.left - pad && e.clientX <= rect.right + pad && e.clientY >= rect.top - pad && e.clientY <= rect.bottom + pad;
    return inside ? line : null;
  }

  function pointInsideElement(el, e, pad = 0) {
    if (!el || !e) return false;
    const rect = el.getBoundingClientRect();
    return e.clientX >= rect.left - pad && e.clientX <= rect.right + pad && e.clientY >= rect.top - pad && e.clientY <= rect.bottom + pad;
  }

  async function api(url, opts = {}) {
    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({ ok: false, error: 'Bad JSON response' }));
    if (!res.ok || !json.ok) throw new Error(json.error || res.statusText);
    return json;
  }

  async function init() {
    wireShell();
    try {
      const [htmlRes, cssRes] = await Promise.all([api('/api/site-html'), api('/api/editor-css')]);
      htmlSource = htmlRes.html;
      editorCss = cssRes.css || '';
      frame.addEventListener('load', onFrameLoad);
      frame.srcdoc = injectEditorRuntime(htmlSource, editorCss);
    } catch (err) { setStatus('Error: ' + err.message); }
  }

  function onFrameLoad() {
    doc = frame.contentDocument;
    doc.body.classList.remove('jbc-editor-preview', 'jbc-is-dragging', 'jbc-text-edit-mode');
    ensureRuntimeEditables();
    wireCanvas();
    buildLayers();
    markEditableItems();
    loadImages();
    if (restoringSnapshot) restoringSnapshot = false;
    else pushHistory();
    setStatus('Ready');
  }

  function injectEditorRuntime(html, overrides) {
    const runtimeCss = [
      '<style id="jbc-editor-runtime-css">',
      '[data-jbc-selected="true"]{outline:2px solid rgba(232,137,29,.95)!important;outline-offset:3px!important;z-index:2147483001!important;}',
      '[data-jbc-live-edit="true"]{transition:none!important;animation:none!important;}',
      '.jbc-editor-hover{outline:1px solid rgba(232,137,29,.5)!important;outline-offset:3px!important;}',
      '[data-jbc-editable="true"]{outline:1px dashed rgba(232,137,29,.24);outline-offset:4px;}',
      '[data-jbc-editable="true"]:hover{outline-color:rgba(232,137,29,.72)!important;}',
      '.jbc-editor-box{position:absolute;z-index:2147483646;pointer-events:none;border:1px solid rgba(232,137,29,.65);box-shadow:0 0 0 1px rgba(20,16,14,.45);}',
      '.jbc-editor-handle{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#e8891d;border:2px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.28);pointer-events:auto;touch-action:none;}',
      '.jbc-editor-handle.nw{left:0;top:0;cursor:nwse-resize}.jbc-editor-handle.n{left:50%;top:0;cursor:ns-resize}.jbc-editor-handle.ne{left:100%;top:0;cursor:nesw-resize}.jbc-editor-handle.e{left:100%;top:50%;cursor:ew-resize}.jbc-editor-handle.se{left:100%;top:100%;cursor:nwse-resize}.jbc-editor-handle.s{left:50%;top:100%;cursor:ns-resize}.jbc-editor-handle.sw{left:0;top:100%;cursor:nesw-resize}.jbc-editor-handle.w{left:0;top:50%;cursor:ew-resize}',
      '.jbc-editor-handle.rotate{left:50%;top:-34px;background:#2ecc40;cursor:grab;}',
      '.jbc-editor-handle.rotate:after{content:"";position:absolute;left:50%;top:16px;width:1px;height:18px;background:rgba(255,255,255,.85);}',
      'body.jbc-is-dragging,body.jbc-is-dragging *{user-select:none!important;cursor:grabbing!important;}',
      'body.jbc-editor-preview [data-jbc-selected="true"],body.jbc-editor-preview .jbc-editor-hover{outline:none!important;}',
      'body.jbc-editor-preview [data-jbc-editable="true"]{outline:none!important;}',
      'body.jbc-editor-preview .jbc-editor-box{display:none!important;}',
      'body.jbc-editor-selection-hidden [data-jbc-selected="true"],body.jbc-editor-selection-hidden .jbc-editor-hover,body.jbc-editor-selection-hidden [data-jbc-editable="true"]{outline:none!important;}',
      'body.jbc-editor-selection-hidden .jbc-editor-box{display:none!important;}',
      'body:not(.jbc-editor-preview) .hero,body:not(.jbc-editor-preview) .hero-content,body:not(.jbc-editor-preview) .hero-oil-wrap{overflow:visible!important;}',
      'body:not(.jbc-editor-preview) .hero-content::after{display:none!important;}',
      'body.jbc-editor-preview [data-editor-runtime-proxy="true"]{display:none!important;}',
      'body:not(.jbc-editor-preview) .hero .tag,body:not(.jbc-editor-preview) [data-editor-id="hero-storytelling-tag"]{pointer-events:auto!important;z-index:2147483000!important;}',
      'body:not(.jbc-editor-preview) .hero .tag,body:not(.jbc-editor-preview) .hero-mega:not(.hero-underlay) .l1,body:not(.jbc-editor-preview) .hero-mega:not(.hero-underlay) .l2,body:not(.jbc-editor-preview) .hero-mega:not(.hero-underlay) .l3,body:not(.jbc-editor-preview) .hero .jbc-custom,body:not(.jbc-editor-preview) .hero .jbc-custom img,body:not(.jbc-editor-preview) .hero-corner-rose{pointer-events:auto!important;}',
      '[contenteditable="true"].jbc-text-editing{outline:2px solid #2ecc40!important;outline-offset:4px!important;cursor:text!important;user-select:text!important;-webkit-user-select:text!important;}',
      'body.jbc-text-edit-mode .jbc-editor-box{display:none!important;}',
      '.editor-decoration{position:absolute;display:block;pointer-events:auto;z-index:4;touch-action:none;}',
      '.editor-decoration img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;}',
      '</style>',
      '<style id="jbc-editor-overrides-live">' + String(overrides).replace(/<\/style/gi, '<\\/style') + '</style>',
      '<script id="jbc-editor-runtime-script">',
      '(() => {',
      '  const shortcutKeys = new Set(["z","y","s","p","j","d","+","=","-","_","0"]);',
      '  const stop = e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation(); };',
      '  const send = (key, shiftKey) => { try { parent.postMessage({ type: "jbc-editor-shortcut", key, shiftKey: !!shiftKey }, "*"); } catch (_) {} };',
      '  addEventListener("keydown", e => {',
      '    const key = String(e.key || "").toLowerCase();',
      '    if (!(e.metaKey || e.ctrlKey) || !shortcutKeys.has(key)) return;',
      '    stop(e);',
      '    send(key, e.shiftKey);',
      '  }, true);',
      '  addEventListener("keyup", e => {',
      '    const key = String(e.key || "").toLowerCase();',
      '    if ((e.metaKey || e.ctrlKey) && shortcutKeys.has(key)) stop(e);',
      '  }, true);',
      '  addEventListener("beforeinput", e => {',
      '    if (e.inputType === "historyUndo") { stop(e); send("z", false); }',
      '    else if (e.inputType === "historyRedo") { stop(e); send("z", true); }',
      '  }, true);',
      '  addEventListener("wheel", e => { if (e.metaKey || e.ctrlKey) stop(e); }, { capture: true, passive: false });',
      '})();',
      '</script>'
    ].join('\n');
    return html.includes('</head>') ? html.replace('</head>', runtimeCss + '</head>') : runtimeCss + html;
  }

  function ensureRuntimeEditables() {
    ensureHeroDottedAccent();
  }

  function ensureHeroDottedAccent() {
    if (!doc) return;
    const heroContent = doc.querySelector('.hero-content');
    if (!heroContent || doc.querySelector('[data-editor-id="hero-dotted-accent"]')) return;
    const line = doc.createElement('div');
    line.dataset.editorId = 'hero-dotted-accent';
    line.dataset.assetType = 'decoration';
    line.dataset.editorRuntimeProxy = 'true';
    line.className = 'editor-decoration editor-dotted-accent';
    Object.assign(line.style, {
      position: 'absolute',
      right: '190px',
      top: '-60px',
      width: '4px',
      height: '72vh',
      background: 'repeating-linear-gradient(to bottom, rgba(232, 72, 72, 0.55) 0px, rgba(232, 72, 72, 0.55) 3px, transparent 3px, transparent 10px)',
      backgroundSize: '1px 100%',
      backgroundRepeat: 'repeat-y',
      backgroundPosition: 'center top',
      opacity: '0.7',
      zIndex: '7',
      pointerEvents: 'auto'
    });
    heroContent.appendChild(line);
  }

  function serializeHtml() {
    const clone = doc.documentElement.cloneNode(true);
    cleanupRuntimeDom(clone);
    clone.querySelector('#jbc-editor-runtime-css')?.remove();
    clone.querySelector('#jbc-editor-runtime-script')?.remove();
    clone.querySelector('#jbc-editor-overrides-live')?.remove();
    clone.querySelectorAll('.jbc-editor-box').forEach(el => el.remove());
    clone.querySelectorAll('[data-jbc-selected], [data-jbc-live-edit], .jbc-editor-hover').forEach(el => { el.removeAttribute('data-jbc-selected'); el.removeAttribute('data-jbc-live-edit'); el.classList.remove('jbc-editor-hover'); });
    clone.querySelectorAll('[data-jbc-editable]').forEach(el => el.removeAttribute('data-jbc-editable'));
    clone.querySelector('body')?.classList.remove('jbc-editor-preview', 'jbc-is-dragging', 'jbc-text-edit-mode');
    clone.querySelectorAll('[data-editor-bound], [contenteditable]').forEach(el => { el.removeAttribute('data-editor-bound'); if (el.getAttribute('contenteditable') === 'true') el.removeAttribute('contenteditable'); });
    clone.querySelectorAll('[data-editor-id]').forEach(el => stripManagedInlineStyles(el));
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  function cleanupRuntimeDom(root) {
    root.querySelectorAll('style').forEach(style => {
      const css = style.textContent || '';
      if (css.includes('.hero-oil-wrap') && css.includes('.hero-underlay')) style.remove();
    });
    root.querySelectorAll('[data-editor-runtime-proxy="true"]').forEach(el => el.remove());
    root.querySelectorAll('.hero-oil-wrap').forEach(wrap => {
      const title = wrap.querySelector(':scope > .hero-mega:not(.hero-underlay)');
      if (!title) return;
      wrap.querySelectorAll(':scope > .hero-underlay').forEach(el => el.remove());
      title.removeAttribute('style');
      title.querySelectorAll('.l1, .l2, .l3').forEach(line => {
        line.style.removeProperty('--mx');
        line.style.removeProperty('--my');
        line.style.removeProperty('opacity');
        line.style.removeProperty('transform');
        line.style.removeProperty('filter');
        line.style.removeProperty('transition');
        if (!line.getAttribute('style')?.trim()) line.removeAttribute('style');
      });
      wrap.replaceWith(title);
    });
  }

  function stripManagedInlineStyles(el) {
    if (!el.hasAttribute('style')) return;
    managedStyles.forEach(name => el.style.removeProperty(name));
    if (!el.getAttribute('style').trim()) el.removeAttribute('style');
  }

  function pushHistory() {
    if (!doc) return;
    const snapshot = { html: serializeHtml(), css: editorCss };
    const last = history[history.length - 1];
    if (last && last.html === snapshot.html && last.css === snapshot.css) return;
    history.push(snapshot);
    if (history.length > 50) history.shift();
    future = [];
  }

  function markDirty(msg) { dirty = true; pushHistory(); setStatus(msg || 'Unsaved changes'); updateFloatingToolbar(); }

  function wireShell() {
    applyPanelLayout();
    on('btn-layers', 'click', () => setLeftCollapsed(!document.body.classList.contains('left-collapsed')));
    on('btn-properties', 'click', () => setRightCollapsed(!document.body.classList.contains('right-collapsed')));
    on('btn-close-layers', 'click', () => setLeftCollapsed(true));
    on('btn-close-properties', 'click', () => setRightCollapsed(true));
    on('btn-clean-canvas', 'click', toggleCleanCanvas);
    on('btn-collapse-left', 'click', () => setLeftCollapsed(!document.body.classList.contains('left-collapsed')));
    on('btn-collapse-right', 'click', () => setRightCollapsed(!document.body.classList.contains('right-collapsed')));
    on('left-gutter', 'pointerdown', e => startPanelResize(e, 'left'));
    on('right-gutter', 'pointerdown', e => startPanelResize(e, 'right'));
    on('page-select', 'change', () => {
      if (getValue('page-select') === 'index.html') {
        frame.srcdoc = injectEditorRuntime(htmlSource, editorCss);
        setStatus('Home loaded');
      }
    });
    on('btn-preview', 'click', togglePreview);
    on('btn-undo', 'click', undo);
    on('btn-redo', 'click', redo);
    on('btn-save', 'click', saveAll);
    on('btn-publish', 'click', saveAll);
    on('btn-desktop-view', 'click', () => setDeviceMode('desktop'));
    on('btn-mobile-view', 'click', () => setDeviceMode('mobile'));
    on('btn-zoom-out', 'click', () => setZoom(zoom - 0.1));
    on('btn-zoom-in', 'click', () => setZoom(zoom + 0.1));
    on('btn-add-text-panel', 'click', addTextBlock);
    on('btn-add-box-panel', 'click', addBoxBlock);
    on('btn-add-block-panel', 'click', addContentBlock);
    on('btn-add-section-panel', 'click', addBlankSection);
    on('btn-upload-asset', 'click', () => prop('upload-image')?.click());
    on('btn-replace-image', 'click', () => prop('upload-image')?.click());
    on('btn-refresh-images', 'click', loadImages);
    on('btn-apply-src', 'click', applyImageSource);
    on('btn-hero-mobile', 'click', replaceHeroMobile);
    on('btn-hide', 'click', hideSelected);
    on('btn-hide-top', 'click', hideSelected);
    on('btn-delete', 'click', deleteSelected);
    on('btn-delete-top', 'click', deleteSelected);
    on('btn-duplicate', 'click', duplicateSelected);
    on('btn-duplicate-top', 'click', duplicateSelected);
    on('btn-reset-selected', 'click', resetSelected);
    on('btn-select-parent', 'click', selectParent);
    on('btn-move-layer-up', 'click', moveLayerUp);
    on('btn-move-layer-down', 'click', moveLayerDown);
    on('btn-apply-background', 'click', applyBackground);
    on('btn-clear-background', 'click', clearBackground);
    on('btn-bring-forward', 'click', bringForward);
    on('btn-forward-top', 'click', bringForward);
    on('btn-send-backward', 'click', sendBackward);
    on('btn-backward-top', 'click', sendBackward);
    on('btn-text-edit', 'click', () => beginTextEdit(selected));
    on('float-replace', 'click', () => prop('upload-image')?.click());
    on('float-edit-text', 'click', () => beginTextEdit(selected));
    on('float-duplicate', 'click', duplicateSelected);
    on('float-hide', 'click', hideSelected);
    on('float-forward', 'click', bringForward);
    on('float-backward', 'click', sendBackward);
    on('float-delete', 'click', deleteSelected);
    on('upload-image', 'change', uploadReplacement);
    document.addEventListener('pointerdown', e => { if (!contextMenu?.contains(e.target)) hideContextMenu(); });
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', e => {
      if (isEditorShortcutKey(e)) stopShortcut(e);
    }, true);
    window.addEventListener('pointermove', onPanelResizeMove);
    window.addEventListener('pointerup', endPanelResize);
    window.addEventListener('resize', () => scheduleFitZoom(false));
    window.addEventListener('message', onFrameShortcutMessage);
    window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
    const canvasWrap = prop('canvas-wrap');
    canvasWrap?.addEventListener('dragover', onFileDragOver);
    canvasWrap?.addEventListener('drop', onShellFileDrop);
    ['prop-left','prop-top','prop-width','prop-height','prop-opacity','prop-z','prop-rotate','prop-radius','prop-color','prop-bg','prop-font-size','prop-font-family','prop-letter','prop-blend','prop-text'].forEach(id => {
      on(id, 'focus', beginPanelInputSession);
      on(id, 'focusin', beginPanelValueWatch);
      on(id, 'blur', endPanelValueWatch);
      on(id, 'change', e => applyPanel(e, true));
      on(id, 'input', e => applyPanel(e, false));
      on(id, 'keyup', e => { if (e.metaKey || e.ctrlKey) return; applyPanel(e, false); });
      on(id, 'pointerup', e => applyPanel(e, false));
      on(id, 'wheel', e => requestAnimationFrame(() => applyPanel(e, false)));
    });
  }

  function wireCanvas() {
    doc.addEventListener('mouseover', e => { if (!editMode) return; const el = pickEditable(e.target); if (el && el !== selected) el.classList.add('jbc-editor-hover'); }, true);
    doc.addEventListener('mouseout', e => { const el = pickEditable(e.target); if (el) el.classList.remove('jbc-editor-hover'); }, true);
    doc.addEventListener('click', e => {
      if (!editMode || dragState) return;
      if (suppressNextClick) { suppressNextClick = false; e.preventDefault(); e.stopPropagation(); return; }
      hideContextMenu();
      if (assetMode) {
        e.preventDefault();
        e.stopPropagation();
        placeAssetFromClick(e);
        return;
      }
      const el = pickHeroTagAtPoint(e) || pickHeroDottedAccentAtPoint(e) || pickEditable(e.target);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      selectElement(el);
    }, true);
    doc.addEventListener('contextmenu', onCanvasContextMenu, true);
    doc.addEventListener('dblclick', e => { if (!editMode) return; const el = pickHeroTagAtPoint(e) || pickHeroDottedAccentAtPoint(e) || pickEditable(e.target); if (!el || !isTextElement(el)) return; e.preventDefault(); e.stopPropagation(); selectElement(el); beginTextEdit(el, e); }, true);
    doc.addEventListener('input', e => { if (selected && e.target === selected && isTextElement(selected)) { setValue('prop-text', selected.innerHTML); markDirty('Text edited'); } }, true);
    doc.addEventListener('pointerdown', onPointerDown, true);
    doc.addEventListener('pointermove', onPointerMove, true);
    doc.addEventListener('pointerup', endPointerGesture, true);
    doc.addEventListener('pointercancel', endPointerGesture, true);
    doc.addEventListener('keydown', onKeyDown, true);
    doc.addEventListener('keyup', e => { if (isEditorShortcutKey(e)) stopShortcut(e); }, true);
    doc.addEventListener('beforeinput', e => {
      if (e.inputType === 'historyUndo') { stopShortcut(e); undo(); }
      else if (e.inputType === 'historyRedo') { stopShortcut(e); redo(); }
    }, true);
    doc.addEventListener('wheel', onWheel, { capture: true, passive: false });
    doc.addEventListener('scroll', updateSelectionUI, true);
    doc.addEventListener('dragover', onFileDragOver, true);
    doc.addEventListener('drop', onCanvasFileDrop, true);
  }

  function onFileDragOver(e) {
    if (!editMode) return;
    if (Array.from(e.dataTransfer?.types || []).includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setStatus('Drop to upload');
    }
  }

  async function onShellFileDrop(e) {
    if (!editMode) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    e.preventDefault();
    const frameRect = frame.getBoundingClientRect();
    const point = {
      x: Math.max(0, e.clientX - frameRect.left),
      y: Math.max(0, e.clientY - frameRect.top)
    };
    await uploadDroppedFile(file, point);
  }

  async function onCanvasFileDrop(e) {
    if (!editMode) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    await uploadDroppedFile(file, { x: e.clientX, y: e.clientY });
  }

  async function uploadDroppedFile(file, point) {
    try {
      const src = await uploadImage(file, 'images/editor-assets');
      applyUploadedAsset(src, point);
    } catch (err) {
      setStatus(err.message);
    }
  }

  function setDeviceMode(mode) {
    deviceMode = mode === 'mobile' ? 'mobile' : 'desktop';
    document.body.classList.toggle('device-mobile', deviceMode === 'mobile');
    toggleClass('btn-desktop-view', 'active', deviceMode === 'desktop');
    toggleClass('btn-mobile-view', 'active', deviceMode === 'mobile');
    fitZoomForDevice(true);
    setStatus(deviceMode === 'mobile' ? 'Mobile view' : 'Desktop view');
    updateSelectionUI();
  }

  function setZoom(value) {
    zoom = Math.max(0.35, Math.min(1.5, Math.round(value * 100) / 100));
    document.documentElement.style.setProperty('--canvas-scale', String(zoom));
    syncScaledCanvasSize();
    setText('zoom-label', Math.round(zoom * 100) + '%');
    updateSelectionUI();
  }

  function syncScaledCanvasSize() {
    const styles = getComputedStyle(document.documentElement);
    const canvasWidth = parseFloat(styles.getPropertyValue('--canvas-width')) || window.innerWidth;
    const canvasHeight = parseFloat(styles.getPropertyValue('--canvas-height')) || window.innerHeight;
    document.documentElement.style.setProperty('--scaled-canvas-width', Math.ceil(canvasWidth * zoom) + 'px');
    document.documentElement.style.setProperty('--scaled-canvas-height', Math.ceil(canvasHeight * zoom) + 'px');
  }

  function fitZoomForDevice(preferFit) {
    const wrap = prop('canvas-wrap');
    if (!wrap) return;
    const wrapStyles = getComputedStyle(wrap);
    const horizontalPadding = (parseFloat(wrapStyles.paddingLeft) || 0) + (parseFloat(wrapStyles.paddingRight) || 0);
    const verticalPadding = (parseFloat(wrapStyles.paddingTop) || 0) + (parseFloat(wrapStyles.paddingBottom) || 0);
    const availableWidth = Math.max(320, wrap.clientWidth - horizontalPadding);
    const availableHeight = Math.max(320, wrap.clientHeight - verticalPadding);
    if (deviceMode !== 'mobile') {
      const minDesktopWidth = 1024;
      const minDesktopHeight = 720;
      const fit = Math.min(1, Math.max(0.35, Math.min(availableWidth / minDesktopWidth, availableHeight / minDesktopHeight)));
      const canvasWidth = Math.max(minDesktopWidth, Math.round(availableWidth / fit));
      const canvasHeight = Math.max(minDesktopHeight, Math.round(availableHeight / fit));
      document.documentElement.style.setProperty('--canvas-width', canvasWidth + 'px');
      document.documentElement.style.setProperty('--canvas-height', canvasHeight + 'px');
      setZoom(fit);
      return;
    }
    const fit = Math.min(1, Math.max(0.45, availableWidth / 390));
    if (preferFit || zoom > fit) setZoom(fit);
  }

  function scheduleFitZoom(preferFit = true) {
    if (fitRaf) cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(() => {
      fitRaf = null;
      fitZoomForDevice(preferFit);
      updateSelectionUI();
    });
  }

  function selectElement(el) {
    if (!el) return;
    if (selected) selected.removeAttribute('data-jbc-selected');
    panelInputSession = null;
    selected = el;
    selectorFor(selected);
    selected.setAttribute('data-jbc-selected', 'true');
    document.body.classList.add('has-selection');
    hydratePanel();
    buildLayers();
    ensureHandles();
    fitZoomForDevice(true);
    updateSelectionUI();
  }

  function hydratePanel() {
    const img = selectedImage(selected);
    const text = selected && isTextElement(selected);
    document.body.classList.toggle('has-image', !!img);
    document.body.classList.toggle('has-text', !!text);
    document.body.classList.toggle('selected-decoration', !!selected?.classList.contains('editor-decoration') || !!selected?.classList.contains('hero-corner-rose'));
    setText('selected-name', selected ? describe(selected) : 'Nothing selected');
    setText('selected-meta', selected ? selectorFor(selected) : '');
    setValue('prop-text', text ? selected.innerHTML : '');
    setValue('prop-src', img ? img.getAttribute('src') || '' : '');
    const cs = selected ? frame.contentWindow.getComputedStyle(selected) : null;
    setValue('prop-left', selected ? numericValue(selected.style.left || (cs.left !== 'auto' ? cs.left : '')) || rectValue(selected, 'left') : '');
    setValue('prop-top', selected ? numericValue(selected.style.top || (cs.top !== 'auto' ? cs.top : '')) || rectValue(selected, 'top') : '');
    setValue('prop-width', selected ? numericValue(selected.style.width || (cs.width !== 'auto' ? cs.width : '')) || rectValue(selected, 'width') : '');
    setValue('prop-height', selected ? numericValue(selected.style.height || (cs.height !== 'auto' ? cs.height : '')) || rectValue(selected, 'height') : '');
    setValue('prop-opacity', selected ? selected.style.opacity || cs.opacity || '' : '');
    setValue('prop-z', selected ? selected.style.zIndex || (cs.zIndex === 'auto' ? '' : cs.zIndex) : '');
    setValue('prop-rotate', selected ? numericValue(getRotate(selected)) : '');
    setValue('prop-radius', selected ? numericValue(selected.style.borderRadius || cs.borderRadius || '') : '');
    setValue('prop-color', cs ? rgbToHex(cs.color) : '#ffffff');
    setValue('prop-bg', cs ? rgbToHex(cs.backgroundColor) : '#000000');
    setValue('prop-font-size', selected ? numericValue(selected.style.fontSize || cs.fontSize || '') : '');
    setValue('prop-font-family', selected ? selected.style.fontFamily || '' : '');
    setValue('prop-letter', selected ? numericValue(selected.style.letterSpacing || cs.letterSpacing || '') : '');
    setValue('prop-blend', selected ? selected.style.mixBlendMode || '' : '');
    hydrateBackgroundPanel();
    updateFloatingToolbar();
  }

  function hydrateBackgroundPanel() {
    const section = selected?.closest?.('section, footer') || (selected?.matches?.('section, footer') ? selected : null);
    const sectionCss = section ? frame.contentWindow.getComputedStyle(section) : null;
    const pageCss = doc?.body ? frame.contentWindow.getComputedStyle(doc.body) : null;
    setValue('prop-section-bg', sectionCss ? rgbToHex(sectionCss.backgroundColor) : '#000000');
    setValue('prop-section-bg-image', section ? cssUrlToPath(section.style.backgroundImage || sectionCss.backgroundImage) : '');
    setValue('prop-page-bg', pageCss ? rgbToHex(pageCss.backgroundColor) : '#000000');
    setValue('prop-page-bg-image', doc?.body ? cssUrlToPath(doc.body.style.backgroundImage || pageCss.backgroundImage) : '');
  }

  function cssUrlToPath(value) {
    const m = String(value || '').match(/url\(["']?([^"')]+)["']?\)/);
    return m ? m[1] : '';
  }

  function rgbToHex(value) {
    const m = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#000000';
    return '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('');
  }

  function getRotate(el) { const m = String(el?.style.transform || '').match(/rotate\(([^)]+)\)/); return m ? m[1] : ''; }

  function ensureEditablePosition(el) {
    const cs = frame.contentWindow.getComputedStyle(el);
    if (el.classList.contains('editor-decoration')) {
      ensurePositionedParent(el.parentElement);
      if (cs.position === 'static') el.style.position = 'absolute';
      return;
    }
    if (cs.position === 'static') el.style.position = 'relative';
    if (isTextElement(el) && cs.display === 'inline') el.style.display = 'inline-block';
  }

  function freezePositionForTransform(el) {
    if (!el || !doc) return;
    const cs = frame.contentWindow.getComputedStyle(el);
    if (!['absolute', 'fixed', 'relative'].includes(cs.position)) return;
    const rect = el.getBoundingClientRect();
    const parent = el.offsetParent || el.parentElement || doc.body;
    const parentRect = parent === doc.body ? { left: 0, top: 0 } : parent.getBoundingClientRect();
    const left = Math.round(rect.left - parentRect.left + (parent.scrollLeft || 0));
    const top = Math.round(rect.top - parentRect.top + (parent.scrollTop || 0));

    el.style.setProperty('left', left + 'px', 'important');
    el.style.setProperty('top', top + 'px', 'important');
    if (cs.right !== 'auto') el.style.setProperty('right', 'auto', 'important');
    if (cs.bottom !== 'auto') el.style.setProperty('bottom', 'auto', 'important');
    if (isTextElement(el) && !el.style.width) {
      el.style.setProperty('width', Math.ceil(rect.width) + 'px', 'important');
    }
  }

  function ensurePositionedParent(parent) {
    if (!parent || parent === doc.body) return;
    const cs = frame.contentWindow.getComputedStyle(parent);
    if (cs.position === 'static') {
      parent.style.position = 'relative';
      saveStyleFor(parent, false);
    }
  }

  function onPointerDown(e) {
    if (!editMode || e.button !== 0 || assetMode || textEditingEl || e.detail > 1) return;
    const handle = e.target.closest?.('.jbc-editor-handle');
    if (handle && selected) { startTransform(e, handle.dataset.handle); return; }
    if (selected && ((e.target === selected || selected.contains(e.target)) || pointInsideElement(selected, e, 6))) { startTransform(e, 'move'); return; }
    const el = pickHeroTagAtPoint(e) || pickHeroDottedAccentAtPoint(e) || pickEditable(e.target);
    if (!el || e.target.closest?.('input, textarea, select') || el.isContentEditable) return;
    if (el !== selected) selectElement(el);
    else if (selected && !(e.target === selected || selected.contains(e.target))) return;
    startTransform(e, 'move');
  }

  function startTransform(e, mode) {
    if (!selected) return;
    pushHistory();
    ensureEditablePosition(selected);
    freezePositionForTransform(selected);
    const rect = selected.getBoundingClientRect();
    const cs = frame.contentWindow.getComputedStyle(selected);
    dragState = { mode, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, left: parseFloat(selected.style.left || (cs.left !== 'auto' ? cs.left : '0')) || 0, top: parseFloat(selected.style.top || (cs.top !== 'auto' ? cs.top : '0')) || 0, width: rect.width, height: rect.height, centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2, startRotate: parseFloat(getRotate(selected)) || 0, next: null };
    doc.body.classList.add('jbc-is-dragging');
    dragState.didMove = false;
    floatingToolbar?.classList.remove('visible');
    e.preventDefault();
    e.stopPropagation();
    e.target.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    dragState.next = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    if (!rafPending) { rafPending = true; frame.contentWindow.requestAnimationFrame(applyPointerFrame); }
  }

  function applyPointerFrame() {
    rafPending = false;
    if (!dragState || !dragState.next || !selected) return;
    const dx = dragState.next.x - dragState.startX;
    const dy = dragState.next.y - dragState.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.didMove = true;
    if (dragState.mode === 'move') {
      selected.style.left = Math.round(dragState.left + dx) + 'px';
      selected.style.top = Math.round(dragState.top + dy) + 'px';
    } else if (dragState.mode === 'rotate') {
      const a0 = Math.atan2(dragState.startY - dragState.centerY, dragState.startX - dragState.centerX);
      const a1 = Math.atan2(dragState.next.y - dragState.centerY, dragState.next.x - dragState.centerX);
      selected.style.transform = 'rotate(' + Math.round(dragState.startRotate + (a1 - a0) * 180 / Math.PI) + 'deg)';
    } else {
      resizeSelected(dragState.mode, dx, dy);
    }
    saveStyleFor(selected, false);
    hydratePanel();
    updateSelectionUI();
  }

  function resizeSelected(mode, dx, dy) {
    let width = dragState.width, height = dragState.height, left = dragState.left, top = dragState.top;
    if (mode.includes('e')) width += dx;
    if (mode.includes('s')) height += dy;
    if (mode.includes('w')) { width -= dx; left += dx; }
    if (mode.includes('n')) { height -= dy; top += dy; }
    selected.style.width = Math.max(24, Math.round(width)) + 'px';
    selected.style.height = Math.max(24, Math.round(height)) + 'px';
    selected.style.left = Math.round(left) + 'px';
    selected.style.top = Math.round(top) + 'px';
  }

  function endPointerGesture(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    doc.body.classList.remove('jbc-is-dragging');
    saveStyleFor(selected, true);
    markDirty(dragState.mode === 'move' ? 'Moved' : dragState.mode === 'rotate' ? 'Rotated' : 'Resized');
    suppressNextClick = !!dragState.didMove;
    dragState = null;
  }

  function ensureHandles() {
    if (!doc) return;
    if (!handlesBox) {
      handlesBox = doc.createElement('div');
      handlesBox.className = 'jbc-editor-box';
      ['nw','n','ne','e','se','s','sw','w','rotate'].forEach(name => { const handle = doc.createElement('div'); handle.className = 'jbc-editor-handle ' + name; handle.dataset.handle = name; handlesBox.appendChild(handle); });
      doc.body.appendChild(handlesBox);
    }
  }

  function updateSelectionUI() {
    if (!selected || !doc || !handlesBox) return;
    const rect = selected.getBoundingClientRect();
    handlesBox.style.left = rect.left + doc.defaultView.scrollX + 'px';
    handlesBox.style.top = rect.top + doc.defaultView.scrollY + 'px';
    handlesBox.style.width = rect.width + 'px';
    handlesBox.style.height = rect.height + 'px';
    handlesBox.style.display = editMode ? 'block' : 'none';
    updateFloatingToolbar();
  }

  function updateFloatingToolbar() {
    if (floatLabel) floatLabel.textContent = describe(selected);
    floatingToolbar?.classList.remove('visible');
  }

  function beginPanelInputSession() {
    if (!selected) return;
    if (!panelInputSession || panelInputSession.el !== selected) {
      pushHistory();
      panelInputSession = { el: selected, hasHistory: true };
    }
    selected.setAttribute('data-jbc-live-edit', 'true');
  }

  function beginPanelValueWatch(e) {
    const field = e?.target;
    if (!field || !field.id) return;
    if (panelWatch?.raf) cancelAnimationFrame(panelWatch.raf);
    panelWatch = { field, value: field.value, raf: null };
    const tick = () => {
      if (!panelWatch || panelWatch.field !== field || document.activeElement !== field) return;
      if (field.value !== panelWatch.value) {
        panelWatch.value = field.value;
        applyPanel({ target: field }, false);
      }
      panelWatch.raf = requestAnimationFrame(tick);
    };
    panelWatch.raf = requestAnimationFrame(tick);
  }

  function endPanelValueWatch(e) {
    const field = e?.target;
    if (panelWatch?.raf) cancelAnimationFrame(panelWatch.raf);
    panelWatch = null;
    if (field?.id) applyPanel({ target: field }, true);
    selected?.removeAttribute('data-jbc-live-edit');
  }

  function applyPanel(e, commit = true) {
    if (!selected) return;
    if (!panelInputSession || panelInputSession.el !== selected) {
      if (commit) pushHistory();
      panelInputSession = { el: selected, hasHistory: commit };
    }
    if (!commit) selected.setAttribute('data-jbc-live-edit', 'true');
    const id = e?.target?.id || '';
    const applyAll = !id;
    const applyIf = (fieldId, propName, value) => {
      if (!(applyAll || id === fieldId)) return;
      const cssName = propName.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      if (value === '') selected.style.removeProperty(cssName);
      else selected.style.setProperty(cssName, value, 'important');
    };
    applyIf('prop-left', 'left', unitValue(getValue('prop-left'), 'px'));
    applyIf('prop-top', 'top', unitValue(getValue('prop-top'), 'px'));
    applyIf('prop-width', 'width', unitValue(getValue('prop-width'), 'px'));
    applyIf('prop-height', 'height', unitValue(getValue('prop-height'), 'px'));
    applyIf('prop-opacity', 'opacity', getValue('prop-opacity'));
    applyIf('prop-z', 'zIndex', getValue('prop-z'));
    applyIf('prop-radius', 'borderRadius', unitValue(getValue('prop-radius'), 'px'));
    applyIf('prop-color', 'color', getValue('prop-color'));
    applyIf('prop-bg', 'backgroundColor', getValue('prop-bg'));
    applyIf('prop-font-size', 'fontSize', unitValue(getValue('prop-font-size'), 'px'));
    applyIf('prop-font-family', 'fontFamily', getValue('prop-font-family'));
    applyIf('prop-letter', 'letterSpacing', unitValue(getValue('prop-letter'), 'px'));
    applyIf('prop-blend', 'mixBlendMode', getValue('prop-blend'));
    if ((applyAll || id === 'prop-rotate') && getValue('prop-rotate') !== '') selected.style.setProperty('transform', 'rotate(' + numericValue(getValue('prop-rotate')) + 'deg)', 'important');
    if ((applyAll || id === 'prop-text') && isTextElement(selected)) selected.innerHTML = getValue('prop-text');
    if (commit) {
      saveStyleFor(selected, true);
      selected.removeAttribute('data-jbc-live-edit');
      panelInputSession = null;
      hydratePanel();
    }
    updateSelectionUI();
    markDirty('Properties changed');
  }

  function saveStyleFor(el, rebuildLayers = false) {
    if (!el) return;
    const selector = selectorFor(el);
    const decl = managedStyles.map(name => { const value = el.style.getPropertyValue(name); return value ? '  ' + name + ': ' + value + ' !important;' : ''; }).filter(Boolean).join('\n');
    const escaped = selector.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped + '\\s*\\{[\\s\\S]*?\\}', 'm');
    if (!decl) editorCss = editorCss.replace(re, '').trim() + '\n';
    else {
      const block = selector + ' {\n' + decl + '\n}';
      editorCss = re.test(editorCss) ? editorCss.replace(re, block) : (editorCss.trim() + '\n\n' + block + '\n').trim() + '\n';
    }
    const live = doc.getElementById('jbc-editor-overrides-live');
    if (live) live.textContent = editorCss;
    if (rebuildLayers) buildLayers();
  }

  function buildLayers() {
    layersEl.innerHTML = '';
    const included = new Set();
    layerGroups.forEach(group => {
      const wrap = document.createElement('div');
      wrap.className = 'layer-group';
      const title = document.createElement('div');
      title.className = 'layer-group-title';
      title.textContent = group.title;
      wrap.appendChild(title);
      group.items.forEach(([name, sel]) => {
        const el = doc?.querySelector(sel);
        if (el && isVisibleEditable(el)) {
          selectorFor(el);
          included.add(el);
          wrap.appendChild(layerButton(name, sel, el));
        }
      });
      layersEl.appendChild(wrap);
    });
    const decorations = Array.from(doc?.querySelectorAll('.editor-decoration, .hero-corner-rose') || []).filter(isVisibleEditable);
    const wrap = document.createElement('div');
    wrap.className = 'layer-group';
    const title = document.createElement('div');
    title.className = 'layer-group-title';
    title.textContent = 'Decorations / Added Assets';
    wrap.appendChild(title);
    decorations.forEach((el, i) => {
      selectorFor(el);
      included.add(el);
      wrap.appendChild(layerButton(assetLayerName(el), selectorFor(el), el));
    });
    layersEl.appendChild(wrap);

    appendFooterTextLayers(included);
    const audit = auditEditableLayers(included);
    if (audit.other.length) {
      const otherWrap = document.createElement('div');
      otherWrap.className = 'layer-group';
      const otherTitle = document.createElement('div');
      otherTitle.className = 'layer-group-title';
      otherTitle.textContent = 'Other Editable Elements';
      otherWrap.appendChild(otherTitle);
      audit.other.forEach((el, i) => otherWrap.appendChild(layerButton(layerNameFor(el, 'Element ' + (i + 1)), selectorFor(el), el)));
      layersEl.appendChild(otherWrap);
    }
    window.__jbcLayerAudit = audit;
    markEditableItems();
  }

  function markEditableItems() {
    if (!doc) return;
    doc.querySelectorAll('[data-jbc-editable]').forEach(el => el.removeAttribute('data-jbc-editable'));
    collectEditableItems().forEach(el => {
      selectorFor(el);
      el.setAttribute('data-jbc-editable', 'true');
    });
  }

  function collectEditableItems() {
    if (!doc) return [];
    const set = new Set();
    layerGroups.forEach(group => group.items.forEach(([, sel]) => {
      const el = normalizeAuditElement(doc.querySelector(sel));
      if (isVisibleEditable(el)) set.add(el);
    }));
    auditSelectors.forEach(([, selector]) => {
      doc.querySelectorAll(selector).forEach(item => {
        const el = normalizeAuditElement(item);
        if (isVisibleEditable(el) && !isHugeHeroTitleParent(el)) set.add(el);
      });
    });
    doc.querySelectorAll('footer.footer h4, footer.footer a, footer.footer .footer-bottom span, .editor-decoration').forEach(item => {
      const el = normalizeAuditElement(item);
      if (isVisibleEditable(el)) set.add(el);
    });
    doc.querySelectorAll('body *').forEach(item => {
      const el = normalizeAuditElement(item);
      if (isVisibleEditable(el) && !isHugeHeroTitleParent(el)) set.add(el);
    });
    return Array.from(set).filter(Boolean);
  }

  function appendFooterTextLayers(included) {
    const footerItems = Array.from(doc?.querySelectorAll('footer.footer h4, footer.footer a, footer.footer .footer-bottom span') || []).filter(isVisibleEditable);
    if (!footerItems.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'layer-group';
    const title = document.createElement('div');
    title.className = 'layer-group-title';
    title.textContent = 'Footer Text';
    wrap.appendChild(title);
    footerItems.forEach((el, i) => {
      selectorFor(el);
      included.add(el);
      wrap.appendChild(layerButton(layerNameFor(el, 'Footer Text ' + (i + 1)), selectorFor(el), el));
    });
    layersEl.appendChild(wrap);
  }

  function layerButton(name, sel, el) {
    selectorFor(el);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layer' + (el === selected ? ' active' : '');
    button.innerHTML = '<span class="name">' + name + '</span><span class="sub">' + (el.dataset.editorId || sel) + '</span>';
    button.onclick = () => { selectElement(el); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    return button;
  }

  function auditEditableLayers(included) {
    const buckets = {};
    const all = new Set();
    auditSelectors.concat([['All Visible Elements', 'body *']]).forEach(([label, selector]) => {
      const found = Array.from(doc.querySelectorAll(selector)).filter(isVisibleEditable).map(normalizeAuditElement).filter(Boolean);
      buckets[label] = found;
      found.forEach(el => all.add(el));
    });
    const normalized = Array.from(all);
    const other = normalized.filter(el => !included.has(el) && !hasIncludedAncestor(el, included) && !isHugeHeroTitleParent(el));
    other.forEach(selectorFor);
    return { buckets, other };
  }

  function normalizeAuditElement(el) {
    if (!el || el.matches(ignoredEditableSelectors)) return null;
    if (el.matches('.hero-mega') && el.querySelector('.l1, .l2, .l3')) return null;
    if (el.matches('picture')) return el.querySelector('img') || el;
    return el;
  }

  function isVisibleEditable(el) {
    el = normalizeAuditElement(el);
    if (!el || el.matches(ignoredEditableSelectors)) return false;
    const cs = frame.contentWindow.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  }

  function hasIncludedAncestor(el, included) {
    let parent = el.parentElement;
    while (parent && parent !== doc.body) {
      if (included.has(parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function isHugeHeroTitleParent(el) {
    return el?.matches?.('.hero-mega, .hero-content') && el.querySelector('.l1, .l2, .l3');
  }

  function assetLayerName(el) {
    const type = el.dataset.assetType || (el.classList.contains('editor-vector') ? 'svg' : el.classList.contains('editor-rose') ? 'rose' : el.classList.contains('editor-image') ? 'image' : 'decoration');
    return type + ' / ' + sectionLabel(el.closest('section, footer')) + ' / ' + selectorFor(el).replace('[data-editor-id="', '').replace('"]', '');
  }

  function layerNameFor(el, fallback) {
    if (!el) return fallback;
    if (el.dataset.editorId) return el.dataset.editorId;
    if (el.matches('img')) return 'Image';
    if (el.matches('a[href]')) return 'Link: ' + (el.textContent || el.getAttribute('href') || '').trim().slice(0, 40);
    if (el.matches('button')) return 'Button: ' + (el.textContent || '').trim().slice(0, 40);
    if (el.matches('h1,h2,h3,h4,h5,h6')) return el.tagName.toLowerCase() + ': ' + (el.textContent || '').trim().slice(0, 44);
    if (el.matches('section')) return 'Section: ' + (el.id || Array.from(el.classList).slice(0, 2).join('.'));
    return describe(el);
  }

  async function loadImages() {
    try {
      const res = await api('/api/images');
      imageList.innerHTML = '';
      res.images.forEach(src => {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'img-tile' + (src === selectedImagePath ? ' active' : '');
        tile.innerHTML = '<img src="/' + src + '" alt=""><div>' + src + '</div>';
        tile.onclick = () => { selectedImagePath = src; setValue('prop-src', src); loadImages(); };
        imageList.appendChild(tile);
      });
    } catch (err) { setStatus(err.message); }
  }

  async function uploadImage(file, folder = 'images') {
    const form = new FormData();
    form.append('image', file);
    form.append('folder', folder);
    const res = await fetch('/api/upload-image', { method: 'POST', body: form });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Upload failed');
    selectedImagePath = json.path;
    await loadImages();
    return json.path;
  }

  async function uploadReplacement(e) {
    try {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const src = await uploadImage(file, 'images/editor-assets');
      applyUploadedAsset(src);
    } catch (err) { setStatus(err.message); }
  }

  function applyUploadedAsset(src, point) {
    const target = getValue('upload-target') || 'screen';
    if (target === 'section-bg') {
      setValue('prop-section-bg-image', src);
      applyBackground(point ? pickAssetParentAtPoint(point.x, point.y) : null);
      return;
    }
    if (target === 'page-bg') {
      setValue('prop-page-bg-image', src);
      applyBackground();
      return;
    }
    const kindValue = getValue('upload-kind') || 'auto';
    const kind = kindValue === 'auto' ? (src.toLowerCase().endsWith('.svg') ? 'vector' : 'image') : kindValue;
    const parent = point ? pickAssetParentAtPoint(point.x, point.y) : resolvePlacementParent('selected');
    insertAsset(assetConfig(kind, src), parent, point || null);
  }

  function applyImageSource() { const src = getValue('prop-src').trim(); if (src) replaceSelectedImage(src); }
  function replaceSelectedImage(src) { const img = selectedImage(selected); if (!img) return; pushHistory(); img.setAttribute('src', src); setValue('prop-src', src); markDirty('Image replaced'); }

  function replaceHeroMobile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      try {
        if (!input.files[0]) return;
        const src = await uploadImage(input.files[0]);
        const source = doc.querySelector('.hero picture source');
        if (source) { pushHistory(); source.setAttribute('srcset', src); markDirty('Hero mobile image replaced'); }
      } catch (err) { setStatus(err.message); }
    };
    input.click();
  }

  function beginAssetAdd(kind, src) {
    const config = assetConfig(kind, src);
    if (!config.src) {
      prop('upload-image')?.click();
      assetMode = { kind, config };
      return;
    }
    const placement = getValue('asset-placement') || 'selected';
    if (placement === 'click') {
      assetMode = { kind, config };
      document.body.classList.add('asset-place-mode');
      setStatus('Click the page to place ' + kind);
      return;
    }
    insertAsset(config, resolvePlacementParent(placement), null);
  }

  function assetConfig(kind, src) {
    const base = assetDefaults[kind] || assetDefaults.decoration;
    const picked = src || getValue('prop-src') || selectedImagePath || base.src;
    const normalizedKind = picked && picked.toLowerCase().endsWith('.svg') ? 'vector' : kind;
    const normalizedBase = normalizedKind === kind ? base : assetDefaults.vector;
    return {
      kind: normalizedKind,
      src: picked,
      prefix: normalizedBase.prefix,
      className: normalizedBase.className,
      blend: normalizedBase.blend,
      width: normalizedBase.width,
      height: normalizedBase.height
    };
  }

  function resolvePlacementParent(placement) {
    if (placement === 'selected') return selected?.closest?.('section, footer') || doc.querySelector('section.hero') || doc.body;
    return doc.querySelector(sectionTargets[placement]) || selected?.closest?.('section, footer') || doc.querySelector('section.hero') || doc.body;
  }

  function placeAssetFromClick(e) {
    const targetParent = pickAssetParentAtPoint(e.clientX, e.clientY);
    insertAsset(assetMode.config, targetParent, { x: e.clientX, y: e.clientY });
    assetMode = null;
    document.body.classList.remove('asset-place-mode');
  }

  function createInsertedElement(tag, className, html, defaults = {}) {
    if (!doc) return null;
    pushHistory();
    const parent = resolvePlacementParent(getValue('asset-placement') || 'selected');
    ensurePositionedParent(parent);
    const el = doc.createElement(tag);
    el.className = className;
    el.dataset.editorId = nextAssetId(defaults.prefix || 'block');
    el.innerHTML = html;
    el.style.position = 'absolute';
    el.style.left = defaults.left || '48px';
    el.style.top = defaults.top || '48px';
    if (defaults.width) el.style.width = defaults.width;
    if (defaults.height) el.style.height = defaults.height;
    if (defaults.padding) el.style.padding = defaults.padding;
    if (defaults.background) el.style.backgroundColor = defaults.background;
    if (defaults.color) el.style.color = defaults.color;
    el.style.zIndex = String(nextZIndexIn(parent));
    parent.insertBefore(el, parent.firstChild);
    selectElement(el);
    saveStyleFor(el, true);
    markDirty('Element added');
    return el;
  }

  function addTextBlock() {
    const el = createInsertedElement('div', 'editor-decoration editor-text-block', 'New text', {
      prefix: 'text',
      width: '260px',
      padding: '12px',
      color: '#f7eee8'
    });
    if (el) beginTextEdit(el);
    return el;
  }

  function applyLocalPoint(el, target, frameX, frameY) {
    const parent = target.closest?.('section, footer') || backgroundTargetSection() || doc.body;
    const point = localPointFor(target, frameX, frameY);
    if (el.parentElement !== parent) parent.insertBefore(el, parent.firstChild);
    el.style.left = Math.max(0, Math.round(point.x)) + 'px';
    el.style.top = Math.max(0, Math.round(point.y)) + 'px';
    saveStyleFor(el, true);
  }

  function addTextBlockAt(target, frameX, frameY) {
    const el = addTextBlock();
    if (el) applyLocalPoint(el, target, frameX, frameY);
  }

  function addBoxBlock() {
    return createInsertedElement('div', 'editor-decoration editor-box-block', '', {
      prefix: 'box',
      width: '260px',
      height: '160px',
      background: '#e8891d'
    });
  }

  function addBoxBlockAt(target, frameX, frameY) {
    const el = addBoxBlock();
    if (el) applyLocalPoint(el, target, frameX, frameY);
  }

  function addContentBlock() {
    return createInsertedElement('div', 'editor-decoration editor-content-block', '<strong>Heading</strong><br>Short supporting text', {
      prefix: 'block',
      width: '320px',
      padding: '20px',
      background: '#211916',
      color: '#f7eee8'
    });
  }

  function addContentBlockAt(target, frameX, frameY) {
    const el = addContentBlock();
    if (el) applyLocalPoint(el, target, frameX, frameY);
  }

  function addBlankSection() {
    if (!doc) return;
    pushHistory();
    const section = doc.createElement('section');
    section.className = 'editor-added-section';
    section.dataset.editorId = nextAssetId('section');
    section.style.minHeight = '420px';
    section.style.padding = '80px 24px';
    section.style.backgroundColor = '#14100e';
    section.style.color = '#f7eee8';
    section.innerHTML = '<h2>New section</h2><p>Add your story here.</p>';
    const anchor = selected?.closest?.('section, footer') || doc.querySelector('section.hero');
    if (anchor?.nextSibling) anchor.parentNode.insertBefore(section, anchor.nextSibling);
    else doc.body.appendChild(section);
    selectElement(section);
    saveStyleFor(section, true);
    markDirty('Section added');
  }

  function pickAssetParentAtPoint(x, y) {
    const el = doc.elementFromPoint(x, y);
    return el?.closest?.('section, footer') || selected?.closest?.('section, footer') || doc.querySelector('section.hero') || doc.body;
  }

  function insertAsset(config, parent, point) {
    if (!doc || !config.src || !allowedAssetExt.test(config.src)) {
      setStatus('Choose a PNG, JPG, WebP, GIF, or SVG asset first');
      return;
    }
    pushHistory();
    parent = parent || doc.querySelector('section.hero') || doc.body;
    ensurePositionedParent(parent);
    const div = doc.createElement('div');
    div.className = config.className;
    div.dataset.assetType = config.kind;
    div.dataset.assetParent = sectionLabel(parent);
    div.dataset.editorId = nextAssetId(config.prefix);
    div.innerHTML = '<img src="' + config.src + '" alt="">';
    const parentRect = parent.getBoundingClientRect();
    const left = point ? point.x - parentRect.left + parent.scrollLeft : 48;
    const top = point ? point.y - parentRect.top + parent.scrollTop : 48;
    div.style.position = 'absolute';
    div.style.left = Math.max(0, Math.round(left)) + 'px';
    div.style.top = Math.max(0, Math.round(top)) + 'px';
    div.style.width = config.width + 'px';
    div.style.height = config.height + 'px';
    div.style.opacity = '0.9';
    div.style.zIndex = String(nextZIndexIn(parent));
    div.style.mixBlendMode = config.blend;
    parent.insertBefore(div, parent.firstChild);
    selectElement(div);
    saveStyleFor(div, true);
    markDirty('Asset added');
  }

  function nextAssetId(prefix) {
    let id;
    do {
      id = prefix + '-' + String(assetCounter++).padStart(3, '0');
    } while (doc.querySelector('[data-editor-id="' + id + '"]'));
    return id;
  }

  function sectionLabel(el) {
    if (!el) return 'page';
    if (el.matches('section.hero')) return 'Hero';
    if (el.matches('.manifesto')) return 'Manifesto';
    if (el.matches('#services-overview')) return 'Process';
    if (el.matches('#featured-work')) return 'Selected Work';
    if (el.matches('.testimonial-section')) return 'Testimonial';
    if (el.matches('.cta-section')) return 'CTA';
    if (el.matches('footer.footer')) return 'Footer';
    return el.id || Array.from(el.classList).slice(0, 2).join('.') || el.tagName.toLowerCase();
  }

  function hideSelected() { if (!selected) return; pushHistory(); selected.style.display = frame.contentWindow.getComputedStyle(selected).display === 'none' ? '' : 'none'; saveStyleFor(selected, true); markDirty('Visibility changed'); }

  function deleteSelected() {
    if (!selected) return;
    const removable = selected.classList.contains('editor-decoration') || selected.classList.contains('hero-corner-rose') || confirm('Delete selected element?');
    if (!removable) return;
    pushHistory();
    const old = selected;
    selected = null;
    document.body.classList.remove('has-selection');
    if (document.body.classList.contains('clean-canvas')) document.body.classList.add('right-collapsed');
    old.remove();
    if (handlesBox) handlesBox.style.display = 'none';
    hydratePanel();
    buildLayers();
    fitZoomForDevice(true);
    markDirty('Deleted');
  }

  function duplicateSelected() {
    if (!selected) return;
    pushHistory();
    const copy = selected.cloneNode(true);
    copy.dataset.editorId = uid(selected.classList.contains('editor-decoration') ? 'rose' : 'copy');
    copy.style.left = (selected.offsetLeft + 28) + 'px';
    copy.style.top = (selected.offsetTop + 28) + 'px';
    selected.parentElement.appendChild(copy);
    selectElement(copy);
    saveStyleFor(copy, true);
    markDirty('Duplicated');
  }

  function resetSelected() { if (!selected) return; pushHistory(); managedStyles.forEach(name => selected.style.removeProperty(name)); saveStyleFor(selected, true); hydratePanel(); updateSelectionUI(); markDirty('Reset selected'); }

  function selectParent() {
    const parent = selected?.parentElement?.closest?.('[data-editor-id], section, footer, .footer-grid, .footer-col, .hero-content');
    if (parent) selectElement(parent);
  }

  function moveLayerUp() {
    if (!selected || !selected.parentElement || !selected.nextElementSibling) return;
    pushHistory();
    selected.parentElement.insertBefore(selected.nextElementSibling, selected);
    buildLayers();
    updateSelectionUI();
    markDirty('Layer moved up');
  }

  function moveLayerDown() {
    if (!selected || !selected.parentElement || !selected.previousElementSibling) return;
    pushHistory();
    selected.parentElement.insertBefore(selected, selected.previousElementSibling);
    buildLayers();
    updateSelectionUI();
    markDirty('Layer moved down');
  }

  function backgroundTargetSection(fallback) {
    return fallback?.closest?.('section, footer') || selected?.closest?.('section, footer') || (selected?.matches?.('section, footer') ? selected : null) || doc.querySelector('section.hero');
  }

  function setBackgroundImage(el, value) {
    if (!el) return;
    const src = String(value || '').trim();
    el.style.backgroundImage = src ? 'url("' + src.replace(/"/g, '\\"') + '")' : '';
    if (src) {
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundRepeat = 'no-repeat';
    }
  }

  function applyBackground(sectionOverride) {
    if (!doc) return;
    pushHistory();
    const section = backgroundTargetSection(sectionOverride);
    if (section) {
      section.style.backgroundColor = getValue('prop-section-bg') || '';
      setBackgroundImage(section, getValue('prop-section-bg-image'));
      saveStyleFor(section, true);
    }
    if (doc.body) {
      doc.body.style.backgroundColor = getValue('prop-page-bg') || '';
      setBackgroundImage(doc.body, getValue('prop-page-bg-image'));
      saveStyleFor(doc.body, false);
    }
    hydratePanel();
    markDirty('Background updated');
  }

  function clearBackground() {
    if (!doc) return;
    pushHistory();
    const section = backgroundTargetSection();
    [section, doc.body].filter(Boolean).forEach(el => {
      el.style.removeProperty('background-color');
      el.style.removeProperty('background-image');
      el.style.removeProperty('background-size');
      el.style.removeProperty('background-position');
      el.style.removeProperty('background-repeat');
      saveStyleFor(el, true);
    });
    hydratePanel();
    markDirty('Background cleared');
  }

  function bringForward() {
    if (!selected) return;
    pushHistory();
    ensureEditablePosition(selected);
    selected.style.zIndex = String(nextZIndexIn(selected.closest('section, footer') || selected.parentElement || doc.body));
    saveStyleFor(selected, true);
    hydratePanel();
    markDirty('Brought forward');
  }

  function sendBackward() {
    if (!selected) return;
    pushHistory();
    const z = parseInt(selected.style.zIndex || frame.contentWindow.getComputedStyle(selected).zIndex || '0', 10) || 0;
    selected.style.zIndex = String(Math.max(0, z - 1));
    saveStyleFor(selected, true);
    hydratePanel();
    markDirty('Sent backward');
  }

  function nextZIndexIn(scope) {
    const root = scope || doc.body;
    const values = Array.from(root.querySelectorAll('*')).map(el => {
      const z = frame.contentWindow.getComputedStyle(el).zIndex;
      return z === 'auto' ? 0 : parseInt(z, 10) || 0;
    });
    return Math.max(5, ...values) + 1;
  }

  function onCanvasContextMenu(e) {
    if (!editMode || assetMode) return;
    e.preventDefault();
    e.stopPropagation();
    const el = pickHeroTagAtPoint(e) || pickHeroDottedAccentAtPoint(e) || pickEditable(e.target);
    if (el) selectElement(el);
    showContextMenu(e.clientX, e.clientY, el || selected);
  }

  function showContextMenu(frameX, frameY, target) {
    if (!contextMenu || !target) return;
    const frameRect = frame.getBoundingClientRect();
    const pageX = frameRect.left + frameX;
    const pageY = frameRect.top + frameY;
    contextMenu.innerHTML = '';
    const addItem = (label, handler, enabled = true) => {
      if (!enabled) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.onclick = () => { hideContextMenu(); handler(); };
      contextMenu.appendChild(button);
    };
    const separator = () => {
      const div = document.createElement('div');
      div.className = 'separator';
      contextMenu.appendChild(div);
    };
    addItem('Edit Text', () => beginTextEdit(target), isTextElement(target));
    addItem('Replace Image', () => prop('upload-image')?.click(), !!selectedImage(target));
    separator();
    addItem('Duplicate', duplicateSelected);
    addItem(frame.contentWindow.getComputedStyle(target).display === 'none' ? 'Show' : 'Hide', hideSelected);
    addItem('Delete', deleteSelected);
    separator();
    addItem('Bring Forward', bringForward);
    addItem('Send Backward', sendBackward);
    addItem('Reset Style', resetSelected);
    separator();
    addItem('Add Text Here', () => addTextBlockAt(target, frameX, frameY));
    addItem('Add Box Here', () => addBoxBlockAt(target, frameX, frameY));
    addItem('Add Block Here', () => addContentBlockAt(target, frameX, frameY));
    addItem('Add Rose Here', () => insertAsset(assetConfig('rose'), target.closest('section, footer') || doc.body, localPointFor(target, frameX, frameY)));
    addItem('Upload Here', () => { setValue('upload-target', 'screen'); prop('upload-image')?.click(); });
    addItem('Use Upload as Section Background', () => { setValue('upload-target', 'section-bg'); prop('upload-image')?.click(); });
    addItem('Use Upload as Page Background', () => { setValue('upload-target', 'page-bg'); prop('upload-image')?.click(); });
    addItem('Copy Style', () => { copiedStyle = selected ? selected.getAttribute('style') || '' : ''; });
    addItem('Paste Style', () => { if (copiedStyle && selected) { pushHistory(); selected.setAttribute('style', copiedStyle); saveStyleFor(selected, true); hydratePanel(); markDirty('Style pasted'); } }, !!copiedStyle);
    addItem('Select Parent', () => { const parent = target.parentElement?.closest('[data-editor-id], section, footer, .footer-grid, .footer-col, .hero-content'); if (parent) selectElement(parent); }, !!target.parentElement);
    const maxX = window.innerWidth - 210;
    const maxY = window.innerHeight - 330;
    contextMenu.style.transform = 'translate(' + Math.max(8, Math.min(maxX, Math.round(pageX))) + 'px,' + Math.max(8, Math.min(maxY, Math.round(pageY))) + 'px)';
    contextMenu.classList.add('visible');
  }

  function hideContextMenu() { contextMenu?.classList.remove('visible'); }

  function localPointFor(target, frameX, frameY) {
    const parent = target.closest('section, footer') || doc.body;
    const rect = parent.getBoundingClientRect();
    return { x: frameX - rect.left + parent.scrollLeft, y: frameY - rect.top + parent.scrollTop };
  }

  function beginTextEdit(el, sourceEvent) {
    if (!el || !isTextElement(el)) return;
    hideContextMenu();
    if (textEditingEl && textEditingEl !== el) finishTextEdit();
    pushHistory();
    textEditingEl = el;
    selectElement(el);
    el.contentEditable = 'true';
    el.classList.add('jbc-text-editing');
    doc.body.classList.add('jbc-text-edit-mode');
    if (handlesBox) handlesBox.style.display = 'none';
    floatingToolbar?.classList.remove('visible');
    el.focus();
    placeCaret(el, sourceEvent);
    el.addEventListener('blur', finishTextEdit, { once: true });
  }

  function placeCaret(el, sourceEvent) {
    const selection = doc.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    let range = null;
    if (sourceEvent && doc.caretRangeFromPoint) range = doc.caretRangeFromPoint(sourceEvent.clientX, sourceEvent.clientY);
    if (!range && sourceEvent && doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(sourceEvent.clientX, sourceEvent.clientY);
      if (pos) { range = doc.createRange(); range.setStart(pos.offsetNode, pos.offset); }
    }
    if (!range || !el.contains(range.startContainer)) {
      range = doc.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    selection.addRange(range);
  }

  function finishTextEdit() {
    if (!textEditingEl) return;
    const el = textEditingEl;
    textEditingEl = null;
    el.removeAttribute('contenteditable');
    el.classList.remove('jbc-text-editing');
    doc?.body.classList.remove('jbc-text-edit-mode');
    if (selected === el) setValue('prop-text', el.innerHTML);
    saveTextFor(el);
    markDirty('Text edited');
    updateSelectionUI();
  }

  function saveTextFor(el) {
    selectorFor(el);
  }

  function onKeyDown(e) {
    const key = String(e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && key === 'z') { stopShortcut(e); if (e.shiftKey) redo(); else undo(); return; }
    if ((e.metaKey || e.ctrlKey) && key === 'y') { stopShortcut(e); redo(); return; }
    if ((e.metaKey || e.ctrlKey) && key === 's') { stopShortcut(e); saveAll(); return; }
    if ((e.metaKey || e.ctrlKey) && key === 'p') { stopShortcut(e); togglePreview(); return; }
    if ((e.metaKey || e.ctrlKey) && key === 'j') { stopShortcut(e); setDeviceMode(deviceMode === 'mobile' ? 'desktop' : 'mobile'); return; }
    if ((e.metaKey || e.ctrlKey) && ['+', '=', '-', '_', '0'].includes(key)) { stopShortcut(e); return; }
    const target = e.target;
    const inField = target?.matches?.('input, textarea, select') || target?.isContentEditable;
    if (inField) return;
    if (textEditingEl) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); textEditingEl.blur(); }
      return;
    }
    if (e.key === 'Escape') { hideContextMenu(); if (selected) { selected.removeAttribute('data-jbc-selected'); selected = null; document.body.classList.remove('has-selection', 'has-image', 'has-text', 'selected-decoration'); if (handlesBox) handlesBox.style.display = 'none'; hydratePanel(); buildLayers(); fitZoomForDevice(true); } return; }
    if ((e.metaKey || e.ctrlKey) && key === 'd') { stopShortcut(e); duplicateSelected(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); deleteSelected(); return; }
    if (e.shiftKey && e.key.toLowerCase() === 't') { e.preventDefault(); toggleCleanCanvas(); return; }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setLeftCollapsed(false); return; }
    if (!selected || selected.isContentEditable || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    pushHistory();
    ensureEditablePosition(selected);
    const step = e.shiftKey ? 10 : 1;
    const left = parseFloat(selected.style.left || '0') || 0;
    const top = parseFloat(selected.style.top || '0') || 0;
    if (e.key === 'ArrowLeft') selected.style.left = left - step + 'px';
    if (e.key === 'ArrowRight') selected.style.left = left + step + 'px';
    if (e.key === 'ArrowUp') selected.style.top = top - step + 'px';
    if (e.key === 'ArrowDown') selected.style.top = top + step + 'px';
    saveStyleFor(selected, false);
    hydratePanel();
    updateSelectionUI();
    markDirty('Nudged');
  }

  function onWheel(e) {
    if (!selected || !e.altKey || selected.isContentEditable) return;
    e.preventDefault();
    ensureEditablePosition(selected);
    const amount = Math.round(e.deltaY > 0 ? 4 : -4);
    const left = parseFloat(selected.style.left || '0') || 0;
    const top = parseFloat(selected.style.top || '0') || 0;
    const width = parseFloat(selected.style.width || selected.getBoundingClientRect().width) || 0;
    const height = parseFloat(selected.style.height || selected.getBoundingClientRect().height) || 0;
    if (e.metaKey) { selected.style.width = Math.max(24, width + amount) + 'px'; selected.style.height = Math.max(24, height + amount) + 'px'; }
    else if (e.shiftKey) selected.style.left = left + amount + 'px';
    else selected.style.top = top + amount + 'px';
    saveStyleFor(selected, false);
    hydratePanel();
    updateSelectionUI();
    markDirty('Fine adjusted');
  }

  function onFrameShortcutMessage(e) {
    if (e.source !== frame?.contentWindow || e.data?.type !== 'jbc-editor-shortcut') return;
    const key = String(e.data.key || '').toLowerCase();
    if (key === 'z') { if (e.data.shiftKey) redo(); else undo(); return; }
    if (key === 'y') { redo(); return; }
    if (key === 's') { saveAll(); return; }
    if (key === 'p') { togglePreview(); return; }
    if (key === 'j') { setDeviceMode(deviceMode === 'mobile' ? 'desktop' : 'mobile'); return; }
    if (key === 'd') duplicateSelected();
  }

  function applyPanelLayout() {
    const saved = JSON.parse(localStorage.getItem('jbc-editor-layout') || '{}');
    if (saved.leftWidth) document.documentElement.style.setProperty('--left-panel-width', saved.leftWidth + 'px');
    if (saved.rightWidth) document.documentElement.style.setProperty('--right-panel-width', saved.rightWidth + 'px');
    document.body.classList.toggle('clean-canvas', saved.cleanCanvas !== false);
    document.body.classList.toggle('left-collapsed', saved.leftCollapsed !== false);
    document.body.classList.toggle('right-collapsed', saved.rightCollapsed !== false);
    toggleClass('btn-clean-canvas', 'active', document.body.classList.contains('clean-canvas'));
    fitZoomForDevice(true);
  }

  function savePanelLayout() {
    const styles = getComputedStyle(document.documentElement);
    localStorage.setItem('jbc-editor-layout', JSON.stringify({
      leftWidth: parseInt(styles.getPropertyValue('--left-panel-width'), 10) || 196,
      rightWidth: parseInt(styles.getPropertyValue('--right-panel-width'), 10) || 256,
      cleanCanvas: document.body.classList.contains('clean-canvas'),
      leftCollapsed: document.body.classList.contains('left-collapsed'),
      rightCollapsed: document.body.classList.contains('right-collapsed')
    }));
  }

  function toggleCleanCanvas() {
    document.body.classList.toggle('clean-canvas');
    if (document.body.classList.contains('clean-canvas')) document.body.classList.add('left-collapsed');
    if (document.body.classList.contains('clean-canvas')) document.body.classList.add('right-collapsed');
    toggleClass('btn-clean-canvas', 'active', document.body.classList.contains('clean-canvas'));
    savePanelLayout();
    fitZoomForDevice(true);
    updateSelectionUI();
  }

  function setLeftCollapsed(collapsed) {
    document.body.classList.remove('clean-canvas');
    document.body.classList.toggle('left-collapsed', collapsed);
    savePanelLayout();
    fitZoomForDevice(true);
    updateSelectionUI();
  }

  function setRightCollapsed(collapsed) {
    document.body.classList.remove('clean-canvas');
    document.body.classList.toggle('right-collapsed', collapsed);
    savePanelLayout();
    fitZoomForDevice(true);
    updateSelectionUI();
  }

  function startPanelResize(e, side) {
    if (e.target.tagName === 'BUTTON') return;
    panelResize = { side, startX: e.clientX, startLeft: panelWidth('left'), startRight: panelWidth('right') };
    document.body.classList.add('resizing-panels');
    e.preventDefault();
  }

  function panelWidth(side) {
    const name = side === 'left' ? '--left-panel-width' : '--right-panel-width';
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue(name), 10) || (side === 'left' ? 196 : 256);
  }

  function onPanelResizeMove(e) {
    if (!panelResize) return;
    const dx = e.clientX - panelResize.startX;
    if (panelResize.side === 'left') {
      const width = Math.max(150, Math.min(360, panelResize.startLeft + dx));
      document.documentElement.style.setProperty('--left-panel-width', width + 'px');
      document.body.classList.remove('left-collapsed', 'clean-canvas');
    } else {
      const width = Math.max(190, Math.min(420, panelResize.startRight - dx));
      document.documentElement.style.setProperty('--right-panel-width', width + 'px');
      document.body.classList.remove('right-collapsed');
      document.body.classList.remove('clean-canvas');
    }
    scheduleFitZoom(true);
  }

  function endPanelResize() {
    if (!panelResize) return;
    panelResize = null;
    document.body.classList.remove('resizing-panels');
    savePanelLayout();
    scheduleFitZoom(true);
  }

  function togglePreview() {
    hideContextMenu();
    if (textEditingEl) finishTextEdit();
    editMode = !editMode;
    toggleClass('btn-preview', 'active', !editMode);
    doc?.body.classList.toggle('jbc-editor-selection-hidden', !editMode);
    if (selected) selected.toggleAttribute('data-jbc-selected', editMode);
    if (handlesBox) handlesBox.style.display = editMode ? 'block' : 'none';
    if (!editMode) contextMenu?.classList.remove('visible');
    updateFloatingToolbar();
  }

  function undo() {
    if (history.length < 2) return;
    future.push(history.pop());
    restoreSnapshot(history[history.length - 1], 'Undo');
  }
  function redo() {
    if (!future.length) return;
    const next = future.pop();
    history.push(next);
    restoreSnapshot(next, 'Redo');
  }
  function restoreSnapshot(snapshot, label) {
    selected = null;
    handlesBox = null;
    editorCss = snapshot.css;
    restoringSnapshot = true;
    frame.srcdoc = injectEditorRuntime(snapshot.html, snapshot.css);
    setStatus(label);
  }

  async function saveAll() {
    try {
      if (textEditingEl) finishTextEdit();
      const html = serializeHtml();
      await api('/api/save-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, css: editorCss }) });
      dirty = false;
      setStatus('Saved');
      pushHistory();
    } catch (err) { setStatus('Save failed: ' + err.message); }
  }

  init();
})();
