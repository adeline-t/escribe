import { createApiClient } from "./apiClient.js";
import { createAuthService } from "./authService.js";
import { createCombatService } from "./combatService.js";
import { createLexiconService } from "./lexiconService.js";
import { createAdminService } from "./adminService.js";
import { createSystemService } from "./systemService.js";

export function createWorkerServices({ apiBase, token }) {
  const client = createApiClient({ apiBase, token });
  return {
    client,
    auth: createAuthService(client),
    combats: createCombatService(client),
    lexicon: createLexiconService(client),
    admin: createAdminService(client),
    system: createSystemService(client),
  };
}
