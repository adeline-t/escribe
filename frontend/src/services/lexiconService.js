export function createLexiconService(client) {
  function cacheBustQuery(query = {}, enabled = true) {
    if (!enabled) return query;
    return {
      ...query,
      _cb: Date.now(),
    };
  }

  function buildScopedPath(type, scope) {
    if (scope === "personal") return `/api/lexicon/personal/${type}`;
    return `/api/lexicon/${type}`;
  }

  return {
    async getFormLexicon({ lexicon, forceRefresh = true } = {}) {
      const path = client.withQuery(
        "/api/lexicon/form",
        cacheBustQuery({ lexicon }, forceRefresh),
      );
      const { response, payload } = await client.requestJson(path);
      return {
        ok: response.ok,
        lexicon: payload?.lexicon,
        payload,
        response,
      };
    },

    async getCatalog({
      lexicon,
      scope = "global",
      signal,
      forceRefresh = true,
    } = {}) {
      const path = client.withQuery(
        "/api/lexicon/catalog",
        cacheBustQuery({ lexicon, scope }, forceRefresh),
      );
      const { response, payload } = await client.requestJson(path, { signal });
      return {
        ok: response.ok,
        lexicon: payload?.lexicon,
        scope: payload?.scope ?? scope,
        types: payload?.types ?? [],
        itemsByType: payload?.itemsByType ?? {},
        payload,
        response,
      };
    },

    async getLexicon({ lexicon, forceRefresh = true } = {}) {
      const path = client.withQuery(
        "/api/lexicon",
        cacheBustQuery({ lexicon }, forceRefresh),
      );
      const { response, payload } = await client.requestJson(path);
      return {
        ok: response.ok,
        lexicon: payload?.lexicon,
        payload,
        response,
      };
    },

    async getFavorites({ lexicon, signal, forceRefresh = true } = {}) {
      const path = client.withQuery(
        "/api/lexicon/favorites",
        cacheBustQuery({ lexicon }, forceRefresh),
      );
      const { response, payload } = await client.requestJson(path, { signal });
      return {
        ok: response.ok,
        favorites: payload?.favorites ?? {},
        payload,
        response,
      };
    },

    async listItems({
      type,
      scope = "global",
      lexicon,
      signal,
      forceRefresh = true,
    } = {}) {
      const path = client.withQuery(
        buildScopedPath(type, scope),
        cacheBustQuery({ lexicon }, forceRefresh),
      );
      const { response, payload } = await client.requestJson(path, { signal });
      return {
        ok: response.ok,
        items: payload?.items ?? [],
        payload,
        response,
      };
    },

    async addItem({ type, scope = "global", lexicon, label }) {
      const path = client.withQuery(buildScopedPath(type, scope), { lexicon });
      const { response, payload } = await client.requestJson(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      return {
        ok: response.ok,
        item: payload?.item ?? null,
        error: payload?.error,
        payload,
        response,
      };
    },

    async deleteItem({ type, scope = "global", lexicon, id }) {
      const path = client.withQuery(buildScopedPath(type, scope), { lexicon });
      const { response, payload } = await client.requestJson(path, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      return {
        ok: response.ok,
        payload,
        response,
      };
    },

    async setFavorite({ type, label, favorite, lexicon }) {
      const { response, payload } = await client.requestJson(
        "/api/lexicon/favorites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, label, favorite, lexicon }),
        },
      );
      return {
        ok: response.ok,
        payload,
        response,
      };
    },
  };
}
