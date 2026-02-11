import { useCallback, useEffect, useRef } from "react";

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function normalizeStateForSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const next = { ...value };
  // Server-managed timestamp: changing it after each save must not trigger a new save loop.
  delete next.performanceUpdatedAt;
  return next;
}

export function useDebouncedStateSave({
  enabled,
  state,
  delay = 400,
  onSave,
  onSaved,
  onError,
}) {
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);
  const pendingStateRef = useRef(null);
  const versionByPerformanceRef = useRef(new Map());
  const lastSavedSnapshotRef = useRef("");
  const lastScheduledSnapshotRef = useRef("");
  const enabledRef = useRef(Boolean(enabled));
  const onSaveRef = useRef(onSave);
  const onSavedRef = useRef(onSaved);
  const onErrorRef = useRef(onError);

  const extractUpdatedAt = useCallback((value) => {
    if (typeof value !== "string") return null;
    const token = value.trim();
    return token || null;
  }, []);

  const markSnapshotAsSaved = useCallback(
    (nextState) => {
      const snapshot = stableStringify(normalizeStateForSnapshot(nextState));
      lastSavedSnapshotRef.current = snapshot;
      lastScheduledSnapshotRef.current = snapshot;
      const performanceId = Number(nextState?.performanceId);
      const updatedAt = extractUpdatedAt(nextState?.performanceUpdatedAt);
      if (Number.isFinite(performanceId) && updatedAt) {
        versionByPerformanceRef.current.set(performanceId, updatedAt);
      }
    },
    [extractUpdatedAt],
  );

  useEffect(() => {
    onSaveRef.current = onSave;
    onSavedRef.current = onSaved;
    onErrorRef.current = onError;
  }, [onSave, onSaved, onError]);

  useEffect(() => {
    enabledRef.current = Boolean(enabled);
    if (!enabledRef.current) {
      pendingStateRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [enabled]);

  function flushSave(nextState) {
    if (!enabledRef.current) return;
    const saveFn = onSaveRef.current;
    if (typeof saveFn !== "function") return;
    const snapshot = stableStringify(normalizeStateForSnapshot(nextState));
    if (snapshot && snapshot === lastSavedSnapshotRef.current) {
      return;
    }
    lastScheduledSnapshotRef.current = snapshot;
    const performanceId = Number(nextState?.performanceId);
    const savedVersion = Number.isFinite(performanceId)
      ? versionByPerformanceRef.current.get(performanceId)
      : null;
    const stateToSave =
      savedVersion &&
      nextState &&
      typeof nextState === "object" &&
      nextState.performanceUpdatedAt !== savedVersion
        ? { ...nextState, performanceUpdatedAt: savedVersion }
        : nextState;

    inFlightRef.current = true;
    Promise.resolve(saveFn(stateToSave))
      .then((result) => {
        const resultId = Number(result?.performanceId);
        const updatedAt = extractUpdatedAt(result?.performanceUpdatedAt);
        if (Number.isFinite(resultId) && updatedAt) {
          versionByPerformanceRef.current.set(resultId, updatedAt);
        }
        lastSavedSnapshotRef.current = snapshot;
        const onSavedFn = onSavedRef.current;
        if (typeof onSavedFn === "function") {
          onSavedFn(result);
        }
      })
      .catch((error) => {
        const onErrorFn = onErrorRef.current;
        if (typeof onErrorFn === "function") {
          onErrorFn(error);
        }
      })
      .finally(() => {
        inFlightRef.current = false;
        if (!enabledRef.current) return;
        const pendingState = pendingStateRef.current;
        if (pendingState) {
          pendingStateRef.current = null;
          flushSave(pendingState);
        }
      });
  }

  useEffect(() => {
    if (!enabled || typeof onSave !== "function") return undefined;
    const snapshot = stableStringify(normalizeStateForSnapshot(state));
    if (
      snapshot &&
      (snapshot === lastSavedSnapshotRef.current ||
        snapshot === lastScheduledSnapshotRef.current)
    ) {
      return undefined;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Centralize state-save debounce to avoid
    // overly frequent D1 writes on every keystroke.
    timerRef.current = setTimeout(() => {
      if (inFlightRef.current) {
        pendingStateRef.current = state;
        return;
      }
      flushSave(state);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, state, delay, onSave]);

  return { markSnapshotAsSaved };
}
