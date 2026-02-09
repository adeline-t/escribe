import { getState, saveState, jsonResponse, buildCorsHeaders } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { logAudit } from "../audit.js";

export async function handleState(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  }
  if (request.method === "GET") {
    const url = new URL(request.url);
    const performanceId = Number(url.searchParams.get("performanceId"));
    const typeParam = url.searchParams.get("type");
    const performanceType =
      typeParam === "sabre-laser"
        ? "sabre-laser"
        : typeParam === "classic"
          ? "classic"
          : null;
    const isSuperAdmin = requireRole(session, ["superadmin"]);
    const state = await getState(
      env,
      session.user.id,
      Number.isFinite(performanceId) ? performanceId : null,
      performanceType,
      isSuperAdmin
    );
    return jsonResponse({ state }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const state = body?.state;
    if (!state || typeof state !== "object") {
      return jsonResponse({ error: "invalid_state" }, 400, corsHeaders);
    }
    const isSuperAdmin = requireRole(session, ["superadmin"]);
    const performanceId = await saveState(env, session.user.id, state, isSuperAdmin);
    await logAudit(env, "state.save", session.user.id, performanceId, {});
    return jsonResponse({ ok: true, performanceId }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}
