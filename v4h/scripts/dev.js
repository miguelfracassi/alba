// Servidor local sem precisar da Vercel: node scripts/dev.js  (ou: npm run dev) -> http://localhost:3000
const http = require('http'), fs = require('fs'), path = require('path');
for (const f of ['.env.local', '.env']) { // lê variáveis do arquivo .env.local
  try { fs.readFileSync(path.join(__dirname, '..', f), 'utf8').split('\n').forEach((l) => { const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }); } catch { /* sem arquivo */ }
}
const api = require('../api/index.js');
const PUB = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const REWRITES = [[/^\/perfil\/[^/]+$/, '/perfil.html'], [/^\/mensagens\/[^/]+$/, '/mensagens.html'], [/^\/post\/[^/]+$/, '/post.html']];

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try { req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}; } catch { req.body = {}; }
      req.url = '/api/index?__p=' + encodeURIComponent(url.pathname.slice(5)) + (url.search ? '&' + url.search.slice(1) : '');
      api(req, res);
    });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  for (const [re, to] of REWRITES) if (re.test(p)) p = to;
  if (p === '/') p = '/index.html';
  let file = path.join(PUB, p);
  if (!file.startsWith(PUB)) { res.statusCode = 403; return res.end(); }
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html'; // /login -> login.html
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; file = path.join(PUB, '404.html'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('Alba em http://localhost:' + (process.env.PORT || 3000)));
