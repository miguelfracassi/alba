// Embute public/style.css dentro de cada página .html (assim o visual aparece mesmo se /style.css não carregar).
// Depois de editar o style.css, rode: npm run css
const fs = require('fs'), path = require('path');
const pub = path.join(__dirname, '..', 'public');
const css = fs.readFileSync(path.join(pub, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '\n');
const block = `<style id="alba-css">\n${css}\n</style>`;
for (const f of fs.readdirSync(pub).filter((x) => x.endsWith('.html'))) {
  const p = path.join(pub, f); let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/<style id="alba-css">[\s\S]*?<\/style>/, () => block).replace(/<link rel="stylesheet" href="\/style\.css">/, () => block);
  fs.writeFileSync(p, s);
}
console.log('CSS embutido em', fs.readdirSync(pub).filter((x) => x.endsWith('.html')).length, 'páginas');
