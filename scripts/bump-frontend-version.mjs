import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const versionPath = path.resolve(__dirname, "../frontend/src/version.json");

function parseVersion(value) {
  const text = typeof value === "string" ? value : "0.0.0";
  const [major = 0, minor = 0, patch = 0] = text
    .split(".")
    .map((part) => Number(part));
  return {
    major: Number.isFinite(major) ? major : 0,
    minor: Number.isFinite(minor) ? minor : 0,
    patch: Number.isFinite(patch) ? patch : 0
  };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function getBumpType() {
  if (process.argv.includes("--major")) return "major";
  if (process.argv.includes("--minor")) return "minor";
  return "patch";
}

async function bumpFrontendVersion() {
  let current = { version: "0.0.0", builtAt: null };
  try {
    const raw = await readFile(versionPath, "utf8");
    current = JSON.parse(raw);
  } catch {
    current = { version: "0.0.0", builtAt: null };
  }

  const bumpType = getBumpType();
  const parsed = parseVersion(current.version);
  if (bumpType === "major") {
    parsed.major += 1;
    parsed.minor = 0;
    parsed.patch = 0;
  } else if (bumpType === "minor") {
    parsed.minor += 1;
    parsed.patch = 0;
  } else {
    parsed.patch += 1;
  }

  const next = {
    version: formatVersion(parsed),
    builtAt: new Date().toISOString()
  };

  await writeFile(versionPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Frontend version bumped to v${next.version}`);
}

bumpFrontendVersion();
