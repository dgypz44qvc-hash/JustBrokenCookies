/* ============================================
   JUSTBROKENCOOKIES — Inline Visual Editor
   Activate by adding ?edit to any page URL
   ============================================ */
(function(){
  if(window.location.search.indexOf('edit') === -1) return;

  /* ========== STYLES ========== */
  var css = document.createElement('style');
  css.textContent = `
    /* Banner */
    #jbc-editor-banner{position:fixed;top:0;left:0;right:0;z-index:1000000;background:#E84848;color:#fff;text-align:center;font-family:monospace;font-size:13px;font-weight:bold;padding:10px 20px;letter-spacing:1px;}

    /* Editable text */
    .jbc-editable{outline:2px dashed transparent;outline-offset:3px;cursor:text;transition:outline-color 0.2s;}
    .jbc-editable:hover{outline-color:rgba(232,72,72,0.5);}
    .jbc-editable:focus{outline-color:#E84848;outline-style:solid;background:rgba(232,72,72,0.05);}
    .jbc-text-changed{border-left:3px solid #E84848!important;padding-left:8px!important;}

    /* Image overlay */
    .jbc-img-wrap{position:relative;display:block;}
    .jbc-img-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);opacity:0;transition:opacity 0.25s;cursor:pointer;z-index:100;}
    .jbc-img-wrap:hover .jbc-img-overlay{opacity:1;}
    .jbc-img-overlay span{color:#fff;font-family:monospace;font-size:14px;font-weight:bold;letter-spacing:1px;pointer-events:none;}
    .jbc-img-overlay i{font-size:36px;color:#fff;margin-bottom:10px;pointer-events:none;}

    /* Toolbar */
    #jbc-toolbar{position:fixed;bottom:20px;right:20px;z-index:1000001;display:flex;flex-direction:column;gap:8px;align-items:flex-end;}
    #jbc-toolbar button{background:#1a1a1a;color:#fff;border:2px solid #fff;padding:12px 20px;font-family:monospace;font-size:12px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:8px;}
    #jbc-toolbar button:hover{background:#E84848;border-color:#E84848;}
    #jbc-toolbar button:disabled{opacity:0.4;cursor:not-allowed;background:#333!important;border-color:#555!important;}
    #jbc-toolbar .jbc-counter{background:#E84848;color:#fff;border-color:#E84848;pointer-events:none;padding:8px 14px;font-size:11px;}
    #jbc-toolbar .jbc-save-btn{background:#2ecc40;border-color:#2ecc40;font-size:14px;padding:14px 24px;}
    #jbc-toolbar .jbc-save-btn:hover{background:#27ae60;border-color:#27ae60;}

    /* + ADD BUTTON */
    #jbc-add-btn{position:fixed;bottom:20px;right:240px;z-index:1000001;width:56px;height:56px;border-radius:50%;background:#E8891D;border:3px solid #fff;color:#fff;font-size:32px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);transition:all 0.2s;font-family:monospace;line-height:1;}
    #jbc-add-btn:hover{background:#E84848;transform:scale(1.1);}
    #jbc-add-btn.open{background:#E84848;transform:rotate(45deg);}

    /* Add menu */
    #jbc-add-menu{position:fixed;bottom:90px;right:240px;z-index:1000001;display:none;flex-direction:column;gap:8px;}
    #jbc-add-menu.open{display:flex;}
    #jbc-add-menu button{background:#1a1a1a;color:#fff;border:2px solid #E8891D;padding:14px 20px;font-family:monospace;font-size:13px;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:10px;white-space:nowrap;transition:all 0.15s;}
    #jbc-add-menu button:hover{background:#E8891D;border-color:#E8891D;}
    #jbc-add-menu button i{font-size:18px;width:22px;text-align:center;}

    /* Added elements */
    .jbc-added{position:absolute;z-index:5;cursor:move;user-select:none;}
    .jbc-added:hover{outline:2px solid #E8891D;outline-offset:4px;}
    .jbc-added .jbc-delete-btn{position:absolute;top:-12px;right:-12px;width:24px;height:24px;background:#E84848;color:#fff;border:2px solid #fff;border-radius:50%;font-size:14px;cursor:pointer;display:none;align-items:center;justify-content:center;z-index:300;font-family:monospace;line-height:1;}
    .jbc-added:hover .jbc-delete-btn{display:flex;}
    .jbc-added .jbc-resize-handle{position:absolute;bottom:-5px;right:-5px;width:14px;height:14px;background:#E8891D;cursor:nwse-resize;z-index:200;border:2px solid #fff;display:none;}
    .jbc-added:hover .jbc-resize-handle{display:block;}

    /* Toast */
    #jbc-toast{position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:1000002;background:#1a1a1a;color:#fff;font-family:monospace;font-size:13px;padding:12px 24px;border:2px solid #E84848;opacity:0;transition:opacity 0.3s;pointer-events:none;}
    #jbc-toast.show{opacity:1;}
    #jbc-toast.success{border-color:#2ecc40;}
    #jbc-toast.error{border-color:#E84848;background:#3a0a0a;}

    /* Placement mode */
    .jbc-placement-mode{cursor:crosshair!important;}
    .jbc-placement-mode *{cursor:crosshair!important;}
    #jbc-placement-hint{position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:1000002;background:#E8891D;color:#000;font-family:monospace;font-size:14px;font-weight:bold;padding:12px 24px;display:none;letter-spacing:1px;}
  `;
  document.head.appendChild(css);

  /* ========== STATE ========== */
  var isServerMode = (window.location.protocol === 'http:' && window.location.hostname === 'localhost');
  var changes = {text:0, images:0};
  var originalTexts = new Map();
  var pendingImages = [];
  var addedElements = [];

  /* ========== BANNER ========== */
  var banner = document.createElement('div');
  banner.id = 'jbc-editor-banner';
  banner.innerHTML = isServerMode
    ? '<span>EDITOR MODE — Click text to edit · Hover images to replace · Use + to add elements · SAVE writes to files</span>'
    : '<span>EDITOR MODE (preview) — Run <b>node server.js</b> to enable saving</span>';
  document.body.prepend(banner);
  document.body.style.marginTop = '40px';

  /* ========== TOAST ========== */
  var toast = document.createElement('div');
  toast.id = 'jbc-toast';
  document.body.appendChild(toast);
  function showToast(msg,type){
    toast.textContent = msg;
    toast.className = 'show'+(type?' '+type:'');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ toast.className=''; },3000);
  }

  /* ========== PLACEMENT HINT ========== */
  var placementHint = document.createElement('div');
  placementHint.id = 'jbc-placement-hint';
  document.body.appendChild(placementHint);

  /* ========== TOOLBAR ========== */
  var toolbar = document.createElement('div');
  toolbar.id = 'jbc-toolbar';
  document.body.appendChild(toolbar);

  var counter = document.createElement('button');
  counter.className = 'jbc-counter';
  counter.textContent = '0 changes';
  toolbar.appendChild(counter);

  function updateCounter(){
    var total = changes.text + changes.images;
    counter.textContent = total+' change'+(total!==1?'s':'');
    counter.style.display = total>0?'':'none';
    saveBtn.disabled = total===0;
  }

  var saveBtn = document.createElement('button');
  saveBtn.className = 'jbc-save-btn';
  saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE';
  saveBtn.disabled = true;
  saveBtn.addEventListener('click', savePage);
  toolbar.appendChild(saveBtn);

  var dlBtn = document.createElement('button');
  dlBtn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD';
  dlBtn.addEventListener('click', downloadPage);
  toolbar.appendChild(dlBtn);

  var resetBtn = document.createElement('button');
  resetBtn.innerHTML = '<i class="fas fa-undo"></i> RESET';
  resetBtn.addEventListener('click', function(){ if(confirm('Reset all changes?')) location.reload(); });
  toolbar.appendChild(resetBtn);
  updateCounter();

  /* ========== + ADD BUTTON & MENU ========== */
  var addBtn = document.createElement('button');
  addBtn.id = 'jbc-add-btn';
  addBtn.textContent = '+';
  document.body.appendChild(addBtn);

  var addMenu = document.createElement('div');
  addMenu.id = 'jbc-add-menu';
  addMenu.innerHTML = [
    '<button data-type="image"><i class="fas fa-image"></i> Add Image</button>',
    '<button data-type="text"><i class="fas fa-font"></i> Add Text</button>'
  ].join('');
  document.body.appendChild(addMenu);

  var menuOpen = false;
  addBtn.addEventListener('click', function(){
    menuOpen = !menuOpen;
    addBtn.classList.toggle('open', menuOpen);
    addMenu.classList.toggle('open', menuOpen);
  });

  /* Close menu when clicking elsewhere */
  document.addEventListener('click', function(e){
    if(!e.target.closest('#jbc-add-btn') && !e.target.closest('#jbc-add-menu')){
      menuOpen = false;
      addBtn.classList.remove('open');
      addMenu.classList.remove('open');
    }
  });

  /* ---- ADD IMAGE ---- */
  addMenu.querySelector('[data-type="image"]').addEventListener('click', function(){
    menuOpen = false;
    addBtn.classList.remove('open');
    addMenu.classList.remove('open');

    var fi = document.createElement('input');
    fi.type = 'file'; fi.accept = 'image/*'; fi.style.display = 'none';
    document.body.appendChild(fi);

    fi.addEventListener('change', function(){
      var file = fi.files[0];
      if(!file) return;
      fi.remove();

      var reader = new FileReader();
      reader.onload = function(ev){
        /* Enter placement mode */
        placementHint.textContent = 'CLICK WHERE YOU WANT THE IMAGE';
        placementHint.style.display = 'block';
        document.body.classList.add('jbc-placement-mode');

        function placeImage(e2){
          document.body.classList.remove('jbc-placement-mode');
          placementHint.style.display = 'none';
          document.removeEventListener('click', placeImage, true);

          /* Find nearest section to place it in */
          var target = e2.target.closest('section') || e2.target.closest('.hero') || document.querySelector('.hero') || document.body;
          var rect = target.getBoundingClientRect();

          /* Create the image element */
          var wrapper = document.createElement('div');
          wrapper.className = 'jbc-added';
          wrapper.style.cssText = 'left:'+(e2.clientX - rect.left - 100)+'px;top:'+(e2.clientY - rect.top - 75)+'px;width:300px;';

          var img = document.createElement('img');
          img.src = ev.target.result;
          img.style.cssText = 'width:100%;height:auto;display:block;filter:grayscale(100%);';
          img.setAttribute('data-added','true');

          /* Determine save path */
          var ext = file.name.split('.').pop() || 'jpg';
          var saveName = 'images/added-' + Date.now() + '.' + ext;
          img.setAttribute('data-save-path', saveName);

          /* Delete button */
          var delBtn = document.createElement('button');
          delBtn.className = 'jbc-delete-btn';
          delBtn.textContent = '×';
          delBtn.addEventListener('click', function(e3){
            e3.stopPropagation();
            wrapper.remove();
            showToast('Element removed');
          });

          /* Resize handle */
          var resizeH = document.createElement('div');
          resizeH.className = 'jbc-resize-handle';

          wrapper.appendChild(img);
          wrapper.appendChild(delBtn);
          wrapper.appendChild(resizeH);

          /* Make sure target is positioned */
          if(getComputedStyle(target).position === 'static') target.style.position = 'relative';
          target.appendChild(wrapper);

          /* Enable drag */
          makeDraggable(wrapper);
          makeResizable(wrapper, resizeH);

          /* Track image for save */
          pendingImages.push({
            img: img,
            origSrc: saveName,
            base64: ev.target.result,
            targetPath: saveName,
            fileName: file.name
          });

          addedElements.push(wrapper);
          changes.images++;
          updateCounter();
          showToast('Image added — drag to position, corners to resize');
        }

        /* Wait for click to place */
        setTimeout(function(){
          document.addEventListener('click', placeImage, true);
        }, 100);
      };
      reader.readAsDataURL(file);
    });

    fi.click();
  });

  /* ---- ADD TEXT ---- */
  addMenu.querySelector('[data-type="text"]').addEventListener('click', function(){
    menuOpen = false;
    addBtn.classList.remove('open');
    addMenu.classList.remove('open');

    /* Enter placement mode */
    placementHint.textContent = 'CLICK WHERE YOU WANT THE TEXT';
    placementHint.style.display = 'block';
    document.body.classList.add('jbc-placement-mode');

    function placeText(e2){
      document.body.classList.remove('jbc-placement-mode');
      placementHint.style.display = 'none';
      document.removeEventListener('click', placeText, true);

      var target = e2.target.closest('section') || e2.target.closest('.hero') || document.querySelector('.hero') || document.body;
      var rect = target.getBoundingClientRect();

      var wrapper = document.createElement('div');
      wrapper.className = 'jbc-added';
      wrapper.style.cssText = 'left:'+(e2.clientX - rect.left)+'px;top:'+(e2.clientY - rect.top)+'px;';

      var textEl = document.createElement('p');
      textEl.setAttribute('contenteditable','true');
      textEl.style.cssText = 'color:#fff;font-family:var(--font-display);font-size:2rem;font-weight:700;min-width:100px;padding:8px;margin:0;outline:none;background:transparent;';
      textEl.textContent = 'Your text here';
      textEl.setAttribute('data-added','true');

      var delBtn = document.createElement('button');
      delBtn.className = 'jbc-delete-btn';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', function(e3){
        e3.stopPropagation();
        wrapper.remove();
        showToast('Element removed');
      });

      wrapper.appendChild(textEl);
      wrapper.appendChild(delBtn);

      if(getComputedStyle(target).position === 'static') target.style.position = 'relative';
      target.appendChild(wrapper);

      makeDraggable(wrapper);

      /* Auto-focus the text */
      textEl.focus();
      document.execCommand('selectAll', false, null);

      textEl.addEventListener('blur', function(){
        changes.text++;
        updateCounter();
      });

      addedElements.push(wrapper);
      changes.text++;
      updateCounter();
      showToast('Text added — type to edit, drag to move');
    }

    setTimeout(function(){
      document.addEventListener('click', placeText, true);
    }, 100);
  });

  /* ========== DRAG HELPER ========== */
  function makeDraggable(el){
    var startX, startY, origX, origY, dragging = false;

    el.addEventListener('mousedown', function(e){
      if(e.target.classList.contains('jbc-resize-handle')) return;
      if(e.target.classList.contains('jbc-delete-btn')) return;
      if(e.target.getAttribute('contenteditable') === 'true' && document.activeElement === e.target) return;
      if(e.target.closest('.jbc-img-overlay')) return;
      if(e.button !== 0) return;

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = parseInt(el.style.left) || 0;
      origY = parseInt(el.style.top) || 0;
      el.style.opacity = '0.8';
      e.preventDefault();

      function onMove(e2){
        if(!dragging) return;
        el.style.left = (origX + e2.clientX - startX) + 'px';
        el.style.top  = (origY + e2.clientY - startY) + 'px';
      }
      function onUp(){
        dragging = false;
        el.style.opacity = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        changes.text++;
        updateCounter();
        showToast('Repositioned');
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /* ========== RESIZE HELPER ========== */
  function makeResizable(el, handle){
    var resizing = false, rStartX, rStartY, rStartW, rStartH;
    handle.addEventListener('mousedown', function(e){
      e.stopPropagation(); e.preventDefault();
      resizing = true;
      rStartX = e.clientX; rStartY = e.clientY;
      rStartW = el.offsetWidth; rStartH = el.offsetHeight;

      function onMove(e2){
        if(!resizing) return;
        el.style.width = Math.max(50, rStartW + e2.clientX - rStartX) + 'px';
      }
      function onUp(){
        resizing = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        changes.text++;
        updateCounter();
        showToast('Resized');
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /* ========== PAGE INFO ========== */
  function getPageInfo(){
    var p = window.location.pathname;
    var filename = 'index.html', subdir = '';
    if(p.indexOf('about')!==-1) filename='about.html';
    else if(p.indexOf('services')!==-1) filename='services.html';
    else if(p.indexOf('portfolio')!==-1) filename='portfolio.html';
    else if(p.indexOf('post-')!==-1){ filename='post-01.html'; subdir='blog'; }
    else if(p.indexOf('blog')!==-1) filename='blog.html';
    else if(p.indexOf('contact')!==-1) filename='contact.html';
    return {filename:filename,subdir:subdir};
  }

  /* ========== MAKE EXISTING TEXT EDITABLE ========== */
  var textSelectors = 'h1,h2,h3,h4,h5,h6,p,.section-label,.section-title,.section-subtitle,.section-text,.btn-primary,.btn-outline,blockquote,cite,.blog-card-content p,.blog-card-content h3,.blog-card-meta,.service-card h3,.service-card p,.value-card h3,.value-card p,.process-card h3,.process-card p,.service-detail-content h3,.service-detail-content p,.service-list li,.testi-brutal blockquote,.testi-brutal cite,.footer-brand > p,.footer-col h4,.footer-col a,.read-more,.sec-header h2,.sec-header span';

  document.querySelectorAll(textSelectors).forEach(function(el){
    if(el.closest('#jbc-editor-banner,#jbc-toolbar,#jbc-add-menu')) return;
    if(el.tagName==='A' && el.closest('.nav-links')) return;
    if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='INPUT'||el.tagName==='TEXTAREA') return;
    if(!el.textContent.trim()) return;

    el.setAttribute('contenteditable','true');
    el.classList.add('jbc-editable');
    el.spellcheck = false;
    originalTexts.set(el, el.innerHTML);
    el.addEventListener('focus', function(){ if(!el._snap) el._snap=el.innerHTML; });
    el.addEventListener('blur', function(){
      if(el.innerHTML !== el._snap){
        if(!el.classList.contains('jbc-text-changed')){ changes.text++; el.classList.add('jbc-text-changed'); updateCounter(); }
        el._snap = el.innerHTML;
        showToast('Text updated');
      }
    });
    el.addEventListener('keydown', function(e){
      if(e.key==='Enter'&&!e.shiftKey&&el.tagName!=='P'&&el.tagName!=='BLOCKQUOTE') e.preventDefault();
    });
  });

  /* ========== MAKE EXISTING IMAGES REPLACEABLE ========== */
  document.querySelectorAll('img').forEach(function(img){
    if(img.closest('#jbc-editor-banner,#jbc-toolbar,#jbc-add-menu')) return;
    if(img.width<40 && img.height<40) return;

    var wrap = document.createElement('div');
    wrap.className = 'jbc-img-wrap';
    wrap.style.cssText = 'position:relative;display:block;width:100%;height:100%;';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    var overlay = document.createElement('div');
    overlay.className = 'jbc-img-overlay';
    overlay.innerHTML = '<i class="fas fa-camera"></i><span>CLICK TO REPLACE</span>';
    wrap.appendChild(overlay);

    var fi = document.createElement('input');
    fi.type='file'; fi.accept='image/*'; fi.style.display='none';
    wrap.appendChild(fi);

    overlay.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); fi.click(); });

    fi.addEventListener('change', function(){
      var file = fi.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(e){
        var origSrc = img.getAttribute('data-orig-src') || img.getAttribute('src');
        if(!img.getAttribute('data-orig-src')) img.setAttribute('data-orig-src', origSrc);
        var targetPath = origSrc;
        if(targetPath.indexOf('data:')===0||targetPath.indexOf('http')===0){
          targetPath = 'images/uploaded-'+Date.now()+'.'+( file.name.split('.').pop()||'jpg');
        }
        img.src = e.target.result;
        img.removeAttribute('srcset');
        pendingImages.push({img:img,origSrc:origSrc,base64:e.target.result,targetPath:targetPath,fileName:file.name});
        changes.images++;
        updateCounter();
        showToast('Image replaced → '+targetPath);
      };
      reader.readAsDataURL(file);
    });
  });

  /* ========== BUILD CLEAN HTML ========== */
  function buildCleanHTML(imagePaths){
    var clone = document.documentElement.cloneNode(true);

    /* Remove all editor UI */
    clone.querySelectorAll('#jbc-editor-banner,#jbc-toolbar,#jbc-toast,#jbc-add-btn,#jbc-add-menu,#jbc-placement-hint').forEach(function(el){ el.remove(); });

    /* Clean contenteditable */
    clone.querySelectorAll('[contenteditable]').forEach(function(el){
      el.removeAttribute('contenteditable');
      el.classList.remove('jbc-editable','jbc-text-changed');
    });

    /* Clean added elements — keep them but remove editor controls */
    clone.querySelectorAll('.jbc-added').forEach(function(el){
      el.classList.remove('jbc-added');
      el.querySelectorAll('.jbc-delete-btn,.jbc-resize-handle').forEach(function(c){ c.remove(); });
      el.style.cursor = '';
      el.style.userSelect = '';
    });

    /* Unwrap image wrappers */
    clone.querySelectorAll('.jbc-img-wrap').forEach(function(wrap){
      var img = wrap.querySelector('img');
      if(img){
        var origSrc = img.getAttribute('data-orig-src');
        if(origSrc && imagePaths && imagePaths[origSrc]) img.src = imagePaths[origSrc];
        else if(origSrc && img.src.indexOf('data:')===0) img.src = origSrc;
        img.removeAttribute('data-orig-src');
        img.removeAttribute('data-added');
        img.removeAttribute('data-save-path');
        wrap.parentNode.insertBefore(img, wrap);
      }
      wrap.remove();
    });

    /* Handle added images not in wrappers */
    clone.querySelectorAll('img[data-save-path]').forEach(function(img){
      var sp = img.getAttribute('data-save-path');
      if(imagePaths && imagePaths[sp]) img.src = imagePaths[sp];
      else if(img.src.indexOf('data:')===0 && sp) img.src = sp;
      img.removeAttribute('data-save-path');
      img.removeAttribute('data-added');
      img.removeAttribute('data-orig-src');
    });

    clone.querySelectorAll('img[data-orig-src]').forEach(function(img){
      var origSrc = img.getAttribute('data-orig-src');
      if(imagePaths && imagePaths[origSrc]) img.src = imagePaths[origSrc];
      else if(img.src.indexOf('data:')===0) img.src = origSrc;
      img.removeAttribute('data-orig-src');
    });

    /* Remove editor styles */
    clone.querySelectorAll('style').forEach(function(s){
      if(s.textContent.indexOf('jbc-editor')!==-1||s.textContent.indexOf('jbc-editable')!==-1||s.textContent.indexOf('jbc-add')!==-1) s.remove();
    });

    var body = clone.querySelector('body');
    if(body) body.style.marginTop = '';
    body.classList.remove('jbc-placement-mode');

    return '<!DOCTYPE html>\n<html lang="en">\n' + clone.innerHTML + '\n</html>';
  }

  /* ========== SAVE (server mode) ========== */
  async function savePage(){
    if(!isServerMode){ showToast('Run "node server.js" to enable saving','error'); return; }
    var total = changes.text + changes.images;
    if(total===0){ showToast('No changes to save'); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
    showToast('Saving '+total+' changes...');

    try {
      var imagePaths = {};
      for(var i=0; i<pendingImages.length; i++){
        var pi = pendingImages[i];
        var resp = await fetch('/editor-save-image', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({path:pi.targetPath, base64:pi.base64})
        });
        var result = await resp.json();
        if(result.ok){ imagePaths[pi.origSrc]=pi.targetPath; }
        else throw new Error('Image save failed: '+result.error);
      }

      var pageInfo = getPageInfo();
      var cleanHTML = buildCleanHTML(imagePaths);

      var resp2 = await fetch('/editor-save', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({filename:pageInfo.filename, subdir:pageInfo.subdir, html:cleanHTML})
      });
      var result2 = await resp2.json();

      if(result2.ok){
        showToast('Saved! '+pageInfo.filename+' — ready to git push','success');
        changes = {text:0,images:0};
        pendingImages = [];
        updateCounter();
        document.querySelectorAll('.jbc-text-changed').forEach(function(el){ el.classList.remove('jbc-text-changed'); });
      } else throw new Error(result2.error);

    } catch(e){
      console.error('Save failed:', e);
      showToast('Save failed: '+e.message,'error');
    }

    saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE';
    saveBtn.disabled = (changes.text+changes.images)===0;
  }

  /* ========== DOWNLOAD (fallback) ========== */
  function downloadPage(){
    var pageInfo = getPageInfo();
    var html = buildCleanHTML({});
    var blob = new Blob([html],{type:'text/html'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = pageInfo.filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Downloaded '+pageInfo.filename);
  }

  /* ========== LOG ========== */
  console.log('✅ JBC Editor loaded! '+(isServerMode?'SERVER MODE':'PREVIEW MODE'));

})();
