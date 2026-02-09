import { useMemo } from "react";
import { createWorkerServices } from "../services/index.js";

export function useWorkerServices(apiBase, authToken) {
  // Un seul point d'entrée pour toutes les APIs Worker/D1.
  return useMemo(
    () => createWorkerServices({ apiBase, token: authToken }),
    [apiBase, authToken],
  );
}
