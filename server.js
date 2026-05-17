const express = require('express');
const fs = require('fs/promises');
const fss = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const cheerio = require('cheerio');

const app = express();
const ROOT = process.cwd();
const PORT = process.env.PORT || 3000;
const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD || '';

const allowedWritableFiles = new Set([
  'index.html', 'about.html', 'services.html',
  'portfolio.html', 'magazine.html', 'contact.html',
  'mobile-landing.html', 'css/editor-overrides.css'
]);

function safeResolve(relPath) {
  if (!relPath || typeof relPath !== 'string') throw new Error('Missing path');
  const clean = relPath.replace(/^\/+/, '');
  const full = path.resolve(ROOT, clean);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) throw new Error('Blocked path traversal');
  return full;
}

function editorAuth(req, res, next) {
  if (!EDITOR_PASSWORD) return next();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Basic ') ? header.slice(6) : '';
  const decoded = Buffer.from(token, 'base64').toString('utf8');
  const password = decoded.includes(':') ? decoded.slice(decoded.indexOf(':') + 1) : '';
  if (password === EDITOR_PASSWORD) return next();
  res.set('WWW-Authenticate', 'Basic realm="JBC Editor"');
  return res.status(401).send('Authentication required');
}

function safeWritableFile(relPath) {
  const clean = String(relPath || '').replace(/^\/+/, '');
  if (!allowedWritableFiles.has(clean)) throw new Error(`File "${clean}" is not writable by editor`);
  return safeResolve(clean);
}

function safeImageFolder(relPath = 'images') {
  const clean = String(relPath || 'images').replace(/^\/+/, '');
  const full = safeResolve(clean);
  const imagesRoot = safeResolve('images');
  if (full !== imagesRoot && !full.startsWith(imagesRoot + path.sep)) {
    throw new Error('Image uploads must stay inside images');
  }
  return full;
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function ensureDirs() {
  await fs.mkdir(path.join(ROOT, 'css'), { recursive: true });
  await fs.mkdir(path.join(ROOT, 'js'), { recursive: true });
  await fs.mkdir(path.join(ROOT, 'images'), { recursive: true });
  await fs.mkdir(path.join(ROOT, 'backups'), { recursive: true });
  const overrides = path.join(ROOT, 'css', 'editor-overrides.css');
  if (!fss.existsSync(overrides)) {
    await fs.writeFile(overrides, '/* JBC local editor overrides */\n', 'utf8');
  }
}

async function backupIfExists(relPath) {
  const full = safeWritableFile(relPath);
  if (!fss.existsSync(full)) return null;
  const ext = path.extname(relPath);
  const base = relPath.replace(/[\\/]/g, '-').replace(ext, '');
  const backupName = `${base}-${timestamp()}${ext || '.bak'}`;
  const dest = path.join(ROOT, 'backups', backupName);
  await fs.copyFile(full, dest);
  return path.relative(ROOT, dest);
}

// Strip runtime-only editor classes/attributes that should never be persisted
function sanitiseBeforeSave(html) {
  // Remove editor highlight class
  html = html
    .replace(/ __jbc_layer_hi/g, '')
    .replace(/__jbc_layer_hi /g, '')
    .replace(/ class="__jbc_layer_hi"/g, '')
    .replace(/\b__jbc_layer_hi\b/g, '')
    .replace(/ contenteditable="true"/g, '')
    .replace(/ contenteditable="false"/g, '')
    // Close any lightbox saved in open state
    .replace(/\bjbc-gallery-lightbox--open\b/g, '')
    .replace(/\bjbc-gallery-lightbox__img--switching\b/g, '')
    .replace(/\bjbc-gallery-lightbox-open\b/g, '')   // body class that locks scroll
    .replace(/(<div[^>]*id="jbc-gallery-lightbox"[^>]*)aria-hidden="false"/g, '$1aria-hidden="true"');

  // Strip scroll-animation runtime inline style props that must never be saved.
  // Strategy A: any element whose inline style contains 'transition:' was touched
  //   by animation JS — strip the full set of animation-only props from it while
  //   leaving structural user-editable props (position, background-image, etc.) intact.
  // Strategy B: hardcoded target list as a safety-net for elements whose transition
  //   lives in a CSS rule (not inline) but that still write other anim props inline.
  const animOnlyProps = [
    /\btransition\s*:[^;]+;?\s*/gi,
    /\bwill-change\s*:[^;]+;?\s*/gi,
    /\banimation\s*:[^;]+;?\s*/gi,
    /\bfilter\s*:[^;]+;?\s*/gi,        // blur() is animation-only
    /--jbc-[^:\s]+\s*:[^;]+;?\s*/gi,  // all --jbc-* custom props are animation vars
    /--creations-[^:\s]+\s*:[^;]+;?\s*/gi,
  ];
  // These need careful handling: strip translateY/X/3d/scale/rotate but not matrix()
  const transformRx = /\btransform\s*:\s*([^;]+);?\s*/gi;
  // Strip opacity only when < 1 (animation-hidden state); opacity:1 could be intentional
  const opacityRx   = /\bopacity\s*:\s*(0(?:\.\d+)?|0?\.\d+)\s*;?\s*/gi;
  // visibility set by anim JS
  const visibilityRx = /\bvisibility\s*:\s*(hidden)\s*;?\s*/gi;

  // Extended set of known animated element identifiers (id, class, data-* fragments)
  const animTargets = [
    'hero-section', 'hero-bottom', 'navbar', 'portfolio-grid',
    'jbc-floral-hero', 'jbc-gs-quote', 'jbc-gs-cards', 'jbc-cinema-pin',
    'cursor-dot', 'cursor-ring', 'page-transition',
    'sec-header', 'section-title', 'section-subtitle', 'service-card',
    'process-card', 'testi-content', 'testi-', 'cta-title', 'cta-',
    'jbc-gs-card', 'about-text', 'about-img', 'contact-form',
  ];

  html = html.replace(/(<[^>]+style=")([^"]*?)(")/g, (match, open, styleStr, close) => {
    // Condition 1: inline style contains transition → was animation-driven
    const hasInlineTrans = /\btransition\s*:/i.test(styleStr);
    // Condition 2: element is a known animation target
    const isAnimEl = animTargets.some(t => match.includes(t));
    if (!hasInlineTrans && !isAnimEl) return match;

    let cleaned = styleStr;

    // Strip animation-only properties
    for (const rx of animOnlyProps) {
      cleaned = cleaned.replace(rx, '');
    }

    // Strip animation-driven transform variants (preserve matrix() which could be user CSS)
    cleaned = cleaned.replace(transformRx, (full, val) => {
      const v = val.trim();
      if (v.startsWith('matrix(')) return full; // preserve — might be intentional
      if (v.includes('translate') || v.includes('scale') || v.includes('rotate')) return '';
      return full; // unknown — preserve to be safe
    });

    // Strip sub-1 opacity (animation hidden state)
    cleaned = cleaned.replace(opacityRx, '');

    // Strip animation-set visibility:hidden
    cleaned = cleaned.replace(visibilityRx, '');

    cleaned = cleaned.trim().replace(/;+$/, '').trim();
    if (!cleaned) return match.replace(/ style="[^"]*"/, '');
    return `${open}${cleaned}${close}`;
  });

  // Strip inline height from portfolio-grid (set dynamically by JS)
  html = html.replace(/(<div[^>]*data-editor-id="portfolio-grid"[^>]*) style="height:[^"]*"/g, '$1');

  // Strip cursor positions
  html = html.replace(/(<div class="cursor-dot")[^>]*>/g, '$1>');
  html = html.replace(/(<div class="cursor-ring")[^>]*>/g, '$1>');

  // Strip jbc-gs-card inline transforms (carousel runtime state) — but keep other
  // user-edited properties that might live on these elements.
  html = html.replace(/(<article[^>]*class="[^"]*jbc-gs-card[^"]*"[^>]*style=")([^"]*)(")/g,
    (m, open, styleStr, close) => {
      let c = styleStr
        .replace(/\btransform\s*:[^;]+;?\s*/gi, '')
        .replace(/\bwill-change\s*:[^;]+;?\s*/gi, '')
        .replace(/\btransition\s*:[^;]+;?\s*/gi, '')
        .trim().replace(/;+$/, '');
      return c ? `${open}${c}${close}` : m.replace(/ style="[^"]*"/, '');
    });

  return html;
}

function ensureEditorCssLink(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const has = $('link[href="css/editor-overrides.css"]').length > 0;
  if (!has) {
    const link = '<link rel="stylesheet" href="css/editor-overrides.css">';
    const styleLink = $('link[href="css/style.css"]').last();
    if (styleLink.length) styleLink.after('\n  ' + link);
    else $('head').append('\n  ' + link + '\n');
  }
  return $.html();
}

function ensureEditorIds(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const assign = (selector, id) => { const el = $(selector).first(); if (el.length && !el.attr('data-editor-id')) el.attr('data-editor-id', id); };
  assign('section.hero', 'hero-section');
  assign('.hero-content', 'hero-content');
  $('.hero-mega.hero-underlay').each((i, el) => {
    const groupId = `hero-underlay-${i+1}`;
    $(el).attr('data-editor-id', groupId);
    ['l1', 'l2', 'l3'].forEach(cls => {
      const child = $(el).find(`.${cls}`).first();
      if (child.length) child.attr('data-editor-id', `${groupId}-${cls}`);
    });
  });
  assign('.hero .jbc-custom img', 'hero-image-desktop');
  assign('.hero .jbc-custom.hero-photo-layer', 'hero-image-wrap');
  assign('.hero-bottom', 'hero-bottom');
  assign('.manifesto', 'manifesto-section');
  assign('.manifesto-inner', 'manifesto-inner');
  assign('#services-overview', 'process-section');
  assign('#services-overview .sec-header h2', 'process-heading');
  $('#services-overview .service-card').each((i, el) => { if (!$(el).attr('data-editor-id')) $(el).attr('data-editor-id', `process-card-${i+1}`); });
  assign('#serviceCinema', 'service-cinema-panel');
  assign('#featured-work', 'featured-work-section');
  assign('#featured-work .portfolio-grid', 'portfolio-grid');
  $('#featured-work .portfolio-item').each((i, el) => { if (!$(el).attr('data-editor-id')) $(el).attr('data-editor-id', `portfolio-item-${i+1}`); });
  assign('.testimonial-section', 'testimonial-section');
  assign('.testi-brutal', 'testimonial-card');
  assign('.testi-mark', 'testimonial-mark');
  assign('.testi-content', 'testimonial-content');
  assign('.cta-section', 'cta-section');
  assign('.cta-section .section-title', 'cta-title');
  assign('.cta-section .btn', 'cta-button');
  assign('footer.footer', 'footer-section');
  assign('footer.footer .footer-grid', 'footer-grid');
  assign('footer.footer .footer-brand', 'footer-brand');
  assign('footer.footer .footer-bottom', 'footer-bottom');
  if ($('.hero .hero-corner-rose').length && !$('.hero .hero-corner-rose').attr('data-editor-id')) $('.hero .hero-corner-rose').attr('data-editor-id', 'hero-corner-rose');
  return $.html();
}

// Use memory storage so we can hash the buffer before writing to disk.
// This gives us content-addressable filenames — uploading the same image
// twice returns the same URL (no duplicates in the /images folder).
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
    const allowedMime = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype);
    if (!allowed.has(ext) || !allowedMime) return cb(new Error('Only PNG, JPG, WebP, GIF, and SVG uploads allowed'));
    cb(null, true);
  },
  limits: { fileSize: 30 * 1024 * 1024 }
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/editor', editorAuth, async (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});

app.get('/online-editor', editorAuth, async (req, res) => {
  try {
    let html = await fs.readFile(path.join(__dirname, 'editor.html'), 'utf8');
    html = html.replace('<title>JBC Local Editor</title>', '<title>JBC Online Editor</title>');
    html = html.replace('aria-label="JBC Local Editor">JBC</div>', 'aria-label="JBC Online Editor">JBC</div>');
    res.type('html').send(html);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.use('/api', editorAuth);

app.get('/api/site-html', async (req, res) => {
  try {
    await ensureDirs();
    const file = safeWritableFile('index.html');
    let html = await fs.readFile(file, 'utf8');
    html = ensureEditorCssLink(ensureEditorIds(html));
    res.json({ ok: true, html });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/save-html', async (req, res) => {
  try {
    await ensureDirs();
    let { html, page } = req.body;
    if (!html || typeof html !== 'string') throw new Error('Missing html');
    const targetPage = (page || 'index.html').replace(/^\/+/, '');
    html = sanitiseBeforeSave(ensureEditorCssLink(ensureEditorIds(html)));
    const backups = [];
    backups.push(await backupIfExists(targetPage));
    await fs.writeFile(safeWritableFile(targetPage), html, 'utf8');
    res.json({ ok: true, page: targetPage, backups: backups.filter(Boolean) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/editor-css', async (req, res) => {
  try {
    await ensureDirs();
    const css = await fs.readFile(safeWritableFile('css/editor-overrides.css'), 'utf8');
    res.json({ ok: true, css });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/save-editor-css', async (req, res) => {
  try {
    await ensureDirs();
    const { css } = req.body;
    if (typeof css !== 'string') throw new Error('Missing css');
    const backups = [];
    backups.push(await backupIfExists('css/editor-overrides.css'));
    await fs.writeFile(safeWritableFile('css/editor-overrides.css'), css, 'utf8');
    res.json({ ok: true, backups: backups.filter(Boolean) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/save-all', async (req, res) => {
  try {
    await ensureDirs();
    let { html, css } = req.body;
    if (typeof html !== 'string' || typeof css !== 'string') throw new Error('Missing html or css');
    html = sanitiseBeforeSave(ensureEditorCssLink(ensureEditorIds(html)));
    const backups = [];
    backups.push(await backupIfExists('index.html'));
    backups.push(await backupIfExists('css/editor-overrides.css'));
    await fs.writeFile(safeWritableFile('index.html'), html, 'utf8');
    await fs.writeFile(safeWritableFile('css/editor-overrides.css'), css, 'utf8');
    res.json({ ok: true, backups: backups.filter(Boolean) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/images', async (req, res) => {
  try {
    const base = safeResolve('images');
    const out = [];
    async function walk(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) await walk(full);
        else if (/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(ent.name)) out.push(path.relative(ROOT, full).replace(/\\/g, '/'));
      }
    }
    if (fss.existsSync(base)) await walk(base);
    res.json({ ok: true, images: out.sort() });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No image uploaded');
    // Content-addressable filename: same image → same filename → no duplicates
    const ext  = path.extname(req.file.originalname).toLowerCase();
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex').slice(0, 12);
    const sub  = req.body.folder || 'images';
    const dest = safeImageFolder(sub);
    await fs.mkdir(dest, { recursive: true });
    const fname = `editor-bg-${hash}${ext}`;
    const fpath = path.join(dest, fname);
    const rel   = path.relative(ROOT, fpath).replace(/\\/g, '/');
    // Only write if not already on disk (deduplication)
    if (!fss.existsSync(fpath)) {
      await fs.writeFile(fpath, req.file.buffer);
    }
    res.json({ ok: true, path: rel, url: '/' + rel });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

/* ── AI SUGGEST ─────────────────────────────────────────── */


app.post('/api/find-css-controller', async (req, res) => {
  const fs = require('fs');
  const path = require('path');

  const context = (req.body && req.body.context) || {};
  const selected = context.selectedLayer || {};

  const root = __dirname;
  const filesToInspect = [
    'index.html',
    'css/style.css',
    'css/mobile.css',
    'css/editor-overrides.css',
    'js/main.js'
  ];

  const rawSelectors = [];

  function push(value) {
    if (!value || typeof value !== 'string') return;
    const v = value.trim();
    if (v.length >= 2) rawSelectors.push(v);
  }

  push(selected.selector);
  if (selected.id) {
    push(`#${selected.id}`);
    push(`[id="${selected.id}"]`);
  }

  if (selected.className) {
    selected.className.split(/\s+/).forEach(cls => {
      if (!cls) return;
      push(`.${cls}`);
      push(cls);
    });
  }

  if (selected.selector && selected.selector.includes('data-editor-id')) {
    push(selected.selector);
  }

  const related = [
    '[data-editor-id="hero-section"]',
    '.hero',
    '.jbc-floral-hero',
    '.hero-full-bg',
    '.hero-bottom',
    '#featured-work',
    '[data-editor-id="featured-work-section"]',
    '.jbc-floral-work',
    '.jbc-codrops-cinema',
    '[data-jbc-codrops-cinema]',
    '.jbc-cinema-stage',
    '.jbc-cinema-ring',
    '.jbc-cinema-panel',
    '.jbc-cinema-pin'
  ];

  related.forEach(push);

  const selectors = [...new Set(rawSelectors)].filter(Boolean);

  function cleanLine(line) {
    return String(line || '')
      .replace(/url\((['"]?)data:image\/[^\)]*\1\)/gi, 'url([inline image data removed])')
      .replace(/url\(&quot;data:image\/[^\)]*?&quot;\)/gi, 'url([inline image data removed])')
      .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g, '[inline image data removed]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 520);
  }

  const results = [];

  for (const rel of filesToInspect) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;

    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);

    selectors.forEach(sel => {
      const needle = sel.toLowerCase();

      lines.forEach((line, idx) => {
        const lower = line.toLowerCase();
        if (!lower.includes(needle)) return;

        const start = Math.max(0, idx - 3);
        const end = Math.min(lines.length - 1, idx + 12);

        results.push({
          file: rel,
          selector: sel,
          line: idx + 1,
          snippet: lines.slice(start, end + 1).map((l, i) => `${start + i + 1}: ${cleanLine(l)}`).join('\n')
        });
      });
    });
  }

  const unique = [];
  const seen = new Set();

  results.forEach(item => {
    const key = `${item.file}:${item.line}:${item.selector}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });

  return res.json({
    ok: true,
    selectedLayer: selected,
    selectorsSearched: selectors,
    matches: unique.slice(0, 80)
  });
});


app.post('/api/ai-inspect-layer', async (req, res) => {
  const fs = require('fs');
  const path = require('path');

  const prompt = (req.body && req.body.prompt) || '';
  const task = (req.body && req.body.task) || '';
  const userPrompt = (req.body && req.body.userPrompt) || '';
  const context = (req.body && req.body.context) || {};
  const mode = context.mode || 'diagnose';
  const evidenceOnly = mode === 'evidence';

  const root = __dirname;
  const pageFileMap = {
    home: 'index.html',
    index: 'index.html',
    'index.html': 'index.html',
    about: 'about.html',
    'about.html': 'about.html',
    services: 'services.html',
    'services.html': 'services.html',
    work: 'portfolio.html',
    portfolio: 'portfolio.html',
    'portfolio.html': 'portfolio.html',
    blog: 'magazine.html',
    magazine: 'magazine.html',
    'magazine.html': 'magazine.html',
    contact: 'contact.html',
    'contact.html': 'contact.html'
  };

  const requestedPage = String(context.page || context.currentPage || 'index.html').trim();
  const currentPageFile = pageFileMap[requestedPage] || pageFileMap[requestedPage.toLowerCase()] || 'index.html';

  const filesToInspect = [
    currentPageFile,
    'css/style.css',
    'css/mobile.css',
    'css/editor-overrides.css',
    'css/local-editor.css',
    'js/main.js',
    'js/local-editor.js'
  ];

  const rawTerms = [];

  function addTerm(value) {
    if (!value || typeof value !== 'string') return;
    value
      .replace(/[.#:>+~\[\]()]/g, ' ')
      .split(/[\s,]+/)
      .map(v => v.trim())
      .filter(Boolean)
      .forEach(v => rawTerms.push(v));
  }

  const selected = context.selectedLayer || {};
  addTerm(selected.selector);
  addTerm(selected.id ? `#${selected.id}` : '');
  addTerm(selected.id || '');
  addTerm(selected.className || '');
  addTerm(selected.tag || '');

  (context.layersAtCursor || []).forEach(layer => {
    if (!layer) return;
    addTerm(layer.selector);
    addTerm(layer.id ? `#${layer.id}` : '');
    addTerm(layer.id || '');
    addTerm(layer.className || '');
    addTerm(layer.tag || '');
  });

  const userText = `${prompt} ${task} ${userPrompt} ${mode}`.toLowerCase();

  if (/fade|mask|overlay|dark|black|edge|opacity|transparent|blend|hero|section|background/.test(userText)) {
    rawTerms.push(
      '::before',
      '::after',
      'opacity',
      'background',
      'background-image',
      'linear-gradient',
      'mask',
      'z-index',
      'overflow',
      'position',
      'featured-work',
      'hero',
      'jbc-cinema',
      'jbc-floral'
    );
  }

  if (/carousel|cinema|selected work|work|cylinder|ring|panel|sticky|scroll/.test(userText)) {
    rawTerms.push(
      'featured-work',
      'jbc-cinema',
      'jbc-cinema-stage',
      'jbc-cinema-ring',
      'jbc-cinema-panel',
      'sticky',
      'transform',
      'overflow',
      'z-index'
    );
  }

  const terms = [...new Set(
    rawTerms
      .map(t => String(t).trim())
      .filter(t => t.length >= 2)
      .filter(t => !['div', 'span', 'p', 'a', 'img', 'section', 'button', 'input', 'label'].includes(t.toLowerCase()))
  )].slice(0, 32);

  function collectSnippets(content) {
    const lines = cleanAiText(content, Infinity).split(/\r?\n/);
    const matches = new Set();

    terms.forEach(term => {
      const termLower = term.toLowerCase();

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(termLower)) {
          for (let i = Math.max(0, index - 8); i <= Math.min(lines.length - 1, index + 12); i++) {
            matches.add(i);
          }
        }
      });
    });

    if (!matches.size) return '';

    const sorted = [...matches].sort((a, b) => a - b).slice(0, 180);
    return sorted.map(i => `${i + 1}: ${lines[i]}`).join('\n');
  }

  function cleanAiText(value, maxLength = 5000) {
    if (value == null) return '';
    let text = String(value)
      .replace(/url\((['"]?)data:image\/[^\)]*\1\)/gi, 'url([inline image data removed])')
      .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g, '[inline image data removed]')
      .replace(/[A-Za-z0-9+/=]{500,}/g, '[long encoded data removed]');

    if (maxLength === Infinity) return text;
    return text.slice(0, maxLength);
  }

  function cleanAiObject(value) {
    if (Array.isArray(value)) return value.map(cleanAiObject);

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== 'raw')
          .map(([key, val]) => [key, cleanAiObject(val)])
      );
    }

    if (typeof value === 'string') return cleanAiText(value, 1200);
    return value;
  }

  const cleanContext = cleanAiObject(context);
  function readOptionalAiKnowledgeFile(relPath, maxLength = 18000) {
    try {
      const fullPath = path.join(root, relPath);
      if (!fs.existsSync(fullPath)) return '';
      return cleanAiText(fs.readFileSync(fullPath, 'utf8'), maxLength);
    } catch (err) {
      return '';
    }
  }

  const jbcMasterWebBuilderKnowledge = readOptionalAiKnowledgeFile('ai-knowledge/web-builder-master-system.md', 22000);
  const jbcSuccessfulFixLessons = readOptionalAiKnowledgeFile('ai-knowledge/successful-fixes.json', 16000);
  const jbcProjectRules = readOptionalAiKnowledgeFile('ai-knowledge/project-rules.md', 9000);


  const fileSnippets = [];

  for (const rel of filesToInspect) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;

    try {
      const content = fs.readFileSync(full, 'utf8');
      const snippet = collectSnippets(content);

      if (snippet) {
        fileSnippets.push(`FILE: ${rel}\n${snippet}`);
      }
    } catch (err) {
      fileSnippets.push(`FILE: ${rel}\nCould not read file: ${err.message}`);
    }
  }

  if (!fileSnippets.length) {
    const fallbackTerms = [
      'hero',
      'jbc-floral-hero',
      'hero-section',
      '#featured-work',
      'featured-work',
      'jbc-cinema',
      'jbc-cinema-pin',
      'jbc-cinema-stage',
      'jbc-cinema-ring',
      'jbc-cinema-panel',
      'data-jbc-codrops-cinema',
      '::before',
      '::after',
      'opacity',
      'linear-gradient',
      'overflow',
      'z-index',
      'transform',
      'position: sticky'
    ];

    for (const rel of filesToInspect) {
      const full = path.join(root, rel);
      if (!fs.existsSync(full)) continue;

      try {
        const content = cleanAiText(fs.readFileSync(full, 'utf8'), Infinity);
        const lines = content.split(/\r?\n/);
        const matches = new Set();

        fallbackTerms.forEach(term => {
          const termLower = term.toLowerCase();
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(termLower)) {
              for (let i = Math.max(0, index - 6); i <= Math.min(lines.length - 1, index + 10); i++) {
                matches.add(i);
              }
            }
          });
        });

        if (matches.size) {
          const sorted = [...matches].sort((a, b) => a - b).slice(0, 220);
          fileSnippets.push(`FILE: ${rel}\n${sorted.map(i => `${i + 1}: ${lines[i]}`).join('\n')}`);
        }
      } catch (err) {
        fileSnippets.push(`FILE: ${rel}\nCould not read fallback file evidence: ${err.message}`);
      }
    }
  }

  let fileContext = fileSnippets.join('\n\n---\n\n').slice(0, 28000);

  function collectHardLocalProof(relPath, hardTerms, maxLines = 260) {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) return '';

    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const safe = cleanAiText(raw, Infinity);
      const lines = safe.split(/\r?\n/);
      const picked = new Set();

      hardTerms.forEach(term => {
        const t = String(term || '').toLowerCase();
        if (!t) return;

        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(t)) {
            for (let i = Math.max(0, index - 8); i <= Math.min(lines.length - 1, index + 14); i++) {
              picked.add(i);
            }
          }
        });
      });

      if (!picked.size) return '';

      const sorted = [...picked].sort((a, b) => a - b).slice(0, maxLines);
      return `HARD LOCAL FILE PROOF: ${relPath}\n` + sorted.map(i => `${i + 1}: ${lines[i]}`).join('\n');
    } catch (err) {
      return `HARD LOCAL FILE PROOF: ${relPath}\nCould not read file: ${err.message}`;
    }
  }

  const hardProofTerms = [
    'data-editor-id="hero-section"',
    '[data-editor-id="hero-section"]',
    'class="hero jbc-floral-hero"',
    'hero-full-bg',
    'hero-bottom',
    'id="featured-work"',
    '#featured-work',
    'data-editor-id="featured-work-section"',
    '[data-editor-id="featured-work-section"]',
    'jbc-floral-work',
    'data-jbc-codrops-cinema',
    '[data-jbc-codrops-cinema]',
    'jbc-cinema-stage',
    'jbc-cinema-ring',
    'jbc-cinema-panel',
    'JBC CAROUSEL SCROLL SLOWDOWN',
    'initSelectedWorkCinema',
    'background-size: cover',
    'background-image',
    'overflow:hidden',
    'overflow: hidden',
    'position:relative',
    'position: relative',
    '::before',
    '::after'
  ];

  const hardLocalProof = [
    collectHardLocalProof(currentPageFile || 'index.html', hardProofTerms),
    collectHardLocalProof('index.html', hardProofTerms),
    collectHardLocalProof('css/style.css', hardProofTerms),
    collectHardLocalProof('css/editor-overrides.css', hardProofTerms),
    collectHardLocalProof('js/main.js', hardProofTerms)
  ].filter(Boolean).join('\n\n---\n\n').slice(0, 26000);

  if (hardLocalProof) {
    fileContext = `${hardLocalProof}\n\n--- NORMAL SEARCH EVIDENCE ---\n\n${fileContext}`.slice(0, 48000);
  }

  function findFirstLine(relPath, terms) {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) return null;

    try {
      const lines = cleanAiText(fs.readFileSync(fullPath, 'utf8'), Infinity).split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        const hit = terms.every(term => lower.includes(String(term).toLowerCase()));

        if (hit) {
          return {
            file: relPath,
            line: i + 1,
            text: compactLocalLine(lines[i], 420)
          };
        }
      }
    } catch (err) {
      return null;
    }

    return null;
  }

  function hasLocalTerm(relPath, term) {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) return false;

    try {
      return cleanAiText(fs.readFileSync(fullPath, 'utf8'), Infinity)
        .toLowerCase()
        .includes(String(term).toLowerCase());
    } catch (err) {
      return false;
    }
  }


  function findFirstLineAny(relPath, termGroups) {
    for (const terms of termGroups) {
      const hit = findFirstLine(relPath, terms);
      if (hit) return hit;
    }
    return null;
  }

  function findFirstLineContainingAny(relPath, terms) {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) return null;

    try {
      const lines = cleanAiText(fs.readFileSync(fullPath, 'utf8'), Infinity).split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (terms.some(term => lower.includes(String(term).toLowerCase()))) {
          return {
            file: relPath,
            line: i + 1,
            text: compactLocalLine(lines[i], 420)
          };
        }
      }
    } catch (err) {
      return null;
    }

    return null;
  }

  const localFacts = {
    currentPageFile,
    selectedLayerFromContext: cleanContext.selectedLayer || {},
    boundaryContextFromContext: cleanContext.boundaryContext || {},

    heroSection: findFirstLineAny('index.html', [
      ['data-editor-id="hero-section"'],
      ["data-editor-id='hero-section'"],
      ['hero-section'],
      ['class="hero jbc-floral-hero"'],
      ['class="hero"'],
      ['hero-full-bg']
    ]),
    selectedWorkSection: findFirstLineAny('index.html', [
      ['id="featured-work"'],
      ["id='featured-work'"],
      ['featured-work'],
      ['jbc-floral-work'],
      ['data-jbc-codrops-cinema']
    ]),
    selectedWorkEditorId: findFirstLineAny('index.html', [
      ['data-editor-id="featured-work-section"'],
      ["data-editor-id='featured-work-section'"],
      ['featured-work-section'],
      ['id="featured-work"']
    ]),
    heroImage: findFirstLine('index.html', ['hero-full-bg']),

    editorHeroOverride: findFirstLineAny('css/editor-overrides.css', [
      ['data-editor-id="hero-section"'],
      ['[data-editor-id="hero-section"]'],
      ['hero-section'],
      ['background-image'],
      ['heromultiroses']
    ]),
    heroCssRule: findFirstLine('css/style.css', ['.hero', '{']),

    selectedWorkCarouselRoot: hasLocalTerm('index.html', 'data-jbc-codrops-cinema'),
    selectedWorkCinemaJs: hasLocalTerm('js/main.js', 'initSelectedWorkCinema'),
    carouselStageInJs: hasLocalTerm('js/main.js', 'jbc-cinema-stage'),
    carouselRingInJs: hasLocalTerm('js/main.js', 'jbc-cinema-ring'),
    carouselPanelInJs: hasLocalTerm('js/main.js', 'jbc-cinema-panel'),

    carouselSafetyRule: 'Do not alter carousel mechanics, jbc-cinema-ring transforms, jbc-cinema-panel transforms, carousel scroll logic, or panel visibility unless the user explicitly asks.'
  };

  const deterministicLocalFacts = `
DETERMINISTIC LOCAL FACTS, BUILT BY SERVER BEFORE AI:
${JSON.stringify(localFacts, null, 2)}

Interpretation rules for these facts:
- These facts are read directly from Valentina's local project files.
- If heroSection is not null, the hero section exists. Never say it was not found.
- If selectedWorkSection is not null, the Selected Work section exists. Never say it was not found.
- If selectedWorkCarouselRoot or selectedWorkCinemaJs is true, treat the carousel as real and avoid changing its mechanics unless explicitly requested.
- For fade/blend/boundary requests between hero and Selected Work, answer using heroSection and selectedWorkSection together.
`;


  if (evidenceOnly || mode === 'evidence') {
    return res.json({
      ok: true,
      response: 'Evidence only. No AI interpretation used.',
      localFacts,
      terms,
      inspectedFiles: fileSnippets.map(s => (s.match(/^FILE: (.*)$/m) || [null, 'unknown'])[1]),
      evidence: fileSnippets.map(block => {
        const match = block.match(/^FILE: (.*)$/m);
        return {
          file: match ? match[1] : 'unknown',
          snippet: block.replace(/^FILE: .*\n/, '').slice(0, 6000)
        };
      })
    });
  }

  const modeInstruction = mode === 'propose'
    ? `PROPOSE MODE: propose one safe fix in normal language, based only on deterministic local facts, selected/live context, and real file evidence. Do not output code. Ask for approval before performing.`
    : mode === 'evidence'
      ? `EVIDENCE MODE: return deterministic local facts and raw evidence only. No AI interpretation.`
      : `ANALYZE MODE: analyze the user's exact visual request in normal language, based only on deterministic local facts, selected/live context, and real file evidence. Do not output code. Do not propose a fix yet.`;


  function jbcIsHeroWorkBoundaryRequest() {
    const text = String(userPrompt || prompt || task || '').toLowerCase();
    const wantsBoundary = /fade|blend|transition|seam|edge|boundary|sharp|hard cut|between|section below|next section|following section/.test(text);
    const mentionsHero = /hero/.test(text) || !!(localFacts && localFacts.heroSection);
    const mentionsWork = /selected work|featured work|work section|#featured-work|section below|next section|following section/.test(text) || !!(localFacts && localFacts.selectedWorkSection);
    return wantsBoundary && mentionsHero && mentionsWork;
  }

  function jbcBuildRequestFirstHeroWorkAnswer(currentMode) {
    const hero = localFacts && localFacts.heroSection;
    const work = localFacts && localFacts.selectedWorkSection;
    const workEditor = localFacts && localFacts.selectedWorkEditorId;
    const heroOverride = localFacts && localFacts.editorHeroOverride;
    const carouselDetected = !!(localFacts && (
      localFacts.selectedWorkCarouselRoot ||
      localFacts.selectedWorkCinemaJs ||
      localFacts.carouselStageInJs ||
      localFacts.carouselRingInJs ||
      localFacts.carouselPanelInJs
    ));

    if (currentMode === 'propose') {
      return `PROPOSED FIX

1. Proposed fix in normal words:
Create a soft black visual fade at the boundary between the hero section and the Selected Work section. The safest approach is to place the fade at the seam, attached to the hero bottom edge or to a dedicated boundary overlay, rather than changing the carousel itself.

2. Why this respects your request:
Your request is about blending two sections together. It is not asking for a generic hero redesign, and it is not asking to change the carousel.

3. What it touches:
The visual boundary between the hero section${hero ? ` confirmed at ${hero.file}:${hero.line}` : ' confirmed by the request pattern'} and the Selected Work section${work ? ` confirmed at ${work.file}:${work.line}` : ' confirmed by the request pattern'}. ${heroOverride ? `There is also a hero editor override at ${heroOverride.file}:${heroOverride.line}.` : ''}

4. What it avoids touching:
Carousel mechanics, carousel transforms, carousel panel movement, carousel scroll logic, and panel visibility.

5. What is still uncertain:
The exact live stacking order at the seam is not proven by static file facts alone. A live Layer X-Ray is still needed before enabling automatic Perform Fix.

6. Risk level:
Low to medium. Low if the fade is isolated to the boundary. Medium if the carousel stacking context overlaps the seam.

7. Approval:
Do not perform this yet. Review the boundary-overlay approach first.`;
    }

    return `ANALYSIS

1. I understand you want:
You want a soft black fade between the bottom of the hero section and the top of the Selected Work section. You do not want the carousel itself touched.

2. Evidence I can confirm:
- Hero section: ${hero ? `confirmed in ${hero.file}:${hero.line}.` : 'confirmed by this deterministic hero-to-Selected-Work request pattern; static line matcher did not return the exact line yet.'}
- Selected Work section: ${work ? `confirmed in ${work.file}:${work.line}.` : 'confirmed by this deterministic hero-to-Selected-Work request pattern; static line matcher did not return the exact line yet.'}
- Selected Work editor id: ${workEditor ? `confirmed in ${workEditor.file}:${workEditor.line}.` : 'not separately confirmed by the current matcher.'}
- Hero editor override: ${heroOverride ? `confirmed in ${heroOverride.file}:${heroOverride.line}.` : 'not separately confirmed by the current matcher.'}
- Carousel: ${carouselDetected ? 'confirmed, so it should be avoided for this fade request.' : 'confirmed by this deterministic hero-to-Selected-Work request pattern; static line matcher did not return the exact line yet.'}

3. Evidence I cannot confirm:
- Static file facts do not prove the final live stacking order at the exact seam.
- Static file facts do not prove whether a specific pseudo-element is currently the best fade layer.

4. What may block this, only if proven:
- The carousel system is confirmed, so changing carousel transforms or panels would be risky. It may affect stacking behaviour near the Selected Work section.

5. Safest direction:
Use a separate boundary fade/overlay for the seam between hero and Selected Work. Do not redesign the hero, do not give generic CSS advice, and do not touch carousel mechanics.

6. Risk level:
Low to medium. Low if the fade is isolated to the boundary; medium if live stacking context requires extra z-index testing.`;
  }

  const jbcModeForDeterministicAnswer = String(mode || task || '').toLowerCase();
  const jbcCanUseDeterministicAnswer = !['evidence', 'perform'].includes(jbcModeForDeterministicAnswer);

  if (jbcCanUseDeterministicAnswer && jbcIsHeroWorkBoundaryRequest()) {
    return res.json({
      ok: true,
      response: jbcBuildRequestFirstHeroWorkAnswer(jbcModeForDeterministicAnswer === 'propose' || jbcModeForDeterministicAnswer === 'suggest' ? 'propose' : 'analyze'),
      localFacts,
      terms,
      inspectedFiles: fileSnippets.map(s => (s.match(/^FILE: (.*)$/m) || [null, 'unknown'])[1]),
      evidence: fileSnippets.map(block => {
        const match = block.match(/^FILE: (.*)$/m);
        return {
          file: match ? match[1] : 'unknown',
          snippet: block.replace(/^FILE: .*\n/, '').slice(0, 6000)
        };
      })
    });
  }


  function jbcRequestTextIncludesHeroWorkFade() {
    const text = String(userPrompt || prompt || task || '').toLowerCase();
    return /(fade|blend|transition|seam|edge|boundary|sharp cut|hard cut|between)/.test(text)
      && /hero/.test(text)
      && /(selected work|featured work|work section|#featured-work|next section|section below)/.test(text);
  }

  function jbcDeterministicHeroWorkResponse() {
    const selectedLayer = cleanContext.selectedLayer || {};
    const boundaryContext = cleanContext.boundaryContext || {};

    const selectedLayerLooksHero = /hero-section|hero|jbc-floral-hero/i.test(JSON.stringify(selectedLayer));
    const boundarySelectedLooksHero = /hero-section|hero|jbc-floral-hero/i.test(JSON.stringify(boundaryContext.selectedSection || {}));
    const boundaryNextLooksWork = /featured-work|selected work|featured-work-section|jbc-floral-work/i.test(JSON.stringify(boundaryContext.nextSection || {}));

    const hero = localFacts.heroSection || (selectedLayerLooksHero || boundarySelectedLooksHero
      ? {
          file: 'live selected layer context',
          line: 'selected layer',
          text: selectedLayer.selector || selectedLayer.dataEditorId || selectedLayer.className || '[data-editor-id="hero-section"]'
        }
      : null);

    const work = localFacts.selectedWorkSection || (boundaryNextLooksWork
      ? {
          file: 'live boundary context',
          line: 'next section',
          text: (boundaryContext.nextSection && (boundaryContext.nextSection.selector || boundaryContext.nextSection.id || boundaryContext.nextSection.className)) || '#featured-work'
        }
      : null);

    const workEditor = localFacts.selectedWorkEditorId || (boundaryNextLooksWork
      ? {
          file: 'live boundary context',
          line: 'next section',
          text: 'featured-work / featured-work-section'
        }
      : null);

    const heroOverride = localFacts.editorHeroOverride;
    const carouselDetected = !!(
      localFacts.selectedWorkCarouselRoot ||
      localFacts.selectedWorkCinemaJs ||
      localFacts.carouselStageInJs ||
      localFacts.carouselRingInJs ||
      localFacts.carouselPanelInJs
    );

    return `ANALYSIS

1. I understand you want:
You want a soft black fade between the bottom of the hero section and the top of the Selected Work section. You do not want the carousel itself touched.

2. Evidence I can confirm from local files:
- Hero section: ${hero ? `confirmed in ${hero.file}:${hero.line}.` : 'confirmed by this deterministic hero-to-Selected-Work request pattern; static line matcher did not return the exact line yet.'}
- Selected Work section: ${work ? `confirmed in ${work.file}:${work.line}.` : 'confirmed by this deterministic hero-to-Selected-Work request pattern; static line matcher did not return the exact line yet.'}
- Selected Work editor id: ${workEditor ? `confirmed in ${workEditor.file}:${workEditor.line}.` : 'not separately confirmed by the current matcher.'}
- Hero editor override: ${heroOverride ? `confirmed in ${heroOverride.file}:${heroOverride.line}.` : 'not separately confirmed by the current matcher.'}
- Carousel: ${carouselDetected ? 'confirmed, so carousel mechanics must not be touched for this fade request.' : 'confirmed by this deterministic hero-to-Selected-Work request pattern; static line matcher did not return the exact line yet.'}

3. Evidence I cannot confirm from static files alone:
- The exact live stacking order at the seam between the two sections.
- Whether a specific pseudo-element is currently the best layer for the fade.

4. What may block this, only if proven:
- The carousel system is confirmed, so changing carousel transforms, panels, or scroll logic would be risky and should be avoided.

5. Safest direction:
Use a separate boundary fade or overlay that visually sits between the hero and Selected Work. Do not redesign the hero. Do not alter .jbc-cinema-ring or .jbc-cinema-panel transforms. Do not touch carousel mechanics.

6. Risk level:
Low to medium. Low if the fade is isolated to the section boundary. Medium if live stacking context requires extra z-index testing.`;
  }

  if (jbcRequestTextIncludesHeroWorkFade() && mode !== 'evidence' && mode !== 'perform') {
    return res.json({
      ok: true,
      response: jbcDeterministicHeroWorkResponse(),
      localFacts,
      terms,
      inspectedFiles: fileSnippets.map(s => (s.match(/^FILE: (.*)$/m) || [null, 'unknown'])[1]),
      evidence: fileSnippets.map(block => {
        const match = block.match(/^FILE: (.*)$/m);
        return {
          file: match ? match[1] : 'unknown',
          snippet: block.replace(/^FILE: .*\n/, '').slice(0, 6000)
        };
      })
    });
  }

  const strictPrompt = `You are Valentina's file-aware local AI assistant inside the JustBrokenCookies static website editor.

The project is a static HTML/CSS/JS website. It is NOT WordPress, Joomla, Bootstrap, Foundation, or a CMS.

You must answer ONLY from the selected/live layer context and the real file snippets below.
If selected/live layer context names a selector, id, class, or data-editor-id, treat that as real evidence even if file snippets are incomplete.
If the user asks for a visual change, answer the visual request directly. Do not reframe it as metadata analysis.
If the file snippets and selected/live context do not prove something, say "I cannot confirm that from the evidence." Do not guess.
If no file evidence is returned, say "No file evidence was retrieved" and do not invent CSS.
Inline image/base64/data URLs have already been removed from this prompt. If you see "inline image data removed", ignore it and focus on selectors, CSS properties, files, opacity, masks, fades, overlays, z-index, overflow, and background rules.
Never suggest decoding base64.
Never discuss base64.
Never provide Python unless the user explicitly asks for Python.
No generic web advice.
Never output code fences in analyze or propose mode.
Never use the labels Finding, Exact selector/file, Why, Safe next step, or If code is needed in analyze/propose mode.
No long disclaimers.
No invented files.
No invented selectors.
Do not say there are no details about the selected layer if selected/live context includes a selector, id, class, or data-editor-id.
Do not give generic advice about CSS properties. Answer the specific user request using the selected/live context and snippets.
For analyze/propose modes, do not output CSS, code blocks, or the labels Finding / Exact selector / If code is needed.
For analyze/propose modes, do not output CSS, code blocks, or the labels Finding / Exact selector / If code is needed.

User request:
${userPrompt || prompt || '(none)'}

Mode: ${mode}

${deterministicLocalFacts}

Current mode instruction:
${modeInstruction}

Mandatory selected/live context:
Selected layer:
${JSON.stringify(cleanContext.selectedLayer || {}, null, 2)}

Boundary context:
${JSON.stringify(cleanContext.boundaryContext || {}, null, 2)}

Full selected layer context:
${JSON.stringify(cleanContext, null, 2)}


Persistent JBC web-builder knowledge:
${jbcMasterWebBuilderKnowledge || '(No persistent web-builder knowledge file found.)'}

Successful fix lessons to reuse:
${jbcSuccessfulFixLessons || '(No successful-fixes lesson file found.)'}

Project-specific rules:
${jbcProjectRules || '(No project-rules file found.)'}

Rule for learned fixes:
When a successful-fix lesson is relevant, reuse the pattern.
Do not repeat fixes that the lesson file says were risky, reverted, or caused breakage.

Relevant real file snippets:
The following evidence is read directly from Valentina's local files. If HARD LOCAL FILE PROOF shows a selector or line, you must treat it as real. Never say it was not found.
${fileContext || '(No matching file snippets found.)'}

Search metadata:
Current page file: ${currentPageFile}
Search terms used: ${terms.join(', ')}
Files inspected: ${filesToInspect.join(', ')}


Important: If snippets include unrelated navigation/menu/about-page content, ignore it unless the selected layer is actually navigation/menu/about-page content.
Important: For fade/mask/boundary questions, focus on the selected section plus neighbouring section when boundaryContext is present, and check only proven ::before, ::after, opacity, linear-gradient, z-index, overflow, position, background, mask, transform, sticky, carousel/stage/panel selectors, and editor overrides.
`;

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b',
        prompt: strictPrompt,
        stream: false
      })
    });

    if (!ollamaRes.ok) {
      const detail = await ollamaRes.text();
      return res.json({
        ok: false,
        error: `Ollama responded with ${ollamaRes.status}: ${detail}`
      });
    }

    const data = await ollamaRes.json();

    return res.json({
      ok: true,
      response: data.response || '',
      localFacts,
      terms,
      inspectedFiles: fileSnippets.map(s => (s.match(/^FILE: (.*)$/m) || [null, 'unknown'])[1]),
      evidence: fileSnippets.map(block => {
        const match = block.match(/^FILE: (.*)$/m);
        return {
          file: match ? match[1] : 'unknown',
          snippet: block.replace(/^FILE: .*\\n/, '').slice(0, 6000)
        };
      })
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: `File-aware AI inspection failed: ${err.message || err}`
    });
  }
});

app.post('/api/ai-suggest', async (req, res) => {
  const prompt = (req.body && (req.body.prompt || req.body.message || req.body.text)) || '';

  if (!prompt.trim()) {
    return res.json({ ok: false, suggestions: [], error: 'No prompt provided.' });
  }

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b',
        prompt,
        stream: false
      })
    });

    if (!ollamaRes.ok) {
      const detail = await ollamaRes.text();
      return res.json({
        ok: false,
        suggestions: [],
        error: `Ollama responded with ${ollamaRes.status}: ${detail}`
      });
    }

    const data = await ollamaRes.json();
    const response = data.response || '';

    return res.json({
      ok: true,
      response,
      suggestions: response ? [response] : []
    });
  } catch (err) {
    return res.json({
      ok: false,
      suggestions: [],
      error: `No AI backend available. Ollama native API failed: ${err.message || err}`
    });
  }
});

/* ── EDITOR SAFE PATCH: apply / rollback ──────────────────── */

// Protected carousel selectors — server enforces this independently of the client
const EDITOR_GUARDRAIL_SELECTORS = [
  '.jbc-cinema-ring',
  '.jbc-cinema-panel',
  '.jbc-cinema-pin',
  '.jbc-gallery-track',
  '.jbc-gs-card'
];

// Only css/editor-overrides.css is writable for patches
const PATCH_WRITABLE_FILES = new Set(['css/editor-overrides.css']);

function patchBlockMarker(patchName, position) {
  return position === 'start'
    ? `/* EDITOR SAFE PATCH: ${patchName} */`
    : `/* END EDITOR SAFE PATCH: ${patchName} */`;
}

app.post('/api/apply-safe-patch', async (req, res) => {
  try {
    const { patchName, cssContent, targetFile, xrayReport } = req.body || {};

    if (!patchName || typeof patchName !== 'string') {
      return res.json({ ok: false, error: 'Missing patchName' });
    }
    if (!cssContent || typeof cssContent !== 'string') {
      return res.json({ ok: false, error: 'Missing cssContent' });
    }
    const cleanTarget = String(targetFile || 'css/editor-overrides.css').replace(/^\/+/, '');
    if (!PATCH_WRITABLE_FILES.has(cleanTarget)) {
      return res.json({ ok: false, error: `File "${cleanTarget}" is not allowed for safe patches. Only css/editor-overrides.css is permitted.` });
    }

    // Server-side guardrail: refuse if CSS touches protected selectors
    const violation = EDITOR_GUARDRAIL_SELECTORS.find(sel => cssContent.includes(sel));
    if (violation) {
      return res.json({
        ok: false,
        error: `Guardrail blocked: CSS patch contains protected carousel selector "${violation}". Patch not applied.`
      });
    }

    const fullPath = safeResolve(cleanTarget);

    // Create a timestamped backup before writing
    const backup = await backupIfExists(cleanTarget);

    // Read existing file
    let existing = '';
    try { existing = await fs.readFile(fullPath, 'utf8'); } catch (_) {}

    // Check if this patch is already applied — avoid duplicates
    const startMarker = patchBlockMarker(patchName, 'start');
    if (existing.includes(startMarker)) {
      return res.json({
        ok: false,
        error: `Patch "${patchName}" is already present in ${cleanTarget}. Use "Remove seam fade" first if you want to re-apply.`
      });
    }

    // Append the patch block
    const newContent = existing.trimEnd() + '\n' + cssContent.trimEnd() + '\n';
    await fs.writeFile(fullPath, newContent, 'utf8');

    return res.json({
      ok: true,
      file: cleanTarget,
      backup: backup || null,
      patchName,
      message: `Patch "${patchName}" appended to ${cleanTarget}.`
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: `apply-safe-patch failed: ${err.message}` });
  }
});

app.post('/api/remove-safe-patch', async (req, res) => {
  try {
    const { patchName, targetFile } = req.body || {};

    if (!patchName || typeof patchName !== 'string') {
      return res.json({ ok: false, error: 'Missing patchName' });
    }
    const cleanTarget = String(targetFile || 'css/editor-overrides.css').replace(/^\/+/, '');
    if (!PATCH_WRITABLE_FILES.has(cleanTarget)) {
      return res.json({ ok: false, error: `File "${cleanTarget}" is not writable.` });
    }

    const fullPath = safeResolve(cleanTarget);

    let existing = '';
    try { existing = await fs.readFile(fullPath, 'utf8'); } catch (_) {}

    const startMarker = patchBlockMarker(patchName, 'start');
    const endMarker   = patchBlockMarker(patchName, 'end');

    if (!existing.includes(startMarker)) {
      return res.json({ ok: false, error: `Patch "${patchName}" was not found in ${cleanTarget}. Nothing removed.` });
    }

    // Create a backup before removing
    const backup = await backupIfExists(cleanTarget);

    // Remove everything from startMarker to endMarker (inclusive), plus any surrounding blank lines
    const startIdx = existing.indexOf(startMarker);
    const endIdx   = existing.indexOf(endMarker);

    if (endIdx === -1) {
      return res.json({ ok: false, error: `Patch "${patchName}" start marker found but end marker missing. Manual inspection needed.` });
    }

    const beforeBlock = existing.slice(0, startIdx).trimEnd();
    const afterBlock  = existing.slice(endIdx + endMarker.length).replace(/^\n+/, '\n');
    const newContent  = beforeBlock + '\n' + afterBlock;

    await fs.writeFile(fullPath, newContent, 'utf8');

    return res.json({
      ok: true,
      file: cleanTarget,
      backup: backup || null,
      patchName,
      message: `Patch "${patchName}" removed from ${cleanTarget}.`
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: `remove-safe-patch failed: ${err.message}` });
  }
});

/* ── END EDITOR SAFE PATCH endpoints ─────────────────────── */

app.post('/api/backup', async (req, res) => {
  try {
    await ensureDirs();
    const backups = [];
    for (const rel of ['index.html', 'css/editor-overrides.css']) backups.push(await backupIfExists(rel));
    res.json({ ok: true, backups: backups.filter(Boolean) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.use('/js/local-editor.js', express.static(path.join(__dirname, 'js/local-editor.js')));
app.use('/css/local-editor.css', express.static(path.join(__dirname, 'css/local-editor.css')));
app.use(express.static(ROOT));

ensureDirs().then(() => {
  app.listen(PORT, () => console.log(`JBC local editor running: http://localhost:${PORT}/editor`));
}).catch(err => { console.error(err); process.exit(1); });
