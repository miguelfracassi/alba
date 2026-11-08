const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { q, findDb } = require('./db');

const COOKIE = 'alba_session';
const MAX_AGE = 60 * 60 * 24 * 30;

// Usa JWT_SECRET se existir. Sem ela, deriva uma chave secreta da própria URL do banco (que já é secreta),
// assim o site funciona só com o banco conectado. Mesmo assim, definir JWT_SECRET é o recomendado.
function secret() {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  const db = findDb();
  if (!db) throw new Error('JWT_SECRET não configurada (mínimo 16 caracteres)');
  return crypto.createHmac('sha256', 'alba-sessao-v1').update(db.url).digest('hex');
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
const flags = () => `Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'development' ? '' : 'Secure; '}`;

function setSession(res, uid) {
  const token = jwt.sign({ uid }, secret(), { expiresIn: MAX_AGE });
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; ${flags()}Max-Age=${MAX_AGE}`);
}
function clearSession(res) { res.setHeader('Set-Cookie', `${COOKIE}=; ${flags()}Max-Age=0`); }

// Administradores "de nascença": ADMIN_USERNAMES=usuario1,usuario2 (variável de ambiente). Os demais são promovidos em /admin.
const adminNames = () => String(process.env.ADMIN_USERNAMES || '').toLowerCase().split(',').map((x) => x.trim().replace(/^@/, '')).filter(Boolean);

// Devolve o usuário logado (ou null). Sessões emitidas antes de "sair de todos os aparelhos"
// ou da troca de senha deixam de valer (tokens_valid_after).
async function currentUser(req) {
  const t = cookies(req)[COOKIE];
  if (!t) return null;
  let d;
  try { d = jwt.verify(t, secret()); } catch { return null; }
  const [u] = await q('SELECT id, email, username, name, bio, avatar_v, parish_id, verified, is_admin, banned_at, tokens_valid_after FROM users WHERE id = $1', [d.uid]);
  if (!u || u.banned_at) return null;
  u.is_admin = u.is_admin || adminNames().includes(u.username);
  if (u.tokens_valid_after && d.iat * 1000 < new Date(u.tokens_valid_after).getTime()) return null;
  return u;
}

module.exports = { setSession, clearSession, currentUser };
