// Testa o painel /admin: ADMIN_USERNAMES=chefe DATABASE_URL=... JWT_SECRET=... node test/admin.js
process.env.ADMIN_USERNAMES = process.env.ADMIN_USERNAMES || 'chefe';
const handler = require('../api/index.js');
async function call(method, path, body, cookie = '') {
  return new Promise((resolve) => {
    const req = { method, url: '/api/' + path, headers: { 'content-type': 'application/json', cookie }, body };
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(d) { resolve({ status: this.statusCode, h: this.h, json: (() => { try { return JSON.parse(d); } catch { return null; } })() }); } };
    handler(req, res);
  });
}
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sfx = Date.now().toString(36);
(async () => {
  const mk = async (u) => { const r = await call('POST', 'auth/signup', { name: u, username: u, email: u + '@x.com', password: 'senha1234' }); return r.h['set-cookie'].split(';')[0]; };
  const chefe = await mk('chefe' + sfx === 'chefe' ? 'chefe' : 'chefe'); // precisa se chamar "chefe"
  const fiel = await mk('fiel' + sfx);
  let r = await call('GET', 'admin/stats', undefined, fiel); ok(r.status === 403, 'usuário comum não acessa /admin');
  r = await call('GET', 'me', undefined, chefe); ok(r.json.user.is_admin === true, 'ADMIN_USERNAMES vira admin');
  r = await call('GET', 'admin/stats', undefined, chefe); ok(r.status === 200 && r.json.users >= 2, 'resumo');
  r = await call('GET', 'admin/users?q=fiel' + sfx, undefined, chefe); const u = r.json.users[0]; ok(u && u.username === 'fiel' + sfx, 'buscar usuário');
  r = await call('PATCH', 'admin/users/' + u.id, { verified: true }, chefe); r = await call('GET', 'users/fiel' + sfx, undefined, fiel); ok(r.json.user.verified === true, 'verificar usuário');
  r = await call('PATCH', 'admin/users/' + u.id, { is_admin: true }, chefe); r = await call('GET', 'admin/stats', undefined, fiel); ok(r.status === 200, 'promover a admin');
  r = await call('PATCH', 'admin/users/' + u.id, { is_admin: false }, chefe);
  r = await call('PATCH', 'admin/users/' + u.id, { banned: true, reason: 'teste' }, chefe); r = await call('GET', 'me', undefined, fiel); ok(r.status === 401, 'suspenso perde a sessão');
  r = await call('POST', 'auth/login', { login: 'fiel' + sfx, password: 'senha1234' }); ok(r.status === 403 && r.json.error === 'banned', 'suspenso não entra');
  r = await call('PATCH', 'admin/users/' + u.id, { banned: false }, chefe); r = await call('POST', 'auth/login', { login: 'fiel' + sfx, password: 'senha1234' }); ok(r.status === 200, 'reativado entra de novo');
  const me = (await call('GET', 'me', undefined, chefe)).json.user;
  r = await call('PATCH', 'admin/users/' + me.id, { banned: true }, chefe); ok(r.status === 400, 'não suspende a si mesmo');
  r = await call('DELETE', 'admin/users/' + me.id, undefined, chefe); ok(r.status === 400, 'não exclui a si mesmo');
  r = await call('POST', 'posts', { body: 'post para moderar' }, chefe); const pid = r.json.post.id;
  r = await call('DELETE', 'admin/posts/' + pid, undefined, chefe); r = await call('GET', 'posts/' + pid, undefined, chefe); ok(r.status === 404, 'apagar post');
  r = await call('DELETE', 'admin/users/' + u.id, undefined, chefe); ok(r.status === 200, 'excluir usuário');
  await call('DELETE', 'me', { password: 'senha1234' }, chefe);
  console.log(fails ? `\n${fails} falha(s)` : '\ntudo certo'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
