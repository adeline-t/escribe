import { jsonResponse, buildCorsHeaders } from "../utils/http.js";

export function handleHealth(request, env) {
  return jsonResponse(
    {
      status: "ok",
      message: "API opérationnelle",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT || "unknown"
    },
    200,
    buildCorsHeaders(request, env)
  );
}
