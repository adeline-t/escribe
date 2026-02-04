export function createRouter() {
  const routes = [];

  function add(method, path, handler) {
    const keys = [];
    const pattern = path
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          keys.push(segment.slice(1));
          return "([^/]+)";
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    const regex = new RegExp(`^${pattern}$`);
    routes.push({ method, path, handler, regex, keys });
  }

  function match(method, path) {
    for (const route of routes) {
      if (route.method !== method) continue;
      const match = route.regex.exec(path);
      if (!match) continue;
      const params = {};
      route.keys.forEach((key, index) => {
        params[key] = match[index + 1];
      });
      return { handler: route.handler, params };
    }
    return null;
  }

  return { add, match };
}
