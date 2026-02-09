export function createAdminService(client) {
  return {
    async getAuditLogs({ limit = 100 } = {}) {
      const path = client.withQuery("/api/admin/audit", { limit });
      const { response, payload } = await client.requestJson(path);
      return {
        ok: response.ok,
        logs: payload?.logs ?? [],
        payload,
        response,
      };
    },

    async getUsers() {
      const { response, payload } = await client.requestJson("/api/admin/users");
      return {
        ok: response.ok,
        users: payload?.users ?? [],
        payload,
        response,
      };
    },

    async updateUserRole({ userId, role }) {
      const { response, payload } = await client.requestJson(
        "/api/admin/users/role",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role }),
        },
      );
      return {
        ok: response.ok,
        payload,
        response,
      };
    },

    async resetUserPassword({ userId, password, forceReset }) {
      const { response, payload } = await client.requestJson(
        "/api/admin/users/password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, password, forceReset }),
        },
      );
      return {
        ok: response.ok,
        payload,
        message: payload?.message,
        response,
      };
    },
  };
}
