const jwt = require('jsonwebtoken');
const { q } = require('./db');

const COOKIE = 'alba_session';
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET não configurada (mínimo 16 caracteres)');
  return s;
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

// Devolve o usuário logado (ou null). Sessões emitidas antes de "sair de todos os aparelhos"
// ou da troca de senha deixam de valer (tokens_valid_after).
async function currentUser(req) {
  const t = cookies(req)[COOKIE];
  if (!t) return null;
  let d;
  try { d = jwt.verify(t, secret()); } catch { return null; }
  const [u] = await q('SELECT id, email, username, name, bio, avatar_v, parish_id, verified, tokens_valid_after FROM users WHERE id = $1', [d.uid]);
  if (!u) return null;
  if (u.tokens_valid_after && d.iat * 1000 < new Date(u.tokens_valid_after).getTime()) return null;
  return u;
}

module.exports = { setSession, clearSession, currentUser };
