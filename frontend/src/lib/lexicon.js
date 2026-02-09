import lexiconJson from "../data/lexicon.json";
import sabreLexiconJson from "../data/lexicon-sabre-laser.json";

export const DEFAULT_PARTICIPANTS = [
  { name: "A", weapon: "" },
  { name: "B", weapon: "" },
];

export const LEXICON_TYPES = [
  { key: "offensive", label: "actions d'attaque" },
  { key: "action", label: "préparations" },
  { key: "attaque-attribut", label: "attributs d'attaque" },
  { key: "cible", label: "cibles" },
  { key: "deplacement", label: "déplacements" },
  { key: "defensive", label: "actions de défense" },
  { key: "parade-numero", label: "positions de parade" },
  { key: "parade-attribut", label: "attributs de parade" },
];

export const NEW_LEXICON_TYPES = [
  { key: "offensive", label: "actions d'attaque" },
  { key: "attaque-attribut", label: "attributs d'attaque" },
  { key: "cible", label: "cibles" },
  { key: "defensive", label: "actions de défense" },
  { key: "parade-numero", label: "positions de parade" },
  { key: "parade-attribut", label: "attributs de parade" },
  { key: "action", label: "préparations" },
  { key: "deplacement", label: "déplacements" },
  { key: "deplacement_complement", label: "attributs de déplacement" },
];

export const SABRE_LEXICON_TYPES = [
  { key: "armes", label: "Armes" },
  { key: "phases_choregraphie", label: "Phases chorégraphie" },
  { key: "cibles", label: "Cibles" },
  { key: "techniques_offensives", label: "Techniques offensives" },
  { key: "attributs_offensifs", label: "Attributs offensifs" },
  { key: "techniques_defensives", label: "Techniques défensives" },
  { key: "attributs_defensifs", label: "Attributs défensifs" },
  { key: "preparations", label: "Préparations" },
  { key: "deplacements", label: "Déplacements" },
];

// Ordre d'affichage des catégories dans l'atelier de lexique.
// Tu peux modifier cet ordre "en dur" ici.
export const LEXICON_CATEGORY_ORDER = {
  classic: [
    "offensive",
    "attaque-attribut",
    "cible",
    "deplacement",
    "defensive",
    "parade-numero",
    "parade-attribut",
    "action",
  ],
  "classic-v2": [
    "offensive",
    "attaque-attribut",
    "cible",
    "defensive",
    "parade-numero",
    "parade-attribut",
    "action",
    "deplacement",
    "deplacement_complement",
  ],
  "sabre-laser": [
    "armes",
    "phases_choregraphie",
    "techniques_offensives",
    "attributs_offensifs",
    "cibles",
    "techniques_defensives",
    "attributs_defensifs",
    "preparations",
    "deplacements",
  ],
};

function orderLexiconTypes(types, order) {
  if (!Array.isArray(order) || !order.length) return types;
  const rank = new Map(order.map((key, index) => [key, index]));
  return [...types].sort((a, b) => {
    const aRank = rank.has(a.key) ? rank.get(a.key) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.key) ? rank.get(b.key) : Number.MAX_SAFE_INTEGER;
    return aRank - bRank;
  });
}

export function getLexiconTypesForMode(lexiconKey) {
  const base =
    lexiconKey === "sabre-laser"
      ? SABRE_LEXICON_TYPES
      : lexiconKey === "classic-v2"
        ? NEW_LEXICON_TYPES
        : LEXICON_TYPES;
  return orderLexiconTypes(base, LEXICON_CATEGORY_ORDER[lexiconKey]);
}

export function normalizeLexicon(data) {
  return {
    offensive: data.offensive ?? [],
    action: data.action ?? [],
    defensive: data.defensive ?? [],
    cible: data.cible ?? [],
    attackMove:
      data.deplacement ??
      data.deplacements ??
      data["deplacement-attaque"] ??
      data.deplacementAttaque ??
      [],
    defendMove:
      data.deplacement ??
      data.deplacements ??
      data["deplacement-defense"] ??
      data.deplacementDefense ??
      [],
    paradeNumber: data["parade-numero"] ?? data.paradeNumero ?? [],
    paradeAttribute: data["parade-attribut"] ?? data.paradeAttribut ?? [],
    attackAttribute: data["attaque-attribut"] ?? data.attaqueAttribut ?? [],
  };
}

export const DEFAULT_LEXICON = lexiconJson;

export const DEFAULT_SABRE_LEXICON = sabreLexiconJson;

export function normalizeSabreLexicon(data) {
  return {
    offensive: data.techniques_offensives ?? [],
    action: data.preparations ?? [],
    defensive: data.techniques_defensives ?? [],
    cible: data.cibles ?? [],
    attackMove: data.deplacements ?? [],
    defendMove: data.deplacements ?? [],
    paradeNumber: [],
    paradeAttribute: data.attributs_defensifs ?? [],
    attackAttribute: data.attributs_offensifs ?? [],
    phases: data.phases_choregraphie ?? [],
    armes: data.armes ?? [],
  };
}

function mergeUnique(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      if (!value || typeof value !== "string") continue;
      const normalized = value.trim();
      if (!normalized) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

function normalizeTokenForMatch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function splitFlatV2Movement(data) {
  const movementFromApi = mergeUnique(data?.deplacement, data?.attackMove);
  const providedBase = mergeUnique(
    data?.deplacement_base,
    data?.attackMoveBase,
  );
  const providedComplement = mergeUnique(
    data?.deplacement_complement,
    data?.attackMoveComplement,
  );
  const hasExplicitSplit =
    providedBase.length > 0 || providedComplement.length > 0;

  const baseLookup = new Set(providedBase.map(normalizeTokenForMatch));
  const complementLookup = new Set(
    providedComplement.map(normalizeTokenForMatch),
  );

  const base = [];
  const complement = [];

  for (const value of movementFromApi) {
    const key = normalizeTokenForMatch(value);
    if (complementLookup.has(key) && !baseLookup.has(key)) {
      complement.push(value);
      continue;
    }
    if (baseLookup.has(key)) {
      base.push(value);
      continue;
    }
    // Sans split explicite venant de l'API, on garde la valeur en base.
    base.push(value);
  }

  const attackMoveBase = mergeUnique(
    providedBase,
    hasExplicitSplit ? base : movementFromApi,
  );
  const attackMoveComplement = mergeUnique(providedComplement, complement);
  const attackMove = mergeUnique(
    attackMoveBase,
    attackMoveComplement,
    movementFromApi,
  );

  return { attackMoveBase, attackMoveComplement, attackMove };
}

export function normalizeNewLexicon(data) {
  const actions = data?.actions_escrime ?? null;
  const mouvement = data?.mouvement ?? null;

  // Compat API DB: les données classic-v2 exposées par le backend sont plates
  // (offensive/action/defensive/...) et non imbriquées (actions_escrime/mouvement).
  // On supporte les 2 formats pour éviter des formulaires vides.
  if (!actions || !mouvement) {
    const { attackMoveBase, attackMoveComplement, attackMove } =
      splitFlatV2Movement(data);
    const action = mergeUnique(data?.action);
    return {
      offensive: mergeUnique(data?.offensive),
      action,
      defensive: mergeUnique(data?.defensive),
      cible: mergeUnique(data?.cible),
      attackMove,
      defendMove: attackMove,
      attackMoveBase,
      attackMoveComplement,
      paradeNumber: mergeUnique(data?.["parade-numero"], data?.paradeNumero),
      paradeAttribute: mergeUnique(
        data?.["parade-attribut"],
        data?.paradeAttribut,
      ),
      attackAttribute: mergeUnique(
        data?.["attaque-attribut"],
        data?.attaqueAttribut,
      ),
      preparationTypes: action,
    };
  }

  const offensives = actions.actions_offensives ?? {};
  const defensives = actions.actions_defensives ?? {};
  const preparations = actions.preparations ?? {};

  const action = mergeUnique(
    preparations.engagement,
    preparations.attaques_au_fer,
    preparations.prises_de_fer,
    preparations.sans_contact,
    preparations.composees,
  );

  const attackMoveBase = mergeUnique(mouvement.deplacement);
  const attackMoveComplement = mergeUnique(mouvement.deplacement_complement);
  const attackMove = mergeUnique(attackMoveBase, attackMoveComplement);

  return {
    offensive: mergeUnique(offensives.attaques),
    action,
    defensive: mergeUnique(defensives.esquive),
    cible: mergeUnique(mouvement.cible),
    attackMove,
    defendMove: attackMove,
    attackMoveBase,
    attackMoveComplement,
    paradeNumber: mergeUnique(mouvement.position),
    paradeAttribute: mergeUnique(mouvement.position_complements),
    attackAttribute: mergeUnique(offensives.complements),
    preparationTypes: Object.keys(preparations),
  };
}
