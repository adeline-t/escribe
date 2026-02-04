import { buildCorsHeaders, jsonResponse, listCombats, createCombat, getCombatState, updateCombat, archiveCombat } from "../db.js";
import { requireAuth } from "../auth.js";
import { logAudit } from "../audit.js";

export async function handleCombats(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  if (request.method === "GET") {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("archived") === "1";
    const combats = await listCombats(env, session.user.id, includeArchived);
    return jsonResponse({ combats }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const combat = await createCombat(env, session.user.id, body ?? {});
    if (!combat?.id) {
      return jsonResponse({ error: "create_failed" }, 500, corsHeaders);
    }
    await logAudit(env, "combat.create", session.user.id, combat.id, {});
    return jsonResponse({ combat }, 201, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handleCombat(request, env, params) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const combatId = Number(params?.id);
  if (!Number.isFinite(combatId)) {
    return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
  }

  if (request.method === "GET") {
    const state = await getCombatState(env, session.user.id, combatId);
    if (!state) return jsonResponse({ error: "not_found" }, 404, corsHeaders);
    return jsonResponse({ state }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    await updateCombat(env, session.user.id, combatId, body ?? {});
    await logAudit(env, "combat.update", session.user.id, combatId, {});
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handleCombatArchive(request, env, params) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const combatId = Number(params?.id);
  if (!Number.isFinite(combatId)) {
    return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
  }
  const body = await request.json().catch(() => null);
  const archived = Boolean(body?.archived);
  await archiveCombat(env, session.user.id, combatId, archived);
  await logAudit(env, "combat.archive", session.user.id, combatId, { archived });
  return jsonResponse({ ok: true }, 200, corsHeaders);
}
