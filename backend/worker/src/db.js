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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
  const statements = [
    `CREATE TABLE IF NOT EXISTS combats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      participants TEXT NOT NULL,
      draft TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS combat_phrases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combat_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`
  ];
  await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));
  schemaReady = true;
}

export async function ensureLexiconSchema(env) {
  if (lexiconReady) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS offensive (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS action (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS defensive (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS cible (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS deplacement_attaque (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS deplacement_defense (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS parade_numero (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS parade_attribut (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS attaque_attribut (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_offensive (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_action (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_defensive (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_cible (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_deplacement_attaque (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_deplacement_defense (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_parade_numero (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_parade_attribut (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_attaque_attribut (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS user_lexicon_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL
    );`
  ];
  await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));
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

export async function getCombatState(env, userId, combatId) {
  await ensureSchema(env);
  const combat = await env.DB
    .prepare(
      `SELECT id, name, description, participants, draft
       FROM combats
       WHERE id = ?1 AND user_id = ?2`
    )
    .bind(combatId, userId)
    .first();
  if (!combat?.id) return null;

  const phraseRows = await env.DB
    .prepare(
      `SELECT payload FROM combat_phrases
       WHERE combat_id = ?1
       ORDER BY position`
    )
    .bind(combat.id)
    .all();

  const phrases = phraseRows?.results?.map((row, index) => {
    try {
      const payload = JSON.parse(row.payload);
      if (payload?.steps) {
        return {
          id: payload.id ?? crypto.randomUUID(),
          name: payload.name ?? `Phrase ${index + 1}`,
          steps: Array.isArray(payload.steps) ? payload.steps : []
        };
      }
      if (payload?.participants) {
        return {
          id: crypto.randomUUID(),
          name: `Phrase ${index + 1}`,
          steps: [payload]
        };
      }
      return null;
    } catch {
      return null;
    }
  }).filter(Boolean) ?? [];

  let participants = [];
  let form = null;
  try {
    participants = JSON.parse(combat.participants);
  } catch {
    participants = [];
  }
  try {
    form = combat.draft ? JSON.parse(combat.draft) : null;
  } catch {
    form = null;
  }

  return {
    combatId: combat.id,
    combatName: combat.name,
    combatDescription: combat.description ?? "",
    participants,
    phrases,
    form
  };
}

export async function getState(env, userId, combatId = null) {
  await ensureSchema(env);
  if (combatId) {
    const state = await getCombatState(env, userId, combatId);
    if (state) return state;
  }
  const combat = await env.DB
    .prepare(
      `SELECT id
       FROM combats
       WHERE user_id = ?1 AND archived = 0
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .bind(userId)
    .first();
  if (!combat?.id) return null;
  return getCombatState(env, userId, combat.id);
}

export async function listCombats(env, userId, includeArchived = false) {
  await ensureSchema(env);
  const rows = await env.DB
    .prepare(
      `SELECT c.id, c.name, c.description, c.participants, c.archived, c.updated_at,
        (SELECT COUNT(*) FROM combat_phrases cp WHERE cp.combat_id = c.id) as phrase_count
       FROM combats c
       WHERE c.user_id = ?1 ${includeArchived ? "" : "AND c.archived = 0"}
       ORDER BY c.updated_at DESC`
    )
    .bind(userId)
    .all();
  return rows?.results?.map((row) => {
    let participants = [];
    try {
      participants = JSON.parse(row.participants);
    } catch {
      participants = [];
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      archived: Boolean(row.archived),
      updatedAt: row.updated_at,
      phraseCount: Number(row.phrase_count ?? 0),
      participantsCount: participants.length
    };
  }) ?? [];
}

export async function createCombat(env, userId, data) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const name = typeof data?.name === "string" && data.name.trim() ? data.name.trim() : "Combat sans nom";
  const description = typeof data?.description === "string" ? data.description.trim() : "";
  const participants = Array.isArray(data?.participants) && data.participants.length
    ? data.participants
    : ["A", "B"];
  const result = await env.DB
    .prepare(
      `INSERT INTO combats (user_id, name, description, participants, draft, created_at, updated_at, archived)
       VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?5, 0)
       RETURNING id, name, description`
    )
    .bind(userId, name, description, JSON.stringify(participants), now)
    .first();
  return result ?? null;
}

export async function updateCombat(env, userId, combatId, data) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const name = typeof data?.name === "string" && data.name.trim() ? data.name.trim() : "Combat sans nom";
  const description = typeof data?.description === "string" ? data.description.trim() : "";
  const participants = Array.isArray(data?.participants) ? data.participants : [];
  await env.DB
    .prepare(
      `UPDATE combats
       SET name = ?1, description = ?2, participants = ?3, updated_at = ?4
       WHERE id = ?5 AND user_id = ?6`
    )
    .bind(name, description, JSON.stringify(participants), now, combatId, userId)
    .run();
}

export async function archiveCombat(env, userId, combatId, archived) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB
    .prepare(`UPDATE combats SET archived = ?1, updated_at = ?2 WHERE id = ?3 AND user_id = ?4`)
    .bind(archived ? 1 : 0, now, combatId, userId)
    .run();
}

export async function saveState(env, userId, state) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const combatName = typeof state.combatName === "string" && state.combatName.trim()
    ? state.combatName.trim()
    : "Combat sans nom";
  const combatDescription = typeof state.combatDescription === "string" ? state.combatDescription.trim() : "";
  const participants = Array.isArray(state.participants) ? state.participants : [];
  const draft = Array.isArray(state.form) ? state.form : null;
  const phrases = Array.isArray(state.phrases) ? state.phrases : [];
  const requestedId = Number(state.combatId);

  let combatId = Number.isFinite(requestedId) ? requestedId : null;
  if (combatId) {
    const exists = await env.DB
      .prepare(`SELECT id FROM combats WHERE id = ?1 AND user_id = ?2 AND archived = 0`)
      .bind(combatId, userId)
      .first();
    if (!exists?.id) {
      combatId = null;
    }
  }

  if (!combatId) {
    const inserted = await env.DB
      .prepare(
        `INSERT INTO combats (user_id, name, description, participants, draft, created_at, updated_at, archived)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, 0)
         RETURNING id`
      )
      .bind(
        userId,
        combatName,
        combatDescription,
        JSON.stringify(participants),
        draft ? JSON.stringify(draft) : null,
        now
      )
      .first();
    combatId = inserted?.id;
  } else {
    await env.DB
      .prepare(
        `UPDATE combats
         SET name = ?1, description = ?2, participants = ?3, draft = ?4, updated_at = ?5
         WHERE id = ?6 AND user_id = ?7`
      )
      .bind(
        combatName,
        combatDescription,
        JSON.stringify(participants),
        draft ? JSON.stringify(draft) : null,
        now,
        combatId,
        userId
      )
      .run();
  }

  if (combatId) {
    await env.DB.prepare(`DELETE FROM combat_phrases WHERE combat_id = ?1`).bind(combatId).run();
    if (phrases.length > 0) {
      const inserts = phrases.map((phrase, index) =>
        env.DB.prepare(
          `INSERT INTO combat_phrases (combat_id, position, payload, created_at)
           VALUES (?1, ?2, ?3, ?4)`
        ).bind(
          combatId,
          index,
          JSON.stringify({
            id: phrase.id,
            name: phrase.name,
            steps: Array.isArray(phrase.steps) ? phrase.steps : []
          }),
          now
        )
      );
      await env.DB.batch(inserts);
    }
  }

  return combatId;
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

export async function getUserLexiconItems(env, table, userId) {
  await ensureLexiconSeeded(env);
  const rows = await env.DB
    .prepare(`SELECT id, label FROM ${table} WHERE user_id = ?1 ORDER BY id`)
    .bind(userId)
    .all();
  return rows?.results ?? [];
}

export async function addLexiconItem(env, table, label) {
  await ensureLexiconSeeded(env);
  const result = await env.DB.prepare(`INSERT INTO ${table} (label) VALUES (?1) RETURNING id, label`)
    .bind(label)
    .first();
  return result ?? null;
}

export async function addUserLexiconItem(env, table, userId, label) {
  await ensureLexiconSeeded(env);
  const result = await env.DB
    .prepare(`INSERT INTO ${table} (user_id, label) VALUES (?1, ?2) RETURNING id, label`)
    .bind(userId, label)
    .first();
  return result ?? null;
}

export async function deleteLexiconItem(env, table, id) {
  await ensureLexiconSeeded(env);
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(id).run();
}

export async function deleteUserLexiconItem(env, table, userId, id) {
  await ensureLexiconSeeded(env);
  await env.DB
    .prepare(`DELETE FROM ${table} WHERE id = ?1 AND user_id = ?2`)
    .bind(id, userId)
    .run();
}

export async function hasLexiconLabel(env, table, label) {
  await ensureLexiconSeeded(env);
  const row = await env.DB
    .prepare(`SELECT id FROM ${table} WHERE lower(label) = lower(?1) LIMIT 1`)
    .bind(label)
    .first();
  return Boolean(row?.id);
}

export async function hasUserLexiconLabel(env, table, userId, label) {
  await ensureLexiconSeeded(env);
  const row = await env.DB
    .prepare(`SELECT id FROM ${table} WHERE user_id = ?1 AND lower(label) = lower(?2) LIMIT 1`)
    .bind(userId, label)
    .first();
  return Boolean(row?.id);
}

export async function getFavorites(env, userId) {
  await ensureLexiconSeeded(env);
  const rows = await env.DB
    .prepare(`SELECT type, label FROM user_lexicon_favorites WHERE user_id = ?1 ORDER BY id`)
    .bind(userId)
    .all();
  return rows?.results ?? [];
}

export async function addFavorite(env, userId, type, label) {
  await ensureLexiconSeeded(env);
  await env.DB
    .prepare(
      `INSERT INTO user_lexicon_favorites (user_id, type, label)
       VALUES (?1, ?2, ?3)`
    )
    .bind(userId, type, label)
    .run();
}

export async function removeFavorite(env, userId, type, label) {
  await ensureLexiconSeeded(env);
  await env.DB
    .prepare(
      `DELETE FROM user_lexicon_favorites WHERE user_id = ?1 AND type = ?2 AND lower(label) = lower(?3)`
    )
    .bind(userId, type, label)
    .run();
}

export async function isFavorite(env, userId, type, label) {
  await ensureLexiconSeeded(env);
  const row = await env.DB
    .prepare(
      `SELECT id FROM user_lexicon_favorites WHERE user_id = ?1 AND type = ?2 AND lower(label) = lower(?3) LIMIT 1`
    )
    .bind(userId, type, label)
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
