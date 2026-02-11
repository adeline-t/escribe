import seedSabreLexicon from "../lexicon-sabre-laser.seed.json";
import seedRecursiveLexicon from "../lexicon-recursive.seed.json";
import { normalizeLexiconLabel } from "../utils/lexicon.js";
import {
  CLASSIC_V2_EDIT_PARENT_BY_TYPE,
  LEXICON_TABLES,
} from "./lexicon/constants.js";
import {
  resolveClassicV2Type,
  normalizeClassicV2EditType,
  parseLexiconTableToken,
  getSaberTypeParentIds,
  collectLeafNodesByRootLexiconIds,
  isRecursiveLexiconPayload,
  normalizeRecursiveLexiconSeed,
  buildClassicV2LexiconBucketsFromRecursiveRows,
  buildRecursiveLexiconFromRows,
  buildClassicV2LexiconReferenceIndexFromBuckets,
} from "./lexicon/transforms.js";

let lexiconReady = false;
let lexiconSeeded = false;
let lexiconSoftDeleteSupport = null;

/**
 * Ensures all lexicon tables (classic + sabre + user overlays) are available.
 * Used by lexicon CRUD and by sequence hydration paths.
 */
export async function ensureLexiconSchema(env) {
  if (lexiconReady) return;
  const required = [
    "lexicon_light_saber",
    "lexicon",
    "user_lexicon_classic",
    "user_lexicon_light_saber",
    "user_lexicon_favorites",
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

async function hasLexiconSoftDeleteSupport(env) {
  if (lexiconSoftDeleteSupport != null) return lexiconSoftDeleteSupport;
  const columns = await env.DB.prepare("PRAGMA table_info(lexicon)").all();
  const names = new Set(
    (columns?.results ?? []).map((row) => String(row?.name ?? "").trim()),
  );
  lexiconSoftDeleteSupport =
    names.has("deleted_at") && names.has("source");
  return lexiconSoftDeleteSupport;
}

export async function ensureLexiconSeeded(env) {
  if (lexiconSeeded) return;
  await ensureLexiconSchema(env);
  const sabreRow = await env.DB
    .prepare(
      "SELECT COUNT(*) AS count FROM lexicon_light_saber WHERE deleted_at IS NULL",
    )
    .first();
  const sabreCount = Number(sabreRow?.count ?? 0);
  if (sabreCount === 0) {
    await replaceLexiconByKey(env, "sabre-laser", seedSabreLexicon);
  }
  const softDeleteEnabled = await hasLexiconSoftDeleteSupport(env);
  const recursiveRow = await env.DB
    .prepare(
      softDeleteEnabled
        ? "SELECT COUNT(*) AS count FROM lexicon WHERE deleted_at IS NULL"
        : "SELECT COUNT(*) AS count FROM lexicon",
    )
    .first();
  const recursiveCount = Number(recursiveRow?.count ?? 0);
  if (recursiveCount === 0) {
    await replaceLexiconByKey(env, "classic-v2", seedRecursiveLexicon);
  }
  lexiconSeeded = true;
}

async function getLabels(env, table) {
  const rows = await env.DB.prepare(`SELECT label FROM ${table} ORDER BY id`).all();
  return rows?.results?.map((row) => row.label) ?? [];
}

export async function getClassicV2LexiconItems(env, type) {
  const resolvedType = resolveClassicV2Type(type);
  if (!resolvedType) return [];
  const rows = await getRecursiveLexiconRows(env);
  const buckets = buildClassicV2LexiconBucketsFromRecursiveRows(rows);
  return (buckets[resolvedType] ?? []).map((entry, index) => ({
    id: index + 1,
    lexicon_id: entry.lexicon_id ?? null,
    label: entry.name ?? "",
    description: entry.description ?? "",
  }));
}

export async function hasClassicV2LexiconLabel(env, type, label) {
  const normalized = normalizeLexiconLabel(label);
  if (!normalized) return false;
  const items = await getClassicV2LexiconItems(env, type);
  return items.some((item) => normalizeLexiconLabel(item.label) === normalized);
}

export async function addClassicV2LexiconItem(env, type, label) {
  await ensureLexiconSeeded(env);
  const softDeleteEnabled = await hasLexiconSoftDeleteSupport(env);
  const resolvedType = normalizeClassicV2EditType(type);
  const normalizedLabel = String(label ?? "").trim();
  if (!resolvedType || !normalizedLabel) return null;
  const parentLexiconIdValue = CLASSIC_V2_EDIT_PARENT_BY_TYPE[resolvedType];
  const parentLexiconIds = Array.isArray(parentLexiconIdValue)
    ? parentLexiconIdValue
    : [parentLexiconIdValue];

  const exists = await hasClassicV2LexiconLabel(env, resolvedType, normalizedLabel);
  if (exists) return null;

  let parent = null;
  for (const parentLexiconId of parentLexiconIds) {
    // eslint-disable-next-line no-await-in-loop
    parent = await env.DB
      .prepare(`SELECT id FROM lexicon WHERE lexicon_id = ?1 LIMIT 1`)
      .bind(parentLexiconId)
      .first();
    if (parent?.id) break;
  }
  if (!parent?.id) {
    throw new Error(
      `Missing lexicon parent node: ${parentLexiconIds.join(" or ")}`,
    );
  }

  const baseId = normalizeLexiconLabel(normalizedLabel)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "term";
  let candidateId = `${resolvedType}_${baseId}`;
  let suffix = 2;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const row = await env.DB
      .prepare(`SELECT id FROM lexicon WHERE lexicon_id = ?1 LIMIT 1`)
      .bind(candidateId)
      .first();
    if (!row?.id) break;
    candidateId = `${resolvedType}_${baseId}_${suffix}`;
    suffix += 1;
  }

  const created = softDeleteEnabled
    ? await env.DB
      .prepare(
        `INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
         VALUES (?1, ?2, ?3, NULL, NULL, 'user')
         RETURNING id, lexicon_id, name`,
      )
      .bind(candidateId, parent.id, normalizedLabel)
      .first()
    : await env.DB
      .prepare(
        `INSERT INTO lexicon (lexicon_id, parent_id, name, description)
         VALUES (?1, ?2, ?3, NULL)
         RETURNING id, lexicon_id, name`,
      )
      .bind(candidateId, parent.id, normalizedLabel)
      .first();

  return {
    id: created?.id ?? null,
    lexicon_id: created?.lexicon_id ?? candidateId,
    label: created?.name ?? normalizedLabel,
  };
}

export async function deleteClassicV2LexiconItem(env, type, id) {
  await ensureLexiconSeeded(env);
  const resolvedType = normalizeClassicV2EditType(type);
  if (!resolvedType) return;

  const items = await getClassicV2LexiconItems(env, resolvedType);
  const index = Number(id);
  const target = items.find((item) => Number(item.id) === index);
  if (!target?.lexicon_id) return;

  const targetRow = await env.DB
    .prepare(`SELECT id FROM lexicon WHERE lexicon_id = ?1 LIMIT 1`)
    .bind(target.lexicon_id)
    .first();
  if (!targetRow?.id) return;

  await env.DB.prepare(`DELETE FROM lexicon WHERE id = ?1`).bind(targetRow.id).run();
}

export async function getLexiconItems(env, table) {
  const token = parseLexiconTableToken(table);
  if (token?.scope === "global") {
    return getSaberLexiconItemsByType(env, token.type);
  }
  await ensureLexiconSeeded(env);
  const rows = await env.DB.prepare(`SELECT id, label FROM ${table} ORDER BY id`).all();
  return rows?.results ?? [];
}

export async function getUserLexiconItems(env, table, userId) {
  const token = parseLexiconTableToken(table);
  if (token?.scope === "user" && token.family === "saber") {
    return getSaberLexiconItemsByType(env, token.type, { userId });
  }
  if (token?.scope === "user" && token.family === "classic") {
    return getClassicUserLexiconItemsByType(env, token.type, { userId });
  }
  await ensureLexiconSeeded(env);
  const rows = await env.DB
    .prepare(`SELECT id, label FROM ${table} WHERE user_id = ?1 ORDER BY id`)
    .bind(userId)
    .all();
  return rows?.results ?? [];
}

export async function addLexiconItem(env, table, label) {
  const token = parseLexiconTableToken(table);
  if (token?.scope === "global") {
    const parentId = await resolveSaberParentDbId(env, token.type);
    if (!parentId) return null;
    const lexiconId = `custom_${crypto.randomUUID()}`;
    const result = await env.DB
      .prepare(
        `INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
         VALUES (?1, ?2, ?3, NULL, NULL, 'custom')
         RETURNING id, name`,
      )
      .bind(lexiconId, parentId, label)
      .first();
    return result ? { id: Number(result.id), label: String(result.name ?? label) } : null;
  }
  await ensureLexiconSeeded(env);
  const result = await env.DB.prepare(`INSERT INTO ${table} (label) VALUES (?1) RETURNING id, label`)
    .bind(label)
    .first();
  return result ?? null;
}

export async function addUserLexiconItem(env, table, userId, label) {
  const token = parseLexiconTableToken(table);
  if (token?.scope === "user" && token.family === "saber") {
    const parentId = await resolveSaberParentDbId(env, token.type, { userId });
    if (!parentId) return null;
    const lexiconId = `user_${userId}_${crypto.randomUUID()}`;
    const result = await env.DB
      .prepare(
        `INSERT INTO user_lexicon_light_saber (user_id, lexicon_id, parent_id, name, description, deleted_at, source)
         VALUES (?1, ?2, ?3, ?4, NULL, NULL, 'custom')
         RETURNING id, name`,
      )
      .bind(userId, lexiconId, parentId, label)
      .first();
    return result ? { id: Number(result.id), label: String(result.name ?? label) } : null;
  }
  if (token?.scope === "user" && token.family === "classic") {
    const resolvedType = resolveClassicV2Type(token.type);
    if (!resolvedType) return null;
    const lexiconId = `${resolvedType}:${crypto.randomUUID()}`;
    const result = await env.DB
      .prepare(
        `INSERT INTO user_lexicon_classic (user_id, lexicon_id, parent_id, name, description, deleted_at, source)
         VALUES (?1, ?2, NULL, ?3, NULL, NULL, 'custom')
         RETURNING id, name`,
      )
      .bind(userId, lexiconId, label)
      .first();
    return result
      ? { id: Number(result.id), label: String(result.name ?? label) }
      : null;
  }
  await ensureLexiconSeeded(env);
  const result = await env.DB
    .prepare(`INSERT INTO ${table} (user_id, label) VALUES (?1, ?2) RETURNING id, label`)
    .bind(userId, label)
    .first();
  return result ?? null;
}

export async function deleteLexiconItem(env, table, id) {
  const token = parseLexiconTableToken(table);
  if (token?.scope === "global") {
    await ensureLexiconSeeded(env);
    await env.DB
      .prepare(`DELETE FROM lexicon_light_saber WHERE id = ?1`)
      .bind(id)
      .run();
    return;
  }
  await ensureLexiconSeeded(env);
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(id).run();
}

export async function deleteUserLexiconItem(env, table, userId, id) {
  const token = parseLexiconTableToken(table);
  if (token?.scope === "user" && token.family === "saber") {
    await ensureLexiconSeeded(env);
    await env.DB
      .prepare(`DELETE FROM user_lexicon_light_saber WHERE id = ?1 AND user_id = ?2`)
      .bind(id, userId)
      .run();
    return;
  }
  if (token?.scope === "user" && token.family === "classic") {
    await ensureLexiconSeeded(env);
    await env.DB
      .prepare(`DELETE FROM user_lexicon_classic WHERE id = ?1 AND user_id = ?2`)
      .bind(id, userId)
      .run();
    return;
  }
  await ensureLexiconSeeded(env);
  await env.DB
    .prepare(`DELETE FROM ${table} WHERE id = ?1 AND user_id = ?2`)
    .bind(id, userId)
    .run();
}

export async function hasLexiconLabel(env, table, label) {
  const token = parseLexiconTableToken(table);
  if (token?.scope === "global") {
    const items = await getSaberLexiconItemsByType(env, token.type);
    return items.some((item) => normalizeLexiconLabel(item.label) === normalizeLexiconLabel(label));
  }
  await ensureLexiconSeeded(env);
  const row = await env.DB
    .prepare(`SELECT id FROM ${table} WHERE lower(label) = lower(?1) LIMIT 1`)
    .bind(label)
    .first();
  return Boolean(row?.id);
}

export async function hasUserLexiconLabel(env, table, userId, label) {
  const token = parseLexiconTableToken(table);
  if (token?.scope === "user" && token.family === "saber") {
    const items = await getSaberLexiconItemsByType(env, token.type, { userId });
    return items.some((item) => normalizeLexiconLabel(item.label) === normalizeLexiconLabel(label));
  }
  if (token?.scope === "user" && token.family === "classic") {
    const resolvedType = resolveClassicV2Type(token.type);
    if (!resolvedType) return false;
    const prefix = `${resolvedType}:`;
    const row = await env.DB
      .prepare(
        `SELECT id
         FROM user_lexicon_classic
         WHERE user_id = ?1
           AND deleted_at IS NULL
           AND lexicon_id LIKE ?2
           AND lower(name) = lower(?3)
         LIMIT 1`,
      )
      .bind(userId, `${prefix}%`, label)
      .first();
    return Boolean(row?.id);
  }
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
       VALUES (?1, ?2, ?3)`,
    )
    .bind(userId, type, label)
    .run();
}

export async function removeFavorite(env, userId, type, label) {
  await ensureLexiconSeeded(env);
  await env.DB
    .prepare(
      `DELETE FROM user_lexicon_favorites WHERE user_id = ?1 AND type = ?2 AND lower(label) = lower(?3)`,
    )
    .bind(userId, type, label)
    .run();
}

export async function isFavorite(env, userId, type, label) {
  await ensureLexiconSeeded(env);
  const row = await env.DB
    .prepare(
      `SELECT id FROM user_lexicon_favorites WHERE user_id = ?1 AND type = ?2 AND lower(label) = lower(?3) LIMIT 1`,
    )
    .bind(userId, type, label)
    .first();
  return Boolean(row?.id);
}

export async function replaceLexicon(env, lexicon) {
  await replaceLexiconByKey(env, "classic-v2", lexicon);
}

async function getTreeRowsFromTable(env, table, { userId = null, includeDeleted = false } = {}) {
  await ensureLexiconSeeded(env);
  const whereParts = [];
  const binds = [];
  if (table === "user_lexicon_light_saber" || table === "user_lexicon_classic") {
    whereParts.push("user_id = ?1");
    binds.push(userId);
    if (!includeDeleted) whereParts.push("deleted_at IS NULL");
  } else if (!includeDeleted) {
    whereParts.push("deleted_at IS NULL");
  }
  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const sql = `SELECT id, lexicon_id, parent_id, name, description FROM ${table} ${where} ORDER BY id`;
  const stmt = env.DB.prepare(sql);
  const rows = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return rows?.results ?? [];
}

async function getClassicUserLexiconItemsByType(env, type, { userId }) {
  await ensureLexiconSeeded(env);
  const resolvedType = resolveClassicV2Type(type);
  if (!resolvedType) return [];
  const prefix = `${resolvedType}:`;
  const rows = await env.DB
    .prepare(
      `SELECT id, lexicon_id, name, description
       FROM user_lexicon_classic
       WHERE user_id = ?1
         AND deleted_at IS NULL
         AND lexicon_id LIKE ?2
       ORDER BY name COLLATE NOCASE`,
    )
    .bind(userId, `${prefix}%`)
    .all();
  return (rows?.results ?? []).map((row) => ({
    id: Number(row.id),
    label: String(row.name ?? "").trim(),
    description: row?.description == null ? "" : String(row.description).trim(),
    lexicon_id: String(row.lexicon_id ?? "").trim(),
    row_id: Number(row.id),
  }));
}

async function getSaberLexiconItemsByType(env, type, { userId = null } = {}) {
  const table = userId == null ? "lexicon_light_saber" : "user_lexicon_light_saber";
  const rows = await getTreeRowsFromTable(env, table, { userId });
  const parentIds = getSaberTypeParentIds(type);
  const leaves = collectLeafNodesByRootLexiconIds(rows, new Set(parentIds));
  return leaves.map((item, index) => ({
    id: index + 1,
    label: item.label,
    description: item.description ?? "",
    lexicon_id: item.lexicon_id,
    row_id: item.id,
  }));
}

async function resolveSaberParentDbId(env, type, { userId = null } = {}) {
  const table = userId == null ? "lexicon_light_saber" : "user_lexicon_light_saber";
  const parentIds = getSaberTypeParentIds(type);
  for (const lexiconId of parentIds) {
    const sql =
      userId == null
        ? `SELECT id FROM ${table} WHERE lexicon_id = ?1 AND deleted_at IS NULL LIMIT 1`
        : `SELECT id FROM ${table} WHERE user_id = ?1 AND lexicon_id = ?2 AND deleted_at IS NULL LIMIT 1`;
    const stmt = env.DB.prepare(sql);
    // eslint-disable-next-line no-await-in-loop
    const row =
      userId == null
        ? await stmt.bind(lexiconId).first()
        : await stmt.bind(userId, lexiconId).first();
    if (row?.id) return Number(row.id);
  }
  return null;
}

async function replaceRecursiveLexiconInTable(
  env,
  recursiveLexicon,
  {
    table = "lexicon",
    applyClassicCompat = true,
    softDeleteEnabled = true,
  } = {},
) {
  await ensureLexiconSchema(env);
  const normalizedTree = normalizeRecursiveLexiconSeed(recursiveLexicon, {
    applyClassicCompat,
  });
  if (!normalizedTree) return;

  if (!softDeleteEnabled) {
    await env.DB.prepare(`DELETE FROM ${table}`).run();

    async function insertNode(node, parentId = null) {
      const inserted = await env.DB
        .prepare(
          `INSERT INTO ${table} (lexicon_id, parent_id, name, description)
           VALUES (?1, ?2, ?3, ?4)
           RETURNING id`,
        )
        .bind(node.lexiconId, parentId, node.name, node.description || null)
        .first();
      const nodeId = inserted?.id;
      if (!nodeId || !Array.isArray(node.children)) return;
      for (const child of node.children) {
        // eslint-disable-next-line no-await-in-loop
        await insertNode(child, nodeId);
      }
    }

    await insertNode(normalizedTree, null);
    return;
  }

  const seedEntries = [];
  function walk(node, parentLexiconId = null) {
    seedEntries.push({
      lexiconId: node.lexiconId,
      parentLexiconId,
      name: node.name,
      description: node.description || null,
    });
    for (const child of node.children ?? []) {
      walk(child, node.lexiconId);
    }
  }
  walk(normalizedTree, null);

  const knownSeedIds = new Set(seedEntries.map((entry) => entry.lexiconId));
  const dbIdByLexiconId = new Map();

  for (const entry of seedEntries) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await env.DB
      .prepare(`SELECT id FROM ${table} WHERE lexicon_id = ?1 LIMIT 1`)
      .bind(entry.lexiconId)
      .first();

    let parentId = null;
    if (entry.parentLexiconId) {
      parentId = dbIdByLexiconId.get(entry.parentLexiconId) ?? null;
      if (!parentId) {
        // eslint-disable-next-line no-await-in-loop
        const parent = await env.DB
          .prepare(`SELECT id FROM ${table} WHERE lexicon_id = ?1 LIMIT 1`)
          .bind(entry.parentLexiconId)
          .first();
        parentId = parent?.id ?? null;
      }
    }

    if (existing?.id) {
      // eslint-disable-next-line no-await-in-loop
      await env.DB
        .prepare(
          `UPDATE ${table}
           SET parent_id = ?1,
               name = ?2,
               description = ?3,
               deleted_at = NULL,
               source = 'seed'
           WHERE id = ?4`,
        )
        .bind(parentId, entry.name, entry.description, existing.id)
        .run();
      dbIdByLexiconId.set(entry.lexiconId, existing.id);
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const inserted = await env.DB
      .prepare(
        `INSERT INTO ${table} (lexicon_id, parent_id, name, description, deleted_at, source)
         VALUES (?1, ?2, ?3, ?4, NULL, 'seed')
         RETURNING id`,
      )
      .bind(entry.lexiconId, parentId, entry.name, entry.description)
      .first();
    if (inserted?.id) {
      dbIdByLexiconId.set(entry.lexiconId, inserted.id);
    }
  }

  const allRows = await env.DB
    .prepare(`SELECT id, lexicon_id, source, deleted_at FROM ${table}`)
    .all();
  for (const row of allRows?.results ?? []) {
    const lexiconId = String(row?.lexicon_id ?? "").trim();
    if (!lexiconId) continue;
    if (knownSeedIds.has(lexiconId)) continue;
    if (String(row?.source ?? "seed") !== "seed") continue;
    if (row?.deleted_at) continue;
    // eslint-disable-next-line no-await-in-loop
    await env.DB
      .prepare(`UPDATE ${table} SET deleted_at = ?1 WHERE id = ?2`)
      .bind(new Date().toISOString(), row.id)
      .run();
  }
}

async function replaceRecursiveLexicon(env, recursiveLexicon) {
  const softDeleteEnabled = await hasLexiconSoftDeleteSupport(env);
  await replaceRecursiveLexiconInTable(env, recursiveLexicon, {
    table: "lexicon",
    applyClassicCompat: true,
    softDeleteEnabled,
  });
}

async function getRecursiveLexiconRows(env, { includeDeleted = false } = {}) {
  await ensureLexiconSeeded(env);
  const softDeleteEnabled = await hasLexiconSoftDeleteSupport(env);
  const where =
    includeDeleted || !softDeleteEnabled ? "" : "WHERE deleted_at IS NULL";
  const rows = await env.DB
    .prepare(
      `SELECT id, lexicon_id, parent_id, name, description
       FROM lexicon
       ${where}
       ORDER BY id`,
    )
    .all();
  return rows?.results ?? [];
}

export async function getClassicV2LexiconReferenceIndex(env) {
  const recursiveRows = await getRecursiveLexiconRows(env);
  const recursiveBuckets = buildClassicV2LexiconBucketsFromRecursiveRows(
    recursiveRows,
  );
  return buildClassicV2LexiconReferenceIndexFromBuckets(recursiveBuckets);
}

export async function getLexiconNameByIdMap(env) {
  const rows = await getRecursiveLexiconRows(env, { includeDeleted: true });
  const map = new Map();
  for (const row of rows ?? []) {
    const lexiconId = String(row?.lexicon_id ?? "").trim();
    const name = String(row?.name ?? "").trim();
    if (!lexiconId || !name || map.has(lexiconId)) continue;
    map.set(lexiconId, name);
  }
  return map;
}

export async function replaceLexiconByKey(env, lexiconKey, lexicon) {
  await ensureLexiconSchema(env);
  const resolvedLexiconKey = lexiconKey === "classic" ? "classic-v2" : lexiconKey;
  if (resolvedLexiconKey === "sabre-laser" && isRecursiveLexiconPayload(lexicon)) {
    await replaceRecursiveLexiconInTable(env, lexicon, {
      table: "lexicon_light_saber",
      applyClassicCompat: false,
      softDeleteEnabled: true,
    });
    return;
  }
  if (resolvedLexiconKey === "classic-v2" && isRecursiveLexiconPayload(lexicon)) {
    await replaceRecursiveLexicon(env, lexicon);
    return;
  }

  const tables = LEXICON_TABLES[resolvedLexiconKey];
  if (!tables) return;
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
  const resolvedLexiconKey = lexiconKey === "classic" ? "classic-v2" : lexiconKey;
  let lexicon = null;
  const tables = LEXICON_TABLES[resolvedLexiconKey];

  if (resolvedLexiconKey === "classic-v2") {
    const recursiveRows = await getRecursiveLexiconRows(env);
    return buildRecursiveLexiconFromRows(recursiveRows);
  }
  if (resolvedLexiconKey === "sabre-laser") {
    const rows = await getTreeRowsFromTable(env, "lexicon_light_saber");
    return buildRecursiveLexiconFromRows(rows);
  }

  if (!lexicon && tables) {
    const entries = await Promise.all(
      Object.entries(tables).map(async ([key, table]) => [key, await getLabels(env, table)]),
    );
    lexicon = Object.fromEntries(entries);
  }

  if (!lexicon) return {};

  return lexicon;
}

export async function getLexicon(env) {
  return getLexiconByKey(env, "classic-v2");
}
