import { useMemo } from "react";
import { createWorkerServices } from "../services/index.js";

export function useWorkerServices(apiBase, authToken) {
  // Single entry point for all Worker/D1 APIs.
  return useMemo(
    () => createWorkerServices({ apiBase, token: authToken }),
    [apiBase, authToken],
  );
}
