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
  replaceLexiconByKey,
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  jsonResponse,
  buildCorsHeaders
} from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { logAudit } from "../audit.js";

const CLASSIC_TYPE_MAP = {
  offensive: "offensive",
  action: "action",
  defensive: "defensive",
  cible: "cible",
  "deplacement-attaque": "deplacement_attaque",
  "deplacement-defense": "deplacement_defense",
  "parade-numero": "parade_numero",
  "parade-attribut": "parade_attribut",
  "attaque-attribut": "attaque_attribut"
};

const CLASSIC_USER_TYPE_MAP = {
  offensive: "user_offensive",
  action: "user_action",
  defensive: "user_defensive",
  cible: "user_cible",
  "deplacement-attaque": "user_deplacement_attaque",
  "deplacement-defense": "user_deplacement_defense",
  "parade-numero": "user_parade_numero",
  "parade-attribut": "user_parade_attribut",
  "attaque-attribut": "user_attaque_attribut"
};

const SABRE_TYPE_MAP = {
  armes: "sl_armes",
  phases_choregraphie: "sl_phases_choregraphie",
  cibles: "sl_cibles",
  techniques_offensives: "sl_techniques_offensives",
  attributs_offensifs: "sl_attributs_offensifs",
  techniques_defensives: "sl_techniques_defensives",
  attributs_defensifs: "sl_attributs_defensifs",
  preparations: "sl_preparations",
  deplacements: "sl_deplacements"
};

const SABRE_USER_TYPE_MAP = {
  armes: "user_sl_armes",
  phases_choregraphie: "user_sl_phases_choregraphie",
  cibles: "user_sl_cibles",
  techniques_offensives: "user_sl_techniques_offensives",
  attributs_offensifs: "user_sl_attributs_offensifs",
  techniques_defensives: "user_sl_techniques_defensives",
  attributs_defensifs: "user_sl_attributs_defensifs",
  preparations: "user_sl_preparations",
  deplacements: "user_sl_deplacements"
};

const FAVORITE_TYPES = {
  classic: new Set(Object.keys(CLASSIC_TYPE_MAP)),
  "sabre-laser": new Set(Object.keys(SABRE_TYPE_MAP))
};

function getLexiconKey(request, body = null) {
  const url = new URL(request.url);
  return body?.lexicon || url.searchParams.get("lexicon") || "classic";
}

function getTypeMaps(lexiconKey) {
  if (lexiconKey === "sabre-laser") {
    return { typeMap: SABRE_TYPE_MAP, userTypeMap: SABRE_USER_TYPE_MAP };
  }
  return { typeMap: CLASSIC_TYPE_MAP, userTypeMap: CLASSIC_USER_TYPE_MAP };
}

export async function handleLexicon(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method === "GET") {
    const lexiconKey = getLexiconKey(request);
    const lexicon = lexiconKey === "classic"
      ? await getLexicon(env)
      : await getLexiconByKey(env, lexiconKey);
    return jsonResponse({ lexicon }, 200, corsHeaders);
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
    await logAudit(env, "lexicon.replace", session.user.id, null, { lexicon: lexiconKey });
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handleLexiconType(request, env, params) {
  const type = params?.type;
  const corsHeaders = buildCorsHeaders(request, env);
  const lexiconKey = getLexiconKey(request);
  const { typeMap } = getTypeMaps(lexiconKey);
  const table = typeMap[type];
  if (!table) {
    return jsonResponse({ error: "unknown_type" }, 400, corsHeaders);
  }

  if (request.method === "GET") {
    const items = await getLexiconItems(env, table);
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
    const exists = await hasLexiconLabel(env, table, label);
    if (exists) {
      return jsonResponse({ error: "duplicate" }, 409, corsHeaders);
    }
    const item = await addLexiconItem(env, table, label);
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
    await deleteLexiconItem(env, table, id);
    await logAudit(env, "lexicon.delete", session.user.id, null, { type, id, lexicon: lexiconKey });
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

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

export async function handleLexiconFavorites(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  if (request.method === "GET") {
    const lexiconKey = getLexiconKey(request);
    const rows = await getFavorites(env, session.user.id);
    const favorites = rows.reduce((acc, row) => {
      const type = row.type || "";
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
    const favoriteType = lexiconKey === "sabre-laser" ? `sabre-laser:${type}` : type;
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
