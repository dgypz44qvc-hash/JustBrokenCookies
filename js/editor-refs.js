/* ============================================
   JUSTBROKENCOOKIES — Inline Visual Editor
   Activate by adding ?edit to any page URL
   ============================================ */
(function(){
  if(window.location.search.indexOf('edit') === -1) return;

  /* ---------- STYLES ---------- */
  var css = document.createElement('style');
  css.textContent = [
    /* Banner */
    '#jbc-editor-banner{position:fixed;top:0;left:0;right:0;z-index:1000000;background:#E84848;color:#fff;text-align:center;font-family:monospace;font-size:13px;font-weight:bold;padding:10px 20px;letter-spacing:1px;display:flex;align-items:center;justify-content:center;gap:20px;}',
    '#jbc-editor-banner button{background:#fff;color:#E84848;border:none;padding:6px 16px;font-family:monospace;font-size:12px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;}',
    '#jbc-editor-banner button:hover{background:#ffd;color:#000;}',

    /* Editable text highlight */
    '.jbc-editable{outline:2px dashed transparent;outline-offset:3px;cursor:text;transition:outline-color 0.2s;}',
    '.jbc-editable:hover{outline-color:rgba(232,72,72,0.5);}',
    '.jbc-editable:focus{outline-color:#E84848;outline-style:solid;background:rgba(232,72,72,0.05);}',

    /* Image overlay */
    '.jbc-img-wrap{position:relative;display:block;}',
    '.jbc-img-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);opacity:0;transition:opacity 0.25s;cursor:pointer;z-index:100;}',
    '.jbc-img-wrap:hover .jbc-img-overlay{opacity:1;}',
    '.jbc-img-overlay span{color:#fff;font-family:monospace;font-size:14px;font-weight:bold;letter-spacing:1px;pointer-events:none;}',
    '.jbc-img-overlay i{font-size:36px;color:#fff;margin-bottom:10px;pointer-events:none;}',

    /* Change indicator */
    '.jbc-changed::after{content:"";position:absolute;top:4px;right:4px;width:8px;height:8px;background:#E84848;border-radius:50;z-index:101;}',
    '.jbc-text-changed{border-left:3px solid #E84848!important;padding-left:8px!important;}',
    '.jbc-img-saved::after{content:"✓ saved";position:absolute;top:8px;left:8px;background:#2ecc40;color:#fff;font-family:monospace;font-size:10px;padding:2px 8px;z-index:102;pointer-events:none;}',

    /* Floating toolbar */
    '#jbc-toolbar{position:fixed;bottom:20px;right:20px;z-index:1000001;display:flex;flex-direction:column;gap:8px;align-items:flex-end;}',
    '#jbc-toolbar button{background:#1a1a1a;color:#fff;border:2px solid #fff;padding:12px 20px;font-family:monospace;font-size:12px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:8px;}',
    '#jbc-toolbar button:hover{background:#E84848;border-color:#E84848;}',
    '#jbc-toolbar button:disabled{opacity:0.4;cursor:not-allowed;background:#333!important;border-color:#555!important;}',
    '#jbc-toolbar .jbc-counter{background:#E84848;color:#fff;border-color:#E84848;pointer-events:none;padding:8px 14px;font-size:11px;}',
    '#jbc-toolbar .jbc-save-btn{background:#2ecc40;border-color:#2ecc40;font-size:14px;padding:14px 24px;}',
    '#jbc-toolbar .jbc-save-btn:hover{background:#27ae60;border-color:#27ae60;}',

    /* Toast notification */
    '#jbc-toast{position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:1000002;background:#1a1a1a;color:#fff;font-family:monospace;font-size:13px;padding:12px 24px;border:2px solid #E84848;opacity:0;transition:opacity 0.3s;pointer-events:none;}',
    '#jbc-toast.show{opacity:1;}',
    '#jbc-toast.success{border-color:#2ecc40;}',
    '#jbc-toast.error{border-color:#E84848;background:#3a0a0a;}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- DETECT SERVER MODE ---------- */
  var isServerMode = (window.location.protocol === 'http:' && window.location.hostname === 'localhost');

  /* ---------- STATE ---------- */
  var changes = {text:0, images:0};
  var originalTexts = new Map();
  var pendingImages = []; /* {img, origSrc, base64, targetPath} */

  /* ---------- BANNER ---------- */
  var banner = document.createElement('div');
  banner.id = 'jbc-editor-banner';
  if(isServerMode){
    banner.innerHTML = '<span>EDITOR MODE — Click text to edit • Hover images to replace • Hit SAVE to write to files</span>';
  } else {
    banner.innerHTML = '<span>EDITOR MODE (preview only) — Run <b>node server.js</b> for save-to-file</span>';
  }
  document.body.prepend(banner);
  document.body.style.marginTop = '40px';

  /* ---------- TOAST ---------- */
  var toast = document.createElement('div');
  toast.id = 'jbc-toast';
  document.body.appendChild(toast);

  function showToast(msg, type){
    toast.textContent = msg;
    toast.className = 'show' + (type ? ' ' + type : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ toast.className = ''; }, 3000);
  }

  /* ---------- COUNTER + TOOLBAR ---------- */
  var toolbar = document.createElement('div');
  toolbar.id = 'jbc-toolbar';
  document.body.appendChild(toolbar);

  var counter = document.createElement('button');
  counter.className = 'jbc-counter';
  counter.textContent = '0 changes';
  toolbar.appendChild(counter);

  function updateCounter(){
    var total = changes.text + changes.images;
    counter.textContent = total + ' change' + (total !== 1 ? 's' : '');
    counter.style.display = total > 0 ? '' : 'none';
    saveBtn.disabled = total === 0;
  }

  /* SAVE button */
  var saveBtn = document.createElement('button');
  saveBtn.className = 'jbc-save-btn';
  saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE';
  saveBtn.disabled = true;
  saveBtn.title = isServerMode ? 'Save changes to your project files' : 'Run node server.js first to enable saving';
  saveBtn.addEventListener('click', savePage);
  toolbar.appendChild(saveBtn);

  /* Download fallback button */
  var dlBtn = document.createElement('button');
  dlBtn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD';
  dlBtn.title = 'Download page as HTML file';
  dlBtn.addEventListener('click', downloadPage);
  toolbar.appendChild(dlBtn);

  /* Reset button */
  var resetBtn = document.createElement('button');
  resetBtn.innerHTML = '<i class="fas fa-undo"></i> RESET';
  resetBtn.title = 'Undo all edits on this page';
  resetBtn.addEventListener('click', function(){
    if(!confirm('Reset all changes on this page?')) return;
    location.reload();
  });
  toolbar.appendChild(resetBtn);

  updateCounter();

  /* ---------- DETECT PAGE ---------- */
  function getPageInfo(){
    var p = window.location.pathname;
    var filename = 'index.html';
    var subdir = '';
    if(p.indexOf('about') !== -1) filename = 'about.html';
    else if(p.indexOf('services') !== -1) filename = 'services.html';
    else if(p.indexOf('portfolio') !== -1) filename = 'portfolio.html';
    else if(p.indexOf('post-') !== -1){ filename = 'post-01.html'; subdir = 'blog'; }
    else if(p.indexOf('blog') !== -1) filename = 'blog.html';
    else if(p.indexOf('contact') !== -1) filename = 'contact.html';
    return {filename: filename, subdir: subdir};
  }

  /* ---------- MAKE TEXT EDITABLE ---------- */
  var textSelectors = [
    'h1','h2','h3','h4','h5','h6','p',
    '.section-label','.section-title','.section-subtitle','.section-text',
    '.btn-primary','.btn-outline',
    'blockquote','cite',
    '.blog-card-content p','.blog-card-content h3','.blog-card-meta',
    '.service-card h3','.service-card p',
    '.portfolio-overlay span','.portfolio-overlay h3',
    '.value-card h3','.value-card p',
    '.stat-number','.stat-label',
    '.team-info h3','.team-info p',
    '.process-card h3','.process-card p',
    '.service-detail-content h3','.service-detail-content p',
    '.service-list li',
    '.contact-info-item h4','.contact-info-item a','.contact-info-item p',
    '.testi-brutal blockquote','.testi-brutal cite',
    '.footer-brand > p',
    '.footer-col h4','.footer-col a',
    '.read-more',
    '.blog-post p','.blog-post h2',
    '.marquee-text','.manifesto p',
    '.sec-header h2','.sec-header span',
    'a.nav-links > a'
  ].join(',');

  var editableEls = document.querySelectorAll(textSelectors);

  editableEls.forEach(function(el){
    if(el.closest('#jbc-editor-banner') || el.closest('#jbc-toolbar')) return;
    if(el.tagName === 'A' && el.closest('.nav-links')) return;
    if(el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return;

    var txt = el.textContent.trim();
    if(!txt || txt.length < 1) return;

    el.setAttribute('contenteditable', 'true');
    el.classList.add('jbc-editable');
    el.spellcheck = false;
    originalTexts.set(el, el.innerHTML);

    el.addEventListener('focus', function(){
      if(!el._snapshot) el._snapshot = el.innerHTML;
    });

    el.addEventListener('blur', function(){
      if(el.innerHTML !== el._snapshot){
        if(!el.classList.contains('jbc-text-changed')){
          changes.text++;
          el.classList.add('jbc-text-changed');
          updateCounter();
        }
        el._snapshot = el.innerHTML;
        showToast('Text updated');
      }
    });

    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){
        if(el.tagName === 'P' || el.tagName === 'BLOCKQUOTE') return;
        e.preventDefault();
      }
    });
  });

  /* ---------- MAKE IMAGES REPLACEABLE ---------- */
  var allImages = document.querySelectorAll('img');

  allImages.forEach(function(img){
    if(img.closest('#jbc-editor-banner') || img.closest('#jbc-toolbar')) return;
    if(img.width < 40 && img.height < 40) return;

    var parent = img.parentElement;

    var wrap = document.createElement('div');
    wrap.className = 'jbc-img-wrap';
    wrap.style.cssText = 'position:relative;display:' + (parent.style.display || 'block') + ';width:100%;height:100%;';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    var overlay = document.createElement('div');
    overlay.className = 'jbc-img-overlay';
    overlay.innerHTML = '<i class="fas fa-camera"></i><span>CLICK TO REPLACE</span>';
    wrap.appendChild(overlay);

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    wrap.appendChild(fileInput);

    overlay.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      fileInput.click();
    });

    fileInput.addEventListener('change', function(){
      var file = fileInput.files[0];
      if(!file) return;

      var reader = new FileReader();
      reader.onload = function(e){
        var base64 = e.target.result;

        /* Determine target save path from original src */
        var origSrc = img.getAttribute('data-orig-src') || img.getAttribute('src');
        if(!img.getAttribute('data-orig-src')){
          img.setAttribute('data-orig-src', origSrc);
        }

        /* Build a clean path — keep same filename location */
        var targetPath = origSrc;
        if(targetPath.indexOf('data:') === 0 || targetPath.indexOf('http') === 0){
          /* Fallback: save to images folder with timestamp name */
          var ext = file.name.split('.').pop() || 'jpg';
          targetPath = 'images/uploaded-' + Date.now() + '.' + ext;
        }

        /* Show preview immediately */
        img.src = base64;
        img.removeAttribute('srcset');

        /* Track for save */
        pendingImages.push({
          img: img,
          origSrc: origSrc,
          base64: base64,
          targetPath: targetPath,
          fileName: file.name
        });

        changes.images++;
        updateCounter();
        showToast('Image replaced — will save as ' + targetPath);
      };
      reader.readAsDataURL(file);
    });
  });

  /* ---------- BUILD CLEAN HTML ---------- */
  function buildCleanHTML(imagePaths){
    var clone = document.documentElement.cloneNode(true);

    /* Remove editor elements */
    clone.querySelectorAll('#jbc-editor-banner, #jbc-toolbar, #jbc-toast').forEach(function(el){ el.remove(); });

    /* Clean contenteditable */
    clone.querySelectorAll('[contenteditable]').forEach(function(el){
      el.removeAttribute('contenteditable');
      el.classList.remove('jbc-editable','jbc-text-changed');
    });

    /* Clean drag/resize classes but KEEP inline styles (transform, width, height) */
    clone.querySelectorAll('.jbc-draggable').forEach(function(el){
      el.classList.remove('jbc-draggable','jbc-dragging');
      /* Remove editor helper elements */
      el.querySelectorAll('.jbc-move-label, .jbc-pos-info, .jbc-resize-handle').forEach(function(h){ h.remove(); });
    });

    /* Unwrap image wrappers and restore file paths */
    clone.querySelectorAll('.jbc-img-wrap').forEach(function(wrap){
      var img = wrap.querySelector('img');
      if(img){
        /* If this image was replaced, set src to the file path (not base64) */
        var origSrc = img.getAttribute('data-orig-src');
        if(origSrc && imagePaths && imagePaths[origSrc]){
          img.src = imagePaths[origSrc];
        } else if(origSrc && img.src.indexOf('data:') === 0){
          /* Restore original if not saved */
          img.src = origSrc;
        }
        img.removeAttribute('data-orig-src');
        wrap.parentNode.insertBefore(img, wrap);
      }
      wrap.remove();
    });

    /* Also handle images not in wrappers */
    clone.querySelectorAll('img[data-orig-src]').forEach(function(img){
      var origSrc = img.getAttribute('data-orig-src');
      if(imagePaths && imagePaths[origSrc]){
        img.src = imagePaths[origSrc];
      } else if(img.src.indexOf('data:') === 0){
        img.src = origSrc;
      }
      img.removeAttribute('data-orig-src');
    });

    /* Remove editor styles */
    clone.querySelectorAll('style').forEach(function(s){
      if(s.textContent.indexOf('jbc-editor') !== -1 || s.textContent.indexOf('jbc-editable') !== -1){
        s.remove();
      }
    });

    /* Fix body margin */
    var body = clone.querySelector('body');
    if(body) body.style.marginTop = '';

    return '<!DOCTYPE html>\n<html lang="en">\n' + clone.innerHTML + '\n</html>';
  }

  /* ---------- SAVE FUNCTION (server mode) ---------- */
  async function savePage(){
    if(!isServerMode){
      showToast('Run "node server.js" in your website folder to enable saving', 'error');
      return;
    }

    var total = changes.text + changes.images;
    if(total === 0){
      showToast('No changes to save');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
    showToast('Saving ' + total + ' changes...');

    try {
      var imagePaths = {};
      var savedImgCount = 0;

      /* 1. Save all pending images first */
      for(var i = 0; i < pendingImages.length; i++){
        var pi = pendingImages[i];
        var resp = await fetch('/editor-save-image', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            path: pi.targetPath,
            base64: pi.base64
          })
        });
        var result = await resp.json();
        if(result.ok){
          imagePaths[pi.origSrc] = pi.targetPath;
          savedImgCount++;
          console.log('Saved image:', pi.targetPath);
        } else {
          throw new Error('Failed to save image: ' + result.error);
        }
      }

      /* 2. Build clean HTML with file paths instead of base64 */
      var pageInfo = getPageInfo();
      var cleanHTML = buildCleanHTML(imagePaths);

      /* 3. Save the HTML file */
      var resp2 = await fetch('/editor-save', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          filename: pageInfo.filename,
          subdir: pageInfo.subdir,
          html: cleanHTML
        })
      });
      var result2 = await resp2.json();

      if(result2.ok){
        showToast('Saved! ' + changes.text + ' text + ' + savedImgCount + ' images → ' + pageInfo.filename, 'success');

        /* Reset state */
        changes = {text:0, images:0};
        pendingImages = [];
        updateCounter();

        /* Remove change indicators */
        document.querySelectorAll('.jbc-text-changed').forEach(function(el){
          el.classList.remove('jbc-text-changed');
        });
      } else {
        throw new Error(result2.error);
      }

    } catch(e){
      console.error('Save failed:', e);
      showToast('Save failed: ' + e.message, 'error');
    }

    saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE';
    saveBtn.disabled = (changes.text + changes.images) === 0;
  }

  /* ---------- DOWNLOAD FUNCTION (fallback) ---------- */
  function downloadPage(){
    var pageInfo = getPageInfo();
    var html = buildCleanHTML({});
    var blob = new Blob([html], {type:'text/html'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = pageInfo.filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Downloaded ' + pageInfo.filename);
  }

  /* ============================================
     HERO DRAG & RESIZE
     Makes hero children draggable + resizable
     ============================================ */
  var heroSection = document.querySelector('.hero');
  if(heroSection){

    /* Extra styles for drag/resize */
    var dragCSS = document.createElement('style');
    dragCSS.textContent = [
      '.jbc-draggable{cursor:move!important;user-select:none;position:relative;}',
      '.jbc-draggable:hover{outline:2px solid var(--gold,#E8891D)!important;outline-offset:4px;}',
      '.jbc-dragging{opacity:0.85;z-index:9999!important;}',
      '.jbc-resize-handle{position:absolute;bottom:-4px;right:-4px;width:14px;height:14px;background:#E84848;cursor:nwse-resize;z-index:200;border:2px solid #fff;display:none;}',
      '.jbc-draggable:hover .jbc-resize-handle{display:block;}',
      '.jbc-move-label{position:absolute;top:-22px;left:0;background:#E8891D;color:#000;font-family:monospace;font-size:9px;padding:2px 6px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;pointer-events:none;display:none;z-index:201;}',
      '.jbc-draggable:hover .jbc-move-label{display:block;}',
      '.jbc-pos-info{position:absolute;bottom:-20px;left:0;font-family:monospace;font-size:9px;color:#888;pointer-events:none;display:none;white-space:nowrap;}',
      '.jbc-dragging .jbc-pos-info{display:block;}'
    ].join('\n');
    document.head.appendChild(dragCSS);

    /* Elements to make draggable in the hero */
    var heroTargets = heroSection.querySelectorAll('.hero-mega, .hero-mega .l1, .hero-mega .l2, .hero-mega .l3, .hero-portrait, .tag, .hero-bottom, .hero-bottom .desc');

    heroTargets.forEach(function(el){
      /* Skip if inside editor UI */
      if(el.closest('#jbc-editor-banner') || el.closest('#jbc-toolbar')) return;

      el.classList.add('jbc-draggable');

      /* Ensure element is positioned so translate works */
      var cs = window.getComputedStyle(el);
      if(cs.position === 'static'){
        el.style.position = 'relative';
      }

      /* Move label */
      var label = document.createElement('div');
      label.className = 'jbc-move-label';
      label.textContent = '⤡ DRAG TO MOVE';
      el.appendChild(label);

      /* Position info */
      var posInfo = document.createElement('div');
      posInfo.className = 'jbc-pos-info';
      el.appendChild(posInfo);

      /* Resize handle (for portrait and content blocks) */
      var resizable = el.classList.contains('hero-portrait') ||
                      el.tagName === 'IMG' ||
                      el.classList.contains('hero-mega');
      var resizeHandle = null;
      if(resizable){
        resizeHandle = document.createElement('div');
        resizeHandle.className = 'jbc-resize-handle';
        el.appendChild(resizeHandle);
      }

      /* --- DRAG LOGIC --- */
      var startX, startY, startLeft, startTop, isDragging = false;

      el.addEventListener('mousedown', function(e){
        /* Don't drag if clicking resize handle, editing text, or clicking image overlay */
        if(e.target.classList.contains('jbc-resize-handle')) return;
        if(e.target.getAttribute('contenteditable') === 'true' && document.activeElement === e.target) return;
        if(e.target.closest('.jbc-img-overlay')) return;

        /* Only drag on left-click */
        if(e.button !== 0) return;

        isDragging = true;
        el.classList.add('jbc-dragging');
        startX = e.clientX;
        startY = e.clientY;

        /* Get current translate or position values */
        var transform = el.style.transform || '';
        var match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        startLeft = match ? parseFloat(match[1]) : 0;
        startTop = match ? parseFloat(match[2]) : 0;

        e.preventDefault();

        function onMove(e2){
          if(!isDragging) return;
          var dx = e2.clientX - startX;
          var dy = e2.clientY - startY;
          var newX = startLeft + dx;
          var newY = startTop + dy;
          el.style.transform = 'translate(' + newX + 'px, ' + newY + 'px)';
          posInfo.textContent = 'x:' + Math.round(newX) + ' y:' + Math.round(newY);
        }

        function onUp(){
          isDragging = false;
          el.classList.remove('jbc-dragging');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);

          /* Count as a change */
          if(!el._dragChanged){
            el._dragChanged = true;
            changes.text++;
            updateCounter();
          }
          showToast('Element repositioned');
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      /* --- RESIZE LOGIC --- */
      if(resizeHandle){
        var resizing = false, rStartX, rStartY, rStartW, rStartH;

        resizeHandle.addEventListener('mousedown', function(e){
          e.stopPropagation();
          e.preventDefault();
          resizing = true;
          rStartX = e.clientX;
          rStartY = e.clientY;
          rStartW = el.offsetWidth;
          rStartH = el.offsetHeight;

          function onResizeMove(e2){
            if(!resizing) return;
            var dw = e2.clientX - rStartX;
            var dh = e2.clientY - rStartY;
            el.style.width = Math.max(50, rStartW + dw) + 'px';
            el.style.height = Math.max(50, rStartH + dh) + 'px';
            posInfo.textContent = Math.round(parseFloat(el.style.width)) + ' × ' + Math.round(parseFloat(el.style.height));
            posInfo.style.display = 'block';
          }

          function onResizeUp(){
            resizing = false;
            posInfo.style.display = '';
            document.removeEventListener('mousemove', onResizeMove);
            document.removeEventListener('mouseup', onResizeUp);

            if(!el._resizeChanged){
              el._resizeChanged = true;
              changes.text++;
              updateCounter();
            }
            showToast('Element resized');
          }

          document.addEventListener('mousemove', onResizeMove);
          document.addEventListener('mouseup', onResizeUp);
        });
      }
    });

    console.log('   ⤡ Hero drag/resize enabled for', heroTargets.length, 'elements');
  }

  /* ---------- LOG ---------- */
  console.log('✅ JBC Visual Editor loaded! ' + (isServerMode ? 'SERVER MODE — saves go to disk.' : 'PREVIEW MODE — run node server.js for save-to-file.'));
  console.log('   ' + editableEls.length + ' text elements, ' + allImages.length + ' images.');

})();
