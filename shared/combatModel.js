export const DEFAULT_COMBAT_NAME = "Combat sans nom";
export const DEFAULT_COMBAT_DESCRIPTION = "";
export const DEFAULT_COMBAT_TYPE = "classic";
export const DEFAULT_COMBAT_SHARE_ROLE = "read";
export const OWNER_COMBAT_SHARE_ROLE = "owner";
export const DEFAULT_STEP_LEXICON_KEY = "classic-v2";

export const PARTICIPANT_MODES = ["combat", "note", "choregraphie"];
export const PARTICIPANT_ROLES = [
  "none",
  "attack",
  "defense",
  "preparation",
];

export const DEFAULT_COMBAT_PARTICIPANTS = [
  { name: "A", weapon: "" },
  { name: "B", weapon: "" },
];

export function createParticipantIdentity(overrides = {}) {
  return {
    name: typeof overrides?.name === "string" ? overrides.name : "",
    weapon: typeof overrides?.weapon === "string" ? overrides.weapon : "",
  };
}

export function createDefaultParticipants() {
  return DEFAULT_COMBAT_PARTICIPANTS.map((participant) =>
    createParticipantIdentity(participant),
  );
}

export function createEmptyParticipantState(overrides = {}) {
  const base = {
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
  };
  return { ...base, ...(overrides || {}) };
}

export function createEmptyInsertedStepParticipant(overrides = {}) {
  return createEmptyParticipantState({
    mode: "note",
    role: "none",
    noteOverrides: true,
    ...(overrides || {}),
  });
}

export function normalizeCombatType(type) {
  return type === "sabre-laser" ? "sabre-laser" : DEFAULT_COMBAT_TYPE;
}

export function normalizeCombatShareRole(role) {
  if (typeof role === "string" && role.trim()) return role;
  return DEFAULT_COMBAT_SHARE_ROLE;
}

export function normalizeHiddenParticipantIndexes(raw, participantCount) {
  const max = Math.max(0, Number(participantCount) || 0);
  if (!Array.isArray(raw) || max <= 0) return [];
  const out = [];
  const seen = new Set();
  for (const value of raw) {
    const index = Number(value);
    if (!Number.isInteger(index)) continue;
    if (index < 0 || index >= max) continue;
    if (seen.has(index)) continue;
    seen.add(index);
    out.push(index);
  }
  return out.sort((a, b) => a - b);
}

export function createStepModel({ id, lexicon, participants } = {}) {
  return {
    id: id ?? crypto.randomUUID(),
    lexicon:
      typeof lexicon === "string" && lexicon.trim()
        ? lexicon
        : DEFAULT_STEP_LEXICON_KEY,
    participants: Array.isArray(participants) ? participants : [],
  };
}

export function createPhraseModel({
  id,
  name,
  index = 0,
  steps,
  hiddenParticipantIndexes,
  participantCount = 0,
} = {}) {
  const phraseName =
    typeof name === "string" && name.trim() ? name : `Phrase ${index + 1}`;
  return {
    id: id ?? crypto.randomUUID(),
    name: phraseName,
    hiddenParticipantIndexes: normalizeHiddenParticipantIndexes(
      hiddenParticipantIndexes,
      participantCount,
    ),
    steps: Array.isArray(steps) ? steps : [],
  };
}
