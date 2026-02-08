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

const EMPTY_NOTE_PARTICIPANT = {
  mode: "note",
  role: "none",
  offensive: "",
  action: "",
  actionDetails: [],
  target: "",
  attackMove: "",
  attackAttribute: [],
  defense: "",
  defenseDetails: [],
  paradeNumber: "",
  paradeAttribute: "",
  defendMove: "",
  chorePhase: "",
  note: "",
  noteOverrides: true,
};

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDelimitedBits(value) {
  return trimString(value)
    .split(" · ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(" ");
}

function buildAttackActionLabel(participant) {
  const details = Array.isArray(participant?.actionDetails)
    ? participant.actionDetails
    : [];
  const fromDetails = details
    .map((detail) =>
      [trimString(detail?.action), trimString(detail?.attribute)]
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join(" · ");
  if (fromDetails) return fromDetails;
  const fromFallback = [trimString(participant?.action)]
    .filter(Boolean)
    .join(" ");
  return fromFallback;
}

function buildDefenseLabel(participant) {
  const details = Array.isArray(participant?.defenseDetails)
    ? participant.defenseDetails
    : [];
  const fromDetails = details
    .map((detail) => {
      const parts = [];
      const defense = trimString(detail?.defense);
      const position = trimString(detail?.position);
      const attribute = trimString(detail?.attribute);
      if (defense) parts.push(defense);
      if (position) parts.push(`de ${position}`);
      if (attribute) parts.push(attribute);
      return parts.join(" ");
    })
    .filter(Boolean)
    .join(" · ");
  if (fromDetails) return fromDetails;
  const defense = trimString(participant?.defense || participant?.defensive);
  const parade = [
    trimString(participant?.paradeNumber),
    trimString(participant?.paradeAttribute),
  ]
    .filter(Boolean)
    .join(" ");
  return [defense, parade ? `de ${parade}` : ""].filter(Boolean).join(" ");
}

function buildPreparationPositionLabel(participant) {
  const details = Array.isArray(participant?.actionDetails)
    ? participant.actionDetails
    : [];
  const position =
    trimString(details?.[0]?.attribute) ||
    trimString(Array.isArray(participant?.attackAttribute)
      ? participant.attackAttribute[0]
      : "");
  const complements = Array.isArray(participant?.attackAttribute)
    ? participant.attackAttribute
        .map((entry) => trimString(entry))
        .filter(Boolean)
        .filter((entry) => entry !== position)
    : [];
  return [position, ...complements].filter(Boolean).join(" ");
}

function buildAutoNote(participant) {
  const existingNote = trimString(participant?.note);
  if (existingNote) return existingNote;

  if (participant?.mode === "choregraphie") {
    return trimString(participant?.chorePhase);
  }

  const role = trimString(participant?.role);
  if (role === "attack") {
    const offensive = trimString(participant?.offensive);
    const actionLabel = buildAttackActionLabel(participant);
    const target = trimString(participant?.target);
    const move = formatDelimitedBits(participant?.attackMove);
    return [
      offensive,
      actionLabel ? `en ${actionLabel}` : "",
      target ? `sur ${target}` : "",
      move ? `avec ${move}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (role === "preparation") {
    const actionLabel = buildAttackActionLabel(participant);
    const target = trimString(participant?.target);
    const positionLabel = buildPreparationPositionLabel(participant);
    return [
      "préparation",
      actionLabel,
      target ? `sur ${target}` : "",
      positionLabel ? `en ${positionLabel}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (role === "defense") {
    const defenseLabel = buildDefenseLabel(participant);
    const move = formatDelimitedBits(participant?.defendMove);
    return [defenseLabel, move ? `en ${move}` : ""].filter(Boolean).join(" ");
  }

  return "";
}

function toNoteParticipant(participant) {
  const note = buildAutoNote(participant);
  return {
    ...EMPTY_NOTE_PARTICIPANT,
    note,
  };
}

function toV2NoteStep(step) {
  const participants = Array.isArray(step?.participants) ? step.participants : [];
  return {
    ...step,
    lexicon: "classic-v2",
    participants: participants.map((participant) => toNoteParticipant(participant)),
  };
}

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
           WHERE lower(name) LIKE '%salut%' AND lower(description) LIKE '%carliez%'`,
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

function migrate() {
  const dbPath = findActiveLocalD1Database();
  const db = new DatabaseSync(dbPath);

  const targetCombats = db
    .prepare(
      `SELECT id, name
       FROM combats
       WHERE lower(name) LIKE '%salut%' AND lower(description) LIKE '%carliez%'
       ORDER BY id`,
    )
    .all();

  if (!targetCombats.length) {
    db.close();
    console.log("No Carliez salut combats found.");
    return;
  }

  const combatIds = targetCombats.map((combat) => Number(combat.id));
  const placeholders = combatIds.map(() => "?").join(",");
  const phraseRows = db
    .prepare(
      `SELECT id, combat_id, position, payload
       FROM combat_phrases
       WHERE combat_id IN (${placeholders})
       ORDER BY combat_id, position`,
    )
    .all(...combatIds);

  const updatePhrase = db.prepare(
    "UPDATE combat_phrases SET payload = ?1 WHERE id = ?2",
  );
  const updateCombat = db.prepare(
    "UPDATE combats SET updated_at = ?1 WHERE id = ?2",
  );

  let phrasesUpdated = 0;
  let stepsUpdated = 0;
  let participantsUpdated = 0;

  db.exec("BEGIN TRANSACTION");
  try {
    for (const row of phraseRows) {
      let payload;
      try {
        payload = JSON.parse(row.payload);
      } catch {
        continue;
      }
      const steps = Array.isArray(payload?.steps) ? payload.steps : [];
      if (!steps.length) continue;

      const migratedSteps = steps.map((step) => {
        const participants = Array.isArray(step?.participants)
          ? step.participants
          : [];
        participantsUpdated += participants.length;
        stepsUpdated += 1;
        return toV2NoteStep(step);
      });

      const nextPayload = {
        ...payload,
        steps: migratedSteps,
      };

      updatePhrase.run(JSON.stringify(nextPayload), row.id);
      phrasesUpdated += 1;
    }

    const now = new Date().toISOString();
    for (const combatId of combatIds) {
      updateCombat.run(now, combatId);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    db.close();
    throw error;
  }

  console.log(`DB: ${dbPath}`);
  console.log(`Combats migrated: ${targetCombats.length}`);
  console.log(`Phrases migrated: ${phrasesUpdated}`);
  console.log(`Steps migrated: ${stepsUpdated}`);
  console.log(`Participants migrated to note: ${participantsUpdated}`);
  console.log(
    `Combat IDs: ${targetCombats.map((combat) => combat.id).join(", ")}`,
  );

  db.close();
}

migrate();
