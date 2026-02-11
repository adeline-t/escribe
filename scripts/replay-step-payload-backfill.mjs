#!/usr/bin/env node
import path from "node:path";
import { execFileSync } from "node:child_process";

const envArg = String(readFlagValue("--env") ?? "local").trim().toLowerCase();
const dryRun = hasFlag("--dry-run");

const configPath = path.resolve("backend/worker/wrangler.toml");
const sqlPath = path.resolve(
  "db/migrations/0029_backfill_step_storage_from_payload.sql",
);

const TARGETS = {
  local: {
    database: "escribe-dev",
    envFlag: "local",
    locationFlag: "--local",
  },
  dev: {
    database: "escribe-dev",
    envFlag: "dev",
    locationFlag: null,
  },
  prod: {
    database: "escribe",
    envFlag: "",
    locationFlag: "--remote",
  },
};

const target = TARGETS[envArg];
if (!target) {
  console.error(
    `[replay-payload] unknown --env=${envArg} (allowed: local|dev|prod)`,
  );
  process.exit(1);
}

if (dryRun) {
  console.log("[replay-payload] dry-run enabled, no SQL execution");
  process.exit(0);
}

console.log(`[replay-payload] env=${envArg}`);
console.log(`[replay-payload] sql=${sqlPath}`);

const args = [
  "wrangler",
  "d1",
  "execute",
  target.database,
  "--config",
  configPath,
];
if (target.envFlag) {
  args.push("--env", target.envFlag);
}
if (target.locationFlag) {
  args.push(target.locationFlag);
}
args.push("--file", sqlPath, "-y");

execFileSync("npx", args, { stdio: "inherit" });
console.log("[replay-payload] done");

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readFlagValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

