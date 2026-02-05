async function ensureAuditSchema(env) {
  const row = await env.DB
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = 'audit_logs'")
    .first();
  if (!row?.name) {
    throw new Error("Missing audit_logs table. Run D1 migrations.");
  }
}

export async function logAudit(env, action, actorId, targetId = null, meta = null) {
  await ensureAuditSchema(env);
  const now = new Date().toISOString();
  const metaText = meta ? JSON.stringify(meta) : null;
  await env.DB.prepare(
    `INSERT INTO audit_logs (actor_id, action, target_id, meta, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(actorId, action, targetId, metaText, now)
    .run();
}

export async function listAudit(env, limit = 100) {
  await ensureAuditSchema(env);
  const rows = await env.DB.prepare(
    `SELECT audit_logs.id, audit_logs.action, audit_logs.actor_id, audit_logs.target_id, audit_logs.meta,
            audit_logs.created_at, users.email AS actor_email
     FROM audit_logs
     LEFT JOIN users ON users.id = audit_logs.actor_id
     ORDER BY audit_logs.id DESC
     LIMIT ?1`
  )
    .bind(limit)
    .all();
  return rows?.results ?? [];
}
