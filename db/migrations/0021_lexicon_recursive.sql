CREATE TABLE IF NOT EXISTS lexicon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lexicon_id TEXT NOT NULL,
  parent_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  FOREIGN KEY(parent_id) REFERENCES lexicon(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lexicon_lexicon_id ON lexicon(lexicon_id);
CREATE INDEX IF NOT EXISTS idx_lexicon_parent_id ON lexicon(parent_id);
