/* ============================================================
   JBC EDITOR — Clean Single Topbar Logic
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

  /* ── STATE ───────────────────────────────────────────── */
  let doc          = null;
  let win          = null;
  let layerMode    = 'none';   // 'none' | 'page-bg' | 'text' | 'section-bg'
  let viewMode     = 'desktop'; // 'desktop' | 'mobile'
  let ctxTarget    = null;     // element right-clicked
  let textTarget   = null;     // element being edited as text
  let moveTarget   = null;     // element being moved
  let pendingImage = null;     // { dataUrl, mimeType } waiting to be placed
  let undoStack    = [];
  let redoStack    = [];
  let htmlSource   = '';
  let dirty        = false;
  let currentPage  = 'index.html';
  let dragGhost    = null;

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

  /* ── LOAD FRAME ──────────────────────────────────────── */
  function loadPage(page) {
    currentPage = page;
    setStatus('Loading…');
    frame.src = page + '?editor=1&t=' + Date.now();
  }

  frame.addEventListener('load', () => {
    try {
      doc = frame.contentDocument;
      win = frame.contentWindow;
      injectAgent();
      // Re-apply mobile viewport after every page load if in mobile mode
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

    // Remove any existing agent
    const existing = doc.getElementById('__jbc_agent__');
    if (existing) existing.remove();

    // Inject agent CSS
    let agentStyle = doc.getElementById('__jbc_agent_css__');
    if (!agentStyle) {
      agentStyle = doc.createElement('style');
      agentStyle.id = '__jbc_agent_css__';
      doc.head.appendChild(agentStyle);
    }
    agentStyle.textContent = `
      .__jbc_hover { outline: 2px solid rgba(232,137,29,0.6) !important; outline-offset:2px !important; cursor:pointer !important; }
      .__jbc_selected { outline: 2px solid #E8891D !important; outline-offset:2px !important; }
      .__jbc_move_active { cursor: grabbing !important; }
      [contenteditable="true"] { outline: 2px dashed rgba(232,137,29,0.8) !important; outline-offset:2px !important; }
    `;

    // Inject agent script
    const script = doc.createElement('script');
    script.id = '__jbc_agent__';
    script.textContent = agentScriptText();
    doc.body.appendChild(script);

    // Apply current layer mode
    win.__jbc_setMode && win.__jbc_setMode(layerMode);
  }

  function agentScriptText() {
    return `
(function() {
  if (window.__jbc_agent_init) return;
  window.__jbc_agent_init = true;

  let mode = 'none';
  let hovered = null;
  let moveEl = null;
  let moveReady = false;
  let moveStartMouseX = 0, moveStartMouseY = 0;
  let moveStartLeft   = 0, moveStartTop    = 0;

  const TEXT_SEL = 'h1,h2,h3,h4,h5,h6,p,span,a,button,.btn,blockquote,cite,li,label,strong,em';
  const BGIMG_SEL = 'section,div[class*="hero"],div[class*="floral"],div[class*="bg"],img,picture,.hero-full-bg';
  const SECBG_SEL = 'section,[class*="section"],[id*="section"],#featured-work,#jbc-visual-gallery,.testimonial-section,.cta-section,footer';

  function selectorFor(el) {
    if (el.id) return '#' + el.id;
    if (el.dataset.editorId) return '[data-editor-id="' + el.dataset.editorId + '"]';
    return el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : '');
  }

  function unhover() {
    if (hovered) { hovered.classList.remove('__jbc_hover'); hovered = null; }
  }

  function getModeSelector() {
    if (mode === 'text') return TEXT_SEL;
    if (mode === 'page-bg') return BGIMG_SEL;
    if (mode === 'section-bg') return SECBG_SEL;
    return null;
  }

  document.addEventListener('mouseover', e => {
    if (mode === 'none') return;
    const sel = getModeSelector();
    if (!sel) return;
    const el = e.target.closest(sel);
    if (el === hovered) return;
    unhover();
    if (el && !el.id?.includes('jbc_agent')) {
      hovered = el;
      hovered.classList.add('__jbc_hover');
    }
  }, true);

  document.addEventListener('mouseout', () => {
    if (mode === 'none') return;
    unhover();
  }, true);

  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    unhover();
    const rect = document.documentElement.getBoundingClientRect();
    const frameRect = window.frameElement ? window.frameElement.getBoundingClientRect() : { left:0, top:0 };
    window.parent.postMessage({
      type: 'jbc_contextmenu',
      x: e.clientX + frameRect.left,
      y: e.clientY + frameRect.top,
      selector: selectorFor(e.target),
      tagName: e.target.tagName,
      text: e.target.innerText?.slice(0,80) || ''
    }, '*');
    window.__jbc_ctx_el = e.target;
  }, true);

  document.addEventListener('click', e => {
    if (mode === 'none') return;
    e.preventDefault();
    e.stopPropagation();
    unhover();
    window.parent.postMessage({
      type: 'jbc_layerclick',
      mode: mode,
      selector: selectorFor(e.target),
      tagName: e.target.tagName,
      text: e.target.innerText?.slice(0,80) || '',
      currentSrc: e.target.tagName === 'IMG' ? e.target.src : '',
      bgImage: getComputedStyle(e.target).backgroundImage || ''
    }, '*');
    window.__jbc_layer_el = e.target;
  }, true);

  // Move handling — delta-based, position:absolute, no jumping
  document.addEventListener('mousemove', e => {
    if (!moveEl) return;
    e.preventDefault();
    if (!moveReady) {
      // First move event after startMove — lock in mouse start position
      moveStartMouseX = e.clientX;
      moveStartMouseY = e.clientY;
      moveReady = true;
    }
    const dx = e.clientX - moveStartMouseX;
    const dy = e.clientY - moveStartMouseY;
    moveEl.style.left = (moveStartLeft + dx) + 'px';
    moveEl.style.top  = (moveStartTop  + dy) + 'px';
  }, true);

  document.addEventListener('mouseup', e => {
    if (!moveEl) return;
    moveEl.classList.remove('__jbc_selected');
    moveEl    = null;
    moveReady = false;
    window.parent.postMessage({ type: 'jbc_move_done' }, '*');
  }, true);

  window.__jbc_setMode = function(m) {
    mode = m;
    unhover();
  };

  window.__jbc_startMove = function() {
    const el = window.__jbc_ctx_el;
    if (!el) return;

    // Ensure the offsetParent is positioned so absolute children render correctly
    const parent = el.offsetParent || el.parentElement;
    if (parent && window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    // Compute where the element currently is, relative to its offsetParent
    const elRect     = el.getBoundingClientRect();
    const parentEl   = el.offsetParent || el.parentElement || document.body;
    const parentRect = parentEl.getBoundingClientRect();

    moveStartLeft = elRect.left - parentRect.left + parentEl.scrollLeft;
    moveStartTop  = elRect.top  - parentRect.top  + parentEl.scrollTop;

    // Switch to position:absolute at the exact current visual location (no jump)
    el.style.position = 'absolute';
    el.style.left     = moveStartLeft + 'px';
    el.style.top      = moveStartTop  + 'px';
    el.style.zIndex   = '9999';
    el.classList.add('__jbc_selected');

    moveReady = false;   // will capture mouse start on first mousemove
    moveEl    = el;
  };

  window.__jbc_startTextEdit = function(selector) {
    const el = selector ? document.querySelector(selector) : window.__jbc_ctx_el;
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

  window.__jbc_deleteEl = function(selector) {
    const el = selector ? document.querySelector(selector) : window.__jbc_ctx_el;
    if (el) el.remove();
  };

  window.__jbc_duplicateEl = function(selector) {
    const el = selector ? document.querySelector(selector) : window.__jbc_ctx_el;
    if (!el) return;
    const clone = el.cloneNode(true);
    clone.removeAttribute('id');
    el.parentNode.insertBefore(clone, el.nextSibling);
    clone.style.position = 'relative';
  };

  window.__jbc_insertImage = function(dataUrl, x, y) {
    // x, y are iframe viewport coords (from elementFromPoint — same space)

    // Find section at click point — same technique as original editor
    const hit = document.elementFromPoint(x, y);
    let parent = hit && hit.closest ? hit.closest('section, footer, header') : null;
    if (!parent) parent = document.querySelector('section') || document.body;

    // Ensure parent is positioned so absolute children work
    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    // SWAP instead of STACK — if this section already has an editor-image layer,
    // replace its src rather than inserting another element on top.
    const existingImg = parent.querySelector('.editor-image img, .editor-decoration.editor-image img');
    if (existingImg) {
      existingImg.src = dataUrl;
      existingImg.removeAttribute('srcset');
      existingImg.removeAttribute('sizes');
      window.parent.postMessage({ type: 'jbc_image_placed' }, '*');
      return;
    }

    // Coords relative to parent (original editor formula)
    const pRect = parent.getBoundingClientRect();
    const left  = Math.max(0, Math.round(x - pRect.left + parent.scrollLeft));
    const top   = Math.max(0, Math.round(y - pRect.top  + parent.scrollTop));

    // Wrap in div.editor-decoration — same as original
    const div = document.createElement('div');
    div.className = 'editor-decoration editor-image';
    div.dataset.editorId = 'added-' + Date.now();
    div.style.position = 'absolute';
    div.style.left     = left + 'px';
    div.style.top      = top  + 'px';
    div.style.width    = '300px';
    div.style.height   = 'auto';
    div.style.zIndex   = '100';
    div.style.cursor   = 'grab';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'display:block;width:100%;height:auto;border-radius:4px;pointer-events:none;';
    div.appendChild(img);

    parent.insertBefore(div, parent.firstChild);

    // Make it draggable inside the section
    let dragging = false, ox = 0, oy = 0;
    div.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      dragging = true;
      const r = div.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      div.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const pr = parent.getBoundingClientRect();
      div.style.left = Math.max(0, e.clientX - pr.left - ox + parent.scrollLeft) + 'px';
      div.style.top  = Math.max(0, e.clientY - pr.top  - oy + parent.scrollTop)  + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      div.style.cursor = 'grab';
      window.parent.postMessage({ type: 'jbc_move_done' }, '*');
    });

    window.parent.postMessage({ type: 'jbc_image_placed' }, '*');
  };

  // ── IN-PAGE RESIZE HANDLES (corner drag, aspect-ratio locked) ──
  var _rEl = null, _rOvl = null, _rDir = null;
  var _rSX, _rSW, _rSH, _rSL, _rAR;

  function _rUpdatePos() {
    if (!_rOvl || !_rEl) return;
    var r = _rEl.getBoundingClientRect();
    _rOvl.style.left   = r.left   + 'px';
    _rOvl.style.top    = r.top    + 'px';
    _rOvl.style.width  = r.width  + 'px';
    _rOvl.style.height = r.height + 'px';
  }

  function _rCleanup() {
    if (_rOvl) { _rOvl.remove(); _rOvl = null; }
    document.removeEventListener('mousemove', _rOnMove, true);
    document.removeEventListener('mouseup',   _rOnUp,   true);
    document.removeEventListener('scroll',    _rUpdatePos, true);
    _rEl = null; _rDir = null;
  }

  function _rOnMove(ev) {
    if (!_rDir || !_rEl) return;
    ev.preventDefault();
    var dx = ev.clientX - _rSX;
    var newW = (_rDir === 'se' || _rDir === 'ne')
      ? Math.max(40, _rSW + dx)
      : Math.max(40, _rSW - dx);
    var newH = newW / _rAR;
    var target = _rEl.closest('.editor-decoration.editor-image') || _rEl;
    target.style.width  = newW + 'px';
    target.style.height = newH + 'px';
    if ((_rDir === 'nw' || _rDir === 'sw') && target.style.position === 'absolute') {
      target.style.left = (_rSL + (_rSW - newW)) + 'px';
    }
    _rUpdatePos();
  }

  function _rOnUp() {
    if (_rDir) {
      _rDir = null;
      window.parent.postMessage({ type: 'jbc_resize_done' }, '*');
    }
  }

  window.__jbc_showResizeHandles = function() {
    var el = window.__jbc_ctx_el;
    if (!el) return;
    _rCleanup();
    var target = el.closest('.editor-decoration.editor-image') || el;
    _rEl = target;
    var img = (target.tagName === 'IMG') ? target : target.querySelector('img');
    _rAR = (img && img.naturalWidth && img.naturalHeight)
      ? img.naturalWidth / img.naturalHeight
      : (target.offsetWidth / (target.offsetHeight || 1));
    _rSL = parseInt(target.style.left) || 0;
    _rOvl = document.createElement('div');
    _rOvl.id = '__jbc_resize_ovl';
    _rOvl.style.cssText = 'position:fixed;outline:2px solid #E8891D;outline-offset:1px;z-index:99998;pointer-events:none;box-sizing:border-box;';
    _rUpdatePos();
    var DIRS = ['nw','ne','sw','se'];
    var CURSORS = { nw:'nw-resize', ne:'ne-resize', sw:'sw-resize', se:'se-resize' };
    DIRS.forEach(function(d) {
      var h = document.createElement('div');
      h.style.cssText = 'position:absolute;width:12px;height:12px;background:#E8891D;border:2px solid #fff;border-radius:2px;pointer-events:all;box-sizing:border-box;cursor:' + CURSORS[d] + ';z-index:99999;';
      if (d[0] === 'n') { h.style.top = '-6px'; } else { h.style.bottom = '-6px'; }
      if (d[1] === 'w') { h.style.left = '-6px'; } else { h.style.right = '-6px'; }
      h.addEventListener('mousedown', function(ev) {
        ev.stopPropagation(); ev.preventDefault();
        _rDir = d;
        _rSX = ev.clientX;
        var r = _rEl.getBoundingClientRect();
        _rSW = r.width; _rSH = r.height;
        _rSL = parseInt(_rEl.style.left) || 0;
      });
      _rOvl.appendChild(h);
    });
    document.body.appendChild(_rOvl);
    document.addEventListener('mousemove', _rOnMove, true);
    document.addEventListener('mouseup',   _rOnUp,   true);
    document.addEventListener('scroll',    _rUpdatePos, true);
  };

  // ── SECTION HEIGHT DRAG HANDLE ──────────────────────────────
  var _secEl = null, _secHandle = null;

  function _secUpdatePos() {
    if (!_secEl || !_secHandle) return;
    var r = _secEl.getBoundingClientRect();
    _secHandle.style.left  = (r.left + r.width * 0.25) + 'px';
    _secHandle.style.top   = (r.bottom - 10) + 'px';
    _secHandle.style.width = (r.width * 0.5)  + 'px';
  }

  function _secCleanup() {
    if (_secHandle) { _secHandle.remove(); _secHandle = null; }
    document.removeEventListener('scroll', _secUpdatePos, true);
    _secEl = null;
  }

  window.__jbc_showSectionHandle = function() {
    var el = window.__jbc_ctx_el;
    if (!el) return;
    _secCleanup();
    var sec = el.closest('section,footer,header,.testimonial-section,.cta-section,#featured-work,#jbc-visual-gallery') || el;
    _secEl = sec;
    _secHandle = document.createElement('div');
    _secHandle.id = '__jbc_sec_handle';
    _secHandle.innerHTML = '<span style="pointer-events:none;color:#fff;font-size:10px;letter-spacing:2px;user-select:none;">⠿ drag to resize ⠿</span>';
    _secHandle.style.cssText = 'position:fixed;height:22px;background:rgba(232,137,29,0.88);cursor:ns-resize;z-index:99999;display:flex;align-items:center;justify-content:center;border-radius:11px;box-shadow:0 2px 10px rgba(0,0,0,0.5);';
    _secUpdatePos();
    var dragging = false, startY, startH;
    _secHandle.addEventListener('mousedown', function(ev) {
      ev.stopPropagation(); ev.preventDefault();
      dragging = true;
      startY = ev.clientY;
      startH = _secEl.getBoundingClientRect().height;
    });
    document.addEventListener('mousemove', function(ev) {
      if (!dragging) return;
      var dy = ev.clientY - startY;
      var newH = Math.max(80, startH + dy);
      _secEl.style.minHeight = newH + 'px';
      _secUpdatePos();
    });
    document.addEventListener('mouseup', function() {
      if (dragging) {
        dragging = false;
        window.parent.postMessage({ type: 'jbc_resize_done' }, '*');
      }
    });
    document.addEventListener('scroll', _secUpdatePos, true);
    document.body.appendChild(_secHandle);
  };

  // Clear all resize handles (called before context menu shows again)
  window.__jbc_clearHandles = function() {
    _rCleanup();
    _secCleanup();
  };

  window.__jbc_execText = function(cmd, value) {
    document.execCommand(cmd, false, value || null);
  };

  window.__jbc_setFontSize = function(size) {
    if (window.__jbc_text_el) {
      window.__jbc_text_el.style.fontSize = size + 'px';
    }
  };

  window.__jbc_setColor = function(color) {
    document.execCommand('foreColor', false, color);
  };

})();
    `;
  }

  /* ── MESSAGES FROM IFRAME ────────────────────────────── */
  window.addEventListener('message', e => {
    if (!e.data || !e.data.type) return;
    const { type, x, y, selector, tagName, text } = e.data;

    if (type === 'jbc_contextmenu') {
      ctxTarget = { selector, tagName, text };
      // Clear any active resize/section handles before showing new menu
      if (win && win.__jbc_clearHandles) win.__jbc_clearHandles();
      showCtxMenu(x, y);
    }

    if (type === 'jbc_layerclick') {
      handleLayerClick(e.data);
    }

    if (type === 'jbc_move_done') {
      snapshot();
    }

    if (type === 'jbc_resize_done') {
      snapshot();
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
  });

  dropdown.querySelectorAll('.layer-opt').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const mode = btn.dataset.layer;
      setLayerMode(mode);
      dropdown.classList.add('hidden');
      btnLayers.classList.remove('active');
    });
  });

  btnExitLayer.addEventListener('click', () => setLayerMode('none'));

  const LAYER_LABELS = {
    'page-bg': 'A — Page Background: click any background element',
    'text': 'B — Text Mode: click any text to edit it',
    'section-bg': 'C — Section Background: click any section to edit its background',
    'none': ''
  };

  function setLayerMode(mode) {
    layerMode = mode;
    // Update badge
    if (mode === 'none') {
      layerBadge.classList.add('hidden');
    } else {
      badgeTxt.textContent = LAYER_LABELS[mode] || mode;
      layerBadge.classList.remove('hidden');
    }
    // Update dropdown active state
    dropdown.querySelectorAll('.layer-opt').forEach(b => b.classList.toggle('active', b.dataset.layer === mode));
    // Tell iframe
    if (win && win.__jbc_setMode) win.__jbc_setMode(mode);
    // Highlight layers button if mode active
    btnLayers.classList.toggle('active', mode !== 'none');

    // Text mode: show text edit hint; on exit stop editing
    if (mode !== 'text') stopTextEdit();
  }

  function handleLayerClick(data) {
    if (layerMode === 'text') {
      if (!win) return;
      textTarget = data.selector;
      win.__jbc_startTextEdit(data.selector);
      barText.classList.remove('hidden');
      setStatus('Editing text — click Done when finished');
    } else if (layerMode === 'page-bg' || layerMode === 'section-bg') {
      setStatus('Selected: ' + data.selector + (data.bgImage ? ' (has background)' : ''));
    }
  }

  /* ── TEXT EDITING ────────────────────────────────────── */
  btnTextDone.addEventListener('click', stopTextEdit);

  function stopTextEdit() {
    if (win && win.__jbc_stopTextEdit) win.__jbc_stopTextEdit();
    barText.classList.add('hidden');
    textTarget = null;
    snapshot();
    setStatus('Saved text edit');
  }

  // Format buttons
  barText.querySelectorAll('.fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!win) return;
      win.__jbc_execText(btn.dataset.cmd);
    });
  });

  // Font size
  document.getElementById('txt-font-size').addEventListener('change', e => {
    if (!win || !e.target.value || e.target.value === '—') return;
    win.__jbc_setFontSize(e.target.value);
  });

  // Text color
  document.getElementById('txt-color').addEventListener('input', e => {
    if (!win) return;
    win.__jbc_setColor(e.target.value);
  });

  /* ── CONTEXT MENU ────────────────────────────────────── */
  function showCtxMenu(x, y) {
    hideCtxMenu();
    ctxMenu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
    ctxMenu.style.top  = Math.min(y, window.innerHeight - 220) + 'px';
    ctxMenu.classList.remove('hidden');
  }

  function hideCtxMenu() {
    ctxMenu.classList.add('hidden');
  }

  document.addEventListener('click', hideCtxMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideCtxMenu(); setLayerMode('none'); } });

  ctxMenu.querySelectorAll('.ctx-item').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      hideCtxMenu();
      handleCtxAction(btn.dataset.action);
    });
  });

  function handleCtxAction(action) {
    if (!win) return;

    // Always use the direct element reference — never rely on selector re-query
    const el = win.__jbc_ctx_el;
    if (!el && action !== 'add') {
      setStatus('No element selected — right-click on an element first');
      return;
    }

    if (action === 'edit') {
      const tag = (el.tagName || '').toUpperCase();
      const isImg = (tag === 'IMG' || tag === 'PICTURE');
      if (isImg) {
        openFilePicker(file => {
          const reader = new FileReader();
          reader.onload = ev => {
            snapshot();
            const img = tag === 'PICTURE' ? el.querySelector('img') : el;
            if (img) {
              img.src = ev.target.result;
              img.removeAttribute('srcset');
              img.removeAttribute('sizes');
              setStatus('Image replaced ✓');
            }
          };
          reader.readAsDataURL(file);
        });
      } else {
        // Text edit — use direct ref
        win.__jbc_startTextEdit(null);
        barText.classList.remove('hidden');
        setStatus('Editing text — click Done when finished');
      }
    }

    if (action === 'delete') {
      snapshot();
      win.__jbc_deleteEl(null);
      setStatus('Element deleted');
      win.__jbc_ctx_el = null;
    }

    if (action === 'move') {
      win.__jbc_startMove(null);
      setStatus('Drag to move, release to place');
    }

    if (action === 'duplicate') {
      snapshot();
      win.__jbc_duplicateEl(null);
      setStatus('Element duplicated');
    }

    if (action === 'replace-img') {
      openFilePicker(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          snapshot();
          // Find img: the element itself, or inside picture, or first child img
          const tag = (el.tagName || '').toUpperCase();
          let img = tag === 'IMG' ? el
                  : tag === 'PICTURE' ? el.querySelector('img')
                  : el.querySelector('img');
          if (img) {
            img.src = ev.target.result;
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
            setStatus('Image replaced ✓');
          } else {
            setStatus('No <img> found — right-click directly on the image');
          }
        };
        reader.readAsDataURL(file);
      });
    }

    if (action === 'replace-bg') {
      openFilePicker(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          // Walk up from clicked element to find one with a CSS background-image
          let target = el;
          while (target && target !== win.document.body) {
            const bg = win.getComputedStyle(target).backgroundImage;
            if (bg && bg !== 'none') break;
            target = target.parentElement;
          }
          if (!target || target === win.document.body) target = el;
          snapshot();
          target.style.backgroundImage = 'url(' + ev.target.result + ')';
          target.style.backgroundSize = 'cover';
          target.style.backgroundPosition = 'center';
          setStatus('Background replaced ✓');
        };
        reader.readAsDataURL(file);
      });
    }

    if (action === 'resize-el') {
      if (win.__jbc_showResizeHandles) {
        win.__jbc_showResizeHandles();
        setStatus('Drag a corner to resize · right-click elsewhere when done');
      }
    }

    if (action === 'resize-section') {
      if (win.__jbc_showSectionHandle) {
        win.__jbc_showSectionHandle();
        setStatus('Drag the orange bar to resize section height · right-click elsewhere when done');
      }
    }

    if (action === 'add-layer') {
      pendingAddMode = 'layer';
      document.getElementById('upload-hint-txt').textContent = 'Click anywhere on the page to place';
      uploadPanel.classList.remove('hidden');
    }

    if (action === 'add-bg') {
      pendingAddMode = 'bg';
      document.getElementById('upload-hint-txt').textContent = 'Upload will fill the section as background';
      uploadPanel.classList.remove('hidden');
    }
  }

  /* ── FILE PICKER HELPER ──────────────────────────────── */
  function openFilePicker(callback) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.addEventListener('change', ev => {
      const file = ev.target.files[0];
      if (file) callback(file);
    });
    inp.click();
  }

  /* ── ADD MODE STATE ──────────────────────────────────── */
  let pendingAddMode = null; // 'layer' | 'bg'
  const imgOverlay   = document.getElementById('img-overlay');

  /* ── UPLOAD PANEL ────────────────────────────────────── */
  btnCloseUp.addEventListener('click', () => {
    uploadPanel.classList.add('hidden');
    pendingImage = null;
    pendingAddMode = null;
    removeDragGhost();
  });

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleUploadedFile(file);
  });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleUploadedFile(file);
  });

  function handleUploadedFile(file) {
    if (!file.type.startsWith('image/')) { setStatus('Please upload an image file'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      uploadPanel.classList.add('hidden');
      if (pendingAddMode === 'bg') {
        applyImageAsBg(ev.target.result);
        pendingAddMode = null;
      } else {
        // Top layer — ghost follows cursor until clicked
        pendingImage = { dataUrl: ev.target.result };
        createDragGhost(ev.target.result);
        setStatus('Click anywhere on the canvas to place the image');
      }
    };
    reader.readAsDataURL(file);
  }

  /* ── SET AS BACKGROUND ───────────────────────────────── */
  function applyImageAsBg(dataUrl) {
    if (!win) return;
    const el = win.__jbc_ctx_el;
    if (!el) { setStatus('Right-click anywhere inside a section first, then choose Set as Background'); return; }

    // Walk UP the DOM from the clicked element.
    // Stop at the first real section-level container — never apply to inner divs/text.
    const STOP_TAGS = ['SECTION', 'HEADER', 'FOOTER', 'MAIN', 'ARTICLE'];
    const STOP_IDS  = ['featured-work','jbc-visual-gallery','services-overview'];
    const STOP_CLASSES = ['manifesto','hero','testimonial-section','cta-section'];

    let target = el;
    while (target && target !== win.document.body && target !== win.document.documentElement) {
      const tag = target.tagName ? target.tagName.toUpperCase() : '';
      const id  = target.id || '';
      const cls = target.className || '';
      if (STOP_TAGS.includes(tag)) break;
      if (STOP_IDS.some(s => id === s)) break;
      if (STOP_CLASSES.some(s => cls.includes(s))) break;
      target = target.parentElement;
    }

    // If we walked all the way up without finding a section, fall back to closest <section>
    if (!target || target === win.document.body || target === win.document.documentElement) {
      target = el.closest('section, header, footer, main');
    }
    if (!target) { setStatus('Could not find a section — try right-clicking directly on the section background'); return; }

    // Ensure the section has position:relative so background renders correctly
    const pos = win.getComputedStyle(target).position;
    if (pos === 'static') target.style.setProperty('position', 'relative', 'important');

    snapshot();
    target.style.setProperty('background-image',    'url(' + dataUrl + ')', 'important');
    target.style.setProperty('background-size',     'cover',                'important');
    target.style.setProperty('background-position', 'center center',        'important');
    target.style.setProperty('background-repeat',   'no-repeat',            'important');

    const label = target.id ? '#' + target.id : target.className.split(' ')[0];
    setStatus('Background set on [' + label + '] ✓ — Save to keep');
  }

  /* ── DRAG GHOST (follows cursor) ─────────────────────── */
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

  /* ── CLICK CANVAS TO PLACE TOP-LAYER IMAGE ───────────── */
  canvasWrap.addEventListener('click', e => {
    if (!pendingImage || pendingAddMode === 'bg') return;
    removeDragGhost();
    // Pass iframe-viewport coords — same space as elementFromPoint inside iframe
    const fRect = frame.getBoundingClientRect();
    const ix = e.clientX - fRect.left;
    const iy = e.clientY - fRect.top;
    if (win && win.__jbc_insertImage) {
      win.__jbc_insertImage(pendingImage.dataUrl, ix, iy);
    }
    pendingImage   = null;
    pendingAddMode = null;
    setStatus('Image placed — drag to move · corner handles to resize · ✕ to delete · Save when done');
  });

  /* ── PLACE IMAGE ON OVERLAY ──────────────────────────── */
  function placeImageOnOverlay(dataUrl, cx, cy) {
    const W = 300; // initial width px

    const wrap = document.createElement('div');
    wrap.className = 'placed-img-wrap';
    wrap.style.left   = (cx - W / 2) + 'px';
    wrap.style.top    = (cy - 100)   + 'px';
    wrap.style.width  = W + 'px';
    wrap.style.height = 'auto';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.draggable = false;
    img.onload = () => {
      const ar = img.naturalWidth / img.naturalHeight;
      wrap.dataset.ar = ar;
      wrap.style.height = (W / ar) + 'px';
    };
    wrap.appendChild(img);

    // Resize handles
    ['nw', 'ne', 'sw', 'se'].forEach(dir => {
      const h = document.createElement('div');
      h.className = 'resize-handle ' + dir;
      h.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        ev.preventDefault();
        startOverlayResize(ev, wrap, dir);
      });
      wrap.appendChild(h);
    });

    // Delete button
    const del = document.createElement('button');
    del.className = 'placed-img-delete';
    del.title = 'Remove image';
    del.textContent = '✕';
    del.addEventListener('click', ev => { ev.stopPropagation(); wrap.remove(); });
    wrap.appendChild(del);

    imgOverlay.appendChild(wrap);
    makeOverlayDraggable(wrap);
  }

  /* ── DRAG OVERLAY IMAGE ──────────────────────────────── */
  function makeOverlayDraggable(wrap) {
    let down = false, sx, sy, sl, st;
    wrap.addEventListener('mousedown', e => {
      if (e.target.classList.contains('resize-handle')) return;
      if (e.target.classList.contains('placed-img-delete')) return;
      down = true;
      sx = e.clientX; sy = e.clientY;
      sl = parseInt(wrap.style.left) || 0;
      st = parseInt(wrap.style.top)  || 0;
      wrap.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!down) return;
      wrap.style.left = (sl + e.clientX - sx) + 'px';
      wrap.style.top  = (st + e.clientY - sy) + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!down) return;
      down = false;
      wrap.style.cursor = 'move';
    });
  }

  /* ── RESIZE OVERLAY IMAGE (aspect-ratio locked) ───────── */
  function startOverlayResize(e, wrap, dir) {
    const startX = e.clientX, startY = e.clientY;
    const startW = wrap.offsetWidth;
    const startH = wrap.offsetHeight;
    const startL = parseInt(wrap.style.left) || 0;
    const startT = parseInt(wrap.style.top)  || 0;
    const ar     = parseFloat(wrap.dataset.ar) || (startW / startH);

    function onMove(e) {
      const dx = e.clientX - startX;
      let newW, newH, newL = startL, newT = startT;

      if (dir === 'se') {
        newW = Math.max(60, startW + dx);
      } else if (dir === 'sw') {
        newW = Math.max(60, startW - dx);
        newL = startL + (startW - newW);
      } else if (dir === 'ne') {
        newW = Math.max(60, startW + dx);
        newT = startT + startH - newW / ar;
      } else { // nw
        newW = Math.max(60, startW - dx);
        newL = startL + (startW - newW);
        newT = startT + startH - newW / ar;
      }
      newH = newW / ar;
      wrap.style.width  = newW + 'px';
      wrap.style.height = newH + 'px';
      wrap.style.left   = newL + 'px';
      wrap.style.top    = newT + 'px';
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }

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
      // Clean up agent before saving
      const agentScript = doc.getElementById('__jbc_agent__');
      const agentCss    = doc.getElementById('__jbc_agent_css__');
      const agentMarkup = (agentScript ? agentScript.outerHTML : '') + (agentCss ? agentCss.outerHTML : '');
      if (agentScript) agentScript.remove();
      if (agentCss)    agentCss.remove();

      const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

      // Restore agent
      injectAgent();

      const res = await fetch('/api/save-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: currentPage, html })
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
    dirty = false;
    undoStack = [];
    redoStack = [];
    loadPage(pageSelect.value);
  });

  /* ── VIEWPORT TOGGLE (Desktop / Mobile) ─────────────── */

  // Build the phone shell HTML once — it wraps the iframe in mobile mode
  function buildPhoneShell() {
    const shell = document.createElement('div');
    shell.id = 'phone-shell';

    const notchRow = document.createElement('div');
    notchRow.id = 'phone-notch-row';

    const statusBar = document.createElement('div');
    statusBar.id = 'phone-status-bar';
    statusBar.innerHTML = `
      <span class="status-time">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
      <span class="status-icons">
        <svg width="15" height="11" viewBox="0 0 15 11" fill="white"><rect x="0" y="3" width="3" height="8" rx="1"/><rect x="4" y="2" width="3" height="9" rx="1"/><rect x="8" y="0" width="3" height="11" rx="1"/><rect x="12" y="0" width="3" height="11" rx="1" opacity=".3"/></svg>
        <svg width="14" height="11" viewBox="0 0 24 18" fill="none" stroke="white" stroke-width="2"><path d="M1 8.5C3.5 5.5 7.5 3.5 12 3.5s8.5 2 11 5"/><path d="M4.5 12C6.5 9.5 9 8 12 8s5.5 1.5 7.5 4"/><path d="M8.5 15.5C9.8 14 10.9 13 12 13s2.2 1 3.5 2.5"/><circle cx="12" cy="18" r="1.5" fill="white" stroke="none"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" stroke-opacity=".35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="white"/><path d="M23 4v4a2 2 0 000-4z" fill="white" opacity=".4"/></svg>
      </span>
    `;

    const homeBar = document.createElement('div');
    homeBar.id = 'phone-home-bar';

    shell.appendChild(statusBar);
    shell.appendChild(frame); // move the actual iframe inside
    shell.appendChild(homeBar);

    return shell;
  }

  let phoneShell = null;
  let phoneLabel = null;

  function setViewMode(mode) {
    if (mode === viewMode) return;

    // Warn if there are unsaved changes before reloading
    if (dirty && !confirm('Switching view will reload the page. Unsaved changes will be lost. Continue?')) return;
    dirty = false;

    viewMode = mode;

    // Update toggle button states
    vpToggle.querySelectorAll('.vp-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.vp === mode);
    });

    if (mode === 'mobile') {
      canvasWrap.classList.add('canvas-mobile');

      // Build phone shell once, move iframe inside it
      if (!phoneShell) {
        phoneShell = buildPhoneShell(); // moves frame inside shell
        canvasWrap.appendChild(phoneShell);
      } else {
        phoneShell.style.display = '';
        // Make sure frame is inside shell
        if (frame.parentElement !== phoneShell) {
          const homeBar = phoneShell.querySelector('#phone-home-bar');
          phoneShell.insertBefore(frame, homeBar);
        }
      }

      // Width label under the phone
      if (!phoneLabel) {
        phoneLabel = document.createElement('div');
        phoneLabel.id = 'phone-label';
        phoneLabel.textContent = '390px — Mobile';
        canvasWrap.appendChild(phoneLabel);
      }
      phoneLabel.style.display = '';

    } else {
      canvasWrap.classList.remove('canvas-mobile');

      // Move iframe back to canvas root
      if (phoneShell) {
        if (frame.parentElement === phoneShell) canvasWrap.insertBefore(frame, phoneShell);
        phoneShell.style.display = 'none';
      }
      if (phoneLabel) phoneLabel.style.display = 'none';
    }

    // Reload so JS runs fresh with the correct viewport width.
    // The 'load' handler will apply/restore the viewport meta after load.
    loadPage(currentPage);
  }

  function applyMobileViewport(targetDoc) {
    let vp = targetDoc.querySelector('meta[name="viewport"]');
    if (!vp) { vp = targetDoc.createElement('meta'); vp.name = 'viewport'; targetDoc.head.appendChild(vp); }
    // width=390 forces the page's CSS to evaluate at 390px → mobile.css fires
    vp.content = 'width=390, initial-scale=1, maximum-scale=1';
  }

  function restoreDesktopViewport(targetDoc) {
    let vp = targetDoc.querySelector('meta[name="viewport"]');
    if (vp) vp.content = 'width=device-width, initial-scale=1';
  }

  // Wire up toggle buttons
  vpToggle.querySelectorAll('.vp-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.dataset.vp !== viewMode) setViewMode(btn.dataset.vp);
    });
  });

  /* ── INIT ────────────────────────────────────────────── */
  loadPage(currentPage);

})();
