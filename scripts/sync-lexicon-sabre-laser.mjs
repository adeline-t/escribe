import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcPath = path.join(root, "doc", "sl-1.json");
const workerPath = path.join(
  root,
  "backend",
  "worker",
  "src",
  "lexicon-sabre-laser.seed.json",
);
const sqlPath = path.join(root, "db", "lexicon-sabre-laser.sql");

function sqlQuote(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function getChildren(node) {
  return Array.isArray(node?.children) ? node.children : [];
}

function flattenTree(rootNode) {
  const entries = [];
  function walk(node, parentLexiconId = null) {
    const lexiconId = String(node?.id ?? "").trim();
    if (!lexiconId) return;
    entries.push({
      lexiconId,
      parentLexiconId,
      name: String(node?.nom ?? node?.name ?? lexiconId).trim() || lexiconId,
      description: String(node?.description ?? "").trim(),
    });
    for (const child of getChildren(node)) walk(child, lexiconId);
  }
  walk(rootNode, null);
  return entries;
}

const lexiconRaw = await readFile(srcPath, "utf-8");
const lexicon = JSON.parse(lexiconRaw);
const entries = flattenTree(lexicon);

await writeFile(workerPath, JSON.stringify(lexicon, null, 2) + "\n", "utf-8");

const sqlLines = [];
sqlLines.push("CREATE TABLE IF NOT EXISTS lexicon_light_saber (");
sqlLines.push("  id INTEGER PRIMARY KEY AUTOINCREMENT,");
sqlLines.push("  lexicon_id TEXT NOT NULL,");
sqlLines.push("  parent_id INTEGER,");
sqlLines.push("  name TEXT NOT NULL,");
sqlLines.push("  description TEXT,");
sqlLines.push("  deleted_at TEXT,");
sqlLines.push("  source TEXT NOT NULL DEFAULT 'seed',");
sqlLines.push("  FOREIGN KEY(parent_id) REFERENCES lexicon_light_saber(id)");
sqlLines.push(");");
sqlLines.push(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_lexicon_light_saber_lexicon_id ON lexicon_light_saber(lexicon_id);",
);
sqlLines.push(
  "CREATE INDEX IF NOT EXISTS idx_lexicon_light_saber_parent_id ON lexicon_light_saber(parent_id);",
);
sqlLines.push("");

for (const entry of entries) {
  const parentSubquery = entry.parentLexiconId
    ? `(SELECT id FROM lexicon_light_saber WHERE lexicon_id = '${sqlQuote(entry.parentLexiconId)}' LIMIT 1)`
    : "NULL";
  sqlLines.push(
    `INSERT INTO lexicon_light_saber (lexicon_id, parent_id, name, description, deleted_at, source)`,
  );
  sqlLines.push(
    `VALUES ('${sqlQuote(entry.lexiconId)}', ${parentSubquery}, '${sqlQuote(entry.name)}', ${
      entry.description ? `'${sqlQuote(entry.description)}'` : "NULL"
    }, NULL, 'seed')`,
  );
  sqlLines.push("ON CONFLICT(lexicon_id) DO UPDATE SET");
  sqlLines.push("  parent_id = excluded.parent_id,");
  sqlLines.push("  name = excluded.name,");
  sqlLines.push("  description = excluded.description,");
  sqlLines.push("  deleted_at = NULL,");
  sqlLines.push("  source = 'seed';");
  sqlLines.push("");
}

sqlLines.push(
  "UPDATE lexicon_light_saber SET deleted_at = CURRENT_TIMESTAMP WHERE source = 'seed' AND lexicon_id NOT IN (",
);
for (let i = 0; i < entries.length; i += 1) {
  const suffix = i === entries.length - 1 ? "" : ",";
  sqlLines.push(`  '${sqlQuote(entries[i].lexiconId)}'${suffix}`);
}
sqlLines.push(");");

await writeFile(sqlPath, sqlLines.join("\n").trimEnd() + "\n", "utf-8");

console.log("Light saber lexicon synced to:");
console.log(`- ${workerPath}`);
console.log(`- ${sqlPath}`);
