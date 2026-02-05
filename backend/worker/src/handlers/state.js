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
    const url = new URL(request.url);
    const combatId = Number(url.searchParams.get("combatId"));
    const typeParam = url.searchParams.get("type");
    const combatType = typeParam === "sabre-laser" ? "sabre-laser" : typeParam === "classic" ? "classic" : null;
    const state = await getState(env, session.user.id, Number.isFinite(combatId) ? combatId : null, combatType);
    return jsonResponse({ state }, 200, corsHeaders);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    const state = body?.state;
    if (!state || typeof state !== "object") {
      return jsonResponse({ error: "invalid_state" }, 400, corsHeaders);
    }
    const combatId = await saveState(env, session.user.id, state);
    await logAudit(env, "state.save", session.user.id, combatId, {});
    return jsonResponse({ ok: true, combatId }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}
