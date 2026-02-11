export const CLASSIC_V2_TREE_BUCKET_MARKERS = {
  offensive: new Set(["attack_types", "attaques"]),
  action: new Set([
    "engagement",
    "blade_attacks",
    "blade_seizures",
    "no_contact",
    "compound",
    "attaques_au_fer",
    "prises_de_fer",
    "sans_contact",
    "composees",
    "preparations",
  ]),
  defensive: new Set([
    "evasions",
    "esquive",
    "esquives",
    "defensive_actions",
    "actions_defensives",
  ]),
  cible: new Set(["target_zones", "cible", "cibles", "target", "targets"]),
  deplacement: new Set([
    "basic_movements",
    "deplacement",
    "deplacements",
    "movements",
    "movement",
  ]),
  deplacement_complement: new Set([
    "movement_complements",
    "movement-complements",
    "deplacement_complement",
    "deplacement-complement",
    "deplacement_complements",
    "deplacement-complements",
    "movement_complement",
    "movement-complement",
  ]),
  "parade-numero": new Set([
    "positions",
    "position",
    "positions_de_parade",
    "parade-numero",
  ]),
  "parade-attribut": new Set([
    "position_complements",
    "position_complement",
    "parade-attribut",
  ]),
  "defense-attribut": new Set([
    "attributs_defense",
    "attributs_defensifs",
    "defense_complements",
    "defense_complement",
    "defense-attribut",
    "defense-attribute",
  ]),
  "attaque-attribut": new Set(["attack_complements", "attaque-attribut"]),
};

export const CLASSIC_V2_EDIT_PARENT_BY_TYPE = {
  offensive: "attack_types",
  action: "preparations",
  defensive: "defensive_actions",
  cible: "target_zones",
  target: "target_zones",
  deplacement: "movements",
  movement: "movements",
  deplacement_complement: "movement_complements",
  movement_complement: "movement_complements",
  "movement-complement": "movement_complements",
  "parade-numero": "positions",
  "guard-number": "positions",
  "parade-attribut": ["position_complements", "parade-attribut"],
  "guard-attribute": ["position_complements", "parade-attribut"],
  "defense-attribut": [
    "attributs_defense",
    "attributs_defensifs",
    "defense_complements",
    "defense-attribut",
  ],
  "defense-attribute": [
    "attributs_defense",
    "attributs_defensifs",
    "defense_complements",
    "defense-attribut",
  ],
  "attaque-attribut": "attack_complements",
  "attack-attribute": "attack_complements",
};

export const CLASSIC_V2_COMPAT_ID_ALIASES = {
  targets: "target_zones",
  target: "target_zones",
  cibles: "target_zones",
  cible: "target_zones",
  movement: "movements",
  mouvement: "movements",
  mouvements: "movements",
  deplacement: "movements",
  deplacements: "movements",
  movement_complement: "movement_complements",
  deplacement_complement: "movement_complements",
  deplacement_complements: "movement_complements",
  position: "positions",
  offensive: "offensive_actions",
  actions_offensives: "offensive_actions",
  defensive: "defensive_actions",
  actions_defensives: "defensive_actions",
  attaques: "attack_types",
  attack: "attack_types",
  attack_attributes: "attack_complements",
  complements: "attack_complements",
  esquive: "evasions",
  esquives: "evasions",
  attaqes_au_fer: "blade_attacks",
  attaques_au_fer: "blade_attacks",
  blade_attack: "blade_attacks",
  blade_seizure: "blade_seizures",
  prises_de_fer: "blade_seizures",
  sans_contact: "no_contact",
  composees: "compound",
};

export const CLASSIC_V2_COMPAT_ID_BY_PARENT = {
  movement_complements: {
    lateral: "movement_lateral",
  },
  position_complements: {
    lateral: "position_lateral",
  },
  attack_complements: {
    opposition: "opposition_att",
    free_hand: "free_hand_att",
    dagger_buckler: "dagger_buckler_att",
    object: "object_att",
  },
  blade_seizures: {
    opposition: "opposition_prep",
  },
};

export const LEXICON_TABLES = {
  "sabre-laser": {
    armes: "lexicon_light_saber:armes",
    cibles: "lexicon_light_saber:cibles",
    techniques_offensives: "lexicon_light_saber:techniques_offensives",
    attributs_offensifs: "lexicon_light_saber:attributs_offensifs",
    techniques_defensives: "lexicon_light_saber:techniques_defensives",
    attributs_defensifs: "lexicon_light_saber:attributs_defensifs",
    preparations: "lexicon_light_saber:preparations",
    deplacements: "lexicon_light_saber:deplacements",
  },
};

export const SABER_TABLE_TOKEN_PREFIX = "lexicon_light_saber:";
export const SABER_USER_TABLE_TOKEN_PREFIX = "user_lexicon_light_saber:";
export const CLASSIC_USER_TABLE_TOKEN_PREFIX = "user_lexicon_classic:";

export const SABER_TYPE_PARENT_IDS = {
  armes: ["armes", "weapons"],
  postures_base: ["postures_base"],
  garde_principale: ["garde_principale"],
  cibles: ["cibles", "targets", "target_zones", "zones_touche"],
  actions_offensives: ["actions_offensives", "offensive_actions"],
  techniques_offensives: ["actions_offensives", "offensive_actions", "trajectoires_attaque"],
  attributs_attaque: ["attributs_attaque", "attack_attributes"],
  attributs_offensifs: [
    "attributs_attaque",
    "attack_attributes",
    "position_main",
    "intensites_frappe",
    "types_attaques",
    "varietes_attaques",
  ],
  actions_defensives: ["actions_defensives", "defensive_actions"],
  techniques_defensives: ["actions_defensives", "defensive_actions", "parades", "esquives"],
  attributs_defense: ["attributs_defense", "defense_attributes"],
  attributs_defensifs: ["attributs_defense", "defense_attributes", "comportements_lame"],
  preparations: ["preparations"],
  deplacements: ["deplacements", "movements"],
};
