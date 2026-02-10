CREATE TABLE IF NOT EXISTS lexicon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lexicon_id TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  deleted_at TEXT,
  source TEXT NOT NULL DEFAULT 'seed',
  FOREIGN KEY(parent_id) REFERENCES lexicon(id)
);

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'classic_v2_root',
  p.id,
  'Escrime historique française - Lexique complet',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON 1 = 0
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'target_zones',
  p.id,
  'zones de touche (cibles)',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'classic_v2_root'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_head',
  p.id,
  'tête',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_face',
  p.id,
  'visage',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_figure',
  p.id,
  'figure',
  'Figure : cible se situant du côté droit ou du côté gauche de la tête(figure à droite et figure à gauche)',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_front_shoulder',
  p.id,
  'épaule avant',
  'Épaule du côté de la jambe avant',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_back_shoulder',
  p.id,
  'épaule arrière',
  'Épaule du côté de la jambe arrière',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_chest',
  p.id,
  'poitrine',
  'cible se situant du côté opposé de l''arme et en-dessous du visage',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_arm',
  p.id,
  'bras armé',
  'bras porteur d''une arme',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_front_leg',
  p.id,
  'jambe avant',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_back_leg',
  p.id,
  'jambe arrière',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_flank',
  p.id,
  'flanc',
  'cible se situant sous le bras armé',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'zone_belly',
  p.id,
  'ventre',
  'cible située du côté opposé de l''arme, sous la poitrine',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'above',
  p.id,
  'dessus',
  'Ligne haute',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'below',
  p.id,
  'dessous',
  'Ligne basse',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'inside',
  p.id,
  'dedans',
  'Ligne intérieure, du côté opposé au bras armé',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'outside',
  p.id,
  'dehors',
  'Ligne extérieure, du côté du bras armé',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'target_zones'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'movements',
  p.id,
  'déplacements',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'classic_v2_root'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'foot_stamp',
  p.id,
  'appel de pied',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'balestra',
  p.id,
  'balestra',
  'saut réalisé par une action simultanée de la poussée du pied arrière et du lancement de la jambe avant avec une réception en garde sur les deux pieds et appel du pied avant',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'jump',
  p.id,
  'bond saut',
  'Bond avant : saut en avant réalisé grâce à la projection du pied avant et la poussée simultanée de la jambe arrière, suivi d''une réception sur les deux jambes. Bond arrière : saut en arrière en gardant la posture de garde et qui permet de se mettre hors de portée si l''on est surpris par une action offensive adverse',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'guard_change',
  p.id,
  'changement de garde',
  'mouvement en un seul temps permettant de se retrouver dans une position de garde inversée par rapport à celle d''origine, en restant face au partenaire',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'half_advance',
  p.id,
  'demi-marche',
  'moité d''une marche avant',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'half_pass',
  p.id,
  'demi-passe',
  'moitié d''une passe',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'half_retreat',
  p.id,
  'demi-retraite',
  'moitié d''une retraite',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'half_volta',
  p.id,
  'demi-volte',
  'déplacement à caractère offensif, qui consiste à pivoter sur la pointe du pied avant vers l''intérieur en tournant son dos au partenaire tandis que le pied arrière fait un demi-cercle par l''arrière pour se retrouver à l''avant, aboutissant à un changement de garde (garde inversée). Demi-volte arrière : mouvement qui consiste à pivoter sur le pied arrière en tournant son dos au partenaire tandis que le pied avant fait un demi-cercle vers l''arrière pour se retrouver en arrière, aboutissant à un changement de garde (garde inversée)',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'lunge',
  p.id,
  'fente',
  'mouvement vers l''avant consistant en une extension de la jambe arrière combinée avec une projection de la jambe avant. Il existe des fentes inversées appelées aussi fentes croisées, des fentes diagonales et latérales gauche et droite et arrières. L''amplitude de la fente est modulable en fonction des cibles visées et de l''intention de l''attaquant : demi-fente, fente maximale',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'fleche',
  p.id,
  'flèche',
  'allongement du bras coordonné avec un léger déséquilibre du buste vers l''avant, suivi d''une extension horizontale du corps réalisée grâce à la poussée de la jambe avant, en effectuant un pas croisé comparable à un départ de sprint suivi par une reprise d''appuis sur le pied gauche pour un droitier',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'advance',
  p.id,
  'marche',
  'la progression du pied avant immédiatement suivie du pied arrière, avec toujours la même distance entre les deux pieds. Marche inversée : elle consiste à rapprocher le pied arrière du pied avant, les jambes restant fléchies, le corps immobile et à porter ensuite le pied avant à sa distance. Elle permet de gagner de la mesure',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'pass',
  p.id,
  'passe',
  'Passe avant : déplacement vers l''avant en passant le pied arrière devant le pied avant, replacer ensuite ce dernier dans la position de garde. Appelé également « pas croisé ». Passe arrière : pas croisé vers l''arrière en passant le pied avant derrière le pied arrière pour replacer ensuite ce dernier dans la position de garde',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'lateral_step',
  p.id,
  'pas latéral (glissement)',
  'Déplacements latéraux sans croiser les pieds : déplacements alternatifs des appuis vers la droite ou la gauche sans que les pieds ne se croisent. Déplacements latéraux en croisant les pieds : déplacements alternatifs des appuis vers la droite ou la gauche en croisant les pieds',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'quarter_volta',
  p.id,
  'quart de volte',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'lunge_redoublement',
  p.id,
  'redoublement de fente',
  'l''escrimeur étant fendu, il effectue une reprise de garde et réalise une nouvelle action offensive simple ou composée en se fendant',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'guard_recovery',
  p.id,
  'reprise de garde',
  'action de revenir en garde vers l''avant après une fente. Reprise de garde en passe avant : action de revenir en garde vers l''avant après une fente par une passe avant. Reprise de garde avec changement de garde : action de revenir en garde inversée vers l''avant après une fente',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'return_guard',
  p.id,
  'retour en garde',
  'action de revenir en garde vers l''arrière après une fente. Retour en garde en passe arrière : action de revenir en garde vers l''arrière, en effectuant une passe arrière. Retour en garde avec changement de garde : action de revenir en garde inversée vers l''arrière après une fente',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'retreat',
  p.id,
  'retraite',
  'actions alternatives des appuis vers l''arrière sans que les pieds ne se croisent et qui débutent (les actions) par le pied arrière. Retraite inversée : mouvement vers l''arrière en restant en garde, qui débute par une action du pied avant qui recule en glissant sans dépasser le pied arrière, immédiatement suivie d''un retrait du pied arrière pour se replacer en garde',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'volta',
  p.id,
  'volte',
  'déplacement à caractère offensif qui consiste à effectuer une demi-volte suivie d''un changement de garde en avant, aboutissant à un retour à la garde de départ (garde identique). Contre-volte : déplacement à caractère offensif qui consiste en un changement de garde en avant, suivi d''une demi-volte, aboutissant à un retour à la garde de départ (garde identique). Volte arrière : déplacement à caractère défensif qui consiste à effectuer une demi-volte arrière suivie d''un changement de garde en arrière, aboutissant à un retour à la garde de départ (garde identique). Contre-volte arrière : déplacement à caractère défensif qui consiste en un changement de garde en arrière, suivi d''une demi-volte arrière, aboutissant à un retour à la garde de départ (garde identique)',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'movement_complements',
  p.id,
  'compléments de déplacement',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'classic_v2_root'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'forward',
  p.id,
  'avant',
  'Vers l''avant',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movement_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'backward',
  p.id,
  'arrière',
  'Vers l''arrière',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movement_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'movement_lateral',
  p.id,
  'latéral',
  'Sur le côté',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movement_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'interior',
  p.id,
  'intérieur',
  'Vers l''intérieur',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movement_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'exterior',
  p.id,
  'extérieur',
  'Vers l''extérieur',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movement_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'reverse',
  p.id,
  'inverse',
  'dans le sens contraire',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movement_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'mov_diagonal',
  p.id,
  'diagonal',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'movement_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'positions',
  p.id,
  'positions',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'classic_v2_root'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_1',
  p.id,
  '1',
  'Prime : parade couvrant l''épaule gauche. La pointe plus basse que la main, le bras horizontal. Le poignet est dans l''axe de l''avant-bras. La main est en pronation',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'positions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_2',
  p.id,
  '2',
  'Seconde : parade couvrant la jambe droite. La pointe plus basse que la main. Le poignet est dans l''axe de l''avant-bras. La main est en pronation',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'positions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_3',
  p.id,
  '3',
  'Tierce : parade couvrant l''épaule de la main armée. La pointe est plus haute que la main. Le poignet est dans l''axe de l''avant-bras. La main est en semi-pronation',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'positions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_4',
  p.id,
  '4',
  'Quarte : parade couvrant l''épaule gauche. La pointe plus haute que la main. Le poignet est dans l''axe de l''avant-bras. La main est en supination',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'positions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_5',
  p.id,
  '5',
  'Quinte : dites aussi parade St-Georges. Parade couvrant la tête et les épaules. La lame est horizontale, la paume vers l''avant, le poignet dans l''axe de l''avant-bras. La main est en pronation ou en semi-pronation',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'positions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_6',
  p.id,
  '6',
  'Sixte : parade utilisée en escrime sportive moderne',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'positions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_7',
  p.id,
  '7',
  'Septime : parade couvrant la jambe gauche. La pointe plus basse que la main. Le poignet est dans l''axe de l''avant-bras. La main en supination',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'positions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_8',
  p.id,
  '8',
  'Octave haute : parade couvrant l''épaule de la main armée. La pointe est plus basse que la main. La main est en supination',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'positions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_9',
  p.id,
  '9',
  'None : pour les nostalgiques, la neuvième parade créée par Alfred Jarry dans La Dragonne, sa dernière pièce « c''est une quarte relevée ou une tierce avec la main de quarte »',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'positions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_complements',
  p.id,
  'compléments de position',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'classic_v2_root'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'position_lateral',
  p.id,
  'latérale',
  'Parade latérale ou directe : parade exécutée directement d''une ligne haute vers l''autre ligne haute ou d''une ligne basse vers l''autre ligne basse',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'circular',
  p.id,
  'circulaire',
  'Parades circulaires ou contres : parades exécutées en faisant un mouvement circulaire avec son arme afin de rejeter la pointe adverse d''une ligne vers une autre. On les appelle communément les contres',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'semi_circular',
  p.id,
  'semi-circulaire',
  'Parades semi-circulaires : parades exécutées en faisant un demi-cercle de la ligne haute vers la ligne basse correspondante ou inversement',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'diagonal',
  p.id,
  'diagonale',
  'Parades diagonales : parades exécutées en suivant une trajectoire d''une ligne haute vers une ligne basse opposée ou inversement',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'au_tac',
  p.id,
  'du tac',
  'Parade du tac : c''est écarter la lame adverse avec un battement',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'yielding',
  p.id,
  'en cédant',
  'Parades en cédant : elles consistent à détourner la lame adverse en l''entraînant (sans la quitter) dans une ligne autre que celle où devait se terminer l''offensive. Ces parades sont utilisées uniquement contre les offensives précédées de prises de fer',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'high',
  p.id,
  'haute',
  'Position haute de la parade',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'low',
  p.id,
  'basse',
  'Position basse de la parade',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'inverted',
  p.id,
  'inversée',
  'Quinte inversée : parade couvrant la tête et les épaules. La pointe légèrement vers le haut, la lame oblique, la paume vers l''arrière. Le poignet dans l''axe de l''avant-bras. La main est en supination ou semi-supination',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'free_hand',
  p.id,
  'main libre',
  'Combat avec une seule arme, l''autre main étant libre',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'dagger_buckler',
  p.id,
  'dague / bocle',
  'Combat avec arme principale et arme ou protection secondaire (dague, petit bouclier rond)',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'object',
  p.id,
  'cape / objet',
  'Combat utilisant un objet défensif comme une cape en complément de l''arme',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'crossed',
  p.id,
  'en croix',
  'Parade en croix : action défensive faite avec deux armes formant une croix de Saint-André. Parade double réalisée avec deux armes croisées. Utilisée pour se protéger notamment des coups violents précédés de moulinets et couronnés. Parade en croix haute : action défensive avec deux armes qui se croisent au-dessus de la tête, avec les deux pointes vers le ciel afin de se protéger des coups portés à la tête. Parade en croix basse : action défensive avec deux armes (double seconde) sur un coup d''estoc protégeant le bas ventre, les deux pointes vers le sol',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'double',
  p.id,
  'double',
  'La parade double : elle s''exécute lorsque la dague vient renforcer la parade de l''arme principale, en se plaçant de côté dans une position parallèle',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'position_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'attack_types',
  p.id,
  'actions offensives',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'classic_v2_root'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'thrust',
  p.id,
  'coup de pointe',
  'Estoc : coup porté avec la pointe de l''arme',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_types'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'cut',
  p.id,
  'coup de tranché',
  'Taille et contre-taille : coup porté avec le tranchant ou le contre-tranchant de l''arme. Attaque de taille (ou de tranchant) : coup qui nécessite généralement un armé du bras, et porté avec le tranchant sur une cible précise, réalisé en marchant, en passe avant, en se fendant',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_types'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'dagger_buckler_att',
  p.id,
  'dague / bocle',
  'Combat avec arme principale et arme ou protection secondaire (dague, petit bouclier rond)',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_types'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'free_hand_att',
  p.id,
  'main libre',
  'Combat avec une seule arme, l''autre main étant libre',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_types'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'object_att',
  p.id,
  'cape / objet',
  'Combat utilisant un objet défensif comme une cape en complément de l''arme',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_types'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'attack_complements',
  p.id,
  'compléments d''attaques',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'classic_v2_root'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'crown',
  p.id,
  'couronné',
  'Couronné : action offensive. À partir de la quinte, moulinet semi-circulaire horizontal dirigé vers les épaules. Il se décline en couronné droit ou couronné revers',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'broken',
  p.id,
  'brisé',
  'Brisé : action offensive. À partir de la tierce, moulinet circulaire vertical dirigé sur la tête. Le sens de rotation du poignet se fait du bas vers le haut. Il se décline en brisé droit ou brisé revers. Technique utilisée à la canne, au bâton, et au sabre au 19e siècle',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'lifted',
  p.id,
  'enlevé',
  'Enlevé : action offensive. À partir de la tierce, moulinet semi-circulaire vertical dirigé vers l''entrejambe ou le poignet. Le sens de rotation du poignet se fait du haut vers le bas, il se décline en enlevé droit ou enlevé revers. Technique utilisée en canne de combat au 19e siècle',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'diagonals',
  p.id,
  'diagonales',
  'Trajectoires de coups de taille portés en ligne diagonale (exemple : attaque par coup droit descendant de l''épaule vers la hanche opposée, attaque par revers montant)',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'obverse_exterior',
  p.id,
  'avers / extérieur',
  'Orientation de la lame côté tranchant vers l''extérieur. Coup droit de taille : coup qui part de la droite pour frapper le côté gauche du partenaire. La main est en supination',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'reverse_interior',
  p.id,
  'revers / intérieur',
  'Orientation de la lame côté contre-tranchant vers l''intérieur. Coup de revers : coup qui part de la gauche pour frapper le côté droit de l''adversaire. La main est en pronation',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'emprenation',
  p.id,
  'pronation',
  'Position de main où la paume est tournée vers le bas',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'supination',
  p.id,
  'supination',
  'Position de main où la paume est tournée vers le haut',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'streamer',
  p.id,
  'banderole',
  'Banderole : terme spécifique qui définit l''action offensive de taille portée sur la cible haute opposée au bras armé',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'grounded',
  p.id,
  'terrassé',
  'Position au sol, que ce soit après avoir porté ou reçu un coup',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'attack_complements'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'defensive_actions',
  p.id,
  'actions défensives',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'classic_v2_root'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'parry',
  p.id,
  'parade',
  'Parades : ce sont les actions qui consistent à se protéger des différentes actions offensives d''estoc et de taille portées par un partenaire, réalisées en écartant un coup de pointe ou en bloquant un coup de tranchant de l''adversaire avec son arme',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'defensive_actions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'unbalance',
  p.id,
  'déséquilibre',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'defensive_actions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'evasion_backward',
  p.id,
  'esquive arrière',
  'L''esquive arrière : c''est un mouvement du corps vers l''arrière (retraite, bond) réalisé pour éviter une action offensive',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'defensive_actions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'evasion_low',
  p.id,
  'esquive basse',
  'L''esquive en se baissant : déclinée en deux façons ; l''une avec le tronc qui se fléchit latéralement en passant sous la lame de l''adversaire, l''autre grâce à une flexion des deux jambes en restant en garde',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'defensive_actions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'evasion_jumping',
  p.id,
  'esquive en sautant',
  'Esquive réalisée en sautant pour éviter un coup bas',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'defensive_actions'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'preparations',
  p.id,
  'préparations',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'classic_v2_root'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'engagement_simple',
  p.id,
  'engagement',
  'Engagement : situation de deux lames en contact. Prendre l''engagement c''est l''action de joindre le fer adverse',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'engagement_change',
  p.id,
  'changement d''engagement',
  'Changement d''engagement : c''est prendre l''engagement dans une autre ligne. Double-engagement : c''est la succession de deux engagements ou de deux changements d''engagement',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'beat',
  p.id,
  'battement',
  'Battement : frappe brève et plus ou moins forte effectuée sur la lame adverse. Le contre-battement est un battement d''autorité qui suit immédiatement un battement. Le changez-battez : il s''agit d''un battement précédé d''un changement de ligne',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'pressure',
  p.id,
  'pression',
  'Pression : poussée latérale exécutée sur la lame adverse après avoir pris contact avec celle-ci',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'froissement',
  p.id,
  'froissement',
  'Froissement : action tenant à la fois de la friction et de la pression, exécutée avec la lame sur toute la longueur du fer adverse, permettant souvent le désarmement',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'opposition_prep',
  p.id,
  'opposition',
  'Opposition : prise de fer où l''on s''empare de la lame adverse dans une ligne en la maitrisant jusqu''à la touche sans changer de ligne. Parade d''opposition : parade exécutée sans choc sur la lame adverse en maintenant le contact',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'croise',
  p.id,
  'croisé',
  'Croisé : prise de fer verticale où l''on s''empare de la lame adverse dans une ligne haute, pour l''amener dans la ligne basse du même côté. Il peut aussi s''exécuter de ligne basse à ligne haute',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'bind',
  p.id,
  'liement',
  'Liement : prise de fer diagonale où l''on s''empare de la lame adverse en la maitrisant progressivement d''une ligne haute à une ligne basse diagonalement opposée et inversement d''une ligne basse à une ligne haute. (Exemple : de la quarte vers l''octave, de l''octave vers la quarte)',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'envelopment',
  p.id,
  'enveloppement',
  'Enveloppement : prise de fer circulaire où l''on s''empare de la lame adverse dans une ligne en la maitrisant progressivement, pour la ramener dans la même ligne par un mouvement enveloppant de la lame',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'feint',
  p.id,
  'feinte',
  'Feintes : simulacres d''action offensive ou contre-offensive réalisés de pied ferme ou en se déplaçant : feinte d''attaque, feinte de riposte, feinte de contre-attaque. Fausses attaques : feintes d''attaque réalisées avec la demi-fente',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'invitation',
  p.id,
  'invite',
  'Invites : gestes qui consistent à ouvrir volontairement une ligne à l''adversaire pour le faire attaquer là où on l''attend. L''invite prend le nom de la position de main placée avant l''ouverture de la ligne. Exemple : invite en seconde, invite en quarte, invite en quinte, etc.',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'threat',
  p.id,
  'menace',
  NULL,
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'disengagement',
  p.id,
  'dégagement',
  'Dégagement : action d''estoc indirectement portée, grâce à un passage sous la lame adverse lorsque les pointes sont hautes et un passage au-dessus de la lame adverse lorsque les pointes sont basses',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'cut_over',
  p.id,
  'coupé',
  'Coupé : action de pointe indirectement portée, grâce à un passage devant la pointe de l''arme de l''adversaire lorsque les pointes sont hautes et au-dessous de la pointe adverse lorsque les pointes sont basses',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'derobement',
  p.id,
  'dérobement',
  'Dérobement : action indirecte simple ou composée, à caractère offensif ou contre-offensif, réalisée généralement sur des recherches de fer',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'contre_temps',
  p.id,
  'contre-temps',
  'Le contre temps : terme qui désigne la parade et la riposte d''une contre-attaque',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'riposte',
  p.id,
  'riposte',
  'La riposte : action de touche simple directe, indirecte, composée ou par prise de fer, qui suit une parade. Elle est réalisée de pied ferme, en marchant, en se fendant, en marche et fente ou en flèche, et porte le nom du geste offensif, les ripostes peuvent être immédiates ou à temps perdu. La contre-riposte : il s''agit de l''action de pointe ou de taille simple directe, indirecte, composée ou par prise de fer qui suit une parade non initiale dans un échange',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)
SELECT
  'counter_attack',
  p.id,
  'contre-attaque',
  'Arrêt : action contre-offensive simple sans le fer. Arrêts avec fer : actions contre-offensives réalisées en prenant le fer adverse, autrefois appelées coup de temps. Coup de temps d''opposition : contre-offensive exécutée en fermant la ligne où doit se terminer l''offensive. Coup de temps d''interception : contre-offensive qui intercepte le passage de l''offensive adverse en cours d''exécution. Contre arrêt : contre-offensive exécutée sur une contre-attaque adverse',
  NULL,
  'seed'
FROM (SELECT 1) AS _
LEFT JOIN lexicon p ON p.lexicon_id = 'preparations'
ON CONFLICT(lexicon_id) DO UPDATE SET
  parent_id = excluded.parent_id,
  name = excluded.name,
  description = excluded.description,
  deleted_at = NULL,
  source = 'seed';

UPDATE lexicon
SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
WHERE source = 'seed'
  AND deleted_at IS NULL
  AND lexicon_id NOT IN ('classic_v2_root', 'target_zones', 'zone_head', 'zone_face', 'zone_figure', 'zone_front_shoulder', 'zone_back_shoulder', 'zone_chest', 'zone_arm', 'zone_front_leg', 'zone_back_leg', 'zone_flank', 'zone_belly', 'above', 'below', 'inside', 'outside', 'movements', 'foot_stamp', 'balestra', 'jump', 'guard_change', 'half_advance', 'half_pass', 'half_retreat', 'half_volta', 'lunge', 'fleche', 'advance', 'pass', 'lateral_step', 'quarter_volta', 'lunge_redoublement', 'guard_recovery', 'return_guard', 'retreat', 'volta', 'movement_complements', 'forward', 'backward', 'movement_lateral', 'interior', 'exterior', 'reverse', 'mov_diagonal', 'positions', 'position_1', 'position_2', 'position_3', 'position_4', 'position_5', 'position_6', 'position_7', 'position_8', 'position_9', 'position_complements', 'position_lateral', 'circular', 'semi_circular', 'diagonal', 'au_tac', 'yielding', 'high', 'low', 'inverted', 'free_hand', 'dagger_buckler', 'object', 'crossed', 'double', 'attack_types', 'thrust', 'cut', 'dagger_buckler_att', 'free_hand_att', 'object_att', 'attack_complements', 'crown', 'broken', 'lifted', 'diagonals', 'obverse_exterior', 'reverse_interior', 'emprenation', 'supination', 'streamer', 'grounded', 'defensive_actions', 'parry', 'unbalance', 'evasion_backward', 'evasion_low', 'evasion_jumping', 'preparations', 'engagement_simple', 'engagement_change', 'beat', 'pressure', 'froissement', 'opposition_prep', 'croise', 'bind', 'envelopment', 'feint', 'invitation', 'threat', 'disengagement', 'cut_over', 'derobement', 'contre_temps', 'riposte', 'counter_attack');
