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

    /* Change indicator dot */
    '.jbc-changed::after{content:"";position:absolute;top:4px;right:4px;width:8px;height:8px;background:#E84848;border-radius:50;z-index:101;}',
    '.jbc-text-changed{border-left:3px solid #E84848!important;padding-left:8px!important;}',

    /* Floating toolbar */
    '#jbc-toolbar{position:fixed;bottom:20px;right:20px;z-index:1000001;display:flex;flex-direction:column;gap:8px;align-items:flex-end;}',
    '#jbc-toolbar button{background:#1a1a1a;color:#fff;border:2px solid #fff;padding:12px 20px;font-family:monospace;font-size:12px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:8px;}',
    '#jbc-toolbar button:hover{background:#E84848;border-color:#E84848;}',
    '#jbc-toolbar .jbc-counter{background:#E84848;color:#fff;border-color:#E84848;pointer-events:none;padding:8px 14px;font-size:11px;}',

    /* Toast notification */
    '#jbc-toast{position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:1000002;background:#1a1a1a;color:#fff;font-family:monospace;font-size:13px;padding:12px 24px;border:2px solid #E84848;opacity:0;transition:opacity 0.3s;pointer-events:none;}',
    '#jbc-toast.show{opacity:1;}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- STATE ---------- */
  var changes = {text:0, images:0};
  var originalTexts = new Map();

  /* ---------- BANNER ---------- */
  var banner = document.createElement('div');
  banner.id = 'jbc-editor-banner';
  banner.innerHTML = '<span>EDITOR MODE — Click text to edit &bull; Hover images to replace</span>';
  document.body.prepend(banner);
  document.body.style.marginTop = '40px';

  /* ---------- TOAST ---------- */
  var toast = document.createElement('div');
  toast.id = 'jbc-toast';
  document.body.appendChild(toast);

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ toast.classList.remove('show'); }, 2500);
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
  }
  updateCounter();

  /* Download button */
  var dlBtn = document.createElement('button');
  dlBtn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD PAGE';
  dlBtn.title = 'Download this page with your edits';
  dlBtn.addEventListener('click', downloadPage);
  toolbar.appendChild(dlBtn);

  /* Reset button */
  var resetBtn = document.createElement('button');
  resetBtn.innerHTML = '<i class="fas fa-undo"></i> RESET ALL';
  resetBtn.title = 'Undo all edits on this page';
  resetBtn.addEventListener('click', function(){
    if(!confirm('Reset all changes on this page? This cannot be undone.')) return;
    location.reload();
  });
  toolbar.appendChild(resetBtn);

  /* ---------- MAKE TEXT EDITABLE ---------- */
  var textSelectors = [
    'h1','h2','h3','h4','h5','h6',
    'p',
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

  /* Exclude nav, footer links, and form elements from contentEditable */
  var editableEls = document.querySelectorAll(textSelectors);

  editableEls.forEach(function(el){
    /* Skip nav links, scripts, style tags */
    if(el.closest('#jbc-editor-banner') || el.closest('#jbc-toolbar')) return;
    if(el.tagName === 'A' && el.closest('.nav-links')) return;
    if(el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return;

    /* Skip very short utility text */
    var txt = el.textContent.trim();
    if(!txt || txt.length < 1) return;

    el.setAttribute('contenteditable', 'true');
    el.classList.add('jbc-editable');
    el.spellcheck = false;
    originalTexts.set(el, el.innerHTML);

    el.addEventListener('focus', function(){
      /* Store for comparison */
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

    /* Prevent Enter from creating divs — just a <br> */
    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){
        /* Allow Enter in paragraphs / blockquotes */
        if(el.tagName === 'P' || el.tagName === 'BLOCKQUOTE') return;
        e.preventDefault();
      }
    });
  });

  /* ---------- MAKE IMAGES REPLACEABLE ---------- */
  var allImages = document.querySelectorAll('img');

  allImages.forEach(function(img){
    /* Skip tiny icons, logos inside editor */
    if(img.closest('#jbc-editor-banner') || img.closest('#jbc-toolbar')) return;
    if(img.width < 40 && img.height < 40) return;

    var parent = img.parentElement;

    /* Create wrapper if parent isn't already positioned */
    var wrap = document.createElement('div');
    wrap.className = 'jbc-img-wrap';
    wrap.style.cssText = 'position:relative;display:' + (parent.style.display || 'block') + ';width:100%;height:100%;';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    /* Create overlay */
    var overlay = document.createElement('div');
    overlay.className = 'jbc-img-overlay';
    overlay.innerHTML = '<i class="fas fa-camera"></i><span>CLICK TO REPLACE</span>';
    wrap.appendChild(overlay);

    /* Hidden file input */
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
        img.src = e.target.result;
        img.removeAttribute('srcset');
        img.style.filter = 'none'; /* remove grayscale for preview */
        changes.images++;
        updateCounter();
        showToast('Image replaced — ' + file.name);
      };
      reader.readAsDataURL(file);
    });
  });

  /* ---------- DOWNLOAD FUNCTION ---------- */
  function downloadPage(){
    /* Clone the document */
    var clone = document.documentElement.cloneNode(true);

    /* Remove editor elements from clone */
    var removeSelectors = ['#jbc-editor-banner','#jbc-toolbar','#jbc-toast','style'];
    clone.querySelectorAll('#jbc-editor-banner, #jbc-toolbar, #jbc-toast').forEach(function(el){ el.remove(); });

    /* Remove contenteditable attributes */
    clone.querySelectorAll('[contenteditable]').forEach(function(el){
      el.removeAttribute('contenteditable');
      el.classList.remove('jbc-editable','jbc-text-changed');
    });

    /* Unwrap image wrappers */
    clone.querySelectorAll('.jbc-img-wrap').forEach(function(wrap){
      var img = wrap.querySelector('img');
      if(img){
        wrap.parentNode.insertBefore(img, wrap);
      }
      wrap.remove();
    });

    /* Remove editor-specific styles */
    clone.querySelectorAll('style').forEach(function(s){
      if(s.textContent.indexOf('jbc-editor') !== -1 || s.textContent.indexOf('jbc-editable') !== -1){
        s.remove();
      }
    });

    /* Fix body margin */
    var body = clone.querySelector('body');
    if(body) body.style.marginTop = '';

    /* Build HTML string */
    var html = '<!DOCTYPE html>\n<html lang="en">\n' + clone.innerHTML + '\n</html>';

    /* Determine filename */
    var path = window.location.pathname;
    var filename = 'index.html';
    if(path.indexOf('about') !== -1) filename = 'about.html';
    else if(path.indexOf('services') !== -1) filename = 'services.html';
    else if(path.indexOf('portfolio') !== -1) filename = 'portfolio.html';
    else if(path.indexOf('blog/') !== -1 || path.indexOf('post-') !== -1) filename = 'post-01.html';
    else if(path.indexOf('blog') !== -1) filename = 'blog.html';
    else if(path.indexOf('contact') !== -1) filename = 'contact.html';

    /* Trigger download */
    var blob = new Blob([html], {type:'text/html'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);

    showToast('Downloaded ' + filename + ' with ' + (changes.text + changes.images) + ' changes');
  }

  /* ---------- LOG ---------- */
  console.log('✅ JBC Visual Editor loaded! Click text to edit, hover images to replace. ' + editableEls.length + ' text elements, ' + allImages.length + ' images.');

})();
