// API inteira da Alba em uma função só (Vercel). /api/<rota> chega aqui com ?__p=<rota>.
const bcrypt = require('bcryptjs');
const { q, ensureSchema } = require('../lib/db');
const { setSession, clearSession, currentUser } = require('../lib/auth');

class ApiError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
const fail = (status, code) => { throw new ApiError(status, code); };

const routes = [];
const on = (method, path, fn, auth = true) =>
  routes.push({ method, re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn, auth });

const text = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const validImage = (s, maxBytes = 1_200_000) =>
  typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < maxBytes * 1.37;

/* ---------- consultas reutilizáveis ---------- */
const POST_SELECT = `SELECT p.id, p.body, p.kind, p.created_at, (p.image IS NOT NULL) AS has_image,
  u.username, u.name, u.verified, u.avatar_v,
  (SELECT count(*) FROM likes WHERE post_id = p.id)::int AS likes,
  (SELECT count(*) FROM comments WHERE post_id = p.id)::int AS comments,
  (SELECT count(*) FROM reposts WHERE post_id = p.id)::int AS reposts,
  (SELECT count(*) FROM prayers WHERE post_id = p.id)::int AS praying,
  EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) AS liked,
  EXISTS (SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $1) AS reposted,
  EXISTS (SELECT 1 FROM prayers WHERE post_id = p.id AND user_id = $1) AS i_pray,
  EXISTS (SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $1) AS saved,
  (p.user_id = $1) AS mine
  FROM posts p JOIN users u ON u.id = p.user_id`;
const PAGE = 20;

async function notify(userId, actorId, type, postId = null) {
  if (userId === actorId) return;
  await q('INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES ($1,$2,$3,$4)', [userId, actorId, type, postId]);
}
async function postOwner(id) {
  const [p] = await q('SELECT id, user_id, kind FROM posts WHERE id = $1', [Number(id) || 0]);
  return p || fail(404, 'not_found');
}
const publicUser = (u) => ({ is_admin: !!u.is_admin, id: u.id, username: u.username, name: u.name, bio: u.bio, avatar_v: Number(u.avatar_v), verified: u.verified, parish_id: u.parish_id });

async function counts(uid) {
  const [r] = await q(`SELECT
    (SELECT count(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL)::int AS notifications,
    (SELECT count(*) FROM messages WHERE receiver_id = $1 AND read_at IS NULL)::int AS messages`, [uid]);
  return r;
}

/* ---------- conta ---------- */
const clientKey = (req, extra) => `${(req.headers['x-forwarded-for'] || '').split(',')[0].trim()}|${extra}`;
async function tooManyAttempts(key) {
  const [r] = await q(`SELECT count(*)::int AS n FROM login_attempts WHERE key = $1 AND created_at > now() - interval '15 minutes'`, [key]);
  return r.n >= 8;
}

on('POST', 'auth/signup', async ({ req, res, body }) => {
  const email = text(body.email, 120).toLowerCase();
  const username = text(body.username, 20).toLowerCase().replace(/^@/, '');
  const name = text(body.name, 50);
  const password = String(body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'invalid_email');
  if (!/^[a-z0-9_.]{3,20}$/.test(username)) fail(400, 'invalid_username');
  if (name.length < 2) fail(400, 'invalid_name');
  if (password.length < 8 || password.length > 100) fail(400, 'weak_password');
  const [dup] = await q('SELECT email, username FROM users WHERE email = $1 OR username = $2', [email, username]);
  if (dup) fail(409, dup.username === username ? 'username_taken' : 'email_taken');
  const hash = await bcrypt.hash(password, 11);
  const [u] = await q('INSERT INTO users (email, username, name, password_hash) VALUES ($1,$2,$3,$4) RETURNING id', [email, username, name, hash]);
  setSession(res, u.id);
  return { ok: true };
}, false);

on('POST', 'auth/login', async ({ req, res, body }) => {
  const id = text(body.login, 120).toLowerCase().replace(/^@/, '');
  const key = clientKey(req, id);
  if (await tooManyAttempts(key)) fail(429, 'too_many_attempts');
  const [u] = await q('SELECT id, password_hash, banned_at FROM users WHERE email = $1 OR username = $1', [id]);
  const ok = u && (await bcrypt.compare(String(body.password || ''), u.password_hash));
  if (!ok) {
    await q('INSERT INTO login_attempts (key) VALUES ($1)', [key]);
    await q(`DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'`);
    fail(401, 'invalid_credentials');
  }
  if (u.banned_at) fail(403, 'banned');
  await q('DELETE FROM login_attempts WHERE key = $1', [key]);
  setSession(res, u.id);
  return { ok: true };
}, false);

on('POST', 'auth/logout', async ({ res }) => { clearSession(res); return { ok: true }; }, false);

on('GET', 'me', async ({ me }) => ({ user: { ...publicUser(me), email: me.email }, counts: await counts(me.id) }));

on('PATCH', 'me', async ({ me, body }) => {
  const name = text(body.name, 50), bio = text(body.bio, 160);
  if (name.length < 2) fail(400, 'invalid_name');
  await q('UPDATE users SET name = $1, bio = $2 WHERE id = $3', [name, bio, me.id]);
  return { ok: true };
});

on('POST', 'me/avatar', async ({ me, body }) => {
  if (!validImage(body.image, 400_000)) fail(400, 'invalid_image');
  await q('UPDATE users SET avatar = $1, avatar_v = (extract(epoch from now()) * 1000)::bigint WHERE id = $2', [body.image, me.id]);
  const [u] = await q('SELECT avatar_v FROM users WHERE id = $1', [me.id]);
  return { avatar_v: Number(u.avatar_v) };
});
on('DELETE', 'me/avatar', async ({ me }) => { await q('UPDATE users SET avatar = NULL, avatar_v = 0 WHERE id = $1', [me.id]); return { ok: true }; });

async function requirePassword(me, password) {
  const [u] = await q('SELECT password_hash FROM users WHERE id = $1', [me.id]);
  if (!(await bcrypt.compare(String(password || ''), u.password_hash))) fail(403, 'wrong_password');
}

on('PATCH', 'me/email', async ({ me, body }) => {
  const email = text(body.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'invalid_email');
  await requirePassword(me, body.password);
  const [dup] = await q('SELECT 1 FROM users WHERE email = $1 AND id <> $2', [email, me.id]);
  if (dup) fail(409, 'email_taken');
  await q('UPDATE users SET email = $1 WHERE id = $2', [email, me.id]);
  return { ok: true };
});

// Trocar a senha encerra a sessão de todos os outros aparelhos e mantém este logado.
on('POST', 'me/password', async ({ me, res, body }) => {
  const next = String(body.next || '');
  if (next.length < 8 || next.length > 100) fail(400, 'weak_password');
  await requirePassword(me, body.current);
  await q(`UPDATE users SET password_hash = $1, tokens_valid_after = date_trunc('second', now()) WHERE id = $2`, [await bcrypt.hash(next, 11), me.id]);
  setSession(res, me.id);
  return { ok: true };
});

on('POST', 'me/logout-all', async ({ me, res }) => {
  await q(`UPDATE users SET tokens_valid_after = date_trunc('second', now()) WHERE id = $1`, [me.id]);
  setSession(res, me.id);
  return { ok: true };
});

on('DELETE', 'me', async ({ me, res, body }) => {
  await requirePassword(me, body.password);
  await q('DELETE FROM users WHERE id = $1', [me.id]);
  clearSession(res);
  return { ok: true };
});

/* ---------- imagens (binário) ---------- */
function sendImage(res, dataUrl) {
  const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', m[1]);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(Buffer.from(m[2], 'base64'));
}
on('GET', 'avatar/:username', async ({ res, params }) => {
  const [u] = await q('SELECT avatar FROM users WHERE username = $1', [params.username.toLowerCase()]);
  sendImage(res, u && u.avatar); return null;
}, false);
on('GET', 'post-image/:id', async ({ res, params }) => {
  const [p] = await q('SELECT image FROM posts WHERE id = $1', [Number(params.id) || 0]);
  sendImage(res, p && p.image); return null;
}, false);

/* ---------- posts ---------- */
on('GET', 'feed', async ({ me, query }) => {
  const tab = query.tab || 'foryou';
  const before = Number(query.before) || 2147483647;
  let where = 'p.id < $2', joinParish = false;
  if (tab === 'following') where += ' AND (p.user_id = $1 OR p.user_id IN (SELECT followee_id FROM follows WHERE follower_id = $1))';
  else if (tab === 'parish') {
    if (!me.parish_id) return { posts: [], needParish: true };
    where += ' AND u.parish_id = (SELECT parish_id FROM users WHERE id = $1)';
  }
  const rows = await q(`${POST_SELECT} WHERE ${where} ORDER BY p.id DESC LIMIT ${PAGE + 1}`, [me.id, before]);
  return { posts: rows.slice(0, PAGE), more: rows.length > PAGE };
});

on('GET', 'users/:username/posts', async ({ me, params, query }) => {
  const [u] = await q('SELECT id FROM users WHERE username = $1', [params.username.toLowerCase()]);
  if (!u) fail(404, 'not_found');
  const before = Number(query.before) || 2147483647;
  const tab = query.tab || 'posts';
  const filter = {
    posts: `p.user_id = $3 AND p.kind = 'post'`,
    prayers: `p.user_id = $3 AND p.kind = 'prayer'`,
    reposts: `p.id IN (SELECT post_id FROM reposts WHERE user_id = $3)`,
    likes: `p.id IN (SELECT post_id FROM likes WHERE user_id = $3)`,
  }[tab] || fail(400, 'bad_tab');
  const rows = await q(`${POST_SELECT} WHERE p.id < $2 AND ${filter} ORDER BY p.id DESC LIMIT ${PAGE + 1}`, [me.id, before, u.id]);
  return { posts: rows.slice(0, PAGE), more: rows.length > PAGE };
});

on('POST', 'posts', async ({ me, body }) => {
  const kind = body.kind === 'prayer' ? 'prayer' : 'post';
  const msg = text(body.body, kind === 'prayer' ? 500 : 280);
  if (!msg) fail(400, 'empty');
  if (body.image && !validImage(body.image)) fail(400, 'invalid_image');
  const [p] = await q('INSERT INTO posts (user_id, body, image, kind) VALUES ($1,$2,$3,$4) RETURNING id', [me.id, msg, body.image || null, kind]);
  const [row] = await q(`${POST_SELECT} WHERE p.id = $2`, [me.id, p.id]);
  return { post: row };
});

on('GET', 'posts/:id', async ({ me, params }) => {
  const [row] = await q(`${POST_SELECT} WHERE p.id = $2`, [me.id, Number(params.id) || 0]);
  return row ? { post: row } : fail(404, 'not_found');
});

on('DELETE', 'posts/:id', async ({ me, params }) => {
  const p = await postOwner(params.id);
  if (p.user_id !== me.id) fail(403, 'forbidden');
  await q('DELETE FROM posts WHERE id = $1', [p.id]);
  return { ok: true };
});

// Curtir, republicar, salvar e rezar são "liga/desliga" sobre a mesma tabela.
const toggle = (path, table, notifType) =>
  on('POST', `posts/:id/${path}`, async ({ me, params }) => {
    const p = await postOwner(params.id);
    if (path === 'pray' && p.kind !== 'prayer') fail(400, 'not_prayer');
    const del = await q(`DELETE FROM ${table} WHERE user_id = $1 AND post_id = $2 RETURNING 1`, [me.id, p.id]);
    if (!del.length) {
      await q(`INSERT INTO ${table} (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [me.id, p.id]);
      if (notifType) await notify(p.user_id, me.id, notifType, p.id);
    }
    return { on: !del.length };
  });
toggle('like', 'likes', 'like');
toggle('repost', 'reposts', 'repost');
toggle('save', 'bookmarks', null);
toggle('pray', 'prayers', 'pray');

on('GET', 'posts/:id/comments', async ({ params }) => ({
  comments: await q(`SELECT c.id, c.body, c.created_at, u.username, u.name, u.avatar_v, u.verified FROM comments c
    JOIN users u ON u.id = c.user_id WHERE c.post_id = $1 ORDER BY c.id LIMIT 100`, [Number(params.id) || 0]),
}));
on('POST', 'posts/:id/comments', async ({ me, params, body }) => {
  const p = await postOwner(params.id);
  const msg = text(body.body, 280);
  if (!msg) fail(400, 'empty');
  await q('INSERT INTO comments (post_id, user_id, body) VALUES ($1,$2,$3)', [p.id, me.id, msg]);
  await notify(p.user_id, me.id, 'comment', p.id);
  return { ok: true };
});

on('GET', 'bookmarks', async ({ me, query }) => {
  const before = Number(query.before) || 2147483647;
  const rows = await q(`${POST_SELECT} WHERE p.id < $2 AND p.id IN (SELECT post_id FROM bookmarks WHERE user_id = $1) ORDER BY p.id DESC LIMIT ${PAGE + 1}`, [me.id, before]);
  return { posts: rows.slice(0, PAGE), more: rows.length > PAGE };
});

// Pedidos de oração: "all" (todos), "mine" (os meus) ou "praying" (os que estou rezando).
on('GET', 'prayers', async ({ me, query }) => {
  const before = Number(query.before) || 2147483647;
  const scope = { all: '', mine: 'AND p.user_id = $1', praying: 'AND p.id IN (SELECT post_id FROM prayers WHERE user_id = $1)' }[query.scope || 'all'] ?? '';
  const rows = await q(`${POST_SELECT} WHERE p.kind = 'prayer' AND p.id < $2 ${scope} ORDER BY p.id DESC LIMIT ${PAGE + 1}`, [me.id, before]);
  return { posts: rows.slice(0, PAGE), more: rows.length > PAGE };
});

/* ---------- pessoas ---------- */
on('GET', 'users/:username', async ({ me, params }) => {
  const [u] = await q(`SELECT u.id, u.username, u.name, u.bio, u.avatar_v, u.verified, u.created_at, u.parish_id, pa.name AS parish_name,
    (SELECT count(*) FROM follows WHERE followee_id = u.id)::int AS followers,
    (SELECT count(*) FROM follows WHERE follower_id = u.id)::int AS following,
    (SELECT count(*) FROM posts WHERE user_id = u.id)::int AS posts,
    EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND followee_id = u.id) AS i_follow
    FROM users u LEFT JOIN parishes pa ON pa.id = u.parish_id WHERE u.username = $2`, [me.id, params.username.toLowerCase()]);
  if (!u) fail(404, 'not_found');
  const r = await rosaryStats(u.id);
  return { user: { ...u, avatar_v: Number(u.avatar_v), mine: u.id === me.id, streak: r.streak, rosaries: r.total } };
});
on('POST', 'users/:username/follow', async ({ me, params }) => {
  const [u] = await q('SELECT id FROM users WHERE username = $1', [params.username.toLowerCase()]);
  if (!u) fail(404, 'not_found');
  if (u.id === me.id) fail(400, 'self');
  const del = await q('DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2 RETURNING 1', [me.id, u.id]);
  if (!del.length) {
    await q('INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [me.id, u.id]);
    await notify(u.id, me.id, 'follow');
  }
  return { on: !del.length };
});

on('GET', 'suggestions', async ({ me }) => ({
  users: await q(`SELECT username, name, avatar_v, verified FROM users WHERE id <> $1
    AND id NOT IN (SELECT followee_id FROM follows WHERE follower_id = $1) ORDER BY random() LIMIT 8`, [me.id]),
}));

on('GET', 'trending', async () => ({
  tags: await q(`SELECT lower(m[1]) AS tag, count(*)::int AS n FROM posts p, regexp_matches(p.body, '#([[:alnum:]_]+)', 'g') AS m
    WHERE p.created_at > now() - interval '7 days' GROUP BY 1 ORDER BY n DESC, tag LIMIT 8`),
}));

on('GET', 'search', async ({ me, query }) => {
  const term = text(query.q, 60);
  if (!term) return { users: [], posts: [] };
  const like = '%' + term.replace(/[\\%_]/g, '\\$&') + '%';
  const users = term.startsWith('#') ? [] : await q(`SELECT username, name, bio, avatar_v, verified FROM users
    WHERE username ILIKE $1 OR name ILIKE $1 ORDER BY (username ILIKE $2) DESC, id LIMIT 12`, [like, term.replace(/^@/, '') + '%']);
  const posts = await q(`${POST_SELECT} WHERE p.body ILIKE $2 ORDER BY p.id DESC LIMIT 20`, [me.id, like]);
  return { users, posts };
});

/* ---------- notificações ---------- */
on('GET', 'notifications', async ({ me }) => ({
  items: await q(`SELECT n.id, n.type, n.post_id, n.created_at, (n.read_at IS NULL) AS unread,
    u.username, u.name, u.avatar_v, u.verified, left(p.body, 90) AS snippet
    FROM notifications n JOIN users u ON u.id = n.actor_id LEFT JOIN posts p ON p.id = n.post_id
    WHERE n.user_id = $1 ORDER BY n.id DESC LIMIT 60`, [me.id]),
}));
on('POST', 'notifications/read', async ({ me }) => {
  await q('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [me.id]);
  return { ok: true };
});
on('GET', 'counts', async ({ me }) => counts(me.id));

/* ---------- mensagens ---------- */
on('GET', 'conversations', async ({ me }) => {
  const rows = await q(`WITH m AS (SELECT *, CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other
      FROM messages WHERE sender_id = $1 OR receiver_id = $1)
    SELECT DISTINCT ON (m.other) m.id, m.body, m.created_at, (m.sender_id = $1) AS mine, u.username, u.name, u.avatar_v, u.verified,
      (SELECT count(*) FROM messages x WHERE x.sender_id = m.other AND x.receiver_id = $1 AND x.read_at IS NULL)::int AS unread
    FROM m JOIN users u ON u.id = m.other ORDER BY m.other, m.id DESC`, [me.id]);
  return { items: rows.sort((a, b) => b.id - a.id) };
});
on('GET', 'messages/:username', async ({ me, params, query }) => {
  const [u] = await q('SELECT id, username, name, avatar_v, verified FROM users WHERE username = $1', [params.username.toLowerCase()]);
  if (!u) fail(404, 'not_found');
  await q('UPDATE messages SET read_at = now() WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL', [u.id, me.id]);
  const items = await q(`SELECT id, body, created_at, (sender_id = $1) AS mine FROM messages
    WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND id > $3 ORDER BY id LIMIT 200`, [me.id, u.id, Number(query.after) || 0]);
  return { user: { ...u, avatar_v: Number(u.avatar_v) }, items };
});
on('POST', 'messages/:username', async ({ me, params, body }) => {
  const [u] = await q('SELECT id FROM users WHERE username = $1', [params.username.toLowerCase()]);
  if (!u) fail(404, 'not_found');
  if (u.id === me.id) fail(400, 'self');
  const msg = text(body.body, 1000);
  if (!msg) fail(400, 'empty');
  await q('INSERT INTO messages (sender_id, receiver_id, body) VALUES ($1,$2,$3)', [me.id, u.id, msg]);
  return { ok: true };
});

/* ---------- paróquias ---------- */
on('GET', 'parishes', async ({ me, query }) => {
  const term = text(query.q, 60);
  const rows = await q(`SELECT p.id, p.name, p.city, p.description, (SELECT count(*) FROM users WHERE parish_id = p.id)::int AS members,
    (p.id = (SELECT parish_id FROM users WHERE id = $1)) AS mine FROM parishes p
    WHERE $2 = '' OR p.name ILIKE '%' || $2 || '%' OR p.city ILIKE '%' || $2 || '%' ORDER BY mine DESC, members DESC, p.id DESC LIMIT 50`, [me.id, term]);
  return { parishes: rows };
});
on('POST', 'parishes', async ({ me, body }) => {
  const name = text(body.name, 80), city = text(body.city, 60);
  if (name.length < 3) fail(400, 'invalid_name');
  const [p] = await q('INSERT INTO parishes (name, city, description, owner_id) VALUES ($1,$2,$3,$4) RETURNING id', [name, city, text(body.description, 240), me.id]);
  await q('UPDATE users SET parish_id = $1 WHERE id = $2', [p.id, me.id]);
  return { id: p.id };
});
on('POST', 'parishes/leave', async ({ me }) => { await q('UPDATE users SET parish_id = NULL WHERE id = $1', [me.id]); return { ok: true }; });
on('POST', 'parishes/:id/join', async ({ me, params }) => {
  const [p] = await q('SELECT id FROM parishes WHERE id = $1', [Number(params.id) || 0]);
  if (!p) fail(404, 'not_found');
  await q('UPDATE users SET parish_id = $1 WHERE id = $2', [p.id, me.id]);
  return { ok: true };
});

/* ---------- terço, velas e agenda ---------- */
const MYSTERIES = ['gozosos', 'luminosos', 'dolorosos', 'gloriosos'];
const TZ = `'America/Sao_Paulo'`;

// Dias seguidos rezando o terço (fuso de Brasília). Conta se rezou hoje ou ontem.
async function rosaryStats(uid) {
  const days = await q(`SELECT DISTINCT to_char((created_at AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') AS d FROM rosaries
    WHERE user_id = $1 AND created_at > now() - interval '500 days' ORDER BY d DESC`, [uid]);
  const [{ today }] = await q(`SELECT to_char((now() AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') AS today`);
  const set = new Set(days.map((r) => r.d));
  const shift = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  let cur = set.has(today) ? today : set.has(shift(today, -1)) ? shift(today, -1) : null, streak = 0;
  while (cur && set.has(cur)) { streak++; cur = shift(cur, -1); }
  const [t] = await q('SELECT count(*)::int AS total FROM rosaries WHERE user_id = $1', [uid]);
  return { streak, total: t.total, done_today: set.has(today) };
}
const rosaryCommunity = async () => (await q(`SELECT count(DISTINCT user_id)::int AS n FROM rosaries
  WHERE (created_at AT TIME ZONE ${TZ})::date = (now() AT TIME ZONE ${TZ})::date`))[0].n;

on('GET', 'terco/stats', async ({ me }) => ({ ...(await rosaryStats(me.id)), community_today: await rosaryCommunity() }));
on('POST', 'terco/complete', async ({ me, body }) => {
  if (!MYSTERIES.includes(body.mystery)) fail(400, 'bad_mystery');
  const [last] = await q(`SELECT 1 FROM rosaries WHERE user_id = $1 AND created_at > now() - interval '3 minutes'`, [me.id]);
  if (!last) await q('INSERT INTO rosaries (user_id, mystery) VALUES ($1,$2)', [me.id, body.mystery]);
  return { ...(await rosaryStats(me.id)), community_today: await rosaryCommunity() };
});

// Velas: ficam acesas por 24 horas. Cada pessoa pode ter até 3 acesas.
on('GET', 'candles', async ({ me }) => ({
  candles: await q(`SELECT c.id, c.intention, c.created_at, (c.user_id = $1) AS mine,
    CASE WHEN c.anonymous THEN NULL ELSE u.name END AS name, CASE WHEN c.anonymous THEN NULL ELSE u.username END AS username,
    (SELECT count(*) FROM candle_joins WHERE candle_id = c.id)::int AS joins,
    EXISTS (SELECT 1 FROM candle_joins WHERE candle_id = c.id AND user_id = $1) AS joined
    FROM candles c JOIN users u ON u.id = c.user_id WHERE c.created_at > now() - interval '24 hours' ORDER BY c.id DESC LIMIT 90`, [me.id]),
}));
on('POST', 'candles', async ({ me, body }) => {
  const [n] = await q(`SELECT count(*)::int AS n FROM candles WHERE user_id = $1 AND created_at > now() - interval '24 hours'`, [me.id]);
  if (n.n >= 3) fail(429, 'too_many_candles');
  const [c] = await q('INSERT INTO candles (user_id, intention, anonymous) VALUES ($1,$2,$3) RETURNING id', [me.id, text(body.intention, 140), !!body.anonymous]);
  return { id: c.id };
});
on('POST', 'candles/:id/join', async ({ me, params }) => {
  const [c] = await q(`SELECT id, user_id FROM candles WHERE id = $1 AND created_at > now() - interval '24 hours'`, [Number(params.id) || 0]);
  if (!c) fail(404, 'not_found');
  const del = await q('DELETE FROM candle_joins WHERE user_id = $1 AND candle_id = $2 RETURNING 1', [me.id, c.id]);
  if (!del.length) { await q('INSERT INTO candle_joins (user_id, candle_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [me.id, c.id]); await notify(c.user_id, me.id, 'candle'); }
  return { on: !del.length };
});
on('DELETE', 'candles/:id', async ({ me, params }) => {
  const r = await q('DELETE FROM candles WHERE id = $1 AND user_id = $2 RETURNING 1', [Number(params.id) || 0, me.id]);
  return r.length ? { ok: true } : fail(404, 'not_found');
});

// Agenda da paróquia: quem criou a paróquia (ou um admin do site) cadastra os eventos.
on('GET', 'agenda', async ({ me }) => {
  const [u] = await q(`SELECT p.id, p.name, p.owner_id FROM users u JOIN parishes p ON p.id = u.parish_id WHERE u.id = $1`, [me.id]);
  if (!u) return { parish: null, events: [], can_edit: false };
  const events = await q(`SELECT id, title, place, starts_at FROM events WHERE parish_id = $1 AND starts_at > now() - interval '2 hours' ORDER BY starts_at LIMIT 30`, [u.id]);
  return { parish: { id: u.id, name: u.name }, events, can_edit: u.owner_id === me.id || !!me.is_admin };
});
on('POST', 'agenda', async ({ me, body }) => {
  const [u] = await q(`SELECT p.id, p.owner_id FROM users u JOIN parishes p ON p.id = u.parish_id WHERE u.id = $1`, [me.id]);
  if (!u) fail(400, 'no_parish');
  if (u.owner_id !== me.id && !me.is_admin) fail(403, 'forbidden');
  const title = text(body.title, 80), when = new Date(body.starts_at);
  if (title.length < 3 || isNaN(when)) fail(400, 'invalid_event');
  await q('INSERT INTO events (parish_id, title, place, starts_at, created_by) VALUES ($1,$2,$3,$4,$5)', [u.id, title, text(body.place, 80), when.toISOString(), me.id]);
  return { ok: true };
});
on('DELETE', 'agenda/:id', async ({ me, params }) => {
  const [e] = await q(`SELECT e.id, p.owner_id FROM events e JOIN parishes p ON p.id = e.parish_id WHERE e.id = $1`, [Number(params.id) || 0]);
  if (!e) fail(404, 'not_found');
  if (e.owner_id !== me.id && !me.is_admin) fail(403, 'forbidden');
  await q('DELETE FROM events WHERE id = $1', [e.id]);
  return { ok: true };
});

/* ---------- administração (/admin) ---------- */
const onAdmin = (method, path, fn) => on(method, path, (ctx) => (ctx.me.is_admin ? fn(ctx) : fail(403, 'forbidden')));

onAdmin('GET', 'admin/stats', async () => {
  const [r] = await q(`SELECT
    (SELECT count(*) FROM users)::int AS users, (SELECT count(*) FROM users WHERE created_at > now() - interval '1 day')::int AS users_today,
    (SELECT count(*) FROM users WHERE verified)::int AS verified, (SELECT count(*) FROM users WHERE banned_at IS NOT NULL)::int AS banned,
    (SELECT count(*) FROM posts WHERE kind = 'post')::int AS posts, (SELECT count(*) FROM posts WHERE kind = 'prayer')::int AS prayer_requests,
    (SELECT count(*) FROM prayers)::int AS prayers, (SELECT count(*) FROM comments)::int AS comments,
    (SELECT count(*) FROM parishes)::int AS parishes, (SELECT count(*) FROM messages)::int AS messages,
    (SELECT count(*) FROM rosaries)::int AS rosaries, (SELECT count(*) FROM candles)::int AS candles`);
  return r;
});

onAdmin('GET', 'admin/users', async ({ query }) => {
  const term = text(query.q, 60), before = Number(query.before) || 2147483647;
  const rows = await q(`SELECT u.id, u.username, u.name, u.email, u.verified, u.is_admin, u.banned_at, u.ban_reason, u.avatar_v, u.created_at,
    (SELECT count(*) FROM posts WHERE user_id = u.id)::int AS posts FROM users u
    WHERE u.id < $1 AND ($2 = '' OR u.username ILIKE '%' || $2 || '%' OR u.name ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%')
    ORDER BY u.id DESC LIMIT 31`, [before, term.replace(/[\\%_]/g, '')]);
  return { users: rows.slice(0, 30).map((u) => ({ ...u, avatar_v: Number(u.avatar_v) })), more: rows.length > 30 };
});

// Verificar, suspender e promover contas.
onAdmin('PATCH', 'admin/users/:id', async ({ me, params, body }) => {
  const id = Number(params.id) || 0;
  const [u] = await q('SELECT id FROM users WHERE id = $1', [id]);
  if (!u) fail(404, 'not_found');
  if (typeof body.verified === 'boolean') await q('UPDATE users SET verified = $1 WHERE id = $2', [body.verified, id]);
  if (typeof body.is_admin === 'boolean') {
    if (id === me.id) fail(400, 'self');
    await q('UPDATE users SET is_admin = $1 WHERE id = $2', [body.is_admin, id]);
  }
  if (typeof body.banned === 'boolean') {
    if (id === me.id) fail(400, 'self');
    if (body.banned) await q(`UPDATE users SET banned_at = now(), ban_reason = $1, tokens_valid_after = now() WHERE id = $2`, [text(body.reason, 200), id]);
    else await q(`UPDATE users SET banned_at = NULL, ban_reason = '' WHERE id = $1`, [id]);
  }
  return { ok: true };
});
onAdmin('DELETE', 'admin/users/:id', async ({ me, params }) => {
  const id = Number(params.id) || 0;
  if (id === me.id) fail(400, 'self');
  await q('DELETE FROM users WHERE id = $1', [id]);
  return { ok: true };
});

onAdmin('GET', 'admin/posts', async ({ me, query }) => {
  const before = Number(query.before) || 2147483647;
  const rows = await q(`${POST_SELECT} WHERE p.id < $2 ORDER BY p.id DESC LIMIT ${PAGE + 1}`, [me.id, before]);
  return { posts: rows.slice(0, PAGE), more: rows.length > PAGE };
});
onAdmin('DELETE', 'admin/posts/:id', async ({ params }) => { await q('DELETE FROM posts WHERE id = $1', [Number(params.id) || 0]); return { ok: true }; });

onAdmin('GET', 'admin/parishes', async () => ({
  parishes: await q(`SELECT p.id, p.name, p.city, p.created_at, (SELECT count(*) FROM users WHERE parish_id = p.id)::int AS members FROM parishes p ORDER BY p.id DESC LIMIT 100`),
}));
onAdmin('DELETE', 'admin/parishes/:id', async ({ params }) => { await q('DELETE FROM parishes WHERE id = $1', [Number(params.id) || 0]); return { ok: true }; });

on('GET', 'health', async () => ({ ok: true }), false);

/* ---------- entrada ---------- */
module.exports = async (req, res) => {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
  try {
    const url = new URL(req.url, 'http://x');
    const path = (url.searchParams.get('__p') ?? url.pathname.replace(/^\/api\//, '')).replace(/^\/+|\/+$/g, '');
    const query = Object.fromEntries(url.searchParams); delete query.__p;
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    if (method !== 'GET' && !String(req.headers['content-type'] || '').includes('application/json')) return send(415, { error: 'json_only' }); // proteção extra contra CSRF
    let route, params;
    for (const r of routes) { const m = r.method === method && r.re.exec(path); if (m) { route = r; params = { ...m.groups }; for (const k in params) params[k] = decodeURIComponent(params[k]); break; } }
    if (!route) return send(404, { error: 'not_found' });
    await ensureSchema();
    const me = await currentUser(req);
    if (route.auth && !me) return send(401, { error: 'unauthorized' });
    const out = await route.fn({ req, res, me, params, query, body: (req.body && typeof req.body === 'object') ? req.body : {} });
    if (out !== null) send(200, out);
  } catch (e) {
    if (e instanceof ApiError) return send(e.status, { error: e.code });
    console.error(e);
    send(500, { error: /DATABASE_URL/.test(e.message) ? 'config_db' : /JWT_SECRET/.test(e.message) ? 'config_jwt' : 'server_error' });
  }
};
