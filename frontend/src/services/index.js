import { createApiClient } from "./apiClient.js";
import { createAuthService } from "./authService.js";
import { createPerformanceService } from "./performanceService.js";
import { createLexiconService } from "./lexiconService.js";
import { createAdminService } from "./adminService.js";
import { createSystemService } from "./systemService.js";

export function createWorkerServices({ apiBase, token }) {
  const client = createApiClient({ apiBase, token });
  const performanceService = createPerformanceService(client);
  return {
    client,
    auth: createAuthService(client),
    performances: performanceService,
    lexicon: createLexiconService(client),
    admin: createAdminService(client),
    system: createSystemService(client),
  };
}
