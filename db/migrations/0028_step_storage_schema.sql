CREATE TABLE IF NOT EXISTS sequence_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_id INTEGER NOT NULL,
  step_uid TEXT NOT NULL,
  position INTEGER NOT NULL,
  lexicon_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sequence_id, position),
  UNIQUE(sequence_id, step_uid),
  FOREIGN KEY(sequence_id) REFERENCES performance_sequences(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS step_performers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id INTEGER NOT NULL,
  performer_id TEXT NOT NULL,
  action_type TEXT,
  note TEXT,
  preparation_timing TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(step_id, performer_id),
  FOREIGN KEY(step_id) REFERENCES sequence_steps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS step_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_performer_id INTEGER NOT NULL,
  slot TEXT NOT NULL,
  timing TEXT,
  lexicon_row_id INTEGER,
  lexicon_id TEXT,
  lexicon_name TEXT,
  lexicon_category TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(step_performer_id, slot, position),
  FOREIGN KEY(step_performer_id) REFERENCES step_performers(id) ON DELETE CASCADE,
  FOREIGN KEY(lexicon_row_id) REFERENCES lexicon(id)
);

CREATE TABLE IF NOT EXISTS step_action_attributes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_action_id INTEGER NOT NULL,
  attribute_scope TEXT NOT NULL,
  lexicon_row_id INTEGER,
  lexicon_id TEXT,
  lexicon_name TEXT,
  lexicon_category TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(step_action_id, attribute_scope, position),
  FOREIGN KEY(step_action_id) REFERENCES step_actions(id) ON DELETE CASCADE,
  FOREIGN KEY(lexicon_row_id) REFERENCES lexicon(id)
);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence_id_position
  ON sequence_steps(sequence_id, position);

CREATE INDEX IF NOT EXISTS idx_step_performers_step_id
  ON step_performers(step_id);

CREATE INDEX IF NOT EXISTS idx_step_performers_performer_id
  ON step_performers(performer_id);

CREATE INDEX IF NOT EXISTS idx_step_actions_step_performer_slot
  ON step_actions(step_performer_id, slot, position);

CREATE INDEX IF NOT EXISTS idx_step_actions_lexicon_id
  ON step_actions(lexicon_id);

CREATE INDEX IF NOT EXISTS idx_step_action_attributes_step_action
  ON step_action_attributes(step_action_id, attribute_scope, position);

CREATE INDEX IF NOT EXISTS idx_step_action_attributes_lexicon_id
  ON step_action_attributes(lexicon_id);
