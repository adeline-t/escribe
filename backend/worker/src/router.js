export function createRouter() {
  const routes = [];

  function add(method, path, handler) {
    routes.push({ method, path, handler });
  }

  function match(method, path) {
    return routes.find((route) => route.method === method && route.path === path) ?? null;
  }

  return { add, match };
}
