import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PERFORMERS } from "../lib/lexicon.js";
import {
  labelForPerformer,
} from "../lib/performers.js";
import { useDebouncedStateSave } from "./useDebouncedStateSave.js";
import { hasPerformerStepContent } from "../lib/stepContent.js";
import {
  createPerformerIdentity,
  DEFAULT_PERFORMANCE_NAME,
  DEFAULT_PERFORMANCE_SHARE_ROLE,
  DEFAULT_PERFORMANCE_TYPE,
  normalizePerformanceType,
  normalizeHiddenPerformerIndexes,
  OWNER_PERFORMANCE_SHARE_ROLE,
} from "../../../shared/performanceModel.js";
import { buildSequenceName, createSequenceModel } from "../../../shared/sequenceModel.js";
import {
  createInsertedStepPerformerModel,
  createStepPerformerModel,
  createStepModel,
  DEFAULT_STEP_LEXICON_KEY,
  resolveStepLexiconKey,
} from "../../../shared/stepModel.js";

function buildEmptyForm(performers) {
  return performers.map(() => createStepPerformerModel());
}

export function usePerformanceStateManager({ isSaveEnabled, saveState } = {}) {
  // Single source of truth for performance editing (performers, sequences, current step).
  const [performers, setPerformers] = useState(() =>
    DEFAULT_PERFORMERS.map((performer) => ({ ...performer })),
  );
  const [sequences, setSequences] = useState([]);
  const [activeSequenceId, setActiveSequenceId] = useState(null);
  const [form, setForm] = useState(
    DEFAULT_PERFORMERS.map(() => createStepPerformerModel()),
  );
  const [editingStepId, setEditingStepId] = useState(null);
  const [insertStepIndex, setInsertStepIndex] = useState(null);
  const [insertionMode, setInsertionMode] = useState(false);
  const [deletionMode, setDeletionMode] = useState(false);
  const [performanceId, setPerformanceId] = useState(null);
  const [performanceName, setPerformanceName] = useState(DEFAULT_PERFORMANCE_NAME);
  const [performanceDescription, setPerformanceDescription] = useState("");
  const [performanceUpdatedAt, setPerformanceUpdatedAt] = useState(null);
  const [performanceType, setPerformanceType] = useState(DEFAULT_PERFORMANCE_TYPE);
  const [performanceShareRole, setPerformanceShareRole] = useState(
    DEFAULT_PERFORMANCE_SHARE_ROLE,
  );
  const [stepLexiconKey, setStepLexiconKey] = useState(DEFAULT_STEP_LEXICON_KEY);
  const [isHydrated, setIsHydrated] = useState(false);

  const performerLabels = useMemo(
    () => performers.map((name, index) => labelForPerformer(name, index)),
    [performers],
  );

  const activeSequence = useMemo(
    () => sequences.find((sequence) => sequence.id === activeSequenceId) ?? null,
    [sequences, activeSequenceId],
  );

  function resetInteractionState({ resetLexicon = true } = {}) {
    // Reset only the editing context (does not touch persisted performance data).
    setEditingStepId(null);
    setInsertStepIndex(null);
    setInsertionMode(false);
    setDeletionMode(false);
    if (resetLexicon) {
      setStepLexiconKey(DEFAULT_STEP_LEXICON_KEY);
    }
  }

  function applyNormalizedPerformanceState(normalized, { fallbackPerformanceId = null } = {}) {
    // Hydrate local state from a normalized payload returned by the API.
    if (!normalized) return;
    setPerformers(normalized.performers);
    setSequences(normalized.sequences ?? []);
    setForm(normalized.form);
    setPerformanceId(normalized.performanceId ?? fallbackPerformanceId ?? null);
    setPerformanceName(normalized.performanceName ?? DEFAULT_PERFORMANCE_NAME);
    setPerformanceDescription(normalized.performanceDescription ?? "");
    setPerformanceUpdatedAt(normalized.performanceUpdatedAt ?? null);
    setPerformanceType(normalizePerformanceType(normalized.performanceType));
    setPerformanceShareRole(normalized.performanceShareRole ?? DEFAULT_PERFORMANCE_SHARE_ROLE);
    setActiveSequenceId(normalized.sequences?.[0]?.id ?? null);
    resetInteractionState({ resetLexicon: true });
  }

  function initializeNewPerformance({
    id,
    name,
    description,
    type,
    performers: nextPerformers,
  }) {
    // Initialize a new performance in client state right after DB creation.
      const resolvedPerformers = Array.isArray(nextPerformers)
      ? nextPerformers
      : DEFAULT_PERFORMERS.map((performer) => ({ ...performer }));
    const initialSequence = createSequenceModel({
      index: 0,
      name: buildSequenceName(0),
      steps: [],
      hiddenPerformerIndexes: [],
      performerCount: resolvedPerformers.length,
    });

    setPerformanceId(id ?? null);
    setPerformanceName(name ?? DEFAULT_PERFORMANCE_NAME);
    setPerformanceDescription(description ?? "");
    setPerformanceUpdatedAt(null);
    setPerformanceType(normalizePerformanceType(type));
    setPerformanceShareRole(OWNER_PERFORMANCE_SHARE_ROLE);
    setPerformers(resolvedPerformers);
    setSequences([initialSequence]);
    setActiveSequenceId(initialSequence.id);
    setForm(buildEmptyForm(resolvedPerformers));
    resetInteractionState({ resetLexicon: true });
  }

  function markHydrated(value = true) {
    setIsHydrated(Boolean(value));
  }

  useDebouncedStateSave({
    enabled: isHydrated && Boolean(isSaveEnabled) && typeof saveState === "function",
    state: {
      performanceId,
      performanceName,
      performanceDescription,
      performanceUpdatedAt,
      performanceType,
      performers,
      sequences,
      form,
    },
    delay: 400,
    // Automatic persistence of the performance draft.
    onSave: (state) => {
      const hasExistingPerformance = Number.isFinite(Number(state?.performanceId));
      const hasEmptySequences =
        Array.isArray(state?.sequences) && state.sequences.length === 0;
      // Guardrail: avoid wiping existing sequences when local state is temporarily empty.
      if (hasExistingPerformance && hasEmptySequences) {
        return { performanceId: state.performanceId, skipped: true };
      }
      return Promise.resolve(saveState(state)).then((result) => {
        if (!result?.ok) {
          const error = new Error(result?.payload?.error || "state_save_failed");
          error.status = result?.response?.status;
          error.payload = result?.payload;
          throw error;
        }
        return result;
      });
    },
    onSaved: (result) => {
      const savedId = result?.performanceId ?? null;
      if (savedId) {
        setPerformanceId((prev) => prev ?? savedId);
      }
      const updatedAt =
        typeof result?.performanceUpdatedAt === "string" &&
        result.performanceUpdatedAt.trim()
          ? result.performanceUpdatedAt.trim()
          : null;
      if (updatedAt) {
        setPerformanceUpdatedAt(updatedAt);
      }
    },
    onError: (error) => {
      console.warn("State save skipped:", error);
    },
  });

  function updatePerformerName(index, value) {
    setPerformers((prev) => {
      const next = [...prev];
      const current =
        next[index] && typeof next[index] === "object"
          ? next[index]
          : createPerformerIdentity();
      next[index] = { ...current, name: value };
      return next;
    });
  }

  function updatePerformerWeapon(index, value) {
    setPerformers((prev) => {
      const next = [...prev];
      const current =
        next[index] && typeof next[index] === "object"
          ? next[index]
          : createPerformerIdentity();
      next[index] = { ...current, weapon: value };
      return next;
    });
  }

  function updatePerformerCount(value) {
    const count = Number(value);
    setPerformers((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i += 1) {
          next.push(createPerformerIdentity());
        }
      }
      if (count < next.length) {
        next.splice(count);
      }
      return next;
    });

    setForm((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i += 1) {
          next.push(createStepPerformerModel());
        }
      }
      if (count < next.length) {
        next.splice(count);
      }
      return next;
    });

    setSequences((prev) =>
      prev.map((sequence) => ({
        ...sequence,
        hiddenPerformerIndexes: normalizeHiddenPerformerIndexes(
          sequence?.hiddenPerformerIndexes,
          count,
        ),
      })),
    );
  }

  function updateForm(index, patch) {
    setForm((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function updateStepPerformer(stepId, performerIndex, updates) {
    setSequences((prev) =>
      prev.map((sequence) => {
        if (sequence.id !== activeSequenceId) return sequence;
        return {
          ...sequence,
          steps: sequence.steps.map((step) => {
            if (step.id !== stepId) return step;
            return {
              ...step,
              performers: step.performers.map((item, index) =>
                index === performerIndex ? { ...item, ...updates } : item,
              ),
            };
          }),
        };
      }),
    );
  }

  function updateStepLexicon(stepId, lexiconKey) {
    if (!lexiconKey) return;
    setSequences((prev) =>
      prev.map((sequence) => {
        if (sequence.id !== activeSequenceId) return sequence;
        return {
          ...sequence,
          steps: sequence.steps.map((step) =>
            step.id === stepId ? { ...step, lexicon: lexiconKey } : step,
          ),
        };
      }),
    );
  }

  function resetForm() {
    setForm(buildEmptyForm(performers));
    resetInteractionState({ resetLexicon: true });
  }

  function addStep() {
    const hasContent = form.some((item) => hasPerformerStepContent(item));
    if (!hasContent || !activeSequenceId) return;

    if (editingStepId) {
      setSequences((prev) =>
        prev.map((sequence) => {
          if (sequence.id !== activeSequenceId) return sequence;
          return {
            ...sequence,
            steps: sequence.steps.map((step) =>
              step.id === editingStepId
                ? {
                    ...step,
                    lexicon: stepLexiconKey,
                    performers: form.map((item) => ({ ...item })),
                  }
                : step,
            ),
          };
        }),
      );
      setForm(buildEmptyForm(performers));
      resetInteractionState({ resetLexicon: true });
      return;
    }

    const step = createStepModel({
      lexicon: stepLexiconKey,
      performers: form.map((item) => ({ ...item })),
    });

    setSequences((prev) =>
      prev.map((sequence) => {
        if (sequence.id !== activeSequenceId) return sequence;
        if (insertStepIndex == null) {
          return { ...sequence, steps: [...sequence.steps, step] };
        }
        const nextSteps = [...sequence.steps];
        const index = Math.max(0, Math.min(insertStepIndex, nextSteps.length));
        nextSteps.splice(index, 0, step);
        return { ...sequence, steps: nextSteps };
      }),
    );

    setForm(buildEmptyForm(performers));
    resetInteractionState({ resetLexicon: true });
  }

  function insertEmptyStep(index) {
    if (!activeSequenceId) return;
    const step = createStepModel({
      lexicon: stepLexiconKey,
      performers: performers.map(() =>
        createInsertedStepPerformerModel(),
      ),
    });
    setSequences((prev) =>
      prev.map((sequence) => {
        if (sequence.id !== activeSequenceId) return sequence;
        const nextSteps = [...sequence.steps];
        const insertAt = Math.max(0, Math.min(index, nextSteps.length));
        nextSteps.splice(insertAt, 0, step);
        return { ...sequence, steps: nextSteps };
      }),
    );
  }

  function removeStep(id) {
    if (!activeSequenceId) return;
    setSequences((prev) =>
      prev.map((sequence) =>
        sequence.id === activeSequenceId
          ? { ...sequence, steps: sequence.steps.filter((step) => step.id !== id) }
          : sequence,
      ),
    );
    if (editingStepId === id) {
      setEditingStepId(null);
    }
    resetInteractionState({ resetLexicon: true });
  }

  function editStep(id) {
    if (!activeSequenceId) return;
    setEditingStepId(id);
    setInsertStepIndex(null);
    setInsertionMode(false);
    setDeletionMode(false);
  }

  useEffect(() => {
    if (!editingStepId || !activeSequenceId) return;
    const sequence = sequences.find((item) => item.id === activeSequenceId);
    const step = sequence?.steps?.find((item) => item.id === editingStepId);
    if (!step) return;

    setStepLexiconKey(
      resolveStepLexiconKey(step?.lexicon),
    );
    setForm(
      step.performers.map((item) => ({
        ...createStepPerformerModel(),
        ...item,
        attackAttribute: Array.isArray(item.attackAttribute)
          ? item.attackAttribute
          : [],
      })),
    );
  }, [editingStepId, activeSequenceId, sequences]);

  function cancelEditStep() {
    setForm(buildEmptyForm(performers));
    resetInteractionState({ resetLexicon: true });
  }

  function selectSequence(id) {
    setActiveSequenceId(id);
    setForm(buildEmptyForm(performers));
    resetInteractionState({ resetLexicon: true });
  }

  function toggleSequencePerformerVisibility(sequenceId, performerIndex) {
    const index = Number(performerIndex);
    if (!Number.isInteger(index)) return;
    setSequences((prev) =>
      prev.map((sequence) => {
        if (sequence.id !== sequenceId) return sequence;
        const current = normalizeHiddenPerformerIndexes(
          sequence?.hiddenPerformerIndexes,
          performers.length,
        );
        const nextSet = new Set(current);
        if (nextSet.has(index)) {
          nextSet.delete(index);
        } else {
          const visibleCount = Math.max(0, performers.length - nextSet.size);
          if (visibleCount <= 1) return sequence;
          nextSet.add(index);
        }
        return {
          ...sequence,
          hiddenPerformerIndexes: [...nextSet].sort((a, b) => a - b),
        };
      }),
    );
  }

  function createSequence() {
    const nextNumber = sequences.length + 1;
    const newSequence = createSequenceModel({
      index: nextNumber - 1,
      name: buildSequenceName(nextNumber - 1),
      hiddenPerformerIndexes: [],
      performerCount: performers.length,
      steps: [],
    });
    setSequences((prev) => [...prev, newSequence]);
    setActiveSequenceId(newSequence.id);
    setForm(buildEmptyForm(performers));
    resetInteractionState({ resetLexicon: true });
  }

  function renameSequence(id, name) {
    setSequences((prev) =>
      prev.map((sequence) => (sequence.id === id ? { ...sequence, name } : sequence)),
    );
  }

  function moveSequence(id, direction) {
    setSequences((prev) => {
      const index = prev.findIndex((sequence) => sequence.id === id);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      return copy;
    });
  }

  function moveSequenceToIndex(id, targetIndex) {
    setSequences((prev) => {
      const index = prev.findIndex((sequence) => sequence.id === id);
      if (index < 0) return prev;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      if (index === targetIndex) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  }

  function deleteSequence(id) {
    setSequences((prev) => prev.filter((sequence) => sequence.id !== id));
    if (activeSequenceId === id) {
      const remaining = sequences.filter((sequence) => sequence.id !== id);
      setActiveSequenceId(remaining[0]?.id ?? null);
      setForm(buildEmptyForm(performers));
      resetInteractionState({ resetLexicon: true });
    }
  }

  function startInsertStep(index, { resetLexicon = false } = {}) {
    // Prepare insertion of a step at an exact index.
    setInsertStepIndex(index);
    setEditingStepId(null);
    setForm(buildEmptyForm(performers));
    if (resetLexicon) {
      setStepLexiconKey(DEFAULT_STEP_LEXICON_KEY);
    }
    setInsertionMode(false);
    setDeletionMode(false);
  }

  function toggleInsertionMode() {
    setInsertionMode((prev) => !prev);
    setDeletionMode(false);
  }

  function toggleDeletionMode() {
    setDeletionMode((prev) => !prev);
    setInsertionMode(false);
  }

  return {
    performers,
    sequences,
    activeSequenceId,
    form,
    editingStepId,
    insertStepIndex,
    insertionMode,
    deletionMode,
    performanceId,
    performanceName,
    performanceDescription,
    performanceUpdatedAt,
    performanceType,
    performanceShareRole,
    stepLexiconKey,
    performerLabels,
    activeSequence,
    setPerformanceName,
    setPerformanceDescription,
    setPerformanceType,
    setPerformanceShareRole,
    setStepLexiconKey,
    applyNormalizedPerformanceState,
    initializeNewPerformance,
    markHydrated,
    updatePerformerName,
    updatePerformerWeapon,
    updatePerformerCount,
    updateForm,
    updateStepPerformer,
    updateStepLexicon,
    resetForm,
    addStep,
    insertEmptyStep,
    removeStep,
    editStep,
    cancelEditStep,
    selectSequence,
    toggleSequencePerformerVisibility,
    createSequence,
    renameSequence,
    moveSequence,
    moveSequenceToIndex,
    deleteSequence,
    startInsertStep,
    toggleInsertionMode,
    toggleDeletionMode,
    resetInteractionState,
  };
}
