/**
 * Transport-level response helpers for Worker handlers.
 * Keep these stateless to simplify testing and reuse.
 */
export function getSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
}

export function jsonResponse(data, status = 200, headers = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    ...getSecurityHeaders(),
  };

  return new Response(JSON.stringify(data), {
    status,
    headers: { ...defaultHeaders, ...headers },
  });
}

export function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((item) => item.trim())
    : ["*"];
  const allowOrigin = allowed.includes("*")
    ? "*"
    : allowed.includes(origin)
      ? origin
      : allowed[0] || "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    ...getSecurityHeaders(),
  };
}
