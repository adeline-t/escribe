import { getState, saveState, jsonResponse, buildCorsHeaders } from "../db.js";
import { requireAuth } from "../auth.js";
import { logAudit } from "../audit.js";

export async function handleState(request, env) {
  const corsHeaders = buildCorsHeaders(request, env);
  const session = await requireAuth(request, env);
  if (!session) {
    return jsonResponse({ error: "unauthorized" }, 401, corsHeaders);
  }
  if (request.method === "GET") {
    const state = await getState(env);
    return jsonResponse({ state }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const state = body?.state;
    if (!state || typeof state !== "object") {
      return jsonResponse({ error: "invalid_state" }, 400, corsHeaders);
    }
    await saveState(env, state);
    await logAudit(env, "state.save", session.user.id, null, {});
    return jsonResponse({ ok: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}
