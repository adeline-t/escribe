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

function normalizeStoredTerm(lexiconId, lexiconName) {
  const id = String(lexiconId ?? "").trim();
  const name = String(lexiconName ?? "").trim();
  if (!id && !name) return null;
  return {
    lexicon_id: id || null,
    name: name || id || "",
  };
}

function createEmptyStoragePerformer() {
  return {
    mode: "combat",
    mainGuard: null,
    basePosture: null,
    preparation: null,
    attack: null,
    defense: null,
    movement: null,
    note: "",
  };
}

function deriveActionTypeFromPerformer(performer) {
  const hasAttack = Boolean(performer?.attack);
  const hasDefense = Boolean(performer?.defense);
  const hasMovement = Boolean(performer?.movement) && !hasAttack && !hasDefense;
  const hasNoteOnly =
    !hasAttack &&
    !hasDefense &&
    !hasMovement &&
    !performer?.preparation &&
    String(performer?.note ?? "").trim() !== "";
  if (hasAttack && hasDefense) return "mixed";
  if (hasAttack) return "attack";
  if (hasDefense) return "defense";
  if (hasMovement) return "movement";
  if (hasNoteOnly) return "note";
  return "inactive";
}

function categoryForActionSlot(slot) {
  const normalized = String(slot ?? "").trim();
  if (!normalized) return null;
  if (normalized === "main_guard") return "positions";
  if (normalized === "base_posture") return "movements";
  if (normalized === "preparation") return "preparations";
  if (normalized === "attack") return "attack_types";
  if (normalized === "defense") return "defensive_actions";
  if (normalized === "movement") return "movements";
  if (normalized.endsWith("_target")) return "target_zones";
  if (normalized.endsWith("_position")) return "positions";
  return null;
}

function categoryForAttributeSlot(slot, scope) {
  const normalized = String(slot ?? "").trim();
  if (String(scope ?? "").trim() === "position") return "position_complements";
  if (normalized === "attack") return "attack_complements";
  if (normalized === "defense") return "attributs_defense";
  if (normalized === "movement") return "movement_complements";
  if (normalized === "preparation") return "preparations";
  return null;
}

async function getCurrentSequenceCount(env, performanceId) {
  const row = await env.DB
    .prepare(
      `SELECT COUNT(*) AS total
       FROM performance_sequences
       WHERE performance_id = ?1`,
    )
    .bind(performanceId)
    .first();
  return Number(row?.total ?? 0);
}

async function getCurrentStepCountsBySequencePosition(env, performanceId) {
  const rows = await env.DB
    .prepare(
      `SELECT
         position,
         COALESCE(json_array_length(json_extract(payload, '$.steps')), 0) AS step_count
       FROM performance_sequences
       WHERE performance_id = ?1
       ORDER BY position`,
    )
    .bind(performanceId)
    .all();
  const out = new Map();
  for (const row of rows?.results ?? []) {
    const position = Number(row?.position);
    if (!Number.isFinite(position)) continue;
    out.set(position, Number(row?.step_count ?? 0));
  }
  return out;
}

function getIncomingStepCount(sequence) {
  const steps = Array.isArray(sequence?.steps) ? sequence.steps : [];
  return steps.length;
}

async function loadStructuredStepsBySequence(env, performanceId) {
  const stepsRows = await env.DB
    .prepare(
      `SELECT ss.id, ss.sequence_id, ss.step_uid, ss.position, ss.lexicon_key
       FROM sequence_steps ss
       JOIN performance_sequences ps ON ps.id = ss.sequence_id
       WHERE ps.performance_id = ?1
       ORDER BY ss.sequence_id, ss.position`,
    )
    .bind(performanceId)
    .all();
  const stepResults = stepsRows?.results ?? [];
  if (!stepResults.length) return new Map();

  const performerRows = await env.DB
    .prepare(
      `SELECT sp.id, sp.step_id, sp.performer_id, sp.note, sp.preparation_timing
       FROM step_performers sp
       JOIN sequence_steps ss ON ss.id = sp.step_id
       JOIN performance_sequences ps ON ps.id = ss.sequence_id
       WHERE ps.performance_id = ?1
       ORDER BY sp.id`,
    )
    .bind(performanceId)
    .all();
  const actionRows = await env.DB
    .prepare(
      `SELECT sa.id, sa.step_performer_id, sa.slot, sa.timing, sa.lexicon_id, sa.lexicon_name, sa.position
       FROM step_actions sa
       JOIN step_performers sp ON sp.id = sa.step_performer_id
       JOIN sequence_steps ss ON ss.id = sp.step_id
       JOIN performance_sequences ps ON ps.id = ss.sequence_id
       WHERE ps.performance_id = ?1
       ORDER BY sa.step_performer_id, sa.position, sa.id`,
    )
    .bind(performanceId)
    .all();
  const attributeRows = await env.DB
    .prepare(
      `SELECT saa.id, saa.step_action_id, saa.attribute_scope, saa.lexicon_id, saa.lexicon_name, saa.position
       FROM step_action_attributes saa
       JOIN step_actions sa ON sa.id = saa.step_action_id
       JOIN step_performers sp ON sp.id = sa.step_performer_id
       JOIN sequence_steps ss ON ss.id = sp.step_id
       JOIN performance_sequences ps ON ps.id = ss.sequence_id
       WHERE ps.performance_id = ?1
       ORDER BY saa.step_action_id, saa.position, saa.id`,
    )
    .bind(performanceId)
    .all();

  const sequenceMap = new Map();
  const stepById = new Map();
  for (const row of stepResults) {
    const sequenceId = Number(row.sequence_id);
    if (!sequenceMap.has(sequenceId)) sequenceMap.set(sequenceId, []);
    const stepPayload = {
      id: row.step_uid,
      lexicon: row.lexicon_key,
      performers: {},
    };
    sequenceMap.get(sequenceId).push(stepPayload);
    stepById.set(Number(row.id), stepPayload);
  }

  const stepPerformerById = new Map();
  for (const row of performerRows?.results ?? []) {
    const stepPayload = stepById.get(Number(row.step_id));
    if (!stepPayload) continue;
    const performerKey = String(row.performer_id ?? "").trim();
    if (!performerKey) continue;
    const performerPayload = createEmptyStoragePerformer();
    performerPayload.note = String(row.note ?? "");
    if (String(row.preparation_timing ?? "").trim()) {
      performerPayload.preparationTiming = String(row.preparation_timing).trim();
    }
    stepPayload.performers[performerKey] = performerPayload;
    stepPerformerById.set(Number(row.id), performerPayload);
  }

  const actionById = new Map();
  for (const row of actionRows?.results ?? []) {
    const performerPayload = stepPerformerById.get(Number(row.step_performer_id));
    if (!performerPayload) continue;
    const slot = String(row.slot ?? "").trim();
    if (!slot) continue;
    const term = normalizeStoredTerm(row.lexicon_id, row.lexicon_name);
    const timing = String(row.timing ?? "").trim();
    if (slot === "main_guard") {
      performerPayload.mainGuard = term;
      actionById.set(Number(row.id), { slot, ref: performerPayload.mainGuard });
      continue;
    }
    if (slot === "base_posture") {
      performerPayload.basePosture = term;
      actionById.set(Number(row.id), { slot, ref: performerPayload.basePosture });
      continue;
    }
    if (slot === "preparation" || slot === "attack" || slot === "defense" || slot === "movement") {
      const action = term
        ? { ...term, attributes: [] }
        : { lexicon_id: null, name: "", attributes: [] };
      if (slot === "preparation" && timing) action.timing = timing;
      performerPayload[slot] = action;
      actionById.set(Number(row.id), { slot, ref: action });
      continue;
    }
    if (slot === "attack_target" && performerPayload.attack) {
      performerPayload.attack.target = term;
      actionById.set(Number(row.id), { slot, ref: performerPayload.attack.target });
      continue;
    }
    if (slot === "preparation_target" && performerPayload.preparation) {
      performerPayload.preparation.target = term;
      actionById.set(Number(row.id), { slot, ref: performerPayload.preparation.target });
      continue;
    }
    if (slot === "defense_position" && performerPayload.defense) {
      performerPayload.defense.position = term ? { ...term, attributes: [] } : null;
      actionById.set(Number(row.id), { slot, ref: performerPayload.defense.position });
      continue;
    }
    if (slot === "preparation_position" && performerPayload.preparation) {
      performerPayload.preparation.position = term ? { ...term, attributes: [] } : null;
      actionById.set(Number(row.id), { slot, ref: performerPayload.preparation.position });
      continue;
    }
  }

  for (const row of attributeRows?.results ?? []) {
    const actionInfo = actionById.get(Number(row.step_action_id));
    if (!actionInfo) continue;
    const term = normalizeStoredTerm(row.lexicon_id, row.lexicon_name);
    if (!term) continue;
    const scope = String(row.attribute_scope ?? "").trim();
    if (scope === "position" && actionInfo.ref && Array.isArray(actionInfo.ref.attributes)) {
      actionInfo.ref.attributes.push(term);
      continue;
    }
    if (actionInfo.ref && Array.isArray(actionInfo.ref.attributes)) {
      actionInfo.ref.attributes.push(term);
    }
  }

  return sequenceMap;
}

async function saveStructuredStepsForSequence(env, sequenceId, sequence, performers, now) {
  const steps = Array.isArray(sequence?.steps) ? sequence.steps : [];
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
    const step = steps[stepIndex] ?? {};
    const stepUid = String(step?.id ?? "").trim() || crypto.randomUUID();
    const lexiconKey = String(step?.lexicon ?? "").trim() || LEGACY_STEP_LEXICON_KEY;
    const insertedStep = await env.DB
      .prepare(
        `INSERT INTO sequence_steps (sequence_id, step_uid, position, lexicon_key, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)
         RETURNING id`,
      )
      .bind(sequenceId, stepUid, stepIndex, lexiconKey, now)
      .first();
    const stepRowId = Number(insertedStep?.id);
    if (!Number.isFinite(stepRowId)) continue;

    const stepPerformers = Array.isArray(step?.performers) ? step.performers : [];
    for (let performerIndex = 0; performerIndex < performers.length; performerIndex += 1) {
      const performerIdentity = performers[performerIndex];
      const performerId = String(performerIdentity?.id ?? "").trim();
      if (!performerId) continue;
      const performer = stepPerformers[performerIndex] ?? createStepPerformerModel();
      const preparationTiming = String(
        performer?.preparation?.timing ?? performer?.preparationTiming ?? "",
      ).trim();
      const insertedPerformer = await env.DB
        .prepare(
          `INSERT INTO step_performers (
             step_id, performer_id, action_type, note, preparation_timing, created_at, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
           RETURNING id`,
        )
        .bind(
          stepRowId,
          performerId,
          deriveActionTypeFromPerformer(performer),
          String(performer?.note ?? ""),
          preparationTiming || null,
          now,
        )
        .first();
      const stepPerformerId = Number(insertedPerformer?.id);
      if (!Number.isFinite(stepPerformerId)) continue;

      const actionRefs = [];
      const actionSlots = [
        ["main_guard", performer?.mainGuard, null],
        ["base_posture", performer?.basePosture, null],
        ["preparation", performer?.preparation, preparationTiming || null],
        ["attack", performer?.attack, null],
        ["defense", performer?.defense, null],
        ["movement", performer?.movement, null],
      ];
      for (const [slot, rawValue, timing] of actionSlots) {
        if (!rawValue || typeof rawValue !== "object") continue;
        const lexiconId = String(rawValue?.lexicon_id ?? "").trim();
        const lexiconName = String(rawValue?.name ?? "").trim();
        if (!lexiconId && !lexiconName) continue;
        const insertedAction = await env.DB
          .prepare(
            `INSERT INTO step_actions (
               step_performer_id, slot, timing, lexicon_id, lexicon_name, lexicon_category, position, created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?7)
             RETURNING id`,
          )
          .bind(
            stepPerformerId,
            slot,
            timing,
            lexiconId || null,
            lexiconName || null,
            categoryForActionSlot(slot),
            now,
          )
          .first();
        const actionId = Number(insertedAction?.id);
        if (!Number.isFinite(actionId)) continue;
        actionRefs.push({ actionId, slot, value: rawValue });
      }

      for (const actionRef of actionRefs) {
        const rawValue = actionRef.value;
        if (!rawValue || typeof rawValue !== "object") continue;
        const attrs = Array.isArray(rawValue?.attributes) ? rawValue.attributes : [];
        for (let attrIndex = 0; attrIndex < attrs.length; attrIndex += 1) {
          const attr = attrs[attrIndex] ?? {};
          const lexiconId = String(attr?.lexicon_id ?? "").trim();
          const lexiconName = String(attr?.name ?? "").trim();
          if (!lexiconId && !lexiconName) continue;
          await env.DB
            .prepare(
              `INSERT INTO step_action_attributes (
                 step_action_id, attribute_scope, lexicon_id, lexicon_name, lexicon_category, position, created_at, updated_at
               ) VALUES (?1, 'action', ?2, ?3, ?4, ?5, ?6, ?6)`,
            )
            .bind(
              actionRef.actionId,
              lexiconId || null,
              lexiconName || null,
              categoryForAttributeSlot(actionRef.slot, "action"),
              attrIndex,
              now,
            )
            .run();
        }

        if (
          (actionRef.slot === "attack" || actionRef.slot === "preparation") &&
          rawValue.target &&
          typeof rawValue.target === "object"
        ) {
          const targetLexiconId = String(rawValue.target?.lexicon_id ?? "").trim();
          const targetLexiconName = String(rawValue.target?.name ?? "").trim();
          if (targetLexiconId || targetLexiconName) {
            await env.DB
              .prepare(
                `INSERT INTO step_actions (
                   step_performer_id, slot, timing, lexicon_id, lexicon_name, lexicon_category, position, created_at, updated_at
                 ) VALUES (?1, ?2, NULL, ?3, ?4, 'target_zones', 0, ?5, ?5)`,
              )
              .bind(
                stepPerformerId,
                actionRef.slot === "attack" ? "attack_target" : "preparation_target",
                targetLexiconId || null,
                targetLexiconName || null,
                now,
              )
              .run();
          }
        }

        if (
          (actionRef.slot === "defense" || actionRef.slot === "preparation") &&
          rawValue.position &&
          typeof rawValue.position === "object"
        ) {
          const positionLexiconId = String(rawValue.position?.lexicon_id ?? "").trim();
          const positionLexiconName = String(rawValue.position?.name ?? "").trim();
          if (positionLexiconId || positionLexiconName) {
            const insertedPosition = await env.DB
              .prepare(
                `INSERT INTO step_actions (
                   step_performer_id, slot, timing, lexicon_id, lexicon_name, lexicon_category, position, created_at, updated_at
                 ) VALUES (?1, ?2, NULL, ?3, ?4, 'positions', 0, ?5, ?5)
                 RETURNING id`,
              )
              .bind(
                stepPerformerId,
                actionRef.slot === "defense"
                  ? "defense_position"
                  : "preparation_position",
                positionLexiconId || null,
                positionLexiconName || null,
                now,
              )
              .first();
            const positionActionId = Number(insertedPosition?.id);
            const positionAttrs = Array.isArray(rawValue.position?.attributes)
              ? rawValue.position.attributes
              : [];
            if (Number.isFinite(positionActionId)) {
              for (let posAttrIndex = 0; posAttrIndex < positionAttrs.length; posAttrIndex += 1) {
                const posAttr = positionAttrs[posAttrIndex] ?? {};
                const lexiconId = String(posAttr?.lexicon_id ?? "").trim();
                const lexiconName = String(posAttr?.name ?? "").trim();
                if (!lexiconId && !lexiconName) continue;
                await env.DB
                  .prepare(
                    `INSERT INTO step_action_attributes (
                       step_action_id, attribute_scope, lexicon_id, lexicon_name, lexicon_category, position, created_at, updated_at
                     ) VALUES (?1, 'position', ?2, ?3, 'position_complements', ?4, ?5, ?5)`,
                  )
                  .bind(
                    positionActionId,
                    lexiconId || null,
                    lexiconName || null,
                    posAttrIndex,
                    now,
                  )
                  .run();
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Reads a full performance state including performers, draft form and sequences.
 * Step content is sourced only from structured step tables.
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
      `SELECT id, payload FROM performance_sequences
       WHERE performance_id = ?1
       ORDER BY position`,
    )
    .bind(performance.id)
    .all();
  const structuredStepsBySequence = await loadStructuredStepsBySequence(
    env,
    performance.id,
  );

  const performerIdToIndexMap = buildPerformerIdToIndexMap(performers);

  const sequences = sequenceRows?.results?.map((row, index) => {
    try {
      const payload = JSON.parse(row.payload);
      const metadata =
        payload?.metadata && typeof payload.metadata === "object"
          ? payload.metadata
          : payload;
      const lexiconKey = resolveStepLexiconKey(metadata?.lexicon, {
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
      const structuredSteps = structuredStepsBySequence.get(Number(row.id)) ?? [];
      return createSequenceModel({
        id: payload?.id,
        name: payload?.name,
        index,
        hiddenPerformerIndexes,
        performerCount: performers.length,
        steps: structuredSteps.map((stepPayload) => {
          const legacyStep = convertStorageStepToLegacyStep(stepPayload, {
            lexiconKey,
            performerOrder,
            lexiconNameById,
          });
          return createStepModel(legacyStep, {
            fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
            performerCount: performers.length,
          });
        }),
      });
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
          `SELECT ps.performance_id, ss.lexicon_key
           FROM performance_sequences ps
           LEFT JOIN sequence_steps ss ON ss.sequence_id = ps.id
           WHERE ps.performance_id IN (${placeholders})`,
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
    grouped.get(performanceId).push(String(row?.lexicon_key ?? ""));
  }

  for (const performanceId of ids) {
    const lexiconKeys = grouped.get(performanceId) ?? [];
    let hasLegacy = false;
    for (const key of lexiconKeys) {
      if (hasLegacy) break;
      const lexicon = resolveStepLexiconKey(key, { fallbackLexicon: "" });
      if (lexicon === LEGACY_STEP_LEXICON_KEY) {
        hasLegacy = true;
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
export async function saveState(
  env,
  userId,
  state,
  isSuperAdmin = false,
) {
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
  const hasRequestedPerformanceId = Number.isFinite(requestedId);
  const expectedUpdatedAt =
    typeof state.performanceUpdatedAt === "string" &&
    state.performanceUpdatedAt.trim()
      ? state.performanceUpdatedAt.trim()
      : null;

  let performanceId = hasRequestedPerformanceId ? requestedId : null;
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
      return {
        performanceId: requestedId,
        invalidPerformanceId: true,
      };
    } else {
      shareRole = exists.share_role;
    }
  }

  if (!performanceId) {
    return {
      creationRejected: true,
    };
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
    const allowSequenceShrinkToTwo = state?.allowSequenceShrinkToTwo === true;
    const allowStepShrinkToTwo = state?.allowStepShrinkToTwo === true;
    const shouldReplaceSequences =
      Array.isArray(sequences) &&
      (nextCount > 0 || allowEmptySequences);

    if (shouldReplaceSequences) {
      const currentCount = await getCurrentSequenceCount(env, performanceId);
      if (currentCount > 2 && nextCount === 2 && !allowSequenceShrinkToTwo) {
        return {
          performanceId,
          guardrail: {
            type: "sequence_shrink_to_two",
            currentCount,
            nextCount,
            requiresFlag: "allowSequenceShrinkToTwo",
          },
          performanceUpdatedAt: existingPerformance?.updated_at ?? null,
        };
      }

      if (!allowStepShrinkToTwo && nextCount > 0) {
        const currentStepCounts = await getCurrentStepCountsBySequencePosition(
          env,
          performanceId,
        );
        const blockedSequences = [];
        for (let index = 0; index < nextCount; index += 1) {
          const previousStepCount = Number(currentStepCounts.get(index) ?? 0);
          const incomingStepCount = getIncomingStepCount(sequences[index]);
          if (previousStepCount > 2 && incomingStepCount === 2) {
            blockedSequences.push({
              position: index,
              previousStepCount,
              incomingStepCount,
            });
          }
        }
        if (blockedSequences.length > 0) {
          return {
            performanceId,
            guardrail: {
              type: "sequence_step_shrink_to_two",
              blockedSequences,
              requiresFlag: "allowStepShrinkToTwo",
            },
            performanceUpdatedAt: existingPerformance?.updated_at ?? null,
          };
        }
      }
    }

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
      for (let index = 0; index < sequences.length; index += 1) {
        const sequence = sequences[index];
        const payload = buildSequencePayload(sequence, normalizedPerformers, {
          createStepModel,
          lexiconReferenceIndex,
        });
        const insertedSequence = await env.DB
          .prepare(
            `INSERT INTO performance_sequences (performance_id, position, payload, created_at)
             VALUES (?1, ?2, ?3, ?4)
             RETURNING id`,
          )
          .bind(performanceId, index, JSON.stringify(payload), now)
          .first();
        const sequenceId = Number(insertedSequence?.id);
        if (Number.isFinite(sequenceId)) {
          await saveStructuredStepsForSequence(
            env,
            sequenceId,
            sequence,
            normalizedPerformers,
            now,
          );
        }
      }
    }
  }

  return { performanceId, performanceUpdatedAt: now };
}
