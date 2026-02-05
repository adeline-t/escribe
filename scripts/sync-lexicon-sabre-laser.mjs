import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcPath = path.join(root, "frontend", "src", "data", "lexicon-sabre-laser.json");
const workerPath = path.join(root, "backend", "worker", "src", "lexicon-sabre-laser.seed.json");
const sqlPath = path.join(root, "db", "lexicon-sabre-laser.sql");

const mapTable = {
  armes: "sl_armes",
  phases_choregraphie: "sl_phases_choregraphie",
  cibles: "sl_cibles",
  techniques_offensives: "sl_techniques_offensives",
  attributs_offensifs: "sl_attributs_offensifs",
  techniques_defensives: "sl_techniques_defensives",
  attributs_defensifs: "sl_attributs_defensifs",
  preparations: "sl_preparations",
  deplacements: "sl_deplacements"
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

console.log("Sabre-laser lexicon synced to:");
console.log(`- ${workerPath}`);
console.log(`- ${sqlPath}`);
