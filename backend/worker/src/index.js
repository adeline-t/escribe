import { buildCorsHeaders, jsonResponse } from "./db.js";
import { handleState } from "./handlers/state.js";
import { handleHealth } from "./handlers/health.js";
import { createRouter } from "./router.js";

const router = createRouter();
router.add("GET", "/api/state", handleState);
router.add("POST", "/api/state", handleState);
router.add("GET", "/api", handleHealth);
router.add("GET", "/api/", handleHealth);
router.add("GET", "/api/health", handleHealth);

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
        return route.handler(request, env);
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
