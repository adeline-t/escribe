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

  useEffect(() => {
    if (!enabled || typeof onSave !== "function") return undefined;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Centralize state-save debounce to avoid
    // overly frequent D1 writes on every keystroke.
    timerRef.current = setTimeout(() => {
      Promise.resolve(onSave(state))
        .then((result) => {
          if (typeof onSaved === "function") {
            onSaved(result);
          }
        })
        .catch((error) => {
          if (typeof onError === "function") {
            onError(error);
          }
        });
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, state, delay, onSave, onSaved, onError]);
}
