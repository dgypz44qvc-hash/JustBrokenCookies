/* ============================================
   JBC Local Editor Server
   Run:  node server.js
   Then: http://localhost:3000/index.html?edit
   ============================================ */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
  '.gif':'image/gif','.svg':'image/svg+xml','.webp':'image/webp',
  '.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2',
  '.ttf':'font/ttf','.json':'application/json'
};

const server = http.createServer((req, res) => {

  /* ---- CORS headers for local dev ---- */
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method === 'OPTIONS'){ res.writeHead(204); res.end(); return; }

  /* =========== SAVE HTML ENDPOINT =========== */
  if(req.method === 'POST' && req.url === '/editor-save'){
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const filename = path.basename(data.filename || 'index.html');

        /* Security: only allow saving .html files inside ROOT */
        const subdir = data.subdir ? path.normalize(data.subdir).replace(/^(\.\.[\/\\])+/,'') : '';
        const savePath = path.join(ROOT, subdir, filename);
        if(!savePath.startsWith(ROOT)){
          res.writeHead(403,{'Content-Type':'application/json'});
          res.end(JSON.stringify({ok:false, error:'Path outside project'}));
          return;
        }

        /* Ensure directory exists */
        fs.mkdirSync(path.dirname(savePath), {recursive:true});
        fs.writeFileSync(savePath, data.html, 'utf8');

        console.log('✅ Saved: ' + savePath);
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:true, file:subdir+'/'+filename}));
      } catch(e){
        console.error('Save error:', e.message);
        res.writeHead(500,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:false, error:e.message}));
      }
    });
    return;
  }

  /* =========== SAVE IMAGE ENDPOINT =========== */
  if(req.method === 'POST' && req.url === '/editor-save-image'){
    let chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        const data = JSON.parse(body);
        const imgPath = path.normalize(data.path || '').replace(/^(\.\.[\/\\])+/,'');
        const savePath = path.join(ROOT, imgPath);

        if(!savePath.startsWith(ROOT)){
          res.writeHead(403,{'Content-Type':'application/json'});
          res.end(JSON.stringify({ok:false, error:'Path outside project'}));
          return;
        }

        /* Strip base64 header and write binary */
        const base64Data = data.base64.replace(/^data:image\/\w+;base64,/, '');
        fs.mkdirSync(path.dirname(savePath), {recursive:true});
        fs.writeFileSync(savePath, Buffer.from(base64Data, 'base64'));

        console.log('✅ Saved image: ' + savePath + ' (' + Math.round(Buffer.from(base64Data,'base64').length/1024) + 'KB)');
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:true, file:imgPath}));
      } catch(e){
        console.error('Image save error:', e.message);
        res.writeHead(500,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:false, error:e.message}));
      }
    });
    return;
  }

  /* =========== STATIC FILE SERVING =========== */
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if(urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);

  if(!filePath.startsWith(ROOT)){
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, content) => {
    if(err){
      if(err.code === 'ENOENT'){ res.writeHead(404); res.end('Not found: ' + urlPath); }
      else { res.writeHead(500); res.end('Server error'); }
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │  JBC Editor Server running!              │');
  console.log('  │                                          │');
  console.log('  │  Site:   http://localhost:'+PORT+'/          │');
  console.log('  │  Editor: http://localhost:'+PORT+'/?edit     │');
  console.log('  │                                          │');
  console.log('  │  Changes save directly to your files.    │');
  console.log('  │  Then just git add, commit, push.        │');
  console.log('  │  Press Ctrl+C to stop.                   │');
  console.log('  └─────────────────────────────────────────┘');
  console.log('');
});
