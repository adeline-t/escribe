import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);

function getArg(name, fallback = null) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const inputFile = getArg("--input");
const outputFile = getArg("--output");
const lexiconFile = path.resolve("frontend/src/data/new-lexicon.json");

if (!inputFile || !outputFile) {
  console.error(
    "Usage: node scripts/csv-to-v2-import-json.mjs --input <csv> --output <json>",
  );
  process.exit(1);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(list) {
  return [...new Set(list.filter(Boolean))];
}

function parseCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ";" && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);
  return out;
}

function readCsvRows(filePath) {
  const content = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  return content.split(/\r?\n/).map(parseCsvLine);
}

function cleanCell(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (["ç", "è", "0", "1"].includes(value)) return "";
  return value;
}

function isPhraseMarker(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  return /^tout\s*:/i.test(value) || /^phrase\s*\d+/i.test(value);
}

function formatPhraseName(raw, fallbackIndex) {
  let name = String(raw || "").trim();
  if (!name) return `Phrase ${fallbackIndex + 1}`;
  name = name.replace(/^tout\s*:\s*/i, "").trim();
  const withAlias = name.match(/^phrase\s*\d+\s*\([^)]*\)\s*:\s*(.+)$/i);
  if (withAlias?.[1]) return withAlias[1].trim();
  return name;
}

function normalizeParticipantName(raw, fallbackIndex) {
  const value = String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
  return value || `Combattant ${fallbackIndex + 1}`;
}

function findHeaderRow(rows, markerIndex) {
  for (
    let i = markerIndex + 1;
    i < Math.min(rows.length, markerIndex + 12);
    i += 1
  ) {
    const row = rows[i] || [];
    const hasOffensive = row.some((cell) => normalize(cell) === "offensive");
    if (hasOffensive) {
      return {
        headerIndex: i,
        namesIndex: i - 1,
      };
    }
  }
  return null;
}

function buildLexiconHelpers(lexicon) {
  const offensive = lexicon.actions_escrime.actions_offensives;
  const defensives = lexicon.actions_escrime.actions_defensives;
  const preparations = lexicon.actions_escrime.preparations;
  const mouvement = lexicon.mouvement;

  const maps = {
    attacks: new Map(offensive.attaques.map((v) => [normalize(v), v])),
    attackAttrs: new Map(offensive.complements.map((v) => [normalize(v), v])),
    defenseActions: new Map(defensives.esquive.map((v) => [normalize(v), v])),
    prepActions: new Map(
      [
        ...preparations.engagement,
        ...preparations.attaques_au_fer,
        ...preparations.prises_de_fer,
        ...preparations.sans_contact,
        ...preparations.composees,
      ].map((v) => [normalize(v), v]),
    ),
    moves: new Map(mouvement.deplacement.map((v) => [normalize(v), v])),
    moveComplements: new Map(
      mouvement.deplacement_complement.map((v) => [normalize(v), v]),
    ),
    targets: new Map(mouvement.cible.map((v) => [normalize(v), v])),
    positionNumbers: new Set(mouvement.position.map((v) => String(v))),
    positionAttrs: new Map(
      mouvement.position_complements.map((v) => [normalize(v), v]),
    ),
  };

  return maps;
}

function addNote(notes, label, raw) {
  const value = cleanCell(raw);
  if (!value) return;
  notes.push(`${label}: ${value}`);
}

function parseMovement(raw, maps, notes) {
  const source = cleanCell(raw);
  if (!source) return { move: "", complements: [] };

  const n = normalize(source);
  const baseCandidates = [
    ["redoublement de fente", "redoublement de fente"],
    ["retour en garde", "retour en garde"],
    ["changement de garde", "changement de garde"],
    ["appel de pied", "appel de pied"],
    ["demi marche", "demi-marche"],
    ["demi passe", "demi-passe"],
    ["demi retraite", "demi-retraite"],
    ["demi volte", "demi-volte"],
    ["quart de volte", "quart de volte"],
    ["balestra", "balestra"],
    ["bond", "bond saut"],
    ["deplacement", "déplacement"],
    ["fente", "fente"],
    ["fleche", "flèche"],
    ["marche", "marche"],
    ["passe", "passe"],
    ["retraite", "retraite"],
    ["volte", "volte"],
  ];

  let base = "";
  for (const [token, mapped] of baseCandidates) {
    if (n.includes(token)) {
      const canonical = maps.moves.get(normalize(mapped));
      if (canonical) {
        base = canonical;
      }
      break;
    }
  }

  const complements = [];
  if (/\bavant\b/.test(n)) complements.push("avant");
  if (/\barriere?\b/.test(n)) complements.push("arrière");
  if (/\blateral|laterale\b/.test(n)) complements.push("latérale");
  if (/\binterne|interieur\b/.test(n)) complements.push("intérieur");
  if (/\bexterne|exterieur\b/.test(n)) complements.push("extérieur");
  if (/\binverse|inversee\b/.test(n)) complements.push("inverse");

  const canonicalComplements = uniq(
    complements
      .map((c) => maps.moveComplements.get(normalize(c)))
      .filter(Boolean),
  );

  if (!base) {
    addNote(notes, "déplacement", source);
  }

  return { move: base, complements: canonicalComplements };
}

function mapTarget(raw, maps, notes) {
  const source = cleanCell(raw);
  if (!source) return "";
  const n = normalize(source);
  const direct = maps.targets.get(n);
  if (direct) return direct;
  if (n === "epaule") {
    return maps.targets.get(normalize("épaule avant")) || "";
  }
  addNote(notes, "cible", source);
  return "";
}

function mapAttackAction(raw, maps, notes) {
  const source = cleanCell(raw);
  if (!source) return { action: "", attrs: [], prepAction: "" };
  const n = normalize(source);

  const prepDirect = maps.prepActions.get(n);
  if (prepDirect) {
    return { action: "", attrs: [], prepAction: prepDirect };
  }

  if (n.startsWith("degagement")) {
    return {
      action: "",
      attrs: [],
      prepAction: maps.prepActions.get(normalize("dégagement")) || "",
    };
  }
  if (n.startsWith("coupe")) {
    return {
      action: "",
      attrs: [],
      prepAction: maps.prepActions.get(normalize("coupé")) || "",
    };
  }

  const attrs = [];
  const attackAction = maps.attacks.get(normalize("coup de pointe"));
  const sliceAction = maps.attacks.get(normalize("coupe de tranche"));

  if (n.startsWith("coup de pointe")) {
    return { action: attackAction || "", attrs, prepAction: "" };
  }

  if (
    n.startsWith("tranche") ||
    n.startsWith("brise") ||
    n.startsWith("couronne") ||
    n.startsWith("moulinet") ||
    n.startsWith("banderole") ||
    n.startsWith("terrasse") ||
    n.startsWith("enleve")
  ) {
    if (n.includes("brise")) attrs.push("brisé");
    if (n.includes("couronne")) attrs.push("couronne");
    if (n.includes("banderole")) attrs.push("banderole");
    if (n.includes("terrasse")) attrs.push("terrassé");
    if (n.includes("enleve")) attrs.push("enlevé");
    if (n.includes("interieur")) attrs.push("revers intérieur");
    if (n.includes("exterieur")) attrs.push("avers extérieur");
    if (n.includes("supination")) attrs.push("supination");
    const canonicalAttrs = uniq(
      attrs
        .map((a) => maps.attackAttrs.get(normalize(a)))
        .filter(Boolean),
    );
    if (
      !n.startsWith("tranche") &&
      !n.startsWith("brise") &&
      !n.startsWith("couronne")
    ) {
      addNote(notes, "action", source);
    }
    return { action: sliceAction || "", attrs: canonicalAttrs, prepAction: "" };
  }

  addNote(notes, "action", source);
  return { action: "", attrs: [], prepAction: "" };
}

function mapDefense(raw, positionRaw, pvarRaw, maps, notes) {
  const defensive = cleanCell(raw);
  const position = cleanCell(positionRaw);
  const pvar = cleanCell(pvarRaw);
  const n = normalize(defensive);

  const out = {
    defense: "",
    defenseDetail: "",
    paradeNumber: "",
    paradeAttribute: "",
    defendMoveNote: "",
  };

  if (position && maps.positionNumbers.has(position)) {
    out.paradeNumber = position;
  } else if (position) {
    addNote(notes, "position", position);
  }

  const attrs = [];
  if (pvar) {
    const attr = maps.positionAttrs.get(normalize(pvar));
    if (attr) attrs.push(attr);
    else addNote(notes, "attribut position", pvar);
  }

  if (defensive) {
    if (n.includes("esquive") || n === normalize("déséquilibre")) {
      out.defense = "esquive";
      const direct = maps.defenseActions.get(n);
      out.defenseDetail = direct || defensive;
      if (!direct) addNote(notes, "défense", defensive);
    } else if (n.includes("parade") || n === normalize("ramassé")) {
      out.defense = "parade";
      out.defenseDetail = "parade";
      if (n.includes("en cedant")) attrs.push("en cédant");
      if (n.includes("semi circulaire")) attrs.push("semi-circulaire");
      if (n.includes("circulaire") && !n.includes("semi circulaire")) {
        attrs.push("circulaire");
      }
      if (n.includes("en croix")) attrs.push("en croix");
      if (n.includes("en double")) attrs.push("double");
      if (n.includes("dague")) attrs.push("dague bocle");
      if (n.includes("main")) attrs.push("main libre");
      if (n.includes("bouclier") || n.includes("cape")) attrs.push("objet");
      if (n.includes("oposition") || n.includes("opposition")) {
        attrs.push("opposition");
      }
      if (n.includes(normalize("ramassé"))) attrs.push("ramassé");
    } else {
      addNote(notes, "défense", defensive);
    }
  }

  const canonicalAttrs = uniq(
    attrs
      .map((a) => maps.positionAttrs.get(normalize(a)))
      .filter(Boolean),
  );

  if (canonicalAttrs.length > 0) {
    out.paradeAttribute = canonicalAttrs[0];
  }

  return out;
}

function makeEmptyParticipant() {
  return {
    mode: "combat",
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
    noteOverrides: false,
  };
}

function hasParticipantContent(item) {
  return Boolean(
    item.note ||
      item.action ||
      item.target ||
      item.attackMove ||
      item.attackAttribute?.length ||
      item.defense ||
      item.paradeNumber ||
      item.paradeAttribute ||
      item.defendMove ||
      item.offensive,
  );
}

function buildParticipantItem(rawCols, maps) {
  const [offensiveTypeRaw, offensiveValueRaw, targetRaw, defenseRaw, positionRaw, pvarRaw, movementRaw] = rawCols;

  const notes = [];
  const item = makeEmptyParticipant();

  const offensiveType = cleanCell(offensiveTypeRaw);
  const offensiveNorm = normalize(offensiveType);
  const target = mapTarget(targetRaw, maps, notes);
  const movement = parseMovement(movementRaw, maps, notes);
  const attackAction = mapAttackAction(offensiveValueRaw, maps, notes);
  const defense = mapDefense(defenseRaw, positionRaw, pvarRaw, maps, notes);

  const hasAttackSignal = Boolean(
    offensiveType || cleanCell(offensiveValueRaw) || cleanCell(targetRaw),
  );
  const hasDefenseSignal = Boolean(
    cleanCell(defenseRaw) || cleanCell(positionRaw) || cleanCell(pvarRaw),
  );

  let role = "none";
  if (hasAttackSignal) {
    role = "attack";
    if (
      [
        normalize("feinte"),
        normalize("prise de fer"),
        normalize("menace"),
        normalize("invitation"),
      ].includes(offensiveNorm) ||
      attackAction.prepAction
    ) {
      role = "preparation";
    }
  } else if (hasDefenseSignal) {
    role = "defense";
  }

  if (role === "attack" || role === "preparation") {
    item.role = role;
    item.offensive = "";

    if (role === "preparation") {
      if (offensiveNorm === normalize("feinte")) {
        item.action = maps.prepActions.get(normalize("feinte")) || "";
      } else if (offensiveNorm === normalize("prise de fer")) {
        if (attackAction.prepAction) item.action = attackAction.prepAction;
      } else if (offensiveNorm === normalize("invitation")) {
        item.action = maps.prepActions.get(normalize("invite")) || "";
      } else if (offensiveNorm === normalize("menace")) {
        item.action = maps.prepActions.get(normalize("menace")) || "";
      } else if (attackAction.prepAction) {
        item.action = attackAction.prepAction;
      }

      if (!item.action && offensiveType) {
        addNote(notes, "offensive", offensiveType);
      }
      if (!item.action && cleanCell(offensiveValueRaw)) {
        addNote(notes, "action", offensiveValueRaw);
      }

      item.actionDetails = item.action
        ? [{ action: item.action, attribute: "" }]
        : [];
    } else {
      // En v2, l'action d'attaque est portée par "offensive".
      item.offensive = attackAction.action || "";
      item.action = attackAction.action || "";
      item.actionDetails = item.action
        ? [{ action: item.action, attribute: "" }]
        : [];

      if (!item.action && cleanCell(offensiveValueRaw)) {
        addNote(notes, "action", offensiveValueRaw);
      }
      if (offensiveType && offensiveNorm !== normalize("attaque")) {
        addNote(notes, "offensive", offensiveType);
      }
    }

    item.target = target;
    item.attackMove = movement.move;
    item.attackAttribute = uniq([
      ...attackAction.attrs,
      ...movement.complements,
    ]);

    if (hasDefenseSignal) {
      const defenseRawSummary = [
        cleanCell(defenseRaw),
        cleanCell(positionRaw),
        cleanCell(pvarRaw),
      ]
        .filter(Boolean)
        .join(" ");
      if (defenseRawSummary) {
        notes.push(`défense secondaire: ${defenseRawSummary}`);
      }
    }
  } else if (role === "defense") {
    item.role = "defense";
    item.defense = defense.defense || "";
    item.paradeNumber = defense.paradeNumber || "";
    item.paradeAttribute = defense.paradeAttribute || "";
    item.defendMove = movement.move || "";

    if (item.defense === "parade") {
      item.defenseDetails = [
        {
          defense: "parade",
          position: item.paradeNumber,
          attribute: item.paradeAttribute,
        },
      ];
    } else if (item.defense === "esquive") {
      item.defenseDetails = [
        {
          defense: defense.defenseDetail || "esquive",
          position: "",
          attribute: "",
        },
      ];
    }

    if (!item.defense && cleanCell(defenseRaw)) {
      addNote(notes, "défense", defenseRaw);
    }
  } else if (movement.move) {
    item.mode = "note";
    item.role = "none";
    item.note = `déplacement: ${cleanCell(movementRaw)}`;
    return item;
  }

  if (notes.length > 0) {
    item.note = notes.join(" · ");
  }

  if (!hasParticipantContent(item)) {
    return makeEmptyParticipant();
  }

  return item;
}

function parseCsvToCombat(rows, maps, fileName) {
  const markers = [];
  rows.forEach((row, idx) => {
    if (isPhraseMarker(row?.[0])) markers.push(idx);
  });

  const globalParticipants = [];
  const phrases = [];

  markers.forEach((markerIndex, markerPos) => {
    const header = findHeaderRow(rows, markerIndex);
    if (!header) return;

    const headerRow = rows[header.headerIndex] || [];
    const namesRow = rows[header.namesIndex] || [];
    const groupStarts = headerRow
      .map((cell, idx) => (normalize(cell) === "offensive" ? idx : -1))
      .filter((idx) => idx >= 0);
    if (!groupStarts.length) return;

    const localNames = groupStarts.map((start, idx) =>
      normalizeParticipantName(namesRow[start], idx),
    );

    localNames.forEach((name) => {
      if (!globalParticipants.includes(name)) {
        globalParticipants.push(name);
      }
    });

    const localToGlobal = localNames.map((name) => globalParticipants.indexOf(name));

    const nextMarker = markers[markerPos + 1] ?? rows.length;
    const steps = [];

    for (let rowIndex = header.headerIndex + 1; rowIndex < nextMarker; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      if (!row.length) continue;

      const participants = globalParticipants.map(() => makeEmptyParticipant());

      groupStarts.forEach((start, localIndex) => {
        const cols = [
          row[start],
          row[start + 1],
          row[start + 2],
          row[start + 3],
          row[start + 4],
          row[start + 5],
          row[start + 6],
        ];

        const item = buildParticipantItem(cols, maps);
        participants[localToGlobal[localIndex]] = item;
      });

      const hasAnyContent = participants.some((item) => hasParticipantContent(item));
      if (!hasAnyContent) continue;

      steps.push({
        id: crypto.randomUUID(),
        lexicon: "classic-v2",
        participants,
      });
    }

    if (!steps.length) return;

    phrases.push({
      id: markerPos + 1,
      combat_id: 0,
      position: phrases.length,
      payload: {
        id: crypto.randomUUID(),
        name: formatPhraseName(rows[markerIndex]?.[0], markerPos),
        steps,
      },
      created_at: new Date().toISOString(),
    });
  });

  const participants = globalParticipants.map((name) => ({ name, weapon: "" }));
  const draft = participants.map(() => ({
    mode: "combat",
    role: "attack",
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
    noteOverrides: false,
  }));

  const combatName = path.basename(fileName, path.extname(fileName));

  return {
    exported_at: new Date().toISOString(),
    source: "csv-v2-mapped",
    combat: {
      id: 0,
      name: combatName,
      description: "Import CSV vers lexique v2",
      participants,
      draft,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: 0,
      type: "classic",
      is_demo: 0,
    },
    phrases,
  };
}

const lexicon = JSON.parse(fs.readFileSync(lexiconFile, "utf-8"));
const maps = buildLexiconHelpers(lexicon);
const rows = readCsvRows(path.resolve(inputFile));
const payload = parseCsvToCombat(rows, maps, inputFile);

fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true });
fs.writeFileSync(path.resolve(outputFile), JSON.stringify(payload, null, 2), "utf-8");

console.log(`Generated ${path.resolve(outputFile)}`);
console.log(
  `Participants: ${payload.combat.participants.length} | Phrases: ${payload.phrases.length} | Steps: ${payload.phrases.reduce((s, p) => s + (p.payload.steps?.length || 0), 0)}`,
);
