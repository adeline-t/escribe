-- Performance-oriented indexes for read-heavy endpoints.
-- Safe to run multiple times.

-- Faster listing/filtering of performances by owner/archive/type recency.
CREATE INDEX IF NOT EXISTS idx_performances_user_archived_updated
  ON performances(user_id, archived, updated_at);

CREATE INDEX IF NOT EXISTS idx_performances_type_archived_updated
  ON performances(type, archived, updated_at);

-- Demo/shared access checks frequently join with these fields.
CREATE INDEX IF NOT EXISTS idx_performances_is_demo
  ON performances(is_demo);

-- Sequence loading and ordered rendering per performance.
CREATE INDEX IF NOT EXISTS idx_performance_sequences_performance_position
  ON performance_sequences(performance_id, position);

-- Share lookups:
-- - list shares by performance+owner
-- - membership checks by shared user
CREATE INDEX IF NOT EXISTS idx_performance_shares_performance_owner
  ON performance_shares(performance_id, owner_id);

CREATE INDEX IF NOT EXISTS idx_performance_shares_shared_user_performance
  ON performance_shares(shared_user_id, performance_id);

-- Session lifecycle:
-- token is already unique, but expiry scans benefit from this index.
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions(expires_at);

-- Recursive lexicon reads mostly exclude soft-deleted nodes.
CREATE INDEX IF NOT EXISTS idx_lexicon_deleted_at
  ON lexicon(deleted_at);
