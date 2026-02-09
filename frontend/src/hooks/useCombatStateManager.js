import { useEffect, useMemo, useState } from "react";
import { DEFAULT_PARTICIPANTS } from "../lib/lexicon.js";
import {
  emptyParticipantState,
  labelForParticipant,
  normalizeHiddenParticipantIndexes,
} from "../lib/participants.js";
import { useDebouncedStateSave } from "./useDebouncedStateSave.js";

const DEFAULT_STEP_LEXICON_KEY = "classic-v2";

function buildEmptyForm(participants) {
  return participants.map(() => emptyParticipantState());
}

function createEmptyStepParticipant() {
  return {
    mode: "note",
    role: "none",
    offensive: "",
    action: "",
    target: "",
    attackMove: "",
    attackAttribute: [],
    defense: "",
    paradeNumber: "",
    paradeAttribute: "",
    defendMove: "",
    chorePhase: "",
    note: "",
    noteOverrides: true,
  };
}

export function useCombatStateManager({ isSaveEnabled, saveState } = {}) {
  // Source unique de vérité pour l'édition d'un combat (participants, phrases, passe en cours).
  const [participants, setParticipants] = useState(() =>
    DEFAULT_PARTICIPANTS.map((participant) => ({ ...participant })),
  );
  const [phrases, setPhrases] = useState([]);
  const [activePhraseId, setActivePhraseId] = useState(null);
  const [form, setForm] = useState(
    DEFAULT_PARTICIPANTS.map(() => emptyParticipantState()),
  );
  const [editingStepId, setEditingStepId] = useState(null);
  const [insertStepIndex, setInsertStepIndex] = useState(null);
  const [insertionMode, setInsertionMode] = useState(false);
  const [deletionMode, setDeletionMode] = useState(false);
  const [combatId, setCombatId] = useState(null);
  const [combatName, setCombatName] = useState("Combat sans nom");
  const [combatDescription, setCombatDescription] = useState("");
  const [combatType, setCombatType] = useState("classic");
  const [combatShareRole, setCombatShareRole] = useState("read");
  const [stepLexiconKey, setStepLexiconKey] = useState(DEFAULT_STEP_LEXICON_KEY);
  const [isHydrated, setIsHydrated] = useState(false);

  const participantLabels = useMemo(
    () => participants.map((name, index) => labelForParticipant(name, index)),
    [participants],
  );

  const activePhrase = useMemo(
    () => phrases.find((phrase) => phrase.id === activePhraseId) ?? null,
    [phrases, activePhraseId],
  );

  function resetInteractionState({ resetLexicon = true } = {}) {
    // Réinitialise uniquement le contexte d'édition (pas les données du combat).
    setEditingStepId(null);
    setInsertStepIndex(null);
    setInsertionMode(false);
    setDeletionMode(false);
    if (resetLexicon) {
      setStepLexiconKey(DEFAULT_STEP_LEXICON_KEY);
    }
  }

  function applyNormalizedCombatState(normalized, { fallbackCombatId = null } = {}) {
    // Hydrate tout l'état depuis un payload normalisé venant de l'API.
    if (!normalized) return;
    setParticipants(normalized.participants);
    setPhrases(normalized.phrases ?? []);
    setForm(normalized.form);
    setCombatId(normalized.combatId ?? fallbackCombatId ?? null);
    setCombatName(normalized.combatName ?? "Combat sans nom");
    setCombatDescription(normalized.combatDescription ?? "");
    setCombatType(normalized.combatType ?? "classic");
    setCombatShareRole(normalized.combatShareRole ?? "read");
    setActivePhraseId(normalized.phrases?.[0]?.id ?? null);
    resetInteractionState({ resetLexicon: true });
  }

  function initializeNewCombat({
    id,
    name,
    description,
    type,
    participants: nextParticipants,
  }) {
    // Initialise un nouveau combat côté front juste après sa création en base.
    const resolvedParticipants = Array.isArray(nextParticipants)
      ? nextParticipants
      : DEFAULT_PARTICIPANTS.map((participant) => ({ ...participant }));
    const initialPhrase = {
      id: crypto.randomUUID(),
      name: "Phrase 1",
      steps: [],
      hiddenParticipantIndexes: [],
    };

    setCombatId(id ?? null);
    setCombatName(name ?? "Combat sans nom");
    setCombatDescription(description ?? "");
    setCombatType(type === "sabre-laser" ? "sabre-laser" : "classic");
    setCombatShareRole("owner");
    setParticipants(resolvedParticipants);
    setPhrases([initialPhrase]);
    setActivePhraseId(initialPhrase.id);
    setForm(buildEmptyForm(resolvedParticipants));
    resetInteractionState({ resetLexicon: true });
  }

  function markHydrated(value = true) {
    setIsHydrated(Boolean(value));
  }

  useDebouncedStateSave({
    enabled: isHydrated && Boolean(isSaveEnabled) && typeof saveState === "function",
    state: {
      combatId,
      combatName,
      combatDescription,
      combatType,
      participants,
      phrases,
      form,
    },
    delay: 400,
    // Persistance automatique du brouillon de combat.
    onSave: (state) => saveState(state),
    onSaved: (result) => {
      if (result?.combatId) {
        setCombatId((prev) => prev ?? result.combatId);
      }
    },
    onError: (error) => {
      console.warn("State save skipped:", error);
    },
  });

  function updateParticipantName(index, value) {
    setParticipants((prev) => {
      const next = [...prev];
      const current =
        next[index] && typeof next[index] === "object"
          ? next[index]
          : { name: "", weapon: "" };
      next[index] = { ...current, name: value };
      return next;
    });
  }

  function updateParticipantWeapon(index, value) {
    setParticipants((prev) => {
      const next = [...prev];
      const current =
        next[index] && typeof next[index] === "object"
          ? next[index]
          : { name: "", weapon: "" };
      next[index] = { ...current, weapon: value };
      return next;
    });
  }

  function updateParticipantCount(value) {
    const count = Number(value);
    setParticipants((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i += 1) {
          next.push({ name: "", weapon: "" });
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
          next.push(emptyParticipantState());
        }
      }
      if (count < next.length) {
        next.splice(count);
      }
      return next;
    });

    setPhrases((prev) =>
      prev.map((phrase) => ({
        ...phrase,
        hiddenParticipantIndexes: normalizeHiddenParticipantIndexes(
          phrase?.hiddenParticipantIndexes,
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

  function updateStepParticipant(stepId, participantIndex, updates) {
    setPhrases((prev) =>
      prev.map((phrase) => {
        if (phrase.id !== activePhraseId) return phrase;
        return {
          ...phrase,
          steps: phrase.steps.map((step) => {
            if (step.id !== stepId) return step;
            return {
              ...step,
              participants: step.participants.map((item, index) =>
                index === participantIndex ? { ...item, ...updates } : item,
              ),
            };
          }),
        };
      }),
    );
  }

  function updateStepLexicon(stepId, lexiconKey) {
    if (!lexiconKey) return;
    setPhrases((prev) =>
      prev.map((phrase) => {
        if (phrase.id !== activePhraseId) return phrase;
        return {
          ...phrase,
          steps: phrase.steps.map((step) =>
            step.id === stepId ? { ...step, lexicon: lexiconKey } : step,
          ),
        };
      }),
    );
  }

  function resetForm() {
    setForm(buildEmptyForm(participants));
    resetInteractionState({ resetLexicon: true });
  }

  function addStep() {
    const hasContent = form.some((item) => {
      if (item.mode === "combat") {
        return item.role !== "none";
      }
      if (item.mode === "choregraphie") {
        return Boolean(item.chorePhase) || Boolean(item.note);
      }
      if (item.mode === "note") {
        return Boolean(item.note);
      }
      return false;
    });
    if (!hasContent || !activePhraseId) return;

    if (editingStepId) {
      setPhrases((prev) =>
        prev.map((phrase) => {
          if (phrase.id !== activePhraseId) return phrase;
          return {
            ...phrase,
            steps: phrase.steps.map((step) =>
              step.id === editingStepId
                ? {
                    ...step,
                    lexicon: stepLexiconKey,
                    participants: form.map((item) => ({ ...item })),
                  }
                : step,
            ),
          };
        }),
      );
      setForm(buildEmptyForm(participants));
      resetInteractionState({ resetLexicon: true });
      return;
    }

    const step = {
      id: crypto.randomUUID(),
      lexicon: stepLexiconKey,
      participants: form.map((item) => ({ ...item })),
    };

    setPhrases((prev) =>
      prev.map((phrase) => {
        if (phrase.id !== activePhraseId) return phrase;
        if (insertStepIndex == null) {
          return { ...phrase, steps: [...phrase.steps, step] };
        }
        const nextSteps = [...phrase.steps];
        const index = Math.max(0, Math.min(insertStepIndex, nextSteps.length));
        nextSteps.splice(index, 0, step);
        return { ...phrase, steps: nextSteps };
      }),
    );

    setForm(buildEmptyForm(participants));
    resetInteractionState({ resetLexicon: true });
  }

  function insertEmptyStep(index) {
    if (!activePhraseId) return;
    const step = {
      id: crypto.randomUUID(),
      lexicon: stepLexiconKey,
      participants: participants.map(() => createEmptyStepParticipant()),
    };
    setPhrases((prev) =>
      prev.map((phrase) => {
        if (phrase.id !== activePhraseId) return phrase;
        const nextSteps = [...phrase.steps];
        const insertAt = Math.max(0, Math.min(index, nextSteps.length));
        nextSteps.splice(insertAt, 0, step);
        return { ...phrase, steps: nextSteps };
      }),
    );
  }

  function removeStep(id) {
    if (!activePhraseId) return;
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === activePhraseId
          ? { ...phrase, steps: phrase.steps.filter((step) => step.id !== id) }
          : phrase,
      ),
    );
    if (editingStepId === id) {
      setEditingStepId(null);
    }
    resetInteractionState({ resetLexicon: true });
  }

  function editStep(id) {
    if (!activePhraseId) return;
    setEditingStepId(id);
    setInsertStepIndex(null);
    setInsertionMode(false);
    setDeletionMode(false);
  }

  useEffect(() => {
    if (!editingStepId || !activePhraseId) return;
    const phrase = phrases.find((item) => item.id === activePhraseId);
    const step = phrase?.steps?.find((item) => item.id === editingStepId);
    if (!step) return;

    setStepLexiconKey(
      typeof step.lexicon === "string" ? step.lexicon : "classic",
    );
    setForm(
      step.participants.map((item) => ({
        ...emptyParticipantState(),
        ...item,
        attackAttribute: Array.isArray(item.attackAttribute)
          ? item.attackAttribute
          : [],
      })),
    );
  }, [editingStepId, activePhraseId, phrases]);

  function cancelEditStep() {
    setForm(buildEmptyForm(participants));
    resetInteractionState({ resetLexicon: true });
  }

  function selectPhrase(id) {
    setActivePhraseId(id);
    setForm(buildEmptyForm(participants));
    resetInteractionState({ resetLexicon: true });
  }

  function togglePhraseParticipantVisibility(phraseId, participantIndex) {
    const index = Number(participantIndex);
    if (!Number.isInteger(index)) return;
    setPhrases((prev) =>
      prev.map((phrase) => {
        if (phrase.id !== phraseId) return phrase;
        const current = normalizeHiddenParticipantIndexes(
          phrase?.hiddenParticipantIndexes,
          participants.length,
        );
        const nextSet = new Set(current);
        if (nextSet.has(index)) {
          nextSet.delete(index);
        } else {
          const visibleCount = Math.max(0, participants.length - nextSet.size);
          if (visibleCount <= 1) return phrase;
          nextSet.add(index);
        }
        return {
          ...phrase,
          hiddenParticipantIndexes: [...nextSet].sort((a, b) => a - b),
        };
      }),
    );
  }

  function createPhrase() {
    const nextNumber = phrases.length + 1;
    const newPhrase = {
      id: crypto.randomUUID(),
      name: `Phrase ${nextNumber}`,
      hiddenParticipantIndexes: [],
      steps: [],
    };
    setPhrases((prev) => [...prev, newPhrase]);
    setActivePhraseId(newPhrase.id);
    setForm(buildEmptyForm(participants));
    resetInteractionState({ resetLexicon: true });
  }

  function renamePhrase(id, name) {
    setPhrases((prev) =>
      prev.map((phrase) => (phrase.id === id ? { ...phrase, name } : phrase)),
    );
  }

  function movePhrase(id, direction) {
    setPhrases((prev) => {
      const index = prev.findIndex((phrase) => phrase.id === id);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      return copy;
    });
  }

  function movePhraseToIndex(id, targetIndex) {
    setPhrases((prev) => {
      const index = prev.findIndex((phrase) => phrase.id === id);
      if (index < 0) return prev;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      if (index === targetIndex) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  }

  function deletePhrase(id) {
    setPhrases((prev) => prev.filter((phrase) => phrase.id !== id));
    if (activePhraseId === id) {
      const remaining = phrases.filter((phrase) => phrase.id !== id);
      setActivePhraseId(remaining[0]?.id ?? null);
      setForm(buildEmptyForm(participants));
      resetInteractionState({ resetLexicon: true });
    }
  }

  function startInsertStep(index, { resetLexicon = false } = {}) {
    // Prépare l'insertion d'une passe à un index précis.
    setInsertStepIndex(index);
    setEditingStepId(null);
    setForm(buildEmptyForm(participants));
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
    participants,
    phrases,
    activePhraseId,
    form,
    editingStepId,
    insertStepIndex,
    insertionMode,
    deletionMode,
    combatId,
    combatName,
    combatDescription,
    combatType,
    combatShareRole,
    stepLexiconKey,
    participantLabels,
    activePhrase,
    setCombatName,
    setCombatDescription,
    setCombatType,
    setCombatShareRole,
    setStepLexiconKey,
    applyNormalizedCombatState,
    initializeNewCombat,
    markHydrated,
    updateParticipantName,
    updateParticipantWeapon,
    updateParticipantCount,
    updateForm,
    updateStepParticipant,
    updateStepLexicon,
    resetForm,
    addStep,
    insertEmptyStep,
    removeStep,
    editStep,
    cancelEditStep,
    selectPhrase,
    togglePhraseParticipantVisibility,
    createPhrase,
    renamePhrase,
    movePhrase,
    movePhraseToIndex,
    deletePhrase,
    startInsertStep,
    toggleInsertionMode,
    toggleDeletionMode,
    resetInteractionState,
  };
}
