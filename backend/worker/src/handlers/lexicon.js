import {
  getLexicon,
  getLexiconItems,
  getUserLexiconItems,
  addLexiconItem,
  addUserLexiconItem,
  deleteLexiconItem,
  deleteUserLexiconItem,
  hasLexiconLabel,
  hasUserLexiconLabel,
  replaceLexicon,
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  jsonResponse,
  buildCorsHeaders
} from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { logAudit } from "../audit.js";

const TYPE_MAP = {
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

const USER_TYPE_MAP = {
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

const FAVORITE_TYPES = new Set(Object.keys(TYPE_MAP));

export async function handleLexicon(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method === "GET") {
    const lexicon = await getLexicon(env);
    return jsonResponse({ lexicon }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const session = await requireAuth(request, env);
    if (!requireRole(session, ["admin", "superadmin"])) {
      return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
    }
    const body = await request.json().catch(() => null);
    const lexicon = body?.lexicon;
    if (!lexicon || typeof lexicon !== "object") {
      return jsonResponse({ error: "invalid_lexicon" }, 400, corsHeaders);
    }
    await replaceLexicon(env, lexicon);
    await logAudit(env, "lexicon.replace", session.user.id, null, {});
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handleLexiconType(request, env, params) {
  const type = params?.type;
  const corsHeaders = buildCorsHeaders(request, env);
  const table = TYPE_MAP[type];
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
    await logAudit(env, "lexicon.add", session.user.id, null, { type, label });
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
    await logAudit(env, "lexicon.delete", session.user.id, null, { type, id });
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handleLexiconPersonal(request, env, params) {
  const type = params?.type;
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const table = USER_TYPE_MAP[type];
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
    await logAudit(env, "lexicon.personal.add", session.user.id, null, { type, label });
    return jsonResponse({ item }, 201, corsHeaders);
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => null);
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
    }
    await deleteUserLexiconItem(env, table, session.user.id, id);
    await logAudit(env, "lexicon.personal.delete", session.user.id, null, { type, id });
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handleLexiconFavorites(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  if (request.method === "GET") {
    const rows = await getFavorites(env, session.user.id);
    const favorites = rows.reduce((acc, row) => {
      if (!acc[row.type]) acc[row.type] = [];
      acc[row.type].push(row.label);
      return acc;
    }, {});
    return jsonResponse({ favorites }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const type = body?.type;
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const favorite = Boolean(body?.favorite);
    if (!FAVORITE_TYPES.has(type) || !label) {
      return jsonResponse({ error: "invalid_favorite" }, 400, corsHeaders);
    }
    const exists = await isFavorite(env, session.user.id, type, label);
    if (favorite && !exists) {
      await addFavorite(env, session.user.id, type, label);
      await logAudit(env, "lexicon.favorite.add", session.user.id, null, { type, label });
    } else if (!favorite && exists) {
      await removeFavorite(env, session.user.id, type, label);
      await logAudit(env, "lexicon.favorite.remove", session.user.id, null, { type, label });
    }
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}
