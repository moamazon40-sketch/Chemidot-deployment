let appPromise;

function normalizeRewrittenApiPath(req) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const apiPath = url.searchParams.get("_vc_api_path");

  if (!apiPath) return;

  url.searchParams.delete("_vc_api_path");

  if (url.pathname === "/api/[...]" || url.pathname === "/api/%5B...%5D") {
    url.pathname = `/api/${apiPath.replace(/^\/+/, "")}`;
  }

  req.url = `${url.pathname}${url.search}`;
}

export default async function handler(req, res) {
  normalizeRewrittenApiPath(req);

  appPromise ??= import("./artifacts/api-server/dist/app.mjs");
  const { default: app } = await appPromise;

  return app(req, res);
}
