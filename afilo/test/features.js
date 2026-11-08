// Terço, velas e agenda: DATABASE_URL=... JWT_SECRET=... node test/features.js
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
  const mk = async (u) => (await call('POST', 'auth/signup', { name: u, username: u, email: u + '@x.com', password: 'senha1234' })).h['set-cookie'].split(';')[0];
  const A = await mk('ana' + sfx), B = await mk('beto' + sfx);
  let r = await call('GET', 'terco/stats', undefined, A); ok(r.json.streak === 0 && r.json.done_today === false, 'terço: começa zerado');
  r = await call('POST', 'terco/complete', { mystery: 'inventado' }, A); ok(r.status === 400, 'terço: mistério inválido');
  r = await call('POST', 'terco/complete', { mystery: 'gozosos' }, A); ok(r.json.streak === 1 && r.json.total === 1 && r.json.done_today, 'terço: concluir');
  r = await call('POST', 'terco/complete', { mystery: 'gozosos' }, A); ok(r.json.total === 1, 'terço: não duplica em 3 min');
  r = await call('GET', 'terco/stats', undefined, B); ok(r.json.community_today >= 1, 'terço: comunidade hoje');
  r = await call('GET', 'users/ana' + sfx, undefined, B); ok(r.json.user.streak === 1, 'perfil mostra sequência');
  r = await call('POST', 'candles', { intention: 'Pela minha família' }, A); const cid = r.json.id; ok(r.status === 200, 'acender vela');
  await call('POST', 'candles', { anonymous: true, intention: 'em silêncio' }, A); await call('POST', 'candles', {}, A);
  r = await call('POST', 'candles', {}, A); ok(r.status === 429, 'limite de 3 velas');
  r = await call('GET', 'candles', undefined, B); const mine = r.json.candles.filter((c) => c.mine); const anon = r.json.candles.find((c) => c.intention === 'em silêncio');
  ok(r.json.candles.length >= 3 && mine.length === 0 && anon.name === null && anon.username === null, 'mural: anônima não revela autor');
  r = await call('POST', `candles/${cid}/join`, {}, B); ok(r.json.on === true, 'rezar junto');
  r = await call('GET', 'notifications', undefined, A); ok(r.json.items.some((n) => n.type === 'candle'), 'notifica dono da vela');
  r = await call('DELETE', `candles/${cid}`, undefined, B); ok(r.status === 404, 'só o dono apaga a vela');
  r = await call('DELETE', `candles/${cid}`, undefined, A); ok(r.status === 200, 'dono apaga a vela');
  r = await call('GET', 'agenda', undefined, A); ok(r.json.parish === null, 'agenda: sem paróquia');
  r = await call('POST', 'parishes', { name: 'Paróquia Teste ' + sfx, city: 'SP' }, A);
  const when = new Date(Date.now() + 864e5).toISOString();
  r = await call('POST', 'agenda', { title: 'Santa Missa', starts_at: when, place: 'Matriz' }, A); ok(r.status === 200, 'dono cadastra evento');
  const pid = (await call('GET', 'parishes?q=' + sfx, undefined, A)).json.parishes[0].id;
  await call('POST', `parishes/${pid}/join`, {}, B);
  r = await call('POST', 'agenda', { title: 'Evento do Beto', starts_at: when }, B); ok(r.status === 403, 'membro comum não cadastra');
  r = await call('GET', 'agenda', undefined, B); ok(r.json.events.length === 1 && r.json.can_edit === false, 'membro vê agenda');
  r = await call('GET', 'agenda', undefined, A); ok(r.json.can_edit === true, 'dono pode editar');
  r = await call('DELETE', 'agenda/' + r.json.events[0].id, undefined, B); ok(r.status === 403, 'membro não apaga evento');
  r = await call('DELETE', 'agenda/' + (await call('GET', 'agenda', undefined, A)).json.events[0].id, undefined, A); ok(r.status === 200, 'dono apaga evento');
  await call('DELETE', 'me', { password: 'senha1234' }, A); await call('DELETE', 'me', { password: 'senha1234' }, B);
  console.log(fails ? `\n${fails} falha(s)` : '\ntudo certo'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
