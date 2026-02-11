import {
  normalizeStepMode,
} from "../utils/performers.js";
import {
  splitDelimitedValue,
  normalizeLexiconLabel,
  hasStorageTerm,
  resolveStorageTermRef,
  resolveStorageTermRefs,
  buildStepLexiconFieldLookup,
  resolveLexiconToken,
  resolveDelimitedLexiconTokens,
  resolveLexiconArray,
} from "../utils/lexicon.js";
import {
  LEGACY_STEP_LEXICON_KEY,
  resolveStepLexiconKey,
} from "../../../../shared/stepModel.js";

const SEQUENCE_SCHEMA_VERSION = "2.0";

const GENERIC_ATTACK_MARKERS = new Set([
  "attaque",
  "attack",
  "preparation",
  "préparation",
]);

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

function isDisplacementsPreparationValue(value) {
  const normalized = normalizeLexiconLabel(value).replace(/_/g, " ").trim();
  return normalized === "displacements prep" || normalized === "deplacements prep";
}

function legacyPerformerToStoragePerformer(performer, lexiconReferenceIndex) {
  const safe = performer && typeof performer === "object" ? performer : {};
  const mode = normalizeStepMode(safe.mode) || "combat";

  const allowDisplacementsPrepInActionDetails =
    safe.role === "movement" ||
    safe.role === "preparation" ||
    Boolean(String(safe.preparationAction ?? "").trim());
  const actionDetails = (Array.isArray(safe.actionDetails) ? safe.actionDetails : [])
    .filter((detail) => {
      if (allowDisplacementsPrepInActionDetails) return true;
      const token = normalizeLexiconLabel(String(detail?.action ?? ""))
        .replace(/_/g, " ")
        .trim();
      return token !== "displacements prep" && token !== "deplacements prep";
    });
  const defenseDetails = Array.isArray(safe.defenseDetails)
    ? safe.defenseDetails
    : [];

  const attackName =
    String(safe.offensive ?? "").trim() &&
    !isGenericAttackLabel(safe.offensive)
      ? String(safe.offensive).trim()
      : "";
  const rawPreparationName = String(
    safe.preparationAction ?? safe.action ?? "",
  ).trim();
  const preparationTiming =
    String(safe.preparationTiming ?? "").trim().toLowerCase() === "after"
      ? "after"
      : "before";
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
          ["defense-attribut", "defensive", "action"],
          detail?.defense,
        ),
        ...resolveDelimitedLexiconTerms(
          lexiconReferenceIndex,
          ["defense-attribut", "parade-attribut", "deplacement_complement"],
          detail?.attribute,
        ),
      ])
      .filter(Boolean),
  );

  const explicitMoveBase = String(safe.move ?? "").trim();
  const explicitMoveDetails = Array.isArray(safe.moveDetails)
    ? safe.moveDetails.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];
  const explicitMoveTokens = explicitMoveBase
    ? [explicitMoveBase, ...explicitMoveDetails]
    : [...explicitMoveDetails];
  const attackMoveTokens = splitDelimitedValue(safe.attackMove);
  const defendMoveTokens = splitDelimitedValue(safe.defendMove);
  const mergedAttackMoveTokens =
    attackMoveTokens.length > 0
      ? attackMoveTokens
      : safe.role === "defense"
        ? []
        : explicitMoveTokens;
  const mergedDefendMoveTokens =
    defendMoveTokens.length > 0
      ? defendMoveTokens
      : safe.role === "defense"
        ? explicitMoveTokens
        : [];

  const preparationName = rawPreparationName;
  const hasPreparation = Boolean(preparationName);
  const movementBaseName =
    mergedAttackMoveTokens[0] ?? mergedDefendMoveTokens[0] ?? "";
  const movementAttributes = dedupeLexiconTerms(
    [
      ...(mergedAttackMoveTokens.length > 1
        ? mergedAttackMoveTokens.slice(1).map((token) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["deplacement_complement", "parade-attribut", "attaque-attribut"],
              token,
            ),
          )
        : []),
      ...(mergedDefendMoveTokens.length > 1
        ? mergedDefendMoveTokens.slice(1).map((token) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["deplacement_complement", "parade-attribut", "attaque-attribut"],
              token,
            ),
          )
        : []),
      mergedAttackMoveTokens[0] &&
      mergedDefendMoveTokens[0] &&
      mergedAttackMoveTokens[0] !== mergedDefendMoveTokens[0]
        ? resolveLexiconTerm(
            lexiconReferenceIndex,
            ["deplacement", "deplacement_complement"],
            mergedDefendMoveTokens[0],
          )
        : null,
    ].filter(Boolean),
  );

  const preparation = hasPreparation
    ? {
        ...resolveLexiconTerm(lexiconReferenceIndex, ["action"], preparationName),
        attributes: prepAttributes,
        timing: preparationTiming,
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
  const mainGuardName = String(safe.mainGuard ?? "").trim();
  const basePostureName = String(safe.basePosture ?? "").trim();
  const mainGuard = mainGuardName
    ? resolveLexiconTerm(
        lexiconReferenceIndex,
        ["garde_principale", "parade-numero", "cible"],
        mainGuardName,
      )
    : null;
  const basePosture = basePostureName
    ? resolveLexiconTerm(
        lexiconReferenceIndex,
        ["postures_base", "deplacement", "action"],
        basePostureName,
      )
    : null;

  return {
    mode,
    mainGuard,
    basePosture,
    preparation,
    attack,
    defense,
    movement,
    note: typeof safe.note === "string" ? safe.note : "",
  };
}

function inferLegacyRoleFromStoragePerformer({
  hasPreparation = false,
  hasAttack = false,
  hasDefense = false,
  hasMovement = false,
}) {
  if (hasAttack) return "attack";
  if (hasDefense) return "defense";
  if (hasPreparation) return "attack";
  if (hasMovement) return "movement";
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
  const preparationTiming =
    String(preparation?.timing ?? "").trim().toLowerCase() === "after"
      ? "after"
      : "before";
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
  const mainGuardRef = resolveStorageTermRef(safe.mainGuard, lexiconNameById);
  const basePostureRef = resolveStorageTermRef(
    safe.basePosture,
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

  const hasPreparation =
    hasStorageTerm(preparation) ||
    Boolean(preparationTargetName) ||
    Boolean(preparationPositionName) ||
    preparationPositionAttributes.length > 0;
  const hasAttack = hasStorageTerm(attack);
  const hasDefense = hasStorageTerm(defense);
  const hasMovement = hasStorageTerm(movement) || movementAttributeRefs.length > 0;
  const isMovementOnlyDisplacementsPreparation =
    isDisplacementsPreparationValue(
      preparationRef?.lexicon_id || preparationRef?.name || "",
    ) &&
    !hasAttack &&
    !hasDefense &&
    hasMovement;
  const keepPreparation = hasPreparation && !isMovementOnlyDisplacementsPreparation;
  const role = inferLegacyRoleFromStoragePerformer({
    hasPreparation: keepPreparation,
    hasAttack,
    hasDefense,
    hasMovement,
  });

  const movementValueParts = [
    movementRef?.lexicon_id || movementRef?.name || "",
    ...movementAttributeRefs.map((entry) => entry.lexicon_id || entry.name),
  ].filter(Boolean);
  const move = movementValueParts[0] ?? "";
  const moveDetails = movementValueParts.slice(1);
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
          defense: defenseRef?.lexicon_id || defenseName,
          position: defensePositionRef?.lexicon_id || defensePositionName,
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
    mainGuard: mainGuardRef?.lexicon_id || mainGuardRef?.name || "",
    basePosture: basePostureRef?.lexicon_id || basePostureRef?.name || "",
    preparationAction:
      role === "movement"
        ? ""
        : (preparationRef?.lexicon_id || preparationName),
    preparationTiming,
    offensive: hasAttack
      ? attackRef?.lexicon_id || attackName
      : "",
    action: keepPreparation
      ? preparationRef?.lexicon_id || preparationName
      : role === "movement" && hasMovement
        ? ""
        : attackAttributeRefs[0]?.lexicon_id || attackAttributes[0] || "",
    actionDetails: keepPreparation
      ? preparationActionDetails
      : attackAttributeRefs.map((attribute) => ({
          action: attribute.lexicon_id || attribute.name,
          attribute: "",
        })),
    target: hasAttack
      ? attackTargetRef?.lexicon_id || attackTargetName
      : keepPreparation
        ? preparationTargetRef?.lexicon_id || preparationTargetName
        : "",
    attackMove: hasDefense ? "" : movementValueParts.join(" · "),
    move,
    moveDetails,
    attackAttribute: keepPreparation
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
    note: typeof safe.note === "string" ? safe.note : "",
    noteOverrides: false,
  };
}

export function normalizeStoragePerformerOrder(
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

export function resolveHiddenPerformerIndexesFromMetadata(
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
    : [];
  return hiddenIndexes
    .map((value) => Number(value))
    .filter(
      (value) =>
        Number.isInteger(value) && value >= 0 && value < performers.length,
    );
}

export function convertStorageStepToLegacyStep(
  stepPayload,
  { lexiconKey, performerOrder, lexiconNameById },
) {
  const performerEntries =
    stepPayload && typeof stepPayload === "object"
      ? stepPayload.performers ?? null
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

export function buildSequencePayload(
  sequence,
  performers,
  { createStepModel, lexiconReferenceIndex = null } = {},
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

export function addStepPerformerLexiconRefs(performer, index) {
  if (!performer || typeof performer !== "object") return performer;

  const refState = { list: [], seen: new Set() };

  addLexiconReference(refState, index, "offensive", ["offensive"], performer.offensive);
  addLexiconReference(refState, index, "action", ["action", "offensive"], performer.action);
  addLexiconReference(
    refState,
    index,
    "mainGuard",
    ["garde_principale", "parade-numero", "cible"],
    performer.mainGuard,
  );
  addLexiconReference(
    refState,
    index,
    "basePosture",
    ["postures_base", "deplacement", "action"],
    performer.basePosture,
  );
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

  for (const [detailIndex, defenseDetail] of (
    performer.defenseDetails ?? []
  ).entries()) {
    const defenseName = String(defenseDetail?.defense ?? "").trim();
    if (normalizeLexiconLabel(defenseName) !== "parade") {
      addLexiconReference(
        refState,
        index,
        "defenseDetails.defense",
        detailIndex === 0
          ? ["defensive", "defense-attribut"]
          : ["defense-attribut", "defensive"],
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
    mainGuard: resolveLexiconToken(fieldLookup, "mainGuard", performer.mainGuard),
    basePosture: resolveLexiconToken(fieldLookup, "basePosture", performer.basePosture),
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

export function hydrateStepLabelsFromLexiconRefs(step, lexiconNameById) {
  if (!step || typeof step !== "object") return step;
  const lexiconKey = resolveStepLexiconKey(step.lexicon, {
    fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
  });
  if (lexiconKey !== "classic-v2") return step;

  const performers = Array.isArray(step.performers)
    ? step.performers
    : null;
  if (!performers) return step;

  const nextPerformers = performers.map((performer) =>
    hydratePerformerLabelsFromLexiconRefs(performer, lexiconNameById),
  );

  return {
    ...step,
    performers: nextPerformers,
  };
}
