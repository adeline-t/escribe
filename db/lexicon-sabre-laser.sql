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
CREATE UNIQUE INDEX IF NOT EXISTS idx_lexicon_light_saber_lexicon_id ON lexicon_light_saber(lexicon_id);
CREATE INDEX IF NOT EXISTS idx_lexicon_light_saber_parent_id ON lexicon_light_saber(parent_id);

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('saber_v2_root', NULL, 'Escrime au sabre laser - Lexique consolidé', NULL, NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('cibles', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'saber_v2_root' LIMIT 1), 'Cibles et positions', 'équivalent: cibles (classique) + logique de position', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('zone_1', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'cibles' LIMIT 1), 'Zone 1 - Tête', 'Zone de touche simplifiée correspondant à la tête.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('zone_2', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'cibles' LIMIT 1), 'Zone 2 - Bras armé', 'Zone de touche simplifiée correspondant au bras armé.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('zone_3', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'cibles' LIMIT 1), 'Zone 3 - Torse', 'Zone de touche simplifiée correspondant au torse.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('zone_4', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'cibles' LIMIT 1), 'Zone 4 - Bras non armé', 'Zone de touche simplifiée correspondant au bras non armé.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('zone_5', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'cibles' LIMIT 1), 'Zone 5 - Jambe armée', 'Zone de touche simplifiée correspondant à la jambe à l''aplomb du bras armé.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('postures_base', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'saber_v2_root' LIMIT 1), 'Postures de base', 'ajout vs classique', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('posture_attente', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'postures_base' LIMIT 1), 'Posture d''attente', 'jambe dominante avancée | pied avant vers l''adversaire | pied arrière à 45° | genoux légèrement fléchis | écartement à l''aplomb des épaules', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('posture_front', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'postures_base' LIMIT 1), 'Posture de front / Demi-fente', 'jambe arrière tendue | jambe avant pliée | genou avant à l''aplomb de l''orteil', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('posture_retrait', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'postures_base' LIMIT 1), 'Posture de retrait / Demi-fente arrière', 'poids sur jambe arrière | jambe avant tendue', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('fausse_posture', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'postures_base' LIMIT 1), 'Fausse posture', 'poids sur jambe arrière | jambe avant légèrement relevée | feinte de distance pour esquive', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('garde_principale', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'saber_v2_root' LIMIT 1), 'Garde principale', 'ajout vs classique', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('prime', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'garde_principale' LIMIT 1), 'Prime', 'ferme: côté non armé / intérieur | pointe: basse (nadir) | main: pronation', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('seconde', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'garde_principale' LIMIT 1), 'Seconde', 'ferme: côté armé / extérieur | pointe: basse (nadir) | main: pronation', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('tierce', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'garde_principale' LIMIT 1), 'Tierce', 'ferme: côté armé / extérieur | pointe: haute (zenith) | main: pronation', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('quarte', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'garde_principale' LIMIT 1), 'Quarte', 'ferme: côté non armé / intérieur | pointe: haute (zenith) | main: pronation', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('quinte', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'garde_principale' LIMIT 1), 'Quinte', 'ferme: verticale descendante (tête) | pointe: basse | lame: perpendiculaire | main: pronation, épaule bras armé', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('quinte_inverse', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'garde_principale' LIMIT 1), 'Quinte inverse', 'ferme: verticale descendante (tête) | pointe: basse | lame: perpendiculaire | main: pronation, épaule bras non armé', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('sixte', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'garde_principale' LIMIT 1), 'Sixte', 'ferme: côté armé / extérieur | pointe: haute (zenith) | main: supination', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('septime', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'garde_principale' LIMIT 1), 'Septime', 'ferme: côté non armé / intérieur | pointe: basse (nadir) | main: supination', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('octave', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'garde_principale' LIMIT 1), 'Octave', 'ferme: côté armé / extérieur | pointe: basse (nadir) | main: supination', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('deplacements', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'saber_v2_root' LIMIT 1), 'Déplacements', 'aplati, équivalent des déplacements classiques', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('marche', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Marche', 'glissement avant', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('retraite', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Retraite', 'glissement arrière', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('pas_lateral', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Pas latéral', 'glissement latéral', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('fente_avant', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Fente avant', 'Détente de la jambe arrière combinée avec une projection de la jambe avant.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('fente_arriere', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Fente arrière', 'Détente de la jambe avant combinée avec une réception sur la jambe arrière.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('fentes_laterales', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Fentes latérales', 'Fentes réalisées avec une projection du corps sur le côté droit ou gauche.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('fentes_diagonales', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Fentes diagonales', 'Combinaison de fentes avant ou arrière avec une fente latérale.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('fente_inversee_avant', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Fente inversée avant', 'Détente de la jambe avant avec projection de la jambe arrière en avant du combattant.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('fente_inversee_arriere', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Fente inversée arrière', 'Détente de la jambe arrière avec projection de la jambe avant en arrière du combattant.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('redoublement', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Redoublement', 'Fente suivie d''une fente inverse sans reprise de garde.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('changement_garde_avant', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Changement de garde avant', 'grande avancée', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('changement_garde_arriere', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Changement de garde arrière', 'grand recul', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('retour_garde', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Retour en garde', 'Action de revenir à sa posture de garde initiale par un mouvement vers l''arrière; cède de la distance.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('reprise_garde', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Reprise de garde', 'Action de se repositionner en garde par un mouvement vers l''avant; gagne de la distance.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('marche_trois_temps', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Marche en trois temps', 'Succession de deux changements de garde, sans marquer l''appui à la fin du premier pas.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('passe_avant', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Passe avant', 'pas croisé avant', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('passe_arriere', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Passe arrière', 'pas croisé arrière', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('passe_laterale', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Passe latérale', 'pas croisé latéral', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('marche_inversee', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Marche inversée', 'Déplacement vers l''avant en rapprochant le pied arrière puis en avançant le pied avant.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('retraite_inversee', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Retraite inversée', 'Déplacement vers l''arrière en rapprochant le pied avant puis en reculant le pied arrière.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('bond_avant', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Bond avant', 'Saut en avant avec poussée et réception simultanée des deux pieds.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('bond_arriere', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Bond arrière', 'Saut en arrière avec poussée et réception simultanée des deux pieds.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('volte', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Volte', 'Déplacement consistant à effectuer une demi-volte suivie d''un changement de garde en avant.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('contre_volte', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Contre-volte', 'Déplacement consistant en un changement de garde en avant suivi d''une demi-volte.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('demi_volte', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Demi-volte', 'Pivot sur la pointe du pied avant pendant que le pied arrière fait un demi-cercle pour inverser la garde.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('volte_sautee', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Volte sautée', 'Volte pouvant se faire vers l''avant ou l''arrière (technique de la feuille morte).', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('glissade', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Glissade', 'Action de glisser au sol sur ses deux tibias.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('roulade', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'deplacements' LIMIT 1), 'Roulade', 'Action de faire un tour sur soi-même au sol en se projetant bras tendus.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('actions_offensives', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'saber_v2_root' LIMIT 1), 'Actions offensives', 'équivalent au classique; attaques principales', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('horizontales', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_offensives' LIMIT 1), 'Horizontales', 'Trajectoires d''attaque horizontales.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('verticales', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_offensives' LIMIT 1), 'Verticales', 'variations: descendante | ascendante', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('obliques', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_offensives' LIMIT 1), 'Obliques', 'variations: descendante | ascendante | intérieur | extérieur | par-dessus | par-dessous', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('estoc', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_offensives' LIMIT 1), 'Estoc', 'variations: dessus | dedans | dehors | dessous', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('couronne', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_offensives' LIMIT 1), 'Couronné', 'Attaque en tranché intérieur ou extérieur avec grand mouvement circulaire passant au-dessus de la tête.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('balayage', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_offensives' LIMIT 1), 'Balayage', 'Attaque en oblique remontante visant le genou, accompagnée d''un changement de garde avant.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('attributs_attaque', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'saber_v2_root' LIMIT 1), 'Attributs d''attaque', 'regroupement: position_main + intensites_frappe + types_attaques + varietes_attaques', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('pronation', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Pronation', 'Position de la main lorsque la paume est tournée vers le sol.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('supination', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Supination', 'Position de la main lorsque la paume est tournée vers le ciel.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('legere', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Légère (shim)', 'Intensité légère (shim): frappe légère produisant une brûlure simulée.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('moderee', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Modérée (cho)', 'Intensité modérée (cho): frappe moyenne visant un coup marqué.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('puissante', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Puissante (sai)', 'Intensité puissante (sai): frappe visant un coup décisif et incapacitant.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('attaque_directe', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Attaque directe', 'Attaque exécutée avec une trajectoire continue.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('attaque_indirecte', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Attaque indirecte', 'Attaque exécutée avec un changement de trajectoire, sans tirer parti d''une réaction adverse.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('attaque_avec_preparation', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Attaque avec préparation', 'Attaque précédée d''une préparation.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('attaque_simple', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Attaque simple', 'Attaque exécutée en un seul temps.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('attaque_composee', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Attaque composée', 'Attaque comprenant une ou plusieurs feintes d''attaque.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('attaque_avec_remise', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Attaque avec remise', 'Seconde action offensive immédiate avec changement de trajectoire par retrait de pointe.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('coule', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Coulé', 'Action de glisser sa lame le long de la lame adverse en allongeant le bras pour préparer l''attaque.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('derobement', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Dérobement', 'Action offensive ou contre-offensive consistant à soustraire sa lame à la préparation de lame adverse.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('contre_temps', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Contre-temps', 'Action offensive de seconde intention visant à provoquer l''attaque adverse pour la parer puis riposter.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('descendante', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Descendante', 'Trajectoire de frappe de haut en bas par rapport au corps de l''adversaire.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('ascendante', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Ascendante', 'Trajectoire de frappe de bas en haut par rapport au corps de l''adversaire.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('interieur', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Intérieur', 'Trajectoire passant du côté intérieur de l''adversaire.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('exterieur', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Extérieur', 'Trajectoire passant du côté extérieur de l''adversaire.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('par_dessus', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Par-dessus', 'Trajectoire atteignant la cible en passant du haut vers le bas.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('par_dessous', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'Par-dessous', 'Trajectoire atteignant la cible en passant du bas vers le haut.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('estoc_dessus', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'dessus', 'Ligne d''estoc en dessus.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('estoc_dedans', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'dedans', 'Ligne d''estoc en dedans.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('estoc_dehors', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'dehors', 'Ligne d''estoc en dehors.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('estoc_dessous', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_attaque' LIMIT 1), 'dessous', 'Ligne d''estoc en dessous.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('actions_defensives', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'saber_v2_root' LIMIT 1), 'Actions défensives', 'aplati, équivalent au classique', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('parades_laterales', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_defensives' LIMIT 1), 'Parades latérales', 'Parades réalisées latéralement pour bloquer l''attaque.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('parades_circulaires', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_defensives' LIMIT 1), 'Parades circulaires', 'Parades réalisées en trajectoire circulaire.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('parades_semi_circulaires', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_defensives' LIMIT 1), 'Parades semi-circulaires', 'Parades réalisées en trajectoire semi-circulaire.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('parades_diagonales', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_defensives' LIMIT 1), 'Parades diagonales', 'Parades réalisées en trajectoire diagonale.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('parade_passive', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_defensives' LIMIT 1), 'Parade passive', 'Parade où le défenseur reste sur sa position.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('parade_active', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_defensives' LIMIT 1), 'Parade active', 'Parade où le défenseur ajoute un déplacement pour s''adapter à l''attaque adverse.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('esquives_partielles', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_defensives' LIMIT 1), 'Esquives partielles', 'déplacement d''un segment, haut du corps ou un point d''appui', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('esquives_totales', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'actions_defensives' LIMIT 1), 'Esquives totales', 'déplacement de l''ensemble du corps, deux points d''appui', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('attributs_defense', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'saber_v2_root' LIMIT 1), 'Attributs de défense', 'comportements de lame', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('du_tac', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_defense' LIMIT 1), 'Du tac', 'Comportement de lame de parade: écarter la lame adverse par un contact.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('opposition', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_defense' LIMIT 1), 'D''opposition', 'Comportement de lame de parade: maintenir le contact sans choc.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('en_cedant', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'attributs_defense' LIMIT 1), 'En cédant', 'Comportement de lame de parade: détourner la lame adverse pour l''entraîner vers une autre trajectoire.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('preparations', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'saber_v2_root' LIMIT 1), 'Préparations', 'fusion: preparations + ripostes_contre_offensives (aplati)', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('engagement_definition', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Engagement', 'Situation de deux lames en contact.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('prendre_engagement', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Prendre l''engagement', 'Action de joindre la lame adverse.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('changer_engagement', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Changer d''engagement', 'Action de prendre l''engagement dans la ligne opposée à celle déjà occupée.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('battement', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Battement', 'Engagement du bras suivi d''une action de frapper la lame adverse.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('pression', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Pression', 'Engagement du bras suivi d''un appui sur la lame adverse.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('froissement', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Froissement', 'Engagement du bras suivi d''une pression prolongée brusque et puissante en glissant vers la partie forte.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('opposition_prise', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Opposition', 'Prise de lame qui maîtrise progressivement la lame adverse sans changer de ligne.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('croise', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Croisé', 'Prise de lame qui amène progressivement la lame adverse d''une ligne haute à une ligne basse du même côté (ou inversement).', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('liement', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Liement', 'Prise de lame qui amène progressivement la lame adverse d''une ligne haute à une ligne basse opposée (ou inversement).', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('enveloppement', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Enveloppement', 'Prise de lame qui ramène la lame adverse dans la même ligne par un mouvement circulaire de la pointe.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('feintes', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Feintes', 'Simulacres d''actions offensives ou défensives.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('invites', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Invites', 'Actions visant à découvrir volontairement une zone de touche.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('arme_engagement', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Armé d''engagement', 'Mouvement positionnant le corps entre la totalité de l''arme et l''adversaire avant le mouvement continu vers la cible.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('arme_simple', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Armé simple', 'Mouvement positionnant le corps entre la pointe de l''arme et l''adversaire avant le mouvement continu vers la cible.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('orbites_horizontales', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Orbites horizontales (halo)', 'Moulinets où la lame décrit un cercle dans un plan horizontal autour du corps (halo).', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('orbites_verticales', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Orbites verticales', 'Moulinets où la lame décrit un cercle ascendant ou descendant.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('changements_de_gardes', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Changements de gardes', 'Préparations par positionnement via des changements de garde.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('changements_de_postures', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Changements de postures', 'Préparations par positionnement via des changements de posture du corps.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('tac_au_tac', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Du tac-au-tac', 'Riposte portée immédiatement après la protection.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('temps_perdu', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'À temps perdu', 'Riposte non immédiate, avec un temps marqué avant l''action.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('contre_riposte', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Contre-riposte', 'Riposte qui suit la protection d''une riposte.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('contre_attaques', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Contre-attaques', 'Actions de contre-offensive portées dans une attaque adverse déjà débutée.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)
VALUES ('derobements', (SELECT id FROM lexicon_light_saber WHERE lexicon_id = 'preparations' LIMIT 1), 'Dérobements', 'Actions de contre-offensive consistant à soustraire sa lame à la préparation de lame adverse.', NULL, 'seed')
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

UPDATE lexicon_light_saber SET deleted_at = CURRENT_TIMESTAMP WHERE source = 'seed' AND lexicon_id NOT IN (
  'saber_v2_root',
  'cibles',
  'zone_1',
  'zone_2',
  'zone_3',
  'zone_4',
  'zone_5',
  'postures_base',
  'posture_attente',
  'posture_front',
  'posture_retrait',
  'fausse_posture',
  'garde_principale',
  'prime',
  'seconde',
  'tierce',
  'quarte',
  'quinte',
  'quinte_inverse',
  'sixte',
  'septime',
  'octave',
  'deplacements',
  'marche',
  'retraite',
  'pas_lateral',
  'fente_avant',
  'fente_arriere',
  'fentes_laterales',
  'fentes_diagonales',
  'fente_inversee_avant',
  'fente_inversee_arriere',
  'redoublement',
  'changement_garde_avant',
  'changement_garde_arriere',
  'retour_garde',
  'reprise_garde',
  'marche_trois_temps',
  'passe_avant',
  'passe_arriere',
  'passe_laterale',
  'marche_inversee',
  'retraite_inversee',
  'bond_avant',
  'bond_arriere',
  'volte',
  'contre_volte',
  'demi_volte',
  'volte_sautee',
  'glissade',
  'roulade',
  'actions_offensives',
  'horizontales',
  'verticales',
  'obliques',
  'estoc',
  'couronne',
  'balayage',
  'attributs_attaque',
  'pronation',
  'supination',
  'legere',
  'moderee',
  'puissante',
  'attaque_directe',
  'attaque_indirecte',
  'attaque_avec_preparation',
  'attaque_simple',
  'attaque_composee',
  'attaque_avec_remise',
  'coule',
  'derobement',
  'contre_temps',
  'descendante',
  'ascendante',
  'interieur',
  'exterieur',
  'par_dessus',
  'par_dessous',
  'estoc_dessus',
  'estoc_dedans',
  'estoc_dehors',
  'estoc_dessous',
  'actions_defensives',
  'parades_laterales',
  'parades_circulaires',
  'parades_semi_circulaires',
  'parades_diagonales',
  'parade_passive',
  'parade_active',
  'esquives_partielles',
  'esquives_totales',
  'attributs_defense',
  'du_tac',
  'opposition',
  'en_cedant',
  'preparations',
  'engagement_definition',
  'prendre_engagement',
  'changer_engagement',
  'battement',
  'pression',
  'froissement',
  'opposition_prise',
  'croise',
  'liement',
  'enveloppement',
  'feintes',
  'invites',
  'arme_engagement',
  'arme_simple',
  'orbites_horizontales',
  'orbites_verticales',
  'changements_de_gardes',
  'changements_de_postures',
  'tac_au_tac',
  'temps_perdu',
  'contre_riposte',
  'contre_attaques',
  'derobements'
);
