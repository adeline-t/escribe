const encoder = new TextEncoder();

const PASSWORD_MIN_LENGTH = 12;
const PBKDF2_ITERATIONS = 310000;
const HASH_ALGO = "SHA-256";

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0)).buffer;
}

async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO
    },
    key,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(bits)}`;
}

async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const [algo, iterStr, saltB64, hashB64] = stored.split("$");
  if (algo !== "pbkdf2") return false;
  const iterations = Number(iterStr);
  if (!iterations || !saltB64 || !hashB64) return false;

  const salt = new Uint8Array(fromBase64(saltB64));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: HASH_ALGO
    },
    key,
    256
  );
  const computed = toBase64(bits);
  return computed === hashB64;
}

function validatePassword(password) {
  if (typeof password !== "string") return "Mot de passe invalide.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Mot de passe trop court (min ${PASSWORD_MIN_LENGTH} caractères).`;
  }
  return null;
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

async function ensureAuthSchema(env) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      force_reset INTEGER NOT NULL DEFAULT 0,
      first_name TEXT,
      last_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`
  ];
  await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));

  const columns = await env.DB.prepare("PRAGMA table_info(users)").all();
  const names = new Set((columns?.results ?? []).map((row) => row.name));
  if (!names.has("first_name")) {
    await env.DB.exec("ALTER TABLE users ADD COLUMN first_name TEXT;");
  }
  if (!names.has("last_name")) {
    await env.DB.exec("ALTER TABLE users ADD COLUMN last_name TEXT;");
  }
}

function getSessionTtlDays(env) {
  if (env.ENVIRONMENT === "development") return 1;
  return 30;
}

async function ensureSuperAdmin(env) {
  await ensureAuthSchema(env);
  const email = normalizeEmail(env.SUPERADMIN_EMAIL || "admin@escribe.local");
  if (!email) return;
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?1").bind(email).first();
  if (existing?.id) return;
  const passwordHash = await hashPassword("escrime");
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (email, password_hash, role, force_reset, created_at, updated_at)
     VALUES (?1, ?2, 'superadmin', 1, ?3, ?3)`
  )
    .bind(email, passwordHash, now)
    .run();
}

async function createSession(env, userId) {
  await ensureAuthSchema(env);
  const token = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + getSessionTtlDays(env) * 24 * 60 * 60 * 1000);
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(token, userId, token, expires.toISOString(), now.toISOString())
    .run();
  return { token, expiresAt: expires.toISOString() };
}

async function getSession(env, token) {
  await ensureAuthSchema(env);
  const row = await env.DB.prepare(
    `SELECT sessions.token, sessions.expires_at, users.id, users.email, users.role, users.force_reset,
            users.first_name, users.last_name
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?1`
  )
    .bind(token)
    .first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?1").bind(token).run();
    return null;
  }
  return {
    token: row.token,
    user: {
      id: row.id,
      email: row.email,
      role: row.role,
      forceReset: Boolean(row.force_reset),
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? ""
    }
  };
}

function extractToken(request) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function requireAuth(request, env) {
  await ensureSuperAdmin(env);
  const token = extractToken(request);
  if (!token) return null;
  const session = await getSession(env, token);
  return session;
}

export function requireRole(session, roles) {
  if (!session) return false;
  return roles.includes(session.user.role);
}

export async function registerUser(env, email, password) {
  await ensureSuperAdmin(env);
  const normalized = normalizeEmail(email);
  if (!normalized) return { error: "invalid_email" };
  const passError = validatePassword(password);
  if (passError) return { error: "weak_password", message: passError };
  const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?1").bind(normalized).first();
  if (exists?.id) return { error: "email_exists" };
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    `INSERT INTO users (email, password_hash, role, force_reset, created_at, updated_at)
     VALUES (?1, ?2, 'user', 0, ?3, ?3) RETURNING id, email, role, force_reset`
  )
    .bind(normalized, passwordHash, now)
    .first();
  return { ok: true, user: row };
}

export async function loginUser(env, email, password) {
  await ensureSuperAdmin(env);
  const normalized = normalizeEmail(email);
  if (!normalized) return { error: "invalid_email" };
  const row = await env.DB.prepare("SELECT id, password_hash, role, force_reset, first_name, last_name FROM users WHERE email = ?1")
    .bind(normalized)
    .first();
  if (!row) return { error: "invalid_credentials" };
  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return { error: "invalid_credentials" };
  const session = await createSession(env, row.id);
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: row.id,
      email: normalized,
      role: row.role,
      forceReset: Boolean(row.force_reset),
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? ""
    }
  };
}

export async function updateProfile(env, userId, firstName, lastName) {
  await ensureAuthSchema(env);
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE users SET first_name = ?1, last_name = ?2, updated_at = ?3 WHERE id = ?4"
  )
    .bind(firstName || null, lastName || null, now, userId)
    .run();
  return { ok: true };
}

export async function changePassword(env, userId, currentPassword, newPassword, forceReset) {
  await ensureAuthSchema(env);
  const row = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?1")
    .bind(userId)
    .first();
  if (!row) return { error: "not_found" };
  if (!forceReset) {
    const valid = await verifyPassword(currentPassword, row.password_hash);
    if (!valid) return { error: "invalid_credentials" };
  }
  const passError = validatePassword(newPassword);
  if (passError) return { error: "weak_password", message: passError };
  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE users SET password_hash = ?1, force_reset = 0, updated_at = ?2 WHERE id = ?3"
  )
    .bind(passwordHash, now, userId)
    .run();
  return { ok: true };
}

export async function logout(env, token) {
  await ensureAuthSchema(env);
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?1").bind(token).run();
}
