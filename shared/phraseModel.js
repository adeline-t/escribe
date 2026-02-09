import { normalizeHiddenParticipantIndexes } from "./combatModel.js";
import { createStepModel, LEGACY_STEP_LEXICON_KEY } from "./stepModel.js";

export const DEFAULT_PHRASE_PREFIX = "Phrase";

export function buildPhraseName(index = 0, prefix = DEFAULT_PHRASE_PREFIX) {
  return `${prefix} ${index + 1}`;
}

export function resolvePhraseName(name, index = 0, prefix = DEFAULT_PHRASE_PREFIX) {
  if (typeof name === "string" && name.trim()) return name;
  return buildPhraseName(index, prefix);
}

export function createPhraseModel({
  id,
  name,
  index = 0,
  steps,
  hiddenParticipantIndexes,
  participantCount = 0,
  stepFallbackLexicon = LEGACY_STEP_LEXICON_KEY,
} = {}) {
  const stepList = Array.isArray(steps) ? steps : [];
  return {
    id: id ?? crypto.randomUUID(),
    name: resolvePhraseName(name, index),
    hiddenParticipantIndexes: normalizeHiddenParticipantIndexes(
      hiddenParticipantIndexes,
      participantCount,
    ),
    steps: stepList.map((step) =>
      createStepModel(step, {
        fallbackLexicon: stepFallbackLexicon,
        participantCount,
      }),
    ),
  };
}
