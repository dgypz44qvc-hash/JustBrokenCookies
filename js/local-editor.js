/* ============================================================
   JBC EDITOR — Full Audit v3
   Fixes: section handle viewport-clamped + setProperty !important,
          image placement uses document-space coords,
          inline image drag routed through capture overlay,
          + button (Add Text / Add Image / Set Background).
   ============================================================ */
(() => {

  /* ── ELEMENTS ─────────────────────────────────────────── */
  const frame        = document.getElementById('site-frame');
  const statusEl     = document.getElementById('status');
  const pageSelect   = document.getElementById('page-select');
  const btnLayers    = document.getElementById('btn-layers');
  const dropdown     = document.getElementById('layers-dropdown');
  const layerBadge   = document.getElementById('layer-badge');
  const badgeTxt     = document.getElementById('layer-badge-text');
  const btnExitLayer = document.getElementById('btn-exit-layer');
  const barText      = document.getElementById('bar-text');
  const btnTextDone  = document.getElementById('btn-text-done');
  const ctxMenu      = document.getElementById('ctx-menu');
  const uploadPanel  = document.getElementById('upload-panel');
  const dropZone     = document.getElementById('drop-zone');
  const fileInput    = document.getElementById('file-input');
  const btnCloseUp   = document.getElementById('btn-close-upload');
  const btnUndo      = document.getElementById('btn-undo');
  const btnRedo      = document.getElementById('btn-redo');
  const btnSave      = document.getElementById('btn-save');
  const canvasWrap   = document.getElementById('canvas-wrap');
  const vpToggle     = document.getElementById('vp-toggle');
  const btnPlus      = document.getElementById('btn-plus');
  const plusDropdown = document.getElementById('plus-dropdown');

  /* ── STATE ───────────────────────────────────────────── */
  let doc            = null;
  let win            = null;
  let layerMode      = 'none';
  let viewMode       = 'desktop';
  let pendingImage   = null;
  let pendingAddMode = null;   // 'layer' | 'bg' | 'text'
  let undoStack      = [];
  let redoStack      = [];
  let dirty          = false;
  let currentPage    = 'index.html';
  let dragGhost      = null;
  let dragCapture    = null;

  /* ── UTILS ───────────────────────────────────────────── */
  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  function snapshot() {
    if (!doc) return;
    undoStack.push(doc.documentElement.outerHTML);
    if (undoStack.length > 40) undoStack.shift();
    redoStack = [];
    dirty = true;
    setStatus('Unsaved changes');
  }

  function applyHTML(html) {
    if (!doc) return;
    doc.documentElement.innerHTML = html;
    injectAgent();
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(doc.documentElement.outerHTML);
    applyHTML(undoStack.pop());
    setStatus('Undone');
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(doc.documentElement.outerHTML);
    applyHTML(redoStack.pop());
    setStatus('Redone');
  }

  /* ── DRAG CAPTURE OVERLAY ────────────────────────────── */
  // Full-screen transparent div in the EDITOR that intercepts mouse events
  // during any iframe drag, so drags survive leaving the iframe boundary.
  function startDragCapture(cursor) {
    stopDragCapture();
    dragCapture = document.createElement('div');
    dragCapture.style.cssText =
      'position:fixed;inset:0;z-index:99990;cursor:' + (cursor || 'grabbing') + ';';
    document.body.appendChild(dragCapture);

    dragCapture.addEventListener('mousemove', e => {
      if (!win || !win.__jbc_forwardMouseMove) return;
      const fRect = frame.getBoundingClientRect();
      win.__jbc_forwardMouseMove(e.clientX - fRect.left, e.clientY - fRect.top);
    });

    dragCapture.addEventListener('mouseup', () => {
      if (win && win.__jbc_endDrag) win.__jbc_endDrag();
      stopDragCapture();
    });
  }

  function stopDragCapture() {
    if (dragCapture) { dragCapture.remove(); dragCapture = null; }
  }

  /* ── LOAD FRAME ──────────────────────────────────────── */
  function loadPage(page) {
    currentPage = page;
    stopDragCapture();
    setStatus('Loading…');
    frame.src = page + '?editor=1&t=' + Date.now();
  }

  frame.addEventListener('load', () => {
    try {
      doc = frame.contentDocument;
      win = frame.contentWindow;
      injectAgent();
      if (viewMode === 'mobile') applyMobileViewport(doc);
      setStatus('Ready');
    } catch (e) {
      setStatus('Error loading page');
      console.error(e);
    }
  });

  /* ── INJECT AGENT INTO IFRAME ────────────────────────── */
  function injectAgent() {
    if (!doc) return;

    const existing = doc.getElementById('__jbc_agent__');
    if (existing) existing.remove();

    let agentStyle = doc.getElementById('__jbc_agent_css__');
    if (!agentStyle) {
      agentStyle = doc.createElement('style');
      agentStyle.id = '__jbc_agent_css__';
      doc.head.appendChild(agentStyle);
    }
    agentStyle.textContent = `
      .__jbc_hover    { outline:2px solid rgba(232,137,29,0.6) !important; outline-offset:2px !important; cursor:pointer !important; }
      .__jbc_selected { outline:2px solid #E8891D !important; outline-offset:2px !important; }
      .__jbc_layer_hi { outline:3px solid #E8891D !important; outline-offset:3px !important; box-shadow:0 0 0 6px rgba(232,137,29,0.18) !important; transition:outline 0.15s; }
      [contenteditable="true"] { outline:2px dashed rgba(232,137,29,0.8) !important; outline-offset:2px !important; }
      /* Placed editor elements — prevent ANY page animation/CSS from hiding them.
         This style is injected directly into the iframe so it overrides page CSS. */
      .editor-decoration.editor-image,
      .editor-decoration.editor-textblock,
      [data-editor-placed="true"] {
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        pointer-events: auto !important;
      }
    `;

    const script = doc.createElement('script');
    script.id = '__jbc_agent__';
    script.textContent = agentScriptText();
    doc.body.appendChild(script);

    win.__jbc_setMode && win.__jbc_setMode(layerMode);
  }

  /* ══════════════════════════════════════════════════════
     AGENT SCRIPT — injected into and runs inside the iframe
     Uses var (not let/const) to avoid template-literal issues.
     ══════════════════════════════════════════════════════ */
  function agentScriptText() {
    return `
(function() {
  if (window.__jbc_agent_init) return;
  window.__jbc_agent_init = true;

  /* ── BLOCK ALL NAVIGATION — prevent clicking nav links from loading a
       different page into the iframe while currentPage stays unchanged,
       which would cause the wrong file to be overwritten on Save ── */
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    // Block any link that navigates to a different HTML page
    if (href && !href.startsWith('#') && !href.startsWith('javascript') &&
        !href.startsWith('mailto') && !href.startsWith('tel')) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ type: 'jbc_nav_blocked', href: href }, '*');
    }
  }, true);

  /* ── HELPERS ── */
  function scrollX() { return window.scrollX || window.pageXOffset || 0; }
  function scrollY() { return window.scrollY || window.pageYOffset || 0; }

  /* ── MODE / HOVER ── */
  var mode    = 'none';
  var hovered = null;
  var __jbc_layer_els = [];  // element refs captured on right-click

  var TEXT_SEL   = 'h1,h2,h3,h4,h5,h6,p,span,a,button,.btn,blockquote,cite,li,label,strong,em';
  var BGIMG_SEL  = 'section,div[class*="hero"],div[class*="floral"],div[class*="bg"],img,picture,.hero-full-bg';
  var SECBG_SEL  = 'section,[class*="section"],[id*="section"],#featured-work,#jbc-visual-gallery,.testimonial-section,.cta-section,footer';

  function selectorFor(el) {
    if (el.id) return '#' + el.id;
    if (el.dataset && el.dataset.editorId) return '[data-editor-id="' + el.dataset.editorId + '"]';
    return el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : '');
  }

  function unhover() {
    if (hovered) { hovered.classList.remove('__jbc_hover'); hovered = null; }
  }

  function getModeSelector() {
    if (mode === 'text')       return TEXT_SEL;
    if (mode === 'page-bg')    return BGIMG_SEL;
    if (mode === 'section-bg') return SECBG_SEL;
    return null;
  }

  document.addEventListener('mouseover', function(e) {
    if (mode === 'none') return;
    var sel = getModeSelector();
    if (!sel) return;
    var el = e.target.closest ? e.target.closest(sel) : null;
    if (el === hovered) return;
    unhover();
    if (el && el.id && el.id.indexOf('jbc_agent') >= 0) return;
    if (el) { hovered = el; hovered.classList.add('__jbc_hover'); }
  }, true);

  document.addEventListener('mouseout', function() {
    if (mode === 'none') return;
    unhover();
  }, true);

  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    e.stopPropagation();
    unhover();
    var frameRect = window.frameElement ? window.frameElement.getBoundingClientRect() : { left:0, top:0 };

    // Capture ALL layers at cursor — store element refs for reliable selection
    var layers = [];
    __jbc_layer_els = [];
    try {
      var els = document.elementsFromPoint(e.clientX, e.clientY) || [e.target];
      // Animation-only overlay classes that should not appear as editable layers
      var _skipCls = ['page-transition','cursor-dot','cursor-ring','jbc-cursor',
                      'scroll-progress','loading-screen','preloader','hero-bottom-transition'];
      els.slice(0, 8).forEach(function(el) {
        if (!el || el === document.documentElement || el === document.body) return;
        if (el.id && el.id.indexOf('__jbc') >= 0) return;
        var _cn = typeof el.className === 'string' ? el.className : '';
        if (_skipCls.some(function(c){ return _cn.indexOf(c) >= 0; })) return;
        // Skip empty fixed-position overlays (animation/transition layers with no content)
        var _cs2 = window.getComputedStyle(el);
        if (_cs2.position === 'fixed' && !el.innerText.trim() && !el.querySelector('img,video,canvas')) return;
        var cs = window.getComputedStyle(el);
        var bgImg = cs.backgroundImage || '';
        if (bgImg === 'none') bgImg = '';
        var idx = __jbc_layer_els.length;
        __jbc_layer_els.push(el);  // store ref — used by jbc_select_layer
        layers.push({
          tag:   el.tagName,
          id:    el.id || '',
          cls:   (typeof el.className === 'string' ? el.className : '').replace(/__jbc[\\w-]*/g,'').trim().slice(0,80),
          text:  (el.innerText || '').replace(/\\s+/g,' ').trim().slice(0,60),
          bg:    bgImg ? bgImg.slice(0,80) : '',
          src:   el.tagName === 'IMG' ? (el.src || '').split('/').pop().slice(0,40) : '',
          color: cs.color || '',
          font:  cs.fontSize + ' ' + cs.fontWeight,
          sel:   selectorFor(el),
          idx:   idx
        });
      });
    } catch(err) { layers = []; }

    window.parent.postMessage({
      type:     'jbc_contextmenu',
      x:        e.clientX + frameRect.left,
      y:        e.clientY + frameRect.top,
      selector: selectorFor(e.target),
      tagName:  e.target.tagName,
      text:     (e.target.innerText || '').slice(0, 80),
      layers:   layers
    }, '*');
    // Set ctx_el to the FIRST valid (non-overlay) layer rather than e.target,
    // because e.target is often the full-screen .page-transition overlay which
    // has no editable content. The first layer is already the correct element
    // synchronously — no need to wait for the async jbc_select_layer message.
    window.__jbc_ctx_el = __jbc_layer_els.length > 0 ? __jbc_layer_els[0] : e.target;
  }, true);

  document.addEventListener('click', function(e) {
    if (mode === 'none') return;
    e.preventDefault();
    e.stopPropagation();
    unhover();
    window.parent.postMessage({
      type:       'jbc_layerclick',
      mode:       mode,
      selector:   selectorFor(e.target),
      tagName:    e.target.tagName,
      text:       (e.target.innerText || '').slice(0, 80),
      currentSrc: e.target.tagName === 'IMG' ? e.target.src : '',
      bgImage:    getComputedStyle(e.target).backgroundImage || ''
    }, '*');
    window.__jbc_layer_el = e.target;
  }, true);

  window.__jbc_setMode = function(m) { mode = m; unhover(); };

  /* ── MOVE ── */
  var moveEl = null, moveReady = false;
  var moveStartMouseX = 0, moveStartMouseY = 0;
  var moveStartLeft = 0, moveStartTop = 0;

  document.addEventListener('mousemove', function(e) {
    if (!moveEl) return;
    e.preventDefault();
    _doMove(e.clientX, e.clientY);
  }, true);

  document.addEventListener('mouseup', function() {
    if (!moveEl) return;
    _endMove();
  }, true);

  function _doMove(ix, iy) {
    if (!moveReady) {
      moveStartMouseX = ix;
      moveStartMouseY = iy;
      moveReady = true;
    }
    moveEl.style.left = (moveStartLeft + ix - moveStartMouseX) + 'px';
    moveEl.style.top  = (moveStartTop  + iy - moveStartMouseY) + 'px';
  }

  function _endMove() {
    if (!moveEl) return;
    var el = moveEl;
    moveEl = null; moveReady = false;

    // Convert from fixed/viewport coords → position:absolute coords relative
    // to the nearest positioned ancestor so the element stays where dropped.
    var fixedRect = el.getBoundingClientRect();

    // Walk up the DOM tree (skipping the element itself) to find nearest
    // positioned ancestor — this will become the offsetParent after we switch
    // to position:absolute.
    var offsetEl = el.parentElement;
    while (offsetEl && offsetEl !== document.documentElement) {
      var pos = window.getComputedStyle(offsetEl).position;
      if (pos !== 'static') break;
      offsetEl = offsetEl.parentElement;
    }
    if (!offsetEl) offsetEl = document.body;

    // Ensure the ancestor is positioned so the element stays inside it
    if (window.getComputedStyle(offsetEl).position === 'static') {
      offsetEl.style.position = 'relative';
    }

    var offsetRect = offsetEl.getBoundingClientRect();
    // clientLeft/Top = border width; CSS left/top is measured from padding-box
    var absLeft = fixedRect.left - offsetRect.left - (offsetEl.clientLeft || 0) + offsetEl.scrollLeft;
    var absTop  = fixedRect.top  - offsetRect.top  - (offsetEl.clientTop  || 0) + offsetEl.scrollTop;

    el.style.position = 'absolute';
    el.style.left     = Math.round(absLeft) + 'px';
    el.style.top      = Math.round(absTop)  + 'px';
    // width/height were locked at drag start — preserve them for accurate placement
    el.classList.remove('__jbc_selected');
    window.parent.postMessage({ type: 'jbc_move_done' }, '*');
  }

  window.__jbc_startMove = function() {
    var el = window.__jbc_ctx_el;
    if (!el) return;

    // Capture the element's current visual rect BEFORE any style change
    var elRect = el.getBoundingClientRect();

    // Use position:fixed during drag so that:
    //  (a) the element doesn't "jump" when removed from its container flow
    //  (b) its visual size is locked (no more width:100% expanding to body-width)
    //  (c) coordinates are purely in viewport space — no offsetParent ambiguity
    el.style.position = 'fixed';
    el.style.left     = elRect.left + 'px';
    el.style.top      = elRect.top  + 'px';
    el.style.width    = elRect.width  + 'px';
    el.style.height   = elRect.height + 'px';
    el.style.margin   = '0';
    el.style.zIndex   = '9999';
    el.classList.add('__jbc_selected');

    // _doMove tracks mouse delta from first-move; start anchored at current pos
    moveStartLeft  = elRect.left;
    moveStartTop   = elRect.top;
    moveReady      = false;
    moveEl         = el;

    window.parent.postMessage({ type: 'jbc_drag_start', cursor: 'grabbing' }, '*');
  };

  /* ── TEXT EDIT ── */
  window.__jbc_startTextEdit = function(selector) {
    var el = selector ? document.querySelector(selector) : window.__jbc_ctx_el;
    if (!el) return;
    el.contentEditable = 'true';
    el.focus();
    window.__jbc_text_el = el;
  };

  window.__jbc_stopTextEdit = function() {
    if (window.__jbc_text_el) {
      window.__jbc_text_el.contentEditable = 'false';
      window.__jbc_text_el = null;
    }
  };

  window.__jbc_execText    = function(cmd, val) { document.execCommand(cmd, false, val || null); };
  window.__jbc_setFontSize = function(size)     { if (window.__jbc_text_el) window.__jbc_text_el.style.fontSize = size + 'px'; };
  window.__jbc_setColor    = function(color)    { document.execCommand('foreColor', false, color); };

  /* ── DELETE / DUPLICATE ── */
  window.__jbc_deleteEl = function() {
    var el = window.__jbc_ctx_el;
    if (el) { el.remove(); window.__jbc_ctx_el = null; }
  };

  window.__jbc_duplicateEl = function() {
    var el = window.__jbc_ctx_el;
    if (!el) return;
    var clone = el.cloneNode(true);
    clone.removeAttribute('id');
    el.parentNode.insertBefore(clone, el.nextSibling);
    // Only offset position for absolutely-placed editor decorations;
    // don't disturb normal-flow or section-level elements.
    var pos = window.getComputedStyle(clone).position;
    if (pos === 'absolute' || pos === 'fixed') {
      var curL = parseInt(clone.style.left) || 0;
      var curT = parseInt(clone.style.top)  || 0;
      clone.style.left = (curL + 20) + 'px';
      clone.style.top  = (curT + 20) + 'px';
    }
    window.__jbc_ctx_el = clone;   // select the clone so next action targets it
  };

  /* ── INSERT IMAGE (top layer) ── */
  // Shared drag state — one pair of document listeners handles ALL editor images
  var _inlineDragEl = null, _inlineDragOX = 0, _inlineDragOY = 0;

  // Register drag listeners ONCE, not once-per-image
  document.addEventListener('mousemove', function(e) {
    if (!_inlineDragEl) return;
    _inlineDragEl.style.left = Math.round(e.clientX - _inlineDragOX + scrollX()) + 'px';
    _inlineDragEl.style.top  = Math.round(e.clientY - _inlineDragOY + scrollY()) + 'px';
  });
  document.addEventListener('mouseup', function() {
    if (!_inlineDragEl) return;
    _inlineDragEl.style.cursor = 'grab';
    _inlineDragEl = null;
    window.parent.postMessage({ type: 'jbc_move_done' }, '*');
  });

  window.__jbc_insertImage = function(dataUrl, x, y) {
    var parent = document.body;
    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    /* ── Helper: replace img src, clear srcset/sources, return the img ── */
    function _replaceImgSrc(imgEl) {
      imgEl.src = dataUrl;
      imgEl.removeAttribute('srcset');
      imgEl.removeAttribute('sizes');
      var pic = imgEl.closest ? imgEl.closest('picture') : null;
      if (pic) pic.querySelectorAll('source').forEach(function(s) {
        s.srcset = ''; s.removeAttribute('srcset');
      });
      window.parent.postMessage({ type: 'jbc_image_placed' }, '*');
      return imgEl;  // always return so caller can upgrade src when upload resolves
    }

    /* ── Priority 1: existing editor-image wrapper ── */
    var hit = document.elementFromPoint(x, y);
    if (hit) {
      var hitWrap = hit.closest ? hit.closest('.editor-decoration.editor-image') : null;
      if (hitWrap) {
        var hitImg = hitWrap.querySelector('img');
        if (hitImg) return _replaceImgSrc(hitImg);
      }
    }

    /* ── Priority 2: bounding-box scan of existing editor images ── */
    var allImgWraps = document.querySelectorAll('.editor-decoration.editor-image');
    for (var i = 0; i < allImgWraps.length; i++) {
      var r = allImgWraps[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        var eImg = allImgWraps[i].querySelector('img');
        if (eImg) return _replaceImgSrc(eImg);
      }
    }

    /* ── Priority 3 (REMOVED) ──────────────────────────────────────────────────
       Previously used elementsFromPoint to catch native <img> tags (hero-full-bg,
       carousel card imgs, etc.) and replace them. This was too greedy for the
       "Add Image" flow — it silently replaced existing page images instead of
       creating a new floating layer. Native img replacement is handled by the
       right-click → Replace Image handler which has its own targeted logic.
    ── */

    /* ── Priority 4: no target found — create new floating image layer ── */
    var docX = Math.round(x + scrollX());
    var docY = Math.round(y + scrollY());

    var div = document.createElement('div');
    div.className = 'editor-decoration editor-image';
    div.dataset.editorId = 'img-' + Date.now();
    div.dataset.editorPlaced = 'true';  // marker so CSS can always force-show it
    // z-index 9000 keeps it above page stacking contexts; opacity/visibility forced by injected CSS
    div.style.cssText = 'position:absolute;left:' + docX + 'px;top:' + docY + 'px;width:280px;height:auto;z-index:9000;cursor:grab;opacity:1;visibility:visible;';

    var img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'display:block;width:100%;height:auto;border-radius:4px;pointer-events:none;';
    div.appendChild(img);
    parent.appendChild(div);

    // ── Placed-image drag via Pointer Capture ─────────────────────────────────
    // Pointer capture keeps all drag events inside the iframe without needing
    // the parent dragCapture overlay.  We intentionally skip e.button !== 0 so
    // right-clicks are never preventDefault-ed — that would suppress the
    // contextmenu event and show the browser native menu instead of ours.
    var _placedOX = 0, _placedOY = 0, _placedActive = false;

    div.addEventListener('pointerdown', function(e) {
      if (e.button !== 0) return;           // right/middle — let contextmenu fire
      e.preventDefault();
      e.stopPropagation();
      div.setPointerCapture(e.pointerId);   // capture keeps events on this div
      var r = div.getBoundingClientRect();
      _placedOX = e.clientX - r.left;
      _placedOY = e.clientY - r.top;
      _placedActive = true;
      div.style.cursor = 'grabbing';
    });

    div.addEventListener('pointermove', function(e) {
      if (!_placedActive) return;
      e.preventDefault();
      div.style.left = Math.round(e.clientX - _placedOX + scrollX()) + 'px';
      div.style.top  = Math.round(e.clientY - _placedOY + scrollY()) + 'px';
    });

    div.addEventListener('pointerup', function(e) {
      if (!_placedActive) return;
      _placedActive = false;
      div.releasePointerCapture(e.pointerId);
      div.style.cursor = 'grab';
      window.parent.postMessage({ type: 'jbc_move_done' }, '*');
    });

    // Prevent click from bubbling to page handlers — but don't stopImmediatePropagation
    // so the editor's own delegated click handlers can still run if needed.
    div.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    window.parent.postMessage({ type: 'jbc_image_placed' }, '*');
    return img; // return reference so parent can upgrade src when server upload resolves
  };

  /* ── INSERT TEXT (top layer) ── */
  window.__jbc_insertText = function(x, y) {
    var parent = document.body;
    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    var docX = Math.round(x + scrollX());
    var docY = Math.round(y + scrollY());

    var div = document.createElement('div');
    div.className = 'editor-decoration editor-textblock';
    div.dataset.editorId = 'text-' + Date.now();
    div.style.cssText = [
      'position:absolute',
      'left:' + docX + 'px',
      'top:' + docY + 'px',
      'min-width:160px',
      'min-height:44px',
      'max-width:600px',
      'z-index:200',
      'cursor:text',
      'padding:10px 14px',
      'background:rgba(0,0,0,0.5)',
      'border-radius:4px',
      'color:#f0e6da',
      'font-family:inherit',
      'font-size:18px',
      'line-height:1.5'
    ].join(';');
    div.contentEditable = 'true';
    div.textContent = 'Type here';
    parent.appendChild(div);

    // Select all placeholder text for immediate typing
    setTimeout(function() {
      try {
        div.focus();
        var range = document.createRange();
        range.selectNodeContents(div);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch(err) {}
    }, 20);

    window.__jbc_ctx_el  = div;
    window.__jbc_text_el = div;
    window.parent.postMessage({ type: 'jbc_text_placed' }, '*');
  };

  /* ── CORNER RESIZE HANDLES ── */
  var _rEl = null, _rOvl = null, _rDir = null;
  var _rSX = 0, _rSW = 0, _rSH = 0, _rSL = 0, _rAR = 1;

  function _rPos() {
    if (!_rOvl || !_rEl) return;
    var r = _rEl.getBoundingClientRect();
    _rOvl.style.left   = r.left   + 'px';
    _rOvl.style.top    = r.top    + 'px';
    _rOvl.style.width  = r.width  + 'px';
    _rOvl.style.height = r.height + 'px';
  }

  function _rClean() {
    if (_rOvl) { _rOvl.remove(); _rOvl = null; }
    document.removeEventListener('mousemove', _rMove, true);
    document.removeEventListener('mouseup',   _rUp,   true);
    document.removeEventListener('scroll',    _rPos,  true);
    _rEl = null; _rDir = null;
  }

  function _rApply(clientX) {
    if (!_rDir || !_rEl) return;
    var dx   = clientX - _rSX;
    var newW = (_rDir === 'se' || _rDir === 'ne') ? Math.max(40, _rSW + dx) : Math.max(40, _rSW - dx);
    var newH = newW / _rAR;
    var target = _rEl.closest('.editor-decoration.editor-image') || _rEl;
    // Use setProperty with !important so resize overrides any stylesheet rules
    target.style.setProperty('width',  newW + 'px', 'important');
    target.style.setProperty('height', newH + 'px', 'important');
    var pos = window.getComputedStyle(target).position;
    if ((_rDir === 'nw' || _rDir === 'sw') && (pos === 'absolute' || pos === 'fixed')) {
      target.style.setProperty('left', (_rSL + (_rSW - newW)) + 'px', 'important');
    }
    _rPos();
  }

  function _rMove(ev) { if (_rDir) { ev.preventDefault(); _rApply(ev.clientX); } }
  function _rUp()     { if (_rDir) { _rDir = null; window.parent.postMessage({ type: 'jbc_resize_done' }, '*'); } }

  window.__jbc_showResizeHandles = function() {
    var el = window.__jbc_ctx_el;
    if (!el) return;
    _rClean();

    var target = el.closest('.editor-decoration.editor-image') || el;
    _rEl = target;
    var img = (target.tagName === 'IMG') ? target : target.querySelector('img');
    _rAR = (img && img.naturalWidth && img.naturalHeight)
           ? img.naturalWidth  / img.naturalHeight
           : (target.offsetWidth / (target.offsetHeight || 1));
    _rSL = parseInt(target.style.left) || 0;

    _rOvl = document.createElement('div');
    _rOvl.id = '__jbc_resize_ovl';
    _rOvl.style.cssText = 'position:fixed;outline:2px solid #E8891D;outline-offset:1px;z-index:99998;pointer-events:none;box-sizing:border-box;';
    _rPos();

    var DIRS    = ['nw','ne','sw','se'];
    var CURSORS = { nw:'nw-resize', ne:'ne-resize', sw:'sw-resize', se:'se-resize' };
    DIRS.forEach(function(d) {
      var h = document.createElement('div');
      h.style.cssText = 'position:absolute;width:12px;height:12px;background:#E8891D;border:2px solid #fff;border-radius:2px;pointer-events:all;box-sizing:border-box;cursor:' + CURSORS[d] + ';z-index:99999;';
      if (d[0] === 'n') h.style.top    = '-6px'; else h.style.bottom = '-6px';
      if (d[1] === 'w') h.style.left   = '-6px'; else h.style.right  = '-6px';
      h.addEventListener('mousedown', function(ev) {
        ev.stopPropagation(); ev.preventDefault();
        _rDir = d;
        _rSX  = ev.clientX;
        var r = _rEl.getBoundingClientRect();
        _rSW  = r.width; _rSH = r.height;
        _rSL  = parseInt(_rEl.style.left) || 0;
        window.parent.postMessage({ type: 'jbc_drag_start', cursor: CURSORS[d] }, '*');
      });
      _rOvl.appendChild(h);
    });

    document.body.appendChild(_rOvl);
    document.addEventListener('mousemove', _rMove, true);
    document.addEventListener('mouseup',   _rUp,   true);
    document.addEventListener('scroll',    _rPos,  true);
  };

  /* ── SECTION HEIGHT HANDLE ── */
  var _secEl = null, _secHandle = null;
  var _secDragging = false, _secStartY = 0, _secStartH = 0;

  function _secPos() {
    if (!_secEl || !_secHandle) return;
    var r  = _secEl.getBoundingClientRect();
    var hy = Math.min(window.innerHeight - 26, Math.max(40, r.bottom - 11));
    _secHandle.style.left  = (r.left + r.width * 0.25) + 'px';
    _secHandle.style.top   = hy + 'px';
    _secHandle.style.width = (r.width * 0.5) + 'px';
  }

  function _secApply(iy) {
    if (!_secDragging || !_secEl) return;
    var newH = Math.max(80, _secStartH + (iy - _secStartY));
    // Use setProperty + !important to win over any stylesheet rules
    _secEl.style.setProperty('min-height', newH + 'px', 'important');
    _secEl.style.setProperty('height',     'auto',       'important');
    _secPos();
  }

  function _secDragMove(ev) { if (_secDragging) { ev.preventDefault(); _secApply(ev.clientY); } }
  function _secDragUp()     { if (_secDragging) { _secDragging = false; window.parent.postMessage({ type: 'jbc_resize_done' }, '*'); } }

  function _secClean() {
    _secDragging = false;
    if (_secHandle) { _secHandle.remove(); _secHandle = null; }
    document.removeEventListener('mousemove', _secDragMove, true);
    document.removeEventListener('mouseup',   _secDragUp,   true);
    document.removeEventListener('scroll',    _secPos,      true);
    _secEl = null;
  }

  window.__jbc_showSectionHandle = function() {
    var el = window.__jbc_ctx_el;
    if (!el) return;
    _secClean();

    // Walk up to find a real section-level container
    var STOP_TAGS = ['SECTION', 'HEADER', 'FOOTER', 'MAIN'];
    var sec = el;
    while (sec && sec !== document.body) {
      var t = (sec.tagName || '').toUpperCase();
      if (STOP_TAGS.indexOf(t) >= 0) break;
      if (sec.id === 'featured-work' || sec.id === 'jbc-visual-gallery') break;
      var cls = sec.className || '';
      if (cls.indexOf('testimonial') >= 0 || cls.indexOf('cta-section') >= 0) break;
      sec = sec.parentElement;
    }
    if (!sec || sec === document.body || sec === document.documentElement) {
      sec = el.closest('section, footer, header, main') || el;
    }
    _secEl = sec;

    _secHandle = document.createElement('div');
    _secHandle.id = '__jbc_sec_handle';
    _secHandle.innerHTML =
      '<span style="pointer-events:none;color:#fff;font-size:9px;letter-spacing:1.5px;user-select:none;white-space:nowrap;">&#x21D5; resize section &#x21D5;</span>';
    _secHandle.style.cssText = [
      'position:fixed',
      'height:22px',
      'min-width:120px',
      'padding:0 12px',
      'background:rgba(232,137,29,0.95)',
      'cursor:ns-resize',
      'z-index:99999',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'border-radius:11px',
      'box-shadow:0 2px 12px rgba(0,0,0,0.6)',
      'box-sizing:border-box'
    ].join(';');

    document.body.appendChild(_secHandle);
    _secPos();  // position before making visible

    _secHandle.addEventListener('mousedown', function(ev) {
      ev.stopPropagation(); ev.preventDefault();
      _secDragging = true;
      _secStartY   = ev.clientY;
      _secStartH   = _secEl.getBoundingClientRect().height;
      window.parent.postMessage({ type: 'jbc_drag_start', cursor: 'ns-resize' }, '*');
    });

    document.addEventListener('mousemove', _secDragMove, true);
    document.addEventListener('mouseup',   _secDragUp,   true);
    document.addEventListener('scroll',    _secPos,      true);

    // Re-position after layout stabilises
    setTimeout(_secPos, 50);
    setTimeout(_secPos, 300);
  };

  /* ── FORWARDED EVENTS from parent drag-capture overlay ── */
  window.__jbc_forwardMouseMove = function(ix, iy) {
    if (moveEl)       _doMove(ix, iy);
    if (_rDir)        _rApply(ix);
    if (_secDragging) _secApply(iy);
    if (_inlineDragEl) {
      _inlineDragEl.style.left = Math.round(ix - _inlineDragOX + scrollX()) + 'px';
      _inlineDragEl.style.top  = Math.round(iy - _inlineDragOY + scrollY()) + 'px';
    }
  };

  window.__jbc_endDrag = function() {
    _endMove();
    if (_rDir)        { _rDir = null;        window.parent.postMessage({ type: 'jbc_resize_done' }, '*'); }
    if (_secDragging) { _secDragging = false; window.parent.postMessage({ type: 'jbc_resize_done' }, '*'); }
    if (_inlineDragEl){ _inlineDragEl.style.cursor = 'grab'; _inlineDragEl = null; window.parent.postMessage({ type: 'jbc_move_done' }, '*'); }
    _rPos();
    _secPos();
  };

  /* ── CLEAR ALL HANDLES ── */
  window.__jbc_clearHandles = function() {
    _rClean();
    _secClean();
  };

  /* ── LAYER ACTIVATE (from parent selecting a layer in the panel) ── */
  window.addEventListener('message', function(ev) {
    if (!ev.data) return;
    if (ev.data.type === 'jbc_select_layer') {
      // Remove previous highlight
      var prev = document.querySelector('.__jbc_layer_hi');
      if (prev) prev.classList.remove('__jbc_layer_hi');
      // Use stored element ref by index — reliable, avoids querySelector ambiguity
      var el = (ev.data.idx !== undefined && __jbc_layer_els[ev.data.idx])
             ? __jbc_layer_els[ev.data.idx]
             : (ev.data.sel ? document.querySelector(ev.data.sel) : null);
      if (el) {
        el.classList.add('__jbc_layer_hi');
        window.__jbc_ctx_el = el;  // make this the active target for all actions
        // No scrollIntoView — user right-clicked here, no need to move the page
      }
    }
    if (ev.data.type === 'jbc_clear_layer') {
      var prev2 = document.querySelector('.__jbc_layer_hi');
      if (prev2) prev2.classList.remove('__jbc_layer_hi');
    }
  });

})();
    `;
  }

  /* ── MESSAGES FROM IFRAME ────────────────────────────── */
  window.addEventListener('message', e => {
    if (!e.data || !e.data.type) return;
    const { type } = e.data;

    if (type === 'jbc_contextmenu') {
      if (win && win.__jbc_clearHandles) win.__jbc_clearHandles();
      showCtxMenu(e.data.x, e.data.y);
      // Populate layers panel
      if (e.data.layers && e.data.layers.length) {
        showLayersPanel(e.data.layers, e.data.x, e.data.y);
        fetchAiSuggestions(e.data.layers, e.data.x, e.data.y);
      }
    }

    if (type === 'jbc_layerclick') {
      handleLayerClick(e.data);
    }

    if (type === 'jbc_drag_start')  { startDragCapture(e.data.cursor || 'grabbing'); }
    // snapshot() is taken BEFORE move/resize starts (in handleCtxAction), so on
    // completion we only need to stop the drag cursor — no second snapshot needed.
    if (type === 'jbc_move_done')   { stopDragCapture(); dirty = true; }
    if (type === 'jbc_resize_done') { stopDragCapture(); dirty = true; }

    if (type === 'jbc_image_placed') {
      snapshot();
      setStatus('Image placed — right-click to resize, move or delete · Save when done');
    }

    if (type === 'jbc_text_placed') {
      snapshot();
      barText.classList.remove('hidden');
      setStatus('Text placed — format it above, then click Done');
    }

    // Nav links are blocked inside the editor to prevent page switching
    // without currentPage updating, which would overwrite the wrong file on Save
    if (type === 'jbc_nav_blocked') {
      setStatus('⚠ Navigation blocked — use the page selector above to switch pages');
    }
  });

  /* ── LAYER MODE ──────────────────────────────────────── */
  btnLayers.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    btnLayers.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    dropdown.classList.add('hidden');
    btnLayers.classList.remove('active');
    if (plusDropdown) plusDropdown.classList.add('hidden');
  });

  dropdown.querySelectorAll('.layer-opt').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setLayerMode(btn.dataset.layer);
      dropdown.classList.add('hidden');
      btnLayers.classList.remove('active');
    });
  });

  btnExitLayer.addEventListener('click', () => setLayerMode('none'));

  const LAYER_LABELS = {
    'page-bg':    'A — Page Background: click any background element',
    'text':       'B — Text Mode: click any text to edit it',
    'section-bg': 'C — Section Background: click any section to edit its background',
    'none': ''
  };

  function setLayerMode(mode) {
    layerMode = mode;
    layerBadge.classList.toggle('hidden', mode === 'none');
    if (mode !== 'none') badgeTxt.textContent = LAYER_LABELS[mode] || mode;
    dropdown.querySelectorAll('.layer-opt').forEach(b => b.classList.toggle('active', b.dataset.layer === mode));
    if (win && win.__jbc_setMode) win.__jbc_setMode(mode);
    btnLayers.classList.toggle('active', mode !== 'none');
    if (mode !== 'text') stopTextEdit();
  }

  function handleLayerClick(data) {
    if (layerMode === 'text') {
      if (!win) return;
      win.__jbc_startTextEdit(data.selector);
      barText.classList.remove('hidden');
      setStatus('Editing text — click Done when finished');
    } else if (layerMode === 'page-bg' || layerMode === 'section-bg') {
      setStatus('Selected: ' + data.selector);
    }
  }

  /* ── TEXT EDITING ────────────────────────────────────── */
  btnTextDone.addEventListener('click', stopTextEdit);

  function stopTextEdit() {
    if (win && win.__jbc_stopTextEdit) win.__jbc_stopTextEdit();
    barText.classList.add('hidden');
    snapshot();
    setStatus('Text edit done — click Save to keep');
  }

  barText.querySelectorAll('.fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => { if (win) win.__jbc_execText(btn.dataset.cmd); });
  });

  document.getElementById('txt-font-size').addEventListener('change', e => {
    if (!win || !e.target.value || e.target.value === '—') return;
    win.__jbc_setFontSize(e.target.value);
  });

  document.getElementById('txt-color').addEventListener('input', e => {
    if (win) win.__jbc_setColor(e.target.value);
  });

  /* ── CONTEXT MENU ────────────────────────────────────── */
  function resetCtxActions() {
    // Default: show ALL action buttons so nothing feels "removed".
    // updateCtxActionsForLayer() will fine-tune once a layer is selected.
    ctxMenu.querySelectorAll('.ctx-item--replace').forEach(btn => { btn.style.display = ''; });
    ctxMenu.querySelectorAll('.ctx-item--resize').forEach(btn => { btn.style.display = ''; });
    const removeBgBtn = ctxMenu.querySelector('[data-action="remove-bg"]');
    if (removeBgBtn) removeBgBtn.style.display = '';
  }



  function humanizeAiEditorAnswer(text) {
    if (!text) return '';

    let cleaned = String(text);

    // Remove fenced code blocks completely from user-facing Analyze/Propose.
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

    // Remove old diagnostic headings if Qwen ignores the prompt.
    cleaned = cleaned
      .replace(/^\s*-\s*\*\*?Finding:\*\*?\s*/gmi, 'What I found: ')
      .replace(/^\s*-\s*Finding:\s*/gmi, 'What I found: ')
      .replace(/^\s*-\s*\*\*?Exact selector\/file:\*\*?.*$/gmi, '')
      .replace(/^\s*-\s*Exact selector\/file:.*$/gmi, '')
      .replace(/^\s*-\s*\*\*?If code is needed:\*\*?.*$/gmi, '')
      .replace(/^\s*-\s*If code is needed:.*$/gmi, '')
      .replace(/^\s*-\s*\*\*?Safe next step:\*\*?\s*/gmi, 'Safest next step: ')
      .replace(/^\s*-\s*Safe next step:\s*/gmi, 'Safest next step: ');

    // Remove leftover empty bullet noise.
    cleaned = cleaned
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleaned || 'The AI returned no usable plain-language answer.';
  }


  function stabilizeCtxMenu() {
    if (!ctxMenu) return;

    ctxMenu.style.maxWidth = 'min(360px, calc(100vw - 28px))';
    ctxMenu.style.maxHeight = 'min(78vh, 680px)';
    ctxMenu.style.overflow = 'hidden';

    let closeBtn = ctxMenu.querySelector('.ctx-close-btn');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.className = 'ctx-close-btn';
      closeBtn.type = 'button';
      closeBtn.title = 'Close panel';
      closeBtn.textContent = '×';
      ctxMenu.insertBefore(closeBtn, ctxMenu.firstChild);
    }

    if (!closeBtn.dataset.bound) {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
      }, true);
      closeBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        hideCtxMenu();
      }, true);
    }

    let dragHandle = ctxMenu.querySelector('.ctx-drag-handle');
    if (dragHandle && dragHandle.parentElement !== ctxMenu) {
      ctxMenu.insertBefore(dragHandle, closeBtn.nextSibling);
    }

    let scrollWrap = ctxMenu.querySelector(':scope > .ctx-menu-scroll');
    if (!scrollWrap) {
      scrollWrap = document.createElement('div');
      scrollWrap.className = 'ctx-menu-scroll';

      Array.from(ctxMenu.childNodes).forEach(node => {
        if (
          node === closeBtn ||
          node === dragHandle ||
          (node.nodeType === 1 && node.classList && (
            node.classList.contains('ctx-close-btn') ||
            node.classList.contains('ctx-drag-handle') ||
            node.classList.contains('ctx-menu-scroll')
          ))
        ) return;

        scrollWrap.appendChild(node);
      });

      ctxMenu.appendChild(scrollWrap);
    }

    scrollWrap.addEventListener('wheel', e => {
      e.stopPropagation();
    }, { passive: true });

    const rect = ctxMenu.getBoundingClientRect();
    const safeLeft = Math.max(8, Math.min(window.innerWidth - rect.width - 8, rect.left));
    const safeTop = Math.max(8, Math.min(window.innerHeight - rect.height - 8, rect.top));

    ctxMenu.style.left = `${safeLeft}px`;
    ctxMenu.style.top = `${safeTop}px`;
  }


  function showCtxMenu(x, y) {
    hideCtxMenu();
    lastCtxPoint = { x, y };
    ctxMenu.style.left = Math.min(x, window.innerWidth  - 250) + 'px';
    ctxMenu.style.top  = Math.min(y, window.innerHeight - 420) + 'px';
    ctxMenu.classList.remove('hidden');
    // Reset layers section
    const layersSection = ctxMenu.querySelector('.ctx-layers-section');
    if (layersSection) layersSection.innerHTML = '';
    // Reset AI section
    const aiSection = ctxMenu.querySelector('.ctx-ai-section');
    if (aiSection) {
      aiSection.innerHTML = '<div class="ctx-ai-thinking">✦ AI reading context…</div>';
    }
    // Reset action visibility to a safe default state
    resetCtxActions();
    // Hide overlay controls until layer scan confirms an image container is present
    if (ctxOverlaySection) ctxOverlaySection.classList.add('hidden');
    if (ctxDivOverlay)     ctxDivOverlay.classList.add('hidden');
    overlayTargetSel   = null;
    overlayTargetLabel = '';
    overlayTargetType  = 'image';
    // Ensure buttons are in a scrollable container so none get clipped
    stabilizeCtxMenu();
  }

  /* ── LAYERS PANEL ────────────────────────────────────── */
  let activeLayerSel = null;
  let activeLayerObj = null;
  let lastCtxLayers = [];
  let lastCtxPoint = { x: 0, y: 0 };
  let suppressNextCtxHide = false;

  /* ── IMAGE OVERLAY OPACITY CONTROL ──────────────────── */
  // These class names all have ::before / ::after gradient overlays in style.css
  const OVERLAY_TARGETS = [
    { cls: 'service-detail-image', label: 'Image overlay'  },
    { cls: 'about-image',          label: 'Image overlay'  },
    { cls: 'portfolio-item',       label: 'Image overlay'  },
    { cls: 'blog-card-image',      label: 'Image overlay'  },
    { cls: 'blog-card',            label: 'Image overlay'  },
    { cls: 'team-card',            label: 'Image overlay'  },
    { cls: 'jbc-gs-card',          label: 'Image overlay'  },
    { cls: 'jbc-visual-card',      label: 'Image overlay'  },
    { cls: 'jbc-gallery-item',     label: 'Image overlay'  },
    { cls: 'jbc-cinema-panel',     label: 'Image overlay'  },
  ];
  let overlayTargetSel   = null;   // e.g. '.service-detail-image' or '#services-hero'
  let overlayTargetLabel = '';     // e.g. 'Service images'
  let overlayTargetType  = 'image'; // 'image' (::before/::after opacity) | 'section-bg' (blend-mode)

  // Map parent wrapper classes → the child image-overlay class they contain
  const OVERLAY_PARENT_MAP = {
    'service-detail':            'service-detail-image',
    'jbc-floral-service-detail': 'service-detail-image',
  };

  // Floral rose ::before backgrounds — each numbered section gets its own selector
  const FLORAL_BG_SECTIONS = [
    'jbc-floral-service-detail-1',
    'jbc-floral-service-detail-2',
    'jbc-floral-service-detail-3',
    'jbc-floral-service-detail-4',
  ];
  const ctxOverlaySection = document.getElementById('ctx-overlay-section');
  const ctxDivOverlay     = document.getElementById('ctx-div-overlay');
  const ctxOverlayLabel   = document.getElementById('ctx-overlay-label');

  /** Scan layers to see if an image container or section background with a known overlay
   *  is at the cursor.  Shows / hides the overlay controls accordingly.
   *
   *  Detection priority:
   *   1. Direct match  — layer IS an image container with ::before/::after overlay (OVERLAY_TARGETS)
   *   2. Parent match  — layer WRAPS an image container (OVERLAY_PARENT_MAP)
   *   3. Section bg    — layer has a background-image (layer.bg non-empty) → blend-mode approach
   */
  function detectAndShowOverlay(layers) {
    overlayTargetSel   = null;
    overlayTargetLabel = '';
    overlayTargetType  = 'image';
    if (ctxOverlaySection) ctxOverlaySection.classList.add('hidden');
    if (ctxDivOverlay)     ctxDivOverlay.classList.add('hidden');

    // We scan every layer from top (innermost) to bottom (outermost).
    // The FIRST match wins — prefer the most specific (innermost) element.
    // However we want to also catch section-bgs even when an inner text node is
    // at the top, so we do two passes: one for image targets, one for section-bgs.

    // Pass 1 — image containers (::before/::after opacity)
    outer: for (const layer of (layers || [])) {
      const cls = (layer.cls || '') + ' ' + (layer.id || '');

      // 1a. Direct: layer IS an image container
      for (const t of OVERLAY_TARGETS) {
        if (cls.includes(t.cls)) {
          overlayTargetSel   = '.' + t.cls;
          overlayTargetLabel = t.label;
          overlayTargetType  = 'image';
          break outer;
        }
      }

      // 1b. Parent: layer WRAPS an image container
      for (const [parentCls, childCls] of Object.entries(OVERLAY_PARENT_MAP)) {
        if (cls.includes(parentCls)) {
          const tgt = OVERLAY_TARGETS.find(t => t.cls === childCls);
          overlayTargetSel   = '.' + childCls;
          overlayTargetLabel = tgt ? tgt.label : childCls;
          overlayTargetType  = 'image';
          break outer;
        }
      }

      // 1c. Floral rose ::before background on numbered service sections
      for (const floralCls of FLORAL_BG_SECTIONS) {
        if (cls.includes(floralCls)) {
          overlayTargetSel   = '.' + floralCls;
          overlayTargetLabel = 'Rose background';
          overlayTargetType  = 'image';
          break outer;
        }
      }
    }

    // Pass 2 — if no image container found, look for a section/element with a bg image
    if (!overlayTargetSel) {
      for (const layer of (layers || [])) {
        if (layer.bg) {
          // Build the best CSS selector for this element
          const sel = layer.id  ? '#' + layer.id
                    : layer.cls ? '.' + layer.cls.trim().split(/\s+/)[0]
                    : layer.tag ? layer.tag.toLowerCase()
                    : null;
          if (sel) {
            overlayTargetSel   = sel;
            overlayTargetLabel = 'Background overlay';
            overlayTargetType  = 'section-bg';
            break;
          }
        }
      }
    }

    if (overlayTargetSel && ctxOverlaySection) {
      const icon = overlayTargetType === 'section-bg' ? '🎨' : '⬛';
      if (ctxOverlayLabel) ctxOverlayLabel.textContent = icon + ' ' + overlayTargetLabel.toUpperCase() + ' OVERLAY';
      ctxOverlaySection.classList.remove('hidden');
      if (ctxDivOverlay) ctxDivOverlay.classList.remove('hidden');
    }
  }

  /** Standalone read / write helpers for editor-overrides.css (outer scope, no closure deps) */
  async function readOverrideCss() {
    const r = await fetch('/api/editor-css');
    if (!r.ok) throw new Error('editor-css read failed: ' + r.status);
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'read error');
    return d.css || '';
  }

  async function writeOverrideCss(css) {
    const r = await fetch('/api/save-editor-css', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ css })
    });
    if (!r.ok) throw new Error('editor-css write failed: ' + r.status);
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'write error');
    return d;
  }

  /** Build the CSS patch block for an overlay opacity change.
   *  opacity === null means "restore" (caller should just remove the block).
   *  type: 'image'      → sets opacity on sel::before and sel::after
   *        'section-bg' → uses background-blend-mode: multiply + background-color rgba */
  function buildOverlayOpacityPatch(sel, label, opacity, type) {
    const pname = 'overlay-opacity: ' + sel;
    const pct   = (opacity * 100).toFixed(0) + '%';
    let body;
    if (type === 'section-bg') {
      body = sel + ' {\n'
           + '  background-blend-mode: multiply !important;\n'
           + '  background-color: rgba(5,5,5,' + opacity + ') !important;\n'
           + '}';
    } else {
      body = sel + '::before { opacity: ' + opacity + ' !important; }\n'
           + sel + '::after  { opacity: ' + opacity + ' !important; }';
    }
    return [
      '',
      '/* EDITOR SAFE PATCH: ' + pname + ' */',
      '/* Applied by JBC local editor — remove this block to restore the default overlay */',
      '/* ' + label + ' (' + sel + ') — overlay set to ' + pct + ' */',
      body,
      '/* END EDITOR SAFE PATCH: ' + pname + ' */',
      ''
    ].join('\n');
  }

  /** Apply (or remove) an overlay opacity patch for the currently detected target.
   *  opacity === null → restore default (removes the patch block). */
  async function applyOverlayOpacity(opacity) {
    if (!overlayTargetSel) { setStatus('No overlay detected — right-click on an image or section first'); return; }
    const sel    = overlayTargetSel;
    const label  = overlayTargetLabel;
    const type   = overlayTargetType;
    const pname  = 'overlay-opacity: ' + sel;
    const startM = '/* EDITOR SAFE PATCH: ' + pname + ' */';
    const endM   = '/* END EDITOR SAFE PATCH: ' + pname + ' */';
    setStatus('Updating overlay…');
    try {
      let css = await readOverrideCss();

      // Remove any existing patch for this target
      const si = css.indexOf(startM);
      const ei = css.indexOf(endM);
      if (si !== -1 && ei !== -1) {
        css = (css.slice(0, si).trimEnd() + '\n' +
               css.slice(ei + endM.length).replace(/^\n+/, '\n')).trimEnd() + '\n';
      }

      // null = restore → just remove, don't write a new block
      if (opacity !== null) {
        css = css.trimEnd() + buildOverlayOpacityPatch(sel, label, opacity, type);
      }

      await writeOverrideCss(css);

      if (frame && frame.contentWindow) {
        setTimeout(() => frame.contentWindow.location.reload(), 300);
      }

      const msg = opacity === null
        ? '↺ ' + label + ' overlay restored to default'
        : '✓ ' + label + ' overlay → ' + (opacity * 100).toFixed(0) + '%  (saved to editor-overrides.css)';
      setStatus(msg);
    } catch (err) {
      setStatus('Overlay error: ' + err.message);
    }
  }

  function showLayersPanel(layers, cx, cy) {
    const sec = ctxMenu.querySelector('.ctx-layers-section');
    if (!sec) return;
    const divider = document.getElementById('ctx-div-layers');

    sec.innerHTML = '<div class="ctx-layers-label">LAYERS AT CURSOR</div>';
    if (divider) divider.classList.remove('hidden');

    lastCtxLayers = Array.isArray(layers) ? layers : [];
    activeLayerObj = lastCtxLayers[0] || null;

    // Detect image overlay containers at cursor and show/hide overlay controls
    detectAndShowOverlay(layers);

    layers.forEach((l, idx) => {
      const tag = (l.tag || '').toLowerCase();
      let icon = '◻';
      if (tag === 'img')                               icon = '🖼';
      else if (tag === 'section' || tag === 'footer')  icon = '▬';
      else if (/^h[1-6]$/.test(tag))                  icon = 'T';
      else if (tag === 'p' || tag === 'span' || tag === 'a') icon = 'T';
      else if (l.bg)                                   icon = '🎨';
      const name = l.id ? '#' + l.id : l.cls ? '.' + l.cls.split(' ')[0] : tag;
      const snippet = l.text   ? '"' + l.text.slice(0, 26) + (l.text.length > 26 ? '…' : '') + '"'
                    : l.src    ? l.src
                    : l.bg     ? 'bg image'
                    : '';

      const row = document.createElement('label');
      row.className = 'ctx-layer-row';
      row.setAttribute('title', name + (snippet ? ' — ' + snippet : ''));

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'ctx-layer-pick';
      radio.className = 'ctx-layer-radio';
      radio.value = idx;

      row.innerHTML = `
        <span class="layer-icon">${icon}</span>
        <span class="layer-name">${name}</span>
        <span class="layer-snip">${snippet}</span>
      `;
      row.prepend(radio);

      const selectThisLayer = () => {
        radio.checked = true;
        activeLayerSel = l.sel;
        if (frame.contentWindow) {
          frame.contentWindow.postMessage({ type: 'jbc_select_layer', sel: l.sel, idx: l.idx }, '*');
        }
        sec.querySelectorAll('.ctx-layer-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        setStatus(`Layer: ${name}${snippet ? ' — ' + snippet : ''} — choose action below`);
        // Show/hide relevant context menu actions based on element type
        updateCtxActionsForLayer(tag, l);
      };

      // Clicking the row/radio: highlight layer but KEEP MENU OPEN
      row.addEventListener('click', ev => {
        ev.stopPropagation();   // prevent document click → hideCtxMenu
        selectThisLayer();
      });

      // Auto-select the first (topmost) layer immediately on menu open
      if (idx === 0) setTimeout(selectThisLayer, 0);

      sec.appendChild(row);
    });
  }

  // Adjust context menu actions for the selected element type.
  // Policy: keep REPLACE / BACKGROUND buttons always visible (the handlers are
  // smart enough to walk up and find the right target). Only toggle the two
  // resize variants so exactly one is shown at a time.
  function updateCtxActionsForLayer(tag, layer) {
    const isSection = tag === 'section' || tag === 'footer' || tag === 'header' || tag === 'main'
                   || (layer.cls || '').includes('section');

    // Resize: show "Resize Section" for sections, "Resize Object" for everything else
    ctxMenu.querySelectorAll('.ctx-item--resize').forEach(btn => {
      const action = btn.dataset.action;
      if (action === 'resize-el')      btn.style.display = isSection ? 'none' : '';
      if (action === 'resize-section') btn.style.display = isSection ? '' : 'none';
    });
    // All replace / bg buttons stay visible — their handlers find the right target
  }

  function hideCtxMenu() {
    ctxMenu.classList.add('hidden');
    // Clear layer highlight every time menu closes
    if (frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'jbc_clear_layer' }, '*');
    }
    activeLayerSel = null;
  }

  /* ── AI CONTEXT SUGGESTIONS ──────────────────────────── */
  function cleanAiLayerValue(value, maxLength = 900) {
    if (value == null) return '';
    const text = String(value);
    return text
      .replace(/url\((['"]?)data:image\/[^\)]*\1\)/gi, 'url([inline image data removed])')
      .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g, '[inline image data removed]')
      .replace(/[A-Za-z0-9+/=]{500,}/g, '[long encoded data removed]')
      .slice(0, maxLength);
  }

  function normaliseLayerForAi(layer) {
    if (!layer) return null;
    return {
      selector: cleanAiLayerValue(layer.sel || layer.selector || layer.id || layer.cls || layer.tag || ''),
      tag: cleanAiLayerValue(layer.tag || ''),
      id: cleanAiLayerValue(layer.id || ''),
      className: cleanAiLayerValue(layer.cls || layer.className || ''),
      text: cleanAiLayerValue(layer.text || '', 600),
      src: cleanAiLayerValue(layer.src || '', 500),
      background: cleanAiLayerValue(layer.bg || '', 500),
      href: cleanAiLayerValue(layer.href || '', 500),
      rect: layer.rect || null
    };
  }


  function renderAiContextPanel(aiSection, layers, x, y) {
    const selected = normaliseLayerForAi(activeLayerObj || (layers && layers[0]));
    const selectedLabel = selected
      ? (selected.selector || selected.tag || 'selected layer')
      : 'no layer selected';

    aiSection.innerHTML = `
      <div class="ctx-ai-label">✦ AI Assist</div>
      <div class="ctx-ai-selected">Selected: ${selectedLabel}</div>
      <textarea class="ctx-ai-prompt" placeholder="Ask AI about this selected layer. Example: what controls this fade? make this background less stretched? remove this line?" rows="3"></textarea>
      <div class="ctx-ai-actions">
        <button class="ctx-item ctx-item--ai" type="button" data-ai-mode="analyze">Analyze request</button>
        <button class="ctx-item ctx-item--ai" type="button" data-ai-mode="propose">Propose fix</button>
        <button class="ctx-item ctx-item--ai" type="button" data-ai-mode="xray">Check live layers</button>
        <button class="ctx-item ctx-item--ai" type="button" data-ai-mode="perform">Perform fix</button>
        <button class="ctx-item ctx-item--ai" type="button" data-ai-mode="evidence">Evidence only</button>
        <button class="ctx-item ctx-item--ai ctx-item--action" type="button" data-ai-mode="seam-fade">Apply seam fade</button>
        <button class="ctx-item ctx-item--ai ctx-item--rollback" type="button" data-ai-mode="rollback-seam-fade">↩ Remove seam fade</button>
      </div>
      <pre class="ctx-ai-output"></pre>
    `;

    const promptBox = aiSection.querySelector('.ctx-ai-prompt');
    // Keep clicks inside the AI area from closing the context menu,
    // but do it in bubble phase so the AI buttons still receive clicks first.
    ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'keydown', 'keyup', 'input', 'focus'].forEach(type => {
      aiSection.addEventListener(type, e => {
        e.stopPropagation();
      }, false);
    });

    promptBox.addEventListener('click', e => {
      e.stopPropagation();
      promptBox.focus();
    }, false);

    const output = aiSection.querySelector('.ctx-ai-output');

    const getAiUserPrompt = () => {
      return (promptBox.value || promptBox.textContent || '').trim();
    };


      if (aiSection && !aiSection.dataset.aiDelegatedClickBound) {
        aiSection.dataset.aiDelegatedClickBound = '1';
        aiSection.addEventListener('click', e => {
          const btn = e.target && e.target.closest ? e.target.closest('[data-ai-mode]') : null;
          if (!btn || !aiSection.contains(btn)) return;

          e.preventDefault();
          e.stopPropagation();

          const mode = btn.dataset.aiMode || 'analyze';
          ask(mode);
        });
      }

    const ask = async (mode) => {

      const requestedMode = mode || 'analyze';

      const context = {
        page: currentPage,
        point: { x, y },
        selectedLayer: normaliseLayerForAi(activeLayerObj || (layers && layers[0])),
        layersAtCursor: (layers || []).map(normaliseLayerForAi),
        mode
      };

      function runLiveLayerXray() {
        const report = [];

        function cleanValue(value) {
          return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function selectorLabel(el) {
          if (!el) return 'not found';
          if (el.id) return `#${el.id}`;
          if (el.dataset && el.dataset.editorId) return `[data-editor-id="${el.dataset.editorId}"]`;
          const cls = typeof el.className === 'string'
            ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.')
            : '';
          return el.tagName ? `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}` : 'unknown element';
        }

        function summarizeElement(el) {
          if (!el || !win) return null;

          const rect = el.getBoundingClientRect();
          const cs = win.getComputedStyle(el);
          const before = win.getComputedStyle(el, '::before');
          const after = win.getComputedStyle(el, '::after');

          function pseudoSummary(pseudo) {
            const hasContent =
              pseudo.content &&
              pseudo.content !== 'none' &&
              pseudo.content !== 'normal' &&
              pseudo.display !== 'none';

            return {
              detected: !!hasContent,
              content: cleanValue(pseudo.content),
              display: pseudo.display,
              position: pseudo.position,
              zIndex: pseudo.zIndex,
              opacity: pseudo.opacity,
              backgroundImage: cleanValue(pseudo.backgroundImage).slice(0, 180),
              pointerEvents: pseudo.pointerEvents
            };
          }

          return {
            label: selectorLabel(el),
            rect: {
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            computed: {
              position: cs.position,
              zIndex: cs.zIndex,
              overflow: cs.overflow,
              overflowX: cs.overflowX,
              overflowY: cs.overflowY,
              opacity: cs.opacity,
              transform: cs.transform,
              backgroundColor: cs.backgroundColor,
              backgroundImage: cleanValue(cs.backgroundImage).slice(0, 180),
              pointerEvents: cs.pointerEvents,
              isolation: cs.isolation,
              mixBlendMode: cs.mixBlendMode
            },
            pseudo: {
              before: pseudoSummary(before),
              after: pseudoSummary(after)
            }
          };
        }

        function findSelectedElement() {
          const selected = context && context.selectedLayer ? context.selectedLayer : {};
          const candidates = [];

          if (selected.selector) candidates.push(selected.selector);
          if (selected.dataEditorId) candidates.push(`[data-editor-id="${selected.dataEditorId}"]`);
          if (selected.editorId) candidates.push(`[data-editor-id="${selected.editorId}"]`);
          if (selected.id) candidates.push(`#${selected.id}`);

          candidates.push('[data-editor-id="hero-section"]');
          candidates.push('.hero');

          for (const sel of candidates) {
            try {
              const found = doc.querySelector(sel);
              if (found) return found;
            } catch (err) {}
          }

          return null;
        }

        function findNeighbourSection(section) {
          if (!section) return null;
          let next = section.nextElementSibling;
          while (next && !/^(SECTION|HEADER|FOOTER|MAIN)$/i.test(next.tagName || '')) {
            next = next.nextElementSibling;
          }
          return next;
        }

        function collectPointLayers(px, py) {
          try {
            return (doc.elementsFromPoint(px, py) || [])
              .filter(el => el && el !== doc.documentElement && el !== doc.body)
              .slice(0, 10)
              .map(summarizeElement)
              .filter(Boolean);
          } catch (err) {
            return [];
          }
        }

        if (!win || !doc) {
          return 'LIVE LAYER CHECK\n\nThe iframe document is not available, so live layers cannot be inspected yet.';
        }

        const selectedEl = findSelectedElement();
        const selectedSection = selectedEl && selectedEl.closest
          ? selectedEl.closest('section, header, footer, main')
          : null;
        const nextSection = findNeighbourSection(selectedSection);

        const selectedSummary = summarizeElement(selectedSection || selectedEl);
        const nextSummary = summarizeElement(nextSection);

        let seamLayersAbove = [];
        let seamLayersBelow = [];

        if (selectedSection) {
          const rect = selectedSection.getBoundingClientRect();
          const px = Math.max(1, Math.min(win.innerWidth - 1, Math.round(rect.left + rect.width / 2)));
          const yAbove = Math.max(1, Math.min(win.innerHeight - 1, Math.round(rect.bottom - 3)));
          const yBelow = Math.max(1, Math.min(win.innerHeight - 1, Math.round(rect.bottom + 3)));

          seamLayersAbove = collectPointLayers(px, yAbove);
          seamLayersBelow = collectPointLayers(px, yBelow);
        }

        const carouselPresent = !!(
          doc.querySelector('[data-jbc-codrops-cinema]') ||
          doc.querySelector('.jbc-cinema-stage') ||
          doc.querySelector('.jbc-cinema-ring') ||
          doc.querySelector('.jbc-cinema-panel')
        );

        function formatSummary(title, item) {
          if (!item) return `${title}: not found`;

          return `${title}: ${item.label}
  box: top ${item.rect.top}, bottom ${item.rect.bottom}, height ${item.rect.height}
  position: ${item.computed.position}, z-index: ${item.computed.zIndex}, overflow: ${item.computed.overflow}, opacity: ${item.computed.opacity}
  transform: ${item.computed.transform === 'none' ? 'none' : 'present'}
  ::before: ${item.pseudo.before.detected ? 'detected' : 'not active'}
  ::after: ${item.pseudo.after.detected ? 'detected' : 'not active'}`;
        }

        function formatLayerList(title, list) {
          if (!list.length) return `${title}: no layers detected`;

          return `${title}:
` + list.map((item, index) => {
            return `  ${index + 1}. ${item.label}, position ${item.computed.position}, z-index ${item.computed.zIndex}, overflow ${item.computed.overflow}, transform ${item.computed.transform === 'none' ? 'none' : 'present'}, opacity ${item.computed.opacity}`;
          }).join('\n');
        }

        report.push('LIVE LAYER CHECK');
        report.push('');
        report.push(formatSummary('Selected section/layer', selectedSummary));
        report.push('');
        report.push(formatSummary('Next section', nextSummary));
        report.push('');
        report.push(`Carousel detected: ${carouselPresent ? 'yes, avoid carousel mechanics' : 'not detected'}`);
        report.push('');
        report.push(formatLayerList('Layers just above the seam', seamLayersAbove));
        report.push('');
        report.push(formatLayerList('Layers just below the seam', seamLayersBelow));
        report.push('');
        report.push('Recommendation: use a boundary fade/overlay outside carousel mechanics. If seam layers show transform or z-index stacking from the carousel, keep the fade attached to the hero side or a dedicated boundary overlay rather than inside .jbc-cinema-ring or .jbc-cinema-panel.');

        return report.join('\n');
      }

      if (requestedMode === 'xray') {
        output.textContent = runLiveLayerXray();
        return;
      }

      /* ── SEAM FADE: deterministic, no AI needed ──────────── */

      // Trigger phrases that also resolve to seam-fade mode
      const SEAM_FADE_TRIGGERS = [
        /hero.{0,30}fade/i,
        /blend.{0,30}hero/i,
        /fade.{0,20}(selected work|featured.?work)/i,
        /soft.{0,20}black.{0,20}fade/i,
        /blend.{0,30}section/i,
        /section.{0,20}boundary.{0,20}fade/i,
        /hero.{0,30}selected.?work/i,
        /seam.{0,20}fade/i
      ];

      const ROLLBACK_TRIGGERS = [
        /undo.{0,20}(hero|seam|fade)/i,
        /remove.{0,20}(seam|hero|fade)/i,
        /rollback.{0,30}(hero|seam|fade)/i
      ];

      const CAROUSEL_GUARDRAILS = [
        '.jbc-cinema-ring',
        '.jbc-cinema-panel',
        '.jbc-cinema-pin',
        '.jbc-gallery-track',
        '.jbc-gs-card'
      ];

      const SEAM_FADE_PATCH_NAME = 'hero-to-featured-work seam fade';

      // Check if user typed a trigger phrase when pressing Analyze/Propose
      const typedPrompt = getAiUserPrompt();
      const isSeamFadeTrigger = requestedMode === 'seam-fade' ||
        (typedPrompt && SEAM_FADE_TRIGGERS.some(rx => rx.test(typedPrompt)));
      const isRollbackTrigger = requestedMode === 'rollback-seam-fade' ||
        (typedPrompt && ROLLBACK_TRIGGERS.some(rx => rx.test(typedPrompt)));

      // ── shared CSS read/write helpers (use existing working endpoints) ──
      async function readEditorCss() {
        const r = await fetch('/api/editor-css');
        if (!r.ok) throw new Error(`editor-css read failed: ${r.status}`);
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || 'editor-css read error');
        return d.css || '';
      }
      async function writeEditorCss(css) {
        const r = await fetch('/api/save-editor-css', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ css })
        });
        if (!r.ok) throw new Error(`editor-css write failed: ${r.status}`);
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || 'editor-css write error');
        return d;
      }

      // ── resolve which section is currently selected ──────────
      function resolveTargetSection() {
        if (!doc) return null;
        // Walk candidates from most-specific to least
        const sel = context.selectedLayer || {};
        const candidates = [];
        if (sel.selector)    candidates.push(sel.selector);
        if (sel.id)          candidates.push(`#${sel.id}`);
        if (sel.className)   candidates.push(`.${sel.className.trim().split(/\s+/)[0]}`);
        // Also try the raw active layer element directly
        if (activeLayerObj && activeLayerObj.el) candidates.push(activeLayerObj.el);

        let found = null;
        for (const c of candidates) {
          try {
            const el = (typeof c === 'string') ? doc.querySelector(c) : c;
            if (el) { found = el; break; }
          } catch (_) {}
        }
        if (!found) return null;
        // Walk up to nearest block-level section container
        const section = found.closest
          ? (found.closest('[data-editor-id]') || found.closest('section, header, footer, main, article, div[id]') || found)
          : found;
        return section;
      }

      function sectionCssSelector(el) {
        if (!el) return null;
        // Best selector: data-editor-id (stable), then id, then tag+first-class
        const eid = el.dataset && el.dataset.editorId;
        if (eid) {
          const tag = (el.tagName || '').toLowerCase();
          const cls = typeof el.className === 'string'
            ? el.className.trim().split(/\s+/).filter(Boolean)[0] || ''
            : '';
          // Combine tag+class+attr for maximum specificity to beat !important chains
          return `${tag}${cls ? '.' + cls : ''}[data-editor-id="${eid}"]`;
        }
        if (el.id) return `#${el.id}`;
        const tag2 = (el.tagName || '').toLowerCase();
        const cls2 = typeof el.className === 'string'
          ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
          : '';
        return `${tag2}${cls2 ? '.' + cls2 : ''}`;
      }

      function sectionLabel(el) {
        if (!el) return 'unknown';
        const eid = el.dataset && el.dataset.editorId;
        if (eid) return eid;
        if (el.id) return el.id;
        const tag = (el.tagName || '').toLowerCase();
        const cls = typeof el.className === 'string'
          ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
          : '';
        return `${tag}${cls ? '.' + cls : ''}`;
      }

      // ── helper: remove ONE labelled patch block from a CSS string ─
      function removePatchBlock(css, patchName) {
        const start = `/* EDITOR SAFE PATCH: ${patchName} */`;
        const end   = `/* END EDITOR SAFE PATCH: ${patchName} */`;
        const si = css.indexOf(start);
        const ei = css.indexOf(end);
        if (si === -1) return { found: false, css };
        if (ei === -1) return { found: false, css, error: 'End marker missing' };
        const cleaned = (css.slice(0, si).trimEnd() + '\n' + css.slice(ei + end.length).replace(/^\n+/, '\n')).trimEnd() + '\n';
        return { found: true, css: cleaned };
      }

      // ── helper: build fade CSS for any section ────────────────────
      // nextSectionCssSelector — builds the HIGHEST-SPECIFICITY selector possible
      // so our patch beats any existing ::before rules on the same element.
      // Strategy: #id.cls1.cls2 (specificity 1,2,0) beats #id.cls (1,1,0)
      function nextSectionCssSelector(el) {
        if (!el) return null;
        const classes = typeof el.className === 'string'
          ? el.className.trim().split(/\s+/).filter(Boolean)
          : [];
        if (el.id) {
          // Anchor on the ID plus the first two real classes for max specificity
          const classSuffix = classes.slice(0, 2).map(c => '.' + c).join('');
          return `#${el.id}${classSuffix}`;
        }
        const eid = el.dataset && el.dataset.editorId;
        const tag = (el.tagName || '').toLowerCase();
        const cls = classes.slice(0, 2).join('.');
        if (eid) return `${tag}${cls ? '.' + cls : ''}[data-editor-id="${eid}"]`;
        return `${tag}${cls ? '.' + cls : ''}`;
      }

      // findNextSection — walks DOM siblings to find the next block-level section
      function findNextSection(el) {
        if (!el || !doc) return null;
        // First try the closest section ancestor's next sibling
        const section = el.closest
          ? (el.closest('section, header, footer, main, article') || el)
          : el;
        let next = section.nextElementSibling;
        while (next) {
          const tag = (next.tagName || '').toUpperCase();
          if (/^(SECTION|HEADER|FOOTER|MAIN|ARTICLE)$/.test(tag)) return next;
          // Also accept a div with an id that acts as a section
          if (tag === 'DIV' && (next.id || (next.dataset && next.dataset.editorId))) return next;
          next = next.nextElementSibling;
        }
        return null;
      }

      function buildFadePatch(nextSel, currentLabel, nextLabel, patchName) {
        // The fade goes on the NEXT section's ::before, not the current section's ::after.
        // Reason: the next section always paints OVER the current section at the seam
        // (DOM order, both position:relative), so ::before on next is never blocked.
        //
        // SPECIFICITY STRATEGY:
        // Many existing style.css rules for #featured-work::before use selectors like
        // #featured-work.jbc-floral-work::before at specificity (1,1,1) with !important.
        // nextSectionCssSelector() builds #id.cls1.cls2 → (1,2,0), which is higher,
        // so our !important rules win the cascade even though editor-overrides.css is
        // included AFTER style.css.
        //
        // We also explicitly reset every competing property the existing rules set:
        // mask-image, background-size, background-repeat, background-position, bottom.
        return [
          '',
          `/* EDITOR SAFE PATCH: ${patchName} */`,
          `/* Applied by JBC local editor — remove this entire block to undo */`,
          `/* Fade on ::before of next section ("${nextLabel}") — never blocked by container */`,
          `/* Current section: "${currentLabel}" — Carousel untouched */`,
          `${nextSel}::before {`,
          `  content: '' !important;`,
          `  display: block !important;`,
          `  position: absolute !important;`,
          `  top: 0 !important;`,
          `  left: 0 !important;`,
          `  right: 0 !important;`,
          `  bottom: auto !important;`,
          `  width: 100% !important;`,
          `  height: 260px !important;`,
          `  /* Gradient — reset every background sub-property explicitly */`,
          `  background-image: linear-gradient(to bottom, #050505 0%, rgba(5,5,5,0.85) 30%, rgba(5,5,5,0.4) 65%, transparent 100%) !important;`,
          `  background-size: 100% 100% !important;`,
          `  background-repeat: no-repeat !important;`,
          `  background-position: top center !important;`,
          `  background-color: transparent !important;`,
          `  /* Kill any mask that would hide the gradient */`,
          `  -webkit-mask-image: none !important;`,
          `  mask-image: none !important;`,
          `  pointer-events: none !important;`,
          `  z-index: 10 !important;`,
          `  opacity: 1 !important;`,
          `  visibility: visible !important;`,
          `}`,
          `@media (max-width: 768px) {`,
          `  ${nextSel}::before {`,
          `    height: 160px !important;`,
          `  }`,
          `}`,
          `/* END EDITOR SAFE PATCH: ${patchName} */`,
          ''
        ].join('\n');
      }

      if (isRollbackTrigger) {
        output.textContent = 'Reading css/editor-overrides.css…';
        try {
          const existing = await readEditorCss();
          // Find all patch blocks in the file and list them, or remove the one for the current section
          const targetEl  = resolveTargetSection();
          const label     = sectionLabel(targetEl);
          const patchName = `section-bottom-fade: ${label}`;

          // Try to remove current-section patch first; if not found, remove legacy hero patch
          let result = removePatchBlock(existing, patchName);
          if (!result.found) result = removePatchBlock(existing, SEAM_FADE_PATCH_NAME);

          if (!result.found) {
            // List all patches present
            const allPatches = [...existing.matchAll(/\/\* EDITOR SAFE PATCH: ([^*]+) \*\//g)]
              .map(m => m[1].trim());
            if (allPatches.length) {
              output.textContent = `No fade patch found for "${label}".\n\nPatches currently in css/editor-overrides.css:\n${allPatches.map(p => `  • ${p}`).join('\n')}\n\nSelect the section whose fade you want to remove, then press ↩ Remove seam fade.`;
            } else {
              output.textContent = `No fade patches found in css/editor-overrides.css. Nothing to remove.`;
            }
            return;
          }

          const saved = await writeEditorCss(result.css);
          if (frame && frame.contentWindow) {
            setTimeout(() => { frame.contentWindow.location.reload(); }, 300);
          }
          output.textContent = `FADE REMOVED\n\nFile: css/editor-overrides.css\nBackup: ${(saved.backups || []).filter(Boolean).join(', ') || 'n/a'}\n\nPatch removed. Reloading preview…`;
        } catch (err) {
          output.textContent = `Rollback error: ${err.message}`;
        }
        return;
      }

      if (isSeamFadeTrigger) {
        output.textContent = 'Detecting selected section…';

        // Step 1 — resolve which section to target
        const targetEl = resolveTargetSection();
        if (!targetEl) {
          output.textContent = `No section detected.\n\nRight-click on a section in the editor to select it, then press Apply seam fade.`;
          return;
        }

        const cssSelector  = sectionCssSelector(targetEl);
        const label        = sectionLabel(targetEl);
        const patchName    = `section-bottom-fade: ${label}`;

        // Guardrail: refuse if the resolved selector IS a carousel component
        const selectorIsCarousel = CAROUSEL_GUARDRAILS.some(g => cssSelector.includes(g.replace(/^\./, '')));
        if (selectorIsCarousel) {
          output.textContent = `GUARDRAIL BLOCKED\n\nSelected element (${cssSelector}) is a protected carousel component.\nSelect a section container instead.\nProtected: ${CAROUSEL_GUARDRAILS.join(', ')}`;
          return;
        }

        // Step 1b — find the NEXT section (fade lives on its ::before, not current ::after)
        // Reason: the next section paints over the current one at the seam (DOM order),
        // so any ::after on the current section gets covered. ::before on next is unblockable.
        output.textContent = `Selected section: ${label}\nLooking for following section…`;
        const nextSection = findNextSection(targetEl);
        if (!nextSection) {
          output.textContent = `No following section found after "${label}".\n\nThe seam fade needs a section that comes immediately after the selected one — it places the gradient on that section's top edge.\n\nTry selecting the section that comes BEFORE the seam you want to fade.`;
          return;
        }
        const nextSel   = nextSectionCssSelector(nextSection);
        const nextLabel = sectionLabel(nextSection);

        // Guardrail: refuse if the next-section selector hits a carousel
        const nextIsCarousel = CAROUSEL_GUARDRAILS.some(g => nextSel.includes(g.replace(/^\./, '')));
        if (nextIsCarousel) {
          output.textContent = `GUARDRAIL BLOCKED\n\nThe section after "${label}" is a protected carousel component (${nextSel}).\nCarousel mechanics must not be altered.\nSelect a different section to fade.`;
          return;
        }

        // Step 2 — build the CSS (targets nextSel::before)
        const fadeCss = buildFadePatch(nextSel, label, nextLabel, patchName);

        // Guardrail: patch must not contain carousel selectors
        const cssViolation = CAROUSEL_GUARDRAILS.find(g => fadeCss.includes(g));
        if (cssViolation) {
          output.textContent = `GUARDRAIL BLOCKED\n\nPatch would contain protected selector: ${cssViolation}\nNo file changed.`;
          return;
        }

        // Step 3 — diagnostic: confirm next section has position:relative (needed for ::before)
        const carouselDetected = !!(
          doc.querySelector('[data-jbc-codrops-cinema]') ||
          doc.querySelector('.jbc-cinema-stage')
        );
        const csNext = win ? win.getComputedStyle(nextSection) : null;
        const posNext = csNext ? csNext.position : 'unknown';
        const needsPosition = posNext === 'static';

        output.textContent = [
          `Current section:  ${label} (${cssSelector})`,
          `Next section:     ${nextLabel} (${nextSel})`,
          `Next position:    ${posNext}${needsPosition ? ' ← will add position:relative' : ' ✓'}`,
          carouselDetected ? `Carousel:         detected — mechanics will NOT be touched ✓` : '',
          ``,
          `Strategy: fade on ${nextSel}::before — always visible, never blocked.`,
          ``,
          `Reading css/editor-overrides.css…`
        ].filter(Boolean).join('\n');

        // Step 4 — read, check duplicate, write
        try {
          const existing = await readEditorCss();
          if (existing.includes(`/* EDITOR SAFE PATCH: ${patchName} */`)) {
            output.textContent = `Fade already applied to "${label}" seam.\n\nPress "↩ Remove seam fade" to remove it first, then re-apply.`;
            return;
          }

          // If next section is static, prepend a position:relative so ::before works
          let positionFix = '';
          if (needsPosition) {
            positionFix = `\n/* EDITOR SAFE PATCH: position-fix for ${nextLabel} */\n${nextSel} { position: relative !important; overflow: visible !important; }\n/* END EDITOR SAFE PATCH: position-fix for ${nextLabel} */\n`;
          }

          const newCss = existing.trimEnd() + positionFix + fadeCss;
          const saved  = await writeEditorCss(newCss);

          // Reload the iframe so the CSS change is immediately visible
          if (frame && frame.contentWindow) {
            setTimeout(() => { frame.contentWindow.location.reload(); }, 300);
          }

          output.textContent = [
            `✓ FADE APPLIED`,
            ``,
            `Current section:  ${label}`,
            `Fade placed on:   ${nextSel}::before  (top of "${nextLabel}")`,
            `File changed:     css/editor-overrides.css`,
            `Backup saved:     ${(saved.backups || []).filter(Boolean).join(', ') || 'n/a'}`,
            `Patch label:      "${patchName}"`,
            needsPosition ? `Position fix:     added position:relative to ${nextSel}` : ``,
            ``,
            `Why ::before on next section?`,
            `  DOM paint order means the next section paints OVER the current one.`,
            `  So ::after on the current section gets covered at the seam.`,
            `  ::before on the next section is always on top — unblockable.`,
            ``,
            `Safe because:`,
            `  • pointer-events: none — won't block clicks or editor`,
            `  • No carousel selectors touched`,
            `  • Fully reversible — press "↩ Remove seam fade" to undo`,
            ``,
            `Visual check:`,
            `  Scroll to the seam between "${label}" and "${nextLabel}".`,
            `  You should see a dark gradient at the top of "${nextLabel}".`,
            `  To remove: select "${label}" again, press "↩ Remove seam fade".`
          ].filter(l => l !== undefined).join('\n');

        } catch (err) {
          output.textContent = `Patch error: ${err.message}`;
        }
        return;
      }

      /* ─────────────────────────────────────────────────────── */

      const userPrompt = getAiUserPrompt();

      if (mode === 'perform') {
        output.textContent = `Perform Fix is intentionally locked for now.

Next safe step:
Use Analyze request first, then Propose fix.

Once the proposal is consistently correct, we will enable Perform Fix with automatic backups before touching files.`;
        return;
      }

      const defaultPrompts = {
        analyze: `You are Valentina's local website editor assistant.
Read her request, inspect the real file evidence, and answer in normal language.

Do not show code.
Do not show raw file evidence.
Do not invent selectors.
Do not propose a fix yet.

Output:
1. "I understand you want..."
2. "What I found..."
3. "Best direction..."
4. "Risk level..."`,

        propose: `You are Valentina's local website editor assistant.
Read her request and the real file evidence, then propose ONE safe fix in normal language.

Do not show code.
Do not show raw file evidence.
Do not invent selectors.
Do not say you changed anything.

Output:
1. "Proposed fix..."
2. "What it will change..."
3. "What it will not touch..."
4. "Files likely affected..."
5. "Risk level..."
6. "Ready to perform only after approval."`,

        perform: `Do not perform anything yet. Explain that file editing is not enabled until the proposal system is reliable.`,

        evidence: 'Return only the real file evidence found for the selected website layer. Do not call AI interpretation. Do not suggest code.'
      };

      const defaultPrompt = defaultPrompts[mode] || defaultPrompts.diagnose;

      if (!userPrompt && mode !== 'evidence' && mode !== 'perform') {
        output.textContent = 'Write what you want first. Example: I want a soft black fade between the hero and the Selected Work section.';
        promptBox.focus();
        return;
      }

      if (mode === 'controller') {
        output.textContent = 'Finding real CSS controllers…';

        try {
          const res = await fetch('/api/find-css-controller', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context })
          });

          if (!res.ok) throw new Error('Controller route unavailable');
          const data = await res.json();

          const matches = Array.isArray(data.matches) ? data.matches : [];
          const text = matches.length
            ? matches.map(item => `FILE: ${item.file}\nSELECTOR: ${item.selector}\nLINE: ${item.line}\n${item.snippet}`).join('\n\n---\n\n')
            : 'No matching CSS/HTML controller found.';

          output.textContent =
            `SELECTORS SEARCHED:\n${(data.selectorsSearched || []).join(', ')}\n\n` +
            `================ REAL CONTROLLERS ================\n${text}`;

          return;
        } catch (err) {
          output.textContent = 'Controller search failed: ' + (err.message || err);
          return;
        }
      }

      output.textContent = 'AI thinking…';

      try {
        const res = await fetch('/api/ai-inspect-layer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userPrompt || defaultPrompt,
            task: defaultPrompt,
            userPrompt,
            context
          })
        });

        if (!res.ok) throw new Error('AI unavailable');
        const data = await res.json();
        if (data.ok === false) throw new Error(data.error || 'AI unavailable');


        const evidence = Array.isArray(data.evidence) ? data.evidence : [];
        const evidenceText = evidence.length
          ? evidence.map(item => `EVIDENCE: ${item.file}\n${item.snippet}`).join('\n\n---\n\n')
          : 'No file evidence returned.';


        function renderLocalFactsSummary(facts) {
          if (!facts || typeof facts !== 'object') return '';

          const lines = ['LOCAL FACTS FOUND'];

          if (facts.heroSection) {
            lines.push(`✓ Hero section: ${facts.heroSection.file}:${facts.heroSection.line}`);
            lines.push(`  ${facts.heroSection.text}`);
          } else {
            lines.push('✕ Hero section: not found in deterministic local facts');
          }

          if (facts.selectedWorkSection) {
            lines.push(`✓ Selected Work section: ${facts.selectedWorkSection.file}:${facts.selectedWorkSection.line}`);
            lines.push(`  ${facts.selectedWorkSection.text}`);
          } else {
            lines.push('✕ Selected Work section: not found in deterministic local facts');
          }

          if (facts.selectedWorkEditorId) {
            lines.push(`✓ Selected Work editor id: ${facts.selectedWorkEditorId.file}:${facts.selectedWorkEditorId.line}`);
          }

          if (facts.editorHeroOverride) {
            lines.push(`✓ Hero editor override: ${facts.editorHeroOverride.file}:${facts.editorHeroOverride.line}`);
          }

          if (facts.selectedWorkCarouselRoot || facts.selectedWorkCinemaJs) {
            lines.push('✓ Carousel detected: yes');
          } else {
            lines.push('Carousel detected: not confirmed');
          }

          if (facts.carouselSafetyRule) {
            lines.push(`Safety rule: ${facts.carouselSafetyRule}`);
          }

          return lines.join('\n');
        }

        const aiText = data.response || data.text || data.message || (
          Array.isArray(data.suggestions)
            ? data.suggestions.join('\n\n')
            : JSON.stringify(data, null, 2)
        );

        const localFactsText = renderLocalFactsSummary(data.localFacts);
        const genericAiLecture = /provided files and search terms|summary of relevant css properties|i can provide general information|simplified version of the html|simplified version of the relevant css|not able to access any specific file|there are no instances of|metadata extraction|Snippet 1|Snippet 2|Snippet 3|Snippet 4|Snippet 5|Snippet 6|<header class="hero"|Welcome to our cinema|Explore JBC Floral|jbc-floral-ring|jbc-floral-panel|Metadata|File:\s*index\.html|File:\s*css\/style\.css|This setup ensures|Here are some relevant snippets|```html|```css|```javascript/i.test(aiText || '');


        if (mode === 'evidence') {
          output.textContent = `${localFactsText}\n\nFILES SEARCHED:\n${(data.inspectedFiles || []).join(', ') || 'unknown'}\n\nSEARCH TERMS:\n${(data.terms || []).join(', ') || 'unknown'}\n\n${evidenceText}`;
        } else if (mode === 'analyze' || mode === 'propose') {
          output.textContent = humanizeAiEditorAnswer(aiText);
        } else {
          output.textContent = aiText;
        }
        return;
      } catch (err) {
        output.textContent = 'AI unavailable: ' + (err.message || err);
      }
    };
promptBox.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        ask('suggest');
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        ask('suggest');
      }
    });
  }

  async function fetchAiSuggestions(layers, x, y) {
    const aiSection = ctxMenu.querySelector('.ctx-ai-section');
    if (!aiSection) return;
    renderAiContextPanel(aiSection, layers, x, y);
  }

  document.addEventListener('click', e => {
    if (suppressNextCtxHide) {
      suppressNextCtxHide = false;
      return;
    }

    if (ctxMenu && ctxMenu.contains(e.target)) return;

    hideCtxMenu();
  });

  /* ── DRAGGABLE CONTEXT MENU ─────────────────────────── */
  const ctxDragHandle = document.getElementById('ctx-drag-handle');
  let ctxDragActive = false, ctxDragOX = 0, ctxDragOY = 0;

  ctxDragHandle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    ctxDragActive = true;
    ctxDragOX = e.clientX - ctxMenu.getBoundingClientRect().left;
    ctxDragOY = e.clientY - ctxMenu.getBoundingClientRect().top;
    ctxMenu.style.transition = 'none';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!ctxDragActive) return;
    const nx = Math.max(0, Math.min(e.clientX - ctxDragOX, window.innerWidth  - ctxMenu.offsetWidth));
    const ny = Math.max(0, Math.min(e.clientY - ctxDragOY, window.innerHeight - ctxMenu.offsetHeight));
    ctxMenu.style.left = nx + 'px';
    ctxMenu.style.top  = ny + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (ctxDragActive) {
      ctxDragActive = false;
      document.body.style.userSelect = '';
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      hideCtxMenu();
      setLayerMode('none');
      stopDragCapture();
      cancelAddMode();
    }
  });

  ctxMenu.querySelectorAll('.ctx-item').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      hideCtxMenu();
      handleCtxAction(btn.dataset.action);
    });
  });

  function handleCtxAction(action) {
    if (!win) return;

    const el = win.__jbc_ctx_el;

    const noElNeeded = ['add-layer', 'add-bg'];
    if (!el && !noElNeeded.includes(action)) {
      setStatus('No element selected — right-click on an element first');
      return;
    }

    /* ── EDIT ── */
    if (action === 'edit') {
      const tag = (el.tagName || '').toUpperCase();
      // IMG or PICTURE → image replace
      if (tag === 'IMG' || tag === 'PICTURE') {
        handleCtxAction('replace-img');
      } else {
        // Text editing for everything else
        win.__jbc_startTextEdit(null);
        barText.classList.remove('hidden');
        setStatus('Editing text — click Done when finished');
      }
    }

    /* ── DELETE ── */
    if (action === 'delete') {
      snapshot();
      win.__jbc_deleteEl();
      setStatus('Deleted');
    }

    /* ── MOVE ── */
    if (action === 'move') {
      snapshot(); // pre-move state so undo restores original position
      win.__jbc_startMove();
      setStatus('Drag to reposition — release to place');
    }

    /* ── DUPLICATE ── */
    if (action === 'duplicate') {
      snapshot();
      win.__jbc_duplicateEl();
      setStatus('Duplicated');
    }

    /* ── REPLACE IMAGE ── */
    if (action === 'replace-img') {
      openFilePicker(file => uploadFile(file, serverUrl => {
        snapshot();
        const tag = (el.tagName || '').toUpperCase();

        // Find the target img: direct hit first, then walk into / up from el
        let img = null;
        if (tag === 'IMG') {
          img = el;
        } else if (tag === 'PICTURE') {
          img = el.querySelector('img');
        } else {
          // Check direct children first (e.g. article.jbc-gs-card contains img)
          img = el.querySelector('img');
        }

        // If still no img, walk UP the tree.
        // This handles clicking a child div (e.g. .hero-bottom) inside a section that
        // itself contains a <picture><img class="hero-full-bg">.
        if (!img) {
          let walker = el.parentElement;
          while (walker && walker !== win.document.body) {
            const found = walker.querySelector('img');
            if (found) { img = found; break; }
            walker = walker.parentElement;
          }
        }

        // Last-resort fallback: if el has no img AND is a non-content overlay,
        // scan the iframe DOM directly for the hero image.
        if (!img) {
          img = win.document.querySelector('img.hero-full-bg') ||
                win.document.querySelector('section.hero img, .jbc-floral-hero img');
        }

        if (img) {
          img.src = serverUrl;
          img.removeAttribute('srcset');
          img.removeAttribute('sizes');
          // Clear all <source> elements in the parent <picture> so the browser
          // doesn't keep showing the old srcset image
          const pic = img.closest('picture');
          if (pic) pic.querySelectorAll('source').forEach(s => { s.srcset = ''; s.removeAttribute('srcset'); });
          // Also update the section background-image if this img is inside a hero section
          const heroSec = img.closest('section.hero, .jbc-floral-hero, [data-editor-id="hero-section"]');
          if (heroSec) {
            heroSec.style.setProperty('background-image', 'url(' + serverUrl + ')', 'important');
          }
          setStatus('Image replaced ✓ — Save to keep');
        } else {
          setStatus('No image found — right-click directly on the image and pick it in the layers panel');
        }
      }));
    }

    /* ── REPLACE BACKGROUND ── */
    if (action === 'replace-bg') {
      openFilePicker(file => uploadFile(file, dataUrl => {
        // Walk UP from el to find the element that actually has a background-image
        let target = el;
        while (target && target !== win.document.body) {
          const bg = win.getComputedStyle(target).backgroundImage;
          if (bg && bg !== 'none') break;
          target = target.parentElement;
        }
        // If walk-up hit body (no bg found), try closest section
        if (!target || target === win.document.body) {
          target = el.closest ? el.closest('section, header, footer') : null;
        }
        // Final fallback: if el is an overlay (e.g. page-transition), find the
        // nearest section in the iframe — most likely the hero
        if (!target || target === win.document.body) {
          target = win.document.querySelector('[data-editor-id="hero-section"], section.hero, section:first-of-type') || null;
        }
        if (!target) { setStatus('No section found — right-click on a section background'); return; }
        snapshot();
        target.style.setProperty('background-image',    'url(' + dataUrl + ')', 'important');
        target.style.setProperty('background-size',     'cover',                'important');
        target.style.setProperty('background-position', 'center center',        'important');
        target.style.setProperty('background-repeat',   'no-repeat',            'important');
        // If this section contains a hero-full-bg img, also update its src
        const bgImg = target.querySelector('img.hero-full-bg');
        if (bgImg) { bgImg.src = dataUrl; bgImg.removeAttribute('srcset'); }
        setStatus('Background replaced ✓ — Save to keep');
      }));
    }

    /* ── RESIZE OBJECT ── */
    if (action === 'resize-el') {
      snapshot(); // pre-resize state so undo restores original size
      win.__jbc_showResizeHandles();
      setStatus('Drag a corner to resize · right-click elsewhere to finish');
    }

    /* ── RESIZE SECTION ── */
    if (action === 'resize-section') {
      snapshot(); // pre-resize state so undo restores original height
      win.__jbc_showSectionHandle();
      setStatus('Drag the orange pill to resize section height');
    }

    /* ── ADD AS TOP LAYER (context menu) ── */
    if (action === 'add-layer') {
      startAddMode('layer');
    }

    /* ── SET AS BACKGROUND (context menu) ── */
    if (action === 'add-bg') {
      startAddMode('bg');
    }

    /* ── REMOVE BACKGROUND IMAGE ── */
    if (action === 'remove-bg') {
      let target = el;
      // Walk up to find the section/element that actually has a background-image
      while (target && target !== win.document.body) {
        const bg = win.getComputedStyle(target).backgroundImage;
        if (bg && bg !== 'none') break;
        target = target.parentElement;
      }
      if (!target || target === win.document.body) {
        target = el.closest ? el.closest('section, header, footer') : null;
      }
      if (!target || target === win.document.body) {
        target = win.document.querySelector('[data-editor-id="hero-section"], section.hero, section:first-of-type') || el;
      }
      snapshot();
      target.style.setProperty('background-image', 'none', 'important');
      setStatus('Background image removed ✓ — Save to keep');
    }

    /* ── IMAGE OVERLAY OPACITY ── */
    // Writes an opacity patch to editor-overrides.css for the detected image container class.
    // null = restore default (removes patch block so original CSS kicks back in).
    if (action === 'overlay-off')     { applyOverlayOpacity(0);    return; }
    if (action === 'overlay-low')     { applyOverlayOpacity(0.25); return; }
    if (action === 'overlay-mid')     { applyOverlayOpacity(0.5);  return; }
    if (action === 'overlay-high')    { applyOverlayOpacity(0.8);  return; }
    if (action === 'overlay-restore') { applyOverlayOpacity(null); return; }
  }

  /* ── FILE HELPERS ────────────────────────────────────── */
  function openFilePicker(callback) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.addEventListener('change', ev => { if (ev.target.files[0]) callback(ev.target.files[0]); });
    inp.click();
  }

  // Upload image to /api/upload-image → get back a server URL (not base64)
  // Falls back to base64 only if upload fails
  async function uploadFile(file, callback) {
    setStatus('Uploading image…');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: form });
      const json = await res.json();
      if (json.ok && json.url) {
        setStatus('Image uploaded ✓');
        callback(json.url);
        return;
      }
    } catch (e) { /* fall through to base64 */ }
    // Fallback: base64 (warns user)
    setStatus('⚠ Upload failed — using inline image (save will be larger)');
    const reader = new FileReader();
    reader.onload = ev => callback(ev.target.result);
    reader.readAsDataURL(file);
  }

  // Keep readFile for backward compat (drag-ghost preview still needs base64)
  function readFile(file, callback) {
    const reader = new FileReader();
    reader.onload = ev => callback(ev.target.result);
    reader.readAsDataURL(file);
  }

  /* ── ADD MODE ────────────────────────────────────────── */
  // mode: 'layer' | 'bg' | 'text'
  const imgOverlay = document.getElementById('img-overlay');

  function startAddMode(mode) {
    pendingAddMode = mode;
    if (mode === 'text') {
      removeDragGhost();
      startPlaceOverlay();
      setStatus('Click anywhere on the page to place a text block');
      return;
    }
    const hints = {
      layer: 'Upload image — then click on the page to place it',
      bg:    'Upload image to use as section background'
    };
    document.getElementById('upload-hint-txt').textContent = hints[mode] || '';
    uploadPanel.classList.remove('hidden');
  }

  function cancelAddMode() {
    pendingAddMode = null;
    pendingImage   = null;
    removeDragGhost();
  }

  /* ── PLUS BUTTON ─────────────────────────────────────── */
  if (btnPlus && plusDropdown) {
    btnPlus.addEventListener('click', e => {
      e.stopPropagation();
      plusDropdown.classList.toggle('hidden');
      btnPlus.classList.toggle('active');
    });

    plusDropdown.querySelectorAll('.plus-opt').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        plusDropdown.classList.add('hidden');
        btnPlus.classList.remove('active');
        const add = btn.dataset.add;
        if (add === 'text')  startAddMode('text');
        if (add === 'image') startAddMode('layer');
        if (add === 'bg')    startAddMode('bg');
      });
    });
  }

  /* ── UPLOAD PANEL ────────────────────────────────────── */
  btnCloseUp.addEventListener('click', () => {
    uploadPanel.classList.add('hidden');
    cancelAddMode();
  });

  fileInput.addEventListener('change', e => { if (e.target.files[0]) handleUploadedFile(e.target.files[0]); });

  dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleUploadedFile(e.dataTransfer.files[0]);
  });

  function handleUploadedFile(file) {
    if (!file.type.startsWith('image/')) { setStatus('Please upload an image file'); return; }
    // Always show ghost preview from base64 immediately (fast),
    // then upload to server in background for the actual saved URL
    readFile(file, previewUrl => {
      uploadPanel.classList.add('hidden');
      if (pendingAddMode === 'bg') {
        // Upload first, then apply server URL as background
        uploadFile(file, serverUrl => {
          applyImageAsBg(serverUrl);
          pendingAddMode = null;
        });
      } else {
        // Show ghost from preview for immediate feedback.
        // Upload runs in background — pendingImage.dataUrl gets upgraded to the
        // server URL before placement if upload wins the race; if the user places
        // the image first, the placed <img> element is captured in placedImgEl and
        // its src is upgraded once the server URL arrives.
        createDragGhost(previewUrl);
        startPlaceOverlay();
        setStatus('Click on the page to place the image — Esc to cancel');
        pendingImage = { dataUrl: previewUrl, placedImgEl: null };
        uploadFile(file, serverUrl => {
          if (!pendingImage) return; // placement already cleaned up — nothing to do
          if (pendingImage.placedImgEl) {
            // Image already placed with preview URL — upgrade src to server URL in DOM
            pendingImage.placedImgEl.src = serverUrl;
            pendingImage = null; // now fully done
          } else {
            // Not placed yet — upgrade the pending dataUrl so placement uses server URL
            pendingImage.dataUrl = serverUrl;
          }
        });
      }
    });
  }

  /* ── SET AS BACKGROUND (via upload) ─────────────────── */
  function applyImageAsBg(dataUrl) {
    if (!win) return;
    const el = win.__jbc_ctx_el;
    if (!el) {
      // No element selected — let user click a section
      setStatus('Now click the section you want to set this background on');
      startPlaceOverlay();
      // When they click, apply the bg to whatever section is under cursor
      const _origClick = placeOverlay && placeOverlay._clickHandler;
      if (placeOverlay) {
        placeOverlay.addEventListener('click', e => {
          const ix = e.clientX - frame.getBoundingClientRect().left;
          const iy = e.clientY - frame.getBoundingClientRect().top;
          const hitEl = win.document.elementFromPoint(ix, iy);
          if (hitEl) win.__jbc_ctx_el = hitEl;
          removeDragGhost();
          applyImageAsBg(dataUrl);
        }, { once: true });
      }
      return;
    }

    const STOP_TAGS    = ['SECTION','HEADER','FOOTER','MAIN','ARTICLE'];
    const STOP_IDS     = ['featured-work','jbc-visual-gallery','services-overview'];
    const STOP_CLASSES = ['manifesto','hero','testimonial-section','cta-section'];

    let target = el;
    while (target && target !== win.document.body && target !== win.document.documentElement) {
      const tag = (target.tagName || '').toUpperCase();
      if (STOP_TAGS.includes(tag)) break;
      if (STOP_IDS.some(s => (target.id || '') === s)) break;
      if (STOP_CLASSES.some(s => (target.className || '').includes(s))) break;
      target = target.parentElement;
    }
    if (!target || target === win.document.body || target === win.document.documentElement) {
      target = el.closest('section, header, footer, main');
    }
    if (!target) { setStatus('Could not find a section — right-click on the section background'); return; }

    snapshot();
    target.style.setProperty('background-image',    'url(' + dataUrl + ')', 'important');
    target.style.setProperty('background-size',     'cover',                'important');
    target.style.setProperty('background-position', 'center center',        'important');
    target.style.setProperty('background-repeat',   'no-repeat',            'important');

    // If target is the hero section, also update the <picture>/<img class="hero-full-bg">
    // so the visible full-bleed image actually changes
    if ((target.className || '').includes('hero') || target.dataset.editorId === 'hero-section') {
      const heroImg = target.querySelector('.hero-full-bg');
      if (heroImg) {
        heroImg.src = dataUrl;
        heroImg.srcset = '';
      }
      // Update all <source> elements inside the hero <picture>
      target.querySelectorAll('picture source').forEach(src => {
        src.srcset = dataUrl;
      });
    }

    const label = target.id ? '#' + target.id : (target.className || '').split(' ')[0];
    setStatus('Background set on [' + label + '] ✓ — Save to keep');
  }

  /* ── DRAG GHOST + PLACE OVERLAY ────────────────────────── */
  // An intercept overlay covers the iframe so clicks reach the parent,
  // not the iframe browsing context (iframe events don't bubble to parent).
  let placeOverlay = null;

  function createDragGhost(src) {
    removeDragGhost();
    dragGhost = document.createElement('img');
    dragGhost.id = 'drag-ghost';
    dragGhost.src = src;
    document.body.appendChild(dragGhost);
  }

  function removeDragGhost() {
    if (dragGhost) { dragGhost.remove(); dragGhost = null; }
    if (placeOverlay) {
      // Clean up the Escape key listener before removing overlay
      if (placeOverlay._keyHandler) {
        document.removeEventListener('keydown', placeOverlay._keyHandler);
        placeOverlay._keyHandler = null;
      }
      placeOverlay.remove();
      placeOverlay = null;
    }
  }

  function startPlaceOverlay() {
    if (placeOverlay) return;
    // Read frame bounds fresh so placement coords are always accurate
    const getFrameRect = () => frame.getBoundingClientRect();
    const fRect = getFrameRect();
    placeOverlay = document.createElement('div');
    placeOverlay.id = 'place-overlay';
    placeOverlay.style.cssText = [
      'position:fixed',
      'left:' + fRect.left + 'px',
      'top:' + fRect.top + 'px',
      'width:' + fRect.width + 'px',
      'height:' + fRect.height + 'px',
      'z-index:9998',
      'cursor:crosshair',
      'background:transparent'
    ].join(';');
    document.body.appendChild(placeOverlay);

    placeOverlay.addEventListener('click', e => {
      // Re-read the frame rect at click time — layout may have shifted since overlay was created
      const liveRect = getFrameRect();
      const ix = e.clientX - liveRect.left;
      const iy = e.clientY - liveRect.top;

      if (pendingAddMode === 'text') {
        removeDragGhost();
        if (win && win.__jbc_insertText) win.__jbc_insertText(ix, iy);
        pendingAddMode = null;
        return;
      }

      if (pendingImage && pendingAddMode !== 'bg') {
        removeDragGhost(); // removes overlay & cleans up key listener
        if (win && win.__jbc_insertImage) {
          try {
            const placedImg = win.__jbc_insertImage(pendingImage.dataUrl, ix, iy);
            // If upload is still in flight, keep a reference so we can upgrade the src
            if (pendingImage && placedImg && placedImg.src && pendingImage.dataUrl.startsWith('data:')) {
              pendingImage.placedImgEl = placedImg;
              // Don't null out pendingImage yet — the upload callback needs it
              pendingAddMode = null;
            } else {
              pendingImage   = null;
              pendingAddMode = null;
            }
          } catch (err) {
            pendingImage   = null;
            pendingAddMode = null;
            setStatus('Image placement error: ' + err.message);
          }
        } else {
          setStatus('Editor not ready — try reloading the page in the editor frame');
          pendingImage   = null;
          pendingAddMode = null;
        }
      }
    });

    // Escape key cancels placement — stored so removeDragGhost can clean it up
    placeOverlay._keyHandler = e => {
      if (e.key === 'Escape') { cancelAddMode(); setStatus('Placement cancelled'); }
    };
    document.addEventListener('keydown', placeOverlay._keyHandler);
  }

  document.addEventListener('mousemove', e => {
    if (!dragGhost) return;
    dragGhost.style.left = e.clientX + 'px';
    dragGhost.style.top  = e.clientY + 'px';
  });

  /* ── UNDO / REDO ─────────────────────────────────────── */
  btnUndo.addEventListener('click', undo);
  btnRedo.addEventListener('click', redo);
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveHTML(); }
  });

  /* ── SAVE ────────────────────────────────────────────── */
  btnSave.addEventListener('click', saveHTML);

  async function saveHTML() {
    if (!doc) return;
    setStatus('Saving…');
    try {
      // Stop any active text edit first so contenteditable is cleared
      if (win && win.__jbc_stopTextEdit) win.__jbc_stopTextEdit();
      barText.classList.add('hidden');

      // Strip editor-injected elements before serialising
      ['__jbc_agent__', '__jbc_agent_css__', '__jbc_resize_ovl', '__jbc_sec_handle'].forEach(id => {
        const el = doc.getElementById(id);
        if (el) el.remove();
      });

      // Client-side: clear layer highlight class and body lightbox-open lock
      doc.querySelectorAll('.__jbc_layer_hi').forEach(el => el.classList.remove('__jbc_layer_hi'));
      doc.body.classList.remove('jbc-gallery-lightbox-open');
      const lb = doc.getElementById('jbc-gallery-lightbox');
      if (lb) {
        lb.classList.remove('jbc-gallery-lightbox--open');
        lb.setAttribute('aria-hidden', 'true');
        const lbImg = lb.querySelector('.jbc-gallery-lightbox__img');
        if (lbImg) lbImg.classList.remove('jbc-gallery-lightbox__img--switching');
      }

      // ── Strip scroll-animation runtime states ──────────────────────────────
      // JS animations write transform/opacity/filter/will-change/transition as
      // inline styles.  We must remove these before serialising so the saved
      // HTML doesn't open in a broken mid-animation state.
      // We only strip the specific animation-driven properties; every other
      // inline style (position, background-image, width, color …) is preserved.
      (function stripAnimationStates(d) {
        d.querySelectorAll('[style]').forEach(function(el) {
          var st = el.style;

          // transition in inline style is always animation-injected (should live in CSS)
          st.removeProperty('transition');

          // will-change is always set by animation JS
          st.removeProperty('will-change');

          // filter: blur(...) is only ever written by scroll animations
          var flt = st.getPropertyValue('filter');
          if (flt && flt.includes('blur')) st.removeProperty('filter');

          // transform: only remove animation-driven variants (translateY, translateX,
          // translate3d, scale, rotate).  matrix() is skipped as it could be intentional.
          var tf = st.getPropertyValue('transform');
          if (tf && !tf.startsWith('matrix(') && (
                tf.includes('translate') || tf.includes('scale') || tf.includes('rotate')
              )) {
            st.removeProperty('transform');
          }

          // opacity: only remove if it was set by animation (value < 1).
          // A user deliberately setting opacity:0 to hide an element is an edge case
          // we accept — the server sanitiser catches any remaining cases.
          var op = st.getPropertyValue('opacity');
          if (op !== '' && parseFloat(op) < 1) st.removeProperty('opacity');

          // JBC CSS custom properties (--jbc-card-offset, --jbc-card-rotate, etc.)
          // are all animation-written; strip them from the style attribute directly.
          var raw = el.getAttribute('style');
          if (raw && raw.includes('--jbc-')) {
            var cleaned = raw.replace(/--jbc-[^:]+\s*:[^;]+;?\s*/g, '').trim();
            if (cleaned) el.setAttribute('style', cleaned);
            else         el.removeAttribute('style');
          }

          // If the style attribute is now empty, remove it entirely
          if (el.getAttribute('style') === '') el.removeAttribute('style');
        });

        // Also strip portfolio-grid dynamic height (set by scroll-jacking JS)
        var pg = d.querySelector('.portfolio-grid');
        if (pg) pg.style.removeProperty('height');

        // Reset navbar to natural position if it was nudged by scroll JS
        var nav = d.querySelector('nav#navbar, nav.navbar, header nav');
        if (nav) nav.style.removeProperty('transform');

      })(doc);
      // ── End animation state strip ──────────────────────────────────────────

      const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
      injectAgent(); // re-inject so page stays editable

      const res  = await fetch('/api/save-html', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ page: currentPage, html })
      });
      const json = await res.json().catch(() => ({ ok: false }));
      if (json.ok) {
        dirty = false;
        setStatus('Saved ✓');
      } else {
        throw new Error(json.error || 'Save failed');
      }
    } catch (err) {
      setStatus('Save error: ' + err.message);
      console.error(err);
    }
  }

  /* ── PAGE SELECT ─────────────────────────────────────── */
  pageSelect.addEventListener('change', () => {
    if (dirty && !confirm('You have unsaved changes. Switch page anyway?')) {
      pageSelect.value = currentPage;
      return;
    }
    setLayerMode('none');
    stopTextEdit();
    stopDragCapture();
    cancelAddMode();
    dirty = false;
    undoStack = [];
    redoStack = [];
    loadPage(pageSelect.value);
  });

  /* ── VIEWPORT TOGGLE (Desktop / Mobile) ─────────────── */
  function buildPhoneShell() {
    const shell = document.createElement('div');
    shell.id = 'phone-shell';

    const statusBar = document.createElement('div');
    statusBar.id = 'phone-status-bar';
    statusBar.innerHTML = `
      <span class="status-time">${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
      <span class="status-icons">
        <svg width="15" height="11" viewBox="0 0 15 11" fill="white"><rect x="0" y="3" width="3" height="8" rx="1"/><rect x="4" y="2" width="3" height="9" rx="1"/><rect x="8" y="0" width="3" height="11" rx="1"/><rect x="12" y="0" width="3" height="11" rx="1" opacity=".3"/></svg>
        <svg width="14" height="11" viewBox="0 0 24 18" fill="none" stroke="white" stroke-width="2"><path d="M1 8.5C3.5 5.5 7.5 3.5 12 3.5s8.5 2 11 5"/><path d="M4.5 12C6.5 9.5 9 8 12 8s5.5 1.5 7.5 4"/><path d="M8.5 15.5C9.8 14 10.9 13 12 13s2.2 1 3.5 2.5"/><circle cx="12" cy="18" r="1.5" fill="white" stroke="none"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" stroke-opacity=".35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="white"/><path d="M23 4v4a2 2 0 000-4z" fill="white" opacity=".4"/></svg>
      </span>
    `;

    const homeBar = document.createElement('div');
    homeBar.id = 'phone-home-bar';

    shell.appendChild(statusBar);
    shell.appendChild(frame);
    shell.appendChild(homeBar);
    return shell;
  }

  let phoneShell = null;
  let phoneLabel = null;

  function setViewMode(mode) {
    if (mode === viewMode) return;
    if (dirty && !confirm('Switching view will reload the page. Unsaved changes will be lost. Continue?')) return;
    dirty = false;
    stopDragCapture();
    viewMode = mode;

    vpToggle.querySelectorAll('.vp-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.vp === mode));

    if (mode === 'mobile') {
      canvasWrap.classList.add('canvas-mobile');
      if (!phoneShell) {
        phoneShell = buildPhoneShell();
        canvasWrap.appendChild(phoneShell);
      } else {
        phoneShell.style.display = '';
        if (frame.parentElement !== phoneShell) {
          phoneShell.insertBefore(frame, phoneShell.querySelector('#phone-home-bar'));
        }
      }
      if (!phoneLabel) {
        phoneLabel = document.createElement('div');
        phoneLabel.id = 'phone-label';
        phoneLabel.textContent = '390px — Mobile';
        canvasWrap.appendChild(phoneLabel);
      }
      phoneLabel.style.display = '';
    } else {
      canvasWrap.classList.remove('canvas-mobile');
      if (phoneShell) {
        if (frame.parentElement === phoneShell) canvasWrap.insertBefore(frame, phoneShell);
        phoneShell.style.display = 'none';
      }
      if (phoneLabel) phoneLabel.style.display = 'none';
    }

    loadPage(currentPage);
  }

  function applyMobileViewport(targetDoc) {
    let vp = targetDoc.querySelector('meta[name="viewport"]');
    if (!vp) { vp = targetDoc.createElement('meta'); vp.name = 'viewport'; targetDoc.head.appendChild(vp); }
    vp.content = 'width=390, initial-scale=1, maximum-scale=1';
  }

  vpToggle.querySelectorAll('.vp-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.dataset.vp !== viewMode) setViewMode(btn.dataset.vp);
    });
  });

  /* ── INIT ────────────────────────────────────────────── */
  // Always reset to Home on load — prevents browser from restoring a stale
  // page-select value and accidentally switching to About/Services etc.
  currentPage = 'index.html';
  pageSelect.value = 'index.html';
  loadPage(currentPage);

})();
