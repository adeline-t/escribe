import { createDefaultPerformancePerformers } from "../../../shared/performanceModel.js";

export const DEFAULT_PERFORMERS = createDefaultPerformancePerformers();

export const LEXICON_TYPES = [
  { key: "offensive", label: "actions d'attaque" },
  { key: "action", label: "préparations" },
  { key: "attaque-attribut", label: "attributs d'attaque" },
  { key: "cible", label: "cibles" },
  { key: "deplacement", label: "déplacements" },
  { key: "defensive", label: "actions de défense" },
  { key: "defense-attribut", label: "attributs de défense" },
  { key: "parade-numero", label: "positions de parade" },
  { key: "parade-attribut", label: "attributs de parade" },
];

export const NEW_LEXICON_TYPES = [
  { key: "offensive", label: "actions d'attaque" },
  { key: "attaque-attribut", label: "attributs d'attaque" },
  { key: "cible", label: "cibles" },
  { key: "defensive", label: "actions de défense" },
  { key: "defense-attribut", label: "attributs de défense" },
  { key: "parade-numero", label: "positions de parade" },
  { key: "parade-attribut", label: "attributs de parade" },
  { key: "action", label: "préparations" },
  { key: "deplacement", label: "déplacements" },
  { key: "deplacement_complement", label: "attributs de déplacement" },
];

export const SABRE_LEXICON_TYPES = [
  { key: "cibles", label: "Cibles et positions" },
  { key: "postures_base", label: "Postures de base" },
  { key: "garde_principale", label: "Gardes principales" },
  { key: "deplacements", label: "Déplacements" },
  { key: "actions_offensives", label: "Actions offensives" },
  { key: "attributs_attaque", label: "Attributs d'attaque" },
  { key: "actions_defensives", label: "Actions défensives" },
  { key: "attributs_defense", label: "Attributs de défense" },
  { key: "preparations", label: "Préparations" },
];

// Display order for lexicon categories in the lexicon page.
// Update this hard-coded order here when needed.
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
    "defense-attribut",
    "parade-numero",
    "parade-attribut",
    "action",
    "deplacement",
    "deplacement_complement",
  ],
  "sabre-laser": [
    "cibles",
    "postures_base",
    "garde_principale",
    "deplacements",
    "actions_offensives",
    "attributs_attaque",
    "actions_defensives",
    "attributs_defense",
    "preparations",
  ],
};

const CLASSIC_V2_RECURSIVE_BUCKET_MARKERS = {
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

function orderLexiconTypes(types, order) {
  if (!Array.isArray(order) || !order.length) return types;
  const rank = new Map(order.map((key, index) => [key, index]));
  return [...types].sort((a, b) => {
    const aRank = rank.has(a.key) ? rank.get(a.key) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.key) ? rank.get(b.key) : Number.MAX_SAFE_INTEGER;
    return aRank - bRank;
  });
}

function getLexiconLabel(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return value.name ?? value.nom ?? value.label ?? "";
}

function normalizeLexiconNodeId(node) {
  return String(node?.id ?? node?.lexicon_id ?? "").trim();
}

function getRecursiveLexiconChildren(node) {
  const children = [];
  if (Array.isArray(node?.children)) children.push(...node.children);
  if (Array.isArray(node?.categories)) children.push(...node.categories);
  if (Array.isArray(node?.sous_categories)) {
    children.push(...node.sous_categories);
  }
  if (Array.isArray(node?.elements)) children.push(...node.elements);
  return children;
}

function flattenClassicV2RecursiveLexicon(data) {
  const rootChildren = getRecursiveLexiconChildren(data);
  if (!rootChildren.length) return null;

  const bucketEntries = {
    offensive: [],
    action: [],
    defensive: [],
    "defense-attribut": [],
    cible: [],
    deplacement: [],
    deplacement_complement: [],
    "parade-numero": [],
    "parade-attribut": [],
    "attaque-attribut": [],
  };

  const seenByBucket = new Map(
    Object.keys(bucketEntries).map((bucket) => [bucket, new Set()]),
  );

  function visit(node, ancestorIds) {
    const nodeId = normalizeLexiconNodeId(node);
    const nextAncestorIds = nodeId ? [...ancestorIds, nodeId] : ancestorIds;
    const children = getRecursiveLexiconChildren(node);

    if (!children.length) {
      const label = String(getLexiconLabel(node) ?? "").trim();
      if (!label) return;

      let targetBucket = null;
      for (const [bucket, markers] of Object.entries(
        CLASSIC_V2_RECURSIVE_BUCKET_MARKERS,
      )) {
        if (nextAncestorIds.some((ancestorId) => markers.has(ancestorId))) {
          targetBucket = bucket;
          break;
        }
      }
      if (!targetBucket) return;

      const seen = seenByBucket.get(targetBucket);
      const key = normalizeTokenForLookup(label);
      if (!key || seen?.has(key)) return;
      seen?.add(key);
      bucketEntries[targetBucket].push({
        lexicon_id: nodeId || `legacy:${targetBucket}:${key}`,
        name: label,
      });
      return;
    }

    for (const child of children) {
      visit(child, nextAncestorIds);
    }
  }

  for (const child of rootChildren) {
    visit(child, []);
  }

  return bucketEntries;
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
  const target = data.target ?? data.cible ?? [];
  return {
    offensive: data.offensive ?? [],
    action: data.action ?? [],
    defensive: data.defensive ?? [],
    target,
    // Backward compatibility for existing form logic.
    cible: target,
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
    defenseAttribute:
      data["defense-attribut"] ??
      data.defenseAttribut ??
      data.attributsDefense ??
      [],
    attackAttribute: data["attaque-attribut"] ?? data.attaqueAttribut ?? [],
  };
}

export function normalizeSabreLexicon(data) {
  const target = data.targets ?? data.cibles ?? [];
  return {
    offensive: data.techniques_offensives ?? [],
    action: data.preparations ?? [],
    defensive: data.techniques_defensives ?? [],
    target,
    // Backward compatibility for existing form logic.
    cible: target,
    attackMove: data.deplacements ?? [],
    defendMove: data.deplacements ?? [],
    paradeNumber: [],
    paradeAttribute: data.attributs_defensifs ?? [],
    attackAttribute: data.attributs_offensifs ?? [],
    armes: data.armes ?? [],
  };
}

function mergeUnique(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      const normalized = String(getLexiconLabel(value) ?? "").trim();
      if (!normalized) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

function normalizeTermEntry(value, bucket = "term") {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const name = String(getLexiconLabel(value) ?? "").trim();
    if (!name) return null;
    const explicitId = String(value.lexicon_id ?? value.id ?? "").trim();
    const id = explicitId || `legacy:${bucket}:${normalizeTokenForLookup(name)}`;
    return { id, label: name };
  }
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return null;
  return {
    id: `legacy:${bucket}:${normalizeTokenForLookup(name)}`,
    label: name,
  };
}

function mergeUniqueTermEntries(bucket, ...lists) {
  const out = [];
  const seenByLabel = new Set();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      const entry = normalizeTermEntry(value, bucket);
      if (!entry) continue;
      const key = normalizeTokenForLookup(entry.label);
      if (!key || seenByLabel.has(key)) continue;
      seenByLabel.add(key);
      out.push(entry);
    }
  }
  return out;
}

function buildLexiconLookupByType(entriesByType) {
  const termById = {};
  const idByNormalizedLabelByType = {};

  for (const [type, entries] of Object.entries(entriesByType)) {
    const labelMap = {};
    for (const entry of entries ?? []) {
      const id = String(entry?.id ?? "").trim();
      const label = String(entry?.label ?? "").trim();
      if (!id || !label) continue;
      if (!termById[id]) {
        termById[id] = { id, label, type };
      }
      const key = normalizeTokenForLookup(label);
      if (key && !labelMap[key]) {
        labelMap[key] = id;
      }
    }
    idByNormalizedLabelByType[type] = labelMap;
  }

  return { termById, idByNormalizedLabelByType };
}

export function resolveLexiconTermLabel(normalizedLexicon, value, type = "") {
  const token = String(value ?? "").trim();
  if (!token) return "";
  if (normalizedLexicon?.termById?.[token]?.label) {
    return normalizedLexicon.termById[token].label;
  }
  const fallbackId = resolveLexiconTermId(normalizedLexicon, type, token);
  if (fallbackId && normalizedLexicon?.termById?.[fallbackId]?.label) {
    return normalizedLexicon.termById[fallbackId].label;
  }
  return decodeLegacyDisplayToken(token);
}

export function resolveLexiconTermId(normalizedLexicon, type, value) {
  const token = String(value ?? "").trim();
  if (!token) return "";
  if (normalizedLexicon?.termById?.[token]) return token;
  const key = normalizeTokenForLookup(token);
  if (!key) return "";
  return normalizedLexicon?.idByNormalizedLabelByType?.[type]?.[key] ?? "";
}

function termIds(entries) {
  return (entries ?? []).map((entry) => entry.id);
}

function normalizeTokenForLookup(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function decodeLegacyDisplayToken(token) {
  const raw = String(token ?? "").trim();
  if (!raw) return "";
  if (!raw.startsWith("legacy:")) return raw;
  const [, , ...rest] = raw.split(":");
  const candidate = rest.join(":").trim();
  if (!candidate) return "";
  return candidate.replace(/[_-]+/g, " ").trim();
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

  const baseLookup = new Set(providedBase.map(normalizeTokenForLookup));
  const complementLookup = new Set(
    providedComplement.map(normalizeTokenForLookup),
  );

  const base = [];
  const complement = [];

  for (const value of movementFromApi) {
    const key = normalizeTokenForLookup(value);
    if (complementLookup.has(key) && !baseLookup.has(key)) {
      complement.push(value);
      continue;
    }
    if (baseLookup.has(key)) {
      base.push(value);
      continue;
    }
    // Without an explicit split from the API, keep the value as a base movement.
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
  const recursiveFlat = flattenClassicV2RecursiveLexicon(data);

  // API/DB compatibility: backend classic-v2 can be flat
  // (offensive/action/defensive/...) instead of nested (actions_escrime/mouvement).
  // Support both to prevent empty form fields.
  if (recursiveFlat || !actions || !mouvement) {
    const flatData = recursiveFlat ?? data;
    const offensiveEntries = mergeUniqueTermEntries(
      "offensive",
      flatData?.offensive,
    );
    const actionEntries = mergeUniqueTermEntries("action", flatData?.action);
    const defensiveEntries = mergeUniqueTermEntries(
      "defensive",
      flatData?.defensive,
    );
    const targetEntries = mergeUniqueTermEntries(
      "cible",
      flatData?.target,
      flatData?.cible,
    );
    const movementEntries = mergeUniqueTermEntries(
      "deplacement",
      flatData?.deplacement,
      flatData?.attackMove,
    );
    const movementComplementEntries = mergeUniqueTermEntries(
      "deplacement_complement",
      flatData?.deplacement_complement,
      flatData?.attackMoveComplement,
    );
    const paradeNumberEntries = mergeUniqueTermEntries(
      "parade-numero",
      flatData?.["parade-numero"],
      flatData?.paradeNumero,
    );
    const paradeAttributeEntries = mergeUniqueTermEntries(
      "parade-attribut",
      flatData?.["parade-attribut"],
      flatData?.paradeAttribut,
    );
    const defenseAttributeEntries = mergeUniqueTermEntries(
      "defense-attribut",
      flatData?.["defense-attribut"],
      flatData?.defenseAttribut,
      flatData?.attributs_defense,
      flatData?.attributs_defensifs,
    );
    const attackAttributeEntries = mergeUniqueTermEntries(
      "attaque-attribut",
      flatData?.["attaque-attribut"],
      flatData?.attaqueAttribut,
    );
    const { base: attackMoveBaseEntries, complement: attackMoveComplementEntries } =
      splitNewMovementTerms(movementEntries, movementComplementEntries);
    const attackMoveEntries = mergeUniqueTermEntries(
      "deplacement",
      attackMoveBaseEntries,
      attackMoveComplementEntries,
      movementEntries,
    );
    const entriesByType = {
      offensive: offensiveEntries,
      action: actionEntries,
      defensive: defensiveEntries,
      target: targetEntries,
      attaque_attribut: attackAttributeEntries,
      defense_attribut: defenseAttributeEntries,
      parade_numero: paradeNumberEntries,
      parade_attribut: paradeAttributeEntries,
      deplacement: movementEntries,
      deplacement_complement: movementComplementEntries,
    };
    const { termById, idByNormalizedLabelByType } =
      buildLexiconLookupByType(entriesByType);
    const action = termIds(actionEntries);
    return {
      offensive: termIds(offensiveEntries),
      action,
      defensive: termIds(defensiveEntries),
      target: termIds(targetEntries),
      // Backward compatibility for existing form logic.
      cible: termIds(targetEntries),
      attackMove: termIds(attackMoveEntries),
      defendMove: termIds(attackMoveEntries),
      attackMoveBase: termIds(attackMoveBaseEntries),
      attackMoveComplement: termIds(attackMoveComplementEntries),
      paradeNumber: termIds(paradeNumberEntries),
      paradeAttribute: termIds(paradeAttributeEntries),
      defenseAttribute: termIds(defenseAttributeEntries),
      attackAttribute: termIds(attackAttributeEntries),
      preparationTypes: action,
      termEntries: entriesByType,
      termById,
      idByNormalizedLabelByType,
    };
  }

  const offensives = actions.actions_offensives ?? {};
  const defensives = actions.actions_defensives ?? {};
  const preparations = actions.preparations ?? {};

  const actionEntries = mergeUniqueTermEntries(
    "action",
    preparations.engagement,
    preparations.attaques_au_fer,
    preparations.prises_de_fer,
    preparations.sans_contact,
    preparations.composees,
  );
  const offensiveEntries = mergeUniqueTermEntries(
    "offensive",
    offensives.attaques,
  );
  const defensiveEntries = mergeUniqueTermEntries(
    "defensive",
    defensives.esquive,
  );
  const targetEntries = mergeUniqueTermEntries(
    "cible",
    mouvement.target,
    mouvement.cible,
  );
  const attackMoveBaseEntries = mergeUniqueTermEntries(
    "deplacement",
    mouvement.deplacement,
  );
  const attackMoveComplementEntries = mergeUniqueTermEntries(
    "deplacement_complement",
    mouvement.deplacement_complement,
  );
  const attackMoveEntries = mergeUniqueTermEntries(
    "deplacement",
    attackMoveBaseEntries,
    attackMoveComplementEntries,
  );
  const paradeNumberEntries = mergeUniqueTermEntries(
    "parade-numero",
    mouvement.position,
  );
  const paradeAttributeEntries = mergeUniqueTermEntries(
    "parade-attribut",
    mouvement.position_complements,
  );
  const defenseAttributeEntries = mergeUniqueTermEntries(
    "defense-attribut",
    defensives.complements,
    defensives.attributs_defense,
    actions.attributs_defense,
    mouvement.attributs_defense,
  );
  const attackAttributeEntries = mergeUniqueTermEntries(
    "attaque-attribut",
    offensives.complements,
  );
  const entriesByType = {
    offensive: offensiveEntries,
    action: actionEntries,
    defensive: defensiveEntries,
    target: targetEntries,
    attaque_attribut: attackAttributeEntries,
    defense_attribut: defenseAttributeEntries,
    parade_numero: paradeNumberEntries,
    parade_attribut: paradeAttributeEntries,
    deplacement: attackMoveBaseEntries,
    deplacement_complement: attackMoveComplementEntries,
  };
  const { termById, idByNormalizedLabelByType } =
    buildLexiconLookupByType(entriesByType);

  return {
    offensive: termIds(offensiveEntries),
    action: termIds(actionEntries),
    defensive: termIds(defensiveEntries),
    target: termIds(targetEntries),
    // Backward compatibility for existing form logic.
    cible: termIds(targetEntries),
    attackMove: termIds(attackMoveEntries),
    defendMove: termIds(attackMoveEntries),
    attackMoveBase: termIds(attackMoveBaseEntries),
    attackMoveComplement: termIds(attackMoveComplementEntries),
    paradeNumber: termIds(paradeNumberEntries),
    paradeAttribute: termIds(paradeAttributeEntries),
    defenseAttribute: termIds(defenseAttributeEntries),
    attackAttribute: termIds(attackAttributeEntries),
    preparationTypes: termIds(actionEntries),
    termEntries: entriesByType,
    termById,
    idByNormalizedLabelByType,
  };
}

function splitNewMovementTerms(values, complementValues) {
  const normalizedComplements = mergeUniqueTermEntries(
    "deplacement_complement",
    complementValues,
  );
  const complementLookup = new Set(
    normalizedComplements.map((entry) => normalizeTokenForLookup(entry.label)),
  );
  const base = [];
  const complement = [...normalizedComplements];
  const complementSeen = new Set(
    normalizedComplements.map((entry) => normalizeTokenForLookup(entry.label)),
  );
  for (const value of values ?? []) {
    const entry = normalizeTermEntry(value, "deplacement");
    if (!entry) continue;
    const key = normalizeTokenForLookup(entry.label);
    if (!key) continue;
    if (complementLookup.has(key)) {
      if (!complementSeen.has(key)) {
        complementSeen.add(key);
        complement.push({
          id: entry.id,
          label: entry.label,
        });
      }
      continue;
    }
    base.push({
      id: entry.id,
      label: entry.label,
    });
  }
  return {
    base: mergeUniqueTermEntries("deplacement", base),
    complement: mergeUniqueTermEntries("deplacement_complement", complement),
  };
}
