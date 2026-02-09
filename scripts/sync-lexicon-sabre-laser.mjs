import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcPath = path.join(root, "frontend", "src", "data", "lexicon-sabre-laser.json");
const workerPath = path.join(root, "backend", "worker", "src", "lexicon-sabre-laser.seed.json");
const sqlPath = path.join(root, "db", "lexicon-sabre-laser.sql");

const mapTable = {
  armes: "sl_weapons",
  phases_choregraphie: "sl_choreography_phases",
  cibles: "sl_targets",
  techniques_offensives: "sl_offensive_techniques",
  attributs_offensifs: "sl_offensive_attributes",
  techniques_defensives: "sl_defensive_techniques",
  attributs_defensifs: "sl_defensive_attributes",
  preparations: "sl_preparations",
  deplacements: "sl_movements"
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
