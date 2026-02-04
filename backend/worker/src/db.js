import postgres from "postgres";

let sql;
let schemaPromise;

export function getSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
  };
}

export function jsonResponse(data, status = 200, headers = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    ...getSecurityHeaders()
  };

  return new Response(JSON.stringify(data), {
    status,
    headers: { ...defaultHeaders, ...headers }
  });
}

export function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((item) => item.trim())
    : ["*"];
  const allowOrigin = allowed.includes("*")
    ? "*"
    : allowed.includes(origin)
      ? origin
      : allowed[0] || "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    ...getSecurityHeaders()
  };
}

function getSql(env) {
  if (!sql) {
    sql = postgres(env.HYPERDRIVE.connectionString, {
      max: 5,
      fetch_types: false,
      prepare: true
    });
  }
  return sql;
}

export async function ensureSchema(env) {
  if (!schemaPromise) {
    const db = getSql(env);
    schemaPromise = db`
      CREATE TABLE IF NOT EXISTS app_state (
        id integer PRIMARY KEY,
        state jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `;
  }
  return schemaPromise;
}

export async function getState(env) {
  const db = getSql(env);
  await ensureSchema(env);
  const rows = await db`SELECT state FROM app_state WHERE id = 1`;
  return rows[0]?.state ?? null;
}

export async function saveState(env, state) {
  const db = getSql(env);
  await ensureSchema(env);
  await db`
    INSERT INTO app_state (id, state, updated_at)
    VALUES (1, ${state}, now())
    ON CONFLICT (id)
    DO UPDATE SET state = EXCLUDED.state, updated_at = now();
  `;
}
