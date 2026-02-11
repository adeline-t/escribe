import {
  getLexicon,
  getLexiconByKey,
  getLexiconItems,
  getUserLexiconItems,
  addLexiconItem,
  addUserLexiconItem,
  deleteLexiconItem,
  deleteUserLexiconItem,
  hasLexiconLabel,
  hasUserLexiconLabel,
  getClassicV2LexiconItems,
  hasClassicV2LexiconLabel,
  addClassicV2LexiconItem,
  deleteClassicV2LexiconItem,
  replaceLexiconByKey,
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
} from "../db.js";
import { jsonResponse, buildCorsHeaders, getSecurityHeaders } from "../utils/http.js";
import { requireAuth, requireRole } from "../auth.js";
import { logAudit } from "../audit.js";

const CLASSIC_V2_ALLOWED_TYPES = new Set([
  "offensive",
  "action",
  "defensive",
  "cible",
  "target",
  "deplacement",
  "movement",
  "deplacement_complement",
  "movement_complement",
  "movement-complement",
  "parade-numero",
  "guard-number",
  "parade-attribut",
  "guard-attribute",
  "defense-attribut",
  "defense-attribute",
  "attributs_defense",
  "attributs_defensifs",
  "attaque-attribut",
  "attack-attribute",
]);

const NEW_USER_TYPE_MAP = {
  offensive: "user_lexicon_classic:offensive",
  action: "user_lexicon_classic:action",
  defensive: "user_lexicon_classic:defensive",
  cible: "user_lexicon_classic:cible",
  target: "user_lexicon_classic:target",
  deplacement: "user_lexicon_classic:deplacement",
  movement: "user_lexicon_classic:movement",
  deplacement_complement: "user_lexicon_classic:deplacement_complement",
  movement_complement: "user_lexicon_classic:movement_complement",
  "movement-complement": "user_lexicon_classic:movement-complement",
  "parade-numero": "user_lexicon_classic:parade-numero",
  "guard-number": "user_lexicon_classic:guard-number",
  "parade-attribut": "user_lexicon_classic:parade-attribut",
  "guard-attribute": "user_lexicon_classic:guard-attribute",
  "defense-attribut": "user_lexicon_classic:defense-attribut",
  "defense-attribute": "user_lexicon_classic:defense-attribute",
  attributs_defense: "user_lexicon_classic:attributs_defense",
  attributs_defensifs: "user_lexicon_classic:attributs_defensifs",
  "attaque-attribut": "user_lexicon_classic:attaque-attribut",
  "attack-attribute": "user_lexicon_classic:attack-attribute"
};

const SABRE_TYPE_MAP = {
  armes: "lexicon_light_saber:armes",
  weapons: "lexicon_light_saber:armes",
  postures_base: "lexicon_light_saber:postures_base",
  garde_principale: "lexicon_light_saber:garde_principale",
  cibles: "lexicon_light_saber:cibles",
  targets: "lexicon_light_saber:cibles",
  actions_offensives: "lexicon_light_saber:actions_offensives",
  techniques_offensives: "lexicon_light_saber:techniques_offensives",
  offensive_techniques: "lexicon_light_saber:techniques_offensives",
  "offensive-techniques": "lexicon_light_saber:techniques_offensives",
  attributs_attaque: "lexicon_light_saber:attributs_attaque",
  attributs_offensifs: "lexicon_light_saber:attributs_offensifs",
  offensive_attributes: "lexicon_light_saber:attributs_offensifs",
  "offensive-attributes": "lexicon_light_saber:attributs_offensifs",
  actions_defensives: "lexicon_light_saber:actions_defensives",
  techniques_defensives: "lexicon_light_saber:techniques_defensives",
  defensive_techniques: "lexicon_light_saber:techniques_defensives",
  "defensive-techniques": "lexicon_light_saber:techniques_defensives",
  attributs_defense: "lexicon_light_saber:attributs_defense",
  attributs_defensifs: "lexicon_light_saber:attributs_defensifs",
  defensive_attributes: "lexicon_light_saber:attributs_defensifs",
  "defensive-attributes": "lexicon_light_saber:attributs_defensifs",
  preparations: "lexicon_light_saber:preparations",
  deplacements: "lexicon_light_saber:deplacements",
  movements: "lexicon_light_saber:deplacements"
};

const SABRE_USER_TYPE_MAP = {
  armes: "user_lexicon_light_saber:armes",
  weapons: "user_lexicon_light_saber:armes",
  postures_base: "user_lexicon_light_saber:postures_base",
  garde_principale: "user_lexicon_light_saber:garde_principale",
  cibles: "user_lexicon_light_saber:cibles",
  targets: "user_lexicon_light_saber:cibles",
  actions_offensives: "user_lexicon_light_saber:actions_offensives",
  techniques_offensives: "user_lexicon_light_saber:techniques_offensives",
  offensive_techniques: "user_lexicon_light_saber:techniques_offensives",
  "offensive-techniques": "user_lexicon_light_saber:techniques_offensives",
  attributs_attaque: "user_lexicon_light_saber:attributs_attaque",
  attributs_offensifs: "user_lexicon_light_saber:attributs_offensifs",
  offensive_attributes: "user_lexicon_light_saber:attributs_offensifs",
  "offensive-attributes": "user_lexicon_light_saber:attributs_offensifs",
  actions_defensives: "user_lexicon_light_saber:actions_defensives",
  techniques_defensives: "user_lexicon_light_saber:techniques_defensives",
  defensive_techniques: "user_lexicon_light_saber:techniques_defensives",
  "defensive-techniques": "user_lexicon_light_saber:techniques_defensives",
  attributs_defense: "user_lexicon_light_saber:attributs_defense",
  attributs_defensifs: "user_lexicon_light_saber:attributs_defensifs",
  defensive_attributes: "user_lexicon_light_saber:attributs_defensifs",
  "defensive-attributes": "user_lexicon_light_saber:attributs_defensifs",
  preparations: "user_lexicon_light_saber:preparations",
  deplacements: "user_lexicon_light_saber:deplacements",
  movements: "user_lexicon_light_saber:deplacements"
};

const FAVORITE_TYPES = {
  classic: CLASSIC_V2_ALLOWED_TYPES,
  "classic-v2": CLASSIC_V2_ALLOWED_TYPES,
  "sabre-laser": new Set(Object.keys(SABRE_TYPE_MAP))
};

const CLASSIC_V2_CATALOG_TYPES = [
  "offensive",
  "attaque-attribut",
  "cible",
  "defensive",
  "defense-attribut",
  "parade-numero",
  "parade-attribut",
  "action",
  "deplacement",
  "deplacement_complement",
];

const SABRE_CATALOG_TYPES = [
  "cibles",
  "postures_base",
  "garde_principale",
  "deplacements",
  "actions_offensives",
  "attributs_attaque",
  "actions_defensives",
  "attributs_defense",
  "preparations",
  "armes",
];

const TYPE_ALIASES = {
  offensive: ["offensive"],
  action: ["action"],
  defensive: ["defensive"],
  target: ["target", "cible"],
  deplacement: ["deplacement", "movement"],
  deplacement_complement: [
    "deplacement_complement",
    "movement_complement",
    "movement-complement",
  ],
  parade_numero: ["parade_numero", "parade-numero", "guard-number"],
  parade_attribut: ["parade_attribut", "parade-attribut", "guard-attribute"],
  defense_attribut: [
    "defense_attribut",
    "defense-attribut",
    "defense-attribute",
    "attributs_defense",
    "attributs_defensifs",
  ],
  attaque_attribut: [
    "attaque_attribut",
    "attaque-attribut",
    "attack-attribute",
  ],
  garde_principale: ["garde_principale"],
  postures_base: ["postures_base"],
  armes: ["armes", "weapons"],
};

function normalizeLookupToken(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeLexiconId(value, fallbackPrefix = "legacy") {
  const explicit = String(value ?? "").trim();
  if (explicit) return explicit;
  return `${fallbackPrefix}:${crypto.randomUUID()}`;
}

function normalizeCatalogItem(item, fallbackPrefix = "legacy") {
  const label = String(item?.label ?? item?.name ?? "").trim();
  if (!label) return null;
  return {
    id: Number(item?.id ?? 0) || 0,
    label,
    description:
      item?.description == null ? "" : String(item.description).trim(),
    lexicon_id: normalizeLexiconId(item?.lexicon_id, fallbackPrefix),
  };
}

function mergeItemsByLabel(primaryItems, secondaryItems) {
  const out = [];
  const byLabel = new Map();
  for (const raw of primaryItems ?? []) {
    const item = normalizeCatalogItem(raw);
    if (!item) continue;
    const key = normalizeLookupToken(item.label);
    if (!key || byLabel.has(key)) continue;
    byLabel.set(key, out.length);
    out.push(item);
  }
  for (const raw of secondaryItems ?? []) {
    const item = normalizeCatalogItem(raw);
    if (!item) continue;
    const key = normalizeLookupToken(item.label);
    if (!key) continue;
    if (!byLabel.has(key)) {
      byLabel.set(key, out.length);
      out.push(item);
      continue;
    }
    const index = byLabel.get(key);
    const existing = out[index];
    if (!existing.description && item.description) {
      out[index] = { ...existing, description: item.description };
    }
  }
  return out;
}

async function listTypeItemsByScope(env, { lexiconKey, type, scope, userId }) {
  const { typeMap, userTypeMap } = getTypeMaps(lexiconKey);
  const isClassicV2 = lexiconKey === "classic-v2" || lexiconKey === "classic";
  const table = typeMap?.[type];
  const userTable = userTypeMap?.[type];
  const knownType = isClassicV2
    ? CLASSIC_V2_ALLOWED_TYPES.has(type)
    : Boolean(table);
  if (!knownType) return [];

  if (scope === "global") {
    const items = isClassicV2
      ? await getClassicV2LexiconItems(env, type)
      : await getLexiconItems(env, table);
    return (items ?? [])
      .map((item) => normalizeCatalogItem(item, `legacy:${type}`))
      .filter(Boolean);
  }

  if (scope === "personal") {
    if (!userTable || !Number.isFinite(Number(userId))) return [];
    const items = await getUserLexiconItems(env, userTable, userId);
    return (items ?? [])
      .map((item) => normalizeCatalogItem(item, `user:${type}`))
      .filter(Boolean);
  }

  if (scope === "all") {
    const [personalItems, globalItems] = await Promise.all([
      listTypeItemsByScope(env, {
        lexiconKey,
        type,
        scope: "personal",
        userId,
      }),
      listTypeItemsByScope(env, {
        lexiconKey,
        type,
        scope: "global",
        userId,
      }),
    ]);
    return mergeItemsByLabel(personalItems, globalItems);
  }

  return [];
}

function buildTermEntries(bucket, items) {
  const out = [];
  const seen = new Set();
  for (const item of items ?? []) {
    const label = String(item?.label ?? "").trim();
    if (!label) continue;
    const key = normalizeLookupToken(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: normalizeLexiconId(item?.lexicon_id, `legacy:${bucket}`),
      label,
      description:
        item?.description == null ? "" : String(item.description).trim(),
    });
  }
  return out;
}

function buildTermLookup(entriesByType) {
  const termById = {};
  const idByNormalizedLabelByType = {};

  for (const [type, entries] of Object.entries(entriesByType)) {
    const aliases = TYPE_ALIASES[type] ?? [type];
    const maps = aliases.map(() => ({}));
    for (const entry of entries ?? []) {
      const id = String(entry?.id ?? "").trim();
      const label = String(entry?.label ?? "").trim();
      const description =
        entry?.description == null ? "" : String(entry.description).trim();
      if (!id || !label) continue;
      if (!termById[id]) {
        termById[id] = { id, label, type, description };
      } else if (!termById[id].description && description) {
        termById[id] = { ...termById[id], description };
      }
      const normalized = normalizeLookupToken(label);
      if (!normalized) continue;
      for (const aliasMap of maps) {
        if (!aliasMap[normalized]) aliasMap[normalized] = id;
      }
    }
    aliases.forEach((alias, index) => {
      idByNormalizedLabelByType[alias] = maps[index];
    });
  }

  return { termById, idByNormalizedLabelByType };
}

function entryIds(entries) {
  return (entries ?? []).map((entry) => entry.id);
}

function buildClassicPreparedLexicon(itemsByType) {
  const offensive = buildTermEntries("offensive", itemsByType.offensive);
  const action = buildTermEntries("action", itemsByType.action);
  const defensive = buildTermEntries("defensive", itemsByType.defensive);
  const target = buildTermEntries("target", itemsByType.cible);
  const movement = buildTermEntries("deplacement", itemsByType.deplacement);
  const movementComplement = buildTermEntries(
    "deplacement_complement",
    itemsByType.deplacement_complement,
  );
  const paradeNumber = buildTermEntries(
    "parade_numero",
    itemsByType["parade-numero"],
  );
  const paradeAttribute = buildTermEntries(
    "parade_attribut",
    itemsByType["parade-attribut"],
  );
  const defenseAttribute = buildTermEntries(
    "defense_attribut",
    itemsByType["defense-attribut"],
  );
  const attackAttribute = buildTermEntries(
    "attaque_attribut",
    itemsByType["attaque-attribut"],
  );
  const movementMerged = [...movement, ...movementComplement];

  const entriesByType = {
    offensive,
    action,
    defensive,
    target,
    deplacement: movement,
    deplacement_complement: movementComplement,
    parade_numero: paradeNumber,
    parade_attribut: paradeAttribute,
    defense_attribut: defenseAttribute,
    attaque_attribut: attackAttribute,
  };
  const { termById, idByNormalizedLabelByType } = buildTermLookup(entriesByType);

  return {
    offensive: entryIds(offensive),
    action: entryIds(action),
    defensive: entryIds(defensive),
    target: entryIds(target),
    cible: entryIds(target),
    attackMove: entryIds(movementMerged),
    defendMove: entryIds(movementMerged),
    attackMoveBase: entryIds(movement),
    attackMoveComplement: entryIds(movementComplement),
    paradeNumber: entryIds(paradeNumber),
    paradeAttribute: entryIds(paradeAttribute),
    defenseAttribute: entryIds(defenseAttribute),
    attackAttribute: entryIds(attackAttribute),
    preparationTypes: entryIds(action),
    termEntries: entriesByType,
    termById,
    idByNormalizedLabelByType,
  };
}

function buildSabrePreparedLexicon(itemsByType) {
  const mainGuard = buildTermEntries(
    "garde_principale",
    itemsByType.garde_principale,
  );
  const basePosture = buildTermEntries("postures_base", itemsByType.postures_base);
  const offensive = buildTermEntries(
    "offensive",
    itemsByType.actions_offensives,
  );
  const action = buildTermEntries("action", itemsByType.preparations);
  const defensive = buildTermEntries(
    "defensive",
    itemsByType.actions_defensives,
  );
  const target = buildTermEntries("target", itemsByType.cibles);
  const movement = buildTermEntries("deplacement", itemsByType.deplacements);
  const attackAttribute = buildTermEntries(
    "attaque_attribut",
    itemsByType.attributs_attaque,
  );
  const defenseAttribute = buildTermEntries(
    "defense_attribut",
    itemsByType.attributs_defense,
  );
  const weapons = buildTermEntries("armes", itemsByType.armes);

  const entriesByType = {
    garde_principale: mainGuard,
    postures_base: basePosture,
    offensive,
    action,
    defensive,
    target,
    deplacement: movement,
    deplacement_complement: [],
    parade_numero: [],
    parade_attribut: [],
    defense_attribut: defenseAttribute,
    attaque_attribut: attackAttribute,
    armes: weapons,
  };
  const { termById, idByNormalizedLabelByType } = buildTermLookup(entriesByType);

  return {
    mainGuard: entryIds(mainGuard),
    basePosture: entryIds(basePosture),
    offensive: entryIds(offensive),
    action: entryIds(action),
    defensive: entryIds(defensive),
    target: entryIds(target),
    cible: entryIds(target),
    attackMove: entryIds(movement),
    defendMove: entryIds(movement),
    attackMoveBase: entryIds(movement),
    attackMoveComplement: [],
    paradeNumber: [],
    paradeAttribute: [],
    defenseAttribute: entryIds(defenseAttribute),
    attackAttribute: entryIds(attackAttribute),
    preparationTypes: entryIds(action),
    armes: entryIds(weapons),
    termEntries: entriesByType,
    termById,
    idByNormalizedLabelByType,
  };
}

async function loadCatalogByType(env, { lexiconKey, scope, userId }) {
  const catalogTypes =
    lexiconKey === "sabre-laser"
      ? SABRE_CATALOG_TYPES
      : CLASSIC_V2_CATALOG_TYPES;
  const entries = await Promise.all(
    catalogTypes.map(async (type) => {
      const items = await listTypeItemsByScope(env, {
        lexiconKey,
        type,
        scope,
        userId,
      });
      return [type, items];
    }),
  );
  return Object.fromEntries(entries);
}

const LEXICON_CACHE_TTL_SECONDS = 60 * 60 * 24;
const LEXICON_CACHE_TTL_MS = LEXICON_CACHE_TTL_SECONDS * 1000;
const lexiconResponseCache = new Map();
const LEXICON_CACHE_ENABLED = false;

function normalizeLexiconCacheKey(lexiconKey) {
  return lexiconKey === "classic" ? "classic-v2" : lexiconKey;
}

async function ensureLexiconCacheRevisionTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS lexicon_cache_revision (
      lexicon_key TEXT PRIMARY KEY,
      revision INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ).run();
}

async function getLexiconCacheRevision(env, cacheKey) {
  await ensureLexiconCacheRevisionTable(env);
  const row = await env.DB
    .prepare(
      "SELECT revision FROM lexicon_cache_revision WHERE lexicon_key = ?1 LIMIT 1",
    )
    .bind(cacheKey)
    .first();
  return Number(row?.revision ?? 0);
}

async function bumpLexiconCacheRevision(env, cacheKey) {
  await ensureLexiconCacheRevisionTable(env);
  await env.DB
    .prepare(
      `INSERT INTO lexicon_cache_revision (lexicon_key, revision, updated_at)
       VALUES (?1, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(lexicon_key) DO UPDATE SET
         revision = revision + 1,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(cacheKey)
    .run();
}

function createWeakEtag(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `W/\"${value.length.toString(16)}-${(hash >>> 0).toString(16)}\"`;
}

function getCachedLexicon(cacheKey, revision) {
  const entry = lexiconResponseCache.get(cacheKey);
  if (!entry) return null;
  if (entry.revision !== revision) {
    lexiconResponseCache.delete(cacheKey);
    return null;
  }
  if (Date.now() - entry.cachedAt > LEXICON_CACHE_TTL_MS) {
    lexiconResponseCache.delete(cacheKey);
    return null;
  }
  return entry;
}

function setCachedLexicon(cacheKey, payloadString, revision) {
  const etag = createWeakEtag(payloadString);
  const entry = {
    payloadString,
    etag,
    revision,
    cachedAt: Date.now(),
  };
  lexiconResponseCache.set(cacheKey, entry);
  return entry;
}

function invalidateLexiconCache() {
  lexiconResponseCache.clear();
}

function getLexiconKey(request, body = null) {
  const url = new URL(request.url);
  const lexiconKey =
    body?.lexicon || url.searchParams.get("lexicon") || "classic-v2";
  // Backward compatibility: map legacy key to v2.
  return lexiconKey === "classic" ? "classic-v2" : lexiconKey;
}

function getTypeMaps(lexiconKey) {
  if (lexiconKey === "classic-v2" || lexiconKey === "classic") {
    return { typeMap: null, userTypeMap: NEW_USER_TYPE_MAP };
  }
  if (lexiconKey === "sabre-laser") {
    return { typeMap: SABRE_TYPE_MAP, userTypeMap: SABRE_USER_TYPE_MAP };
  }
  return { typeMap: null, userTypeMap: NEW_USER_TYPE_MAP };
}

export async function handleLexicon(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method === "GET") {
    const lexiconKey = getLexiconKey(request);
    const cacheKey = normalizeLexiconCacheKey(lexiconKey);

    // Temporary hard disable: always serve fresh lexicon from DB.
    // Kept explicit because form screens were receiving stale terms from cache.
    if (!LEXICON_CACHE_ENABLED) {
      const lexicon =
        cacheKey === "classic-v2"
          ? await getLexicon(env)
          : await getLexiconByKey(env, cacheKey);
      return new Response(JSON.stringify({ lexicon }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          ...getSecurityHeaders(),
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
        },
      });
    }

    const ifNoneMatch = request.headers.get("If-None-Match");
    const revision = await getLexiconCacheRevision(env, cacheKey);

    let cached = getCachedLexicon(cacheKey, revision);
    if (!cached) {
      const lexicon =
        cacheKey === "classic-v2"
          ? await getLexicon(env)
          : await getLexiconByKey(env, cacheKey);
      cached = setCachedLexicon(cacheKey, JSON.stringify({ lexicon }), revision);
    }

    if (ifNoneMatch && ifNoneMatch === cached.etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ...corsHeaders,
          ...getSecurityHeaders(),
          ETag: cached.etag,
          "Cache-Control": `private, max-age=${LEXICON_CACHE_TTL_SECONDS}`,
        },
      });
    }

    return new Response(cached.payloadString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        ...getSecurityHeaders(),
        ETag: cached.etag,
        "Cache-Control": `private, max-age=${LEXICON_CACHE_TTL_SECONDS}`,
      },
    });
  }

  if (request.method === "POST") {
    const session = await requireAuth(request, env);
    if (!requireRole(session, ["admin", "superadmin"])) {
      return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
    }
    const body = await request.json().catch(() => null);
    const lexiconKey = getLexiconKey(request, body);
    const lexicon = body?.lexicon;
    if (!lexicon || typeof lexicon !== "object") {
      return jsonResponse({ error: "invalid_lexicon" }, 400, corsHeaders);
    }
    await replaceLexiconByKey(env, lexiconKey, lexicon);
    await bumpLexiconCacheRevision(env, normalizeLexiconCacheKey(lexiconKey));
    invalidateLexiconCache();
    await logAudit(env, "lexicon.replace", session.user.id, null, { lexicon: lexiconKey });
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

/**
 * Pre-flattened lexicon payload for step forms.
 * Front should consume this payload directly (no heavy normalization needed).
 */
export async function handleLexiconForm(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const lexiconKey = getLexiconKey(request);
  const catalogByType = await loadCatalogByType(env, {
    lexiconKey,
    scope: "global",
    userId: null,
  });
  const prepared =
    lexiconKey === "sabre-laser"
      ? buildSabrePreparedLexicon(catalogByType)
      : buildClassicPreparedLexicon(catalogByType);
  return jsonResponse({ lexicon: prepared }, 200, corsHeaders);
}

/**
 * Aggregated lexicon catalog by type and scope (global/personal/all).
 * Used by Lexicon page to avoid N requests per category.
 */
export async function handleLexiconCatalog(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const session = await requireAuth(request, env);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  }
  const lexiconKey = getLexiconKey(request);
  const url = new URL(request.url);
  const rawScope = String(url.searchParams.get("scope") ?? "global").trim();
  const scope =
    rawScope === "personal" || rawScope === "all" ? rawScope : "global";

  const itemsByType = await loadCatalogByType(env, {
    lexiconKey,
    scope,
    userId: session.user.id,
  });
  const types = Object.entries(itemsByType).map(([key, items]) => ({
    key,
    count: Array.isArray(items) ? items.length : 0,
  }));

  return jsonResponse(
    {
      lexicon: lexiconKey,
      scope,
      types,
      itemsByType,
    },
    200,
    corsHeaders,
  );
}

/** Shared lexicon terms (global scope). */
export async function handleLexiconType(request, env, params) {
  const type = params?.type;
  const corsHeaders = buildCorsHeaders(request, env);
  const lexiconKey = getLexiconKey(request);
  const { typeMap } = getTypeMaps(lexiconKey);
  const table = typeMap?.[type];
  const isClassicV2 = lexiconKey === "classic-v2" || lexiconKey === "classic";
  const knownType = isClassicV2 ? CLASSIC_V2_ALLOWED_TYPES.has(type) : Boolean(table);
  if (!knownType) {
    return jsonResponse({ error: "unknown_type" }, 400, corsHeaders);
  }

  if (request.method === "GET") {
    const items =
      lexiconKey === "classic-v2"
        ? await getClassicV2LexiconItems(env, type)
        : await getLexiconItems(env, table);
    return jsonResponse({ items }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const session = await requireAuth(request, env);
    if (!requireRole(session, ["admin", "superadmin"])) {
      return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
    }
    const body = await request.json().catch(() => null);
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    if (!label) {
      return jsonResponse({ error: "invalid_label" }, 400, corsHeaders);
    }
    const exists =
      lexiconKey === "classic-v2"
        ? await hasClassicV2LexiconLabel(env, type, label)
        : await hasLexiconLabel(env, table, label);
    if (exists) {
      return jsonResponse({ error: "duplicate" }, 409, corsHeaders);
    }
    const item =
      lexiconKey === "classic-v2"
        ? await addClassicV2LexiconItem(env, type, label)
        : await addLexiconItem(env, table, label);
    await logAudit(env, "lexicon.add", session.user.id, null, { type, label, lexicon: lexiconKey });
    return jsonResponse({ item }, 201, corsHeaders);
  }

  if (request.method === "DELETE") {
    const session = await requireAuth(request, env);
    if (!requireRole(session, ["admin", "superadmin"])) {
      return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
    }
    const body = await request.json().catch(() => null);
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
    }
    if (lexiconKey === "classic-v2") {
      await deleteClassicV2LexiconItem(env, type, id);
    } else {
      await deleteLexiconItem(env, table, id);
    }
    await logAudit(env, "lexicon.delete", session.user.id, null, { type, id, lexicon: lexiconKey });
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

/** User-specific lexicon overlays (personal scope). */
export async function handleLexiconPersonal(request, env, params) {
  const type = params?.type;
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const lexiconKey = getLexiconKey(request);
  const { userTypeMap } = getTypeMaps(lexiconKey);
  const table = userTypeMap[type];
  if (!table) {
    return jsonResponse({ error: "unknown_type" }, 400, corsHeaders);
  }

  if (request.method === "GET") {
    const items = await getUserLexiconItems(env, table, session.user.id);
    return jsonResponse({ items }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    if (!label) {
      return jsonResponse({ error: "invalid_label" }, 400, corsHeaders);
    }
    const exists = await hasUserLexiconLabel(env, table, session.user.id, label);
    if (exists) {
      return jsonResponse({ error: "duplicate" }, 409, corsHeaders);
    }
    const item = await addUserLexiconItem(env, table, session.user.id, label);
    await logAudit(env, "lexicon.personal.add", session.user.id, null, { type, label, lexicon: lexiconKey });
    return jsonResponse({ item }, 201, corsHeaders);
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => null);
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
    }
    await deleteUserLexiconItem(env, table, session.user.id, id);
    await logAudit(env, "lexicon.personal.delete", session.user.id, null, { type, id, lexicon: lexiconKey });
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

/** Favorites endpoint for quick-pick terms in UI. */
export async function handleLexiconFavorites(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  if (request.method === "GET") {
    const lexiconKey = getLexiconKey(request);
    const rows = await getFavorites(env, session.user.id);
    const favorites = rows.reduce((acc, row) => {
      const type = row.type || "";
      if (lexiconKey === "classic-v2") {
        if (!type.startsWith("classic-v2:")) return acc;
        const cleanType = type.replace("classic-v2:", "");
        if (!acc[cleanType]) acc[cleanType] = [];
        acc[cleanType].push(row.label);
        return acc;
      }
      if (lexiconKey === "sabre-laser") {
        if (!type.startsWith("sabre-laser:")) return acc;
        const cleanType = type.replace("sabre-laser:", "");
        if (!acc[cleanType]) acc[cleanType] = [];
        acc[cleanType].push(row.label);
        return acc;
      }
      if (type.includes(":") && !type.startsWith("classic:")) return acc;
      const cleanType = type.startsWith("classic:") ? type.replace("classic:", "") : type;
      if (!acc[cleanType]) acc[cleanType] = [];
      acc[cleanType].push(row.label);
      return acc;
    }, {});
    return jsonResponse({ favorites }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const lexiconKey = getLexiconKey(request, body);
    const type = body?.type;
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const favorite = Boolean(body?.favorite);
    const favoriteSet = FAVORITE_TYPES[lexiconKey] || FAVORITE_TYPES.classic;
    if (!favoriteSet.has(type) || !label) {
      return jsonResponse({ error: "invalid_favorite" }, 400, corsHeaders);
    }
    const favoriteType =
      lexiconKey === "sabre-laser"
        ? `sabre-laser:${type}`
        : lexiconKey === "classic-v2"
          ? `classic-v2:${type}`
          : type;
    const exists = await isFavorite(env, session.user.id, favoriteType, label);
    if (favorite && !exists) {
      await addFavorite(env, session.user.id, favoriteType, label);
      await logAudit(env, "lexicon.favorite.add", session.user.id, null, { type, label, lexicon: lexiconKey });
    } else if (!favorite && exists) {
      await removeFavorite(env, session.user.id, favoriteType, label);
      await logAudit(env, "lexicon.favorite.remove", session.user.id, null, { type, label, lexicon: lexiconKey });
    }
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}
