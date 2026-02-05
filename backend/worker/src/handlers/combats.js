import { buildCorsHeaders, jsonResponse, listCombats, createCombat, getCombatState, updateCombat, archiveCombat, deleteCombat, listCombatShares, addCombatShare, removeCombatShare, listShareUsers, listShareUsersAll } from "../db.js";
import { requireAuth } from "../auth.js";
import { logAudit } from "../audit.js";

export async function handleCombats(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  if (request.method === "GET") {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("archived") === "1";
    const combatType = url.searchParams.get("type");
    const type = combatType === "sabre-laser" ? "sabre-laser" : combatType === "classic" ? "classic" : null;
    const combats = await listCombats(env, session.user.id, includeArchived, type);
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
    const state = await getCombatState(env, session.user.id, combatId);
    if (!state) return jsonResponse({ error: "not_found" }, 404, corsHeaders);
    const canWrite = state.combatShareRole !== "read";
    if (!canWrite) {
      return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
    }
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
  const ownerRow = await env.DB.prepare("SELECT id FROM combats WHERE id = ?1 AND user_id = ?2")
    .bind(combatId, session.user.id)
    .first();
  if (!ownerRow?.id) {
    return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
  }
  const body = await request.json().catch(() => null);
  const archived = Boolean(body?.archived);
  await archiveCombat(env, session.user.id, combatId, archived);
  await logAudit(env, "combat.archive", session.user.id, combatId, { archived });
  return jsonResponse({ ok: true }, 200, corsHeaders);
}

export async function handleCombatDelete(request, env, params) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const combatId = Number(params?.id);
  if (!Number.isFinite(combatId)) {
    return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
  }
  const ownerRow = await env.DB.prepare("SELECT id FROM combats WHERE id = ?1 AND user_id = ?2")
    .bind(combatId, session.user.id)
    .first();
  if (!ownerRow?.id) {
    return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
  }

  const result = await deleteCombat(env, session.user.id, combatId);
  await logAudit(env, "combat.delete", session.user.id, combatId, { mode: result.mode });
  return jsonResponse({ ok: true, mode: result.mode }, 200, corsHeaders);
}

export async function handleCombatShares(request, env, params) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const combatId = Number(params?.id);
  if (!Number.isFinite(combatId)) {
    return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
  }

  const ownerRow = await env.DB.prepare("SELECT id FROM combats WHERE id = ?1 AND user_id = ?2")
    .bind(combatId, session.user.id)
    .first();
  if (!ownerRow?.id) {
    return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
  }

  if (request.method === "GET") {
    const shares = await listCombatShares(env, session.user.id, combatId);
    return jsonResponse({ shares }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const sharedUserId = Number(body?.userId);
    const role = body?.role === "write" ? "write" : "read";
    if (!Number.isFinite(sharedUserId) || sharedUserId === session.user.id) {
      return jsonResponse({ error: "invalid_payload" }, 400, corsHeaders);
    }
    await addCombatShare(env, session.user.id, combatId, sharedUserId, role);
    await logAudit(env, "combat.share.add", session.user.id, combatId, { sharedUserId, role });
    const shares = await listCombatShares(env, session.user.id, combatId);
    return jsonResponse({ shares }, 200, corsHeaders);
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => null);
    const sharedUserId = Number(body?.userId);
    if (!Number.isFinite(sharedUserId)) {
      return jsonResponse({ error: "invalid_payload" }, 400, corsHeaders);
    }
    await removeCombatShare(env, session.user.id, combatId, sharedUserId);
    await logAudit(env, "combat.share.remove", session.user.id, combatId, { sharedUserId });
    const shares = await listCombatShares(env, session.user.id, combatId);
    return jsonResponse({ shares }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handleShareUsers(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  const url = new URL(request.url);
  if (url.searchParams.get("all") === "1") {
    const users = await listShareUsersAll(env, session.user.id);
    return jsonResponse({ users }, 200, corsHeaders);
  }
  const query = (url.searchParams.get("query") || "").trim();
  if (!query) {
    return jsonResponse({ users: [] }, 200, corsHeaders);
  }
  const users = await listShareUsers(env, session.user.id, query);
  return jsonResponse({ users }, 200, corsHeaders);
}

export async function handleShareUsersAll(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  const users = await listShareUsersAll(env, session.user.id);
  return jsonResponse({ users }, 200, corsHeaders);
}
