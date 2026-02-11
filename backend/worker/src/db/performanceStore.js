import {
  normalizePerformerIdentityList,
  buildPerformerIdToIndexMap,
} from "../utils/performers.js";
import {
  createDefaultPerformancePerformers,
  DEFAULT_PERFORMANCE_NAME,
  DEFAULT_PERFORMANCE_SHARE_ROLE,
  normalizePerformanceType,
  OWNER_PERFORMANCE_SHARE_ROLE,
} from "../../../../shared/performanceModel.js";
import { createSequenceModel } from "../../../../shared/sequenceModel.js";
import {
  createStepModel,
  createStepPerformerModel,
  LEGACY_STEP_LEXICON_KEY,
  resolveStepLexiconKey,
} from "../../../../shared/stepModel.js";
import {
  getClassicV2LexiconReferenceIndex,
  getLexiconNameByIdMap,
} from "./lexiconStore.js";
import {
  buildSequencePayload,
  convertStorageStepToLegacyStep,
  hydrateStepLabelsFromLexiconRefs,
  normalizeStoragePerformerOrder,
  resolveHiddenPerformerIndexesFromMetadata,
} from "./sequencePayload.js";

let schemaReady = false;

function isSqliteBusyError(error) {
  const message = String(error?.message ?? "");
  return (
    message.includes("SQLITE_BUSY") ||
    message.toLowerCase().includes("database is locked")
  );
}

async function runDbWithRetry(operation, options = {}) {
  const retries = Number.isFinite(options.retries) ? options.retries : 3;
  const baseDelayMs = Number.isFinite(options.baseDelayMs)
    ? options.baseDelayMs
    : 25;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isSqliteBusyError(error) || attempt === retries) {
        throw error;
      }
      const waitMs = baseDelayMs * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

/**
 * Ensures core performance tables are available.
 * This guard fails fast when migrations were not applied.
 */
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

/**
 * Reads a full performance state including performers, draft form and sequences.
 * It transparently supports both legacy and v2 sequence payloads.
 */
export async function getPerformanceState(
  env,
  userId,
  performanceId,
  isSuperAdmin = false,
) {
  await ensureSchema(env);
  const performance = await env.DB
    .prepare(
      `SELECT c.id, c.name, c.description, c.participants as performers, c.form_draft as draft, c.type, c.updated_at,
        c.user_id, c.is_demo,
        CASE WHEN c.user_id = ?2 THEN 'owner' ELSE cs.role END as share_role
       FROM performances c
       LEFT JOIN performance_shares cs ON cs.performance_id = c.id AND cs.shared_user_id = ?2
       WHERE c.id = ?1 AND (c.user_id = ?2 OR cs.shared_user_id = ?2 OR c.is_demo = 1)`,
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
  performers = normalizePerformerIdentityList(performers);
  try {
    form = performance.draft ? JSON.parse(performance.draft) : null;
  } catch {
    form = null;
  }
  const normalizedForm = performers.map((_, index) =>
    createStepPerformerModel(Array.isArray(form) ? form[index] : {}),
  );

  const normalizedType = normalizePerformanceType(performance.type);
  let lexiconNameById = null;
  if (normalizedType === "classic") {
    try {
      lexiconNameById = await getLexiconNameByIdMap(env);
    } catch {
      lexiconNameById = null;
    }
  }

  const sequenceRows = await env.DB
    .prepare(
      `SELECT payload FROM performance_sequences
       WHERE performance_id = ?1
       ORDER BY position`,
    )
    .bind(performance.id)
    .all();

  const performerIdToIndexMap = buildPerformerIdToIndexMap(performers);

  const sequences = sequenceRows?.results?.map((row, index) => {
    try {
      const payload = JSON.parse(row.payload);
      if (payload?.steps) {
        const metadata =
          payload?.metadata && typeof payload.metadata === "object"
            ? payload.metadata
            : payload;
        const lexiconKey = resolveStepLexiconKey(metadata.lexicon, {
          fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
        });
        const performerOrder = normalizeStoragePerformerOrder(
          metadata,
          performers,
          performerIdToIndexMap,
        );
        const hiddenPerformerIndexes = resolveHiddenPerformerIndexesFromMetadata(
          metadata,
          performers,
          performerIdToIndexMap,
        );
        const stepsRaw = Array.isArray(payload.steps) ? payload.steps : [];
        return createSequenceModel({
          id: payload.id,
          name: payload.name,
          index,
          hiddenPerformerIndexes,
          performerCount: performers.length,
          steps: stepsRaw.map((stepPayload) => {
            const hasStoragePerformersObject =
              stepPayload?.performers &&
              !Array.isArray(stepPayload.performers) &&
              typeof stepPayload.performers === "object";
            if (hasStoragePerformersObject) {
              const legacyStep = convertStorageStepToLegacyStep(stepPayload, {
                lexiconKey,
                performerOrder,
                lexiconNameById,
              });
              return createStepModel(legacyStep, {
                fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
                performerCount: performers.length,
              });
            }
            const hydratedStep = lexiconNameById
              ? hydrateStepLabelsFromLexiconRefs(stepPayload, lexiconNameById)
              : stepPayload;
            return createStepModel(hydratedStep, {
              fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
              performerCount: performers.length,
            });
          }),
        });
      }
      if (payload?.performers) {
        const hydratedPayload = lexiconNameById
          ? hydrateStepLabelsFromLexiconRefs(payload, lexiconNameById)
          : payload;
        return createSequenceModel({
          index,
          hiddenPerformerIndexes: [],
          performerCount: performers.length,
          steps: [
            createStepModel(hydratedPayload, {
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
  const description = performance.description ?? "";

  return {
    performanceId: performance.id,
    performanceName: performance.name,
    performanceDescription: description,
    performanceType: normalizedType,
    performanceShareRole: shareRole,
    performanceIsDemo: isDemo,
    performanceOwnerId: performance.user_id,
    performanceUpdatedAt: performance.updated_at ?? null,
    performers,
    sequences,
    form: normalizedForm,
  };
}

/**
 * Returns the requested performance state, or the latest non-archived one.
 * Used by initial app bootstrap.
 */
export async function getState(
  env,
  userId,
  performanceId = null,
  performanceType = null,
  isSuperAdmin = false,
) {
  await ensureSchema(env);
  if (performanceId) {
    const state = await getPerformanceState(
      env,
      userId,
      performanceId,
      isSuperAdmin,
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

/**
 * Lists accessible performances for a user (owner, shared, demos).
 * Includes summary counters and legacy lexicon detection.
 */
export async function listPerformances(
  env,
  userId,
  includeArchived = false,
  performanceType = null,
  isSuperAdmin = false,
  includeLegacyLexicon = false,
) {
  await ensureSchema(env);
  const typeFilter = performanceType ? "AND c.type = ?2" : "";
  const archiveFilter = includeArchived ? "" : "AND c.archived = 0";
  const query = `SELECT DISTINCT c.id, c.name, c.description, c.archived, c.updated_at, c.created_at, c.type, c.is_demo, c.user_id,
      COALESCE(json_array_length(c.participants), 0) as performers_count,
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
  const rows = await runDbWithRetry(() => stmt.all());
  const results = rows?.results ?? [];
  let legacyMap = new Map();
  if (includeLegacyLexicon) {
    try {
      legacyMap = await detectLegacyLexiconByPerformance(
        env,
        results.map((row) => row.id),
      );
    } catch (error) {
      console.warn("detectLegacyLexiconByPerformance failed:", error);
      legacyMap = new Map();
    }
  }
  return results.map((row) => {
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
      performersCount: Number(row.performers_count ?? 0),
    };
  }) ?? [];
}

async function detectLegacyLexiconByPerformance(env, performanceIds) {
  const map = new Map();
  if (!performanceIds?.length) return map;
  const ids = [...new Set(performanceIds.map((id) => Number(id)).filter(Number.isFinite))];
  if (!ids.length) return map;

  const chunkSize = 100;
  const allRows = [];
  for (let offset = 0; offset < ids.length; offset += chunkSize) {
    const chunk = ids.slice(offset, offset + chunkSize);
    const placeholders = chunk.map((_, index) => `?${index + 1}`).join(", ");
    const rows = await runDbWithRetry(() =>
      env.DB
        .prepare(
          `SELECT performance_id, payload
           FROM performance_sequences
           WHERE performance_id IN (${placeholders})`,
        )
        .bind(...chunk)
        .all(),
    );
    allRows.push(...(rows?.results ?? []));
  }

  const grouped = new Map(ids.map((id) => [id, []]));
  for (const row of allRows) {
    const performanceId = Number(row?.performance_id);
    if (!Number.isFinite(performanceId)) continue;
    if (!grouped.has(performanceId)) grouped.set(performanceId, []);
    grouped.get(performanceId).push(row?.payload);
  }

  for (const performanceId of ids) {
    const payloads = grouped.get(performanceId) ?? [];
    let hasLegacy = false;
    for (const rawPayload of payloads) {
      if (hasLegacy) break;
      try {
        const payload = JSON.parse(rawPayload);
        const metadataLexicon = resolveStepLexiconKey(payload?.metadata?.lexicon, {
          fallbackLexicon: "",
        });
        if (metadataLexicon) {
          if (metadataLexicon === LEGACY_STEP_LEXICON_KEY) hasLegacy = true;
          continue;
        }

        const steps = Array.isArray(payload?.steps)
          ? payload.steps
          : payload?.performers
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
      : createDefaultPerformancePerformers();
  const normalizedPerformers = normalizePerformerIdentityList(performers);
  const result = await env.DB
    .prepare(
      `INSERT INTO performances (user_id, name, description, participants, form_draft, type, created_at, updated_at, archived, is_demo)
       VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?6, 0, 0)
       RETURNING id, name, description, type`,
    )
    .bind(
      userId,
      name,
      description,
      JSON.stringify(normalizedPerformers),
      type,
      now,
    )
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
    : [];
  const normalizedPerformers = normalizePerformerIdentityList(performers);
  await env.DB
    .prepare(
      `UPDATE performances
       SET name = ?1, description = ?2, participants = ?3, updated_at = ?4
       WHERE id = ?5 AND user_id = ?6`,
    )
    .bind(
      name,
      description,
      JSON.stringify(normalizedPerformers),
      now,
      performanceId,
      userId,
    )
    .run();
}

export async function archivePerformance(env, userId, performanceId, archived) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB
    .prepare(
      `UPDATE performances SET archived = ?1, updated_at = ?2 WHERE id = ?3 AND user_id = ?4`,
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
     ORDER BY cs.created_at DESC`,
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
  role = DEFAULT_PERFORMANCE_SHARE_ROLE,
) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB
    .prepare(
      `INSERT INTO performance_shares (performance_id, owner_id, shared_user_id, role, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(performance_id, shared_user_id) DO UPDATE SET role = excluded.role`,
    )
    .bind(performanceId, ownerId, sharedUserId, role, now)
    .run();
  return { ok: true };
}

export async function removePerformanceShare(
  env,
  ownerId,
  performanceId,
  sharedUserId,
) {
  await ensureSchema(env);
  await env.DB
    .prepare(
      "DELETE FROM performance_shares WHERE performance_id = ?1 AND owner_id = ?2 AND shared_user_id = ?3",
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
     LIMIT 25`,
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
     ORDER BY email`,
    )
    .bind(userId)
    .all();
  return rows?.results ?? [];
}

/**
 * Persists the whole front state snapshot.
 * If explicit sequences are provided, existing sequences are replaced atomically.
 */
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
    : [];
  const normalizedPerformers = normalizePerformerIdentityList(performers);
  const draft = Array.isArray(state.form) ? state.form : null;
  const hasExplicitSequencesPayload =
    Array.isArray(state?.sequences) || Array.isArray(state?.phrases);
  const sequences = Array.isArray(state?.sequences)
    ? state.sequences
    : Array.isArray(state?.phrases)
      ? state.phrases
      : null;
  const requestedId = Number(state.performanceId);
  const expectedUpdatedAt =
    typeof state.performanceUpdatedAt === "string" &&
    state.performanceUpdatedAt.trim()
      ? state.performanceUpdatedAt.trim()
      : null;

  let performanceId = Number.isFinite(requestedId) ? requestedId : null;
  let shareRole = null;
  let existingPerformance = null;
  if (performanceId) {
    const exists = await env.DB
      .prepare(
        `SELECT c.id, c.user_id, c.is_demo, c.updated_at,
          CASE WHEN c.user_id = ?2 THEN 'owner' ELSE cs.role END as share_role
         FROM performances c
         LEFT JOIN performance_shares cs ON cs.performance_id = c.id AND cs.shared_user_id = ?2
         WHERE c.id = ?1 AND (c.user_id = ?2 OR cs.shared_user_id = ?2 OR c.is_demo = 1) AND c.archived = 0`,
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
         RETURNING id`,
      )
      .bind(
        userId,
        performanceName,
        performanceDescription,
        JSON.stringify(normalizedPerformers),
        draft ? JSON.stringify(draft) : null,
        performanceType,
        now,
      )
      .first();
    performanceId = inserted?.id;
  } else {
    const isDemo = Boolean(existingPerformance?.is_demo);
    if (isDemo && !isSuperAdmin) {
      return {
        performanceId,
        performanceUpdatedAt: existingPerformance?.updated_at ?? null,
      };
    }
    if (shareRole === DEFAULT_PERFORMANCE_SHARE_ROLE) {
      return {
        performanceId,
        performanceUpdatedAt: existingPerformance?.updated_at ?? null,
      };
    }
    if (
      expectedUpdatedAt &&
      String(existingPerformance?.updated_at ?? "") !== expectedUpdatedAt
    ) {
      return {
        performanceId,
        conflict: true,
        performanceUpdatedAt: existingPerformance?.updated_at ?? null,
      };
    }
    const ownerId =
      isDemo && isSuperAdmin ? existingPerformance.user_id : userId;
    const updateStmt = expectedUpdatedAt
      ? env.DB.prepare(
          `UPDATE performances
           SET name = ?1, description = ?2, participants = ?3, form_draft = ?4, updated_at = ?5
           WHERE id = ?6 AND user_id = ?7 AND updated_at = ?8`,
        )
      : env.DB.prepare(
          `UPDATE performances
           SET name = ?1, description = ?2, participants = ?3, form_draft = ?4, updated_at = ?5
           WHERE id = ?6 AND user_id = ?7`,
        );
    const updateResult = expectedUpdatedAt
      ? await updateStmt
          .bind(
            performanceName,
            performanceDescription,
            JSON.stringify(normalizedPerformers),
            draft ? JSON.stringify(draft) : null,
            now,
            performanceId,
            ownerId,
            expectedUpdatedAt,
          )
          .run()
      : await updateStmt
          .bind(
            performanceName,
            performanceDescription,
            JSON.stringify(normalizedPerformers),
            draft ? JSON.stringify(draft) : null,
            now,
            performanceId,
            ownerId,
          )
          .run();
    if (expectedUpdatedAt && Number(updateResult?.meta?.changes ?? 0) === 0) {
      const fresh = await env.DB
        .prepare("SELECT updated_at FROM performances WHERE id = ?1")
        .bind(performanceId)
        .first();
      return {
        performanceId,
        conflict: true,
        performanceUpdatedAt: fresh?.updated_at ?? null,
      };
    }
  }

  if (performanceId && hasExplicitSequencesPayload) {
    const nextCount = Array.isArray(sequences) ? sequences.length : 0;
    const allowEmptySequences = state?.allowEmptySequences === true;
    const shouldReplaceSequences =
      Array.isArray(sequences) &&
      (nextCount > 0 || allowEmptySequences);

    if (shouldReplaceSequences) {
      await env.DB
        .prepare(`DELETE FROM performance_sequences WHERE performance_id = ?1`)
        .bind(performanceId)
        .run();
    }

    if (shouldReplaceSequences && nextCount > 0) {
      const lexiconReferenceIndex =
        performanceType === "classic"
          ? await getClassicV2LexiconReferenceIndex(env)
          : null;
      const inserts = sequences.map((sequence, index) =>
        env.DB
          .prepare(
            `INSERT INTO performance_sequences (performance_id, position, payload, created_at)
           VALUES (?1, ?2, ?3, ?4)`,
          )
          .bind(
            performanceId,
            index,
            JSON.stringify(
              buildSequencePayload(sequence, normalizedPerformers, {
                createStepModel,
                lexiconReferenceIndex,
              }),
            ),
            now,
          ),
      );
      await env.DB.batch(inserts);
    }
  }

  return { performanceId, performanceUpdatedAt: now };
}
