function normalizePerformanceType(type) {
  return type === "sabre-laser" ? "sabre-laser" : "classic";
}

export function createPerformanceService(client) {
  return {
    async listPerformances({
      archived = 0,
      type,
      includeLegacyLexicon = false,
      signal,
    } = {}) {
      const path = client.withQuery("/api/performances", {
        archived,
        type,
        includeLegacyLexicon: includeLegacyLexicon ? 1 : undefined,
      });
      const { response, payload } = await client.requestJson(path, { signal });
      return {
        ok: response.ok,
        status: response.status,
        performances: payload?.performances ?? [],
        payload,
        response,
      };
    },

    async getState({ performanceId } = {}) {
      const path = client.withQuery("/api/state", { performanceId });
      const { response, payload } = await client.requestJson(path);
      return {
        ok: response.ok,
        state: payload?.state,
        payload,
        response,
      };
    },

    async saveState(state) {
      const { response, payload } = await client.requestJson("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      return {
        ok: response.ok,
        performanceId: payload?.performanceId ?? null,
        payload,
        response,
      };
    },

    async createPerformance(payload = {}) {
      const performers = Array.isArray(payload.performers)
        ? payload.performers
        : [];
      const { response, payload: responsePayload } = await client.requestJson(
        "/api/performances",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload?.name,
            description: payload?.description,
            performers,
            type: normalizePerformanceType(payload?.type),
          }),
        },
      );
      return {
        ok: response.ok,
        performance: responsePayload?.performance ?? null,
        payload: responsePayload,
        response,
      };
    },

    async getPerformanceById(id) {
      const { response, payload } = await client.requestJson(
        `/api/performances/${id}`
      );
      return {
        ok: response.ok,
        state: payload?.state,
        payload,
        response,
      };
    },

    async deletePerformance(id) {
      const { response, payload } = await client.requestJson(
        `/api/performances/${id}/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      return {
        ok: response.ok,
        payload,
        response,
      };
    },

    async getShares(performanceId) {
      const { response, payload } = await client.requestJson(
        `/api/performances/${performanceId}/shares`
      );
      return {
        ok: response.ok,
        shares: payload?.shares ?? [],
        payload,
        response,
      };
    },

    async searchShareUsers({ query, signal } = {}) {
      const path = client.withQuery("/api/performances/share-users", {
        query,
      });
      const { response, payload } = await client.requestJson(path, { signal });
      return {
        ok: response.ok,
        users: payload?.users ?? [],
        payload,
        response,
      };
    },

    async listShareUsers() {
      const { response, payload } = await client.requestJson(
        "/api/performances/share-users/all",
      );
      return {
        ok: response.ok,
        users: payload?.users ?? [],
        payload,
        response,
      };
    },

    async addShare({ performanceId, userId, role }) {
      const { response, payload } = await client.requestJson(
        `/api/performances/${performanceId}/shares`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role }),
        },
      );
      return {
        ok: response.ok,
        shares: payload?.shares ?? [],
        payload,
        response,
      };
    },

    async removeShare({ performanceId, userId }) {
      const { response, payload } = await client.requestJson(
        `/api/performances/${performanceId}/shares`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      return {
        ok: response.ok,
        shares: payload?.shares ?? [],
        payload,
        response,
      };
    },
  };
}
