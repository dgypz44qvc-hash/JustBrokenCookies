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
      [contenteditable="true"] { outline:2px dashed rgba(232,137,29,0.8) !important; outline-offset:2px !important; }
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

  /* ── HELPERS ── */
  function scrollX() { return window.scrollX || window.pageXOffset || 0; }
  function scrollY() { return window.scrollY || window.pageYOffset || 0; }

  /* ── MODE / HOVER ── */
  var mode    = 'none';
  var hovered = null;

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
    window.parent.postMessage({
      type:     'jbc_contextmenu',
      x:        e.clientX + frameRect.left,
      y:        e.clientY + frameRect.top,
      selector: selectorFor(e.target),
      tagName:  e.target.tagName,
      text:     (e.target.innerText || '').slice(0, 80)
    }, '*');
    window.__jbc_ctx_el = e.target;
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
    moveEl.classList.remove('__jbc_selected');
    moveEl = null; moveReady = false;
    window.parent.postMessage({ type: 'jbc_move_done' }, '*');
  }

  window.__jbc_startMove = function() {
    var el = window.__jbc_ctx_el;
    if (!el) return;

    var parentEl = el.offsetParent || el.parentElement;
    if (parentEl && window.getComputedStyle(parentEl).position === 'static') {
      parentEl.style.position = 'relative';
    }

    var elRect     = el.getBoundingClientRect();
    var offsetEl   = el.offsetParent || el.parentElement || document.body;
    var offsetRect = offsetEl.getBoundingClientRect();

    moveStartLeft = elRect.left - offsetRect.left + offsetEl.scrollLeft;
    moveStartTop  = elRect.top  - offsetRect.top  + offsetEl.scrollTop;

    el.style.position = 'absolute';
    el.style.left     = moveStartLeft + 'px';
    el.style.top      = moveStartTop  + 'px';
    el.style.zIndex   = '9999';
    el.classList.add('__jbc_selected');

    moveReady = false;
    moveEl    = el;

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
    clone.style.position = 'relative';
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

    // Check if click lands ON an existing editor image → replace its src instead of adding
    var hit = document.elementFromPoint(x, y);
    if (hit) {
      var hitWrap = hit.closest ? hit.closest('.editor-decoration.editor-image') : null;
      if (hitWrap) {
        var hitImg = hitWrap.querySelector('img');
        if (hitImg) {
          hitImg.src = dataUrl;
          hitImg.removeAttribute('srcset');
          hitImg.removeAttribute('sizes');
          window.parent.postMessage({ type: 'jbc_image_placed' }, '*');
          return;
        }
      }
    }

    // Check if click is inside the bounding box of any existing editor image
    // (handles saved-and-reloaded images which are already in the DOM)
    var allImgWraps = document.querySelectorAll('.editor-decoration.editor-image');
    for (var i = 0; i < allImgWraps.length; i++) {
      var r = allImgWraps[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        var eImg = allImgWraps[i].querySelector('img');
        if (eImg) {
          eImg.src = dataUrl;
          eImg.removeAttribute('srcset');
          eImg.removeAttribute('sizes');
          window.parent.postMessage({ type: 'jbc_image_placed' }, '*');
          return;
        }
      }
    }

    // No existing image at click point — create a new one
    var docX = Math.round(x + scrollX());
    var docY = Math.round(y + scrollY());

    var div = document.createElement('div');
    div.className = 'editor-decoration editor-image';
    div.dataset.editorId = 'img-' + Date.now();
    div.style.cssText = 'position:absolute;left:' + docX + 'px;top:' + docY + 'px;width:280px;height:auto;z-index:200;cursor:grab;';

    var img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'display:block;width:100%;height:auto;border-radius:4px;pointer-events:none;';
    div.appendChild(img);
    parent.appendChild(div);

    // Per-image mousedown to start drag (references shared _inlineDragEl)
    div.addEventListener('mousedown', function(e) {
      e.preventDefault(); e.stopPropagation();
      var r = div.getBoundingClientRect();
      _inlineDragOX = e.clientX - r.left;
      _inlineDragOY = e.clientY - r.top;
      _inlineDragEl = div;
      div.style.cursor = 'grabbing';
      window.parent.postMessage({ type: 'jbc_drag_start', cursor: 'grabbing' }, '*');
    });

    window.parent.postMessage({ type: 'jbc_image_placed' }, '*');
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
    target.style.width  = newW + 'px';
    target.style.height = newH + 'px';
    if ((_rDir === 'nw' || _rDir === 'sw') && target.style.position === 'absolute') {
      target.style.left = (_rSL + (_rSW - newW)) + 'px';
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
    }

    if (type === 'jbc_layerclick') {
      handleLayerClick(e.data);
    }

    if (type === 'jbc_drag_start')  { startDragCapture(e.data.cursor || 'grabbing'); }
    if (type === 'jbc_move_done')   { stopDragCapture(); snapshot(); }
    if (type === 'jbc_resize_done') { stopDragCapture(); snapshot(); }

    if (type === 'jbc_image_placed') {
      snapshot();
      setStatus('Image placed — right-click to resize, move or delete · Save when done');
    }

    if (type === 'jbc_text_placed') {
      snapshot();
      barText.classList.remove('hidden');
      setStatus('Text placed — format it above, then click Done');
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
    setStatus('Text saved');
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
  function showCtxMenu(x, y) {
    hideCtxMenu();
    ctxMenu.style.left = Math.min(x, window.innerWidth  - 210) + 'px';
    ctxMenu.style.top  = Math.min(y, window.innerHeight - 290) + 'px';
    ctxMenu.classList.remove('hidden');
  }

  function hideCtxMenu() { ctxMenu.classList.add('hidden'); }

  document.addEventListener('click', hideCtxMenu);
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
      if (tag === 'IMG' || tag === 'PICTURE') {
        openFilePicker(file => readFile(file, dataUrl => {
          snapshot();
          const img = tag === 'PICTURE' ? el.querySelector('img') : el;
          if (img) { img.src = dataUrl; img.removeAttribute('srcset'); img.removeAttribute('sizes'); }
          setStatus('Image replaced ✓');
        }));
      } else {
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
      openFilePicker(file => readFile(file, dataUrl => {
        snapshot();
        const tag = (el.tagName || '').toUpperCase();
        const img = tag === 'IMG'     ? el
                  : tag === 'PICTURE' ? el.querySelector('img')
                  : el.querySelector('img');
        if (img) {
          img.src = dataUrl;
          img.removeAttribute('srcset');
          img.removeAttribute('sizes');
          setStatus('Image replaced ✓');
        } else {
          setStatus('No <img> found — right-click directly on the image');
        }
      }));
    }

    /* ── REPLACE BACKGROUND ── */
    if (action === 'replace-bg') {
      openFilePicker(file => readFile(file, dataUrl => {
        let target = el;
        while (target && target !== win.document.body) {
          const bg = win.getComputedStyle(target).backgroundImage;
          if (bg && bg !== 'none') break;
          target = target.parentElement;
        }
        if (!target || target === win.document.body) {
          target = el.closest('section, header, footer') || el;
        }
        snapshot();
        target.style.setProperty('background-image',    'url(' + dataUrl + ')', 'important');
        target.style.setProperty('background-size',     'cover',                'important');
        target.style.setProperty('background-position', 'center center',        'important');
        target.style.setProperty('background-repeat',   'no-repeat',            'important');
        setStatus('Background replaced ✓ — Save to keep');
      }));
    }

    /* ── RESIZE OBJECT ── */
    if (action === 'resize-el') {
      win.__jbc_showResizeHandles();
      setStatus('Drag a corner to resize · right-click elsewhere to finish');
    }

    /* ── RESIZE SECTION ── */
    if (action === 'resize-section') {
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
        target = el.closest('section, header, footer') || el;
      }
      snapshot();
      target.style.setProperty('background-image', 'none', 'important');
      setStatus('Background image removed ✓ — Save to keep');
    }
  }

  /* ── FILE HELPERS ────────────────────────────────────── */
  function openFilePicker(callback) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.addEventListener('change', ev => { if (ev.target.files[0]) callback(ev.target.files[0]); });
    inp.click();
  }

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
    readFile(file, dataUrl => {
      uploadPanel.classList.add('hidden');
      if (pendingAddMode === 'bg') {
        applyImageAsBg(dataUrl);
        pendingAddMode = null;
      } else {
        pendingImage = { dataUrl };
        createDragGhost(dataUrl);
        setStatus('Click anywhere on the page to place the image');
      }
    });
  }

  /* ── SET AS BACKGROUND (via upload) ─────────────────── */
  function applyImageAsBg(dataUrl) {
    if (!win) return;
    const el = win.__jbc_ctx_el;
    if (!el) { setStatus('Right-click inside a section first, then choose Set as Background'); return; }

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

    const label = target.id ? '#' + target.id : (target.className || '').split(' ')[0];
    setStatus('Background set on [' + label + '] ✓ — Save to keep');
  }

  /* ── DRAG GHOST (cursor-following image preview) ─────── */
  function createDragGhost(src) {
    removeDragGhost();
    dragGhost = document.createElement('img');
    dragGhost.id = 'drag-ghost';
    dragGhost.src = src;
    document.body.appendChild(dragGhost);
  }

  function removeDragGhost() {
    if (dragGhost) { dragGhost.remove(); dragGhost = null; }
  }

  document.addEventListener('mousemove', e => {
    if (!dragGhost) return;
    dragGhost.style.left = e.clientX + 'px';
    dragGhost.style.top  = e.clientY + 'px';
  });

  /* ── CLICK CANVAS TO PLACE ───────────────────────────── */
  canvasWrap.addEventListener('click', e => {
    if (!pendingAddMode && !pendingImage) return;

    const fRect = frame.getBoundingClientRect();
    const ix = e.clientX - fRect.left;
    const iy = e.clientY - fRect.top;

    // Only place if click is inside the actual iframe viewport
    if (ix < 0 || iy < 0 || ix > frame.offsetWidth || iy > frame.offsetHeight) return;

    if (pendingAddMode === 'text') {
      removeDragGhost();
      if (win && win.__jbc_insertText) win.__jbc_insertText(ix, iy);
      pendingAddMode = null;
      return;
    }

    if (pendingImage && pendingAddMode !== 'bg') {
      removeDragGhost();
      if (win && win.__jbc_insertImage) win.__jbc_insertImage(pendingImage.dataUrl, ix, iy);
      pendingImage   = null;
      pendingAddMode = null;
    }
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
      // Strip editor-injected elements before serialising
      ['__jbc_agent__', '__jbc_agent_css__', '__jbc_resize_ovl', '__jbc_sec_handle'].forEach(id => {
        const el = doc.getElementById(id);
        if (el) el.remove();
      });

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
  loadPage(currentPage);

})();
