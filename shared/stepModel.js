export const DEFAULT_STEP_LEXICON_KEY = "classic-v2";
export const LEGACY_STEP_LEXICON_KEY = "classic";
export const STEP_PERFORMER_MODES = ["combat", "note", "choreography"];
export const STEP_PERFORMER_ROLES = ["none", "attack", "defense", "preparation"];

// Canonical structure for one performer inside a step.
export const DEFAULT_STEP_PERFORMER = Object.freeze({
  mode: "combat",
  role: "attack",
  preparationAction: "",
  preparationTiming: "before",
  offensive: "",
  action: "",
  actionDetails: [],
  target: "",
  attackMove: "",
  move: "",
  moveDetails: [],
  attackAttribute: [],
  defense: "",
  defenseDetails: [],
  paradeNumber: "",
  paradeAttribute: "",
  defendMove: "",
  chorePhase: "",
  note: "",
  noteOverrides: false,
  // Snapshot of selected lexicon terms for resilient persistence.
  // Each entry: { field, lexicon_id, name }.
  lexiconRefs: [],
});

function normalizeActionDetails(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((detail) => ({
    action: detail?.action ?? "",
    attribute: detail?.attribute ?? "",
  }));
}

function normalizeDefenseDetails(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((detail) => ({
    defense: detail?.defense ?? "",
    position: detail?.position ?? "",
    attribute: detail?.attribute ?? "",
  }));
}

function normalizeStringArray(raw) {
  return Array.isArray(raw) ? raw : [];
}

function normalizePreparationTiming(value) {
  const timing = String(value ?? "").trim().toLowerCase();
  return timing === "after" ? "after" : "before";
}

function normalizeLexiconRefs(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      field: item?.field ?? "",
      lexicon_id: item?.lexicon_id ?? null,
      name: item?.name ?? "",
    }))
    .filter((item) => item.field || item.name);
}

function normalizeStepMode(mode) {
  if (mode === "choregraphie") return "choreography";
  return mode;
}

export function createStepPerformerModel(overrides = {}) {
  const normalizedMode = normalizeStepMode(overrides?.mode);
  const mode = STEP_PERFORMER_MODES.includes(normalizedMode)
    ? normalizedMode
    : DEFAULT_STEP_PERFORMER.mode;
  const role = STEP_PERFORMER_ROLES.includes(overrides?.role)
    ? overrides.role
    : DEFAULT_STEP_PERFORMER.role;

  return {
    ...DEFAULT_STEP_PERFORMER,
    ...(overrides || {}),
    mode,
    role,
    actionDetails: normalizeActionDetails(overrides?.actionDetails),
    defenseDetails: normalizeDefenseDetails(overrides?.defenseDetails),
    attackAttribute: normalizeStringArray(overrides?.attackAttribute),
    move: typeof overrides?.move === "string" ? overrides.move : "",
    moveDetails: normalizeStringArray(overrides?.moveDetails),
    preparationAction:
      typeof overrides?.preparationAction === "string"
        ? overrides.preparationAction
        : "",
    preparationTiming: normalizePreparationTiming(overrides?.preparationTiming),
    noteOverrides: Boolean(overrides?.noteOverrides),
    lexiconRefs: normalizeLexiconRefs(overrides?.lexiconRefs),
  };
}

export function createInsertedStepPerformerModel(overrides = {}) {
  return createStepPerformerModel({
    mode: "note",
    role: "none",
    noteOverrides: true,
    ...(overrides || {}),
  });
}

export function normalizeStepPerformers(
  performers,
  { performerCount = null, fillPerformer } = {},
) {
  const normalized = Array.isArray(performers)
    ? performers.map((item) => createStepPerformerModel(item))
    : [];

  if (!Number.isInteger(performerCount) || performerCount < 0) {
    return normalized;
  }

  while (normalized.length < performerCount) {
    if (typeof fillPerformer === "function") {
      normalized.push(createStepPerformerModel(fillPerformer(normalized.length)));
      continue;
    }
    normalized.push(createStepPerformerModel());
  }

  if (normalized.length > performerCount) {
    return normalized.slice(0, performerCount);
  }
  return normalized;
}

export function resolveStepLexiconKey(
  lexicon,
  { fallbackLexicon = DEFAULT_STEP_LEXICON_KEY } = {},
) {
  if (typeof lexicon === "string" && lexicon.trim()) return lexicon;
  return fallbackLexicon;
}

export function createStepModel(
  { id, lexicon, performers, participants } = {},
  {
    fallbackLexicon = DEFAULT_STEP_LEXICON_KEY,
    performerCount = null,
    participantCount = null,
    fillPerformer,
    fillParticipant,
  } = {},
) {
  const resolvedPerformers = performers ?? participants;
  const resolvedPerformerCount = performerCount ?? participantCount;
  const resolvedFillPerformer = fillPerformer ?? fillParticipant;
  const normalizedPerformers = normalizeStepPerformers(resolvedPerformers, {
    performerCount: resolvedPerformerCount,
    fillPerformer: resolvedFillPerformer,
  });
  return {
    id: id ?? crypto.randomUUID(),
    lexicon: resolveStepLexiconKey(lexicon, { fallbackLexicon }),
    performers: normalizedPerformers,
    // Legacy compatibility during participant -> performer migration.
    participants: normalizedPerformers,
  };
}

// Legacy aliases kept while the codebase is migrated.
export const STEP_PARTICIPANT_MODES = STEP_PERFORMER_MODES;
export const STEP_PARTICIPANT_ROLES = STEP_PERFORMER_ROLES;
export const DEFAULT_STEP_PARTICIPANT = DEFAULT_STEP_PERFORMER;
export const createStepParticipantModel = createStepPerformerModel;
export const createInsertedStepParticipantModel = createInsertedStepPerformerModel;
export const normalizeStepParticipants = normalizeStepPerformers;
