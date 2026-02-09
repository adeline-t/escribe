export function createSystemService(client) {
  return {
    async getVersion() {
      const { response, payload } = await client.requestJson("/api/version");
      return {
        ok: response.ok,
        payload,
        response,
      };
    },
  };
}
