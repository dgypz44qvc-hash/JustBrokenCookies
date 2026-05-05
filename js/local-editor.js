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

  /* ── STATE ───────────────────────────────────────────── */
  let doc          = null;
  let win          = null;
  let layerMode    = 'none';   // 'none' | 'page-bg' | 'text' | 'section-bg'
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
  let moveEl = null, moveOffX = 0, moveOffY = 0;

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

  // Move handling
  document.addEventListener('mousemove', e => {
    if (!moveEl) return;
    e.preventDefault();
    moveEl.style.position = 'fixed';
    moveEl.style.left = (e.clientX - moveOffX) + 'px';
    moveEl.style.top  = (e.clientY - moveOffY) + 'px';
    moveEl.style.zIndex = '9999';
  }, true);

  document.addEventListener('mouseup', e => {
    if (!moveEl) return;
    moveEl.classList.remove('__jbc_selected');
    window.parent.postMessage({ type: 'jbc_move_done' }, '*');
    moveEl = null;
  }, true);

  window.__jbc_setMode = function(m) {
    mode = m;
    unhover();
  };

  window.__jbc_startMove = function(selector) {
    const el = selector ? document.querySelector(selector) : window.__jbc_ctx_el;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    moveOffX = rect.width / 2;
    moveOffY = rect.height / 2;
    el.classList.add('__jbc_selected');
    moveEl = el;
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
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;max-width:320px;max-height:320px;z-index:9990;cursor:grab;border-radius:4px;';
    img.dataset.editorId = 'added-' + Date.now();
    document.body.appendChild(img);
    window.parent.postMessage({ type: 'jbc_move_done' }, '*');
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
      showCtxMenu(x, y);
    }

    if (type === 'jbc_layerclick') {
      handleLayerClick(e.data);
    }

    if (type === 'jbc_move_done') {
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
    if (!win || !ctxTarget) return;
    const sel = ctxTarget.selector;

    if (action === 'edit') {
      // Determine if text or image
      const tag = (ctxTarget.tagName || '').toUpperCase();
      const isImg = (tag === 'IMG' || tag === 'PICTURE');
      if (isImg) {
        // Open file picker to replace image
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.addEventListener('change', ev => {
          const file = ev.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = re => {
            const el = win.document.querySelector(sel) || win.__jbc_ctx_el;
            if (el && el.tagName === 'IMG') {
              snapshot();
              el.src = re.result;
              setStatus('Image replaced');
            } else if (el && el.tagName === 'PICTURE') {
              const img = el.querySelector('img');
              if (img) { snapshot(); img.src = re.result; setStatus('Image replaced'); }
            }
          };
          reader.readAsDataURL(file);
        });
        inp.click();
      } else {
        // Text edit
        textTarget = sel;
        win.__jbc_startTextEdit(sel);
        barText.classList.remove('hidden');
        setStatus('Editing text — click Done when finished');
      }
    }

    if (action === 'delete') {
      snapshot();
      win.__jbc_deleteEl(sel);
      setStatus('Element deleted');
      ctxTarget = null;
    }

    if (action === 'move') {
      win.__jbc_startMove(sel);
      setStatus('Move: drag the element, release to place');
    }

    if (action === 'duplicate') {
      snapshot();
      win.__jbc_duplicateEl(sel);
      setStatus('Element duplicated');
    }

    if (action === 'add') {
      uploadPanel.classList.remove('hidden');
    }
  }

  /* ── UPLOAD & PLACE IMAGE ────────────────────────────── */
  btnCloseUp.addEventListener('click', () => {
    uploadPanel.classList.add('hidden');
    pendingImage = null;
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
    reader.onload = e => {
      pendingImage = { dataUrl: e.target.result, name: file.name };
      uploadPanel.classList.add('hidden');
      setStatus('Move cursor over the page and click to place the image');
      // Create ghost that follows mouse
      createDragGhost(e.target.result);
    };
    reader.readAsDataURL(file);
  }

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

  // Ghost follows mouse
  document.addEventListener('mousemove', e => {
    if (!dragGhost) return;
    dragGhost.style.left = e.clientX + 'px';
    dragGhost.style.top  = e.clientY + 'px';
  });

  // Click on canvas to place
  const canvasWrap = document.getElementById('canvas-wrap');
  canvasWrap.addEventListener('click', e => {
    if (!pendingImage) return;
    // Convert to iframe coordinates
    const frameRect = frame.getBoundingClientRect();
    const ix = e.clientX - frameRect.left;
    const iy = e.clientY - frameRect.top;
    if (!win) return;
    snapshot();
    win.__jbc_insertImage(pendingImage.dataUrl, ix, iy);
    pendingImage = null;
    removeDragGhost();
    setStatus('Image placed — drag to reposition, right-click to delete');
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

  /* ── INIT ────────────────────────────────────────────── */
  loadPage(currentPage);

})();
