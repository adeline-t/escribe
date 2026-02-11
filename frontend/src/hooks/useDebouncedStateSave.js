import { useEffect, useRef } from "react";

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
  const onSaveRef = useRef(onSave);
  const onSavedRef = useRef(onSaved);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSaveRef.current = onSave;
    onSavedRef.current = onSaved;
    onErrorRef.current = onError;
  }, [onSave, onSaved, onError]);

  function flushSave(nextState) {
    const saveFn = onSaveRef.current;
    if (typeof saveFn !== "function") return;
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
        const updatedAt =
          typeof result?.performanceUpdatedAt === "string" &&
          result.performanceUpdatedAt.trim()
            ? result.performanceUpdatedAt.trim()
            : null;
        if (Number.isFinite(resultId) && updatedAt) {
          versionByPerformanceRef.current.set(resultId, updatedAt);
        }
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
        const pendingState = pendingStateRef.current;
        if (pendingState) {
          pendingStateRef.current = null;
          flushSave(pendingState);
        }
      });
  }

  useEffect(() => {
    if (!enabled || typeof onSave !== "function") return undefined;
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
}
