export function createAuthService(client) {
  return {
    async me() {
      const { response, payload } = await client.requestJson("/api/auth/me");
      return {
        ok: response.ok,
        user: payload?.user ?? null,
        payload,
        response,
      };
    },

    async login({ email, password }) {
      const { response, payload } = await client.requestJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return {
        ok: response.ok,
        token: payload?.token ?? null,
        user: payload?.user ?? null,
        error: payload?.error,
        payload,
        response,
      };
    },

    async register({ email, password, firstName, lastName }) {
      const { response, payload } = await client.requestJson(
        "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, firstName, lastName }),
        },
      );
      return {
        ok: response.ok,
        payload,
        response,
        error: payload?.error,
      };
    },

    async logout() {
      const response = await client.request("/api/auth/logout", {
        method: "POST",
      });
      return { ok: response.ok, response };
    },

    async updateProfile({ firstName, lastName }) {
      const { response, payload } = await client.requestJson("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      return { ok: response.ok, payload, response };
    },

    async changePassword({ currentPassword, newPassword }) {
      const { response, payload } = await client.requestJson(
        "/api/auth/change-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );
      return {
        ok: response.ok,
        message: payload?.message,
        payload,
        response,
      };
    },
  };
}
