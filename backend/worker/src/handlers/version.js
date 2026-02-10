import { buildCorsHeaders, jsonResponse } from "../utils/http.js";
import versionInfo from "../version.json";

export function handleVersion(request, env) {
  return jsonResponse(
    {
      version: versionInfo?.version ?? "0.0.0",
      deployedAt: versionInfo?.deployedAt ?? null,
      environment: env.ENVIRONMENT ?? "unknown"
    },
    200,
    buildCorsHeaders(request, env)
  );
}
