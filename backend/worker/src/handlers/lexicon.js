import {
  getLexicon,
  getLexiconItems,
  addLexiconItem,
  deleteLexiconItem,
  hasLexiconLabel,
  replaceLexicon,
  jsonResponse,
  buildCorsHeaders
} from "../db.js";

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

export async function handleLexicon(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method === "GET") {
    const lexicon = await getLexicon(env);
    return jsonResponse({ lexicon }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const lexicon = body?.lexicon;
    if (!lexicon || typeof lexicon !== "object") {
      return jsonResponse({ error: "invalid_lexicon" }, 400, corsHeaders);
    }
    await replaceLexicon(env, lexicon);
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handleLexiconType(request, env, type) {
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
    return jsonResponse({ item }, 201, corsHeaders);
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => null);
    const id = Number(body?.id);
    if (!Number.isFinite(id)) {
      return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
    }
    await deleteLexiconItem(env, table, id);
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}
