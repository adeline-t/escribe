-- Classic user lexicon refactor:
-- Drop old user_nl_* tables (flat per-category) and replace with one recursive table.
-- No data migration by design (RAZ).

DROP TABLE IF EXISTS user_nl_offensive;
DROP TABLE IF EXISTS user_nl_action;
DROP TABLE IF EXISTS user_nl_defensive;
DROP TABLE IF EXISTS user_nl_cible;
DROP TABLE IF EXISTS user_nl_target;
DROP TABLE IF EXISTS user_nl_deplacement;
DROP TABLE IF EXISTS user_nl_movement;
DROP TABLE IF EXISTS user_nl_deplacement_complement;
DROP TABLE IF EXISTS user_nl_movement_complement;
DROP TABLE IF EXISTS user_nl_parade_numero;
DROP TABLE IF EXISTS user_nl_guard_number;
DROP TABLE IF EXISTS user_nl_parade_attribut;
DROP TABLE IF EXISTS user_nl_guard_attribute;
DROP TABLE IF EXISTS user_nl_attaque_attribut;
DROP TABLE IF EXISTS user_nl_attack_attribute;

CREATE TABLE IF NOT EXISTS user_lexicon_classic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lexicon_id TEXT NOT NULL,
  parent_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  deleted_at TEXT,
  source TEXT NOT NULL DEFAULT 'custom',
  FOREIGN KEY(parent_id) REFERENCES user_lexicon_classic(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_lexicon_classic_user_lexicon_id
  ON user_lexicon_classic(user_id, lexicon_id);
CREATE INDEX IF NOT EXISTS idx_user_lexicon_classic_parent_id
  ON user_lexicon_classic(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_lexicon_classic_user_id
  ON user_lexicon_classic(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lexicon_classic_deleted_at
  ON user_lexicon_classic(deleted_at);

