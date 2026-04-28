/* ============================================
   JUSTBROKENCOOKIES — Inline Visual Editor
   Activate by adding ?edit to any page URL
   ============================================ */
(function(){
  if(window.location.search.indexOf('edit') === -1) return;

  /* ========== STYLES ========== */
  var css = document.createElement('style');
  css.textContent = `
    /* Banner — green */
    #jbc-editor-banner{position:fixed;top:0;left:0;right:0;z-index:1000000;background:#2ecc40;color:#000;text-align:center;font-family:monospace;font-size:13px;font-weight:bold;padding:10px 20px;letter-spacing:1px;}

    /* Editable text */
    .jbc-editable{outline:2px dashed transparent;outline-offset:3px;cursor:text;transition:outline-color 0.2s;}
    .jbc-editable:hover{outline-color:rgba(46,204,64,0.5);}
    .jbc-editable:focus{outline-color:#2ecc40;outline-style:solid;background:rgba(46,204,64,0.05);}
    .jbc-text-changed{border-left:3px solid #2ecc40!important;padding-left:8px!important;}

    /* Image overlay */
    .jbc-img-wrap{position:relative;display:block;}
    .jbc-img-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);opacity:0;transition:opacity 0.25s;cursor:pointer;z-index:100;}
    .jbc-img-wrap:hover .jbc-img-overlay{opacity:1;}
    .jbc-img-overlay span{color:#fff;font-family:monospace;font-size:14px;font-weight:bold;letter-spacing:1px;pointer-events:none;}
    .jbc-img-overlay i{font-size:36px;color:#fff;margin-bottom:10px;pointer-events:none;}

    /* Toolbar */
    #jbc-toolbar{position:fixed;bottom:20px;right:20px;z-index:1000001;display:flex;flex-direction:column;gap:8px;align-items:flex-end;}
    #jbc-toolbar button{background:#1a1a1a;color:#fff;border:2px solid #fff;padding:12px 20px;font-family:monospace;font-size:12px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:8px;}
    #jbc-toolbar button:hover{background:#2ecc40;border-color:#2ecc40;color:#000;}
    #jbc-toolbar button:disabled{opacity:0.4;cursor:not-allowed;background:#333!important;border-color:#555!important;color:#fff!important;}
    #jbc-toolbar .jbc-counter{background:#2ecc40;color:#000;border-color:#2ecc40;pointer-events:none;padding:8px 14px;font-size:11px;}
    #jbc-toolbar .jbc-save-btn{background:#2ecc40;border-color:#2ecc40;color:#000;font-size:14px;padding:14px 24px;}
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
    .jbc-added{position:absolute;z-index:10;cursor:move;user-select:none;}
    .jbc-added:hover{outline:2px solid #E8891D;outline-offset:4px;}
    .jbc-added.jbc-selected{outline:2px solid #2ecc40!important;outline-offset:4px!important;z-index:9999!important;}
    .jbc-added.jbc-grabbed{outline:3px solid #ff0!important;outline-offset:6px!important;z-index:9999!important;box-shadow:0 0 30px rgba(255,255,0,0.3)!important;}
    .jbc-added .jbc-delete-btn{position:absolute;top:-12px;right:-12px;width:24px;height:24px;background:#E84848;color:#fff;border:2px solid #fff;border-radius:50%;font-size:14px;cursor:pointer;display:none;align-items:center;justify-content:center;z-index:300;font-family:monospace;line-height:1;}
    .jbc-added:hover .jbc-delete-btn{display:flex;}
    .jbc-added .jbc-resize-handle{position:absolute;bottom:-5px;right:-5px;width:14px;height:14px;background:#E8891D;cursor:nwse-resize;z-index:200;border:2px solid #fff;display:none;}
    .jbc-added:hover .jbc-resize-handle{display:block;}
    .jbc-added .jbc-resize-handle-r{position:absolute;top:50%;right:-4px;width:8px;height:30px;margin-top:-15px;background:#E8891D;cursor:ew-resize;z-index:200;border:2px solid #fff;border-radius:3px;display:none;}
    .jbc-added .jbc-resize-handle-b{position:absolute;bottom:-4px;left:50%;height:8px;width:30px;margin-left:-15px;background:#E8891D;cursor:ns-resize;z-index:200;border:2px solid #fff;border-radius:3px;display:none;}
    .jbc-added:hover .jbc-resize-handle-r,.jbc-added:hover .jbc-resize-handle-b{display:block;}
    /* ---- ALIGNMENT GUIDES ---- */
    #jbc-guides{position:fixed;inset:0;z-index:999998;pointer-events:none;display:none;}
    #jbc-guides.visible{display:block;}
    #jbc-guides .jbc-guide{position:absolute;background:rgba(0,180,255,0.35);}
    #jbc-guides .jbc-guide-label{position:absolute;background:rgba(0,180,255,0.8);color:#fff;font-family:monospace;font-size:9px;padding:2px 5px;white-space:nowrap;}
    #jbc-guides .jbc-guide-v{width:1px;top:0;bottom:0;}
    #jbc-guides .jbc-guide-h{height:1px;left:0;right:0;}
    #jbc-guides .jbc-guide-v.center{background:rgba(255,50,50,0.5);}
    #jbc-guides .jbc-guide-h.center{background:rgba(255,50,50,0.5);}
    #jbc-guides .jbc-guide-v.third{background:rgba(0,180,255,0.2);}
    #jbc-guides .jbc-guide-h.third{background:rgba(0,180,255,0.2);}
    #jbc-guides .jbc-guide-v.container-edge{background:rgba(46,204,64,0.3);width:1px;}
    #jbc-snap-line{position:fixed;z-index:999999;pointer-events:none;display:none;}
    #jbc-snap-line.visible{display:block;}
    #jbc-snap-line .snap-v{position:absolute;width:1px;top:0;bottom:0;background:#ff0;}
    #jbc-snap-line .snap-h{position:absolute;height:1px;left:0;right:0;background:#ff0;}
    #jbc-toolbar .jbc-guides-btn{background:#0af;border-color:#0af;color:#000;}
    #jbc-toolbar .jbc-guides-btn.active{background:#2ecc40;border-color:#2ecc40;}

    .jbc-added-text{cursor:move;}
    .jbc-added-text:hover{outline:2px dashed rgba(46,204,64,0.5)!important;outline-offset:3px!important;}
    .jbc-added-text.jbc-selected{outline:2px dashed #2ecc40!important;outline-offset:3px!important;}
    .jbc-added-text.jbc-editing{outline:2px solid #2ecc40!important;outline-offset:3px!important;cursor:text!important;}
    .jbc-added-text.jbc-editing *{cursor:text!important;}
    .jbc-added[data-box="text"]{min-height:30px;}

    /* Toast */
    #jbc-toast{position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:1000002;background:#1a1a1a;color:#fff;font-family:monospace;font-size:13px;padding:12px 24px;border:2px solid #2ecc40;opacity:0;transition:opacity 0.3s;pointer-events:none;}
    #jbc-toast.show{opacity:1;}
    #jbc-toast.success{border-color:#2ecc40;}
    #jbc-toast.error{border-color:#E84848;background:#3a0a0a;}

    /* Right-click context menu */
    #jbc-context-menu{position:fixed;z-index:1000010;background:#1a1a1a;border:2px solid #E8891D;display:none;min-width:220px;max-height:80vh;overflow-y:auto;font-family:monospace;box-shadow:0 8px 30px rgba(0,0,0,0.6);}
    #jbc-context-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px;background:none;border:none;border-bottom:1px solid #333;color:#fff;font-family:monospace;font-size:12px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;text-align:left;}
    #jbc-context-menu button:last-child{border-bottom:none;}
    #jbc-context-menu button:hover{background:#E8891D;color:#000;}
    #jbc-context-menu button i{width:18px;text-align:center;font-size:14px;flex-shrink:0;}
    #jbc-context-menu .jbc-menu-header{padding:8px 16px;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #333;}
    #jbc-context-menu .jbc-layer-item{padding:8px 16px;font-size:11px;}
    #jbc-context-menu .jbc-layer-item.active{background:#333;color:#2ecc40;}
    #jbc-context-menu .jbc-layer-preview{max-width:20px;max-height:16px;margin-right:4px;vertical-align:middle;display:inline-block;overflow:hidden;}

    /* Placement mode */
    .jbc-placement-mode{cursor:crosshair!important;}
    .jbc-placement-mode *{cursor:crosshair!important;}
    #jbc-placement-hint{position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:1000002;background:#E8891D;color:#000;font-family:monospace;font-size:14px;font-weight:bold;padding:12px 24px;display:none;letter-spacing:1px;}

    /* ---- TEXT FORMAT TOOLBAR ---- */
    #jbc-format-bar{position:fixed;top:44px;left:0;right:0;z-index:1000000;background:#111;border-bottom:2px solid #333;display:none;align-items:center;gap:6px;padding:6px 16px;font-family:monospace;flex-wrap:wrap;}
    #jbc-format-bar.visible{display:flex;}
    #jbc-format-bar button{background:#222;color:#fff;border:1px solid #444;padding:5px 10px;font-family:monospace;font-size:12px;font-weight:bold;cursor:pointer;min-width:30px;text-align:center;transition:all 0.15s;}
    #jbc-format-bar button:hover{background:#E8891D;border-color:#E8891D;color:#000;}
    #jbc-format-bar button.active{background:#2ecc40;border-color:#2ecc40;color:#000;}
    #jbc-format-bar .jbc-fmt-group{display:flex;align-items:center;gap:3px;border-right:1px solid #333;padding-right:10px;margin-right:4px;}
    #jbc-format-bar .jbc-fmt-group:last-child{border-right:none;}
    #jbc-format-bar label{color:#888;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-right:4px;}
    #jbc-format-bar select{background:#222;color:#fff;border:1px solid #444;padding:5px 8px;font-family:monospace;font-size:12px;cursor:pointer;max-width:160px;}
    #jbc-format-bar select:hover{border-color:#E8891D;}
    #jbc-format-bar input[type="number"]{background:#222;color:#fff;border:1px solid #444;padding:5px 6px;font-family:monospace;font-size:12px;width:52px;text-align:center;}
    #jbc-format-bar input[type="color"]{background:none;border:1px solid #444;width:28px;height:28px;padding:1px;cursor:pointer;}

    /* ---- MOVE MODE ---- */
    .jbc-move-mode .jbc-editable{cursor:move!important;outline-color:rgba(232,137,29,0.4)!important;}
    .jbc-move-mode .jbc-editable:hover{outline-color:#E8891D!important;outline-style:dashed!important;}
    .jbc-move-mode .jbc-img-wrap{cursor:move!important;}
    .jbc-move-mode .jbc-img-wrap:hover{outline:2px dashed #E8891D;outline-offset:3px;}
    .jbc-move-mode .jbc-img-overlay{display:none!important;}
    .jbc-move-active{opacity:0.7!important;outline:2px solid #E8891D!important;outline-offset:4px!important;}
    .jbc-moved{outline:2px dashed rgba(232,137,29,0.5)!important;outline-offset:3px;}
    #jbc-toolbar .jbc-move-btn{background:#E8891D;border-color:#E8891D;color:#000;}
    #jbc-toolbar .jbc-move-btn.active{background:#2ecc40;border-color:#2ecc40;color:#000;animation:jbc-pulse 1.5s infinite;}
    @keyframes jbc-pulse{0%,100%{box-shadow:0 0 0 0 rgba(46,204,64,0.4);}50%{box-shadow:0 0 0 8px rgba(46,204,64,0);}}
  `;
  document.head.appendChild(css);

  /* ========== STATE ========== */
  var changes = {text:0, images:0};
  var originalTexts = new Map();
  var pendingImages = [];
  var addedElements = [];
  var folderHandle = null;
  var ctxTarget = null; /* currently selected element for context menu actions */
  var clipboard = null;  /* stores copied element data for paste */

  /* ========== BANNER (green) ========== */
  var banner = document.createElement('div');
  banner.id = 'jbc-editor-banner';
  banner.innerHTML = '<span>EDITOR MODE — Click text to edit & style \u00b7 MOVE MODE to drag elements \u00b7 Hover images to replace \u00b7 + to add \u00b7 SAVE</span>';
  document.body.prepend(banner);
  document.body.style.paddingTop = '40px';

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

  /* ========== RIGHT-CLICK CONTEXT MENU ========== */
  var ctxMenu = document.createElement('div');
  ctxMenu.id = 'jbc-context-menu';
  document.body.appendChild(ctxMenu);

  /* Gather all meaningful elements in a section for the layer list */
  function getSectionElements(section){
    if(!section) return [];
    var items = [];
    /* All images (both original and added) */
    section.querySelectorAll('img').forEach(function(img){
      if(img.closest('#jbc-editor-banner,#jbc-toolbar,#jbc-add-menu,#jbc-context-menu')) return;
      if(img.width < 20 && img.height < 20) return;
      var wrap = img.closest('.jbc-added') || img.closest('.jbc-img-wrap');
      var el = wrap || img;
      if(items.indexOf(el) === -1) items.push(el);
    });
    /* All text elements */
    section.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,blockquote,cite,div').forEach(function(el){
      if(el.closest('#jbc-editor-banner,#jbc-toolbar,#jbc-add-menu,#jbc-context-menu,#jbc-toast,#jbc-placement-hint')) return;
      if(el.querySelector('img')) return; /* skip containers that just hold images */
      if(!el.textContent.trim()) return;
      /* Skip containers that are just structural wrappers */
      if(el.tagName === 'DIV' && el.children.length > 2 && !el.classList.contains('jbc-added')) return;
      /* Only leaf-ish text elements */
      var isLeaf = el.childElementCount === 0 || (el.classList.contains('jbc-added'));
      var isEditable = el.hasAttribute('contenteditable');
      var isAdded = el.classList.contains('jbc-added');
      if(isLeaf || isEditable || isAdded){
        if(items.indexOf(el) === -1) items.push(el);
      }
    });
    /* Added elements that may not be caught above */
    section.querySelectorAll('.jbc-added').forEach(function(el){
      if(items.indexOf(el) === -1) items.push(el);
    });
    return items;
  }

  function getLayerLabel(el){
    if(el.classList.contains('jbc-added')){
      var inner = el.querySelector('img');
      if(inner) return 'Added Image';
      return 'Added Text';
    }
    if(el.classList.contains('jbc-img-wrap') || el.tagName === 'IMG') return 'Image';
    var tag = el.tagName.toLowerCase();
    var txt = el.textContent.trim().substring(0,25);
    if(txt.length === 25) txt += '\u2026';
    if(tag.match(/^h[1-6]$/)) return 'Title: ' + txt;
    if(el.classList.contains('l1')||el.classList.contains('l2')||el.classList.contains('l3')) return 'Hero: ' + txt;
    if(el.classList.contains('tag')) return 'Tag: ' + txt;
    if(tag === 'a') return 'Link: ' + txt;
    if(tag === 'span') return 'Span: ' + txt;
    return 'Text: ' + txt;
  }

  function getLayerIcon(el){
    if(el.classList.contains('jbc-img-wrap') || el.tagName === 'IMG' || el.querySelector('img')) return 'fa-image';
    var tag = el.tagName.toLowerCase();
    if(tag.match(/^h[1-6]$/)) return 'fa-heading';
    if(el.classList.contains('l1')||el.classList.contains('l2')||el.classList.contains('l3')) return 'fa-font';
    if(tag === 'a') return 'fa-link';
    return 'fa-align-left';
  }

  function buildContextMenu(section, clickX, clickY){
    var html = '';
    var layers = getSectionElements(section);

    /* Sort layers by z-index (highest first) for a clear stacking view */
    var sortedLayers = layers.slice().sort(function(a,b){
      var zA = parseInt(a.style.zIndex) || parseInt(getComputedStyle(a).zIndex) || 0;
      var zB = parseInt(b.style.zIndex) || parseInt(getComputedStyle(b).zIndex) || 0;
      return zB - zA;
    });

    html += '<div class="jbc-menu-header">Layers (top \u2192 bottom) \u2014 click to grab</div>';
    if(sortedLayers.length === 0){
      html += '<div style="padding:10px 16px;color:#666;font-size:11px;font-family:monospace;">No elements found</div>';
    } else {
      sortedLayers.forEach(function(el, idx){
        var label = getLayerLabel(el);
        var icon = getLayerIcon(el);
        var isActive = (el === ctxTarget) ? ' active' : '';
        var z = parseInt(el.style.zIndex) || parseInt(getComputedStyle(el).zIndex) || 'auto';
        var isGrabbed = el.classList.contains('jbc-grabbed') ? ' style="color:#ff0;"' : '';
        /* Find the original index in unsorted layers */
        var origIdx = layers.indexOf(el);
        html += '<button class="jbc-layer-item'+isActive+'"'+isGrabbed+' data-action="select-layer" data-layer-idx="'+origIdx+'"><i class="fas '+icon+'"></i> '+label+' <span style="color:#666;font-size:10px;margin-left:auto;">z:'+z+'</span></button>';
      });
    }

    if(ctxTarget){
      /* Grab — bring to front so it's always reachable */
      html += '<div class="jbc-menu-header">Grab & Move</div>';
      if(ctxTarget.classList.contains('jbc-grabbed')){
        html += '<button data-action="release" style="color:#ff0;"><i class="fas fa-unlock"></i> Release (keep position)</button>';
      } else {
        html += '<button data-action="grab" style="color:#ff0;"><i class="fas fa-hand"></i> Grab to Front</button>';
      }

      /* Show Edit Text option for text wrappers */
      var isTextWrapper = ctxTarget.classList.contains('jbc-added-text');
      var hasEditableChild = ctxTarget.querySelector('p,h1,h2,h3,h4,h5,h6,span');
      if(isTextWrapper || (ctxTarget.classList.contains('jbc-added') && hasEditableChild && !ctxTarget.querySelector('img'))){
        html += '<div class="jbc-menu-header">Text</div>';
        if(ctxTarget.classList.contains('jbc-editing')){
          html += '<button data-action="stop-edit" style="color:#2ecc40;"><i class="fas fa-lock"></i> Done Editing</button>';
        } else {
          html += '<button data-action="edit-text" style="color:#2ecc40;"><i class="fas fa-pencil"></i> Edit Text</button>';
        }
      }

      /* Resize options for added elements and text */
      if(ctxTarget.classList.contains('jbc-added') || ctxTarget.classList.contains('jbc-editable')){
        html += '<div class="jbc-menu-header">Resize</div>';
        html += '<button data-action="resize-width-up"><i class="fas fa-arrows-alt-h"></i> Wider (+50px)</button>';
        html += '<button data-action="resize-width-down"><i class="fas fa-compress-alt"></i> Narrower (-50px)</button>';
        html += '<button data-action="resize-height-up"><i class="fas fa-arrows-alt-v"></i> Taller (+30px)</button>';
        html += '<button data-action="resize-height-down"><i class="fas fa-compress-alt"></i> Shorter (-30px)</button>';
        html += '<button data-action="resize-auto"><i class="fas fa-expand"></i> Auto Height</button>';
      }

      html += '<div class="jbc-menu-header">Clipboard</div>';
      html += '<button data-action="copy"><i class="fas fa-copy"></i> Copy</button>';
      html += '<button data-action="duplicate"><i class="fas fa-clone"></i> Duplicate</button>';
      if(clipboard){
        html += '<button data-action="paste"><i class="fas fa-paste"></i> Paste Here</button>';
      }
      html += '<div class="jbc-menu-header">Z-Order</div>';
      html += '<button data-action="send-back"><i class="fas fa-arrow-down"></i> Send Behind (-5)</button>';
      html += '<button data-action="send-far-back"><i class="fas fa-angles-down"></i> Send to Back (z:1)</button>';
      html += '<button data-action="bring-front"><i class="fas fa-arrow-up"></i> Bring Forward (+5)</button>';
      html += '<button data-action="bring-far-front"><i class="fas fa-angles-up"></i> Bring to Front (z:50)</button>';
      html += '<div class="jbc-menu-header">Opacity</div>';
      html += '<button data-action="opacity-down"><i class="fas fa-eye-slash"></i> More Transparent</button>';
      html += '<button data-action="opacity-up"><i class="fas fa-eye"></i> Less Transparent</button>';
      html += '<div class="jbc-menu-header">Actions</div>';
      html += '<button data-action="delete" style="color:#E84848;"><i class="fas fa-trash"></i> Delete</button>';
    } else if(clipboard){
      html += '<div class="jbc-menu-header">Clipboard</div>';
      html += '<button data-action="paste"><i class="fas fa-paste"></i> Paste Here</button>';
    }

    ctxMenu.innerHTML = html;
    /* Store reference to layers for selection */
    ctxMenu._layers = layers;
  }

  /* Show context menu on right-click ANYWHERE on the page */
  document.addEventListener('contextmenu', function(e){
    /* Ignore right-clicks on editor UI */
    if(e.target.closest('#jbc-editor-banner,#jbc-toolbar,#jbc-add-btn,#jbc-add-menu,#jbc-context-menu')) return;
    e.preventDefault();

    /* Find the section the click is in */
    var section = e.target.closest('section') || e.target.closest('.hero') || e.target.closest('.manifesto') || e.target.closest('nav') || e.target.closest('footer') || document.body;

    /* Pre-select if clicking directly on an element */
    var directEl = e.target.closest('.jbc-added') || e.target.closest('.jbc-img-wrap') || e.target.closest('.jbc-editable');
    if(directEl){
      ctxTarget = directEl;
    }

    /* Store the click position and section for paste */
    ctxMenu._pasteX = e.clientX;
    ctxMenu._pasteY = e.clientY;
    ctxMenu._pastePageX = e.pageX;
    ctxMenu._pastePageY = e.pageY;
    ctxMenu._pasteSection = section;

    buildContextMenu(section, e.clientX, e.clientY);

    ctxMenu.style.display = 'block';
    ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 240) + 'px';
    ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 300) + 'px';
  });

  /* Hide menu on click elsewhere */
  document.addEventListener('click', function(e){
    if(!e.target.closest('#jbc-context-menu')){
      ctxMenu.style.display = 'none';
      /* Deselect (but keep grabbed elements — they stay grabbed until released) */
      document.querySelectorAll('.jbc-selected').forEach(function(el){ el.classList.remove('jbc-selected'); });
    }
  });

  /* Handle context menu actions */
  ctxMenu.addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if(!btn) return;
    var action = btn.getAttribute('data-action');

    /* Layer selection — always brings element to front temporarily so it's reachable */
    if(action === 'select-layer'){
      var idx = parseInt(btn.getAttribute('data-layer-idx'));
      var layers = ctxMenu._layers || [];
      if(layers[idx]){
        /* Deselect & un-grab previous */
        document.querySelectorAll('.jbc-selected,.jbc-grabbed').forEach(function(el){
          el.classList.remove('jbc-selected');
          el.classList.remove('jbc-grabbed');
        });
        ctxTarget = layers[idx];
        /* Grab it — bring to front so it's always interactive */
        ctxTarget.classList.add('jbc-grabbed');
        /* Store the original z-index so we can restore it */
        if(!ctxTarget.hasAttribute('data-orig-z')){
          ctxTarget.setAttribute('data-orig-z', ctxTarget.style.zIndex || '');
        }
        /* Scroll into view */
        ctxTarget.scrollIntoView({behavior:'smooth', block:'center'});
        /* Rebuild menu with this element selected, keeping position */
        var section = ctxTarget.closest('section') || ctxTarget.closest('.hero') || ctxTarget.closest('.manifesto') || ctxTarget.closest('nav') || ctxTarget.closest('footer') || document.body;
        var menuLeft = ctxMenu.style.left;
        var menuTop = ctxMenu.style.top;
        buildContextMenu(section);
        ctxMenu.style.left = menuLeft;
        ctxMenu.style.top = menuTop;
        showToast('Grabbed: ' + getLayerLabel(ctxTarget) + ' — drag to move, right-click for options');
      }
      return;
    }

    /* ---- Grab / Release ---- */
    if(action === 'grab' && ctxTarget){
      document.querySelectorAll('.jbc-grabbed').forEach(function(el){ el.classList.remove('jbc-grabbed'); });
      if(!ctxTarget.hasAttribute('data-orig-z')){
        ctxTarget.setAttribute('data-orig-z', ctxTarget.style.zIndex || '');
      }
      ctxTarget.classList.add('jbc-grabbed');
      showToast('Grabbed! Drag to move, right-click \u2192 Release when done');
      ctxMenu.style.display = 'none';
      return;
    }

    if(action === 'release' && ctxTarget){
      ctxTarget.classList.remove('jbc-grabbed');
      /* Restore original z-index */
      var origZ = ctxTarget.getAttribute('data-orig-z');
      if(origZ !== null){
        ctxTarget.style.zIndex = origZ;
        ctxTarget.removeAttribute('data-orig-z');
      }
      showToast('Released at z-index: ' + (ctxTarget.style.zIndex || 'auto'));
      ctxMenu.style.display = 'none';
      return;
    }

    /* ---- Edit Text toggle ---- */
    if(action === 'edit-text' && ctxTarget){
      ctxTarget.classList.add('jbc-editing');
      var editChild = ctxTarget.querySelector('p,h1,h2,h3,h4,h5,h6,span');
      if(editChild){
        editChild.setAttribute('contenteditable','true');
        editChild.style.cursor = 'text';
        editChild.focus();
        showFormatBar(editChild);
        /* Wire up blur to exit editing */
        editChild.addEventListener('blur', function exitEdit(){
          setTimeout(function(){
            if(document.activeElement !== editChild && !document.activeElement.closest('#jbc-format-bar')){
              ctxTarget.classList.remove('jbc-editing');
              editChild.setAttribute('contenteditable','false');
              editChild.style.cursor = 'move';
              hideFormatBar();
              changes.text++;
              updateCounter();
            }
          }, 250);
        });
      }
      showToast('Editing \u2014 type to change text, click away when done');
      ctxMenu.style.display = 'none';
      return;
    }

    if(action === 'stop-edit' && ctxTarget){
      ctxTarget.classList.remove('jbc-editing');
      var stopChild = ctxTarget.querySelector('[contenteditable="true"]');
      if(stopChild){
        stopChild.setAttribute('contenteditable','false');
        stopChild.style.cursor = 'move';
        stopChild.blur();
      }
      hideFormatBar();
      changes.text++;
      updateCounter();
      showToast('Done editing \u2014 drag to move');
      ctxMenu.style.display = 'none';
      return;
    }

    /* ---- Copy / Paste / Duplicate (work even without ctxTarget for paste) ---- */
    if(action === 'copy' && ctxTarget){
      clipboard = {
        html: ctxTarget.outerHTML,
        tag: ctxTarget.tagName,
        isAdded: ctxTarget.classList.contains('jbc-added'),
        isImgWrap: ctxTarget.classList.contains('jbc-img-wrap'),
        isText: ctxTarget.classList.contains('jbc-editable'),
        computedStyle: null,
        _sourceEl: ctxTarget
      };
      /* For regular page elements, capture computed styles we care about */
      if(!clipboard.isAdded && !clipboard.isImgWrap){
        var cs = getComputedStyle(ctxTarget);
        clipboard.computedStyle = {
          fontSize: cs.fontSize,
          fontFamily: cs.fontFamily,
          fontWeight: cs.fontWeight,
          fontStyle: cs.fontStyle,
          color: cs.color,
          textTransform: cs.textTransform,
          letterSpacing: cs.letterSpacing,
          textDecoration: cs.textDecorationLine || cs.textDecoration
        };
      }
      showToast('Copied: ' + getLayerLabel(ctxTarget));
      ctxMenu.style.display = 'none';
      return;
    }

    if(action === 'paste' && clipboard){
      pasteElement(ctxMenu._pastePageX, ctxMenu._pastePageY, ctxMenu._pasteSection);
      ctxMenu.style.display = 'none';
      return;
    }

    if(action === 'duplicate' && ctxTarget){
      /* Copy then paste offset slightly */
      clipboard = {
        html: ctxTarget.outerHTML,
        tag: ctxTarget.tagName,
        isAdded: ctxTarget.classList.contains('jbc-added'),
        isImgWrap: ctxTarget.classList.contains('jbc-img-wrap'),
        isText: ctxTarget.classList.contains('jbc-editable'),
        computedStyle: null,
        _sourceEl: ctxTarget
      };
      if(!clipboard.isAdded && !clipboard.isImgWrap){
        var cs2 = getComputedStyle(ctxTarget);
        clipboard.computedStyle = {
          fontSize: cs2.fontSize, fontFamily: cs2.fontFamily,
          fontWeight: cs2.fontWeight, fontStyle: cs2.fontStyle,
          color: cs2.color, textTransform: cs2.textTransform,
          letterSpacing: cs2.letterSpacing,
          textDecoration: cs2.textDecorationLine || cs2.textDecoration
        };
      }
      /* Place duplicate near the original */
      var rect = ctxTarget.getBoundingClientRect();
      var section = ctxTarget.closest('section') || ctxTarget.closest('.hero') || ctxTarget.closest('.manifesto') || ctxTarget.closest('nav') || ctxTarget.closest('footer') || document.body;
      pasteElement(rect.left + window.scrollX + 30, rect.top + window.scrollY + 30, section);
      showToast('Duplicated: ' + getLayerLabel(ctxTarget));
      ctxMenu.style.display = 'none';
      return;
    }

    if(!ctxTarget) return;

    var currentZ = parseInt(getComputedStyle(ctxTarget).zIndex) || 1;
    var currentOp = parseFloat(ctxTarget.style.opacity || getComputedStyle(ctxTarget).opacity) || 1;

    switch(action){
      case 'send-back':
        ctxTarget.style.zIndex = Math.max(1, currentZ - 5);
        showToast('Sent back (z:' + ctxTarget.style.zIndex + ') \u2014 right-click layer list to re-grab');
        break;
      case 'send-far-back':
        ctxTarget.style.zIndex = '1';
        showToast('Sent to back (z:1) \u2014 right-click layer list to re-grab');
        break;
      case 'bring-front':
        ctxTarget.style.zIndex = Math.min(99, currentZ + 5);
        showToast('Brought forward (z:' + ctxTarget.style.zIndex + ')');
        break;
      case 'bring-far-front':
        ctxTarget.style.zIndex = '50';
        showToast('Brought to front (z:50)');
        break;
      case 'resize-width-up':
        var curW = ctxTarget.offsetWidth;
        if(ctxTarget.getAttribute('data-pos-type') === 'percent' && ctxTarget.parentElement){
          var newPctW = ((curW + 50) / ctxTarget.parentElement.offsetWidth * 100).toFixed(2);
          ctxTarget.style.width = newPctW + '%';
        } else { ctxTarget.style.width = (curW + 50) + 'px'; }
        showToast('Width: ' + ctxTarget.style.width);
        break;
      case 'resize-width-down':
        var curW2 = ctxTarget.offsetWidth;
        var newW2 = Math.max(50, curW2 - 50);
        if(ctxTarget.getAttribute('data-pos-type') === 'percent' && ctxTarget.parentElement){
          var newPctW2 = (newW2 / ctxTarget.parentElement.offsetWidth * 100).toFixed(2);
          ctxTarget.style.width = newPctW2 + '%';
        } else { ctxTarget.style.width = newW2 + 'px'; }
        showToast('Width: ' + ctxTarget.style.width);
        break;
      case 'resize-height-up':
        var curH = ctxTarget.offsetHeight;
        ctxTarget.style.height = (curH + 30) + 'px';
        ctxTarget.style.overflow = 'visible';
        showToast('Height: ' + ctxTarget.style.height);
        break;
      case 'resize-height-down':
        var curH2 = ctxTarget.offsetHeight;
        ctxTarget.style.height = Math.max(30, curH2 - 30) + 'px';
        ctxTarget.style.overflow = 'visible';
        showToast('Height: ' + ctxTarget.style.height);
        break;
      case 'resize-auto':
        ctxTarget.style.height = '';
        ctxTarget.style.overflow = '';
        showToast('Height set to auto');
        break;
      case 'opacity-down':
        var newOp = Math.max(0.1, currentOp - 0.15);
        ctxTarget.style.opacity = newOp.toFixed(2);
        showToast('Opacity: ' + Math.round(newOp * 100) + '%');
        break;
      case 'opacity-up':
        var newOp2 = Math.min(1, currentOp + 0.15);
        ctxTarget.style.opacity = newOp2.toFixed(2);
        showToast('Opacity: ' + Math.round(newOp2 * 100) + '%');
        break;
      case 'delete':
        ctxTarget.remove();
        ctxTarget = null;
        showToast('Deleted');
        break;
    }

    changes.text++;
    updateCounter();
    ctxMenu.style.display = 'none';
  });

  /* ========== PASTE HELPER ========== */
  function pasteElement(pageX, pageY, section){
    if(!clipboard) return;
    if(!section) section = document.querySelector('.hero') || document.body;

    var rect = section.getBoundingClientRect();
    var targetW = rect.width;
    var targetH = rect.height;
    var rawLeft = pageX - (rect.left + window.scrollX);
    var rawTop = pageY - (rect.top + window.scrollY);
    var pctLeft = (rawLeft / targetW * 100).toFixed(2);
    var pctTop = (rawTop / targetH * 100).toFixed(2);

    if(getComputedStyle(section).position === 'static') section.style.position = 'relative';

    if(clipboard.isAdded){
      /* It's an added element (text or image from + button) — clone the whole wrapper */
      var temp = document.createElement('div');
      temp.innerHTML = clipboard.html;
      var clone = temp.firstElementChild;
      if(!clone) return;

      /* Offset position so it's not exactly on top */
      clone.style.left = pctLeft + '%';
      clone.style.top = pctTop + '%';
      clone.classList.add('jbc-added');
      clone.setAttribute('data-pos-type','percent');

      /* Re-wire delete button */
      var del = clone.querySelector('.jbc-delete-btn');
      if(del){
        del.addEventListener('click', function(e3){
          e3.stopPropagation();
          clone.remove();
          showToast('Element removed');
        });
      }

      section.appendChild(clone);
      makeDraggablePercent(clone, section);

      /* Re-wire resize handle if present */
      var rh = clone.querySelector('.jbc-resize-handle');
      if(rh) makeResizable(clone, rh);

      /* Make inner text editable if it's a text element */
      var innerText = clone.querySelector('[contenteditable]') || clone.querySelector('p,h1,h2,h3,h4,h5,h6,span');
      var hasImg = clone.querySelector('img');
      if(innerText && !hasImg){
        innerText.setAttribute('contenteditable','true');
        innerText.addEventListener('focus', function(){ showFormatBar(innerText); });
        innerText.addEventListener('blur', function(){
          setTimeout(function(){
            if(document.activeElement !== innerText && !document.activeElement.closest('#jbc-format-bar')){
              hideFormatBar();
              clone.classList.remove('jbc-editing');
            }
          }, 200);
          changes.text++;
          updateCounter();
        });
        /* Add text box resize handles + double-click edit */
        addTextBoxHandles(clone);
        addDoubleClickEdit(clone);
      }

      addedElements.push(clone);
      changes.text++;
      updateCounter();
      showToast('Pasted — double-click to edit text, drag corners to resize');

    } else if(clipboard.isImgWrap){
      /* It's an existing page image — create a new added-image clone */
      var temp2 = document.createElement('div');
      temp2.innerHTML = clipboard.html;
      var srcImg = temp2.querySelector('img');
      if(!srcImg) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'jbc-added';
      wrapper.style.cssText = 'left:'+pctLeft+'%;top:'+pctTop+'%;width:20%;';
      wrapper.setAttribute('data-pos-type','percent');

      var newImg = document.createElement('img');
      newImg.src = srcImg.getAttribute('data-orig-src') || srcImg.src;
      newImg.style.cssText = 'width:100%;height:auto;display:block;filter:grayscale(100%);';

      var delBtn3 = document.createElement('button');
      delBtn3.className = 'jbc-delete-btn';
      delBtn3.textContent = '\u00d7';
      delBtn3.addEventListener('click', function(e3){
        e3.stopPropagation();
        wrapper.remove();
        showToast('Element removed');
      });

      var resizeH2 = document.createElement('div');
      resizeH2.className = 'jbc-resize-handle';

      wrapper.appendChild(newImg);
      wrapper.appendChild(delBtn3);
      wrapper.appendChild(resizeH2);

      section.appendChild(wrapper);
      makeDraggablePercent(wrapper, section);
      makeResizable(wrapper, resizeH2);

      addedElements.push(wrapper);
      changes.images++;
      updateCounter();
      showToast('Image pasted — drag to position');

    } else {
      /* It's a regular page text element — create draggable clone, right-click to edit */
      var wrapper2 = document.createElement('div');
      wrapper2.className = 'jbc-added jbc-added-text';
      wrapper2.style.cssText = 'left:'+pctLeft+'%;top:'+pctTop+'%;';
      wrapper2.setAttribute('data-pos-type','percent');
      wrapper2.setAttribute('data-box','text');

      var temp3 = document.createElement('div');
      temp3.innerHTML = clipboard.html;
      var srcEl = temp3.firstElementChild || temp3;
      var textContent = srcEl.textContent || 'Pasted text';

      var textEl = document.createElement('p');
      textEl.setAttribute('contenteditable','false');
      textEl.setAttribute('data-added','true');
      textEl.textContent = textContent;

      /* Apply captured styles */
      var sty = clipboard.computedStyle;
      if(sty){
        textEl.style.fontSize = sty.fontSize;
        textEl.style.fontFamily = sty.fontFamily;
        textEl.style.fontWeight = sty.fontWeight;
        textEl.style.fontStyle = sty.fontStyle;
        textEl.style.color = sty.color;
        if(sty.textTransform && sty.textTransform !== 'none') textEl.style.textTransform = sty.textTransform;
        if(sty.letterSpacing && sty.letterSpacing !== 'normal') textEl.style.letterSpacing = sty.letterSpacing;
        if(sty.textDecoration && sty.textDecoration !== 'none') textEl.style.textDecoration = sty.textDecoration;
      } else {
        textEl.style.cssText = 'color:#fff;font-family:var(--font-display);font-size:2rem;font-weight:700;';
      }
      textEl.style.minWidth = '100px';
      textEl.style.padding = '8px';
      textEl.style.margin = '0';
      textEl.style.outline = 'none';
      textEl.style.background = 'transparent';
      textEl.style.cursor = 'move';

      var delBtn4 = document.createElement('button');
      delBtn4.className = 'jbc-delete-btn';
      delBtn4.textContent = '\u00d7';
      delBtn4.addEventListener('click', function(e3){
        e3.stopPropagation();
        wrapper2.remove();
        showToast('Element removed');
      });

      wrapper2.appendChild(textEl);
      wrapper2.appendChild(delBtn4);

      section.appendChild(wrapper2);
      makeDraggablePercent(wrapper2, section);
      addTextBoxHandles(wrapper2);

      addedElements.push(wrapper2);
      changes.text++;
      updateCounter();
      showToast('Text duplicated \u2014 drag to move, right-click \u2192 Edit Text');
    }
  }

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

  /* ---- MOVE MODE TOGGLE ---- */
  var moveMode = false;
  var moveBtn = document.createElement('button');
  moveBtn.className = 'jbc-move-btn';
  moveBtn.innerHTML = '<i class="fas fa-arrows-alt"></i> MOVE MODE';
  moveBtn.addEventListener('click', function(){
    moveMode = !moveMode;
    moveBtn.classList.toggle('active', moveMode);
    document.body.classList.toggle('jbc-move-mode', moveMode);
    moveBtn.innerHTML = moveMode
      ? '<i class="fas fa-arrows-alt"></i> MOVE MODE ON'
      : '<i class="fas fa-arrows-alt"></i> MOVE MODE';
    /* Toggle contenteditable off in move mode so elements can be dragged */
    document.querySelectorAll('.jbc-editable').forEach(function(el){
      if(moveMode){
        el.setAttribute('contenteditable','false');
        el.blur();
      } else {
        el.setAttribute('contenteditable','true');
      }
    });
    showToast(moveMode ? 'MOVE MODE — drag text & images to reposition' : 'EDIT MODE — click text to edit');
  });
  toolbar.appendChild(moveBtn);

  /* ---- ALIGNMENT GUIDES TOGGLE ---- */
  var guidesOn = false;
  var guidesOverlay = document.createElement('div');
  guidesOverlay.id = 'jbc-guides';
  document.body.appendChild(guidesOverlay);

  function buildGuides(){
    var w = window.innerWidth;
    var h = document.documentElement.scrollHeight;
    var cx = w / 2;
    /* Find the container max-width for content area guides */
    var containerMax = 1200;
    var containerLeft = Math.max(0, (w - containerMax) / 2);
    var containerRight = Math.min(w, containerLeft + containerMax);

    var html = '';
    /* Page vertical center — red */
    html += '<div class="jbc-guide jbc-guide-v center" style="left:'+cx+'px;"><div class="jbc-guide-label" style="top:60px;left:4px;">CENTER</div></div>';
    /* Thirds — blue faint */
    html += '<div class="jbc-guide jbc-guide-v third" style="left:'+(w/3)+'px;"><div class="jbc-guide-label" style="top:60px;left:4px;">1/3</div></div>';
    html += '<div class="jbc-guide jbc-guide-v third" style="left:'+(w*2/3)+'px;"><div class="jbc-guide-label" style="top:60px;left:4px;">2/3</div></div>';
    /* Container edges — green */
    if(containerLeft > 20){
      html += '<div class="jbc-guide jbc-guide-v container-edge" style="left:'+containerLeft+'px;"><div class="jbc-guide-label" style="top:80px;left:4px;">CONTAINER</div></div>';
      html += '<div class="jbc-guide jbc-guide-v container-edge" style="left:'+containerRight+'px;"></div>';
    }
    /* Horizontal guides at viewport intervals */
    var scrollTop = window.scrollY;
    var viewH = window.innerHeight;
    /* Viewport center */
    html += '<div class="jbc-guide jbc-guide-h center" style="top:'+(scrollTop + viewH/2)+'px;position:absolute;"><div class="jbc-guide-label" style="left:4px;top:2px;">VIEWPORT CENTER</div></div>';
    /* Viewport thirds */
    html += '<div class="jbc-guide jbc-guide-h third" style="top:'+(scrollTop + viewH/3)+'px;position:absolute;"></div>';
    html += '<div class="jbc-guide jbc-guide-h third" style="top:'+(scrollTop + viewH*2/3)+'px;position:absolute;"></div>';

    guidesOverlay.innerHTML = html;
    /* Make the overlay span the full page height */
    guidesOverlay.style.height = h + 'px';
  }

  var guidesBtn = document.createElement('button');
  guidesBtn.className = 'jbc-guides-btn';
  guidesBtn.innerHTML = '<i class="fas fa-ruler-combined"></i> GUIDES';
  guidesBtn.addEventListener('click', function(){
    guidesOn = !guidesOn;
    guidesBtn.classList.toggle('active', guidesOn);
    guidesOverlay.classList.toggle('visible', guidesOn);
    if(guidesOn){
      buildGuides();
      guidesBtn.innerHTML = '<i class="fas fa-ruler-combined"></i> GUIDES ON';
    } else {
      guidesBtn.innerHTML = '<i class="fas fa-ruler-combined"></i> GUIDES';
    }
    showToast(guidesOn ? 'Guides ON — red=center, blue=thirds, green=container' : 'Guides OFF');
  });
  toolbar.appendChild(guidesBtn);

  /* Update guides on scroll/resize */
  var guidesRAF = null;
  function updateGuidesThrottled(){
    if(!guidesOn) return;
    if(guidesRAF) return;
    guidesRAF = requestAnimationFrame(function(){
      buildGuides();
      guidesRAF = null;
    });
  }
  window.addEventListener('scroll', updateGuidesThrottled, {passive:true});
  window.addEventListener('resize', updateGuidesThrottled, {passive:true});

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

  document.addEventListener('click', function(e){
    if(!e.target.closest('#jbc-add-btn') && !e.target.closest('#jbc-add-menu')){
      menuOpen = false;
      addBtn.classList.remove('open');
      addMenu.classList.remove('open');
    }
  });

  /* ---- ADD IMAGE (percentage-based positioning) ---- */
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
        placementHint.textContent = 'CLICK WHERE YOU WANT THE IMAGE';
        placementHint.style.display = 'block';
        document.body.classList.add('jbc-placement-mode');

        function placeImage(e2){
          document.body.classList.remove('jbc-placement-mode');
          placementHint.style.display = 'none';
          document.removeEventListener('click', placeImage, true);

          var target = e2.target.closest('section') || e2.target.closest('.hero') || document.querySelector('.hero') || document.body;
          var rect = target.getBoundingClientRect();
          var targetW = rect.width;
          var targetH = rect.height;

          /* Calculate percentage-based position relative to parent section */
          var rawLeft = e2.pageX - (rect.left + window.scrollX);
          var rawTop = e2.pageY - (rect.top + window.scrollY);
          var pctLeft = ((rawLeft - 100) / targetW * 100).toFixed(2);
          var pctTop = ((rawTop - 75) / targetH * 100).toFixed(2);

          var wrapper = document.createElement('div');
          wrapper.className = 'jbc-added';
          wrapper.style.cssText = 'left:'+pctLeft+'%;top:'+pctTop+'%;width:20%;';
          wrapper.setAttribute('data-pos-type','percent');

          var img = document.createElement('img');
          img.src = ev.target.result;
          img.style.cssText = 'width:100%;height:auto;display:block;filter:grayscale(100%);';
          img.setAttribute('data-added','true');

          var ext = file.name.split('.').pop() || 'jpg';
          var saveName = 'images/added-' + Date.now() + '.' + ext;
          img.setAttribute('data-save-path', saveName);

          var delBtn2 = document.createElement('button');
          delBtn2.className = 'jbc-delete-btn';
          delBtn2.textContent = '\u00d7';
          delBtn2.addEventListener('click', function(e3){
            e3.stopPropagation();
            wrapper.remove();
            showToast('Element removed');
          });

          var resizeH = document.createElement('div');
          resizeH.className = 'jbc-resize-handle';

          wrapper.appendChild(img);
          wrapper.appendChild(delBtn2);
          wrapper.appendChild(resizeH);

          if(getComputedStyle(target).position === 'static') target.style.position = 'relative';
          target.appendChild(wrapper);

          makeDraggablePercent(wrapper, target);
          makeResizable(wrapper, resizeH);

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
          showToast('Image added \u2014 drag to position, corners to resize');
        }

        setTimeout(function(){
          document.addEventListener('click', placeImage, true);
        }, 100);
      };
      reader.readAsDataURL(file);
    });

    fi.click();
  });

  /* ---- ADD TEXT (percentage-based positioning) ---- */
  addMenu.querySelector('[data-type="text"]').addEventListener('click', function(){
    menuOpen = false;
    addBtn.classList.remove('open');
    addMenu.classList.remove('open');

    placementHint.textContent = 'CLICK WHERE YOU WANT THE TEXT';
    placementHint.style.display = 'block';
    document.body.classList.add('jbc-placement-mode');

    function placeText(e2){
      document.body.classList.remove('jbc-placement-mode');
      placementHint.style.display = 'none';
      document.removeEventListener('click', placeText, true);

      var target = e2.target.closest('section') || e2.target.closest('.hero') || document.querySelector('.hero') || document.body;
      var rect = target.getBoundingClientRect();
      var targetW = rect.width;
      var targetH = rect.height;

      var rawLeft = e2.pageX - (rect.left + window.scrollX);
      var rawTop = e2.pageY - (rect.top + window.scrollY);
      var pctLeft = (rawLeft / targetW * 100).toFixed(2);
      var pctTop = (rawTop / targetH * 100).toFixed(2);

      var wrapper = document.createElement('div');
      wrapper.className = 'jbc-added';
      wrapper.style.cssText = 'left:'+pctLeft+'%;top:'+pctTop+'%;';
      wrapper.setAttribute('data-pos-type','percent');

      var textEl = document.createElement('p');
      textEl.setAttribute('contenteditable','true');
      textEl.style.cssText = 'color:#fff;font-family:var(--font-display);font-size:2rem;font-weight:700;min-width:100px;padding:8px;margin:0;outline:none;background:transparent;';
      textEl.textContent = 'Your text here';
      textEl.setAttribute('data-added','true');

      var delBtn2 = document.createElement('button');
      delBtn2.className = 'jbc-delete-btn';
      delBtn2.textContent = '\u00d7';
      delBtn2.addEventListener('click', function(e3){
        e3.stopPropagation();
        wrapper.remove();
        showToast('Element removed');
      });

      wrapper.appendChild(textEl);
      wrapper.appendChild(delBtn2);

      if(getComputedStyle(target).position === 'static') target.style.position = 'relative';
      target.appendChild(wrapper);

      makeDraggablePercent(wrapper, target);
      addTextBoxHandles(wrapper);
      addDoubleClickEdit(wrapper);

      textEl.focus();
      document.execCommand('selectAll', false, null);
      wrapper.classList.add('jbc-editing');

      textEl.addEventListener('focus', function(){ showFormatBar(textEl); });
      textEl.addEventListener('blur', function(){
        setTimeout(function(){
          if(document.activeElement !== textEl && !document.activeElement.closest('#jbc-format-bar')){
            hideFormatBar();
            wrapper.classList.remove('jbc-editing');
          }
        }, 200);
        changes.text++;
        updateCounter();
      });

      addedElements.push(wrapper);
      changes.text++;
      updateCounter();
      showToast('Text added \u2014 type to edit, drag to move, corners to resize');
    }

    setTimeout(function(){
      document.addEventListener('click', placeText, true);
    }, 100);
  });

  /* ========== DRAG HELPER (percentage-based) ========== */
  function makeDraggablePercent(el, parentSection){
    var startX, startY, origPctLeft, origPctTop, dragging = false;

    el.addEventListener('mousedown', function(e){
      if(e.target.classList.contains('jbc-resize-handle')) return;
      if(e.target.classList.contains('jbc-resize-handle-r')) return;
      if(e.target.classList.contains('jbc-resize-handle-b')) return;
      if(e.target.classList.contains('jbc-delete-btn')) return;
      if(e.target.closest('.jbc-img-overlay')) return;
      if(e.button !== 0) return;
      /* Let clicks through to any contenteditable text — don't hijack for dragging */
      var editableTarget = e.target.closest('[contenteditable="true"]');
      if(editableTarget) return;
      /* Also skip if the wrapper is in editing mode */
      if(el.classList.contains('jbc-editing')) return;

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origPctLeft = parseFloat(el.style.left) || 0;
      origPctTop = parseFloat(el.style.top) || 0;
      el.style.opacity = '0.8';
      e.preventDefault();

      var parentRect = parentSection.getBoundingClientRect();

      function onMove(e2){
        if(!dragging) return;
        var dx = e2.clientX - startX;
        var dy = e2.clientY - startY;
        var dxPct = (dx / parentRect.width) * 100;
        var dyPct = (dy / parentRect.height) * 100;
        el.style.left = (origPctLeft + dxPct).toFixed(2) + '%';
        el.style.top = (origPctTop + dyPct).toFixed(2) + '%';
      }
      function onUp(){
        dragging = false;
        el.style.opacity = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        changes.text++;
        updateCounter();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /* ========== DRAG HELPER (pixel-based, for legacy elements) ========== */
  function makeDraggable(el){
    var startX, startY, origX, origY, dragging = false;

    el.addEventListener('mousedown', function(e){
      if(e.target.classList.contains('jbc-resize-handle')) return;
      if(e.target.classList.contains('jbc-resize-handle-r')) return;
      if(e.target.classList.contains('jbc-resize-handle-b')) return;
      if(e.target.classList.contains('jbc-delete-btn')) return;
      if(e.target.closest('.jbc-img-overlay')) return;
      if(e.button !== 0) return;
      var editableTarget2 = e.target.closest('[contenteditable="true"]');
      if(editableTarget2) return;
      if(el.classList.contains('jbc-editing')) return;

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
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /* ========== RESIZE HELPER ========== */
  /* axis: 'both' (corner), 'x' (right edge), 'y' (bottom edge) */
  function makeResizable(el, handle, axis){
    axis = axis || 'both';
    var resizing = false, rStartX, rStartY, rStartW, rStartH;
    handle.addEventListener('mousedown', function(e){
      e.stopPropagation(); e.preventDefault();
      resizing = true;
      rStartX = e.clientX;
      rStartY = e.clientY;
      rStartW = el.offsetWidth;
      rStartH = el.offsetHeight;

      function onMove(e2){
        if(!resizing) return;
        if(axis === 'both' || axis === 'x'){
          var newW = Math.max(50, rStartW + e2.clientX - rStartX);
          if(el.getAttribute('data-pos-type') === 'percent'){
            var parent = el.parentElement;
            if(parent){
              el.style.width = (newW / parent.offsetWidth * 100).toFixed(2) + '%';
            } else { el.style.width = newW + 'px'; }
          } else { el.style.width = newW + 'px'; }
        }
        if(axis === 'both' || axis === 'y'){
          var newH = Math.max(30, rStartH + e2.clientY - rStartY);
          el.style.height = newH + 'px';
          el.style.overflow = 'visible';
        }
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

  /* Add all three resize handles (corner, right edge, bottom edge) to a text box wrapper */
  function addTextBoxHandles(wrapper){
    wrapper.setAttribute('data-box','text');

    var rCorner = wrapper.querySelector('.jbc-resize-handle');
    if(!rCorner){
      rCorner = document.createElement('div');
      rCorner.className = 'jbc-resize-handle';
      wrapper.appendChild(rCorner);
    }
    makeResizable(wrapper, rCorner, 'both');

    var rRight = document.createElement('div');
    rRight.className = 'jbc-resize-handle-r';
    wrapper.appendChild(rRight);
    makeResizable(wrapper, rRight, 'x');

    var rBottom = document.createElement('div');
    rBottom.className = 'jbc-resize-handle-b';
    wrapper.appendChild(rBottom);
    makeResizable(wrapper, rBottom, 'y');
  }

  /* Click or double-click on a text wrapper to enter edit mode */
  function addDoubleClickEdit(wrapper){
    /* Single click on text enters editing */
    wrapper.addEventListener('click', function(e){
      if(e.target.closest('.jbc-delete-btn,.jbc-resize-handle,.jbc-resize-handle-r,.jbc-resize-handle-b')) return;
      var textChild = wrapper.querySelector('[contenteditable="true"]') || wrapper.querySelector('p,h1,h2,h3,h4,h5,h6,span');
      if(textChild && !textChild.querySelector('img')){
        wrapper.classList.add('jbc-editing');
        textChild.setAttribute('contenteditable','true');
        textChild.focus();
        showFormatBar(textChild);
      }
    });
    /* Double-click selects all text for easy replacement */
    wrapper.addEventListener('dblclick', function(e){
      if(e.target.closest('.jbc-delete-btn,.jbc-resize-handle,.jbc-resize-handle-r,.jbc-resize-handle-b')) return;
      var textChild = wrapper.querySelector('[contenteditable="true"]') || wrapper.querySelector('p,h1,h2,h3,h4,h5,h6,span');
      if(textChild && !textChild.querySelector('img')){
        wrapper.classList.add('jbc-editing');
        textChild.setAttribute('contenteditable','true');
        textChild.focus();
        var sel = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(textChild);
        sel.removeAllRanges();
        sel.addRange(range);
        showFormatBar(textChild);
      }
    });
    /* Exit editing mode on blur */
    function watchBlur(el){
      el.addEventListener('blur', function(){
        setTimeout(function(){
          if(!wrapper.contains(document.activeElement) && !document.activeElement.closest('#jbc-format-bar')){
            wrapper.classList.remove('jbc-editing');
          }
        }, 200);
      });
    }
    wrapper.querySelectorAll('p,h1,h2,h3,h4,h5,h6,span,[contenteditable]').forEach(watchBlur);
  }

  /* ========== TEXT FORMAT TOOLBAR (Word-style) ========== */
  var formatBar = document.createElement('div');
  formatBar.id = 'jbc-format-bar';
  formatBar.innerHTML = [
    '<div class="jbc-fmt-group">',
    '  <select id="jbc-font-family" title="Font family">',
    '    <option value="">— Font —</option>',
    '    <option value="\'Playfair Display\', Georgia, serif">Playfair Display</option>',
    '    <option value="\'Dancing Script\', cursive">Dancing Script</option>',
    '    <option value="\'Inter\', sans-serif">Inter</option>',
    '    <option value="Georgia, serif">Georgia</option>',
    '    <option value="\'Courier New\', monospace">Courier New</option>',
    '    <option value="Arial, sans-serif">Arial</option>',
    '    <option value="\'Times New Roman\', serif">Times New Roman</option>',
    '    <option value="Impact, sans-serif">Impact</option>',
    '    <option value="\'Helvetica Neue\', Helvetica, sans-serif">Helvetica</option>',
    '    <option value="Verdana, sans-serif">Verdana</option>',
    '  </select>',
    '</div>',
    '<div class="jbc-fmt-group">',
    '  <button data-fmt="size-down" title="Decrease size"><i class="fas fa-minus"></i></button>',
    '  <input type="number" id="jbc-font-size" min="8" max="300" value="16" title="Font size (px)">',
    '  <button data-fmt="size-up" title="Increase size"><i class="fas fa-plus"></i></button>',
    '</div>',
    '<div class="jbc-fmt-group">',
    '  <button data-fmt="bold" title="Bold (Ctrl+B)"><i class="fas fa-bold"></i></button>',
    '  <button data-fmt="italic" title="Italic (Ctrl+I)"><i class="fas fa-italic"></i></button>',
    '  <button data-fmt="underline" title="Underline (Ctrl+U)"><i class="fas fa-underline"></i></button>',
    '  <button data-fmt="strikethrough" title="Strikethrough"><i class="fas fa-strikethrough"></i></button>',
    '  <button data-fmt="superscript" title="Superscript"><i class="fas fa-superscript"></i></button>',
    '  <button data-fmt="subscript" title="Subscript"><i class="fas fa-subscript"></i></button>',
    '</div>',
    '<div class="jbc-fmt-group">',
    '  <button data-fmt="uppercase" title="Toggle uppercase"><i class="fas fa-font"></i> AA</button>',
    '  <select id="jbc-font-weight" title="Font weight">',
    '    <option value="">— Weight —</option>',
    '    <option value="300">Light</option>',
    '    <option value="400">Normal</option>',
    '    <option value="500">Medium</option>',
    '    <option value="600">Semi-Bold</option>',
    '    <option value="700">Bold</option>',
    '    <option value="900">Black</option>',
    '  </select>',
    '</div>',
    '<div class="jbc-fmt-group">',
    '  <button data-fmt="justifyLeft" title="Align left"><i class="fas fa-align-left"></i></button>',
    '  <button data-fmt="justifyCenter" title="Align center"><i class="fas fa-align-center"></i></button>',
    '  <button data-fmt="justifyRight" title="Align right"><i class="fas fa-align-right"></i></button>',
    '  <button data-fmt="justifyFull" title="Justify"><i class="fas fa-align-justify"></i></button>',
    '</div>',
    '<div class="jbc-fmt-group">',
    '  <button data-fmt="indent" title="Increase indent"><i class="fas fa-indent"></i></button>',
    '  <button data-fmt="outdent" title="Decrease indent"><i class="fas fa-outdent"></i></button>',
    '</div>',
    '<div class="jbc-fmt-group">',
    '  <input type="color" id="jbc-font-color" value="#F0E6DA" title="Text color">',
    '  <button data-fmt="color-gold" title="Amber" style="color:#E8891D;font-size:16px;">●</button>',
    '  <button data-fmt="color-blush" title="Coral" style="color:#E84848;font-size:16px;">●</button>',
    '  <button data-fmt="color-wine" title="Purple" style="color:#8B3A8B;font-size:16px;">●</button>',
    '  <button data-fmt="color-cream" title="Cream" style="color:#F0E6DA;font-size:16px;">●</button>',
    '  <input type="color" id="jbc-bg-color" value="#2A221E" title="Highlight / background color">',
    '  <button data-fmt="removeHighlight" title="Remove highlight" style="font-size:10px;">✕HL</button>',
    '</div>',
    '<div class="jbc-fmt-group">',
    '  <button data-fmt="ls-down" title="Tighter letter spacing">A⟵A</button>',
    '  <button data-fmt="ls-up" title="Wider letter spacing">A⟶A</button>',
    '</div>',
    '<div class="jbc-fmt-group">',
    '  <select id="jbc-line-height" title="Line spacing">',
    '    <option value="">— Line —</option>',
    '    <option value="1">1.0</option>',
    '    <option value="1.15">1.15</option>',
    '    <option value="1.5">1.5</option>',
    '    <option value="1.75">1.75</option>',
    '    <option value="2">2.0</option>',
    '    <option value="2.5">2.5</option>',
    '    <option value="3">3.0</option>',
    '  </select>',
    '</div>',
    '<div class="jbc-fmt-group" style="border-right:none;">',
    '  <button data-fmt="removeFormat" title="Clear all formatting"><i class="fas fa-eraser"></i></button>',
    '</div>'
  ].join('\n');
  document.body.appendChild(formatBar);

  var activeFormatEl = null;
  var fontSizeInput = formatBar.querySelector('#jbc-font-size');
  var fontFamilySelect = formatBar.querySelector('#jbc-font-family');
  var fontWeightSelect = formatBar.querySelector('#jbc-font-weight');
  var fontColorInput = formatBar.querySelector('#jbc-font-color');

  /* Show format bar and populate values when text is focused */
  function showFormatBar(el){
    activeFormatEl = el;
    formatBar.classList.add('visible');
    var cs = getComputedStyle(el);
    fontSizeInput.value = Math.round(parseFloat(cs.fontSize));
    fontColorInput.value = rgbToHex(cs.color);
    fontFamilySelect.value = '';
    fontWeightSelect.value = '';
    /* Populate line-height */
    var lhSelect = formatBar.querySelector('#jbc-line-height');
    if(lhSelect){
      var lhVal = cs.lineHeight;
      if(lhVal === 'normal') lhSelect.value = '';
      else {
        var lhNum = parseFloat(lhVal) / parseFloat(cs.fontSize);
        var closest = ['1','1.2','1.4','1.6','1.8','2','2.5','3'].reduce(function(a,b){
          return Math.abs(parseFloat(b)-lhNum) < Math.abs(parseFloat(a)-lhNum) ? b : a;
        });
        lhSelect.value = closest;
      }
    }
    /* Update body padding to account for format bar */
    document.body.style.paddingTop = '80px';
  }

  function hideFormatBar(){
    activeFormatEl = null;
    formatBar.classList.remove('visible');
    document.body.style.paddingTop = '40px';
  }

  function rgbToHex(rgb){
    if(rgb.charAt(0)==='#') return rgb;
    var m = rgb.match(/(\d+)/g);
    if(!m||m.length<3) return '#F0E6DA';
    return '#'+((1<<24)+(+m[0]<<16)+(+m[1]<<8)+(+m[2])).toString(16).slice(1);
  }

  function markChanged(el){
    if(!el.classList.contains('jbc-text-changed')){
      changes.text++;
      el.classList.add('jbc-text-changed');
      updateCounter();
    }
  }

  /* ========== EXEC-COMMAND HELPER ========== */
  /* Uses document.execCommand for selection-aware formatting like MS Word.
     If there's a text selection inside a contenteditable, it applies to the selection.
     If no selection, it applies to the whole element as fallback. */
  function execFmt(cmd, value){
    /* Ensure focus is inside the active contenteditable */
    if(activeFormatEl && activeFormatEl.getAttribute('contenteditable') === 'true'){
      activeFormatEl.focus();
    }
    document.execCommand(cmd, false, value || null);
  }

  /* Prevent format bar interactions from stealing focus from the text element */
  formatBar.addEventListener('mousedown', function(e){
    e.preventDefault();
  });

  /* Format bar actions — uses document.execCommand for selection-aware formatting */
  formatBar.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-fmt]');
    if(!btn || !activeFormatEl) return;
    var fmt = btn.getAttribute('data-fmt');
    var el = activeFormatEl;
    var cs = getComputedStyle(el);
    var isEditable = (el.getAttribute('contenteditable') === 'true');

    switch(fmt){
      /* ---- Font size (whole element) ---- */
      case 'size-down':
        var s1 = Math.max(8, Math.round(parseFloat(cs.fontSize)) - 2);
        el.style.fontSize = s1 + 'px';
        fontSizeInput.value = s1;
        break;
      case 'size-up':
        var s2 = Math.min(300, Math.round(parseFloat(cs.fontSize)) + 2);
        el.style.fontSize = s2 + 'px';
        fontSizeInput.value = s2;
        break;

      /* ---- Text formatting — execCommand for selection-based like Word ---- */
      case 'bold':
        if(isEditable){ execFmt('bold'); }
        else { el.style.fontWeight = parseInt(cs.fontWeight)>=700 ? '400' : '700'; }
        break;
      case 'italic':
        if(isEditable){ execFmt('italic'); }
        else { el.style.fontStyle = cs.fontStyle==='italic' ? 'normal' : 'italic'; }
        break;
      case 'underline':
        if(isEditable){ execFmt('underline'); }
        else { el.style.textDecoration = (cs.textDecorationLine||'').indexOf('underline')!==-1 ? 'none' : 'underline'; }
        break;
      case 'strikethrough':
        if(isEditable){ execFmt('strikeThrough'); }
        else { el.style.textDecoration = (cs.textDecorationLine||'').indexOf('line-through')!==-1 ? 'none' : 'line-through'; }
        break;
      case 'superscript':
        if(isEditable){ execFmt('superscript'); }
        break;
      case 'subscript':
        if(isEditable){ execFmt('subscript'); }
        break;

      /* ---- Uppercase toggle (whole element) ---- */
      case 'uppercase':
        el.style.textTransform = cs.textTransform === 'uppercase' ? 'none' : 'uppercase';
        break;

      /* ---- Alignment — execCommand for per-selection control like Word ---- */
      case 'justifyLeft':
        if(isEditable){ execFmt('justifyLeft'); }
        else { el.style.textAlign = 'left'; }
        break;
      case 'justifyCenter':
        if(isEditable){ execFmt('justifyCenter'); }
        else { el.style.textAlign = 'center'; }
        break;
      case 'justifyRight':
        if(isEditable){ execFmt('justifyRight'); }
        else { el.style.textAlign = 'right'; }
        break;
      case 'justifyFull':
        if(isEditable){ execFmt('justifyFull'); }
        else { el.style.textAlign = 'justify'; }
        break;

      /* ---- Indent / Outdent ---- */
      case 'indent':
        if(isEditable){ execFmt('indent'); }
        else {
          var curPL = parseFloat(cs.paddingLeft) || 0;
          el.style.paddingLeft = (curPL + 20) + 'px';
        }
        break;
      case 'outdent':
        if(isEditable){ execFmt('outdent'); }
        else {
          var curPL2 = parseFloat(cs.paddingLeft) || 0;
          el.style.paddingLeft = Math.max(0, curPL2 - 20) + 'px';
        }
        break;

      /* ---- Color presets ---- */
      case 'color-gold':
        if(isEditable){ execFmt('foreColor','#E8891D'); }
        else { el.style.color = '#E8891D'; }
        fontColorInput.value = '#E8891D';
        break;
      case 'color-blush':
        if(isEditable){ execFmt('foreColor','#E84848'); }
        else { el.style.color = '#E84848'; }
        fontColorInput.value = '#E84848';
        break;
      case 'color-wine':
        if(isEditable){ execFmt('foreColor','#8B3A8B'); }
        else { el.style.color = '#8B3A8B'; }
        fontColorInput.value = '#8B3A8B';
        break;
      case 'color-cream':
        if(isEditable){ execFmt('foreColor','#F0E6DA'); }
        else { el.style.color = '#F0E6DA'; }
        fontColorInput.value = '#F0E6DA';
        break;

      /* ---- Remove highlight background ---- */
      case 'removeHighlight':
        if(isEditable){ execFmt('hiliteColor','transparent'); }
        else { el.style.backgroundColor = ''; }
        break;

      /* ---- Letter spacing (whole element) ---- */
      case 'ls-down':
        var curLs = parseFloat(cs.letterSpacing) || 0;
        el.style.letterSpacing = (curLs - 0.5) + 'px';
        break;
      case 'ls-up':
        var curLs2 = parseFloat(cs.letterSpacing) || 0;
        el.style.letterSpacing = (curLs2 + 0.5) + 'px';
        break;

      /* ---- Clear all formatting ---- */
      case 'removeFormat':
        if(isEditable){ execFmt('removeFormat'); }
        else {
          el.style.fontWeight = '';
          el.style.fontStyle = '';
          el.style.textDecoration = '';
          el.style.textTransform = '';
          el.style.letterSpacing = '';
          el.style.color = '';
          el.style.backgroundColor = '';
        }
        break;
    }
    markChanged(el);
    showToast('Style updated');
  });

  /* Font size direct input */
  fontSizeInput.addEventListener('change', function(){
    if(!activeFormatEl) return;
    var v = Math.max(8, Math.min(300, parseInt(fontSizeInput.value) || 16));
    activeFormatEl.style.fontSize = v + 'px';
    fontSizeInput.value = v;
    markChanged(activeFormatEl);
  });

  /* Font family select */
  fontFamilySelect.addEventListener('change', function(){
    if(!activeFormatEl || !fontFamilySelect.value) return;
    activeFormatEl.style.fontFamily = fontFamilySelect.value;
    markChanged(activeFormatEl);
    showToast('Font changed');
  });

  /* Font weight select */
  fontWeightSelect.addEventListener('change', function(){
    if(!activeFormatEl || !fontWeightSelect.value) return;
    activeFormatEl.style.fontWeight = fontWeightSelect.value;
    markChanged(activeFormatEl);
    showToast('Weight changed');
  });

  /* Color picker — uses execCommand on selection if editable */
  fontColorInput.addEventListener('input', function(){
    if(!activeFormatEl) return;
    if(activeFormatEl.getAttribute('contenteditable') === 'true'){
      execFmt('foreColor', fontColorInput.value);
    } else {
      activeFormatEl.style.color = fontColorInput.value;
    }
    markChanged(activeFormatEl);
  });

  /* Background / highlight color picker */
  var bgColorInput = formatBar.querySelector('#jbc-bg-color');
  if(bgColorInput){
    bgColorInput.addEventListener('input', function(){
      if(!activeFormatEl) return;
      if(activeFormatEl.getAttribute('contenteditable') === 'true'){
        execFmt('hiliteColor', bgColorInput.value);
      } else {
        activeFormatEl.style.backgroundColor = bgColorInput.value;
      }
      markChanged(activeFormatEl);
    });
  }

  /* Line height select */
  var lineHeightSelect = formatBar.querySelector('#jbc-line-height');
  if(lineHeightSelect){
    lineHeightSelect.addEventListener('change', function(){
      if(!activeFormatEl || !lineHeightSelect.value) return;
      activeFormatEl.style.lineHeight = lineHeightSelect.value;
      markChanged(activeFormatEl);
      showToast('Line spacing changed');
    });
  }

  /* ========== MOVE MODE — DRAG EXISTING ELEMENTS ========== */
  function initMoveModeDrag(){
    var dragEl = null, dragStartX, dragStartY, origTx, origTy;

    document.addEventListener('mousedown', function(e){
      if(!moveMode) return;
      /* Find the element to drag */
      var target = e.target.closest('.jbc-editable') || e.target.closest('.jbc-img-wrap');
      if(!target) return;
      if(e.target.closest('#jbc-editor-banner,#jbc-toolbar,#jbc-add-btn,#jbc-add-menu,#jbc-context-menu,#jbc-format-bar')) return;
      if(e.button !== 0) return;
      e.preventDefault();

      dragEl = target;
      dragEl.classList.add('jbc-move-active');
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      /* Parse existing transform translate */
      var curTransform = dragEl.style.transform || '';
      var txMatch = curTransform.match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/);
      origTx = txMatch ? parseFloat(txMatch[1]) : 0;
      origTy = txMatch ? parseFloat(txMatch[2]) : 0;
    });

    document.addEventListener('mousemove', function(e){
      if(!dragEl) return;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      dragEl.style.transform = 'translate(' + (origTx + dx) + 'px, ' + (origTy + dy) + 'px)';
    });

    document.addEventListener('mouseup', function(){
      if(!dragEl) return;
      dragEl.classList.remove('jbc-move-active');
      /* Mark as moved if it was actually displaced from start */
      var finalTransform = dragEl.style.transform || '';
      var m = finalTransform.match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/);
      if(m && (Math.abs(parseFloat(m[1])) > 2 || Math.abs(parseFloat(m[2])) > 2)){
        dragEl.classList.add('jbc-moved');
        markChanged(dragEl);
        showToast('Element repositioned');
      }
      dragEl = null;
    });
  }
  initMoveModeDrag();

  /* In move mode, single-click a text element to show its format bar for styling */
  document.addEventListener('click', function(e){
    if(!moveMode) return;
    var target = e.target.closest('.jbc-editable');
    if(!target) return;
    if(e.target.closest('#jbc-editor-banner,#jbc-toolbar,#jbc-add-btn,#jbc-add-menu,#jbc-context-menu,#jbc-format-bar')) return;
    showFormatBar(target);
  });

  /* ========== KEYBOARD SHORTCUTS (Ctrl+C / Ctrl+V / Ctrl+D) ========== */
  document.addEventListener('keydown', function(e){
    /* Only work when not typing inside a contenteditable */
    var isTyping = document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true';

    /* Ctrl+C — copy selected element */
    if((e.ctrlKey || e.metaKey) && e.key === 'c' && !isTyping && ctxTarget){
      clipboard = {
        html: ctxTarget.outerHTML,
        tag: ctxTarget.tagName,
        isAdded: ctxTarget.classList.contains('jbc-added'),
        isImgWrap: ctxTarget.classList.contains('jbc-img-wrap'),
        isText: ctxTarget.classList.contains('jbc-editable'),
        computedStyle: null,
        _sourceEl: ctxTarget
      };
      if(!clipboard.isAdded && !clipboard.isImgWrap){
        var cs = getComputedStyle(ctxTarget);
        clipboard.computedStyle = {
          fontSize: cs.fontSize, fontFamily: cs.fontFamily,
          fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
          color: cs.color, textTransform: cs.textTransform,
          letterSpacing: cs.letterSpacing,
          textDecoration: cs.textDecorationLine || cs.textDecoration
        };
      }
      showToast('Copied: ' + getLayerLabel(ctxTarget));
      e.preventDefault();
    }

    /* Ctrl+V — paste at center of viewport */
    if((e.ctrlKey || e.metaKey) && e.key === 'v' && !isTyping && clipboard){
      var centerX = window.scrollX + window.innerWidth / 2;
      var centerY = window.scrollY + window.innerHeight / 2;
      /* Find section at center */
      var elAtCenter = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      var sec = elAtCenter ? (elAtCenter.closest('section') || elAtCenter.closest('.hero') || elAtCenter.closest('footer')) : null;
      if(!sec) sec = document.querySelector('.hero') || document.body;
      pasteElement(centerX, centerY, sec);
      e.preventDefault();
    }

    /* Ctrl+D — duplicate selected element */
    if((e.ctrlKey || e.metaKey) && e.key === 'd' && !isTyping && ctxTarget){
      clipboard = {
        html: ctxTarget.outerHTML,
        tag: ctxTarget.tagName,
        isAdded: ctxTarget.classList.contains('jbc-added'),
        isImgWrap: ctxTarget.classList.contains('jbc-img-wrap'),
        isText: ctxTarget.classList.contains('jbc-editable'),
        computedStyle: null,
        _sourceEl: ctxTarget
      };
      if(!clipboard.isAdded && !clipboard.isImgWrap){
        var cs2 = getComputedStyle(ctxTarget);
        clipboard.computedStyle = {
          fontSize: cs2.fontSize, fontFamily: cs2.fontFamily,
          fontWeight: cs2.fontWeight, fontStyle: cs2.fontStyle,
          color: cs2.color, textTransform: cs2.textTransform,
          letterSpacing: cs2.letterSpacing,
          textDecoration: cs2.textDecorationLine || cs2.textDecoration
        };
      }
      var r = ctxTarget.getBoundingClientRect();
      var s = ctxTarget.closest('section') || ctxTarget.closest('.hero') || ctxTarget.closest('footer') || document.body;
      pasteElement(r.left + window.scrollX + 30, r.top + window.scrollY + 30, s);
      showToast('Duplicated');
      e.preventDefault();
    }
  });

  /* ========== PAGE INFO ========== */
  function getPageInfo(){
    var p = window.location.pathname;
    var filename = 'index.html', subdir = '';
    if(p.indexOf('about')!==-1) filename='about.html';
    else if(p.indexOf('services')!==-1) filename='services.html';
    else if(p.indexOf('portfolio')!==-1) filename='portfolio.html';
    else if(p.indexOf('post-')!==-1){ filename=p.split('/').pop()||'post-01.html'; subdir='magazine'; }
    else if(p.indexOf('magazine')!==-1) filename='magazine.html';
    else if(p.indexOf('contact')!==-1) filename='contact.html';
    return {filename:filename,subdir:subdir};
  }

  /* ========== MAKE ALL TEXT EDITABLE ========== */
  /* Comprehensive selectors including hero spans, .tag, nav links, everything visible */
  var textSelectors = [
    'h1','h2','h3','h4','h5','h6','p',
    '.section-label','.section-title','.section-subtitle','.section-text',
    '.btn-primary','.btn-outline',
    'blockquote','cite',
    '.blog-card-content p','.blog-card-content h3','.blog-card-meta',
    '.service-card h3','.service-card p',
    '.value-card h3','.value-card p',
    '.process-card h3','.process-card p',
    '.service-detail-content h3','.service-detail-content p',
    '.service-list li',
    '.testi-brutal blockquote','.testi-brutal cite',
    '.footer-brand > p','.footer-col h4','.footer-col a',
    '.read-more','.sec-header h2','.sec-header span',
    /* Hero mega title spans */
    '.hero-mega .l1','.hero-mega .l2','.hero-mega .l3',
    /* Tag element */
    '.tag',
    /* Nav links */
    '.nav-links a','.nav-logo span',
    /* Description */
    '.desc','.scroll-txt',
    /* Service sub text */
    '.service-sub','.service-num',
    /* Manifesto spans */
    '.manifesto-inner > span',
    /* Any other visible text-bearing elements */
    '.hero-bottom p','.hero-bottom span',
    'figcaption','label','li','dt','dd',
    '.footer-brand a','footer p','footer a','footer span'
  ].join(',');

  document.querySelectorAll(textSelectors).forEach(function(el){
    if(el.closest('#jbc-editor-banner,#jbc-toolbar,#jbc-add-menu,#jbc-context-menu,#jbc-toast,#jbc-add-btn,#jbc-placement-hint,#jbc-format-bar')) return;
    if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='INPUT'||el.tagName==='TEXTAREA') return;
    if(!el.textContent.trim()) return;
    /* Skip if already editable */
    if(el.getAttribute('contenteditable') === 'true') return;

    el.setAttribute('contenteditable','true');
    el.classList.add('jbc-editable');
    el.spellcheck = false;
    originalTexts.set(el, el.innerHTML);
    el.addEventListener('focus', function(){
      if(!el._snap) el._snap=el.innerHTML;
      showFormatBar(el);
    });
    el.addEventListener('blur', function(){
      if(el.innerHTML !== el._snap){
        if(!el.classList.contains('jbc-text-changed')){ changes.text++; el.classList.add('jbc-text-changed'); updateCounter(); }
        el._snap = el.innerHTML;
        showToast('Text updated');
      }
      /* Delay hiding so clicking format bar buttons still works */
      setTimeout(function(){
        if(document.activeElement !== el && !document.activeElement.closest('#jbc-format-bar')){
          hideFormatBar();
        }
      }, 200);
    });
    el.addEventListener('keydown', function(e){
      if(e.key==='Enter'&&!e.shiftKey&&el.tagName!=='P'&&el.tagName!=='BLOCKQUOTE') e.preventDefault();
    });
    /* Prevent nav links from navigating when clicking to edit */
    if(el.tagName === 'A'){
      el.addEventListener('click', function(e){ e.preventDefault(); });
    }
  });

  /* ========== MAKE EXISTING IMAGES REPLACEABLE ========== */
  document.querySelectorAll('img').forEach(function(img){
    if(img.closest('#jbc-editor-banner,#jbc-toolbar,#jbc-add-menu,#jbc-context-menu')) return;
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
        showToast('Image replaced \u2192 '+targetPath);
      };
      reader.readAsDataURL(file);
    });
  });

  /* ========== BUILD CLEAN HTML ========== */
  function buildCleanHTML(imagePaths){
    var clone = document.documentElement.cloneNode(true);

    /* Remove all editor UI elements */
    clone.querySelectorAll('#jbc-editor-banner,#jbc-toolbar,#jbc-toast,#jbc-add-btn,#jbc-add-menu,#jbc-placement-hint,#jbc-context-menu,#jbc-format-bar,#jbc-guides,#jbc-snap-line,#jbc-panel,#jbc-panel-toggle').forEach(function(el){ el.remove(); });

    /* ================================================================
       STEP 0A — Unwrap oil-on-water runtime DOM.
       main.js wraps .hero-mega inside .hero-oil-wrap and creates a
       .hero-underlay clone. These must NOT be saved into the HTML.
       ================================================================ */
    clone.querySelectorAll('.hero-oil-wrap').forEach(function(wrap){
      /* Find the REAL hero-mega (not the underlay copy) */
      var realMega = wrap.querySelector('.hero-mega:not(.hero-underlay)');
      if(realMega){
        /* Strip inline CSS vars from oil hover (--mx, --my) */
        realMega.style.removeProperty('--mx');
        realMega.style.removeProperty('--my');
        realMega.removeAttribute('style');
        /* Move it out of the oil-wrap, back to its original parent */
        wrap.parentNode.insertBefore(realMega, wrap);
      }
      /* Remove the oil-wrap (and its underlay copy) entirely */
      wrap.remove();
    });
    /* Remove any stray hero-underlay elements */
    clone.querySelectorAll('.hero-underlay').forEach(function(el){ el.remove(); });

    /* ================================================================
       STEP 0B — Clean runtime classes and baked states.
       ================================================================ */
    var cloneBody = clone.querySelector('body');
    if(cloneBody && cloneBody.getAttribute('class') === '') cloneBody.removeAttribute('class');
    /* Preloader should not have "loaded" class baked in */
    var preloader = clone.querySelector('.preloader');
    if(preloader) preloader.classList.remove('loaded');
    /* Nav should not have "scrolled" class baked in */
    var nav2 = clone.querySelector('.nav');
    if(nav2) nav2.classList.remove('scrolled');
    /* Cursor dots should not have baked positions */
    clone.querySelectorAll('.cursor-dot,.cursor-ring').forEach(function(el){ el.removeAttribute('style'); });
    /* Hero mega lines — strip runtime inline styles (font-size overrides, etc) */
    clone.querySelectorAll('.hero-mega .l1,.hero-mega .l2,.hero-mega .l3').forEach(function(el){
      el.removeAttribute('style');
    });
    /* Tag — strip runtime z-index (CSS handles it), trailing nbsp */
    var tagEl = clone.querySelector('.hero .tag');
    if(tagEl){
      tagEl.textContent = tagEl.textContent.replace(/\s+$/,'');
      tagEl.setAttribute('style','font-size: 48px;');
    }
    /* Section selection outlines */
    clone.querySelectorAll('.jbc-section-selected,.jbc-section-hover').forEach(function(el){
      el.classList.remove('jbc-section-selected','jbc-section-hover');
    });
    /* Universal resize handles */
    clone.querySelectorAll('.jbc-universal-handles').forEach(function(el){ el.remove(); });

    /* ================================================================
       STEP 1 — Strip animation/parallax inline styles from ALL elements.
       main.js applies transform, opacity, filter, clip-path, transition
       as inline styles for scroll animations. If we save mid-animation
       these get baked in and break the live site. Reset them so main.js
       can re-animate from clean initial state on the live page.
       ================================================================ */
    clone.querySelectorAll('body *').forEach(function(el){
      /* Skip added elements — their inline positioning is intentional */
      if(el.classList.contains('jbc-added') || el.classList.contains('jbc-custom')) return;
      /* Skip added element children */
      if(el.closest('.jbc-added') || el.closest('.jbc-custom')) return;
      /* Skip images inside wrappers — handled separately */
      if(el.closest('.jbc-img-wrap')) return;

      /* Only strip animation props that main.js sets dynamically */
      var hadStyle = el.hasAttribute('style');
      el.style.opacity = '';
      el.style.transform = '';
      el.style.filter = '';
      el.style.clipPath = '';
      el.style.transition = '';
      /* Clean up empty style attribute */
      if(hadStyle && el.getAttribute('style').replace(/;\s*/g,'').trim() === ''){
        el.removeAttribute('style');
      }
    });

    /* ================================================================
       STEP 2 — Clean ALL contenteditable attributes (true AND false)
       ================================================================ */
    clone.querySelectorAll('[contenteditable]').forEach(function(el){
      el.removeAttribute('contenteditable');
      el.classList.remove('jbc-editable','jbc-text-changed','jbc-moved','jbc-move-active','jbc-selected','jbc-editing','jbc-grabbed','jbc-added-text');
      if(el.getAttribute('spellcheck') === 'false') el.removeAttribute('spellcheck');
      el.removeAttribute('data-added');
      if(el.getAttribute('class') === '') el.removeAttribute('class');
    });

    /* Clean move-mode / placement from body */
    var body2 = clone.querySelector('body');
    if(body2) body2.classList.remove('jbc-move-mode','jbc-placement-mode');

    /* ================================================================
       STEP 3 — Clean ADDED elements — bake positioning, strip editor UI
       These are user-created text/image elements from the + menu or paste.
       They need to survive as absolute-positioned divs with a permanent
       class so page CSS doesn't accidentally affect them.
       ================================================================ */
    clone.querySelectorAll('.jbc-added').forEach(function(el){
      /* Give it a permanent, non-editor class so it's identifiable */
      el.classList.add('jbc-custom');

      /* Capture the positioning values BEFORE any manipulation */
      var keepLeft = el.style.left;
      var keepTop = el.style.top;
      var keepWidth = el.style.width;
      var keepHeight = el.style.height;
      var keepOverflow = el.style.overflow;
      var keepZIndex = el.style.zIndex || '5';

      /* Remove editor-only children FIRST (delete btn, resize handles) */
      el.querySelectorAll('.jbc-delete-btn,.jbc-resize-handle,.jbc-resize-handle-r,.jbc-resize-handle-b').forEach(function(c){ c.remove(); });

      /* Clean inner text elements — strip editor artifacts, keep user content/styles */
      el.querySelectorAll('p,h1,h2,h3,h4,h5,h6').forEach(function(inner){
        /* Strip editor-only style props, keep user-set text styles */
        inner.style.cursor = '';
        inner.style.outline = '';
        inner.style.outlineOffset = '';
        inner.style.userSelect = '';
        inner.style.background = '';
        inner.style.backgroundColor = inner.style.backgroundColor === 'transparent' ? '' : inner.style.backgroundColor;
        inner.removeAttribute('contenteditable');
        inner.removeAttribute('spellcheck');
        inner.removeAttribute('data-added');
        if(inner.getAttribute('class') === '') inner.removeAttribute('class');
        /* Clean empty style */
        if(inner.hasAttribute('style') && inner.getAttribute('style').replace(/;\s*/g,'').trim() === ''){
          inner.removeAttribute('style');
        }
      });

      /* Rebuild the wrapper's style cleanly — ONLY what's needed for the live site */
      el.removeAttribute('style');
      var cleanStyle = 'position:absolute;';
      if(keepLeft) cleanStyle += 'left:' + keepLeft + ';';
      if(keepTop) cleanStyle += 'top:' + keepTop + ';';
      if(keepWidth) cleanStyle += 'width:' + keepWidth + ';';
      if(keepHeight) cleanStyle += 'height:' + keepHeight + ';';
      if(keepOverflow) cleanStyle += 'overflow:' + keepOverflow + ';';
      cleanStyle += 'z-index:' + keepZIndex + ';';
      el.setAttribute('style', cleanStyle);

      /* Remove ALL editor classes and data attributes */
      el.classList.remove('jbc-added','jbc-added-text','jbc-selected','jbc-editing','jbc-grabbed');
      el.removeAttribute('data-pos-type');
      el.removeAttribute('data-box');
      el.removeAttribute('data-orig-z');
      el.removeAttribute('data-added');
      /* Ensure jbc-custom is the only class */
      el.setAttribute('class','jbc-custom');

      console.log('[SAVE] Added element:', el.outerHTML.substring(0,200));
    });

    /* ================================================================
       STEP 4 — Unwrap image wrappers (restore <img> to original spot)
       ================================================================ */
    clone.querySelectorAll('.jbc-img-wrap').forEach(function(wrap){
      var img = wrap.querySelector('img');
      if(img){
        var origSrc = img.getAttribute('data-orig-src');
        if(origSrc && imagePaths && imagePaths[origSrc]) img.src = imagePaths[origSrc];
        else if(origSrc && img.src.indexOf('data:')===0) img.src = origSrc;
        img.removeAttribute('data-orig-src');
        img.removeAttribute('data-added');
        img.removeAttribute('data-save-path');
        /* Strip animation inline styles from image too */
        img.style.opacity = '';
        img.style.transform = '';
        img.style.filter = '';
        img.style.transition = '';
        if(img.getAttribute('style') && img.getAttribute('style').replace(/;\s*/g,'').trim() === '') img.removeAttribute('style');
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

    /* ================================================================
       STEP 5 — Catch any remaining editor data attributes
       ================================================================ */
    clone.querySelectorAll('[data-added]').forEach(function(el){ el.removeAttribute('data-added'); });
    clone.querySelectorAll('[data-orig-z]').forEach(function(el){ el.removeAttribute('data-orig-z'); });
    clone.querySelectorAll('[data-pos-type]').forEach(function(el){ el.removeAttribute('data-pos-type'); });
    clone.querySelectorAll('[data-box]').forEach(function(el){ el.removeAttribute('data-box'); });

    /* Remove hidden file inputs left over */
    clone.querySelectorAll('input[type="file"]').forEach(function(fi){ fi.remove(); });

    /* ================================================================
       STEP 6 — Remove editor <style> block
       ================================================================ */
    clone.querySelectorAll('style').forEach(function(s){
      if(s.textContent.indexOf('jbc-editor')!==-1||s.textContent.indexOf('jbc-editable')!==-1||s.textContent.indexOf('jbc-add')!==-1||s.textContent.indexOf('jbc-context')!==-1||s.textContent.indexOf('jbc-format')!==-1||s.textContent.indexOf('jbc-move')!==-1||s.textContent.indexOf('jbc-toast')!==-1) s.remove();
    });

    /* ================================================================
       STEP 7 — Final sweep: remove ALL leftover editor classes
       ================================================================ */
    var editorClasses = ['jbc-editable','jbc-text-changed','jbc-moved','jbc-move-active','jbc-selected',
      'jbc-editing','jbc-grabbed','jbc-added','jbc-added-text','jbc-placement-mode','jbc-move-mode'];
    editorClasses.forEach(function(cls){
      clone.querySelectorAll('.'+cls).forEach(function(el){
        el.classList.remove(cls);
        if(el.getAttribute('class') === '') el.removeAttribute('class');
      });
    });

    /* ================================================================
       STEP 8 — Clean body
       ================================================================ */
    var body = clone.querySelector('body');
    if(body){
      body.style.marginTop = '';
      body.style.paddingTop = '';
      body.style.overflow = '';
      body.classList.remove('jbc-placement-mode','jbc-move-mode');
      if(body.getAttribute('style') === '') body.removeAttribute('style');
    }

    /* ================================================================
       STEP 9 — Clean <nav> inline styles (navbar hide/show from scroll)
       ================================================================ */
    var nav = clone.querySelector('nav');
    if(nav){
      nav.style.transform = '';
      nav.style.transition = '';
      if(nav.getAttribute('style') && nav.getAttribute('style').replace(/;\s*/g,'').trim() === '') nav.removeAttribute('style');
    }

    return '<!DOCTYPE html>\n<html lang="en">\n' + clone.innerHTML + '\n</html>';
  }

  /* ========== SAVE — uses File System Access API (no server needed) ========== */
  async function savePage(){
    var total = changes.text + changes.images;
    if(total===0){ showToast('No changes to save'); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';

    try {
      if(!folderHandle){
        showToast('Pick your website folder...');
        folderHandle = await window.showDirectoryPicker({mode:'readwrite'});
      }

      var perm = await folderHandle.requestPermission({mode:'readwrite'});
      if(perm !== 'granted') throw new Error('Need permission to save files');

      var imagePaths = {};

      /* 1. Save all pending images */
      for(var i=0; i<pendingImages.length; i++){
        var pi = pendingImages[i];
        var imgPathParts = pi.targetPath.split('/');
        var imgDir = folderHandle;

        for(var d=0; d<imgPathParts.length-1; d++){
          imgDir = await imgDir.getDirectoryHandle(imgPathParts[d], {create:true});
        }

        var imgFileName = imgPathParts[imgPathParts.length-1];
        var imgFileHandle = await imgDir.getFileHandle(imgFileName, {create:true});
        var imgWritable = await imgFileHandle.createWritable();
        var base64Data = pi.base64.replace(/^data:image\/\w+;base64,/, '');
        var binaryStr = atob(base64Data);
        var bytes = new Uint8Array(binaryStr.length);
        for(var b=0; b<binaryStr.length; b++) bytes[b] = binaryStr.charCodeAt(b);
        await imgWritable.write(bytes);
        await imgWritable.close();

        imagePaths[pi.origSrc] = pi.targetPath;
        console.log('Saved image:', pi.targetPath);
      }

      /* 2. Build clean HTML */
      var pageInfo = getPageInfo();
      var cleanHTML = buildCleanHTML(imagePaths);

      /* 3. Save HTML file */
      var htmlDir = folderHandle;
      if(pageInfo.subdir){
        htmlDir = await folderHandle.getDirectoryHandle(pageInfo.subdir, {create:true});
      }
      var htmlFileHandle = await htmlDir.getFileHandle(pageInfo.filename, {create:true});
      var htmlWritable = await htmlFileHandle.createWritable();
      await htmlWritable.write(cleanHTML);
      await htmlWritable.close();

      showToast('Saved! ' + pageInfo.filename + ' \u2014 ready to git push', 'success');

      /* Reset state */
      changes = {text:0, images:0};
      pendingImages = [];
      updateCounter();
      document.querySelectorAll('.jbc-text-changed').forEach(function(el){ el.classList.remove('jbc-text-changed'); });

    } catch(e){
      console.error('Save failed:', e);
      if(e.name === 'AbortError'){
        showToast('Save cancelled');
      } else {
        showToast('Save failed: ' + e.message, 'error');
      }
    }

    saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE';
    saveBtn.disabled = (changes.text + changes.images) === 0;
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

  /* ========================================================================
     EDITOR V2 EXTENSIONS — Undo/Redo, Side Panel, Properties, Section Edit
     ======================================================================== */

  /* ---- V2 STYLES ---- */
  var css2 = document.createElement('style');
  css2.textContent = `
    /* LEFT SIDEBAR PANEL */
    #jbc-panel{position:fixed;left:0;top:40px;bottom:0;width:280px;z-index:1000001;
      background:#111;border-right:2px solid #333;display:flex;flex-direction:column;
      font-family:monospace;color:#ccc;overflow:hidden;transition:transform 0.25s;transform:translateX(-100%);}
    #jbc-panel.open{transform:translateX(0);}
    #jbc-panel-tabs{display:flex;border-bottom:2px solid #333;flex-shrink:0;}
    #jbc-panel-tabs button{flex:1;padding:10px 6px;background:none;border:none;border-bottom:2px solid transparent;
      color:#888;font-family:monospace;font-size:11px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;transition:all 0.15s;}
    #jbc-panel-tabs button:hover{color:#fff;}
    #jbc-panel-tabs button.active{color:#2ecc40;border-bottom-color:#2ecc40;}
    .jbc-tab-content{display:none;flex:1;overflow-y:auto;padding:12px;}
    .jbc-tab-content.active{display:block;}
    .jbc-tab-content h4{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #333;}
    .jbc-tab-content h4:first-child{margin-top:4px;}

    /* Layer items */
    .jbc-layer-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid transparent;border-radius:4px;cursor:pointer;font-size:11px;transition:all 0.1s;margin-bottom:2px;}
    .jbc-layer-row:hover{background:#222;border-color:#444;}
    .jbc-layer-row.selected{background:#1a3a1a;border-color:#2ecc40;}
    .jbc-layer-row i{width:16px;text-align:center;color:#888;font-size:12px;flex-shrink:0;}
    .jbc-layer-row .lbl{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .jbc-layer-row .z-badge{font-size:9px;color:#666;flex-shrink:0;}
    .jbc-layer-row .vis-btn{background:none;border:none;color:#888;cursor:pointer;padding:2px;font-size:11px;flex-shrink:0;}
    .jbc-layer-row .vis-btn:hover{color:#2ecc40;}
    .jbc-layer-row .vis-btn.hidden{color:#E84848;}

    /* Properties panel */
    .jbc-prop-group{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;}
    .jbc-prop-group.full{grid-template-columns:1fr;}
    .jbc-prop-field{display:flex;flex-direction:column;gap:2px;}
    .jbc-prop-field label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#666;}
    .jbc-prop-field input,.jbc-prop-field select{background:#222;color:#fff;border:1px solid #444;padding:5px 6px;
      font-family:monospace;font-size:12px;border-radius:3px;width:100%;box-sizing:border-box;}
    .jbc-prop-field input:focus,.jbc-prop-field select:focus{border-color:#2ecc40;outline:none;}
    .jbc-prop-field input[type="color"]{height:30px;padding:2px;cursor:pointer;}
    .jbc-prop-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
    .jbc-prop-actions button{flex:1;min-width:70px;padding:6px 8px;background:#222;color:#fff;border:1px solid #444;
      font-family:monospace;font-size:10px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;border-radius:3px;transition:all 0.15s;}
    .jbc-prop-actions button:hover{background:#2ecc40;border-color:#2ecc40;color:#000;}
    .jbc-prop-actions button.danger:hover{background:#E84848;border-color:#E84848;color:#fff;}

    /* Section selection */
    .jbc-section-selected{outline:2px dashed #0af!important;outline-offset:-2px!important;}
    .jbc-section-hover{outline:1px dashed rgba(0,180,255,0.3)!important;outline-offset:-1px!important;}

    /* Panel toggle button */
    #jbc-panel-toggle{position:fixed;top:44px;left:4px;z-index:1000002;width:36px;height:36px;
      background:#111;border:2px solid #333;color:#fff;font-size:16px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;transition:all 0.2s;border-radius:3px;}
    #jbc-panel-toggle:hover{background:#2ecc40;border-color:#2ecc40;color:#000;}
    #jbc-panel-toggle.open{left:284px;}

    /* Undo/redo buttons */
    #jbc-toolbar .jbc-undo-btn,#jbc-toolbar .jbc-redo-btn{padding:8px 14px;font-size:11px;}
    #jbc-toolbar .jbc-undo-btn:disabled,#jbc-toolbar .jbc-redo-btn:disabled{opacity:0.3;}

    /* Universal resize handles on selected element */
    .jbc-universal-handles{position:absolute;inset:-4px;z-index:999997;pointer-events:none;border:1px dashed #2ecc40;}
    .jbc-uhandle{position:absolute;width:10px;height:10px;background:#2ecc40;border:1px solid #fff;pointer-events:all;cursor:nwse-resize;z-index:999998;}
    .jbc-uhandle.tl{top:-5px;left:-5px;cursor:nw-resize;}
    .jbc-uhandle.tr{top:-5px;right:-5px;cursor:ne-resize;}
    .jbc-uhandle.bl{bottom:-5px;left:-5px;cursor:sw-resize;}
    .jbc-uhandle.br{bottom:-5px;right:-5px;cursor:se-resize;}
    .jbc-uhandle.tm{top:-5px;left:50%;margin-left:-5px;cursor:n-resize;}
    .jbc-uhandle.bm{bottom:-5px;left:50%;margin-left:-5px;cursor:s-resize;}
    .jbc-uhandle.ml{top:50%;left:-5px;margin-top:-5px;cursor:w-resize;}
    .jbc-uhandle.mr{top:50%;right:-5px;margin-top:-5px;cursor:e-resize;}

    /* Responsive preview */
    #jbc-preview-frame{display:none;position:fixed;top:40px;left:0;right:0;bottom:0;z-index:999990;
      background:rgba(0,0,0,0.8);align-items:flex-start;justify-content:center;padding-top:20px;}
    #jbc-preview-frame.visible{display:flex;}
    #jbc-preview-frame iframe{border:2px solid #333;background:#fff;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.5);}

    /* Section edit bar */
    .jbc-section-bar{position:absolute;top:-36px;left:50%;transform:translateX(-50%);z-index:999996;
      display:flex;gap:4px;background:#111;border:1px solid #333;padding:4px 8px;border-radius:4px;white-space:nowrap;}
    .jbc-section-bar button{background:#222;color:#fff;border:1px solid #444;padding:4px 8px;
      font-family:monospace;font-size:10px;font-weight:bold;cursor:pointer;border-radius:3px;transition:all 0.1s;}
    .jbc-section-bar button:hover{background:#0af;border-color:#0af;color:#000;}
  `;
  document.head.appendChild(css2);

  /* ---- UNDO / REDO SYSTEM ---- */
  var undoStack = [], redoStack = [], maxUndo = 50;
  function captureState(label){
    undoStack.push({label:label, html:document.body.innerHTML, scroll:window.scrollY});
    if(undoStack.length > maxUndo) undoStack.shift();
    redoStack = [];
    updateUndoRedoBtns();
  }
  /* Capture initial state */
  setTimeout(function(){ captureState('initial'); }, 500);

  function undo(){
    if(undoStack.length < 2) return;
    var current = undoStack.pop();
    redoStack.push(current);
    var prev = undoStack[undoStack.length - 1];
    restoreState(prev);
    showToast('Undo: ' + (prev.label || ''));
  }
  function redo(){
    if(redoStack.length === 0) return;
    var next = redoStack.pop();
    undoStack.push(next);
    restoreState(next);
    showToast('Redo: ' + (next.label || ''));
  }
  function restoreState(state){
    /* Save scroll, restore HTML, re-scroll */
    document.body.innerHTML = state.html;
    window.scrollTo(0, state.scroll);
    updateUndoRedoBtns();
    /* Re-init editor UI references (they were destroyed) */
    reinitEditorUI();
  }
  function reinitEditorUI(){
    /* After innerHTML restore, we need to re-find / recreate editor elements.
       Simplest approach: reload the page with ?edit to get a fresh editor init. */
    location.reload();
  }
  function updateUndoRedoBtns(){
    var ub = document.querySelector('.jbc-undo-btn');
    var rb = document.querySelector('.jbc-redo-btn');
    if(ub) ub.disabled = undoStack.length < 2;
    if(rb) rb.disabled = redoStack.length === 0;
  }

  /* Add undo/redo to keyboard shortcuts */
  document.addEventListener('keydown', function(e){
    if((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey){
      var isTyping = document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true';
      if(!isTyping){
        e.preventDefault();
        undo();
      }
    }
    if((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))){
      var isTyping2 = document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true';
      if(!isTyping2){
        e.preventDefault();
        redo();
      }
    }
  });

  /* Add undo/redo buttons to toolbar */
  var undoBtn = document.createElement('button');
  undoBtn.className = 'jbc-undo-btn';
  undoBtn.innerHTML = '<i class="fas fa-undo"></i> UNDO';
  undoBtn.disabled = true;
  undoBtn.addEventListener('click', undo);
  toolbar.insertBefore(undoBtn, saveBtn);

  var redoBtn = document.createElement('button');
  redoBtn.className = 'jbc-redo-btn';
  redoBtn.innerHTML = '<i class="fas fa-redo"></i> REDO';
  redoBtn.disabled = true;
  redoBtn.addEventListener('click', redo);
  toolbar.insertBefore(redoBtn, saveBtn);

  /* Capture state after significant actions */
  var captureTimeout = null;
  function debouncedCapture(label){
    clearTimeout(captureTimeout);
    captureTimeout = setTimeout(function(){ captureState(label); }, 600);
  }
  /* Hook into existing change tracking */
  var origUpdateCounter = updateCounter;
  updateCounter = function(){
    origUpdateCounter();
    debouncedCapture('edit');
  };

  /* ---- PANEL TOGGLE BUTTON ---- */
  var panelToggle = document.createElement('button');
  panelToggle.id = 'jbc-panel-toggle';
  panelToggle.innerHTML = '<i class="fas fa-columns"></i>';
  panelToggle.title = 'Toggle Side Panel';
  document.body.appendChild(panelToggle);

  /* ---- LEFT SIDE PANEL ---- */
  var panel = document.createElement('div');
  panel.id = 'jbc-panel';
  panel.innerHTML = [
    '<div id="jbc-panel-tabs">',
    '  <button class="active" data-tab="layers">Layers</button>',
    '  <button data-tab="props">Properties</button>',
    '  <button data-tab="section">Section</button>',
    '  <button data-tab="page">Page</button>',
    '</div>',
    '<div class="jbc-tab-content active" id="jbc-tab-layers">',
    '  <h4>Current Section Layers</h4>',
    '  <div id="jbc-layers-list"></div>',
    '</div>',
    '<div class="jbc-tab-content" id="jbc-tab-props">',
    '  <h4>Element Properties</h4>',
    '  <div id="jbc-props-content"><p style="color:#666;font-size:11px;">Click any element to see its properties</p></div>',
    '</div>',
    '<div class="jbc-tab-content" id="jbc-tab-section">',
    '  <h4>Section Design</h4>',
    '  <div id="jbc-section-content"><p style="color:#666;font-size:11px;">Click on a section background to select it</p></div>',
    '</div>',
    '<div class="jbc-tab-content" id="jbc-tab-page">',
    '  <h4>Page Settings</h4>',
    '  <div id="jbc-page-content"></div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(panel);

  var panelOpen = false;
  panelToggle.addEventListener('click', function(){
    panelOpen = !panelOpen;
    panel.classList.toggle('open', panelOpen);
    panelToggle.classList.toggle('open', panelOpen);
    panelToggle.innerHTML = panelOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-columns"></i>';
    if(panelOpen) refreshLayersPanel();
  });

  /* Tab switching */
  panel.querySelector('#jbc-panel-tabs').addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if(!btn) return;
    panel.querySelectorAll('#jbc-panel-tabs button').forEach(function(b){ b.classList.remove('active'); });
    panel.querySelectorAll('.jbc-tab-content').forEach(function(t){ t.classList.remove('active'); });
    btn.classList.add('active');
    var tabId = 'jbc-tab-' + btn.getAttribute('data-tab');
    var tab = document.getElementById(tabId);
    if(tab) tab.classList.add('active');
    if(btn.getAttribute('data-tab') === 'layers') refreshLayersPanel();
    if(btn.getAttribute('data-tab') === 'page') refreshPageSettings();
  });

  /* ---- LAYERS PANEL ---- */
  var selectedElement = null;
  var selectedSection = null;

  function refreshLayersPanel(){
    var list = document.getElementById('jbc-layers-list');
    if(!list) return;
    /* Find section in viewport center */
    var centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    var section = centerEl ? (centerEl.closest('section') || centerEl.closest('.hero') || centerEl.closest('.manifesto') || centerEl.closest('footer')) : null;
    if(!section) section = document.querySelector('.hero');
    if(!section){ list.innerHTML = '<p style="color:#666;font-size:11px;">No section found</p>'; return; }

    var elems = getSectionElements(section);
    elems.sort(function(a,b){
      var zA = parseInt(a.style.zIndex) || parseInt(getComputedStyle(a).zIndex) || 0;
      var zB = parseInt(b.style.zIndex) || parseInt(getComputedStyle(b).zIndex) || 0;
      return zB - zA;
    });

    var html = '<div style="font-size:9px;color:#555;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">' +
      (section.classList.contains('hero') ? 'Hero' : section.tagName.toLowerCase()) + ' — ' + elems.length + ' elements</div>';

    elems.forEach(function(el, idx){
      var label = getLayerLabel(el);
      var icon = getLayerIcon(el);
      var z = parseInt(el.style.zIndex) || parseInt(getComputedStyle(el).zIndex) || 'auto';
      var isSel = (el === selectedElement) ? ' selected' : '';
      html += '<div class="jbc-layer-row'+isSel+'" data-layer-v2="'+idx+'">';
      html += '<i class="fas '+icon+'"></i>';
      html += '<span class="lbl">'+label+'</span>';
      html += '<span class="z-badge">z:'+z+'</span>';
      html += '<button class="vis-btn" data-vis-idx="'+idx+'" title="Toggle visibility"><i class="fas fa-eye"></i></button>';
      html += '</div>';
    });
    list.innerHTML = html;
    list._elements = elems;

    /* Click handlers */
    list.querySelectorAll('.jbc-layer-row').forEach(function(row){
      row.addEventListener('click', function(e){
        if(e.target.closest('.vis-btn')) return;
        var i = parseInt(row.getAttribute('data-layer-v2'));
        var els = list._elements;
        if(els && els[i]){
          selectElement(els[i]);
          els[i].scrollIntoView({behavior:'smooth', block:'center'});
        }
      });
    });
    list.querySelectorAll('.vis-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var i = parseInt(btn.getAttribute('data-vis-idx'));
        var els = list._elements;
        if(els && els[i]){
          var el = els[i];
          if(el.style.display === 'none'){
            el.style.display = '';
            btn.classList.remove('hidden');
            btn.innerHTML = '<i class="fas fa-eye"></i>';
          } else {
            el.style.display = 'none';
            btn.classList.add('hidden');
            btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
          }
          markChanged(el);
        }
      });
    });
  }

  /* Refresh layers on scroll */
  var layerRefreshRAF = null;
  window.addEventListener('scroll', function(){
    if(!panelOpen) return;
    if(layerRefreshRAF) return;
    layerRefreshRAF = requestAnimationFrame(function(){
      refreshLayersPanel();
      layerRefreshRAF = null;
    });
  }, {passive:true});

  /* ---- ELEMENT SELECTION & PROPERTIES ---- */
  var universalHandlesEl = null;

  function selectElement(el){
    /* Deselect previous */
    if(selectedElement){
      selectedElement.classList.remove('jbc-selected');
      removeUniversalHandles();
    }
    selectedElement = el;
    ctxTarget = el; /* sync with existing context menu system */
    el.classList.add('jbc-selected');

    /* Show properties */
    showProperties(el);
    /* Show universal resize handles */
    showUniversalHandles(el);
    /* Update layers */
    if(panelOpen) refreshLayersPanel();
    /* Switch to properties tab */
    panel.querySelectorAll('#jbc-panel-tabs button').forEach(function(b){ b.classList.remove('active'); });
    panel.querySelectorAll('.jbc-tab-content').forEach(function(t){ t.classList.remove('active'); });
    panel.querySelector('[data-tab="props"]').classList.add('active');
    document.getElementById('jbc-tab-props').classList.add('active');
  }

  function showProperties(el){
    var container = document.getElementById('jbc-props-content');
    if(!container) return;
    var cs = getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    var label = getLayerLabel(el);

    var curZ = parseInt(el.style.zIndex) || parseInt(cs.zIndex) || 0;
    var curOpacity = el.style.opacity !== '' ? parseFloat(el.style.opacity) : parseFloat(cs.opacity);
    var curBg = el.style.backgroundColor || cs.backgroundColor;
    var curColor = el.style.color || cs.color;

    container.innerHTML = [
      '<div style="font-size:12px;font-weight:bold;color:#2ecc40;margin-bottom:10px;">'+label+'</div>',
      '<h4>Position & Size</h4>',
      '<div class="jbc-prop-group">',
      '  <div class="jbc-prop-field"><label>X (left)</label><input type="text" id="jbc-p-x" value="'+(el.style.left||Math.round(rect.left)+'px')+'"></div>',
      '  <div class="jbc-prop-field"><label>Y (top)</label><input type="text" id="jbc-p-y" value="'+(el.style.top||Math.round(rect.top+window.scrollY)+'px')+'"></div>',
      '</div>',
      '<div class="jbc-prop-group">',
      '  <div class="jbc-prop-field"><label>Width</label><input type="text" id="jbc-p-w" value="'+(el.style.width||Math.round(rect.width)+'px')+'"></div>',
      '  <div class="jbc-prop-field"><label>Height</label><input type="text" id="jbc-p-h" value="'+(el.style.height||'auto')+'"></div>',
      '</div>',
      '<h4>Stacking & Visibility</h4>',
      '<div class="jbc-prop-group">',
      '  <div class="jbc-prop-field"><label>Z-Index</label><input type="number" id="jbc-p-z" value="'+curZ+'"></div>',
      '  <div class="jbc-prop-field"><label>Opacity</label><input type="number" id="jbc-p-o" value="'+curOpacity.toFixed(2)+'" min="0" max="1" step="0.05"></div>',
      '</div>',
      '<h4>Colors</h4>',
      '<div class="jbc-prop-group">',
      '  <div class="jbc-prop-field"><label>Text Color</label><input type="color" id="jbc-p-color" value="'+rgbToHex(curColor)+'"></div>',
      '  <div class="jbc-prop-field"><label>Background</label><input type="color" id="jbc-p-bg" value="'+rgbToHex(curBg)+'"></div>',
      '</div>',
      '<div class="jbc-prop-group full">',
      '  <div class="jbc-prop-field"><label>BG Transparent</label><button id="jbc-p-bg-none" style="background:#222;color:#fff;border:1px solid #444;padding:4px 8px;font-family:monospace;font-size:10px;cursor:pointer;border-radius:3px;">Remove Background</button></div>',
      '</div>',
      '<h4>Actions</h4>',
      '<div class="jbc-prop-actions">',
      '  <button data-pa="front"><i class="fas fa-arrow-up"></i> Front</button>',
      '  <button data-pa="back"><i class="fas fa-arrow-down"></i> Back</button>',
      '  <button data-pa="duplicate"><i class="fas fa-clone"></i> Copy</button>',
      '  <button data-pa="delete" class="danger"><i class="fas fa-trash"></i> Delete</button>',
      '</div>'
    ].join('\n');

    /* Wire up live property inputs */
    var pX = container.querySelector('#jbc-p-x');
    var pY = container.querySelector('#jbc-p-y');
    var pW = container.querySelector('#jbc-p-w');
    var pH = container.querySelector('#jbc-p-h');
    var pZ = container.querySelector('#jbc-p-z');
    var pO = container.querySelector('#jbc-p-o');
    var pColor = container.querySelector('#jbc-p-color');
    var pBg = container.querySelector('#jbc-p-bg');
    var pBgNone = container.querySelector('#jbc-p-bg-none');

    function applyProp(prop, val){ el.style[prop] = val; markChanged(el); }

    if(pX) pX.addEventListener('change', function(){ applyProp('left', pX.value); });
    if(pY) pY.addEventListener('change', function(){ applyProp('top', pY.value); });
    if(pW) pW.addEventListener('change', function(){ applyProp('width', pW.value); });
    if(pH) pH.addEventListener('change', function(){ applyProp('height', pH.value); });
    if(pZ) pZ.addEventListener('input', function(){ applyProp('zIndex', pZ.value); refreshLayersPanel(); });
    if(pO) pO.addEventListener('input', function(){ applyProp('opacity', pO.value); });
    if(pColor) pColor.addEventListener('input', function(){ applyProp('color', pColor.value); });
    if(pBg) pBg.addEventListener('input', function(){ applyProp('backgroundColor', pBg.value); });
    if(pBgNone) pBgNone.addEventListener('click', function(){ applyProp('backgroundColor', 'transparent'); });

    /* Action buttons */
    container.querySelectorAll('[data-pa]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var a = btn.getAttribute('data-pa');
        if(a === 'front'){ el.style.zIndex = '50'; markChanged(el); refreshLayersPanel(); showToast('Brought to front'); }
        if(a === 'back'){ el.style.zIndex = '1'; markChanged(el); refreshLayersPanel(); showToast('Sent to back'); }
        if(a === 'duplicate'){
          clipboard = { html:el.outerHTML, tag:el.tagName, isAdded:el.classList.contains('jbc-added'), isImgWrap:el.classList.contains('jbc-img-wrap'), isText:el.classList.contains('jbc-editable'), computedStyle:null, _sourceEl:el };
          var r = el.getBoundingClientRect();
          var sec = el.closest('section') || el.closest('.hero') || el.closest('footer') || document.body;
          pasteElement(r.left + window.scrollX + 30, r.top + window.scrollY + 30, sec);
          showToast('Duplicated');
        }
        if(a === 'delete'){
          if(confirm('Delete this element?')){
            el.remove();
            selectedElement = null;
            removeUniversalHandles();
            container.innerHTML = '<p style="color:#666;font-size:11px;">Element deleted</p>';
            changes.text++;
            updateCounter();
            refreshLayersPanel();
          }
        }
      });
    });
  }

  /* ---- UNIVERSAL RESIZE HANDLES ---- */
  function showUniversalHandles(el){
    removeUniversalHandles();
    /* Show resize handles on ANY element — make it relative if static so handles work */
    var pos = getComputedStyle(el).position;

    var box = document.createElement('div');
    box.className = 'jbc-universal-handles';
    ['tl','tm','tr','ml','mr','bl','bm','br'].forEach(function(corner){
      var h = document.createElement('div');
      h.className = 'jbc-uhandle ' + corner;
      h.setAttribute('data-corner', corner);
      box.appendChild(h);
    });
    el.style.position = el.style.position || pos;
    if(pos === 'static'){
      el.style.position = 'relative';
    }
    el.appendChild(box);
    universalHandlesEl = box;

    /* Wire resize for each handle */
    box.querySelectorAll('.jbc-uhandle').forEach(function(handle){
      var corner = handle.getAttribute('data-corner');
      var resizing = false, sX, sY, sW, sH, sL, sT;
      handle.addEventListener('mousedown', function(e){
        e.stopPropagation(); e.preventDefault();
        resizing = true;
        sX = e.clientX; sY = e.clientY;
        sW = el.offsetWidth; sH = el.offsetHeight;
        sL = parseFloat(el.style.left) || 0;
        sT = parseFloat(el.style.top) || 0;
        function onMove(e2){
          if(!resizing) return;
          var dx = e2.clientX - sX, dy = e2.clientY - sY;
          if(corner.indexOf('r') !== -1) el.style.width = Math.max(30, sW + dx) + 'px';
          if(corner.indexOf('b') !== -1) el.style.height = Math.max(20, sH + dy) + 'px';
          if(corner === 'tl' || corner === 'ml' || corner === 'bl'){
            el.style.width = Math.max(30, sW - dx) + 'px';
            el.style.left = (sL + dx) + (String(el.style.left).indexOf('%') !== -1 ? '%' : 'px');
          }
          if(corner === 'tl' || corner === 'tm' || corner === 'tr'){
            el.style.height = Math.max(20, sH - dy) + 'px';
            el.style.top = (sT + dy) + (String(el.style.top).indexOf('%') !== -1 ? '%' : 'px');
          }
        }
        function onUp(){
          resizing = false;
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          markChanged(el);
          showProperties(el);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }

  function removeUniversalHandles(){
    if(universalHandlesEl){
      universalHandlesEl.remove();
      universalHandlesEl = null;
    }
    document.querySelectorAll('.jbc-universal-handles').forEach(function(h){ h.remove(); });
  }

  /* ---- CLICK TO SELECT ANY ELEMENT ---- */
  document.addEventListener('click', function(e){
    /* Ignore clicks on editor UI */
    if(e.target.closest('#jbc-panel,#jbc-panel-toggle,#jbc-editor-banner,#jbc-toolbar,#jbc-add-btn,#jbc-add-menu,#jbc-context-menu,#jbc-format-bar,#jbc-toast')) return;
    /* Ignore clicks on universal handles */
    if(e.target.closest('.jbc-universal-handles')) return;

    /* Find the nearest meaningful element — works on ALL elements */
    var target = e.target.closest('.jbc-added') || e.target.closest('.jbc-custom') || e.target.closest('.jbc-img-wrap');
    if(!target) target = e.target.closest('.jbc-editable');
    if(!target){
      /* In move mode or with panel open, allow selecting any visible element */
      if(moveMode || panelOpen){
        target = e.target.closest('h1,h2,h3,h4,h5,h6,p,img,blockquote,figure,video,.service-card,.portfolio-item,.value-card,.process-card,.blog-card,.team-member,.testi-brutal,.tag');
      }
    }
    if(target){
      selectElement(target);
    }
  });

  /* Deselect on click in empty area */
  document.addEventListener('mousedown', function(e){
    if(e.target.closest('#jbc-panel,#jbc-panel-toggle,#jbc-editor-banner,#jbc-toolbar,#jbc-add-btn,#jbc-add-menu,#jbc-context-menu,#jbc-format-bar,#jbc-toast,.jbc-universal-handles,.jbc-added,.jbc-custom,.jbc-img-wrap,.jbc-editable')) return;
    if(selectedElement && !moveMode){
      selectedElement.classList.remove('jbc-selected');
      removeUniversalHandles();
      selectedElement = null;
      var pc = document.getElementById('jbc-props-content');
      if(pc) pc.innerHTML = '<p style="color:#666;font-size:11px;">Click any element to see its properties</p>';
    }
  });

  /* ---- SECTION EDITING ---- */
  /* Click on section background to select and edit it */
  document.addEventListener('dblclick', function(e){
    if(e.target.closest('#jbc-panel,#jbc-panel-toggle,#jbc-editor-banner,#jbc-toolbar,#jbc-add-btn,#jbc-add-menu,#jbc-context-menu,#jbc-format-bar')) return;
    var section = e.target.closest('section') || e.target.closest('.hero') || e.target.closest('.manifesto') || e.target.closest('footer');
    if(!section) return;
    /* Only trigger if clicking directly on the section, not on a child element with content */
    if(e.target !== section && !e.target.classList.contains('container') && e.target.closest('.jbc-added,.jbc-editable,.jbc-img-wrap,.jbc-custom')) return;

    selectSection(section);
  });

  function selectSection(section){
    /* Deselect previous */
    document.querySelectorAll('.jbc-section-selected').forEach(function(s){ s.classList.remove('jbc-section-selected'); });
    selectedSection = section;
    section.classList.add('jbc-section-selected');

    /* Switch to section tab */
    panel.querySelectorAll('#jbc-panel-tabs button').forEach(function(b){ b.classList.remove('active'); });
    panel.querySelectorAll('.jbc-tab-content').forEach(function(t){ t.classList.remove('active'); });
    panel.querySelector('[data-tab="section"]').classList.add('active');
    document.getElementById('jbc-tab-section').classList.add('active');
    if(!panelOpen){ panelOpen = true; panel.classList.add('open'); panelToggle.classList.add('open'); panelToggle.innerHTML = '<i class="fas fa-times"></i>'; }

    showSectionProperties(section);
  }

  function showSectionProperties(section){
    var container = document.getElementById('jbc-section-content');
    if(!container) return;
    var cs = getComputedStyle(section);
    var tag = section.tagName.toLowerCase();
    var cls = section.className.replace(/jbc-section-selected|jbc-section-hover/g,'').trim();
    var label = cls ? cls.split(/\s+/)[0] : tag;

    container.innerHTML = [
      '<div style="font-size:12px;font-weight:bold;color:#0af;margin-bottom:10px;">&lt;'+tag+'&gt; '+label+'</div>',
      '<h4>Background</h4>',
      '<div class="jbc-prop-group">',
      '  <div class="jbc-prop-field"><label>Color</label><input type="color" id="jbc-s-bg" value="'+rgbToHex(cs.backgroundColor)+'"></div>',
      '  <div class="jbc-prop-field"><label>Transparent</label><button id="jbc-s-bg-none" style="background:#222;color:#fff;border:1px solid #444;padding:4px 8px;font-family:monospace;font-size:10px;cursor:pointer;border-radius:3px;width:100%;">Clear BG</button></div>',
      '</div>',
      '<div class="jbc-prop-group full">',
      '  <div class="jbc-prop-field"><label>Background Image URL</label><input type="text" id="jbc-s-bgimg" value="'+(section.style.backgroundImage||'').replace(/url\(['"]?|['"]?\)/g,'')+'" placeholder="images/..."></div>',
      '</div>',
      '<h4>Spacing</h4>',
      '<div class="jbc-prop-group">',
      '  <div class="jbc-prop-field"><label>Padding Top</label><input type="text" id="jbc-s-pt" value="'+cs.paddingTop+'"></div>',
      '  <div class="jbc-prop-field"><label>Padding Bottom</label><input type="text" id="jbc-s-pb" value="'+cs.paddingBottom+'"></div>',
      '</div>',
      '<div class="jbc-prop-group">',
      '  <div class="jbc-prop-field"><label>Padding Left</label><input type="text" id="jbc-s-pl" value="'+cs.paddingLeft+'"></div>',
      '  <div class="jbc-prop-field"><label>Padding Right</label><input type="text" id="jbc-s-pr" value="'+cs.paddingRight+'"></div>',
      '</div>',
      '<h4>Border</h4>',
      '<div class="jbc-prop-group">',
      '  <div class="jbc-prop-field"><label>Border Top</label><input type="text" id="jbc-s-bt" value="'+(section.style.borderTop||'none')+'" placeholder="2px solid #fff"></div>',
      '  <div class="jbc-prop-field"><label>Border Bottom</label><input type="text" id="jbc-s-bb" value="'+(section.style.borderBottom||'none')+'" placeholder="2px solid #fff"></div>',
      '</div>',
      '<h4>Visibility</h4>',
      '<div class="jbc-prop-group">',
      '  <div class="jbc-prop-field"><label>Min Height</label><input type="text" id="jbc-s-mh" value="'+(section.style.minHeight||cs.minHeight)+'"></div>',
      '  <div class="jbc-prop-field"><label>Overflow</label><select id="jbc-s-overflow"><option value="">auto</option><option value="hidden">hidden</option><option value="visible">visible</option></select></div>',
      '</div>',
      '<h4>Section Order</h4>',
      '<div class="jbc-prop-actions">',
      '  <button data-sa="move-up"><i class="fas fa-arrow-up"></i> Move Up</button>',
      '  <button data-sa="move-down"><i class="fas fa-arrow-down"></i> Move Down</button>',
      '  <button data-sa="hide" class="danger"><i class="fas fa-eye-slash"></i> Hide</button>',
      '</div>'
    ].join('\n');

    /* Wire up section property inputs */
    function secProp(id, prop, transform){
      var input = container.querySelector(id);
      if(!input) return;
      input.addEventListener('change', function(){
        section.style[prop] = transform ? transform(input.value) : input.value;
        markChanged(section);
      });
      if(input.type === 'color') input.addEventListener('input', function(){
        section.style[prop] = input.value;
        markChanged(section);
      });
    }
    secProp('#jbc-s-bg','backgroundColor');
    secProp('#jbc-s-bgimg','backgroundImage', function(v){ return v ? 'url('+v+')' : 'none'; });
    secProp('#jbc-s-pt','paddingTop');
    secProp('#jbc-s-pb','paddingBottom');
    secProp('#jbc-s-pl','paddingLeft');
    secProp('#jbc-s-pr','paddingRight');
    secProp('#jbc-s-bt','borderTop');
    secProp('#jbc-s-bb','borderBottom');
    secProp('#jbc-s-mh','minHeight');
    secProp('#jbc-s-overflow','overflow');

    var bgNone = container.querySelector('#jbc-s-bg-none');
    if(bgNone) bgNone.addEventListener('click', function(){ section.style.backgroundColor = 'transparent'; markChanged(section); });

    /* Section order actions */
    container.querySelectorAll('[data-sa]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var a = btn.getAttribute('data-sa');
        if(a === 'move-up'){
          var prev = section.previousElementSibling;
          if(prev && prev.tagName !== 'NAV'){
            section.parentNode.insertBefore(section, prev);
            markChanged(section);
            showToast('Section moved up');
          }
        }
        if(a === 'move-down'){
          var next = section.nextElementSibling;
          if(next){
            section.parentNode.insertBefore(next, section);
            markChanged(section);
            showToast('Section moved down');
          }
        }
        if(a === 'hide'){
          section.style.display = section.style.display === 'none' ? '' : 'none';
          markChanged(section);
          showToast(section.style.display === 'none' ? 'Section hidden' : 'Section visible');
        }
      });
    });
  }

  /* Section hover highlight */
  document.addEventListener('mouseover', function(e){
    var section = e.target.closest('section') || e.target.closest('.hero') || e.target.closest('footer');
    if(section && section !== selectedSection){
      section.classList.add('jbc-section-hover');
    }
  });
  document.addEventListener('mouseout', function(e){
    var section = e.target.closest('section') || e.target.closest('.hero') || e.target.closest('footer');
    if(section) section.classList.remove('jbc-section-hover');
  });

  /* ---- PAGE SETTINGS ---- */
  function refreshPageSettings(){
    var container = document.getElementById('jbc-page-content');
    if(!container) return;
    var title = document.title || '';
    var metaDesc = '';
    var metaTag = document.querySelector('meta[name="description"]');
    if(metaTag) metaDesc = metaTag.getAttribute('content') || '';

    container.innerHTML = [
      '<h4>SEO & Meta</h4>',
      '<div class="jbc-prop-group full">',
      '  <div class="jbc-prop-field"><label>Page Title</label><input type="text" id="jbc-pg-title" value="'+title.replace(/"/g,'&quot;')+'"></div>',
      '</div>',
      '<div class="jbc-prop-group full">',
      '  <div class="jbc-prop-field"><label>Meta Description</label><textarea id="jbc-pg-desc" style="background:#222;color:#fff;border:1px solid #444;padding:6px;font-family:monospace;font-size:11px;width:100%;box-sizing:border-box;min-height:60px;border-radius:3px;resize:vertical;">'+metaDesc+'</textarea></div>',
      '</div>',
      '<h4>Quick Links</h4>',
      '<div class="jbc-prop-group full">',
      '  <div class="jbc-prop-field"><label>All page links</label><div id="jbc-pg-links" style="font-size:11px;color:#888;"></div></div>',
      '</div>'
    ].join('\n');

    var pgTitle = container.querySelector('#jbc-pg-title');
    var pgDesc = container.querySelector('#jbc-pg-desc');
    if(pgTitle) pgTitle.addEventListener('change', function(){
      document.title = pgTitle.value;
      var titleTag = document.querySelector('title');
      if(titleTag) titleTag.textContent = pgTitle.value;
      changes.text++;
      updateCounter();
      showToast('Title updated');
    });
    if(pgDesc) pgDesc.addEventListener('change', function(){
      var mt = document.querySelector('meta[name="description"]');
      if(mt) mt.setAttribute('content', pgDesc.value);
      else {
        mt = document.createElement('meta');
        mt.setAttribute('name','description');
        mt.setAttribute('content', pgDesc.value);
        document.head.appendChild(mt);
      }
      changes.text++;
      updateCounter();
      showToast('Meta description updated');
    });

    /* List all links on page */
    var linksDiv = container.querySelector('#jbc-pg-links');
    if(linksDiv){
      var links = document.querySelectorAll('a[href]');
      var linkList = [];
      links.forEach(function(a){
        if(a.closest('#jbc-panel,#jbc-toolbar,#jbc-add-menu,#jbc-context-menu')) return;
        var href = a.getAttribute('href');
        if(href && href !== '#' && !href.startsWith('javascript')){
          linkList.push('<div style="margin-bottom:4px;"><a href="'+href+'" target="_blank" style="color:#0af;text-decoration:none;">'+href+'</a></div>');
        }
      });
      linksDiv.innerHTML = linkList.length ? linkList.slice(0,20).join('') : '<span>No links found</span>';
    }
  }

  /* ---- BANNER UPDATE ---- */
  banner.innerHTML = '<span>EDITOR MODE — <strong>Click</strong> text to edit · <strong>Right-click</strong> for layers · <strong>Double-click</strong> section to design · <strong>Panel</strong> ◀ for tools</span>';

  /* ========== LOG ========== */
  console.log('JBC Editor V2 loaded — EDITOR MODE active with side panel, undo/redo, section editing');

})();
