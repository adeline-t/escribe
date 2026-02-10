-- Convert legacy "displacements_prep" preparation-only performers
-- into explicit movement performers.
--
-- Rule applied per performer in each step:
-- - preparation.lexicon_id == "displacements_prep"
-- - attack is null/missing
-- - defense is null/missing
-- Then:
-- - movement is preserved if already present
-- - otherwise movement is created from preparation (name + attributes)
-- - preparation is set to null
-- - mode becomes "movement"
-- - role becomes "movement"

WITH step_updates AS (
  SELECT
    ps.id AS sequence_id,
    CAST(step.key AS INTEGER) AS step_index,
    json_set(
      step.value,
      '$.performers',
      json(
        (
          SELECT json_group_object(
            performer.key,
            CASE
              WHEN json_extract(performer.value, '$.preparation.lexicon_id') = 'displacements_prep'
                AND COALESCE(json_type(performer.value, '$.attack'), 'null') = 'null'
                AND COALESCE(json_type(performer.value, '$.defense'), 'null') = 'null'
              THEN json_set(
                CASE
                  WHEN COALESCE(json_type(performer.value, '$.movement'), 'null') = 'null'
                  THEN json_set(
                    performer.value,
                    '$.movement',
                    json_object(
                      'lexicon_id', NULL,
                      'name', COALESCE(NULLIF(json_extract(performer.value, '$.preparation.name'), ''), 'déplacements'),
                      'attributes',
                      CASE
                        WHEN json_valid(json_extract(performer.value, '$.preparation.attributes'))
                        THEN json(json_extract(performer.value, '$.preparation.attributes'))
                        ELSE json('[]')
                      END
                    )
                  )
                  ELSE performer.value
                END,
                '$.preparation', NULL,
                '$.mode', 'movement',
                '$.role', 'movement'
              )
              ELSE performer.value
            END
          )
          FROM json_each(step.value, '$.performers') AS performer
        )
      )
    ) AS step_json
  FROM performance_sequences AS ps
  JOIN json_each(ps.payload, '$.steps') AS step
),
payload_updates AS (
  SELECT
    ps.id AS sequence_id,
    json_set(
      ps.payload,
      '$.steps',
      json(
        (
          SELECT json_group_array(ordered.step_json)
          FROM (
            SELECT su.step_json
            FROM step_updates AS su
            WHERE su.sequence_id = ps.id
            ORDER BY su.step_index
          ) AS ordered
        )
      )
    ) AS next_payload
  FROM performance_sequences AS ps
  WHERE EXISTS (
    SELECT 1
    FROM json_each(ps.payload, '$.steps') AS step
    JOIN json_each(step.value, '$.performers') AS performer
      ON 1 = 1
    WHERE json_extract(performer.value, '$.preparation.lexicon_id') = 'displacements_prep'
      AND COALESCE(json_type(performer.value, '$.attack'), 'null') = 'null'
      AND COALESCE(json_type(performer.value, '$.defense'), 'null') = 'null'
  )
)
UPDATE performance_sequences
SET payload = (
  SELECT next_payload
  FROM payload_updates
  WHERE payload_updates.sequence_id = performance_sequences.id
)
WHERE id IN (SELECT sequence_id FROM payload_updates);
