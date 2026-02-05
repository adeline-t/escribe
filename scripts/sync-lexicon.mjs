import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcPath = path.join(root, "frontend", "src", "data", "lexicon.json");
const workerPath = path.join(root, "backend", "worker", "src", "lexicon.seed.json");
const sqlPath = path.join(root, "db", "lexicon.sql");

const mapTable = {
  offensive: "offensive",
  action: "action",
  defensive: "defensive",
  cible: "cible",
  "deplacement-attaque": "deplacement_attaque",
  "deplacement-defense": "deplacement_defense",
  "parade-numero": "parade_numero",
  "parade-attribut": "parade_attribut",
  "attaque-attribut": "attaque_attribut"
};

function sqlQuote(value) {
  return value.replace(/'/g, "''");
}

const lexiconRaw = await readFile(srcPath, "utf-8");
const lexicon = JSON.parse(lexiconRaw);

await writeFile(workerPath, JSON.stringify(lexicon, null, 2) + "\n", "utf-8");

const sqlLines = [];
for (const [key, table] of Object.entries(mapTable)) {
  const items = lexicon[key] ?? [];
  sqlLines.push(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`);
  sqlLines.push(`DELETE FROM ${table};`);
  for (const item of items) {
    sqlLines.push(`INSERT INTO ${table} (label) VALUES ('${sqlQuote(item)}');`);
  }
  sqlLines.push("");
}

await writeFile(sqlPath, sqlLines.join("\n").trimEnd() + "\n", "utf-8");

console.log("Lexicon synced to:");
console.log(`- ${workerPath}`);
console.log(`- ${sqlPath}`);
