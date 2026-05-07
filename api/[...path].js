let appPromise;

export default async function handler(req, res) {
  appPromise ??= import("../artifacts/api-server/dist/app.mjs");
  const { default: app } = await appPromise;

  return app(req, res);
}
