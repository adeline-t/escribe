import { buildCorsHeaders, jsonResponse } from "./db.js";
import { handleState } from "./handlers/state.js";
import { handleHealth } from "./handlers/health.js";
import { handleLexicon, handleLexiconType, handleLexiconPersonal, handleLexiconFavorites } from "./handlers/lexicon.js";
import { createRouter } from "./router.js";
import { handleRegister, handleLogin, handleMe, handleProfile, handleChangePassword, handleLogout } from "./handlers/auth.js";
import { handleUsersList, handleUserRole, handleUserPasswordReset, handleAudit } from "./handlers/users.js";
import { handleCombats, handleCombat, handleCombatArchive } from "./handlers/combats.js";

const router = createRouter();
router.add("GET", "/api/state", handleState);
router.add("POST", "/api/state", handleState);
router.add("GET", "/api", handleHealth);
router.add("GET", "/api/", handleHealth);
router.add("GET", "/api/health", handleHealth);
router.add("GET", "/api/lexicon", handleLexicon);
router.add("GET", "/api/lexicon/favorites", handleLexiconFavorites);
router.add("POST", "/api/lexicon/favorites", handleLexiconFavorites);
router.add("GET", "/api/lexicon/:type", handleLexiconType);
router.add("POST", "/api/lexicon/:type", handleLexiconType);
router.add("DELETE", "/api/lexicon/:type", handleLexiconType);
router.add("GET", "/api/lexicon/personal/:type", handleLexiconPersonal);
router.add("POST", "/api/lexicon/personal/:type", handleLexiconPersonal);
router.add("DELETE", "/api/lexicon/personal/:type", handleLexiconPersonal);
router.add("POST", "/api/auth/register", handleRegister);
router.add("POST", "/api/auth/login", handleLogin);
router.add("GET", "/api/auth/me", handleMe);
router.add("POST", "/api/auth/profile", handleProfile);
router.add("POST", "/api/auth/change-password", handleChangePassword);
router.add("POST", "/api/auth/logout", handleLogout);
router.add("GET", "/api/admin/users", handleUsersList);
router.add("POST", "/api/admin/users/role", handleUserRole);
router.add("POST", "/api/admin/users/password", handleUserPasswordReset);
router.add("GET", "/api/admin/audit", handleAudit);
router.add("GET", "/api/combats", handleCombats);
router.add("POST", "/api/combats", handleCombats);
router.add("GET", "/api/combats/:id", handleCombat);
router.add("POST", "/api/combats/:id", handleCombat);
router.add("POST", "/api/combats/:id/archive", handleCombatArchive);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log(`${method} ${path} - ${new Date().toISOString()}`);

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request, env)
      });
    }

    try {
      const route = router.match(method, path);
      if (route) {
        return route.handler(request, env, route.params);
      }

      return jsonResponse({ error: "Route non trouvée" }, 404, buildCorsHeaders(request, env));
    } catch (error) {
      console.error("Unhandled error:", error);
      return jsonResponse(
        {
          error: "Erreur serveur interne",
          message: error.message,
          timestamp: new Date().toISOString()
        },
        500,
        buildCorsHeaders(request, env)
      );
    }
  }
};
