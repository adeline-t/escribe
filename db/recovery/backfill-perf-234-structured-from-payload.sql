-- Targeted structured-step backfill for performance 234 only.

DELETE FROM step_action_attributes
WHERE step_action_id IN (
  SELECT sa.id
  FROM step_actions sa
  JOIN step_performers sp ON sp.id = sa.step_performer_id
  JOIN sequence_steps ss ON ss.id = sp.step_id
  JOIN performance_sequences ps ON ps.id = ss.sequence_id
  WHERE ps.performance_id = 234
);

DELETE FROM step_actions
WHERE step_performer_id IN (
  SELECT sp.id
  FROM step_performers sp
  JOIN sequence_steps ss ON ss.id = sp.step_id
  JOIN performance_sequences ps ON ps.id = ss.sequence_id
  WHERE ps.performance_id = 234
);

DELETE FROM step_performers
WHERE step_id IN (
  SELECT ss.id
  FROM sequence_steps ss
  JOIN performance_sequences ps ON ps.id = ss.sequence_id
  WHERE ps.performance_id = 234
);

DELETE FROM sequence_steps
WHERE sequence_id IN (
  SELECT id FROM performance_sequences WHERE performance_id = 234
);

INSERT INTO sequence_steps (
  sequence_id,
  step_uid,
  position,
  lexicon_key,
  created_at,
  updated_at
)
SELECT
  ps.id,
  COALESCE(json_extract(step.value, '$.id'), lower(hex(randomblob(16)))),
  CAST(step.key AS INTEGER),
  COALESCE(
    json_extract(step.value, '$.lexicon'),
    json_extract(ps.payload, '$.metadata.lexicon'),
    json_extract(ps.payload, '$.lexicon'),
    'classic-v2'
  ),
  COALESCE(ps.created_at, CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM performance_sequences ps
JOIN json_each(ps.payload, '$.steps') step
WHERE ps.performance_id = 234
  AND json_type(ps.payload, '$.steps') = 'array';

WITH step_source AS (
  SELECT
    ss.id AS sequence_step_id,
    step.value AS step_json
  FROM performance_sequences ps
  JOIN sequence_steps ss ON ss.sequence_id = ps.id
  JOIN json_each(ps.payload, '$.steps') step
    ON CAST(step.key AS INTEGER) = ss.position
  WHERE ps.performance_id = 234
)
INSERT INTO step_performers (
  step_id,
  performer_id,
  action_type,
  note,
  preparation_timing,
  created_at,
  updated_at
)
SELECT
  src.sequence_step_id,
  performer.key,
  CASE
    WHEN json_type(performer.value, '$.attack') = 'object'
      AND json_type(performer.value, '$.defense') = 'object' THEN 'mixed'
    WHEN json_type(performer.value, '$.attack') = 'object' THEN 'attack'
    WHEN json_type(performer.value, '$.defense') = 'object' THEN 'defense'
    WHEN json_type(performer.value, '$.movement') = 'object' THEN 'movement'
    WHEN trim(COALESCE(json_extract(performer.value, '$.note'), '')) <> '' THEN 'note'
    ELSE 'inactive'
  END,
  COALESCE(json_extract(performer.value, '$.note'), ''),
  COALESCE(
    json_extract(performer.value, '$.preparation.timing'),
    json_extract(performer.value, '$.preparationTiming')
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM step_source src
JOIN json_each(src.step_json, '$.performers') performer;

-- main_guard
WITH performer_source AS (
  SELECT
    sp.id AS step_performer_id,
    performer.value AS performer_json
  FROM performance_sequences ps
  JOIN sequence_steps ss ON ss.sequence_id = ps.id
  JOIN json_each(ps.payload, '$.steps') step ON CAST(step.key AS INTEGER) = ss.position
  JOIN json_each(step.value, '$.performers') performer
  JOIN step_performers sp ON sp.step_id = ss.id AND sp.performer_id = performer.key
  WHERE ps.performance_id = 234
)
INSERT INTO step_actions (
  step_performer_id, slot, timing,
  lexicon_row_id, lexicon_id, lexicon_name, lexicon_category,
  position, created_at, updated_at
)
SELECT
  src.step_performer_id,
  'main_guard',
  NULL,
  lx.id,
  json_extract(src.performer_json, '$.mainGuard.lexicon_id'),
  json_extract(src.performer_json, '$.mainGuard.name'),
  'positions',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM performer_source src
LEFT JOIN lexicon lx
  ON lx.lexicon_id = json_extract(src.performer_json, '$.mainGuard.lexicon_id')
 AND lx.deleted_at IS NULL
WHERE json_type(src.performer_json, '$.mainGuard') = 'object'
  AND (
    trim(COALESCE(json_extract(src.performer_json, '$.mainGuard.lexicon_id'), '')) <> ''
    OR trim(COALESCE(json_extract(src.performer_json, '$.mainGuard.name'), '')) <> ''
  );

-- base_posture
WITH performer_source AS (
  SELECT
    sp.id AS step_performer_id,
    performer.value AS performer_json
  FROM performance_sequences ps
  JOIN sequence_steps ss ON ss.sequence_id = ps.id
  JOIN json_each(ps.payload, '$.steps') step ON CAST(step.key AS INTEGER) = ss.position
  JOIN json_each(step.value, '$.performers') performer
  JOIN step_performers sp ON sp.step_id = ss.id AND sp.performer_id = performer.key
  WHERE ps.performance_id = 234
)
INSERT INTO step_actions (
  step_performer_id, slot, timing,
  lexicon_row_id, lexicon_id, lexicon_name, lexicon_category,
  position, created_at, updated_at
)
SELECT
  src.step_performer_id,
  'base_posture',
  NULL,
  lx.id,
  json_extract(src.performer_json, '$.basePosture.lexicon_id'),
  json_extract(src.performer_json, '$.basePosture.name'),
  'movements',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM performer_source src
LEFT JOIN lexicon lx
  ON lx.lexicon_id = json_extract(src.performer_json, '$.basePosture.lexicon_id')
 AND lx.deleted_at IS NULL
WHERE json_type(src.performer_json, '$.basePosture') = 'object'
  AND (
    trim(COALESCE(json_extract(src.performer_json, '$.basePosture.lexicon_id'), '')) <> ''
    OR trim(COALESCE(json_extract(src.performer_json, '$.basePosture.name'), '')) <> ''
  );

-- preparation / attack / defense / movement
WITH performer_source AS (
  SELECT
    sp.id AS step_performer_id,
    performer.value AS performer_json
  FROM performance_sequences ps
  JOIN sequence_steps ss ON ss.sequence_id = ps.id
  JOIN json_each(ps.payload, '$.steps') step ON CAST(step.key AS INTEGER) = ss.position
  JOIN json_each(step.value, '$.performers') performer
  JOIN step_performers sp ON sp.step_id = ss.id AND sp.performer_id = performer.key
  WHERE ps.performance_id = 234
),
action_source AS (
  SELECT step_performer_id, 'preparation' AS slot, '$.preparation' AS path, 'preparations' AS category FROM performer_source
  UNION ALL
  SELECT step_performer_id, 'attack' AS slot, '$.attack' AS path, 'attack_types' AS category FROM performer_source
  UNION ALL
  SELECT step_performer_id, 'defense' AS slot, '$.defense' AS path, 'defensive_actions' AS category FROM performer_source
  UNION ALL
  SELECT step_performer_id, 'movement' AS slot, '$.movement' AS path, 'movements' AS category FROM performer_source
)
INSERT INTO step_actions (
  step_performer_id, slot, timing,
  lexicon_row_id, lexicon_id, lexicon_name, lexicon_category,
  position, created_at, updated_at
)
SELECT
  src.step_performer_id,
  src.slot,
  CASE WHEN src.slot = 'preparation' THEN json_extract(ps.performer_json, '$.preparation.timing') ELSE NULL END,
  lx.id,
  json_extract(ps.performer_json, src.path || '.lexicon_id'),
  json_extract(ps.performer_json, src.path || '.name'),
  src.category,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM action_source src
JOIN performer_source ps ON ps.step_performer_id = src.step_performer_id
LEFT JOIN lexicon lx
  ON lx.lexicon_id = json_extract(ps.performer_json, src.path || '.lexicon_id')
 AND lx.deleted_at IS NULL
WHERE json_type(ps.performer_json, src.path) = 'object'
  AND (
    trim(COALESCE(json_extract(ps.performer_json, src.path || '.lexicon_id'), '')) <> ''
    OR trim(COALESCE(json_extract(ps.performer_json, src.path || '.name'), '')) <> ''
  );

-- targets and positions
WITH performer_source AS (
  SELECT
    sp.id AS step_performer_id,
    performer.value AS performer_json
  FROM performance_sequences ps
  JOIN sequence_steps ss ON ss.sequence_id = ps.id
  JOIN json_each(ps.payload, '$.steps') step ON CAST(step.key AS INTEGER) = ss.position
  JOIN json_each(step.value, '$.performers') performer
  JOIN step_performers sp ON sp.step_id = ss.id AND sp.performer_id = performer.key
  WHERE ps.performance_id = 234
),
term_source AS (
  SELECT step_performer_id, 'attack_target' AS slot, '$.attack.target' AS path, 'target_zones' AS category FROM performer_source
  UNION ALL
  SELECT step_performer_id, 'preparation_target' AS slot, '$.preparation.target' AS path, 'target_zones' AS category FROM performer_source
  UNION ALL
  SELECT step_performer_id, 'defense_position' AS slot, '$.defense.position' AS path, 'positions' AS category FROM performer_source
  UNION ALL
  SELECT step_performer_id, 'preparation_position' AS slot, '$.preparation.position' AS path, 'positions' AS category FROM performer_source
)
INSERT INTO step_actions (
  step_performer_id, slot, timing,
  lexicon_row_id, lexicon_id, lexicon_name, lexicon_category,
  position, created_at, updated_at
)
SELECT
  src.step_performer_id,
  src.slot,
  NULL,
  lx.id,
  json_extract(ps.performer_json, src.path || '.lexicon_id'),
  json_extract(ps.performer_json, src.path || '.name'),
  src.category,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM term_source src
JOIN performer_source ps ON ps.step_performer_id = src.step_performer_id
LEFT JOIN lexicon lx
  ON lx.lexicon_id = json_extract(ps.performer_json, src.path || '.lexicon_id')
 AND lx.deleted_at IS NULL
WHERE json_type(ps.performer_json, src.path) = 'object'
  AND (
    trim(COALESCE(json_extract(ps.performer_json, src.path || '.lexicon_id'), '')) <> ''
    OR trim(COALESCE(json_extract(ps.performer_json, src.path || '.name'), '')) <> ''
  );

-- action attributes
WITH performer_source AS (
  SELECT
    sp.id AS step_performer_id,
    performer.value AS performer_json
  FROM performance_sequences ps
  JOIN sequence_steps ss ON ss.sequence_id = ps.id
  JOIN json_each(ps.payload, '$.steps') step ON CAST(step.key AS INTEGER) = ss.position
  JOIN json_each(step.value, '$.performers') performer
  JOIN step_performers sp ON sp.step_id = ss.id AND sp.performer_id = performer.key
  WHERE ps.performance_id = 234
),
attr_source AS (
  SELECT step_performer_id, 'attack' AS slot, 'attack_complements' AS category, attr.key AS attr_pos, attr.value AS attr_json
  FROM performer_source ps JOIN json_each(ps.performer_json, '$.attack.attributes') attr
  UNION ALL
  SELECT step_performer_id, 'defense' AS slot, 'attributs_defense' AS category, attr.key AS attr_pos, attr.value AS attr_json
  FROM performer_source ps JOIN json_each(ps.performer_json, '$.defense.attributes') attr
  UNION ALL
  SELECT step_performer_id, 'movement' AS slot, 'movement_complements' AS category, attr.key AS attr_pos, attr.value AS attr_json
  FROM performer_source ps JOIN json_each(ps.performer_json, '$.movement.attributes') attr
  UNION ALL
  SELECT step_performer_id, 'preparation' AS slot, 'preparations' AS category, attr.key AS attr_pos, attr.value AS attr_json
  FROM performer_source ps JOIN json_each(ps.performer_json, '$.preparation.attributes') attr
)
INSERT INTO step_action_attributes (
  step_action_id, attribute_scope,
  lexicon_row_id, lexicon_id, lexicon_name, lexicon_category,
  position, created_at, updated_at
)
SELECT
  sa.id,
  'action',
  lx.id,
  json_extract(src.attr_json, '$.lexicon_id'),
  json_extract(src.attr_json, '$.name'),
  src.category,
  CAST(src.attr_pos AS INTEGER),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM attr_source src
JOIN step_actions sa
  ON sa.step_performer_id = src.step_performer_id
 AND sa.slot = src.slot
LEFT JOIN lexicon lx
  ON lx.lexicon_id = json_extract(src.attr_json, '$.lexicon_id')
 AND lx.deleted_at IS NULL
WHERE (
  trim(COALESCE(json_extract(src.attr_json, '$.lexicon_id'), '')) <> ''
  OR trim(COALESCE(json_extract(src.attr_json, '$.name'), '')) <> ''
);

-- position attributes
WITH performer_source AS (
  SELECT
    sp.id AS step_performer_id,
    performer.value AS performer_json
  FROM performance_sequences ps
  JOIN sequence_steps ss ON ss.sequence_id = ps.id
  JOIN json_each(ps.payload, '$.steps') step ON CAST(step.key AS INTEGER) = ss.position
  JOIN json_each(step.value, '$.performers') performer
  JOIN step_performers sp ON sp.step_id = ss.id AND sp.performer_id = performer.key
  WHERE ps.performance_id = 234
),
attr_source AS (
  SELECT step_performer_id, 'defense_position' AS slot, attr.key AS attr_pos, attr.value AS attr_json
  FROM performer_source ps JOIN json_each(ps.performer_json, '$.defense.position.attributes') attr
  UNION ALL
  SELECT step_performer_id, 'preparation_position' AS slot, attr.key AS attr_pos, attr.value AS attr_json
  FROM performer_source ps JOIN json_each(ps.performer_json, '$.preparation.position.attributes') attr
)
INSERT INTO step_action_attributes (
  step_action_id, attribute_scope,
  lexicon_row_id, lexicon_id, lexicon_name, lexicon_category,
  position, created_at, updated_at
)
SELECT
  sa.id,
  'position',
  lx.id,
  json_extract(src.attr_json, '$.lexicon_id'),
  json_extract(src.attr_json, '$.name'),
  'position_complements',
  CAST(src.attr_pos AS INTEGER),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM attr_source src
JOIN step_actions sa
  ON sa.step_performer_id = src.step_performer_id
 AND sa.slot = src.slot
LEFT JOIN lexicon lx
  ON lx.lexicon_id = json_extract(src.attr_json, '$.lexicon_id')
 AND lx.deleted_at IS NULL
WHERE (
  trim(COALESCE(json_extract(src.attr_json, '$.lexicon_id'), '')) <> ''
  OR trim(COALESCE(json_extract(src.attr_json, '$.name'), '')) <> ''
);
