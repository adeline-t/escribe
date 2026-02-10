import {
  DEFAULT_PERFORMANCE_NAME,
  DEFAULT_PERFORMANCE_SHARE_ROLE,
  DEFAULT_PERFORMANCE_TYPE,
  normalizePerformanceShareRole,
  normalizePerformanceType,
  normalizeHiddenPerformerIndexes as normalizeHiddenPerformerIndexesFromModel,
} from "../../../shared/performanceModel.js";
import { createSequenceModel } from "../../../shared/sequenceModel.js";
import {
  createStepModel,
  createStepPerformerModel,
  LEGACY_STEP_LEXICON_KEY,
} from "../../../shared/stepModel.js";

export function buildPerformerLabel(index) {
  return `Combattant ${index + 1}`;
}

export function normalizePerformerIdentity(item, index, fallbackName) {
  if (typeof item === "string") {
    return { id: crypto.randomUUID(), name: item, weapon: "" };
  }
  if (item && typeof item === "object") {
    const id =
      typeof item.id === "string" && item.id.trim()
        ? item.id
        : crypto.randomUUID();
    const name = typeof item.name === "string" ? item.name : "";
    const weapon = typeof item.weapon === "string" ? item.weapon : "";
    return { id, name, weapon };
  }
  return { id: crypto.randomUUID(), name: fallbackName || "", weapon: "" };
}

export function getPerformerName(performer, index) {
  const name =
    typeof performer === "string"
      ? performer
      : typeof performer?.name === "string"
        ? performer.name
        : "";
  return name && name.trim() ? name : buildPerformerLabel(index);
}

export function getPerformerWeapon(performer) {
  if (
    performer &&
    typeof performer === "object" &&
    typeof performer.weapon === "string"
  ) {
    return performer.weapon.trim();
  }
  return "";
}

export function formatPerformerSummary(performer, index) {
  const name = getPerformerName(performer, index);
  const weapon = getPerformerWeapon(performer);
  return weapon ? `${name} (${weapon})` : name;
}

export function labelForPerformer(performer, index) {
  return getPerformerName(performer, index);
}

export function emptyPerformerState() {
  return createStepPerformerModel();
}

export function normalizeHiddenPerformerIndexes(raw, performerCount) {
  return normalizeHiddenPerformerIndexesFromModel(raw, performerCount);
}

export function getVisiblePerformerIndexes(performerCount, hiddenIndexes) {
  const total = Math.max(0, Number(performerCount) || 0);
  const hidden = new Set(normalizeHiddenPerformerIndexes(hiddenIndexes, total));
  const visible = [];
  for (let index = 0; index < total; index += 1) {
    if (!hidden.has(index)) visible.push(index);
  }
  return visible;
}

export function normalizePerformer(item) {
  return createStepPerformerModel(item);
}

export function normalizeState(raw, defaultPerformers) {
  if (!raw || typeof raw !== "object") return null;
  const performanceId = Number.isFinite(Number(raw.performanceId))
    ? Number(raw.performanceId)
    : null;
  const performanceName =
    typeof raw.performanceName === "string"
      ? raw.performanceName
      : DEFAULT_PERFORMANCE_NAME;
  const performanceDescription =
    typeof raw.performanceDescription === "string"
      ? raw.performanceDescription
      : "";
  const performersRaw =
    Array.isArray(raw.performers) && raw.performers.length
      ? raw.performers
      : Array.isArray(raw.participants) && raw.participants.length
        ? raw.participants
      : defaultPerformers;
  const performers = performersRaw.map((item, index) =>
    normalizePerformerIdentity(item, index, buildPerformerLabel(index)),
  );
  const formRaw = Array.isArray(raw.form) ? raw.form : [];
  const form = performers.map((_, index) =>
    normalizePerformer(formRaw[index] ?? {}),
  );
  const sequencesRaw = Array.isArray(raw.sequences)
    ? raw.sequences
    : Array.isArray(raw.phrases)
      ? raw.phrases
      : [];
  const sequences = sequencesRaw.map((sequence, sequenceIndex) => {
    const stepsRaw = Array.isArray(sequence?.steps) ? sequence.steps : [];
    const steps = stepsRaw.map((step) => {
      const stepPerformersRaw = Array.isArray(step?.performers)
        ? step.performers
        : Array.isArray(step?.participants)
          ? step.participants
        : [];
      return createStepModel(
        {
          id: step?.id,
          lexicon: step?.lexicon,
          performers: performers.map((_, index) =>
            normalizePerformer(stepPerformersRaw[index] ?? {}),
          ),
        },
        {
          // Legacy compatibility: a step without lexicon is treated as v1.
          fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
        },
      );
    });
    return createSequenceModel({
      id: sequence?.id,
      name: sequence?.name,
      index: sequenceIndex,
      hiddenPerformerIndexes:
        sequence?.hiddenPerformerIndexes ?? sequence?.hiddenParticipantIndexes,
      performerCount: performers.length,
      steps,
    });
  });
  const performanceType = normalizePerformanceType(
    raw.performanceType ?? DEFAULT_PERFORMANCE_TYPE,
  );
  const performanceShareRole = normalizePerformanceShareRole(
    raw.performanceShareRole ?? DEFAULT_PERFORMANCE_SHARE_ROLE,
  );
  return {
    performanceId,
    performanceName,
    performanceDescription,
    performers,
    form,
    sequences,
    performanceType,
    performanceShareRole,
  };
}

export function toggleAttribute(current, value) {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

function buildNoteSummary(item) {
  return item.note ? `${item.note}` : "";
}

function formatDelimitedBits(value) {
  if (!value) return "";
  return value
    .split(" · ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(" · ");
}

function resolveTerm(type, value, resolveTermLabel) {
  const token = String(value ?? "").trim();
  if (!token) return "";
  if (typeof resolveTermLabel !== "function") return token;
  return resolveTermLabel(type, token) || token;
}

function resolveDelimitedBits(value, type, resolveTermLabel) {
  return formatDelimitedBits(value)
    .split(" · ")
    .map((entry) => resolveTerm(type, entry, resolveTermLabel))
    .filter(Boolean)
    .join(" · ");
}

function isDisplacementPreparationToken(value) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized === "displacements prep" || normalized === "deplacements prep";
}

function resolveMoveBits(item, resolveTermLabel) {
  const base = String(item?.move ?? "").trim();
  const details = Array.isArray(item?.moveDetails)
    ? item.moveDetails.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];
  if (base || details.length) {
    return [base, ...details]
      .filter(Boolean)
      .map((entry) => resolveTerm("deplacement", entry, resolveTermLabel))
      .join(" · ");
  }
  const fallback =
    String(item?.attackMove ?? "").trim() || String(item?.defendMove ?? "").trim();
  return resolveDelimitedBits(fallback, "deplacement", resolveTermLabel);
}

function buildPreparationPrefix(item, resolveTermLabel) {
  const action = String(item?.preparationAction ?? "").trim();
  if (!action) return "";
  return `${resolveTerm("action", action, resolveTermLabel)}`;
}

function buildAttackSummary(item, resolveTermLabel) {
  const preparationPrefix = buildPreparationPrefix(item, resolveTermLabel);
  const preparationTiming =
    String(item?.preparationTiming ?? "").trim().toLowerCase() === "after"
      ? "after"
      : "before";
  const actionDetails =
    Array.isArray(item.actionDetails) && !preparationPrefix
    ? item.actionDetails
    : [];
  const actionBitsFromDetails = actionDetails
    .map((detail) =>
      [
        resolveTerm("action", detail?.action, resolveTermLabel),
        resolveTerm("attaque_attribut", detail?.attribute, resolveTermLabel),
      ]
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .filter((entry) => !isDisplacementPreparationToken(entry))
    .join(" · ");
  const actionBitsFallback = [
    preparationPrefix || isDisplacementPreparationToken(item.action)
      ? ""
      : resolveTerm("action", item.action, resolveTermLabel),
    item.attackAttribute?.length
      ? item.attackAttribute
          .map((entry) => resolveTerm("attaque_attribut", entry, resolveTermLabel))
          .join(", ")
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const actionBits = actionBitsFromDetails || actionBitsFallback;
  const moveBits = resolveMoveBits(item, resolveTermLabel);
  const pieces = [
    preparationPrefix && preparationTiming === "before" ? `${preparationPrefix} ·` : "",
    resolveTerm("offensive", item.offensive, resolveTermLabel),
    actionBits ? `${actionBits}` : "",
    item.target ? `sur ${resolveTerm("target", item.target, resolveTermLabel)}` : "",
    moveBits ? `avec ${moveBits}` : "",
    preparationPrefix && preparationTiming === "after" ? `· ${preparationPrefix}` : "",
    item.note ? `(${item.note})` : "",
  ];
  return pieces.filter(Boolean).join(" ");
}

function buildPreparationSummary(item, resolveTermLabel) {
  const moveBits = resolveMoveBits(item, resolveTermLabel);
  const pieces = [
    "déplacement",
    moveBits ? `en ${moveBits}` : "",
    item.note ? `(${item.note})` : "",
  ];
  return pieces.filter(Boolean).join(" ");
}

function buildDefenseSummary(item, resolveTermLabel) {
  const preparationPrefix = buildPreparationPrefix(item, resolveTermLabel);
  const preparationTiming =
    String(item?.preparationTiming ?? "").trim().toLowerCase() === "after"
      ? "after"
      : "before";
  const defenseDetails = Array.isArray(item.defenseDetails)
    ? item.defenseDetails
    : [];
  const defenseBitsFromDetails = defenseDetails
    .map((detail) => {
      const parts = [];
      if (detail?.defense) {
        parts.push(resolveTerm("defensive", detail.defense, resolveTermLabel));
      }
      if (detail?.position) {
        parts.push(
          `de ${resolveTerm("parade_numero", detail.position, resolveTermLabel)}`,
        );
      }
      if (detail?.attribute) {
        parts.push(
          resolveDelimitedBits(
            detail.attribute,
            "parade_attribut",
            resolveTermLabel,
          ),
        );
      }
      return parts.join(" ");
    })
    .filter(Boolean)
    .join(" · ");
  const paradeBits = [
    resolveTerm("parade_numero", item.paradeNumber, resolveTermLabel),
    resolveDelimitedBits(item.paradeAttribute, "parade_attribut", resolveTermLabel),
  ]
    .filter(Boolean)
    .join(" ");
  const defenseBitsFallback = [
    resolveTerm("defensive", item.defense, resolveTermLabel),
    paradeBits ? `de ${paradeBits}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const defenseBits = defenseBitsFromDetails || defenseBitsFallback;
  const moveBits = resolveMoveBits(item, resolveTermLabel);
  const pieces = [
    preparationPrefix && preparationTiming === "before" ? `${preparationPrefix} ·` : "",
    defenseBits,
    moveBits ? `en ${moveBits}` : "",
    preparationPrefix && preparationTiming === "after" ? `· ${preparationPrefix}` : "",
    item.note ? `(${item.note})` : "",
  ];
  return pieces.filter(Boolean).join(" ");
}

function buildCombatSummary(item, resolveTermLabel) {
  if (item.role === "attack") {
    if (item.noteOverrides) return buildNoteSummary(item);
    return buildAttackSummary(item, resolveTermLabel);
  }

  if (item.role === "movement" || item.role === "preparation") {
    if (item.noteOverrides) return buildNoteSummary(item);
    return buildPreparationSummary(item, resolveTermLabel);
  }

  if (item.role === "defense") {
    if (item.noteOverrides) return buildNoteSummary(item);
    return buildDefenseSummary(item, resolveTermLabel);
  }

  if (item.note) return `${item.note}`;
  return "";
}

export function buildSummaryLine(item, resolveTermLabel = null) {
  if (item.mode === "note") {
    return buildNoteSummary(item);
  }

  return buildCombatSummary(item, resolveTermLabel);
}

export function buildSummaryLines(item, resolveTermLabel = null) {
  if (item.mode === "note") {
    return [buildNoteSummary(item)].filter(Boolean);
  }

  return [buildCombatSummary(item, resolveTermLabel)].filter(Boolean);
}
