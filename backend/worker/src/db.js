export function getSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
  };
}

export function jsonResponse(data, status = 200, headers = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    ...getSecurityHeaders()
  };

  return new Response(JSON.stringify(data), {
    status,
    headers: { ...defaultHeaders, ...headers }
  });
}

export function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((item) => item.trim())
    : ["*"];
  const allowOrigin = allowed.includes("*")
    ? "*"
    : allowed.includes(origin)
      ? origin
      : allowed[0] || "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    ...getSecurityHeaders()
  };
}

import seedLexicon from "./lexicon.seed.json";
import seedNewLexicon from "./lexicon-new.seed.json";
import seedSabreLexicon from "./lexicon-sabre-laser.seed.json";
import seedRecursiveLexicon from "./lexicon-recursive.seed.json";
import {
  createDefaultPerformancePerformers,
  DEFAULT_PERFORMANCE_NAME,
  DEFAULT_PERFORMANCE_SHARE_ROLE,
  normalizePerformanceType,
  OWNER_PERFORMANCE_SHARE_ROLE,
} from "../../../shared/performanceModel.js";
import { createSequenceModel } from "../../../shared/sequenceModel.js";
import {
  createStepModel,
  LEGACY_STEP_LEXICON_KEY,
  resolveStepLexiconKey,
} from "../../../shared/stepModel.js";

let schemaReady = false;
let lexiconReady = false;
let lexiconSeeded = false;

const CLASSIC_V2_TREE_BUCKET_MARKERS = {
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
  "attaque-attribut": new Set(["attack_complements", "attaque-attribut"]),
};

const CLASSIC_V2_COMPAT_ID_ALIASES = {
  // Parent categories
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
  // Sub categories
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

const CLASSIC_V2_COMPAT_ID_BY_PARENT = {
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

function splitDelimitedValue(value) {
  return String(value ?? "")
    .split(" · ")
    .map((item) => item.trim())
    .filter(Boolean);
}

const SEQUENCE_SCHEMA_VERSION = "2.0";

const GENERIC_ATTACK_MARKERS = new Set([
  "attaque",
  "attack",
  "preparation",
  "préparation",
]);

function normalizeStepMode(mode) {
  return mode === "choregraphie" ? "choreography" : mode;
}

function normalizePerformerIdentity(performer, index = 0) {
  if (typeof performer === "string") {
    return {
      id: crypto.randomUUID(),
      name: performer,
      weapon: "",
    };
  }
  const safe = performer && typeof performer === "object" ? performer : {};
  const id =
    typeof safe.id === "string" && safe.id.trim()
      ? safe.id.trim()
      : crypto.randomUUID();
  const fallbackName = String.fromCharCode(65 + (index % 26));
  const name =
    typeof safe.name === "string" && safe.name.trim()
      ? safe.name
      : fallbackName;
  const weapon = typeof safe.weapon === "string" ? safe.weapon : "";
  return { ...safe, id, name, weapon };
}

function normalizePerformerIdentityList(performers) {
  if (!Array.isArray(performers)) return [];
  return performers.map((performer, index) =>
    normalizePerformerIdentity(performer, index),
  );
}

function buildPerformerIdToIndexMap(performers) {
  const byId = new Map();
  for (let index = 0; index < performers.length; index += 1) {
    const id = String(performers[index]?.id ?? "").trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, index);
  }
  return byId;
}

function dedupeLexiconTerms(terms) {
  const seen = new Set();
  const out = [];
  for (const term of terms ?? []) {
    const name = String(term?.name ?? "").trim();
    if (!name) continue;
    const key = `${term?.lexicon_id ?? "null"}|${normalizeLexiconLabel(name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      lexicon_id: term?.lexicon_id ?? null,
      name,
    });
  }
  return out;
}

function resolveLexiconTerm(index, buckets, value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return null;
  for (const bucket of buckets ?? []) {
    const resolved = resolveClassicV2LexiconReference(index, bucket, rawValue);
    if (resolved) {
      return {
        lexicon_id: resolved.lexicon_id ?? null,
        name: String(resolved.name ?? rawValue),
      };
    }
  }
  return {
    lexicon_id: null,
    name: rawValue,
  };
}

function resolveDelimitedLexiconTerms(index, buckets, value) {
  return dedupeLexiconTerms(
    splitDelimitedValue(value)
      .map((token) => resolveLexiconTerm(index, buckets, token))
      .filter(Boolean),
  );
}

function isGenericAttackLabel(value) {
  return GENERIC_ATTACK_MARKERS.has(normalizeLexiconLabel(value));
}

function legacyPerformerToStoragePerformer(performer, lexiconReferenceIndex) {
  const safe = performer && typeof performer === "object" ? performer : {};
  const mode = normalizeStepMode(safe.mode) || "combat";

  const actionDetails = Array.isArray(safe.actionDetails) ? safe.actionDetails : [];
  const defenseDetails = Array.isArray(safe.defenseDetails)
    ? safe.defenseDetails
    : [];

  const attackName =
    String(safe.offensive ?? "").trim() &&
    !isGenericAttackLabel(safe.offensive)
      ? String(safe.offensive).trim()
      : "";
  const preparationName = String(safe.action ?? "").trim();
  const hasPreparation =
    safe.role === "preparation" || Boolean(preparationName) || mode === "note"
      ? Boolean(preparationName)
      : false;
  const hasAttack = Boolean(attackName);

  const prepAttributes = dedupeLexiconTerms(
    [
      ...actionDetails.map((detail) =>
        resolveLexiconTerm(
          lexiconReferenceIndex,
          ["action", "attaque-attribut", "parade-attribut"],
          detail?.attribute,
        ),
      ),
      ...Array.isArray(safe.attackAttribute)
        ? safe.attackAttribute.map((value) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["attaque-attribut", "parade-attribut", "action"],
              value,
            ),
          )
        : [],
    ].filter(Boolean),
  );

  const attackAttributes = dedupeLexiconTerms(
    [
      ...Array.isArray(safe.attackAttribute)
        ? safe.attackAttribute.map((value) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["attaque-attribut", "action", "deplacement_complement"],
              value,
            ),
          )
        : [],
      ...actionDetails.flatMap((detail) => [
        resolveLexiconTerm(
          lexiconReferenceIndex,
          ["attaque-attribut", "action"],
          detail?.action,
        ),
        resolveLexiconTerm(
          lexiconReferenceIndex,
          ["attaque-attribut", "parade-attribut", "action"],
          detail?.attribute,
        ),
      ]),
    ].filter(Boolean),
  );

  const defenseName = String(safe.defense ?? "").trim()
    ? String(safe.defense).trim()
    : String(defenseDetails[0]?.defense ?? "").trim();
  const hasDefense = Boolean(defenseName);
  const positionName = String(safe.paradeNumber ?? "").trim()
    ? String(safe.paradeNumber).trim()
    : String(defenseDetails[0]?.position ?? "").trim();
  const positionAttributes = dedupeLexiconTerms(
    [
      ...resolveDelimitedLexiconTerms(
        lexiconReferenceIndex,
        ["parade-attribut", "deplacement_complement", "attaque-attribut"],
        safe.paradeAttribute,
      ),
      ...resolveDelimitedLexiconTerms(
        lexiconReferenceIndex,
        ["parade-attribut", "deplacement_complement", "attaque-attribut"],
        defenseDetails[0]?.attribute,
      ),
    ].filter(Boolean),
  );

  const defenseAttributes = dedupeLexiconTerms(
    defenseDetails
      .slice(1)
      .flatMap((detail) => [
        resolveLexiconTerm(
          lexiconReferenceIndex,
          ["defensive", "action", "parade-attribut"],
          detail?.defense,
        ),
        ...resolveDelimitedLexiconTerms(
          lexiconReferenceIndex,
          ["parade-attribut", "deplacement_complement", "attaque-attribut"],
          detail?.attribute,
        ),
      ])
      .filter(Boolean),
  );

  const attackMoveTokens = splitDelimitedValue(safe.attackMove);
  const defendMoveTokens = splitDelimitedValue(safe.defendMove);
  const movementBaseName =
    attackMoveTokens[0] ?? defendMoveTokens[0] ?? "";
  const movementAttributes = dedupeLexiconTerms(
    [
      ...(attackMoveTokens.length > 1
        ? attackMoveTokens.slice(1).map((token) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["deplacement_complement", "parade-attribut", "attaque-attribut"],
              token,
            ),
          )
        : []),
      ...(defendMoveTokens.length > 1
        ? defendMoveTokens.slice(1).map((token) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["deplacement_complement", "parade-attribut", "attaque-attribut"],
              token,
            ),
          )
        : []),
      attackMoveTokens[0] && defendMoveTokens[0] && attackMoveTokens[0] !== defendMoveTokens[0]
        ? resolveLexiconTerm(
            lexiconReferenceIndex,
            ["deplacement", "deplacement_complement"],
            defendMoveTokens[0],
          )
        : null,
    ].filter(Boolean),
  );

  const preparation = hasPreparation
    ? {
        ...resolveLexiconTerm(lexiconReferenceIndex, ["action"], preparationName),
        attributes: prepAttributes,
      }
    : null;

  const attack = hasAttack
    ? {
        ...resolveLexiconTerm(
          lexiconReferenceIndex,
          ["offensive", "action", "attaque-attribut"],
          attackName,
        ),
        target: resolveLexiconTerm(
          lexiconReferenceIndex,
          ["cible"],
          safe.target,
        ),
        attributes: attackAttributes,
      }
    : null;

  const defense = hasDefense
    ? {
        ...resolveLexiconTerm(
          lexiconReferenceIndex,
          ["defensive", "action"],
          defenseName,
        ),
        position: positionName
          ? {
              ...resolveLexiconTerm(
                lexiconReferenceIndex,
                ["parade-numero"],
                positionName,
              ),
              attributes: positionAttributes,
            }
          : null,
        attributes: defenseAttributes,
      }
    : null;

  const movement = movementBaseName
    ? {
        ...resolveLexiconTerm(
          lexiconReferenceIndex,
          ["deplacement", "deplacement_complement"],
          movementBaseName,
        ),
        attributes: movementAttributes,
      }
    : null;

  return {
    mode,
    preparation,
    attack,
    defense,
    movement,
    note: typeof safe.note === "string" ? safe.note : "",
  };
}

function hasStorageTerm(term) {
  if (!term || typeof term !== "object") return false;
  const name = String(term.name ?? "").trim();
  const lexiconId = String(term.lexicon_id ?? "").trim();
  if (name || lexiconId) return true;
  return false;
}

function resolveStorageTermName(term, lexiconNameById = null) {
  if (!term || typeof term !== "object") return "";
  const lexiconId = String(term.lexicon_id ?? "").trim();
  const storedName = String(term.name ?? "").trim();
  if (lexiconId && lexiconNameById?.has(lexiconId)) {
    const resolved = String(lexiconNameById.get(lexiconId) ?? "").trim();
    if (resolved) return resolved;
  }
  return storedName;
}

function resolveStorageTermRef(term, lexiconNameById = null) {
  if (!term || typeof term !== "object") return null;
  const lexiconId = String(term.lexicon_id ?? "").trim();
  const name = resolveStorageTermName(term, lexiconNameById);
  if (!lexiconId && !name) return null;
  return { lexicon_id: lexiconId || null, name };
}

function resolveStorageTerms(termList, lexiconNameById = null) {
  if (!Array.isArray(termList)) return [];
  const out = [];
  const seen = new Set();
  for (const term of termList) {
    const name = resolveStorageTermName(term, lexiconNameById);
    const key = normalizeLexiconLabel(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function resolveStorageTermRefs(termList, lexiconNameById = null) {
  if (!Array.isArray(termList)) return [];
  const out = [];
  const seen = new Set();
  for (const term of termList) {
    const ref = resolveStorageTermRef(term, lexiconNameById);
    if (!ref) continue;
    const key = `${ref.lexicon_id ?? "null"}|${normalizeLexiconLabel(ref.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function inferLegacyRoleFromStoragePerformer({
  mode = "combat",
  hasPreparation = false,
  hasAttack = false,
  hasDefense = false,
}) {
  if (mode === "note" && !hasPreparation && !hasAttack && !hasDefense) {
    return "none";
  }
  if (!hasPreparation && !hasAttack && !hasDefense) return "none";
  if (!hasAttack && !hasPreparation && hasDefense) return "defense";
  if (!hasDefense && !hasPreparation && hasAttack) return "attack";
  if (!hasAttack && !hasDefense && hasPreparation) return "preparation";
  if (hasDefense && !hasAttack) return "defense";
  if (!hasDefense && hasPreparation) return "preparation";
  if (hasAttack) return "attack";
  return "none";
}

function storagePerformerToLegacyPerformer(storagePerformer, lexiconNameById = null) {
  const safe =
    storagePerformer && typeof storagePerformer === "object"
      ? storagePerformer
      : {};
  const mode = normalizeStepMode(safe.mode) || "combat";
  const preparation =
    safe.preparation && typeof safe.preparation === "object"
      ? safe.preparation
      : null;
  const attack = safe.attack && typeof safe.attack === "object" ? safe.attack : null;
  const defense =
    safe.defense && typeof safe.defense === "object" ? safe.defense : null;
  const movement =
    safe.movement && typeof safe.movement === "object" ? safe.movement : null;

  const preparationRef = resolveStorageTermRef(preparation, lexiconNameById);
  const preparationTargetRef = resolveStorageTermRef(
    preparation?.target,
    lexiconNameById,
  );
  const preparationPositionRef = resolveStorageTermRef(
    preparation?.position,
    lexiconNameById,
  );
  const preparationPositionAttributeRefs = resolveStorageTermRefs(
    preparation?.position?.attributes,
    lexiconNameById,
  );
  const preparationAttributeRefs = resolveStorageTermRefs(
    preparation?.attributes,
    lexiconNameById,
  );
  const attackRef = resolveStorageTermRef(attack, lexiconNameById);
  const attackTargetRef = resolveStorageTermRef(attack?.target, lexiconNameById);
  const attackAttributeRefs = resolveStorageTermRefs(
    attack?.attributes,
    lexiconNameById,
  );
  const defenseRef = resolveStorageTermRef(defense, lexiconNameById);
  const defensePositionRef = resolveStorageTermRef(
    defense?.position,
    lexiconNameById,
  );
  const defensePositionAttributeRefs = resolveStorageTermRefs(
    defense?.position?.attributes,
    lexiconNameById,
  );
  const defenseAttributeRefs = resolveStorageTermRefs(
    defense?.attributes,
    lexiconNameById,
  );
  const movementRef = resolveStorageTermRef(movement, lexiconNameById);
  const movementAttributeRefs = resolveStorageTermRefs(
    movement?.attributes,
    lexiconNameById,
  );

  const preparationName = preparationRef?.name ?? "";
  const preparationTargetName = preparationTargetRef?.name ?? "";
  const preparationPositionName = preparationPositionRef?.name ?? "";
  const preparationPositionAttributes = preparationPositionAttributeRefs.map(
    (entry) => entry.name,
  );
  const preparationAttributes = preparationAttributeRefs.map(
    (entry) => entry.name,
  );
  const attackName = attackRef?.name ?? "";
  const attackTargetName = attackTargetRef?.name ?? "";
  const attackAttributes = attackAttributeRefs.map((entry) => entry.name);
  const defenseName = defenseRef?.name ?? "";
  const defensePositionName = defensePositionRef?.name ?? "";
  const defensePositionAttributes = defensePositionAttributeRefs.map(
    (entry) => entry.name,
  );
  const defenseAttributes = defenseAttributeRefs.map((entry) => entry.name);
  const movementName = movementRef?.name ?? "";
  const movementAttributes = movementAttributeRefs.map((entry) => entry.name);

  const hasPreparation =
    hasStorageTerm(preparation) ||
    Boolean(preparationTargetName) ||
    Boolean(preparationPositionName) ||
    preparationPositionAttributes.length > 0;
  const hasAttack = hasStorageTerm(attack);
  const hasDefense = hasStorageTerm(defense);
  const role = inferLegacyRoleFromStoragePerformer({
    mode,
    hasPreparation,
    hasAttack,
    hasDefense,
  });

  const movementLabel = [movementName, ...movementAttributes]
    .filter(Boolean);
  const movementValueParts = [
    movementRef?.lexicon_id || movementRef?.name || "",
    ...movementAttributeRefs.map((entry) => entry.lexicon_id || entry.name),
  ].filter(Boolean);
  const preparationPositionAttribute = [
    ...preparationPositionAttributes,
    ...preparationAttributes.filter(
      (item) =>
        !preparationPositionAttributes.some(
          (token) => normalizeLexiconLabel(token) === normalizeLexiconLabel(item),
        ),
    ),
  ];
  const preparationActionDetails =
    preparationName || preparationPositionName
      ? [
          {
            action: preparationRef?.lexicon_id || preparationName,
            attribute:
              preparationPositionRef?.lexicon_id || preparationPositionName,
          },
        ]
      : [];
  const defenseDetails = hasDefense
    ? [
        {
          defense: defenseName,
          position: defensePositionName,
          attribute: defensePositionAttributeRefs
            .map((entry) => entry.lexicon_id || entry.name)
            .join(" · "),
        },
        ...defenseAttributeRefs.map((attribute) => ({
          defense: attribute.lexicon_id || attribute.name,
          position: "",
          attribute: "",
        })),
      ]
    : [];

  return {
    mode,
    role,
    offensive: hasAttack
      ? attackRef?.lexicon_id || attackName
      : hasPreparation
        ? "preparation"
        : "",
    action: hasPreparation
      ? preparationRef?.lexicon_id || preparationName
      : attackAttributeRefs[0]?.lexicon_id || attackAttributes[0] || "",
    actionDetails: hasPreparation
      ? preparationActionDetails
      : attackAttributeRefs.map((attribute) => ({
          action: attribute.lexicon_id || attribute.name,
          attribute: "",
        })),
    target: hasAttack
      ? attackTargetRef?.lexicon_id || attackTargetName
      : preparationTargetRef?.lexicon_id || preparationTargetName,
    attackMove: hasDefense ? "" : movementValueParts.join(" · "),
    attackAttribute: hasPreparation
      ? [
          ...preparationPositionAttributeRefs.map(
            (entry) => entry.lexicon_id || entry.name,
          ),
          ...preparationAttributeRefs
            .map((entry) => entry.lexicon_id || entry.name)
            .filter(
              (item) =>
                !preparationPositionAttributeRefs.some(
                  (entry) =>
                    normalizeLexiconLabel(entry.lexicon_id || entry.name) ===
                    normalizeLexiconLabel(item),
                ),
            ),
        ]
      : attackAttributeRefs.map((entry) => entry.lexicon_id || entry.name),
    defense: hasDefense ? defenseRef?.lexicon_id || defenseName : "",
    defenseDetails,
    paradeNumber: hasDefense
      ? defensePositionRef?.lexicon_id || defensePositionName
      : "",
    paradeAttribute: hasDefense
      ? defensePositionAttributeRefs
          .map((entry) => entry.lexicon_id || entry.name)
          .join(" · ")
      : "",
    defendMove: hasDefense ? movementValueParts.join(" · ") : "",
    chorePhase: "",
    note: typeof safe.note === "string" ? safe.note : "",
    noteOverrides: false,
  };
}

function normalizeStoragePerformerOrder(
  metadata,
  performers,
  performerIdToIndexMap,
) {
  const requested = Array.isArray(metadata?.performerOrder)
    ? metadata.performerOrder
    : [];
  const out = [];
  const seen = new Set();
  for (const value of requested) {
    const performerId = String(value ?? "").trim();
    if (!performerId || seen.has(performerId)) continue;
    if (!performerIdToIndexMap.has(performerId)) continue;
    seen.add(performerId);
    out.push(performerId);
  }
  for (const performer of performers) {
    const performerId = String(performer?.id ?? "").trim();
    if (!performerId || seen.has(performerId)) continue;
    seen.add(performerId);
    out.push(performerId);
  }
  return out;
}

function resolveHiddenPerformerIndexesFromMetadata(
  metadata,
  performers,
  performerIdToIndexMap,
) {
  if (Array.isArray(metadata?.hiddenPerformers)) {
    return metadata.hiddenPerformers
      .map((value) => performerIdToIndexMap.get(String(value ?? "").trim()))
      .filter((value) => Number.isInteger(value));
  }
  const hiddenIndexes = Array.isArray(metadata?.hiddenPerformerIndexes)
    ? metadata.hiddenPerformerIndexes
    : Array.isArray(metadata?.hiddenParticipantIndexes)
      ? metadata.hiddenParticipantIndexes
      : [];
  return hiddenIndexes
    .map((value) => Number(value))
    .filter(
      (value) =>
        Number.isInteger(value) && value >= 0 && value < performers.length,
    );
}

function convertStorageStepToLegacyStep(
  stepPayload,
  { lexiconKey, performerOrder, lexiconNameById },
) {
  const performerEntries =
    stepPayload && typeof stepPayload === "object"
      ? stepPayload.performers ?? stepPayload.participants ?? null
      : null;
  const performerIndexById = new Map(
    performerOrder.map((performerId, index) => [performerId, index]),
  );
  const performers = performerOrder.map((performerId) => {
    if (Array.isArray(performerEntries)) {
      const performerIndex = performerIndexById.get(performerId) ?? -1;
      return storagePerformerToLegacyPerformer(
        performerEntries[performerIndex] ?? {},
        lexiconNameById,
      );
    }
    if (performerEntries && typeof performerEntries === "object") {
      return storagePerformerToLegacyPerformer(
        performerEntries[performerId] ?? {},
        lexiconNameById,
      );
    }
    return storagePerformerToLegacyPerformer({}, lexiconNameById);
  });

  return {
    id: stepPayload?.id ?? crypto.randomUUID(),
    lexicon: lexiconKey,
    performers,
  };
}

function buildSequenceLexiconKey(stepModels, sequence) {
  const sequenceLexicon = resolveStepLexiconKey(sequence?.metadata?.lexicon, {
    fallbackLexicon: "",
  });
  if (sequenceLexicon) return sequenceLexicon;
  const firstStepLexicon = resolveStepLexiconKey(stepModels[0]?.lexicon, {
    fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
  });
  return firstStepLexicon || LEGACY_STEP_LEXICON_KEY;
}

function buildSequencePayload(
  sequence,
  performers,
  { lexiconReferenceIndex = null } = {},
) {
  const stepsRaw = Array.isArray(sequence?.steps) ? sequence.steps : [];
  const performerOrder = performers.map((performer) => performer.id);
  const stepModels = stepsRaw.map((step) => {
    const stepModel = createStepModel(step, {
      fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
      performerCount: performers.length,
    });
    return {
      ...stepModel,
      performers: Array.isArray(stepModel.performers)
        ? stepModel.performers.map((performer) =>
            addStepPerformerLexiconRefs(performer, lexiconReferenceIndex),
          )
        : [],
    };
  });

  const hiddenIndexes = Array.isArray(sequence?.hiddenPerformerIndexes)
    ? sequence.hiddenPerformerIndexes
    : Array.isArray(sequence?.hiddenParticipantIndexes)
      ? sequence.hiddenParticipantIndexes
      : [];
  const hiddenPerformers = hiddenIndexes
    .map((index) => performers[index]?.id ?? null)
    .filter(Boolean);

  const lexiconKey = buildSequenceLexiconKey(stepModels, sequence);
  const steps = stepModels.map((stepModel) => {
    const stepPerformers = {};
    for (let index = 0; index < performerOrder.length; index += 1) {
      const performerId = performerOrder[index];
      stepPerformers[performerId] = legacyPerformerToStoragePerformer(
        stepModel.performers[index] ?? {},
        lexiconReferenceIndex,
      );
    }
    return {
      id: stepModel.id,
      performers: stepPerformers,
    };
  });

  return {
    id: sequence?.id ?? crypto.randomUUID(),
    name: typeof sequence?.name === "string" ? sequence.name : "",
    metadata: {
      schemaVersion: SEQUENCE_SCHEMA_VERSION,
      lexicon: lexiconKey,
      performerOrder,
      hiddenPerformers,
    },
    steps,
  };
}

export async function ensureSchema(env) {
  if (schemaReady) return;
  const required = ["performances", "performance_sequences", "performance_shares"];
  const missing = [];
  for (const table of required) {
    const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?1")
      .bind(table)
      .first();
    if (!row?.name) missing.push(table);
  }
  if (missing.length) {
    throw new Error(`Missing tables: ${missing.join(", ")}. Run D1 migrations.`);
  }
  schemaReady = true;
}

export async function ensureLexiconSchema(env) {
  if (lexiconReady) return;
  const required = [
    "offensive",
    "action",
    "defensive",
    "target",
    "movement",
    "guard_number",
    "guard_attribute",
    "attack_attribute",
    "nl_offensive",
    "nl_action",
    "nl_defensive",
    "nl_target",
    "nl_movement",
    "nl_movement_complement",
    "nl_guard_number",
    "nl_guard_attribute",
    "nl_attack_attribute",
    "sl_weapons",
    "sl_choreography_phases",
    "sl_targets",
    "sl_offensive_techniques",
    "sl_offensive_attributes",
    "sl_defensive_techniques",
    "sl_defensive_attributes",
    "sl_preparations",
    "sl_movements",
    "lexicon",
    "user_offensive",
    "user_action",
    "user_defensive",
    "user_target",
    "user_movement",
    "user_guard_number",
    "user_guard_attribute",
    "user_attack_attribute",
    "user_nl_offensive",
    "user_nl_action",
    "user_nl_defensive",
    "user_nl_target",
    "user_nl_movement",
    "user_nl_movement_complement",
    "user_nl_guard_number",
    "user_nl_guard_attribute",
    "user_nl_attack_attribute",
    "user_sl_weapons",
    "user_sl_choreography_phases",
    "user_sl_targets",
    "user_sl_offensive_techniques",
    "user_sl_offensive_attributes",
    "user_sl_defensive_techniques",
    "user_sl_defensive_attributes",
    "user_sl_preparations",
    "user_sl_movements",
    "user_lexicon_favorites"
  ];
  const missing = [];
  for (const table of required) {
    const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?1")
      .bind(table)
      .first();
    if (!row?.name) missing.push(table);
  }
  if (missing.length) {
    throw new Error(`Missing lexicon tables: ${missing.join(", ")}. Run D1 migrations.`);
  }
  lexiconReady = true;
}

async function ensureLexiconSeeded(env) {
  if (lexiconSeeded) return;
  await ensureLexiconSchema(env);
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM offensive").first();
  const count = Number(row?.count ?? 0);
  if (count === 0) {
    await replaceLexicon(env, seedLexicon);
  }
  const sabreRow = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM sl_weapons")
    .first();
  const sabreCount = Number(sabreRow?.count ?? 0);
  if (sabreCount === 0) {
    await replaceLexiconByKey(env, "sabre-laser", seedSabreLexicon);
  }
  const newRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM nl_offensive").first();
  const newCount = Number(newRow?.count ?? 0);
  const newMovementComplementRow = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM nl_movement_complement")
    .first();
  const newMovementComplementCount = Number(
    newMovementComplementRow?.count ?? 0
  );
  if (newCount === 0 || newMovementComplementCount === 0) {
    await replaceLexiconByKey(env, "classic-v2", seedNewLexicon);
  }
  const recursiveRow = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM lexicon")
    .first();
  const recursiveCount = Number(recursiveRow?.count ?? 0);
  if (recursiveCount === 0) {
    await replaceRecursiveLexicon(env, seedRecursiveLexicon);
  }
  lexiconSeeded = true;
}

export async function getPerformanceState(
  env,
  userId,
  performanceId,
  isSuperAdmin = false
) {
  await ensureSchema(env);
  const performance = await env.DB
    .prepare(
      `SELECT c.id, c.name, c.description, c.participants as performers, c.form_draft as draft, c.type,
        c.user_id, c.is_demo,
        CASE WHEN c.user_id = ?2 THEN 'owner' ELSE cs.role END as share_role
       FROM performances c
       LEFT JOIN performance_shares cs ON cs.performance_id = c.id AND cs.shared_user_id = ?2
       WHERE c.id = ?1 AND (c.user_id = ?2 OR cs.shared_user_id = ?2 OR c.is_demo = 1)`
    )
    .bind(performanceId, userId)
    .first();
  if (!performance?.id) return null;

  let performers = [];
  let form = null;
  try {
    performers = JSON.parse(performance.performers);
  } catch {
    performers = [];
  }
  performers = normalizePerformerIdentityList(performers);
  try {
    form = performance.draft ? JSON.parse(performance.draft) : null;
  } catch {
    form = null;
  }

  const normalizedType = normalizePerformanceType(performance.type);
  let lexiconNameById = null;
  if (normalizedType === "classic") {
    try {
      lexiconNameById = await getLexiconNameByIdMap(env);
    } catch {
      // Keep reads resilient if lexicon tables are temporarily unavailable.
      lexiconNameById = null;
    }
  }

  const sequenceRows = await env.DB
    .prepare(
      `SELECT payload FROM performance_sequences
       WHERE performance_id = ?1
       ORDER BY position`
    )
    .bind(performance.id)
    .all();

  const performerIdToIndexMap = buildPerformerIdToIndexMap(performers);

  const sequences = sequenceRows?.results?.map((row, index) => {
    try {
      const payload = JSON.parse(row.payload);
      if (payload?.steps) {
        const metadata =
          payload?.metadata && typeof payload.metadata === "object"
            ? payload.metadata
            : payload;
        const lexiconKey = resolveStepLexiconKey(metadata.lexicon, {
          fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
        });
        const performerOrder = normalizeStoragePerformerOrder(
          metadata,
          performers,
          performerIdToIndexMap,
        );
        const hiddenPerformerIndexes = resolveHiddenPerformerIndexesFromMetadata(
          metadata,
          performers,
          performerIdToIndexMap,
        );
        const stepsRaw = Array.isArray(payload.steps) ? payload.steps : [];
        return createSequenceModel({
          id: payload.id,
          name: payload.name,
          index,
          hiddenPerformerIndexes,
          performerCount: performers.length,
          steps: stepsRaw.map((stepPayload) => {
            const hasStoragePerformersObject =
              stepPayload?.performers &&
              !Array.isArray(stepPayload.performers) &&
              typeof stepPayload.performers === "object";
            if (hasStoragePerformersObject) {
              const legacyStep = convertStorageStepToLegacyStep(stepPayload, {
                lexiconKey,
                performerOrder,
                lexiconNameById,
              });
              return createStepModel(legacyStep, {
                fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
                performerCount: performers.length,
              });
            }
            const hydratedStep = lexiconNameById
              ? hydrateStepLabelsFromLexiconRefs(stepPayload, lexiconNameById)
              : stepPayload;
            return createStepModel(hydratedStep, {
              fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
              performerCount: performers.length,
            });
          }),
        });
      }
      if (payload?.performers || payload?.participants) {
        const hydratedPayload = lexiconNameById
          ? hydrateStepLabelsFromLexiconRefs(payload, lexiconNameById)
          : payload;
        return createSequenceModel({
          index,
          hiddenPerformerIndexes: [],
          performerCount: performers.length,
          steps: [
            createStepModel(hydratedPayload, {
              fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
            }),
          ],
        });
      }
      return null;
    } catch {
      return null;
    }
  }).filter(Boolean) ?? [];

  const isDemo = Boolean(performance.is_demo);
  const isOwner = performance.user_id === userId;
  const shareRole = isOwner
    ? OWNER_PERFORMANCE_SHARE_ROLE
    : isSuperAdmin && isDemo
      ? OWNER_PERFORMANCE_SHARE_ROLE
      : performance.share_role ?? DEFAULT_PERFORMANCE_SHARE_ROLE;
  const description = performance.description ?? "";

  return {
    performanceId: performance.id,
    performanceName: performance.name,
    performanceDescription: description,
    performanceType: normalizedType,
    performanceShareRole: shareRole,
    performanceIsDemo: isDemo,
    performanceOwnerId: performance.user_id,
    performers,
    sequences,
    // Backward compatibility for older frontend payload consumers.
    phrases: sequences,
    form,
  };
}

export async function getState(
  env,
  userId,
  performanceId = null,
  performanceType = null,
  isSuperAdmin = false
) {
  await ensureSchema(env);
  if (performanceId) {
    const state = await getPerformanceState(
      env,
      userId,
      performanceId,
      isSuperAdmin
    );
    if (state) return state;
  }
  const typeFilter = performanceType ? "AND type = ?2" : "";
  const query = `
      SELECT id
      FROM performances
      WHERE user_id = ?1 AND archived = 0 ${typeFilter}
      ORDER BY updated_at DESC
      LIMIT 1`;
  const stmt = performanceType
    ? env.DB.prepare(query).bind(userId, performanceType)
    : env.DB.prepare(query).bind(userId);
  const performance = await stmt.first();
  if (!performance?.id) return null;
  return getPerformanceState(env, userId, performance.id, isSuperAdmin);
}

export async function listPerformances(
  env,
  userId,
  includeArchived = false,
  performanceType = null,
  isSuperAdmin = false
) {
  await ensureSchema(env);
  const typeFilter = performanceType ? "AND c.type = ?2" : "";
  const archiveFilter = includeArchived ? "" : "AND c.archived = 0";
  const query = `SELECT DISTINCT c.id, c.name, c.description, c.participants as performers, c.archived, c.updated_at, c.created_at, c.type, c.is_demo, c.user_id,
      (SELECT COUNT(*) FROM performance_sequences cp WHERE cp.performance_id = c.id) as sequence_count,
      CASE WHEN c.user_id = ?1 THEN 1 ELSE 0 END as is_owner,
      CASE WHEN c.user_id = ?1 THEN 'owner' ELSE cs.role END as share_role
     FROM performances c
     LEFT JOIN performance_shares cs ON cs.performance_id = c.id AND cs.shared_user_id = ?1
     WHERE (c.user_id = ?1 OR cs.shared_user_id = ?1 OR c.is_demo = 1) ${archiveFilter} ${typeFilter}
     ORDER BY c.updated_at DESC`;
  const stmt = performanceType
    ? env.DB.prepare(query).bind(userId, performanceType)
    : env.DB.prepare(query).bind(userId);
  const rows = await stmt.all();
  const results = rows?.results ?? [];
  const legacyMap = await detectLegacyLexiconByPerformance(
    env,
    results.map((row) => row.id)
  );
  return results.map((row) => {
    let performers = [];
    try {
      performers = JSON.parse(row.performers);
    } catch {
      performers = [];
    }
    const isDemo = Boolean(row.is_demo);
    const isOwner = Boolean(row.is_owner) || (isSuperAdmin && isDemo);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      type: normalizePerformanceType(row.type),
      archived: Boolean(row.archived),
      isOwner,
      isDemo,
      shareRole: isOwner
        ? OWNER_PERFORMANCE_SHARE_ROLE
        : row.share_role ?? DEFAULT_PERFORMANCE_SHARE_ROLE,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sequenceCount: Number(row.sequence_count ?? 0),
      hasLegacyLexicon: Boolean(legacyMap.get(row.id)),
      performersCount: performers.length,
    };
  }) ?? [];
}

async function detectLegacyLexiconByPerformance(env, performanceIds) {
  const map = new Map();
  if (!performanceIds?.length) return map;
  for (const performanceId of performanceIds) {
    const rows = await env.DB
      .prepare(
        `SELECT payload FROM performance_sequences
         WHERE performance_id = ?1`
      )
      .bind(performanceId)
      .all();
    const payloads = rows?.results ?? [];
    let hasLegacy = false;
    for (const row of payloads) {
      if (hasLegacy) break;
      try {
        const payload = JSON.parse(row.payload);
        const metadataLexicon = resolveStepLexiconKey(payload?.metadata?.lexicon, {
          fallbackLexicon: "",
        });
        if (metadataLexicon) {
          if (metadataLexicon === LEGACY_STEP_LEXICON_KEY) hasLegacy = true;
          continue;
        }

        const steps = Array.isArray(payload?.steps)
          ? payload.steps
          : payload?.performers || payload?.participants
            ? [payload]
            : [];
        for (const step of steps) {
          const lexicon = resolveStepLexiconKey(step?.lexicon, {
            fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
          });
          if (lexicon === LEGACY_STEP_LEXICON_KEY) {
            hasLegacy = true;
            break;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    if (hasLegacy) map.set(performanceId, true);
  }
  return map;
}

export async function createPerformance(env, userId, data) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const name =
    typeof data?.name === "string" && data.name.trim()
      ? data.name.trim()
      : DEFAULT_PERFORMANCE_NAME;
  const description =
    typeof data?.description === "string" ? data.description.trim() : "";
  const type = normalizePerformanceType(data?.type);
  const performers =
    Array.isArray(data?.performers) && data.performers.length
      ? data.performers
      : Array.isArray(data?.participants) && data.participants.length
        ? data.participants
        : createDefaultPerformancePerformers();
  const normalizedPerformers = normalizePerformerIdentityList(performers);
  const result = await env.DB
    .prepare(
      `INSERT INTO performances (user_id, name, description, participants, form_draft, type, created_at, updated_at, archived, is_demo)
       VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?6, 0, 0)
       RETURNING id, name, description, type`
    )
    .bind(
      userId,
      name,
      description,
      JSON.stringify(normalizedPerformers),
      type,
      now,
    )
    .first();
  return result ?? null;
}

export async function updatePerformance(env, userId, performanceId, data) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const name =
    typeof data?.name === "string" && data.name.trim()
      ? data.name.trim()
      : DEFAULT_PERFORMANCE_NAME;
  const description =
    typeof data?.description === "string" ? data.description.trim() : "";
  const performers = Array.isArray(data?.performers)
    ? data.performers
    : Array.isArray(data?.participants)
      ? data.participants
      : [];
  const normalizedPerformers = normalizePerformerIdentityList(performers);
  await env.DB
    .prepare(
      `UPDATE performances
       SET name = ?1, description = ?2, participants = ?3, updated_at = ?4
       WHERE id = ?5 AND user_id = ?6`
    )
    .bind(
      name,
      description,
      JSON.stringify(normalizedPerformers),
      now,
      performanceId,
      userId,
    )
    .run();
}

export async function archivePerformance(env, userId, performanceId, archived) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB
    .prepare(
      `UPDATE performances SET archived = ?1, updated_at = ?2 WHERE id = ?3 AND user_id = ?4`
    )
    .bind(archived ? 1 : 0, now, performanceId, userId)
    .run();
}

export async function deletePerformance(env, userId, performanceId) {
  await ensureSchema(env);
  const row = await env.DB
    .prepare("SELECT COUNT(*) as count FROM performance_sequences WHERE performance_id = ?1")
    .bind(performanceId)
    .first();
  const count = Number(row?.count ?? 0);
  if (count > 1) {
    await archivePerformance(env, userId, performanceId, true);
    return { mode: "soft" };
  }
  await env.DB.prepare("DELETE FROM performance_sequences WHERE performance_id = ?1").bind(performanceId).run();
  await env.DB.prepare("DELETE FROM performance_shares WHERE performance_id = ?1").bind(performanceId).run();
  await env.DB.prepare("DELETE FROM performances WHERE id = ?1 AND user_id = ?2")
    .bind(performanceId, userId)
    .run();
  return { mode: "hard" };
}

export async function listPerformanceShares(env, ownerId, performanceId) {
  await ensureSchema(env);
  const rows = await env.DB
    .prepare(
      `SELECT cs.shared_user_id as user_id, u.email, u.first_name, u.last_name, cs.created_at, cs.role
     FROM performance_shares cs
     JOIN users u ON u.id = cs.shared_user_id
     WHERE cs.performance_id = ?1 AND cs.owner_id = ?2
     ORDER BY cs.created_at DESC`
    )
    .bind(performanceId, ownerId)
    .all();
  return rows?.results ?? [];
}

export async function addPerformanceShare(
  env,
  ownerId,
  performanceId,
  sharedUserId,
  role = DEFAULT_PERFORMANCE_SHARE_ROLE
) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB
    .prepare(
      `INSERT INTO performance_shares (performance_id, owner_id, shared_user_id, role, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(performance_id, shared_user_id) DO UPDATE SET role = excluded.role`
    )
    .bind(performanceId, ownerId, sharedUserId, role, now)
    .run();
  return { ok: true };
}

export async function removePerformanceShare(
  env,
  ownerId,
  performanceId,
  sharedUserId
) {
  await ensureSchema(env);
  await env.DB
    .prepare(
      "DELETE FROM performance_shares WHERE performance_id = ?1 AND owner_id = ?2 AND shared_user_id = ?3"
    )
    .bind(performanceId, ownerId, sharedUserId)
    .run();
  return { ok: true };
}

export async function listShareUsers(env, userId, query) {
  await ensureSchema(env);
  const q = `%${query.toLowerCase()}%`;
  const rows = await env.DB
    .prepare(
      `SELECT id, email, first_name, last_name
     FROM users
     WHERE id != ?1
       AND (lower(email) LIKE ?2 OR lower(first_name) LIKE ?2 OR lower(last_name) LIKE ?2)
     ORDER BY email
     LIMIT 25`
    )
    .bind(userId, q)
    .all();
  return rows?.results ?? [];
}

export async function listShareUsersAll(env, userId) {
  await ensureSchema(env);
  const rows = await env.DB
    .prepare(
      `SELECT id, email, first_name, last_name
     FROM users
     WHERE id != ?1
     ORDER BY email`
    )
    .bind(userId)
    .all();
  return rows?.results ?? [];
}

export async function saveState(env, userId, state, isSuperAdmin = false) {
  await ensureSchema(env);
  const now = new Date().toISOString();
  const performanceName =
    typeof state.performanceName === "string" && state.performanceName.trim()
      ? state.performanceName.trim()
      : DEFAULT_PERFORMANCE_NAME;
  const performanceDescription =
    typeof state.performanceDescription === "string"
      ? state.performanceDescription.trim()
      : "";
  const performanceType = normalizePerformanceType(state.performanceType);
  const performers = Array.isArray(state.performers)
    ? state.performers
    : Array.isArray(state.participants)
      ? state.participants
      : [];
  const normalizedPerformers = normalizePerformerIdentityList(performers);
  const draft = Array.isArray(state.form) ? state.form : null;
  const sequences = Array.isArray(state.sequences)
    ? state.sequences
    : Array.isArray(state.phrases)
      ? state.phrases
      : [];
  const requestedId = Number(state.performanceId);

  let performanceId = Number.isFinite(requestedId) ? requestedId : null;
  let shareRole = null;
  let existingPerformance = null;
  if (performanceId) {
    const exists = await env.DB
      .prepare(
        `SELECT c.id, c.user_id, c.is_demo,
          CASE WHEN c.user_id = ?2 THEN 'owner' ELSE cs.role END as share_role
         FROM performances c
         LEFT JOIN performance_shares cs ON cs.performance_id = c.id AND cs.shared_user_id = ?2
         WHERE c.id = ?1 AND (c.user_id = ?2 OR cs.shared_user_id = ?2 OR c.is_demo = 1) AND c.archived = 0`
      )
      .bind(performanceId, userId)
      .first();
    existingPerformance = exists;
    if (!exists?.id) {
      performanceId = null;
    } else {
      shareRole = exists.share_role;
    }
  }

  if (!performanceId) {
    const inserted = await env.DB
      .prepare(
        `INSERT INTO performances (user_id, name, description, participants, form_draft, type, created_at, updated_at, archived)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, 0)
         RETURNING id`
      )
      .bind(
        userId,
        performanceName,
        performanceDescription,
        JSON.stringify(normalizedPerformers),
        draft ? JSON.stringify(draft) : null,
        performanceType,
        now
      )
      .first();
    performanceId = inserted?.id;
  } else {
    const isDemo = Boolean(existingPerformance?.is_demo);
    if (isDemo && !isSuperAdmin) {
      return performanceId;
    }
    if (shareRole === DEFAULT_PERFORMANCE_SHARE_ROLE) {
      return performanceId;
    }
    const ownerId =
      isDemo && isSuperAdmin ? existingPerformance.user_id : userId;
    await env.DB
      .prepare(
        `UPDATE performances
         SET name = ?1, description = ?2, participants = ?3, form_draft = ?4, updated_at = ?5
         WHERE id = ?6 AND user_id = ?7`
      )
      .bind(
        performanceName,
        performanceDescription,
        JSON.stringify(normalizedPerformers),
        draft ? JSON.stringify(draft) : null,
        now,
        performanceId,
        ownerId
      )
      .run();
  }

  if (performanceId) {
    await env.DB
      .prepare(`DELETE FROM performance_sequences WHERE performance_id = ?1`)
      .bind(performanceId)
      .run();
    if (sequences.length > 0) {
      const lexiconReferenceIndex =
        performanceType === "classic"
          ? await getClassicV2LexiconReferenceIndex(env)
          : null;
      const inserts = sequences.map((sequence, index) =>
        env.DB
          .prepare(
            `INSERT INTO performance_sequences (performance_id, position, payload, created_at)
           VALUES (?1, ?2, ?3, ?4)`
          )
          .bind(
            performanceId,
            index,
            JSON.stringify(
              buildSequencePayload(sequence, normalizedPerformers, {
                lexiconReferenceIndex,
              }),
            ),
            now
          )
      );
      await env.DB.batch(inserts);
    }
  }

  return performanceId;
}

async function getLabels(env, table) {
  const rows = await env.DB.prepare(`SELECT label FROM ${table} ORDER BY id`).all();
  return rows?.results?.map((row) => row.label) ?? [];
}

export async function getLexiconItems(env, table) {
  await ensureLexiconSeeded(env);
  const rows = await env.DB.prepare(`SELECT id, label FROM ${table} ORDER BY id`).all();
  return rows?.results ?? [];
}

export async function getUserLexiconItems(env, table, userId) {
  await ensureLexiconSeeded(env);
  const rows = await env.DB
    .prepare(`SELECT id, label FROM ${table} WHERE user_id = ?1 ORDER BY id`)
    .bind(userId)
    .all();
  return rows?.results ?? [];
}

export async function addLexiconItem(env, table, label) {
  await ensureLexiconSeeded(env);
  const result = await env.DB.prepare(`INSERT INTO ${table} (label) VALUES (?1) RETURNING id, label`)
    .bind(label)
    .first();
  return result ?? null;
}

export async function addUserLexiconItem(env, table, userId, label) {
  await ensureLexiconSeeded(env);
  const result = await env.DB
    .prepare(`INSERT INTO ${table} (user_id, label) VALUES (?1, ?2) RETURNING id, label`)
    .bind(userId, label)
    .first();
  return result ?? null;
}

export async function deleteLexiconItem(env, table, id) {
  await ensureLexiconSeeded(env);
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(id).run();
}

export async function deleteUserLexiconItem(env, table, userId, id) {
  await ensureLexiconSeeded(env);
  await env.DB
    .prepare(`DELETE FROM ${table} WHERE id = ?1 AND user_id = ?2`)
    .bind(id, userId)
    .run();
}

export async function hasLexiconLabel(env, table, label) {
  await ensureLexiconSeeded(env);
  const row = await env.DB
    .prepare(`SELECT id FROM ${table} WHERE lower(label) = lower(?1) LIMIT 1`)
    .bind(label)
    .first();
  return Boolean(row?.id);
}

export async function hasUserLexiconLabel(env, table, userId, label) {
  await ensureLexiconSeeded(env);
  const row = await env.DB
    .prepare(`SELECT id FROM ${table} WHERE user_id = ?1 AND lower(label) = lower(?2) LIMIT 1`)
    .bind(userId, label)
    .first();
  return Boolean(row?.id);
}

export async function getFavorites(env, userId) {
  await ensureLexiconSeeded(env);
  const rows = await env.DB
    .prepare(`SELECT type, label FROM user_lexicon_favorites WHERE user_id = ?1 ORDER BY id`)
    .bind(userId)
    .all();
  return rows?.results ?? [];
}

export async function addFavorite(env, userId, type, label) {
  await ensureLexiconSeeded(env);
  await env.DB
    .prepare(
      `INSERT INTO user_lexicon_favorites (user_id, type, label)
       VALUES (?1, ?2, ?3)`
    )
    .bind(userId, type, label)
    .run();
}

export async function removeFavorite(env, userId, type, label) {
  await ensureLexiconSeeded(env);
  await env.DB
    .prepare(
      `DELETE FROM user_lexicon_favorites WHERE user_id = ?1 AND type = ?2 AND lower(label) = lower(?3)`
    )
    .bind(userId, type, label)
    .run();
}

export async function isFavorite(env, userId, type, label) {
  await ensureLexiconSeeded(env);
  const row = await env.DB
    .prepare(
      `SELECT id FROM user_lexicon_favorites WHERE user_id = ?1 AND type = ?2 AND lower(label) = lower(?3) LIMIT 1`
    )
    .bind(userId, type, label)
    .first();
  return Boolean(row?.id);
}

export async function replaceLexicon(env, lexicon) {
  await replaceLexiconByKey(env, "classic", lexicon);
}

const LEXICON_TABLES = {
  classic: {
    offensive: "offensive",
    action: "action",
    defensive: "defensive",
    cible: "target",
    deplacement: "movement",
    "parade-numero": "guard_number",
    "parade-attribut": "guard_attribute",
    "attaque-attribut": "attack_attribute"
  },
  "classic-v2": {
    offensive: "nl_offensive",
    action: "nl_action",
    defensive: "nl_defensive",
    cible: "nl_target",
    deplacement: "nl_movement",
    deplacement_complement: "nl_movement_complement",
    "parade-numero": "nl_guard_number",
    "parade-attribut": "nl_guard_attribute",
    "attaque-attribut": "nl_attack_attribute"
  },
  "sabre-laser": {
    armes: "sl_weapons",
    phases_choregraphie: "sl_choreography_phases",
    cibles: "sl_targets",
    techniques_offensives: "sl_offensive_techniques",
    attributs_offensifs: "sl_offensive_attributes",
    techniques_defensives: "sl_defensive_techniques",
    attributs_defensifs: "sl_defensive_attributes",
    preparations: "sl_preparations",
    deplacements: "sl_movements"
  }
};

function normalizeLexiconLabel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function mergeUniqueLabels(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      const label = typeof value === "string" ? value.trim() : "";
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

function normalizeLexiconTermEntry(value, bucket = "") {
  if (!value || typeof value !== "object") return null;
  const name = String(value.name ?? value.nom ?? value.label ?? "").trim();
  if (!name) return null;
  const lexiconId = String(value.lexicon_id ?? value.id ?? "").trim();
  return {
    lexicon_id:
      lexiconId || `legacy:${bucket || "term"}:${normalizeLexiconLabel(name)}`,
    name,
  };
}

function mergeUniqueLexiconTerms(...lists) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const entry = normalizeLexiconTermEntry(item);
      if (!entry) continue;
      const key = normalizeLexiconLabel(entry.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(entry);
    }
  }
  return out;
}

function toLexiconTermEntries(values, bucket) {
  const entries = [];
  for (const value of values ?? []) {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name) continue;
    entries.push({
      lexicon_id: `legacy:${bucket}:${normalizeLexiconLabel(name)}`,
      name,
    });
  }
  return mergeUniqueLexiconTerms(entries);
}

function splitNewMovementLabels(values, complementValues) {
  const complementLookup = new Set(
    mergeUniqueLabels(complementValues).map(normalizeLexiconLabel)
  );
  const base = [];
  const complement = [];
  for (const value of values ?? []) {
    if (complementLookup.has(normalizeLexiconLabel(value))) {
      complement.push(value);
      continue;
    }
    base.push(value);
  }
  return {
    base: mergeUniqueLabels(base),
    complement: mergeUniqueLabels(complementValues, complement)
  };
}

function splitNewMovementTerms(values, complementValues) {
  const normalizedComplements = mergeUniqueLexiconTerms(complementValues);
  const complementLookup = new Set(
    normalizedComplements.map((entry) => normalizeLexiconLabel(entry.name)),
  );
  const base = [];
  const complement = [...normalizedComplements];
  const complementSeen = new Set(
    normalizedComplements.map((entry) => normalizeLexiconLabel(entry.name)),
  );
  for (const value of values ?? []) {
    const entry = normalizeLexiconTermEntry(value, "deplacement");
    if (!entry) continue;
    const key = normalizeLexiconLabel(entry.name);
    if (complementLookup.has(key)) {
      if (!complementSeen.has(key)) {
        complementSeen.add(key);
        complement.push(entry);
      }
      continue;
    }
    base.push(entry);
  }
  return {
    base: mergeUniqueLexiconTerms(base),
    complement: mergeUniqueLexiconTerms(complement),
  };
}

function isRecursiveLexiconPayload(lexicon) {
  if (!lexicon || typeof lexicon !== "object" || Array.isArray(lexicon)) {
    return false;
  }
  return (
    Array.isArray(lexicon.children) ||
    Array.isArray(lexicon.categories) ||
    Array.isArray(lexicon.sous_categories) ||
    Array.isArray(lexicon.elements)
  );
}

function getRecursiveChildren(rawNode) {
  const children = [];
  if (Array.isArray(rawNode?.children)) children.push(...rawNode.children);
  if (Array.isArray(rawNode?.categories)) children.push(...rawNode.categories);
  if (Array.isArray(rawNode?.sous_categories)) {
    children.push(...rawNode.sous_categories);
  }
  if (Array.isArray(rawNode?.elements)) children.push(...rawNode.elements);
  return children;
}

function normalizeRecursiveLexiconSeed(seed) {
  if (!seed || typeof seed !== "object") return null;
  const usedIds = new Set();
  let autoIndex = 0;

  function getUniqueLexiconId(baseId) {
    let candidate = baseId || `lexicon_auto_${(autoIndex += 1)}`;
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
    let suffix = 2;
    while (usedIds.has(`${candidate}_${suffix}`)) {
      suffix += 1;
    }
    const uniqueId = `${candidate}_${suffix}`;
    usedIds.add(uniqueId);
    return uniqueId;
  }

  function resolveCompatLexiconId(rawId, parentLexiconId) {
    const normalizedRaw = String(rawId ?? "").trim();
    if (!normalizedRaw) return normalizedRaw;

    const parentOverrides = parentLexiconId
      ? CLASSIC_V2_COMPAT_ID_BY_PARENT[parentLexiconId] ?? null
      : null;
    if (parentOverrides && parentOverrides[normalizedRaw]) {
      return parentOverrides[normalizedRaw];
    }

    return CLASSIC_V2_COMPAT_ID_ALIASES[normalizedRaw] ?? normalizedRaw;
  }

  function visit(rawNode, fallbackId, parentLexiconId = null) {
    const rawId = String(rawNode?.id ?? fallbackId ?? "").trim();
    const compatId = resolveCompatLexiconId(rawId, parentLexiconId);
    const lexiconId = getUniqueLexiconId(compatId || `lexicon_auto_${autoIndex + 1}`);
    const rawName =
      rawNode?.name ??
      rawNode?.nom ??
      rawNode?.title ??
      rawNode?.titre ??
      lexiconId;
    const name = String(rawName ?? "").trim() || lexiconId;
    const rawDescription = rawNode?.description ?? rawNode?.description_fr ?? "";
    const description = String(rawDescription ?? "").trim();
    const children = getRecursiveChildren(rawNode).map((child, index) =>
      visit(child, `${lexiconId}_${index + 1}`, lexiconId),
    );
    return { lexiconId, name, description, children };
  }

  return visit(seed, "classic_v2_root", null);
}

async function replaceRecursiveLexicon(env, recursiveLexicon) {
  await ensureLexiconSchema(env);
  const normalizedTree = normalizeRecursiveLexiconSeed(recursiveLexicon);
  if (!normalizedTree) return;
  await env.DB.prepare("DELETE FROM lexicon").run();

  async function insertNode(node, parentId = null) {
    const inserted = await env.DB
      .prepare(
        `INSERT INTO lexicon (lexicon_id, parent_id, name, description)
         VALUES (?1, ?2, ?3, ?4)
         RETURNING id`,
      )
      .bind(node.lexiconId, parentId, node.name, node.description || null)
      .first();
    const nodeId = inserted?.id;
    if (!nodeId || !Array.isArray(node.children)) return;
    for (const child of node.children) {
      // eslint-disable-next-line no-await-in-loop
      await insertNode(child, nodeId);
    }
  }

  await insertNode(normalizedTree, null);
}

async function getRecursiveLexiconRows(env) {
  await ensureLexiconSeeded(env);
  const rows = await env.DB
    .prepare(
      `SELECT id, lexicon_id, parent_id, name, description
       FROM lexicon
       ORDER BY id`,
    )
    .all();
  return rows?.results ?? [];
}

function buildClassicV2LexiconBucketsFromRecursiveRows(rows) {
  const byId = new Map();
  const hasChildren = new Set();
  for (const row of rows ?? []) {
    if (!row?.id) continue;
    byId.set(row.id, row);
    if (row.parent_id != null) hasChildren.add(row.parent_id);
  }

  const buckets = {
    offensive: [],
    action: [],
    defensive: [],
    cible: [],
    deplacement: [],
    deplacement_complement: [],
    "parade-numero": [],
    "parade-attribut": [],
    "attaque-attribut": [],
  };
  const seenByBucket = new Map(
    Object.keys(buckets).map((bucket) => [bucket, new Set()]),
  );

  for (const row of rows ?? []) {
    if (!row?.id || hasChildren.has(row.id)) continue;
    const name = String(row.name ?? "").trim();
    if (!name) continue;

    const ancestorIds = [];
    let cursor = row;
    while (cursor) {
      ancestorIds.push(String(cursor.lexicon_id ?? ""));
      cursor =
        cursor.parent_id != null ? byId.get(Number(cursor.parent_id)) ?? null : null;
    }

    let targetBucket = null;
    for (const [bucket, markers] of Object.entries(
      CLASSIC_V2_TREE_BUCKET_MARKERS,
    )) {
      if (ancestorIds.some((ancestorId) => markers.has(ancestorId))) {
        targetBucket = bucket;
        break;
      }
    }
    if (!targetBucket) continue;

    const normalizedName = normalizeLexiconLabel(name);
    const bucketSeen = seenByBucket.get(targetBucket);
    if (bucketSeen?.has(normalizedName)) continue;
    bucketSeen?.add(normalizedName);

    buckets[targetBucket].push({
      lexicon_id: String(row.lexicon_id ?? ""),
      name,
    });
  }

  return buckets;
}

function buildClassicV2LexiconFromBucketEntries(bucketEntries) {
  return {
    offensive: bucketEntries.offensive.map((entry) => entry.name),
    action: bucketEntries.action.map((entry) => entry.name),
    defensive: bucketEntries.defensive.map((entry) => entry.name),
    cible: bucketEntries.cible.map((entry) => entry.name),
    deplacement: bucketEntries.deplacement.map((entry) => entry.name),
    deplacement_complement: bucketEntries.deplacement_complement.map(
      (entry) => entry.name,
    ),
    "parade-numero": bucketEntries["parade-numero"].map((entry) => entry.name),
    "parade-attribut": bucketEntries["parade-attribut"].map((entry) => entry.name),
    "attaque-attribut": bucketEntries["attaque-attribut"].map((entry) => entry.name),
  };
}

function buildRecursiveLexiconFromRows(rows) {
  const byNumericId = new Map();
  for (const row of rows ?? []) {
    const numericId = Number(row?.id);
    if (!Number.isInteger(numericId)) continue;
    byNumericId.set(numericId, {
      id: String(row?.lexicon_id ?? "").trim() || `lexicon_${numericId}`,
      nom: String(row?.name ?? "").trim(),
      description: row?.description == null ? "" : String(row.description),
      children: [],
    });
  }

  const roots = [];
  for (const row of rows ?? []) {
    const numericId = Number(row?.id);
    const node = byNumericId.get(numericId);
    if (!node) continue;
    const parentNumericId = Number(row?.parent_id);
    if (Number.isInteger(parentNumericId) && byNumericId.has(parentNumericId)) {
      byNumericId.get(parentNumericId).children.push(node);
      continue;
    }
    roots.push(node);
  }

  if (roots.length === 1) return roots[0];
  return {
    id: "classic_v2_root",
    nom: "Escrime historique française - Lexique complet",
    description: "",
    children: roots,
  };
}

function buildClassicV2LexiconReferenceIndexFromBuckets(bucketEntries) {
  const referencesByBucket = new Map();
  const referencesByLexiconId = new Map();
  for (const [bucket, entries] of Object.entries(bucketEntries)) {
    const bucketMap = new Map();
    for (const entry of entries ?? []) {
      const normalizedName = normalizeLexiconLabel(entry?.name);
      if (!normalizedName || bucketMap.has(normalizedName)) continue;
      const reference = {
        lexicon_id: entry.lexicon_id ?? null,
        name: entry.name ?? "",
      };
      bucketMap.set(normalizedName, reference);
      const lexiconId = String(reference.lexicon_id ?? "").trim();
      if (lexiconId && !referencesByLexiconId.has(lexiconId)) {
        referencesByLexiconId.set(lexiconId, reference);
      }
    }
    referencesByBucket.set(bucket, bucketMap);
  }
  return { referencesByBucket, referencesByLexiconId };
}

function buildClassicV2BucketEntriesFromFlatLexicon(lexicon) {
  const buckets = {
    offensive: [],
    action: [],
    defensive: [],
    cible: [],
    deplacement: [],
    deplacement_complement: [],
    "parade-numero": [],
    "parade-attribut": [],
    "attaque-attribut": [],
  };

  for (const bucket of Object.keys(buckets)) {
    const labels = Array.isArray(lexicon?.[bucket]) ? lexicon[bucket] : [];
    for (const label of labels) {
      const name = typeof label === "string" ? label.trim() : "";
      if (!name) continue;
      const normalized = normalizeLexiconLabel(name);
      buckets[bucket].push({
        lexicon_id: `legacy:${bucket}:${normalized}`,
        name,
      });
    }
  }

  return buckets;
}

function mergeClassicV2BucketEntries(primary, secondary) {
  const merged = {};
  const allBuckets = new Set([
    ...Object.keys(primary ?? {}),
    ...Object.keys(secondary ?? {}),
  ]);

  for (const bucket of allBuckets) {
    const list = [];
    const seen = new Set();
    for (const entries of [primary?.[bucket] ?? [], secondary?.[bucket] ?? []]) {
      for (const entry of entries) {
        const name = String(entry?.name ?? "").trim();
        const normalized = normalizeLexiconLabel(name);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        list.push({
          lexicon_id: entry?.lexicon_id ?? null,
          name,
        });
      }
    }
    merged[bucket] = list;
  }

  return merged;
}

function resolveClassicV2LexiconReference(index, bucket, name) {
  if (!index || !bucket) return null;
  const lexiconId = String(name ?? "").trim();
  if (lexiconId && index.referencesByLexiconId?.has(lexiconId)) {
    return index.referencesByLexiconId.get(lexiconId);
  }
  const normalizedName = normalizeLexiconLabel(name);
  if (!normalizedName) return null;
  const bucketMap = index.referencesByBucket.get(bucket);
  if (!bucketMap) return null;
  return bucketMap.get(normalizedName) ?? null;
}

function addLexiconReference(refState, index, field, buckets, value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return;

  let resolved = null;
  for (const bucket of buckets ?? []) {
    resolved = resolveClassicV2LexiconReference(index, bucket, rawValue);
    if (resolved) break;
  }
  const persistedName = String(resolved?.name ?? rawValue).trim();
  if (!persistedName) return;

  const dedupeKey = `${field}|${resolved?.lexicon_id ?? "null"}|${normalizeLexiconLabel(persistedName)}`;
  if (refState.seen.has(dedupeKey)) return;
  refState.seen.add(dedupeKey);
  refState.list.push({
    field,
    lexicon_id: resolved?.lexicon_id ?? null,
    name: persistedName,
  });
}

function addDelimitedLexiconReferences(refState, index, field, buckets, value) {
  for (const token of splitDelimitedValue(value)) {
    addLexiconReference(refState, index, field, buckets, token);
  }
}

function addStepPerformerLexiconRefs(performer, index) {
  if (!performer || typeof performer !== "object") return performer;

  const refState = { list: [], seen: new Set() };

  addLexiconReference(refState, index, "offensive", ["offensive"], performer.offensive);
  addLexiconReference(refState, index, "action", ["action", "offensive"], performer.action);
  addLexiconReference(refState, index, "target", ["cible"], performer.target);
  addDelimitedLexiconReferences(
    refState,
    index,
    "attackMove",
    ["deplacement", "deplacement_complement"],
    performer.attackMove,
  );
  for (const attribute of performer.attackAttribute ?? []) {
    addLexiconReference(
      refState,
      index,
      "attackAttribute",
      ["attaque-attribut", "deplacement_complement", "parade-attribut"],
      attribute,
    );
  }
  addLexiconReference(refState, index, "defense", ["defensive"], performer.defense);
  addLexiconReference(
    refState,
    index,
    "paradeNumber",
    ["parade-numero"],
    performer.paradeNumber,
  );
  addDelimitedLexiconReferences(
    refState,
    index,
    "paradeAttribute",
    ["parade-attribut"],
    performer.paradeAttribute,
  );
  addDelimitedLexiconReferences(
    refState,
    index,
    "defendMove",
    ["deplacement", "deplacement_complement"],
    performer.defendMove,
  );

  for (const actionDetail of performer.actionDetails ?? []) {
    addLexiconReference(
      refState,
      index,
      "actionDetails.action",
      ["action", "offensive"],
      actionDetail?.action,
    );
    addLexiconReference(
      refState,
      index,
      "actionDetails.attribute",
      ["attaque-attribut", "parade-numero", "parade-attribut"],
      actionDetail?.attribute,
    );
  }

  for (const defenseDetail of performer.defenseDetails ?? []) {
    const defenseName = String(defenseDetail?.defense ?? "").trim();
    if (normalizeLexiconLabel(defenseName) !== "parade") {
      addLexiconReference(
        refState,
        index,
        "defenseDetails.defense",
        ["defensive"],
        defenseName,
      );
    }
    addLexiconReference(
      refState,
      index,
      "defenseDetails.position",
      ["parade-numero"],
      defenseDetail?.position,
    );
    addDelimitedLexiconReferences(
      refState,
      index,
      "defenseDetails.attribute",
      ["parade-attribut"],
      defenseDetail?.attribute,
    );
  }

  if (!refState.list.length) return performer;
  return { ...performer, lexiconRefs: refState.list };
}

async function getLexiconNameByIdMap(env) {
  const rows = await getRecursiveLexiconRows(env);
  const map = new Map();
  for (const row of rows ?? []) {
    const lexiconId = String(row?.lexicon_id ?? "").trim();
    const name = String(row?.name ?? "").trim();
    if (!lexiconId || !name || map.has(lexiconId)) continue;
    map.set(lexiconId, name);
  }
  return map;
}

function buildStepLexiconFieldLookup(lexiconRefs, lexiconNameById) {
  const byField = new Map();
  if (!Array.isArray(lexiconRefs)) return byField;
  for (const ref of lexiconRefs) {
    const field = String(ref?.field ?? "").trim();
    if (!field) continue;
    const storedName = String(ref?.name ?? "").trim();
    const resolvedById = ref?.lexicon_id
      ? String(lexiconNameById?.get(ref.lexicon_id) ?? "").trim()
      : "";
    const resolvedName = resolvedById || storedName;
    if (!resolvedName) continue;
    let fieldMap = byField.get(field);
    if (!fieldMap) {
      fieldMap = new Map();
      byField.set(field, fieldMap);
    }
    const keys = [
      normalizeLexiconLabel(storedName),
      normalizeLexiconLabel(resolvedName),
    ].filter(Boolean);
    for (const key of keys) {
      if (!fieldMap.has(key)) fieldMap.set(key, resolvedName);
    }
  }
  return byField;
}

function resolveLexiconToken(fieldLookup, field, value) {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  const key = normalizeLexiconLabel(raw);
  const fieldMap = fieldLookup.get(field);
  if (!fieldMap || !fieldMap.has(key)) return raw;
  return fieldMap.get(key) ?? raw;
}

function resolveDelimitedLexiconTokens(fieldLookup, field, value) {
  const tokens = splitDelimitedValue(value);
  if (!tokens.length) return String(value ?? "").trim();
  return tokens
    .map((token) => resolveLexiconToken(fieldLookup, field, token))
    .join(" · ");
}

function resolveLexiconArray(fieldLookup, field, values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => resolveLexiconToken(fieldLookup, field, value));
}

function hydratePerformerLabelsFromLexiconRefs(performer, lexiconNameById) {
  if (!performer || typeof performer !== "object") return performer;
  const fieldLookup = buildStepLexiconFieldLookup(
    performer.lexiconRefs,
    lexiconNameById,
  );
  if (!fieldLookup.size) return performer;

  const actionDetails = Array.isArray(performer.actionDetails)
    ? performer.actionDetails.map((detail) => ({
        ...detail,
        action: resolveLexiconToken(
          fieldLookup,
          "actionDetails.action",
          detail?.action,
        ),
        attribute: resolveLexiconToken(
          fieldLookup,
          "actionDetails.attribute",
          detail?.attribute,
        ),
      }))
    : [];

  const defenseDetails = Array.isArray(performer.defenseDetails)
    ? performer.defenseDetails.map((detail) => ({
        ...detail,
        defense: resolveLexiconToken(
          fieldLookup,
          "defenseDetails.defense",
          detail?.defense,
        ),
        position: resolveLexiconToken(
          fieldLookup,
          "defenseDetails.position",
          detail?.position,
        ),
        attribute: resolveDelimitedLexiconTokens(
          fieldLookup,
          "defenseDetails.attribute",
          detail?.attribute,
        ),
      }))
    : [];

  return {
    ...performer,
    offensive: resolveLexiconToken(fieldLookup, "offensive", performer.offensive),
    action: resolveLexiconToken(fieldLookup, "action", performer.action),
    target: resolveLexiconToken(fieldLookup, "target", performer.target),
    attackMove: resolveDelimitedLexiconTokens(
      fieldLookup,
      "attackMove",
      performer.attackMove,
    ),
    attackAttribute: resolveLexiconArray(
      fieldLookup,
      "attackAttribute",
      performer.attackAttribute,
    ),
    defense: resolveLexiconToken(fieldLookup, "defense", performer.defense),
    paradeNumber: resolveLexiconToken(
      fieldLookup,
      "paradeNumber",
      performer.paradeNumber,
    ),
    paradeAttribute: resolveDelimitedLexiconTokens(
      fieldLookup,
      "paradeAttribute",
      performer.paradeAttribute,
    ),
    defendMove: resolveDelimitedLexiconTokens(
      fieldLookup,
      "defendMove",
      performer.defendMove,
    ),
    actionDetails,
    defenseDetails,
  };
}

function hydrateStepLabelsFromLexiconRefs(step, lexiconNameById) {
  if (!step || typeof step !== "object") return step;
  const lexiconKey = resolveStepLexiconKey(step.lexicon, {
    fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
  });
  if (lexiconKey !== "classic-v2") return step;

  const performers = Array.isArray(step.performers)
    ? step.performers
    : Array.isArray(step.participants)
      ? step.participants
      : null;
  if (!performers) return step;

  const nextPerformers = performers.map((performer) =>
    hydratePerformerLabelsFromLexiconRefs(performer, lexiconNameById),
  );

  return {
    ...step,
    performers: nextPerformers,
    // Backward compatibility during participant -> performer migration.
    participants: nextPerformers,
  };
}

async function getClassicV2LexiconReferenceIndex(env) {
  const recursiveRows = await getRecursiveLexiconRows(env);
  const recursiveBuckets = recursiveRows.length
    ? buildClassicV2LexiconBucketsFromRecursiveRows(recursiveRows)
    : null;

  const legacyTables = LEXICON_TABLES["classic-v2"];
  const legacyEntries = await Promise.all(
    Object.entries(legacyTables).map(async ([key, table]) => [key, await getLabels(env, table)]),
  );
  const legacyLexicon = Object.fromEntries(legacyEntries);
  const legacyBuckets = buildClassicV2BucketEntriesFromFlatLexicon(legacyLexicon);

  const mergedBuckets = recursiveBuckets
    ? mergeClassicV2BucketEntries(recursiveBuckets, legacyBuckets)
    : legacyBuckets;

  return buildClassicV2LexiconReferenceIndexFromBuckets(mergedBuckets);
}

export async function replaceLexiconByKey(env, lexiconKey, lexicon) {
  await ensureLexiconSchema(env);
  if (lexiconKey === "classic-v2" && isRecursiveLexiconPayload(lexicon)) {
    await replaceRecursiveLexicon(env, lexicon);
    const rows = await env.DB
      .prepare(
        `SELECT id, lexicon_id, parent_id, name, description
         FROM lexicon
         ORDER BY id`,
      )
      .all();
    const bucketEntries = buildClassicV2LexiconBucketsFromRecursiveRows(
      rows?.results ?? [],
    );
    const flatLexicon = buildClassicV2LexiconFromBucketEntries(bucketEntries);
    const tables = LEXICON_TABLES["classic-v2"];
    for (const [key, table] of Object.entries(tables)) {
      const values = flatLexicon?.[key];
      if (!Array.isArray(values)) continue;
      await env.DB.prepare(`DELETE FROM ${table}`).run();
      for (const value of values) {
        const label = typeof value === "string" ? value.trim() : "";
        if (!label) continue;
        await env.DB
          .prepare(`INSERT INTO ${table} (label) VALUES (?1)`)
          .bind(label)
          .run();
      }
    }
    return;
  }

  const tables = LEXICON_TABLES[lexiconKey] || LEXICON_TABLES.classic;
  for (const [key, table] of Object.entries(tables)) {
    const values = lexicon?.[key];
    if (!Array.isArray(values)) continue;
    await env.DB.prepare(`DELETE FROM ${table}`).run();
    for (const value of values) {
      const label = typeof value === "string" ? value.trim() : "";
      if (!label) continue;
      await env.DB.prepare(`INSERT INTO ${table} (label) VALUES (?1)`).bind(label).run();
    }
  }
}

export async function getLexiconByKey(env, lexiconKey) {
  await ensureLexiconSeeded(env);
  let lexicon = null;
  const tables = LEXICON_TABLES[lexiconKey] || LEXICON_TABLES.classic;

  if (lexiconKey === "classic-v2") {
    const recursiveRows = await getRecursiveLexiconRows(env);
    if (recursiveRows.length > 0) {
      return buildRecursiveLexiconFromRows(recursiveRows);
    }

    const legacyEntries = await Promise.all(
      Object.entries(tables).map(async ([key, table]) => [key, await getLabels(env, table)]),
    );
    const legacyLexicon = Object.fromEntries(legacyEntries);
    const legacyTermBuckets = {
      offensive: toLexiconTermEntries(legacyLexicon.offensive, "offensive"),
      action: toLexiconTermEntries(legacyLexicon.action, "action"),
      defensive: toLexiconTermEntries(legacyLexicon.defensive, "defensive"),
      cible: toLexiconTermEntries(legacyLexicon.cible, "cible"),
      deplacement: toLexiconTermEntries(legacyLexicon.deplacement, "deplacement"),
      deplacement_complement: toLexiconTermEntries(
        legacyLexicon.deplacement_complement,
        "deplacement_complement",
      ),
      "parade-numero": toLexiconTermEntries(
        legacyLexicon["parade-numero"],
        "parade-numero",
      ),
      "parade-attribut": toLexiconTermEntries(
        legacyLexicon["parade-attribut"],
        "parade-attribut",
      ),
      "attaque-attribut": toLexiconTermEntries(
        legacyLexicon["attaque-attribut"],
        "attaque-attribut",
      ),
    };

    lexicon = legacyTermBuckets;
  }

  if (!lexicon) {
    const entries = await Promise.all(
      Object.entries(tables).map(async ([key, table]) => [key, await getLabels(env, table)]),
    );
    lexicon = Object.fromEntries(entries);
  }

  if (lexiconKey === "classic-v2") {
    const firstMovement = Array.isArray(lexicon.deplacement)
      ? lexicon.deplacement[0]
      : null;
    const usesStringEntries = typeof firstMovement === "string";
    const { base, complement } = usesStringEntries
      ? splitNewMovementLabels(lexicon.deplacement, lexicon.deplacement_complement)
      : splitNewMovementTerms(lexicon.deplacement, lexicon.deplacement_complement);
    lexicon.deplacement_base = base;
    lexicon.deplacement_complement = complement;
    lexicon.deplacement = usesStringEntries
      ? mergeUniqueLabels(base, complement)
      : mergeUniqueLexiconTerms(base, complement);
  }
  return lexicon;
}

export async function getLexicon(env) {
  return getLexiconByKey(env, "classic");
}
