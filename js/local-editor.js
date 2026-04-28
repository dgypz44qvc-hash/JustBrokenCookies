(() => {
  const frame = document.getElementById('site-frame');
  const status = document.getElementById('status');
  const layersEl = document.getElementById('layers');
  const imageList = document.getElementById('image-list');
  const shell = document.body;
  const prop = id => document.getElementById(id);
  let doc, selected = null, htmlSource = '', editorCss = '', history = [], future = [], dirty = false, editMode = true;

  const knownLayers = [
    ['Hero', '[data-editor-id="hero-section"], section.hero'],
    ['StorytellinG', '[data-editor-id="hero-storytelling-tag"], .hero .tag'],
    ['Hero title group', '[data-editor-id="hero-title-group"], .hero-mega'],
    ['Just', '[data-editor-id="hero-title-line-1"], .hero-mega .l1'],
    ['Broken', '[data-editor-id="hero-title-line-2"], .hero-mega .l2'],
    ['Cookies', '[data-editor-id="hero-title-line-3"], .hero-mega .l3'],
    ['Hero image', '[data-editor-id="hero-image-wrap"], .hero .hero-photo-layer'],
    ['Rose/decorations', '.editor-decoration, .hero-corner-rose'],
    ['Manifesto', '[data-editor-id="manifesto-section"], .manifesto'],
    ['Process', '[data-editor-id="process-section"], #services-overview'],
    ['How We Build Stories', '[data-editor-id="process-heading"], #services-overview .sec-header h2'],
    ['Define card', '[data-editor-id="process-card-1"], #services-overview .service-card:nth-of-type(1)'],
    ['Design card', '[data-editor-id="process-card-2"], #services-overview .service-card:nth-of-type(2)'],
    ['Describe card', '[data-editor-id="process-card-3"], #services-overview .service-card:nth-of-type(3)'],
    ['Service cinema', '[data-editor-id="service-cinema-panel"], #serviceCinema'],
    ['Selected Work', '[data-editor-id="featured-work-section"], #featured-work'],
    ['Portfolio grid', '[data-editor-id="portfolio-grid"], .portfolio-grid'],
    ['Testimonial', '[data-editor-id="testimonial-section"], .testimonial-section'],
    ['CTA', '[data-editor-id="cta-section"], .cta-section'],
    ['Footer', '[data-editor-id="footer-section"], footer.footer']
  ];

  function setStatus(msg) { status.textContent = msg; }
  function uid(prefix='el') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
  function cssEscape(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }
  function selectorFor(el) {
    if (!el) return '';
    if (!el.dataset.editorId) el.dataset.editorId = uid('jbc');
    return `[data-editor-id="${cssEscape(el.dataset.editorId)}"]`;
  }
  function isTextElement(el) { return el && !el.querySelector('img, picture, video') && (el.childElementCount === 0 || ['H1','H2','H3','H4','P','SPAN','A','BUTTON','CITE','BLOCKQUOTE'].includes(el.tagName)); }
  function nearestEditable(target) {
    return target.closest('.editor-decoration, [data-editor-id], img, picture, section, .service-card, .portfolio-item, .testi-brutal, .cta-section, footer, .manifesto, .hero-mega .l1, .hero-mega .l2, .hero-mega .l3, .tag');
  }
  function pushHistory() { if (!doc) return; history.push({ html: serializeBody(), css: editorCss }); if (history.length > 40) history.shift(); future = []; }
  function markDirty(msg='Unsaved changes') { dirty = true; setStatus(msg); buildLayers(); }

  async function api(url, opts={}) {
    const r = await fetch(url, opts);
    const j = await r.json().catch(()=>({ok:false,error:'Bad JSON response'}));
    if (!r.ok || !j.ok) throw new Error(j.error || r.statusText);
    return j;
  }

  async function init() {
    try {
      const [htmlRes, cssRes] = await Promise.all([api('/api/site-html'), api('/api/editor-css')]);
      htmlSource = htmlRes.html; editorCss = cssRes.css || '';
      frame.srcdoc = injectEditorRuntime(htmlSource, editorCss);
      frame.addEventListener('load', () => { doc = frame.contentDocument; wireCanvas(); buildLayers(); loadImages(); pushHistory(); setStatus('Ready'); });
    } catch(e) { setStatus('Error: ' + e.message); }
  }

  function injectEditorRuntime(html, overrides) {
    const runtime = `
<style id="jbc-editor-runtime-css">
  [data-jbc-selected="true"]{outline:2px solid #2ecc40!important;outline-offset:3px!important;}
  .jbc-editor-hover{outline:1px dashed #E8891D!important;outline-offset:2px!important;}
  .jbc-editor-handle{position:absolute;width:12px;height:12px;background:#2ecc40;border:2px solid #fff;z-index:2147483647;pointer-events:auto;}
  .jbc-editor-handle.br{cursor:nwse-resize;}
  body.jbc-editor-preview [data-jbc-selected="true"], body.jbc-editor-preview .jbc-editor-hover{outline:none!important;}
  .editor-decoration{position:absolute;display:block;pointer-events:auto;z-index:4;}
  .editor-decoration img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;}
</style>
<style id="jbc-editor-overrides-live">${overrides.replace(/<\/style/gi, '<\\/style')}</style>`;
    if (html.includes('</head>')) return html.replace('</head>', runtime + '</head>');
    return runtime + html;
  }

  function serializeBody() {
    const clone = doc.documentElement.cloneNode(true);
    clone.querySelector('#jbc-editor-runtime-css')?.remove();
    clone.querySelector('#jbc-editor-overrides-live')?.remove();
    clone.querySelectorAll('[data-jbc-selected], .jbc-editor-hover').forEach(el => { el.removeAttribute('data-jbc-selected'); el.classList.remove('jbc-editor-hover'); });
    clone.querySelectorAll('.jbc-editor-handle').forEach(el => el.remove());
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  function wireCanvas() {
    doc.addEventListener('mouseover', e => { if (!editMode) return; const el = nearestEditable(e.target); if (el && el !== selected) el.classList.add('jbc-editor-hover'); }, true);
    doc.addEventListener('mouseout', e => { const el = nearestEditable(e.target); if (el) el.classList.remove('jbc-editor-hover'); }, true);
    doc.addEventListener('click', e => { if (!editMode) return; const el = nearestEditable(e.target); if (!el) return; e.preventDefault(); e.stopPropagation(); selectElement(el.tagName === 'IMG' ? el : el); }, true);
    doc.addEventListener('dblclick', e => { if (!editMode || !selected || !isTextElement(selected)) return; selected.contentEditable = 'true'; selected.focus(); }, true);
    doc.addEventListener('input', e => { if (selected && e.target === selected) { prop('prop-text').value = selected.innerHTML; markDirty('Text edited'); }}, true);
    doc.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); } });
  }

  function selectElement(el) {
    if (selected) selected.removeAttribute('data-jbc-selected');
    selected = el;
    selectorFor(el);
    selected.setAttribute('data-jbc-selected', 'true');
    hydratePanel();
    addDragAndResize(selected);
    buildLayers();
  }

  function hydratePanel() {
    document.body.classList.toggle('has-image', !!selected?.querySelector?.('img') || selected?.tagName === 'IMG' || selected?.tagName === 'PICTURE');
    prop('selected-label').textContent = selected ? `${selected.tagName.toLowerCase()} ${selected.id ? '#'+selected.id : ''} ${selected.className ? '.'+String(selected.className).trim().replace(/\s+/g,'.') : ''} ${selectorFor(selected)}` : 'Nothing selected';
    prop('prop-text').value = selected && isTextElement(selected) ? selected.innerHTML : '';
    const img = selected?.tagName === 'IMG' ? selected : selected?.querySelector?.('img');
    prop('prop-src').value = img ? img.getAttribute('src') || '' : '';
    const cs = selected ? frame.contentWindow.getComputedStyle(selected) : {};
    prop('prop-left').value = inlineOrComputed('left', cs);
    prop('prop-top').value = inlineOrComputed('top', cs);
    prop('prop-width').value = selected?.style.width || (selected ? Math.round(selected.getBoundingClientRect().width)+'px' : '');
    prop('prop-height').value = selected?.style.height || (selected ? Math.round(selected.getBoundingClientRect().height)+'px' : '');
    prop('prop-opacity').value = selected?.style.opacity || cs.opacity || '';
    prop('prop-z').value = selected?.style.zIndex || (cs.zIndex === 'auto' ? '' : cs.zIndex) || '';
    prop('prop-radius').value = selected?.style.borderRadius || cs.borderRadius || '';
    prop('prop-color').value = rgbToHex(cs.color || '#ffffff');
    prop('prop-bg').value = rgbToHex(cs.backgroundColor || '#000000');
    prop('prop-font-size').value = selected?.style.fontSize || cs.fontSize || '';
    prop('prop-font-family').value = selected?.style.fontFamily || '';
    prop('prop-letter').value = selected?.style.letterSpacing || cs.letterSpacing || '';
    prop('prop-padding').value = selected?.style.padding || cs.padding || '';
    prop('prop-margin').value = selected?.style.margin || cs.margin || '';
    prop('prop-blend').value = selected?.style.mixBlendMode || '';
    prop('prop-rotate').value = getRotate(selected);
  }
  function inlineOrComputed(name, cs) { return selected?.style[name] || (cs[name] && cs[name] !== 'auto' ? cs[name] : ''); }
  function rgbToHex(rgb) { const m = String(rgb).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if(!m) return '#000000'; return '#' + [m[1],m[2],m[3]].map(n=>(+n).toString(16).padStart(2,'0')).join(''); }
  function getRotate(el) { const t = el?.style.transform || ''; const m = t.match(/rotate\(([^)]+)\)/); return m ? m[1] : ''; }

  function addDragAndResize(el) {
    if (!el || el.dataset.editorBound) return; el.dataset.editorBound = '1';
    el.addEventListener('mousedown', e => {
      if (!editMode || e.target.contentEditable === 'true' || e.button !== 0) return;
      if (['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)) return;
      const target = el;
      pushHistory();
      e.preventDefault();
      const parent = target.offsetParent || target.parentElement;
      if (frame.contentWindow.getComputedStyle(target).position === 'static') target.style.position = target.classList.contains('editor-decoration') || target.closest('.hero') ? 'absolute' : 'relative';
      const start = { x:e.clientX, y:e.clientY, left:target.offsetLeft, top:target.offsetTop };
      function move(ev){ target.style.left = start.left + (ev.clientX-start.x) + 'px'; target.style.top = start.top + (ev.clientY-start.y) + 'px'; hydratePanel(); markDirty('Moved'); }
      function up(){ doc.removeEventListener('mousemove', move, true); doc.removeEventListener('mouseup', up, true); saveStyleFor(target); }
      doc.addEventListener('mousemove', move, true); doc.addEventListener('mouseup', up, true);
    }, true);
  }

  function buildLayers() {
    layersEl.innerHTML = '';
    knownLayers.forEach(([name, sel]) => {
      const el = doc?.querySelector(sel); if (!el) return;
      const b = document.createElement('button'); b.className = 'layer' + (el===selected?' active':''); b.innerHTML = `${name}<span class="sub">${sel}</span>`;
      b.onclick = () => { selectElement(el); el.scrollIntoView({block:'center', behavior:'smooth'}); };
      layersEl.appendChild(b);
    });
    doc?.querySelectorAll('.editor-decoration,[data-editor-id^="rose"],.hero-corner-rose').forEach((el,i)=>{
      const b = document.createElement('button'); b.className = 'layer' + (el===selected?' active':''); b.innerHTML = `Decoration ${i+1}<span class="sub">${selectorFor(el)}</span>`;
      b.onclick = () => selectElement(el); layersEl.appendChild(b);
    });
  }

  function setStyle(name, value) { if (!selected) return; pushHistory(); selected.style[name] = value; saveStyleFor(selected); hydratePanel(); markDirty('Style changed'); }
  function applyPanel() {
    if (!selected) return; pushHistory();
    const map = { 'prop-left':'left','prop-top':'top','prop-width':'width','prop-height':'height','prop-opacity':'opacity','prop-z':'zIndex','prop-radius':'borderRadius','prop-color':'color','prop-bg':'backgroundColor','prop-font-size':'fontSize','prop-font-family':'fontFamily','prop-letter':'letterSpacing','prop-padding':'padding','prop-margin':'margin','prop-blend':'mixBlendMode' };
    Object.entries(map).forEach(([id, css]) => { const v = prop(id).value; if (v !== '') selected.style[css] = v; });
    const rot = prop('prop-rotate').value; if (rot) selected.style.transform = `rotate(${rot})`;
    if (prop('prop-text').value && isTextElement(selected)) selected.innerHTML = prop('prop-text').value;
    saveStyleFor(selected); markDirty('Properties applied');
  }
  ['prop-left','prop-top','prop-width','prop-height','prop-opacity','prop-z','prop-radius','prop-color','prop-bg','prop-font-size','prop-font-family','prop-letter','prop-padding','prop-margin','prop-blend','prop-rotate','prop-text'].forEach(id => prop(id).addEventListener('change', applyPanel));

  function saveStyleFor(el) {
    const selector = selectorFor(el);
    const styles = ['position','left','top','right','bottom','width','height','opacity','z-index','color','background-color','font-size','font-family','letter-spacing','padding','margin','border-radius','mix-blend-mode','transform','display'];
    const decl = styles.map(s => { const v = el.style.getPropertyValue(s); return v ? `  ${s}: ${v} !important;` : ''; }).filter(Boolean).join('\n');
    if (!decl) return;
    const block = `${selector} {\n${decl}\n}`;
    const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\{[\\s\\S]*?\\}`, 'm');
    editorCss = re.test(editorCss) ? editorCss.replace(re, block) : `${editorCss.trim()}\n\n${block}\n`;
    const live = doc.getElementById('jbc-editor-overrides-live'); if (live) live.textContent = editorCss;
  }

  async function loadImages() {
    try { const res = await api('/api/images'); imageList.innerHTML = ''; res.images.forEach(src => { const d = document.createElement('div'); d.className='img-tile'; d.innerHTML=`<img src="/${src}"><div>${src}</div>`; d.onclick=()=>{ prop('prop-src').value=src; }; imageList.appendChild(d); }); } catch(e) { setStatus(e.message); }
  }

  async function uploadImage(file, folder='images') {
    const fd = new FormData(); fd.append('image', file); fd.append('folder', folder);
    const r = await fetch('/api/upload-image', { method:'POST', body: fd }); const j = await r.json(); if(!j.ok) throw new Error(j.error); await loadImages(); return j.path;
  }

  prop('upload-image').addEventListener('change', async e => {
    try { if(!selected || !e.target.files[0]) return; const src = await uploadImage(e.target.files[0]); const img = selected.tagName === 'IMG' ? selected : selected.querySelector('img'); if(img) { pushHistory(); img.setAttribute('src', src); prop('prop-src').value = src; markDirty('Image replaced'); } } catch(err){ setStatus(err.message); }
  });
  prop('btn-apply-src').onclick = () => { const img = selected?.tagName === 'IMG' ? selected : selected?.querySelector?.('img'); if(img) { pushHistory(); img.setAttribute('src', prop('prop-src').value); markDirty('Image src applied'); } };
  prop('btn-hero-mobile').onclick = async () => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange = async () => { const src = await uploadImage(inp.files[0]); const source = doc.querySelector('.hero picture source'); if(source){ pushHistory(); source.setAttribute('srcset', src); markDirty('Hero mobile source replaced'); } }; inp.click(); };
  prop('btn-refresh-images').onclick = loadImages;

  function addDecoration() {
    const src = prop('prop-src').value || 'images/jbc-rose-pattern-bg.png';
    const hero = doc.querySelector('.hero') || doc.body;
    const div = doc.createElement('div'); div.className='editor-decoration'; div.dataset.editorId = uid('rose');
    div.style.cssText='left:55%;top:18%;width:420px;height:420px;opacity:.85;z-index:4;mix-blend-mode:screen;position:absolute;';
    div.innerHTML = `<img src="${src}" alt="">`;
    hero.insertBefore(div, hero.firstChild);
    selectElement(div); saveStyleFor(div); markDirty('Decoration added');
  }
  prop('btn-add-decoration').onclick = addDecoration;
  prop('btn-replace-image').onclick = () => prop('upload-image').click();
  prop('btn-hide').onclick = () => { if(!selected) return; pushHistory(); selected.style.display = frame.contentWindow.getComputedStyle(selected).display === 'none' ? '' : 'none'; saveStyleFor(selected); markDirty('Hidden/shown'); };
  prop('btn-delete').onclick = () => { if(!selected) return; if(!confirm('Delete selected element?')) return; pushHistory(); selected.remove(); selected=null; hydratePanel(); markDirty('Deleted'); };
  prop('btn-duplicate').onclick = () => { if(!selected) return; pushHistory(); const c=selected.cloneNode(true); c.dataset.editorId=uid('copy'); c.style.left=(selected.offsetLeft+30)+'px'; c.style.top=(selected.offsetTop+30)+'px'; selected.parentElement.appendChild(c); selectElement(c); saveStyleFor(c); markDirty('Duplicated'); };
  prop('btn-reset-selected').onclick = () => { if(!selected) return; pushHistory(); selected.removeAttribute('style'); saveStyleFor(selected); hydratePanel(); markDirty('Reset selected'); };

  function undo(){ if(history.length<2) return; future.push(history.pop()); const prev=history[history.length-1]; frame.srcdoc=injectEditorRuntime(prev.html, prev.css); editorCss=prev.css; setStatus('Undo'); }
  function redo(){ if(!future.length) return; const next=future.pop(); history.push(next); frame.srcdoc=injectEditorRuntime(next.html, next.css); editorCss=next.css; setStatus('Redo'); }
  prop('btn-undo').onclick = undo; prop('btn-redo').onclick = redo;

  prop('btn-edit').onclick = () => { editMode=true; prop('btn-edit').classList.add('active'); prop('btn-preview').classList.remove('active'); doc?.body.classList.remove('jbc-editor-preview'); };
  prop('btn-preview').onclick = () => { editMode=false; prop('btn-preview').classList.add('active'); prop('btn-edit').classList.remove('active'); if(selected) selected.removeAttribute('data-jbc-selected'); doc?.body.classList.add('jbc-editor-preview'); };

  async function saveAll() {
    try { const html = serializeBody(); await api('/api/save-all', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ html, css: editorCss }) }); dirty=false; setStatus('Saved to index.html and css/editor-overrides.css'); pushHistory(); } catch(e){ setStatus('Save failed: ' + e.message); }
  }
  prop('btn-save').onclick = saveAll;
  window.addEventListener('beforeunload', e => { if(dirty) { e.preventDefault(); e.returnValue=''; } });

  init();
})();
