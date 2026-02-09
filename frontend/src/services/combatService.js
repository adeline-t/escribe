function normalizeCombatType(type) {
  return type === "sabre-laser" ? "sabre-laser" : "classic";
}

export function createCombatService(client) {
  return {
    async listCombats({ archived = 0, type, signal } = {}) {
      const path = client.withQuery("/api/combats", {
        archived,
        type,
      });
      const { response, payload } = await client.requestJson(path, { signal });
      return {
        ok: response.ok,
        status: response.status,
        combats: payload?.combats ?? [],
        payload,
        response,
      };
    },

    async getState({ combatId } = {}) {
      const path = client.withQuery("/api/state", { combatId });
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
        combatId: payload?.combatId ?? null,
        payload,
        response,
      };
    },

    async createCombat(payload = {}) {
      const participants = Array.isArray(payload.participants)
        ? payload.participants
        : [];
      const { response, payload: responsePayload } = await client.requestJson(
        "/api/combats",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload?.name,
            description: payload?.description,
            participants,
            type: normalizeCombatType(payload?.type),
          }),
        },
      );
      return {
        ok: response.ok,
        combat: responsePayload?.combat ?? null,
        payload: responsePayload,
        response,
      };
    },

    async getCombatById(id) {
      const { response, payload } = await client.requestJson(`/api/combats/${id}`);
      return {
        ok: response.ok,
        state: payload?.state,
        payload,
        response,
      };
    },

    async deleteCombat(id) {
      const { response, payload } = await client.requestJson(
        `/api/combats/${id}/delete`,
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

    async getShares(combatId) {
      const { response, payload } = await client.requestJson(
        `/api/combats/${combatId}/shares`,
      );
      return {
        ok: response.ok,
        shares: payload?.shares ?? [],
        payload,
        response,
      };
    },

    async searchShareUsers({ query, signal } = {}) {
      const path = client.withQuery("/api/combats/share-users", {
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
        "/api/combats/share-users/all",
      );
      return {
        ok: response.ok,
        users: payload?.users ?? [],
        payload,
        response,
      };
    },

    async addShare({ combatId, userId, role }) {
      const { response, payload } = await client.requestJson(
        `/api/combats/${combatId}/shares`,
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

    async removeShare({ combatId, userId }) {
      const { response, payload } = await client.requestJson(
        `/api/combats/${combatId}/shares`,
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
