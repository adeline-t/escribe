CREATE TABLE IF NOT EXISTS deplacement (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_deplacement (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL);

INSERT INTO deplacement (label)
SELECT DISTINCT label FROM deplacement_attaque
WHERE label NOT IN (SELECT label FROM deplacement);

INSERT INTO deplacement (label)
SELECT DISTINCT label FROM deplacement_defense
WHERE label NOT IN (SELECT label FROM deplacement);

INSERT INTO user_deplacement (user_id, label)
SELECT user_id, label FROM user_deplacement_attaque
WHERE NOT EXISTS (
  SELECT 1 FROM user_deplacement ud
  WHERE ud.user_id = user_deplacement_attaque.user_id AND ud.label = user_deplacement_attaque.label
);

INSERT INTO user_deplacement (user_id, label)
SELECT user_id, label FROM user_deplacement_defense
WHERE NOT EXISTS (
  SELECT 1 FROM user_deplacement ud
  WHERE ud.user_id = user_deplacement_defense.user_id AND ud.label = user_deplacement_defense.label
);

UPDATE user_lexicon_favorites
SET type = 'deplacement'
WHERE type IN ('deplacement-attaque', 'deplacement-defense');

DROP TABLE IF EXISTS deplacement_attaque;
DROP TABLE IF EXISTS deplacement_defense;
DROP TABLE IF EXISTS user_deplacement_attaque;
DROP TABLE IF EXISTS user_deplacement_defense;
