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
  "attaque-attribut",
  "attack-attribute",
]);

const NEW_USER_TYPE_MAP = {
  offensive: "user_nl_offensive",
  action: "user_nl_action",
  defensive: "user_nl_defensive",
  cible: "user_nl_target",
  target: "user_nl_target",
  deplacement: "user_nl_movement",
  movement: "user_nl_movement",
  deplacement_complement: "user_nl_movement_complement",
  movement_complement: "user_nl_movement_complement",
  "movement-complement": "user_nl_movement_complement",
  "parade-numero": "user_nl_guard_number",
  "guard-number": "user_nl_guard_number",
  "parade-attribut": "user_nl_guard_attribute",
  "guard-attribute": "user_nl_guard_attribute",
  "attaque-attribut": "user_nl_attack_attribute",
  "attack-attribute": "user_nl_attack_attribute"
};

const SABRE_TYPE_MAP = {
  armes: "sl_weapons",
  weapons: "sl_weapons",
  phases_choregraphie: "sl_choreography_phases",
  choreography_phases: "sl_choreography_phases",
  "choreography-phases": "sl_choreography_phases",
  cibles: "sl_targets",
  targets: "sl_targets",
  techniques_offensives: "sl_offensive_techniques",
  offensive_techniques: "sl_offensive_techniques",
  "offensive-techniques": "sl_offensive_techniques",
  attributs_offensifs: "sl_offensive_attributes",
  offensive_attributes: "sl_offensive_attributes",
  "offensive-attributes": "sl_offensive_attributes",
  techniques_defensives: "sl_defensive_techniques",
  defensive_techniques: "sl_defensive_techniques",
  "defensive-techniques": "sl_defensive_techniques",
  attributs_defensifs: "sl_defensive_attributes",
  defensive_attributes: "sl_defensive_attributes",
  "defensive-attributes": "sl_defensive_attributes",
  preparations: "sl_preparations",
  deplacements: "sl_movements",
  movements: "sl_movements"
};

const SABRE_USER_TYPE_MAP = {
  armes: "user_sl_weapons",
  weapons: "user_sl_weapons",
  phases_choregraphie: "user_sl_choreography_phases",
  choreography_phases: "user_sl_choreography_phases",
  "choreography-phases": "user_sl_choreography_phases",
  cibles: "user_sl_targets",
  targets: "user_sl_targets",
  techniques_offensives: "user_sl_offensive_techniques",
  offensive_techniques: "user_sl_offensive_techniques",
  "offensive-techniques": "user_sl_offensive_techniques",
  attributs_offensifs: "user_sl_offensive_attributes",
  offensive_attributes: "user_sl_offensive_attributes",
  "offensive-attributes": "user_sl_offensive_attributes",
  techniques_defensives: "user_sl_defensive_techniques",
  defensive_techniques: "user_sl_defensive_techniques",
  "defensive-techniques": "user_sl_defensive_techniques",
  attributs_defensifs: "user_sl_defensive_attributes",
  defensive_attributes: "user_sl_defensive_attributes",
  "defensive-attributes": "user_sl_defensive_attributes",
  preparations: "user_sl_preparations",
  deplacements: "user_sl_movements",
  movements: "user_sl_movements"
};

const FAVORITE_TYPES = {
  classic: CLASSIC_V2_ALLOWED_TYPES,
  "classic-v2": CLASSIC_V2_ALLOWED_TYPES,
  "sabre-laser": new Set(Object.keys(SABRE_TYPE_MAP))
};

const LEXICON_CACHE_TTL_SECONDS = 60 * 60 * 24;
const LEXICON_CACHE_TTL_MS = LEXICON_CACHE_TTL_SECONDS * 1000;
const lexiconResponseCache = new Map();

function normalizeLexiconCacheKey(lexiconKey) {
  return lexiconKey === "classic" ? "classic-v2" : lexiconKey;
}

function createWeakEtag(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `W/\"${value.length.toString(16)}-${(hash >>> 0).toString(16)}\"`;
}

function getCachedLexicon(cacheKey) {
  const entry = lexiconResponseCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > LEXICON_CACHE_TTL_MS) {
    lexiconResponseCache.delete(cacheKey);
    return null;
  }
  return entry;
}

function setCachedLexicon(cacheKey, payloadString) {
  const etag = createWeakEtag(payloadString);
  const entry = {
    payloadString,
    etag,
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
    const ifNoneMatch = request.headers.get("If-None-Match");

    let cached = getCachedLexicon(cacheKey);
    if (!cached) {
      const lexicon =
        cacheKey === "classic-v2"
          ? await getLexicon(env)
          : await getLexiconByKey(env, cacheKey);
      cached = setCachedLexicon(cacheKey, JSON.stringify({ lexicon }));
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
    invalidateLexiconCache();
    await logAudit(env, "lexicon.replace", session.user.id, null, { lexicon: lexiconKey });
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
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
