CREATE TABLE IF NOT EXISTS combat_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  combat_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  shared_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(combat_id, shared_user_id)
);
