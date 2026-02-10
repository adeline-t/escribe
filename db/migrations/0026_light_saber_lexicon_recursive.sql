CREATE TABLE IF NOT EXISTS lexicon_light_saber (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lexicon_id TEXT NOT NULL,
  parent_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  deleted_at TEXT,
  source TEXT NOT NULL DEFAULT 'seed',
  FOREIGN KEY(parent_id) REFERENCES lexicon_light_saber(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lexicon_light_saber_lexicon_id
  ON lexicon_light_saber(lexicon_id);
CREATE INDEX IF NOT EXISTS idx_lexicon_light_saber_parent_id
  ON lexicon_light_saber(parent_id);
CREATE INDEX IF NOT EXISTS idx_lexicon_light_saber_deleted_at
  ON lexicon_light_saber(deleted_at);

CREATE TABLE IF NOT EXISTS user_lexicon_light_saber (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lexicon_id TEXT NOT NULL,
  parent_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  deleted_at TEXT,
  source TEXT NOT NULL DEFAULT 'custom',
  FOREIGN KEY(parent_id) REFERENCES user_lexicon_light_saber(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_lexicon_light_saber_user_lexicon_id
  ON user_lexicon_light_saber(user_id, lexicon_id);
CREATE INDEX IF NOT EXISTS idx_user_lexicon_light_saber_parent_id
  ON user_lexicon_light_saber(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_lexicon_light_saber_user_id
  ON user_lexicon_light_saber(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lexicon_light_saber_deleted_at
  ON user_lexicon_light_saber(deleted_at);

DROP TABLE IF EXISTS sl_weapons;
DROP TABLE IF EXISTS sl_choreography_phases;
DROP TABLE IF EXISTS sl_targets;
DROP TABLE IF EXISTS sl_offensive_techniques;
DROP TABLE IF EXISTS sl_offensive_attributes;
DROP TABLE IF EXISTS sl_defensive_techniques;
DROP TABLE IF EXISTS sl_defensive_attributes;
DROP TABLE IF EXISTS sl_preparations;
DROP TABLE IF EXISTS sl_movements;

DROP TABLE IF EXISTS user_sl_weapons;
DROP TABLE IF EXISTS user_sl_choreography_phases;
DROP TABLE IF EXISTS user_sl_targets;
DROP TABLE IF EXISTS user_sl_offensive_techniques;
DROP TABLE IF EXISTS user_sl_offensive_attributes;
DROP TABLE IF EXISTS user_sl_defensive_techniques;
DROP TABLE IF EXISTS user_sl_defensive_attributes;
DROP TABLE IF EXISTS user_sl_preparations;
DROP TABLE IF EXISTS user_sl_movements;
