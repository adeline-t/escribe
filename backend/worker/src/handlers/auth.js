import {
  requireAuth,
  registerUser,
  loginUser,
  changePassword,
  logout,
  updateProfile
} from "../auth.js";
import { jsonResponse, buildCorsHeaders } from "../db.js";
import { logAudit } from "../audit.js";

export async function handleRegister(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const result = await registerUser(env, email, password);
  if (result.error) {
    const status = result.error === "email_exists" ? 409 : 400;
    return jsonResponse({ error: result.error, message: result.message }, status, corsHeaders);
  }
  if (result.user?.id) {
    await updateProfile(env, result.user.id, firstName, lastName);
    await logAudit(env, "user.register", result.user.id, result.user.id, { email });
  }
  return jsonResponse({ ok: true }, 201, corsHeaders);
}

export async function handleLogin(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;
  const result = await loginUser(env, email, password);
  if (result.error) {
    return jsonResponse({ error: "invalid_credentials" }, 401, corsHeaders);
  }
  await logAudit(env, "user.login", result.user.id, result.user.id, { email });
  return jsonResponse(result, 200, corsHeaders);
}

export async function handleMe(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  return jsonResponse({ user: session.user }, 200, corsHeaders);
}

export async function handleProfile(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  const body = await request.json().catch(() => null);
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  await updateProfile(env, session.user.id, firstName, lastName);
  await logAudit(env, "user.profile.update", session.user.id, session.user.id, {
    firstName,
    lastName
  });
  return jsonResponse({ ok: true }, 200, corsHeaders);
}

export async function handleChangePassword(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const session = await requireAuth(request, env);
  if (!session) return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  const body = await request.json().catch(() => null);
  const currentPassword = body?.currentPassword ?? "";
  const newPassword = body?.newPassword ?? "";
  const result = await changePassword(env, session.user.id, currentPassword, newPassword, session.user.forceReset);
  if (result.error) {
    return jsonResponse({ error: result.error, message: result.message }, 400, corsHeaders);
  }
  await logAudit(env, "user.password.change", session.user.id, session.user.id, {});
  return jsonResponse({ ok: true }, 200, corsHeaders);
}

export async function handleLogout(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  }
  const session = await requireAuth(request, env);
  if (session?.token) {
    await logout(env, session.token);
    await logAudit(env, "user.logout", session.user.id, session.user.id, {});
  }
  return jsonResponse({ ok: true }, 200, corsHeaders);
}
