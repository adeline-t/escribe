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
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    ...getSecurityHeaders()
  };
}

import seedLexicon from "./lexicon.seed.json";

let schemaReady = false;
let lexiconReady = false;
let lexiconSeeded = false;

export async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      state TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  schemaReady = true;
}

export async function ensureLexiconSchema(env) {
  if (lexiconReady) return;
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS offensive (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS action (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS defensive (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cible (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deplacement_attaque (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deplacement_defense (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS parade_numero (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS parade_attribut (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attaque_attribut (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
  `);
  lexiconReady = true;
}

async function ensureLexiconSeeded(env) {
  if (lexiconSeeded) return;
  await ensureLexiconSchema(env);
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM offensive").first();
  const count = Number(row?.count ?? 0);
  if (count === 0) {
    await replaceLexicon(env, seedLexicon);
  }
  lexiconSeeded = true;
}

export async function getState(env) {
  await ensureSchema(env);
  const row = await env.DB.prepare("SELECT state FROM app_state WHERE id = 1").first();
  if (!row?.state) return null;
  try {
    return JSON.parse(row.state);
  } catch {
    return null;
  }
}

export async function saveState(env, state) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `
      INSERT INTO app_state (id, state, updated_at)
      VALUES (1, ?1, ?2)
      ON CONFLICT (id)
      DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at;
    `
  )
    .bind(JSON.stringify(state), now)
    .run();
}

async function getLabels(env, table) {
  const rows = await env.DB.prepare(`SELECT label FROM ${table} ORDER BY id`).all();
  return rows?.results?.map((row) => row.label) ?? [];
}

export async function getLexiconItems(env, table) {
  await ensureLexiconSeeded(env);
  const rows = await env.DB.prepare(`SELECT id, label FROM ${table} ORDER BY id`).all();
  return rows?.results ?? [];
}

export async function addLexiconItem(env, table, label) {
  await ensureLexiconSeeded(env);
  const result = await env.DB.prepare(`INSERT INTO ${table} (label) VALUES (?1) RETURNING id, label`)
    .bind(label)
    .first();
  return result ?? null;
}

export async function deleteLexiconItem(env, table, id) {
  await ensureLexiconSeeded(env);
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(id).run();
}

export async function hasLexiconLabel(env, table, label) {
  await ensureLexiconSeeded(env);
  const row = await env.DB
    .prepare(`SELECT id FROM ${table} WHERE lower(label) = lower(?1) LIMIT 1`)
    .bind(label)
    .first();
  return Boolean(row?.id);
}

export async function replaceLexicon(env, lexicon) {
  await ensureLexiconSchema(env);
  const tables = [
    ["offensive", lexicon.offensive],
    ["action", lexicon.action],
    ["defensive", lexicon.defensive],
    ["cible", lexicon.cible],
    ["deplacement_attaque", lexicon["deplacement-attaque"]],
    ["deplacement_defense", lexicon["deplacement-defense"]],
    ["parade_numero", lexicon["parade-numero"]],
    ["parade_attribut", lexicon["parade-attribut"]],
    ["attaque_attribut", lexicon["attaque-attribut"]]
  ];

  for (const [table, values] of tables) {
    if (!Array.isArray(values)) continue;
    await env.DB.prepare(`DELETE FROM ${table}`).run();
    for (const value of values) {
      const label = typeof value === "string" ? value.trim() : "";
      if (!label) continue;
      await env.DB.prepare(`INSERT INTO ${table} (label) VALUES (?1)`).bind(label).run();
    }
  }
}

export async function getLexicon(env) {
  await ensureLexiconSeeded(env);
  const [offensive, action, defensive, cible, deplacementAttaque, deplacementDefense, paradeNumero, paradeAttribut, attaqueAttribut] =
    await Promise.all([
      getLabels(env, "offensive"),
      getLabels(env, "action"),
      getLabels(env, "defensive"),
      getLabels(env, "cible"),
      getLabels(env, "deplacement_attaque"),
      getLabels(env, "deplacement_defense"),
      getLabels(env, "parade_numero"),
      getLabels(env, "parade_attribut"),
      getLabels(env, "attaque_attribut")
    ]);

  return {
    offensive,
    action,
    defensive,
    cible,
    "deplacement-attaque": deplacementAttaque,
    "deplacement-defense": deplacementDefense,
    "parade-numero": paradeNumero,
    "parade-attribut": paradeAttribut,
    "attaque-attribut": attaqueAttribut
  };
}
