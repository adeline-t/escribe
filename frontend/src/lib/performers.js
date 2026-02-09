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
  return item.note ? `${item.note}` : "note à compléter";
}

function formatDelimitedBits(value) {
  if (!value) return "";
  return value
    .split(" · ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(" · ");
}

function buildChoreographySummary(item, { includeNoteWhenEmpty }) {
  const note = item.note ? ` (${item.note})` : "";
  if (item.chorePhase) return `${item.chorePhase}${note}`;
  if (item.note && includeNoteWhenEmpty) return `${item.note}`;
  return "chorégraphie";
}

function buildAttackSummary(item) {
  const actionDetails = Array.isArray(item.actionDetails)
    ? item.actionDetails
    : [];
  const actionBitsFromDetails = actionDetails
    .map((detail) =>
      [detail?.action, detail?.attribute].filter(Boolean).join(" "),
    )
    .filter(Boolean)
    .join(" · ");
  const actionBitsFallback = [
    item.action,
    item.attackAttribute?.length ? item.attackAttribute.join(", ") : "",
  ]
    .filter(Boolean)
    .join(" ");
  const actionBits = actionBitsFromDetails || actionBitsFallback;
  const moveBits = formatDelimitedBits(item.attackMove);
  const pieces = [
    item.offensive,
    actionBits ? `en ${actionBits}` : "",
    item.target ? `sur ${item.target}` : "",
    moveBits ? `avec ${moveBits}` : "",
    item.note ? `(${item.note})` : "",
  ];
  return pieces.filter(Boolean).join(" ");
}

function buildPreparationSummary(item) {
  const actionDetails = Array.isArray(item.actionDetails)
    ? item.actionDetails
    : [];
  const actionBitsFromDetails = actionDetails
    .map((detail) => detail?.action)
    .filter(Boolean)
    .join(" · ");
  const actionBitsFallback = [item.action].filter(Boolean).join(" ");
  const actionBits = actionBitsFromDetails || actionBitsFallback;
  const position = actionDetails[0]?.attribute ?? "";
  const complements = Array.isArray(item.attackAttribute)
    ? item.attackAttribute
    : [];
  const positionBits = [position, ...complements.filter((entry) => entry !== position)]
    .filter(Boolean)
    .join(" · ");
  const pieces = [
    "préparation",
    actionBits ? actionBits : "",
    item.target ? `sur ${item.target}` : "",
    positionBits ? `en ${positionBits}` : "",
    item.note ? `(${item.note})` : "",
  ];
  return pieces.filter(Boolean).join(" ");
}

function buildDefenseSummary(item) {
  const defenseDetails = Array.isArray(item.defenseDetails)
    ? item.defenseDetails
    : [];
  const defenseBitsFromDetails = defenseDetails
    .map((detail) => {
      const parts = [];
      if (detail?.defense) parts.push(detail.defense);
      if (detail?.position) parts.push(`de ${detail.position}`);
      if (detail?.attribute) parts.push(detail.attribute);
      return parts.join(" ");
    })
    .filter(Boolean)
    .join(" · ");
  const paradeBits = [item.paradeNumber, item.paradeAttribute]
    .filter(Boolean)
    .join(" ");
  const defenseBitsFallback = [
    item.defense,
    paradeBits ? `de ${paradeBits}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const defenseBits = defenseBitsFromDetails || defenseBitsFallback;
  const moveBits = formatDelimitedBits(item.defendMove);
  const pieces = [
    defenseBits,
    moveBits ? `en ${moveBits}` : "",
    item.note ? `(${item.note})` : "",
  ];
  return pieces.filter(Boolean).join(" ");
}

function buildCombatSummary(item) {
  if (item.role === "attack") {
    if (item.noteOverrides) return buildNoteSummary(item);
    return buildAttackSummary(item);
  }

  if (item.role === "preparation") {
    if (item.noteOverrides) return buildNoteSummary(item);
    return buildPreparationSummary(item);
  }

  if (item.role === "defense") {
    if (item.noteOverrides) return buildNoteSummary(item);
    return buildDefenseSummary(item);
  }

  if (item.note) return `${item.note}`;
  return "inactif";
}

export function buildSummaryLine(item) {
  if (item.mode === "choreography") {
    return buildChoreographySummary(item, { includeNoteWhenEmpty: true });
  }

  if (item.mode === "note") {
    return buildNoteSummary(item);
  }

  return buildCombatSummary(item);
}

export function buildSummaryLines(item) {
  if (item.mode === "choreography") {
    return [buildChoreographySummary(item, { includeNoteWhenEmpty: false })];
  }

  if (item.mode === "note") {
    return [buildNoteSummary(item)];
  }

  return [buildCombatSummary(item)].filter(Boolean);
}
