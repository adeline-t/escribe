ALTER TABLE lexicon ADD COLUMN deleted_at TEXT;
ALTER TABLE lexicon ADD COLUMN source TEXT NOT NULL DEFAULT 'seed';

-- Guardrail for existing rows after schema upgrade.
UPDATE lexicon
SET source = COALESCE(NULLIF(source, ''), 'seed');
