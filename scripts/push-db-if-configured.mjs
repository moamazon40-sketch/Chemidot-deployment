import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL is not set; skipping database schema push.");
  process.exit(0);
}

const result = spawnSync(
  "pnpm",
  ["--filter", "@workspace/db", "run", "push-force"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);
