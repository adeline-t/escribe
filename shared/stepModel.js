export const DEFAULT_STEP_LEXICON_KEY = "classic-v2";
export const LEGACY_STEP_LEXICON_KEY = "classic";
export const STEP_PARTICIPANT_MODES = ["combat", "note", "choregraphie"];
export const STEP_PARTICIPANT_ROLES = ["none", "attack", "defense", "preparation"];

// Canonical structure for one participant inside a step.
export const DEFAULT_STEP_PARTICIPANT = Object.freeze({
  mode: "combat",
  role: "attack",
  offensive: "",
  action: "",
  actionDetails: [],
  target: "",
  attackMove: "",
  attackAttribute: [],
  defense: "",
  defenseDetails: [],
  paradeNumber: "",
  paradeAttribute: "",
  defendMove: "",
  chorePhase: "",
  note: "",
  noteOverrides: false,
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

export function createStepParticipantModel(overrides = {}) {
  const mode = STEP_PARTICIPANT_MODES.includes(overrides?.mode)
    ? overrides.mode
    : DEFAULT_STEP_PARTICIPANT.mode;
  const role = STEP_PARTICIPANT_ROLES.includes(overrides?.role)
    ? overrides.role
    : DEFAULT_STEP_PARTICIPANT.role;

  return {
    ...DEFAULT_STEP_PARTICIPANT,
    ...(overrides || {}),
    mode,
    role,
    actionDetails: normalizeActionDetails(overrides?.actionDetails),
    defenseDetails: normalizeDefenseDetails(overrides?.defenseDetails),
    attackAttribute: normalizeStringArray(overrides?.attackAttribute),
    noteOverrides: Boolean(overrides?.noteOverrides),
  };
}

export function createInsertedStepParticipantModel(overrides = {}) {
  return createStepParticipantModel({
    mode: "note",
    role: "none",
    noteOverrides: true,
    ...(overrides || {}),
  });
}

export function normalizeStepParticipants(
  participants,
  { participantCount = null, fillParticipant } = {},
) {
  const normalized = Array.isArray(participants)
    ? participants.map((item) => createStepParticipantModel(item))
    : [];

  if (!Number.isInteger(participantCount) || participantCount < 0) {
    return normalized;
  }

  while (normalized.length < participantCount) {
    if (typeof fillParticipant === "function") {
      normalized.push(createStepParticipantModel(fillParticipant(normalized.length)));
      continue;
    }
    normalized.push(createStepParticipantModel());
  }

  if (normalized.length > participantCount) {
    return normalized.slice(0, participantCount);
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
  { id, lexicon, participants } = {},
  {
    fallbackLexicon = DEFAULT_STEP_LEXICON_KEY,
    participantCount = null,
    fillParticipant,
  } = {},
) {
  return {
    id: id ?? crypto.randomUUID(),
    lexicon: resolveStepLexiconKey(lexicon, { fallbackLexicon }),
    participants: normalizeStepParticipants(participants, {
      participantCount,
      fillParticipant,
    }),
  };
}
