import { normalizeHiddenPerformerIndexes } from "./performanceModel.js";
import { createStepModel, LEGACY_STEP_LEXICON_KEY } from "./stepModel.js";

export const DEFAULT_SEQUENCE_PREFIX = "Phrase";

export function buildSequenceName(
  index = 0,
  prefix = DEFAULT_SEQUENCE_PREFIX,
) {
  return `${prefix} ${index + 1}`;
}

export function resolveSequenceName(
  name,
  index = 0,
  prefix = DEFAULT_SEQUENCE_PREFIX,
) {
  if (typeof name === "string" && name.trim()) return name;
  return buildSequenceName(index, prefix);
}

export function createSequenceModel({
  id,
  name,
  index = 0,
  steps,
  hiddenPerformerIndexes,
  hiddenParticipantIndexes,
  performerCount = 0,
  participantCount = 0,
  stepFallbackLexicon = LEGACY_STEP_LEXICON_KEY,
} = {}) {
  const resolvedPerformerCount = performerCount || participantCount;
  const resolvedHiddenPerformerIndexes =
    hiddenPerformerIndexes ?? hiddenParticipantIndexes;
  const stepList = Array.isArray(steps) ? steps : [];
  const normalizedHiddenPerformerIndexes = normalizeHiddenPerformerIndexes(
    resolvedHiddenPerformerIndexes,
    resolvedPerformerCount,
  );
  return {
    id: id ?? crypto.randomUUID(),
    name: resolveSequenceName(name, index),
    hiddenPerformerIndexes: normalizedHiddenPerformerIndexes,
    // Legacy compatibility during participant -> performer migration.
    hiddenParticipantIndexes: normalizedHiddenPerformerIndexes,
    steps: stepList.map((step) =>
      createStepModel(step, {
        fallbackLexicon: stepFallbackLexicon,
        performerCount: resolvedPerformerCount,
      }),
    ),
  };
}
