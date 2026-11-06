// Teste de ponta a ponta da API contra um Postgres local: DATABASE_URL=... JWT_SECRET=... node test/smoke.js
const handler = require('../api/index.js');
let cookie = '';
async function call(method, path, body, ck = () => cookie) {
  return new Promise((resolve) => {
    const req = { method, url: '/api/' + path, headers: { 'content-type': 'application/json', cookie: ck() }, body };
    const res = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(d) { resolve({ status: this.statusCode, h: this.h, json: (() => { try { return JSON.parse(d); } catch { return null; } })() }); } };
    handler(req, res);
  });
}
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  let r = await call('GET', 'me'); ok(r.status === 401, 'sem login = 401');
  r = await call('POST', 'auth/signup', { name: 'Maria Helena', username: 'mariahelena', email: 'm@x.com', password: 'senha1234' }); ok(r.status === 200, 'signup');
  cookie = r.h['set-cookie'].split(';')[0];
  const A = cookie;
  r = await call('POST', 'auth/signup', { name: 'Pe Marcelo', username: 'pe.marcelo', email: 'p@x.com', password: 'senha1234' });
  const B = r.h['set-cookie'].split(';')[0];
  r = await call('POST', 'auth/signup', { name: 'X', username: 'mariahelena', email: 'z@x.com', password: 'senha1234' }); ok(r.status === 400 || r.status === 409, 'usuário duplicado recusado');
  r = await call('POST', 'auth/login', { login: 'mariahelena', password: 'errada' }); ok(r.status === 401, 'login errado');
  r = await call('POST', 'posts', { body: 'Missa domingo #MissaDominical #Fé' }); ok(r.status === 200, 'criar post'); const pid = r.json.post.id;
  r = await call('POST', 'posts', { body: 'Peço orações pela minha mãe', kind: 'prayer' }); const prid = r.json.post.id; ok(r.json.post.kind === 'prayer', 'criar pedido de oração');
  cookie = B;
  r = await call('POST', `posts/${prid}/pray`, {}); ok(r.json.on === true, 'rezar');
  r = await call('POST', `posts/${pid}/pray`, {}); ok(r.status === 400, 'não reza em post comum');
  r = await call('POST', `posts/${pid}/like`, {}); ok(r.json.on === true, 'curtir');
  r = await call('POST', `posts/${pid}/repost`, {}); r = await call('POST', `posts/${pid}/save`, {});
  r = await call('POST', `posts/${pid}/comments`, { body: 'Amém!' }); ok(r.status === 200, 'comentar');
  r = await call('POST', 'users/mariahelena/follow', {}); ok(r.json.on === true, 'seguir');
  r = await call('POST', 'messages/mariahelena', { body: 'Paz e bem' }); ok(r.status === 200, 'enviar mensagem');
  r = await call('POST', 'parishes', { name: 'Paróquia São José', city: 'São Pedro' }); ok(r.status === 200, 'criar paróquia');
  cookie = A;
  r = await call('GET', 'me'); ok(r.json.counts.notifications >= 4 && r.json.counts.messages === 1, 'contadores: ' + JSON.stringify(r.json.counts));
  r = await call('GET', 'notifications'); ok(r.json.items.length >= 4, 'notificações listadas');
  r = await call('POST', 'notifications/read', {}); r = await call('GET', 'counts'); ok(r.json.notifications === 0, 'marcar como lidas');
  r = await call('GET', 'feed?tab=foryou'); const fp = r.json.posts.find((p) => p.id === pid); ok(fp && fp.likes === 1 && fp.comments === 1 && fp.reposts === 1 && !fp.liked, 'feed com contagens');
  r = await call('GET', 'feed?tab=following'); ok(r.json.posts.length === 2, 'feed seguindo (os meus)');
  r = await call('GET', 'feed?tab=parish'); ok(r.json.needParish === true, 'aba paróquia sem paróquia');
  r = await call('GET', 'prayers?scope=mine'); ok(r.json.posts.length === 1 && r.json.posts[0].praying === 1, 'pedidos meus com 1 rezando');
  r = await call('GET', 'trending'); ok(r.json.tags.some((t) => t.tag === 'missadominical'), 'hashtags em alta');
  r = await call('GET', 'search?q=%23fé'); ok(r.json.posts.length === 1, 'busca por hashtag');
  r = await call('GET', 'search?q=marcelo'); ok(r.json.users.length === 1, 'busca de pessoas');
  r = await call('GET', 'conversations'); ok(r.json.items.length === 1 && r.json.items[0].unread === 1, 'conversas');
  r = await call('GET', 'messages/pe.marcelo'); ok(r.json.items.length === 1, 'ler conversa');
  r = await call('GET', 'users/pe.marcelo'); ok(r.json.user.followers === 0, 'perfil');
  r = await call('GET', 'users/mariahelena/posts?tab=prayers'); ok(r.json.posts.length === 1, 'aba orações do perfil');
  // segurança
  r = await call('POST', 'me/password', { current: 'errada', next: 'novasenha99' }); ok(r.status === 403, 'trocar senha exige a atual');
  const old = A; await new Promise((s) => setTimeout(s, 1100));
  r = await call('POST', 'me/password', { current: 'senha1234', next: 'novasenha99' }); ok(r.status === 200, 'trocar senha');
  const fresh = r.h['set-cookie'].split(';')[0];
  r = await call('GET', 'me', undefined, () => old); ok(r.status === 401, 'sessão antiga invalidada');
  r = await call('GET', 'me', undefined, () => fresh); ok(r.status === 200, 'sessão nova válida');
  cookie = fresh;
  r = await call('POST', 'me/avatar', { image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' }); ok(r.status === 200 && r.json.avatar_v > 0, 'foto de perfil');
  r = await call('POST', 'me/avatar', { image: 'javascript:alert(1)' }); ok(r.status === 400, 'imagem inválida recusada');
  r = await call('PATCH', 'me', { name: 'Maria H.', bio: 'Católica' }); ok(r.status === 200, 'editar perfil');
  r = await call('DELETE', 'me', { password: 'novasenha99' }); ok(r.status === 200, 'excluir conta');
  r = await call('GET', 'me'); ok(r.status === 401, 'sessão encerrada após excluir');
  console.log(fails ? `\n${fails} falha(s)` : '\ntudo certo'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
