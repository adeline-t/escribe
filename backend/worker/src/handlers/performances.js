import {
  buildCorsHeaders,
  jsonResponse,
  listPerformances,
  createPerformance,
  getPerformanceState,
  updatePerformance,
  archivePerformance,
  deletePerformance,
  listPerformanceShares,
  addPerformanceShare,
  removePerformanceShare,
  listShareUsers,
  listShareUsersAll,
} from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { logAudit } from "../audit.js";

export async function handlePerformances(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  if (request.method === "GET") {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("archived") === "1";
    const rawType = url.searchParams.get("type");
    const performanceType =
      rawType === "sabre-laser"
        ? "sabre-laser"
        : rawType === "classic"
          ? "classic"
          : null;
    const isSuperAdmin = requireRole(session, ["superadmin"]);
    const performances = await listPerformances(
      env,
      session.user.id,
      includeArchived,
      performanceType,
      isSuperAdmin
    );
    return jsonResponse({ performances }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const performance = await createPerformance(env, session.user.id, body ?? {});
    if (!performance?.id) {
      return jsonResponse({ error: "create_failed" }, 500, corsHeaders);
    }
    await logAudit(env, "performance.create", session.user.id, performance.id, {});
    return jsonResponse({ performance }, 201, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handlePerformance(request, env, params) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const performanceId = Number(params?.id);
  if (!Number.isFinite(performanceId)) {
    return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
  }

  if (request.method === "GET") {
    const isSuperAdmin = requireRole(session, ["superadmin"]);
    const state = await getPerformanceState(
      env,
      session.user.id,
      performanceId,
      isSuperAdmin
    );
    if (!state) return jsonResponse({ error: "not_found" }, 404, corsHeaders);
    return jsonResponse({ state }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const isSuperAdmin = requireRole(session, ["superadmin"]);
    const state = await getPerformanceState(
      env,
      session.user.id,
      performanceId,
      isSuperAdmin
    );
    if (!state) return jsonResponse({ error: "not_found" }, 404, corsHeaders);
    const shareRole = state.performanceShareRole;
    const isDemo = Boolean(state.performanceIsDemo);
    const ownerId = state.performanceOwnerId ?? session.user.id;
    const canWrite = shareRole !== "read";
    if (isDemo && !isSuperAdmin) {
      return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
    }
    if (!canWrite) {
      return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
    }
    const writeOwnerId = isSuperAdmin && isDemo ? ownerId : session.user.id;
    await updatePerformance(env, writeOwnerId, performanceId, body ?? {});
    await logAudit(env, "performance.update", session.user.id, performanceId, {});
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}

export async function handlePerformanceArchive(request, env, params) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const performanceId = Number(params?.id);
  if (!Number.isFinite(performanceId)) {
    return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
  }
  const ownerRow = await env.DB.prepare(
    "SELECT id, user_id, is_demo FROM performances WHERE id = ?1"
  )
    .bind(performanceId)
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
  await archivePerformance(env, ownerId, performanceId, archived);
  await logAudit(env, "performance.archive", session.user.id, performanceId, {
    archived,
  });
  return jsonResponse({ ok: true }, 200, corsHeaders);
}

export async function handlePerformanceDelete(request, env, params) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const performanceId = Number(params?.id);
  if (!Number.isFinite(performanceId)) {
    return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
  }
  const ownerRow = await env.DB.prepare(
    "SELECT id, user_id, is_demo FROM performances WHERE id = ?1"
  )
    .bind(performanceId)
    .first();
  const isSuperAdmin = requireRole(session, ["superadmin"]);
  const isOwner = ownerRow?.user_id === session.user.id;
  const isDemo = Boolean(ownerRow?.is_demo);
  if (!ownerRow?.id || (!isOwner && !(isSuperAdmin && isDemo))) {
    return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
  }

  const ownerId = isOwner ? session.user.id : ownerRow.user_id;
  const result = await deletePerformance(env, ownerId, performanceId);
  await logAudit(env, "performance.delete", session.user.id, performanceId, {
    mode: result.mode,
  });
  return jsonResponse({ ok: true, mode: result.mode }, 200, corsHeaders);
}

export async function handlePerformanceShares(request, env, params) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);

  const performanceId = Number(params?.id);
  if (!Number.isFinite(performanceId)) {
    return jsonResponse({ error: "invalid_id" }, 400, corsHeaders);
  }

  const ownerRow = await env.DB.prepare(
    "SELECT id, user_id, is_demo FROM performances WHERE id = ?1"
  )
    .bind(performanceId)
    .first();
  const isSuperAdmin = requireRole(session, ["superadmin"]);
  const isOwner = ownerRow?.user_id === session.user.id;
  const isDemo = Boolean(ownerRow?.is_demo);
  if (!ownerRow?.id || (!isOwner && !(isSuperAdmin && isDemo))) {
    return jsonResponse({ error: "forbidden" }, 403, corsHeaders);
  }

  if (request.method === "GET") {
    const ownerId = isOwner ? session.user.id : ownerRow.user_id;
    const shares = await listPerformanceShares(env, ownerId, performanceId);
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
    await addPerformanceShare(env, ownerId, performanceId, sharedUserId, role);
    await logAudit(env, "performance.share.add", session.user.id, performanceId, {
      sharedUserId,
      role,
    });
    const shares = await listPerformanceShares(env, ownerId, performanceId);
    return jsonResponse({ shares }, 200, corsHeaders);
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => null);
    const sharedUserId = Number(body?.userId);
    if (!Number.isFinite(sharedUserId)) {
      return jsonResponse({ error: "invalid_payload" }, 400, corsHeaders);
    }
    const ownerId = isOwner ? session.user.id : ownerRow.user_id;
    await removePerformanceShare(env, ownerId, performanceId, sharedUserId);
    await logAudit(env, "performance.share.remove", session.user.id, performanceId, {
      sharedUserId,
    });
    const shares = await listPerformanceShares(env, ownerId, performanceId);
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
