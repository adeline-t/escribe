import { jsonResponse, buildCorsHeaders } from "../db.js";
import { requireAuth, requireRole, adminResetPassword } from "../auth.js";
import { logAudit, listAudit } from "../audit.js";

export async function handleUsersList(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const session = await requireAuth(request, env);
  if (!requireRole(session, ["admin", "superadmin"])) {
    return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  }

  const rows = await env.DB.prepare(
    "SELECT id, email, role, force_reset, first_name, last_name, created_at FROM users ORDER BY created_at DESC"
  ).all();
  return jsonResponse({ users: rows?.results ?? [] }, 200, corsHeaders);
}

export async function handleUserRole(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const session = await requireAuth(request, env);
  if (!requireRole(session, ["superadmin"])) {
    return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  }

  const body = await request.json().catch(() => null);
  const userId = Number(body?.userId);
  const role = body?.role;
  if (!Number.isFinite(userId) || !["user", "admin", "superadmin"].includes(role)) {
    return jsonResponse({ error: "invalid_payload" }, 400, corsHeaders);
  }

  await env.DB.prepare("UPDATE users SET role = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(role, new Date().toISOString(), userId)
    .run();

  await logAudit(env, "user.role.update", session.user.id, userId, { role });

  return jsonResponse({ ok: true }, 200, corsHeaders);
}

export async function handleUserPasswordReset(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const session = await requireAuth(request, env);
  if (!requireRole(session, ["admin", "superadmin"])) {
    return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  }

  const body = await request.json().catch(() => null);
  const userId = Number(body?.userId);
  const password = body?.password;
  const forceReset = Boolean(body?.forceReset);
  if (!Number.isFinite(userId) || typeof password !== "string" || !password.trim()) {
    return jsonResponse({ error: "invalid_payload" }, 400, corsHeaders);
  }

  const result = await adminResetPassword(env, userId, password, forceReset);
  if (result?.error) {
    return jsonResponse({ error: result.error, message: result.message }, 400, corsHeaders);
  }
  await logAudit(env, "user.password.reset", session.user.id, userId, { forceReset });
  return jsonResponse({ ok: true }, 200, corsHeaders);
}

export async function handleAudit(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const session = await requireAuth(request, env);
  if (!requireRole(session, ["admin", "superadmin"])) {
    return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  }
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 200);
  const logs = await listAudit(env, limit);
  return jsonResponse({ logs }, 200, corsHeaders);
}
