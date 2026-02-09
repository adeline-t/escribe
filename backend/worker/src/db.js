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
  createDefaultPerformancePerformers,
  DEFAULT_PERFORMANCE_NAME,
  DEFAULT_PERFORMANCE_SHARE_ROLE,
  normalizePerformanceType,
  OWNER_PERFORMANCE_SHARE_ROLE,
} from "../../../shared/performanceModel.js";
import { createSequenceModel } from "../../../shared/sequenceModel.js";
import {
  createStepModel,
  LEGACY_STEP_LEXICON_KEY,
  resolveStepLexiconKey,
} from "../../../shared/stepModel.js";

let schemaReady = false;
let lexiconReady = false;
let lexiconSeeded = false;

function buildSequencePayload(sequence, performerCount) {
  const stepsRaw = Array.isArray(sequence?.steps) ? sequence.steps : [];
  const steps = stepsRaw.map((step) =>
    createStepModel(step, { fallbackLexicon: LEGACY_STEP_LEXICON_KEY }),
  );
  return createSequenceModel({
    id: sequence?.id,
    name: sequence?.name,
    hiddenPerformerIndexes:
      sequence?.hiddenPerformerIndexes ?? sequence?.hiddenParticipantIndexes,
    performerCount,
    steps,
  });
}

export async function ensureSchema(env) {
  if (schemaReady) return;
  const required = ["performances", "performance_sequences", "performance_shares"];
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
    "target",
    "movement",
    "guard_number",
    "guard_attribute",
    "attack_attribute",
    "nl_offensive",
    "nl_action",
    "nl_defensive",
    "nl_target",
    "nl_movement",
    "nl_movement_complement",
    "nl_guard_number",
    "nl_guard_attribute",
    "nl_attack_attribute",
    "sl_weapons",
    "sl_choreography_phases",
    "sl_targets",
    "sl_offensive_techniques",
    "sl_offensive_attributes",
    "sl_defensive_techniques",
    "sl_defensive_attributes",
    "sl_preparations",
    "sl_movements",
    "user_offensive",
    "user_action",
    "user_defensive",
    "user_target",
    "user_movement",
    "user_guard_number",
    "user_guard_attribute",
    "user_attack_attribute",
    "user_nl_offensive",
    "user_nl_action",
    "user_nl_defensive",
    "user_nl_target",
    "user_nl_movement",
    "user_nl_movement_complement",
    "user_nl_guard_number",
    "user_nl_guard_attribute",
    "user_nl_attack_attribute",
    "user_sl_weapons",
    "user_sl_choreography_phases",
    "user_sl_targets",
    "user_sl_offensive_techniques",
    "user_sl_offensive_attributes",
    "user_sl_defensive_techniques",
    "user_sl_defensive_attributes",
    "user_sl_preparations",
    "user_sl_movements",
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
  const sabreRow = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM sl_weapons")
    .first();
  const sabreCount = Number(sabreRow?.count ?? 0);
  if (sabreCount === 0) {
    await replaceLexiconByKey(env, "sabre-laser", seedSabreLexicon);
  }
  const newRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM nl_offensive").first();
  const newCount = Number(newRow?.count ?? 0);
  const newMovementComplementRow = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM nl_movement_complement")
    .first();
  const newMovementComplementCount = Number(
    newMovementComplementRow?.count ?? 0
  );
  if (newCount === 0 || newMovementComplementCount === 0) {
    await replaceLexiconByKey(env, "classic-v2", seedNewLexicon);
  }
  lexiconSeeded = true;
}

export async function getPerformanceState(
  env,
  userId,
  performanceId,
  isSuperAdmin = false
) {
  await ensureSchema(env);
  const performance = await env.DB
    .prepare(
      `SELECT c.id, c.name, c.description, c.participants as performers, c.form_draft as draft, c.type,
        c.user_id, c.is_demo,
        CASE WHEN c.user_id = ?2 THEN 'owner' ELSE cs.role END as share_role
       FROM performances c
       LEFT JOIN performance_shares cs ON cs.performance_id = c.id AND cs.shared_user_id = ?2
       WHERE c.id = ?1 AND (c.user_id = ?2 OR cs.shared_user_id = ?2 OR c.is_demo = 1)`
    )
    .bind(performanceId, userId)
    .first();
  if (!performance?.id) return null;

  let performers = [];
  let form = null;
  try {
    performers = JSON.parse(performance.performers);
  } catch {
    performers = [];
  }
  try {
    form = performance.draft ? JSON.parse(performance.draft) : null;
  } catch {
    form = null;
  }

  const sequenceRows = await env.DB
    .prepare(
      `SELECT payload FROM performance_sequences
       WHERE performance_id = ?1
       ORDER BY position`
    )
    .bind(performance.id)
    .all();

  const sequences = sequenceRows?.results?.map((row, index) => {
    try {
      const payload = JSON.parse(row.payload);
      if (payload?.steps) {
        const stepsRaw = Array.isArray(payload.steps) ? payload.steps : [];
        return createSequenceModel({
          id: payload.id,
          name: payload.name,
          index,
          hiddenPerformerIndexes:
            payload.hiddenPerformerIndexes ?? payload.hiddenParticipantIndexes,
          performerCount: performers.length,
          steps: stepsRaw.map((step) =>
            createStepModel(step, {
              fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
            })
          ),
        });
      }
      if (payload?.performers || payload?.participants) {
        return createSequenceModel({
          index,
          hiddenPerformerIndexes: [],
          performerCount: performers.length,
          steps: [
            createStepModel(payload, {
              fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
            }),
          ],
        });
      }
      return null;
    } catch {
      return null;
    }
  }).filter(Boolean) ?? [];

  const isDemo = Boolean(performance.is_demo);
  const isOwner = performance.user_id === userId;
  const shareRole = isOwner
    ? OWNER_PERFORMANCE_SHARE_ROLE
    : isSuperAdmin && isDemo
      ? OWNER_PERFORMANCE_SHARE_ROLE
      : performance.share_role ?? DEFAULT_PERFORMANCE_SHARE_ROLE;
  const normalizedType = normalizePerformanceType(performance.type);
  const description = performance.description ?? "";

  return {
    performanceId: performance.id,
    performanceName: performance.name,
    performanceDescription: description,
    performanceType: normalizedType,
    performanceShareRole: shareRole,
    performanceIsDemo: isDemo,
    performanceOwnerId: performance.user_id,
    performers,
    sequences,
    // Backward compatibility for older frontend payload consumers.
    phrases: sequences,
    form,
  };
}

export async function getState(
  env,
  userId,
  performanceId = null,
  performanceType = null,
  isSuperAdmin = false
) {
  await ensureSchema(env);
  if (performanceId) {
    const state = await getPerformanceState(
      env,
      userId,
      performanceId,
      isSuperAdmin
    );
    if (state) return state;
  }
  const typeFilter = performanceType ? "AND type = ?2" : "";
  const query = `
      SELECT id
      FROM performances
      WHERE user_id = ?1 AND archived = 0 ${typeFilter}
      ORDER BY updated_at DESC
      LIMIT 1`;
  const stmt = performanceType
    ? env.DB.prepare(query).bind(userId, performanceType)
    : env.DB.prepare(query).bind(userId);
  const performance = await stmt.first();
  if (!performance?.id) return null;
  return getPerformanceState(env, userId, performance.id, isSuperAdmin);
}

export async function listPerformances(
  env,
  userId,
  includeArchived = false,
  performanceType = null,
  isSuperAdmin = false
) {
  await ensureSchema(env);
  const typeFilter = performanceType ? "AND c.type = ?2" : "";
  const archiveFilter = includeArchived ? "" : "AND c.archived = 0";
  const query = `SELECT DISTINCT c.id, c.name, c.description, c.participants as performers, c.archived, c.updated_at, c.created_at, c.type, c.is_demo, c.user_id,
      (SELECT COUNT(*) FROM performance_sequences cp WHERE cp.performance_id = c.id) as sequence_count,
      CASE WHEN c.user_id = ?1 THEN 1 ELSE 0 END as is_owner,
      CASE WHEN c.user_id = ?1 THEN 'owner' ELSE cs.role END as share_role
     FROM performances c
     LEFT JOIN performance_shares cs ON cs.performance_id = c.id AND cs.shared_user_id = ?1
     WHERE (c.user_id = ?1 OR cs.shared_user_id = ?1 OR c.is_demo = 1) ${archiveFilter} ${typeFilter}
     ORDER BY c.updated_at DESC`;
  const stmt = performanceType
    ? env.DB.prepare(query).bind(userId, performanceType)
    : env.DB.prepare(query).bind(userId);
  const rows = await stmt.all();
  const results = rows?.results ?? [];
  const legacyMap = await detectLegacyLexiconByPerformance(
    env,
    results.map((row) => row.id)
  );
  return results.map((row) => {
    let performers = [];
    try {
      performers = JSON.parse(row.performers);
    } catch {
      performers = [];
    }
    const isDemo = Boolean(row.is_demo);
    const isOwner = Boolean(row.is_owner) || (isSuperAdmin && isDemo);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      type: normalizePerformanceType(row.type),
      archived: Boolean(row.archived),
      isOwner,
      isDemo,
      shareRole: isOwner
        ? OWNER_PERFORMANCE_SHARE_ROLE
        : row.share_role ?? DEFAULT_PERFORMANCE_SHARE_ROLE,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sequenceCount: Number(row.sequence_count ?? 0),
      hasLegacyLexicon: Boolean(legacyMap.get(row.id)),
      performersCount: performers.length,
    };
  }) ?? [];
}

async function detectLegacyLexiconByPerformance(env, performanceIds) {
  const map = new Map();
  if (!performanceIds?.length) return map;
  for (const performanceId of performanceIds) {
    const rows = await env.DB
      .prepare(
        `SELECT payload FROM performance_sequences
         WHERE performance_id = ?1`
      )
      .bind(performanceId)
      .all();
    const payloads = rows?.results ?? [];
    let hasLegacy = false;
    for (const row of payloads) {
      if (hasLegacy) break;
      try {
        const payload = JSON.parse(row.payload);
        const steps = Array.isArray(payload?.steps)
          ? payload.steps
          : payload?.performers || payload?.participants
            ? [payload]
            : [];
        for (const step of steps) {
          const lexicon = resolveStepLexiconKey(step?.lexicon, {
            fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
          });
          if (lexicon === LEGACY_STEP_LEXICON_KEY) {
            hasLegacy = true;
            break;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    if (hasLegacy) map.set(performanceId, true);
  }
  return map;
}

export async function createPerformance(env, userId, data) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const name =
    typeof data?.name === "string" && data.name.trim()
      ? data.name.trim()
      : DEFAULT_PERFORMANCE_NAME;
  const description =
    typeof data?.description === "string" ? data.description.trim() : "";
  const type = normalizePerformanceType(data?.type);
  const performers =
    Array.isArray(data?.performers) && data.performers.length
      ? data.performers
      : Array.isArray(data?.participants) && data.participants.length
        ? data.participants
        : createDefaultPerformancePerformers();
  const result = await env.DB
    .prepare(
      `INSERT INTO performances (user_id, name, description, participants, form_draft, type, created_at, updated_at, archived, is_demo)
       VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?6, 0, 0)
       RETURNING id, name, description, type`
    )
    .bind(userId, name, description, JSON.stringify(performers), type, now)
    .first();
  return result ?? null;
}

export async function updatePerformance(env, userId, performanceId, data) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const name =
    typeof data?.name === "string" && data.name.trim()
      ? data.name.trim()
      : DEFAULT_PERFORMANCE_NAME;
  const description =
    typeof data?.description === "string" ? data.description.trim() : "";
  const performers = Array.isArray(data?.performers)
    ? data.performers
    : Array.isArray(data?.participants)
      ? data.participants
      : [];
  await env.DB
    .prepare(
      `UPDATE performances
       SET name = ?1, description = ?2, participants = ?3, updated_at = ?4
       WHERE id = ?5 AND user_id = ?6`
    )
    .bind(name, description, JSON.stringify(performers), now, performanceId, userId)
    .run();
}

export async function archivePerformance(env, userId, performanceId, archived) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB
    .prepare(
      `UPDATE performances SET archived = ?1, updated_at = ?2 WHERE id = ?3 AND user_id = ?4`
    )
    .bind(archived ? 1 : 0, now, performanceId, userId)
    .run();
}

export async function deletePerformance(env, userId, performanceId) {
  await ensureSchema(env);
  const row = await env.DB
    .prepare("SELECT COUNT(*) as count FROM performance_sequences WHERE performance_id = ?1")
    .bind(performanceId)
    .first();
  const count = Number(row?.count ?? 0);
  if (count > 1) {
    await archivePerformance(env, userId, performanceId, true);
    return { mode: "soft" };
  }
  await env.DB.prepare("DELETE FROM performance_sequences WHERE performance_id = ?1").bind(performanceId).run();
  await env.DB.prepare("DELETE FROM performance_shares WHERE performance_id = ?1").bind(performanceId).run();
  await env.DB.prepare("DELETE FROM performances WHERE id = ?1 AND user_id = ?2")
    .bind(performanceId, userId)
    .run();
  return { mode: "hard" };
}

export async function listPerformanceShares(env, ownerId, performanceId) {
  await ensureSchema(env);
  const rows = await env.DB
    .prepare(
      `SELECT cs.shared_user_id as user_id, u.email, u.first_name, u.last_name, cs.created_at, cs.role
     FROM performance_shares cs
     JOIN users u ON u.id = cs.shared_user_id
     WHERE cs.performance_id = ?1 AND cs.owner_id = ?2
     ORDER BY cs.created_at DESC`
    )
    .bind(performanceId, ownerId)
    .all();
  return rows?.results ?? [];
}

export async function addPerformanceShare(
  env,
  ownerId,
  performanceId,
  sharedUserId,
  role = DEFAULT_PERFORMANCE_SHARE_ROLE
) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB
    .prepare(
      `INSERT INTO performance_shares (performance_id, owner_id, shared_user_id, role, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(performance_id, shared_user_id) DO UPDATE SET role = excluded.role`
    )
    .bind(performanceId, ownerId, sharedUserId, role, now)
    .run();
  return { ok: true };
}

export async function removePerformanceShare(
  env,
  ownerId,
  performanceId,
  sharedUserId
) {
  await ensureSchema(env);
  await env.DB
    .prepare(
      "DELETE FROM performance_shares WHERE performance_id = ?1 AND owner_id = ?2 AND shared_user_id = ?3"
    )
    .bind(performanceId, ownerId, sharedUserId)
    .run();
  return { ok: true };
}

export async function listShareUsers(env, userId, query) {
  await ensureSchema(env);
  const q = `%${query.toLowerCase()}%`;
  const rows = await env.DB
    .prepare(
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
  const rows = await env.DB
    .prepare(
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
  const performanceName =
    typeof state.performanceName === "string" && state.performanceName.trim()
      ? state.performanceName.trim()
      : DEFAULT_PERFORMANCE_NAME;
  const performanceDescription =
    typeof state.performanceDescription === "string"
      ? state.performanceDescription.trim()
      : "";
  const performanceType = normalizePerformanceType(state.performanceType);
  const performers = Array.isArray(state.performers)
    ? state.performers
    : Array.isArray(state.participants)
      ? state.participants
      : [];
  const draft = Array.isArray(state.form) ? state.form : null;
  const sequences = Array.isArray(state.sequences)
    ? state.sequences
    : Array.isArray(state.phrases)
      ? state.phrases
      : [];
  const requestedId = Number(state.performanceId);

  let performanceId = Number.isFinite(requestedId) ? requestedId : null;
  let shareRole = null;
  let existingPerformance = null;
  if (performanceId) {
    const exists = await env.DB
      .prepare(
        `SELECT c.id, c.user_id, c.is_demo,
          CASE WHEN c.user_id = ?2 THEN 'owner' ELSE cs.role END as share_role
         FROM performances c
         LEFT JOIN performance_shares cs ON cs.performance_id = c.id AND cs.shared_user_id = ?2
         WHERE c.id = ?1 AND (c.user_id = ?2 OR cs.shared_user_id = ?2 OR c.is_demo = 1) AND c.archived = 0`
      )
      .bind(performanceId, userId)
      .first();
    existingPerformance = exists;
    if (!exists?.id) {
      performanceId = null;
    } else {
      shareRole = exists.share_role;
    }
  }

  if (!performanceId) {
    const inserted = await env.DB
      .prepare(
        `INSERT INTO performances (user_id, name, description, participants, form_draft, type, created_at, updated_at, archived)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, 0)
         RETURNING id`
      )
      .bind(
        userId,
        performanceName,
        performanceDescription,
        JSON.stringify(performers),
        draft ? JSON.stringify(draft) : null,
        performanceType,
        now
      )
      .first();
    performanceId = inserted?.id;
  } else {
    const isDemo = Boolean(existingPerformance?.is_demo);
    if (isDemo && !isSuperAdmin) {
      return performanceId;
    }
    if (shareRole === DEFAULT_PERFORMANCE_SHARE_ROLE) {
      return performanceId;
    }
    const ownerId =
      isDemo && isSuperAdmin ? existingPerformance.user_id : userId;
    await env.DB
      .prepare(
        `UPDATE performances
         SET name = ?1, description = ?2, participants = ?3, form_draft = ?4, updated_at = ?5
         WHERE id = ?6 AND user_id = ?7`
      )
      .bind(
        performanceName,
        performanceDescription,
        JSON.stringify(performers),
        draft ? JSON.stringify(draft) : null,
        now,
        performanceId,
        ownerId
      )
      .run();
  }

  if (performanceId) {
    await env.DB
      .prepare(`DELETE FROM performance_sequences WHERE performance_id = ?1`)
      .bind(performanceId)
      .run();
    if (sequences.length > 0) {
      const inserts = sequences.map((sequence, index) =>
        env.DB
          .prepare(
            `INSERT INTO performance_sequences (performance_id, position, payload, created_at)
           VALUES (?1, ?2, ?3, ?4)`
          )
          .bind(
            performanceId,
            index,
            JSON.stringify(buildSequencePayload(sequence, performers.length)),
            now
          )
      );
      await env.DB.batch(inserts);
    }
  }

  return performanceId;
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
    cible: "target",
    deplacement: "movement",
    "parade-numero": "guard_number",
    "parade-attribut": "guard_attribute",
    "attaque-attribut": "attack_attribute"
  },
  "classic-v2": {
    offensive: "nl_offensive",
    action: "nl_action",
    defensive: "nl_defensive",
    cible: "nl_target",
    deplacement: "nl_movement",
    deplacement_complement: "nl_movement_complement",
    "parade-numero": "nl_guard_number",
    "parade-attribut": "nl_guard_attribute",
    "attaque-attribut": "nl_attack_attribute"
  },
  "sabre-laser": {
    armes: "sl_weapons",
    phases_choregraphie: "sl_choreography_phases",
    cibles: "sl_targets",
    techniques_offensives: "sl_offensive_techniques",
    attributs_offensifs: "sl_offensive_attributes",
    techniques_defensives: "sl_defensive_techniques",
    attributs_defensifs: "sl_defensive_attributes",
    preparations: "sl_preparations",
    deplacements: "sl_movements"
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
