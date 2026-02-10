import { getState, saveState } from "../db.js";
import { jsonResponse, buildCorsHeaders } from "../utils/http.js";
import { requireAuth, requireRole } from "../auth.js";
import { logAudit } from "../audit.js";

/**
 * Unified state endpoint used by the frontend editor.
 * GET returns full state, POST persists draft + sequences.
 */
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
    const requestedPerformanceId = Number(state.performanceId);
    const hasExplicitSequencesPayload =
      Array.isArray(state?.sequences) || Array.isArray(state?.phrases);
    const incomingSequences = Array.isArray(state?.sequences)
      ? state.sequences
      : Array.isArray(state?.phrases)
        ? state.phrases
        : null;
    const incomingSequenceCount = Array.isArray(incomingSequences)
      ? incomingSequences.length
      : null;

    let sequenceCountBefore = null;
    if (Number.isFinite(requestedPerformanceId)) {
      try {
        const beforeRow = await env.DB
          .prepare(
            "SELECT COUNT(*) AS count FROM performance_sequences WHERE performance_id = ?1",
          )
          .bind(requestedPerformanceId)
          .first();
        sequenceCountBefore = Number(beforeRow?.count ?? 0);
      } catch {
        sequenceCountBefore = null;
      }
    }

    const isSuperAdmin = requireRole(session, ["superadmin"]);
    const performanceId = await saveState(env, session.user.id, state, isSuperAdmin);

    let sequenceCountAfter = null;
    if (Number.isFinite(Number(performanceId))) {
      try {
        const afterRow = await env.DB
          .prepare(
            "SELECT COUNT(*) AS count FROM performance_sequences WHERE performance_id = ?1",
          )
          .bind(performanceId)
          .first();
        sequenceCountAfter = Number(afterRow?.count ?? 0);
      } catch {
        sequenceCountAfter = null;
      }
    }

    await logAudit(env, "state.save", session.user.id, performanceId, {
      requestedPerformanceId: Number.isFinite(requestedPerformanceId)
        ? requestedPerformanceId
        : null,
      hasExplicitSequencesPayload,
      incomingSequenceCount,
      sequenceCountBefore,
      sequenceCountAfter,
    });
    return jsonResponse({ ok: true, performanceId }, 200, corsHeaders);
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
}
