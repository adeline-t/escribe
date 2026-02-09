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
import seedNewLexicon from "./lexicon-new.seed.json";
import seedSabreLexicon from "./lexicon-sabre-laser.seed.json";
import {
  createDefaultParticipants,
  createPhraseModel,
  DEFAULT_COMBAT_NAME,
  DEFAULT_COMBAT_SHARE_ROLE,
  normalizeCombatType,
  normalizeHiddenParticipantIndexes,
  OWNER_COMBAT_SHARE_ROLE,
} from "../../../shared/combatModel.js";

let schemaReady = false;
let lexiconReady = false;
let lexiconSeeded = false;

function buildPhrasePayload(phrase, participantCount) {
  return createPhraseModel({
    id: phrase?.id,
    name: phrase?.name,
    hiddenParticipantIndexes: phrase?.hiddenParticipantIndexes,
    participantCount,
    steps: Array.isArray(phrase?.steps) ? phrase.steps : [],
  });
}

export async function ensureSchema(env) {
  if (schemaReady) return;
  const required = ["combats", "combat_phrases", "combat_shares"];
  const missing = [];
  for (const table of required) {
    const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?1")
      .bind(table)
      .first();
    if (!row?.name) missing.push(table);
  }
  if (missing.length) {
    throw new Error(`Missing tables: ${missing.join(", ")}. Run D1 migrations.`);
  }
  schemaReady = true;
}

export async function ensureLexiconSchema(env) {
  if (lexiconReady) return;
  const required = [
    "offensive",
    "action",
    "defensive",
    "cible",
    "deplacement",
    "parade_numero",
    "parade_attribut",
    "attaque_attribut",
    "nl_offensive",
    "nl_action",
    "nl_defensive",
    "nl_cible",
    "nl_deplacement",
    "nl_deplacement_complement",
    "nl_parade_numero",
    "nl_parade_attribut",
    "nl_attaque_attribut",
    "sl_armes",
    "sl_phases_choregraphie",
    "sl_cibles",
    "sl_techniques_offensives",
    "sl_attributs_offensifs",
    "sl_techniques_defensives",
    "sl_attributs_defensifs",
    "sl_preparations",
    "sl_deplacements",
    "user_offensive",
    "user_action",
    "user_defensive",
    "user_cible",
    "user_deplacement",
    "user_parade_numero",
    "user_parade_attribut",
    "user_attaque_attribut",
    "user_nl_offensive",
    "user_nl_action",
    "user_nl_defensive",
    "user_nl_cible",
    "user_nl_deplacement",
    "user_nl_deplacement_complement",
    "user_nl_parade_numero",
    "user_nl_parade_attribut",
    "user_nl_attaque_attribut",
    "user_sl_armes",
    "user_sl_phases_choregraphie",
    "user_sl_cibles",
    "user_sl_techniques_offensives",
    "user_sl_attributs_offensifs",
    "user_sl_techniques_defensives",
    "user_sl_attributs_defensifs",
    "user_sl_preparations",
    "user_sl_deplacements",
    "user_lexicon_favorites"
  ];
  const missing = [];
  for (const table of required) {
    const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?1")
      .bind(table)
      .first();
    if (!row?.name) missing.push(table);
  }
  if (missing.length) {
    throw new Error(`Missing lexicon tables: ${missing.join(", ")}. Run D1 migrations.`);
  }
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
  const sabreRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM sl_armes").first();
  const sabreCount = Number(sabreRow?.count ?? 0);
  if (sabreCount === 0) {
    await replaceLexiconByKey(env, "sabre-laser", seedSabreLexicon);
  }
  const newRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM nl_offensive").first();
  const newCount = Number(newRow?.count ?? 0);
  const newMovementComplementRow = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM nl_deplacement_complement")
    .first();
  const newMovementComplementCount = Number(
    newMovementComplementRow?.count ?? 0
  );
  if (newCount === 0 || newMovementComplementCount === 0) {
    await replaceLexiconByKey(env, "classic-v2", seedNewLexicon);
  }
  lexiconSeeded = true;
}

export async function getCombatState(env, userId, combatId, isSuperAdmin = false) {
  await ensureSchema(env);
  const combat = await env.DB
    .prepare(
      `SELECT c.id, c.name, c.description, c.participants, c.draft, c.type,
        c.user_id, c.is_demo,
        CASE WHEN c.user_id = ?2 THEN 'owner' ELSE cs.role END as share_role
       FROM combats c
       LEFT JOIN combat_shares cs ON cs.combat_id = c.id AND cs.shared_user_id = ?2
       WHERE c.id = ?1 AND (c.user_id = ?2 OR cs.shared_user_id = ?2 OR c.is_demo = 1)`
    )
    .bind(combatId, userId)
    .first();
  if (!combat?.id) return null;

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
        return createPhraseModel({
          id: payload.id,
          name: payload.name,
          index,
          hiddenParticipantIndexes: payload.hiddenParticipantIndexes,
          participantCount: participants.length,
          steps: Array.isArray(payload.steps) ? payload.steps : [],
        });
      }
      if (payload?.participants) {
        return createPhraseModel({
          index,
          hiddenParticipantIndexes: [],
          participantCount: participants.length,
          steps: [payload],
        });
      }
      return null;
    } catch {
      return null;
    }
  }).filter(Boolean) ?? [];

  const isDemo = Boolean(combat.is_demo);
  const isOwner = combat.user_id === userId;
  const shareRole = isOwner
    ? OWNER_COMBAT_SHARE_ROLE
    : isSuperAdmin && isDemo
      ? OWNER_COMBAT_SHARE_ROLE
      : combat.share_role ?? DEFAULT_COMBAT_SHARE_ROLE;

  return {
    combatId: combat.id,
    combatName: combat.name,
    combatDescription: combat.description ?? "",
    combatType: normalizeCombatType(combat.type),
    combatShareRole: shareRole,
    combatIsDemo: isDemo,
    combatOwnerId: combat.user_id,
    participants,
    phrases,
    form
  };
}

export async function getState(env, userId, combatId = null, combatType = null, isSuperAdmin = false) {
  await ensureSchema(env);
  if (combatId) {
    const state = await getCombatState(env, userId, combatId, isSuperAdmin);
    if (state) return state;
  }
  const typeFilter = combatType ? "AND type = ?2" : "";
  const query = `
      SELECT id
      FROM combats
      WHERE user_id = ?1 AND archived = 0 ${typeFilter}
      ORDER BY updated_at DESC
      LIMIT 1`;
  const stmt = combatType
    ? env.DB.prepare(query).bind(userId, combatType)
    : env.DB.prepare(query).bind(userId);
  const combat = await stmt.first();
  if (!combat?.id) return null;
  return getCombatState(env, userId, combat.id, isSuperAdmin);
}

export async function listCombats(env, userId, includeArchived = false, combatType = null, isSuperAdmin = false) {
  await ensureSchema(env);
  const typeFilter = combatType ? "AND c.type = ?2" : "";
  const archiveFilter = includeArchived ? "" : "AND c.archived = 0";
  const query = `SELECT DISTINCT c.id, c.name, c.description, c.participants, c.archived, c.updated_at, c.created_at, c.type, c.is_demo, c.user_id,
      (SELECT COUNT(*) FROM combat_phrases cp WHERE cp.combat_id = c.id) as phrase_count,
      CASE WHEN c.user_id = ?1 THEN 1 ELSE 0 END as is_owner,
      CASE WHEN c.user_id = ?1 THEN 'owner' ELSE cs.role END as share_role
     FROM combats c
     LEFT JOIN combat_shares cs ON cs.combat_id = c.id AND cs.shared_user_id = ?1
     WHERE (c.user_id = ?1 OR cs.shared_user_id = ?1 OR c.is_demo = 1) ${archiveFilter} ${typeFilter}
     ORDER BY c.updated_at DESC`;
  const stmt = combatType
    ? env.DB.prepare(query).bind(userId, combatType)
    : env.DB.prepare(query).bind(userId);
  const rows = await stmt.all();
  const results = rows?.results ?? [];
  const legacyMap = await detectLegacyLexiconByCombat(env, results.map((row) => row.id));
  return results.map((row) => {
    let participants = [];
    try {
      participants = JSON.parse(row.participants);
    } catch {
      participants = [];
    }
    const isDemo = Boolean(row.is_demo);
    const isOwner = Boolean(row.is_owner) || (isSuperAdmin && isDemo);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      type: normalizeCombatType(row.type),
      archived: Boolean(row.archived),
      isOwner,
      isDemo,
      shareRole: isOwner ? OWNER_COMBAT_SHARE_ROLE : row.share_role ?? DEFAULT_COMBAT_SHARE_ROLE,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      phraseCount: Number(row.phrase_count ?? 0),
      hasLegacyLexicon: Boolean(legacyMap.get(row.id)),
      participantsCount: participants.length
    };
  }) ?? [];
}

async function detectLegacyLexiconByCombat(env, combatIds) {
  const map = new Map();
  if (!combatIds?.length) return map;
  for (const combatId of combatIds) {
    const rows = await env.DB
      .prepare(
        `SELECT payload FROM combat_phrases
         WHERE combat_id = ?1`
      )
      .bind(combatId)
      .all();
    const payloads = rows?.results ?? [];
    let hasLegacy = false;
    for (const row of payloads) {
      if (hasLegacy) break;
      try {
        const payload = JSON.parse(row.payload);
        const steps = Array.isArray(payload?.steps)
          ? payload.steps
          : payload?.participants
            ? [payload]
            : [];
        for (const step of steps) {
          const lexicon = typeof step?.lexicon === "string" ? step.lexicon : "classic";
          if (lexicon === "classic") {
            hasLegacy = true;
            break;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    if (hasLegacy) map.set(combatId, true);
  }
  return map;
}

export async function createCombat(env, userId, data) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const name = typeof data?.name === "string" && data.name.trim() ? data.name.trim() : DEFAULT_COMBAT_NAME;
  const description = typeof data?.description === "string" ? data.description.trim() : "";
  const type = normalizeCombatType(data?.type);
  const participants = Array.isArray(data?.participants) && data.participants.length
    ? data.participants
    : createDefaultParticipants();
  const result = await env.DB
    .prepare(
      `INSERT INTO combats (user_id, name, description, participants, draft, type, created_at, updated_at, archived, is_demo)
       VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?6, 0, 0)
       RETURNING id, name, description, type`
    )
    .bind(userId, name, description, JSON.stringify(participants), type, now)
    .first();
  return result ?? null;
}

export async function updateCombat(env, userId, combatId, data) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const name = typeof data?.name === "string" && data.name.trim() ? data.name.trim() : DEFAULT_COMBAT_NAME;
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

export async function deleteCombat(env, userId, combatId) {
  await ensureSchema(env);
  const row = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM combat_phrases WHERE combat_id = ?1"
  )
    .bind(combatId)
    .first();
  const count = Number(row?.count ?? 0);
  if (count > 1) {
    await archiveCombat(env, userId, combatId, true);
    return { mode: "soft" };
  }
  await env.DB.prepare("DELETE FROM combat_phrases WHERE combat_id = ?1").bind(combatId).run();
  await env.DB.prepare("DELETE FROM combat_shares WHERE combat_id = ?1").bind(combatId).run();
  await env.DB.prepare("DELETE FROM combats WHERE id = ?1 AND user_id = ?2")
    .bind(combatId, userId)
    .run();
  return { mode: "hard" };
}

export async function listCombatShares(env, ownerId, combatId) {
  await ensureSchema(env);
  const rows = await env.DB.prepare(
    `SELECT cs.shared_user_id as user_id, u.email, u.first_name, u.last_name, cs.created_at, cs.role
     FROM combat_shares cs
     JOIN users u ON u.id = cs.shared_user_id
     WHERE cs.combat_id = ?1 AND cs.owner_id = ?2
     ORDER BY cs.created_at DESC`
  )
    .bind(combatId, ownerId)
    .all();
  return rows?.results ?? [];
}

export async function addCombatShare(env, ownerId, combatId, sharedUserId, role = DEFAULT_COMBAT_SHARE_ROLE) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO combat_shares (combat_id, owner_id, shared_user_id, role, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(combat_id, shared_user_id) DO UPDATE SET role = excluded.role`
  )
    .bind(combatId, ownerId, sharedUserId, role, now)
    .run();
  return { ok: true };
}

export async function removeCombatShare(env, ownerId, combatId, sharedUserId) {
  await ensureSchema(env);
  await env.DB.prepare(
    "DELETE FROM combat_shares WHERE combat_id = ?1 AND owner_id = ?2 AND shared_user_id = ?3"
  )
    .bind(combatId, ownerId, sharedUserId)
    .run();
  return { ok: true };
}

export async function listShareUsers(env, userId, query) {
  await ensureSchema(env);
  const q = `%${query.toLowerCase()}%`;
  const rows = await env.DB.prepare(
    `SELECT id, email, first_name, last_name
     FROM users
     WHERE id != ?1
       AND (lower(email) LIKE ?2 OR lower(first_name) LIKE ?2 OR lower(last_name) LIKE ?2)
     ORDER BY email
     LIMIT 25`
  )
    .bind(userId, q)
    .all();
  return rows?.results ?? [];
}

export async function listShareUsersAll(env, userId) {
  await ensureSchema(env);
  const rows = await env.DB.prepare(
    `SELECT id, email, first_name, last_name
     FROM users
     WHERE id != ?1
     ORDER BY email`
  )
    .bind(userId)
    .all();
  return rows?.results ?? [];
}

export async function saveState(env, userId, state, isSuperAdmin = false) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const combatName = typeof state.combatName === "string" && state.combatName.trim()
    ? state.combatName.trim()
    : DEFAULT_COMBAT_NAME;
  const combatDescription = typeof state.combatDescription === "string" ? state.combatDescription.trim() : "";
  const combatType = normalizeCombatType(state.combatType);
  const participants = Array.isArray(state.participants) ? state.participants : [];
  const draft = Array.isArray(state.form) ? state.form : null;
  const phrases = Array.isArray(state.phrases) ? state.phrases : [];
  const requestedId = Number(state.combatId);

  let combatId = Number.isFinite(requestedId) ? requestedId : null;
  let shareRole = null;
  let existingCombat = null;
  if (combatId) {
    const exists = await env.DB
      .prepare(
        `SELECT c.id, c.user_id, c.is_demo,
          CASE WHEN c.user_id = ?2 THEN 'owner' ELSE cs.role END as share_role
         FROM combats c
         LEFT JOIN combat_shares cs ON cs.combat_id = c.id AND cs.shared_user_id = ?2
         WHERE c.id = ?1 AND (c.user_id = ?2 OR cs.shared_user_id = ?2 OR c.is_demo = 1) AND c.archived = 0`
      )
      .bind(combatId, userId)
      .first();
    existingCombat = exists;
    if (!exists?.id) {
      combatId = null;
    } else {
      shareRole = exists.share_role;
    }
  }

  if (!combatId) {
    const inserted = await env.DB
      .prepare(
        `INSERT INTO combats (user_id, name, description, participants, draft, type, created_at, updated_at, archived)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, 0)
         RETURNING id`
      )
      .bind(
        userId,
        combatName,
        combatDescription,
        JSON.stringify(participants),
        draft ? JSON.stringify(draft) : null,
        combatType,
        now
      )
      .first();
    combatId = inserted?.id;
  } else {
    const isDemo = Boolean(existingCombat?.is_demo);
    if (isDemo && !isSuperAdmin) {
      return combatId;
    }
    if (shareRole === DEFAULT_COMBAT_SHARE_ROLE) {
      return combatId;
    }
    const ownerId =
      isDemo && isSuperAdmin ? existingCombat.user_id : userId;
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
        ownerId
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
          JSON.stringify(buildPhrasePayload(phrase, participants.length)),
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
  await replaceLexiconByKey(env, "classic", lexicon);
}

const LEXICON_TABLES = {
  classic: {
    offensive: "offensive",
    action: "action",
    defensive: "defensive",
    cible: "cible",
    deplacement: "deplacement",
    "parade-numero": "parade_numero",
    "parade-attribut": "parade_attribut",
    "attaque-attribut": "attaque_attribut"
  },
  "classic-v2": {
    offensive: "nl_offensive",
    action: "nl_action",
    defensive: "nl_defensive",
    cible: "nl_cible",
    deplacement: "nl_deplacement",
    deplacement_complement: "nl_deplacement_complement",
    "parade-numero": "nl_parade_numero",
    "parade-attribut": "nl_parade_attribut",
    "attaque-attribut": "nl_attaque_attribut"
  },
  "sabre-laser": {
    armes: "sl_armes",
    phases_choregraphie: "sl_phases_choregraphie",
    cibles: "sl_cibles",
    techniques_offensives: "sl_techniques_offensives",
    attributs_offensifs: "sl_attributs_offensifs",
    techniques_defensives: "sl_techniques_defensives",
    attributs_defensifs: "sl_attributs_defensifs",
    preparations: "sl_preparations",
    deplacements: "sl_deplacements"
  }
};

function normalizeLexiconLabel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function mergeUniqueLabels(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      const label = typeof value === "string" ? value.trim() : "";
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

function splitNewMovementLabels(values, complementValues) {
  const complementLookup = new Set(
    mergeUniqueLabels(complementValues).map(normalizeLexiconLabel)
  );
  const base = [];
  const complement = [];
  for (const value of values ?? []) {
    if (complementLookup.has(normalizeLexiconLabel(value))) {
      complement.push(value);
      continue;
    }
    base.push(value);
  }
  return {
    base: mergeUniqueLabels(base),
    complement: mergeUniqueLabels(complementValues, complement)
  };
}

export async function replaceLexiconByKey(env, lexiconKey, lexicon) {
  await ensureLexiconSchema(env);
  const tables = LEXICON_TABLES[lexiconKey] || LEXICON_TABLES.classic;
  for (const [key, table] of Object.entries(tables)) {
    const values = lexicon?.[key];
    if (!Array.isArray(values)) continue;
    await env.DB.prepare(`DELETE FROM ${table}`).run();
    for (const value of values) {
      const label = typeof value === "string" ? value.trim() : "";
      if (!label) continue;
      await env.DB.prepare(`INSERT INTO ${table} (label) VALUES (?1)`).bind(label).run();
    }
  }
}

export async function getLexiconByKey(env, lexiconKey) {
  await ensureLexiconSeeded(env);
  const tables = LEXICON_TABLES[lexiconKey] || LEXICON_TABLES.classic;
  const entries = await Promise.all(
    Object.entries(tables).map(async ([key, table]) => [key, await getLabels(env, table)])
  );
  const lexicon = Object.fromEntries(entries);
  if (lexiconKey === "classic-v2") {
    const { base, complement } = splitNewMovementLabels(
      lexicon.deplacement,
      lexicon.deplacement_complement
    );
    lexicon.deplacement_base = base;
    lexicon.deplacement_complement = complement;
    lexicon.deplacement = mergeUniqueLabels(base, complement);
  }
  return lexicon;
}

export async function getLexicon(env) {
  return getLexiconByKey(env, "classic");
}
