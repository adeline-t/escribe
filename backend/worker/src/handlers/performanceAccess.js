import { requireRole } from "../auth.js";

/**
 * Centralized access resolution for performance write/admin operations.
 * This avoids copy/paste permission logic across handlers.
 */
export async function resolvePerformanceAccess(env, session, performanceId) {
  const ownerRow = await env.DB
    .prepare("SELECT id, user_id, is_demo FROM performances WHERE id = ?1")
    .bind(performanceId)
    .first();

  const isSuperAdmin = requireRole(session, ["superadmin"]);
  const isOwner = ownerRow?.user_id === session.user.id;
  const isDemo = Boolean(ownerRow?.is_demo);
  const canAdminDemo = isSuperAdmin && isDemo;
  const canManage = Boolean(ownerRow?.id) && (isOwner || canAdminDemo);
  const ownerId = isOwner ? session.user.id : ownerRow?.user_id ?? null;

  return {
    ownerRow,
    isSuperAdmin,
    isOwner,
    isDemo,
    canAdminDemo,
    canManage,
    ownerId,
  };
}
