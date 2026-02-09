function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const queryString = params.toString();
  if (!queryString) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${queryString}`;
}

export function createApiClient({ apiBase, token } = {}) {
  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    // Tous les appels passent ici pour garantir l'injection du token.
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${apiBase}${path}`, { ...options, headers });
  }

  async function requestJson(path, options = {}) {
    const response = await request(path, options);
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }

  return {
    apiBase,
    token,
    withQuery,
    request,
    requestJson,
  };
}
