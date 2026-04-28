const express = require('express');
const fs = require('fs/promises');
const fss = require('fs');
const path = require('path');
const multer = require('multer');
const cheerio = require('cheerio');

const app = express();
const ROOT = process.cwd();
const PORT = process.env.PORT || 3000;

const allowedWritableFiles = new Set(['index.html', 'css/editor-overrides.css']);

function safeResolve(relPath) {
  if (!relPath || typeof relPath !== 'string') throw new Error('Missing path');
  const clean = relPath.replace(/^\/+/, '');
  const full = path.resolve(ROOT, clean);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) throw new Error('Blocked path traversal');
  return full;
}

function safeWritableFile(relPath) {
  const clean = String(relPath || '').replace(/^\/+/, '');
  if (!allowedWritableFiles.has(clean)) throw new Error('File is not writable by editor');
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
  assign('.hero .tag', 'hero-storytelling-tag');
  assign('.hero-content', 'hero-content');
  assign('.hero-mega', 'hero-title-group');
  assign('.hero-mega .l1', 'hero-title-line-1');
  assign('.hero-mega .l2', 'hero-title-line-2');
  assign('.hero-mega .l3', 'hero-title-line-3');
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

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const sub = req.body.folder || 'images';
      try {
        const dest = safeImageFolder(sub);
        await fs.mkdir(dest, { recursive: true });
        cb(null, dest);
      } catch (e) { cb(e); }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
      if (!allowed.has(ext)) return cb(new Error('Unsupported image type'));
      const name = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]+/gi, '-').slice(0, 48);
      cb(null, `${name || 'image'}-${Date.now()}${ext}`);
    }
  }),
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

app.get('/editor', async (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});

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
    let { html } = req.body;
    if (!html || typeof html !== 'string') throw new Error('Missing html');
    html = ensureEditorCssLink(ensureEditorIds(html));
    const backups = [];
    backups.push(await backupIfExists('index.html'));
    await fs.writeFile(safeWritableFile('index.html'), html, 'utf8');
    res.json({ ok: true, backups: backups.filter(Boolean) });
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
    html = ensureEditorCssLink(ensureEditorIds(html));
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

app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) throw new Error('No image uploaded');
    const rel = path.relative(ROOT, req.file.path).replace(/\\/g, '/');
    res.json({ ok: true, path: rel });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

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
