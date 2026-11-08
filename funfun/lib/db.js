// Conexão com o banco (Postgres) via DATABASE_URL e criação automática das tabelas.
const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL não configurada');
    const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: false },
      max: 3, // função serverless: poucas conexões por instância
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
    pool.on('error', () => {});
  }
  return pool;
}

// q('SELECT ... WHERE id = $1', [id]) -> linhas
const q = (text, params = []) => getPool().query(text, params).then((r) => r.rows);

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS parishes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    owner_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar TEXT,
    avatar_v BIGINT NOT NULL DEFAULT 0,
    parish_id INTEGER REFERENCES parishes(id) ON DELETE SET NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    tokens_valid_after TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    image TEXT,
    kind TEXT NOT NULL DEFAULT 'post' CHECK (kind IN ('post','prayer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS posts_user_idx ON posts (user_id, id DESC)`,
  `CREATE INDEX IF NOT EXISTS posts_kind_idx ON posts (kind, id DESC)`,
  `CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
  )`,
  `CREATE INDEX IF NOT EXISTS likes_post_idx ON likes (post_id)`,
  `CREATE TABLE IF NOT EXISTS reposts (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
  )`,
  `CREATE INDEX IF NOT EXISTS reposts_post_idx ON reposts (post_id)`,
  `CREATE TABLE IF NOT EXISTS prayers (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
  )`,
  `CREATE INDEX IF NOT EXISTS prayers_post_idx ON prayers (post_id)`,
  `CREATE TABLE IF NOT EXISTS bookmarks (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id, id)`,
  `CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id)
  )`,
  `CREATE INDEX IF NOT EXISTS follows_followee_idx ON follows (followee_id)`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, id DESC)`,
  `CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages (sender_id, receiver_id, id)`,
  `CREATE INDEX IF NOT EXISTS messages_recv_idx ON messages (receiver_id, read_at)`,
  `CREATE TABLE IF NOT EXISTS rosaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mystery TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS rosaries_user_idx ON rosaries (user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS rosaries_day_idx ON rosaries (created_at)`,
  `CREATE TABLE IF NOT EXISTS candles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intention TEXT NOT NULL DEFAULT '',
    anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS candles_created_idx ON candles (created_at)`,
  `CREATE TABLE IF NOT EXISTS candle_joins (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candle_id INTEGER NOT NULL REFERENCES candles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, candle_id)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    parish_id INTEGER NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    place TEXT NOT NULL DEFAULT '',
    starts_at TIMESTAMPTZ NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS events_idx ON events (parish_id, starts_at)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts (key, created_at)`,
];

let ready;
function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const c = await getPool().connect();
      try {
        await c.query('SELECT pg_advisory_lock(7420001)'); // evita corrida entre instâncias
        for (const s of SCHEMA) await c.query(s);
        await c.query('SELECT pg_advisory_unlock(7420001)');
      } finally { c.release(); }
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

module.exports = { q, ensureSchema };
