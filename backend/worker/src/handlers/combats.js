import { buildCorsHeaders, jsonResponse, listCombats, createCombat, getCombatState, updateCombat, archiveCombat, deleteCombat, listCombatShares, addCombatShare, removeCombatShare, listShareUsers, listShareUsersAll } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
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
    const isSuperAdmin = requireRole(session, ["superadmin"]);
    const combats = await listCombats(env, session.user.id, includeArchived, type, isSuperAdmin);
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
    const isSuperAdmin = requireRole(session, ["superadmin"]);
    const state = await getCombatState(env, session.user.id, combatId, isSuperAdmin);
    if (!state) return jsonResponse({ error: "not_found" }, 404, corsHeaders);
    return jsonResponse({ state }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const isSuperAdmin = requireRole(session, ["superadmin"]);
    const state = await getCombatState(env, session.user.id, combatId, isSuperAdmin);
    if (!state) return jsonResponse({ error: "not_found" }, 404, corsHeaders);
    const canWrite = state.combatShareRole !== "read";
    if (state.combatIsDemo && !isSuperAdmin) {
      return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
    }
    if (!canWrite) {
      return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
    }
    const ownerId =
      isSuperAdmin && state.combatIsDemo
        ? state.combatOwnerId
        : session.user.id;
    await updateCombat(env, ownerId, combatId, body ?? {});
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
  const ownerRow = await env.DB.prepare("SELECT id, user_id, is_demo FROM combats WHERE id = ?1")
    .bind(combatId)
    .first();
  const isSuperAdmin = requireRole(session, ["superadmin"]);
  const isOwner = ownerRow?.user_id === session.user.id;
  const isDemo = Boolean(ownerRow?.is_demo);
  if (!ownerRow?.id || (!isOwner && !(isSuperAdmin && isDemo))) {
    return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
  }
  const body = await request.json().catch(() => null);
  const archived = Boolean(body?.archived);
  const ownerId = isOwner ? session.user.id : ownerRow.user_id;
  await archiveCombat(env, ownerId, combatId, archived);
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
  const ownerRow = await env.DB.prepare("SELECT id, user_id, is_demo FROM combats WHERE id = ?1")
    .bind(combatId)
    .first();
  const isSuperAdmin = requireRole(session, ["superadmin"]);
  const isOwner = ownerRow?.user_id === session.user.id;
  const isDemo = Boolean(ownerRow?.is_demo);
  if (!ownerRow?.id || (!isOwner && !(isSuperAdmin && isDemo))) {
    return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
  }

  const ownerId = isOwner ? session.user.id : ownerRow.user_id;
  const result = await deleteCombat(env, ownerId, combatId);
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

  const ownerRow = await env.DB.prepare("SELECT id, user_id, is_demo FROM combats WHERE id = ?1")
    .bind(combatId)
    .first();
  const isSuperAdmin = requireRole(session, ["superadmin"]);
  const isOwner = ownerRow?.user_id === session.user.id;
  const isDemo = Boolean(ownerRow?.is_demo);
  if (!ownerRow?.id || (!isOwner && !(isSuperAdmin && isDemo))) {
    return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
  }

  if (request.method === "GET") {
    const ownerId = isOwner ? session.user.id : ownerRow.user_id;
    const shares = await listCombatShares(env, ownerId, combatId);
    return jsonResponse({ shares }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const sharedUserId = Number(body?.userId);
    const role = body?.role === "write" ? "write" : "read";
    if (!Number.isFinite(sharedUserId) || sharedUserId === session.user.id) {
      return jsonResponse({ error: "invalid_payload" }, 400, corsHeaders);
    }
    const ownerId = isOwner ? session.user.id : ownerRow.user_id;
    await addCombatShare(env, ownerId, combatId, sharedUserId, role);
    await logAudit(env, "combat.share.add", session.user.id, combatId, { sharedUserId, role });
    const shares = await listCombatShares(env, ownerId, combatId);
    return jsonResponse({ shares }, 200, corsHeaders);
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => null);
    const sharedUserId = Number(body?.userId);
    if (!Number.isFinite(sharedUserId)) {
      return jsonResponse({ error: "invalid_payload" }, 400, corsHeaders);
    }
    const ownerId = isOwner ? session.user.id : ownerRow.user_id;
    await removeCombatShare(env, ownerId, combatId, sharedUserId);
    await logAudit(env, "combat.share.remove", session.user.id, combatId, { sharedUserId });
    const shares = await listCombatShares(env, ownerId, combatId);
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
