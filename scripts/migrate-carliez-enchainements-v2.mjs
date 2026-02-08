import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const d1StateDir = path.join(
  root,
  "backend",
  "worker",
  ".wrangler",
  "state",
  "v3",
  "d1",
  "miniflare-D1DatabaseObject",
);

function findActiveLocalD1Database() {
  if (!fs.existsSync(d1StateDir)) {
    throw new Error(`D1 state directory not found: ${d1StateDir}`);
  }
  const candidates = fs
    .readdirSync(d1StateDir)
    .filter((entry) => entry.endsWith(".sqlite"))
    .map((entry) => path.join(d1StateDir, entry));
  if (!candidates.length) {
    throw new Error(`No sqlite DB found in: ${d1StateDir}`);
  }

  let best = null;
  for (const dbPath of candidates) {
    let db;
    try {
      db = new DatabaseSync(dbPath);
      const table = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='combats'")
        .get();
      if (!table?.name) continue;
      const row = db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM combats
           WHERE lower(name) LIKE '%encha%' AND lower(name) LIKE '%carliez%'`,
        )
        .get();
      const count = Number(row?.count ?? 0);
      if (!best || count > best.count) {
        best = { dbPath, count };
      }
    } finally {
      db?.close();
    }
  }
  if (!best) {
    throw new Error("No active local D1 sqlite database with combats table found.");
  }
  return best.dbPath;
}

function saveBackupFile(payload) {
  const dir = path.join(root, "exports");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `carliez-enchainements-before-v2-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf-8");
  return file;
}

function migrate() {
  const dbPath = findActiveLocalD1Database();
  const db = new DatabaseSync(dbPath);

  const combats = db
    .prepare(
      `SELECT id, name, description, type, is_demo, created_at, updated_at
       FROM combats
       WHERE lower(name) LIKE '%encha%' AND lower(name) LIKE '%carliez%'
       ORDER BY id`,
    )
    .all();

  if (!combats.length) {
    db.close();
    console.log("No Carliez enchainements combat found.");
    return;
  }

  const backupPayload = {
    exported_at: new Date().toISOString(),
    combats: combats.map((combat) => {
      const phrases = db
        .prepare(
          `SELECT id, combat_id, position, payload, created_at
           FROM combat_phrases
           WHERE combat_id = ?1
           ORDER BY position`,
        )
        .all(combat.id)
        .map((row) => ({
          ...row,
          payload: JSON.parse(row.payload),
        }));
      return {
        combat,
        phrases,
      };
    }),
  };
  const backupPath = saveBackupFile(backupPayload);

  const selectPhrases = db.prepare(
    `SELECT id, payload
     FROM combat_phrases
     WHERE combat_id = ?1
     ORDER BY position`,
  );
  const updatePhrase = db.prepare(
    "UPDATE combat_phrases SET payload = ?1 WHERE id = ?2",
  );
  const updateCombat = db.prepare(
    "UPDATE combats SET updated_at = ?1 WHERE id = ?2",
  );

  let phrasesUpdated = 0;
  let stepsUpdated = 0;
  let lexiconRewritten = 0;

  db.exec("BEGIN TRANSACTION");
  try {
    for (const combat of combats) {
      const rows = selectPhrases.all(combat.id);
      for (const row of rows) {
        let payload;
        try {
          payload = JSON.parse(row.payload);
        } catch {
          continue;
        }
        const steps = Array.isArray(payload?.steps) ? payload.steps : [];
        if (!steps.length) continue;

        const nextSteps = steps.map((step) => {
          const currentLexicon =
            typeof step?.lexicon === "string" ? step.lexicon : "";
          if (currentLexicon !== "classic-v2") lexiconRewritten += 1;
          stepsUpdated += 1;
          return {
            ...step,
            lexicon: "classic-v2",
          };
        });

        const nextPayload = {
          ...payload,
          steps: nextSteps,
        };
        updatePhrase.run(JSON.stringify(nextPayload), row.id);
        phrasesUpdated += 1;
      }
      updateCombat.run(new Date().toISOString(), combat.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    db.close();
    throw error;
  }

  console.log(`DB: ${dbPath}`);
  console.log(`Backup: ${backupPath}`);
  console.log(`Combats migrated: ${combats.length}`);
  console.log(`Phrases updated: ${phrasesUpdated}`);
  console.log(`Steps scanned: ${stepsUpdated}`);
  console.log(`Steps set to classic-v2: ${lexiconRewritten}`);
  console.log(`Combat IDs: ${combats.map((combat) => combat.id).join(", ")}`);

  db.close();
}

migrate();
