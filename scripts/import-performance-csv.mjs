#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const WORKSPACE_ROOT = process.cwd();
const DEFAULT_CSV_PATH = path.resolve(
  WORKSPACE_ROOT,
  "exports/Duel rapière lame plate renaissance - 2025-02.csv",
);
const DEFAULT_SQL_PATH = path.resolve(
  WORKSPACE_ROOT,
  "db/import-performances.sql",
);
const DEFAULT_JSON_PATH = path.resolve(
  WORKSPACE_ROOT,
  "exports/duel-rapiere-lame-plate-renaissance-v2-import.json",
);
const DEFAULT_OWNER_EMAIL = "touze.adeline@gmail.com";
const DEFAULT_DESCRIPTION = "Import CSV vers lexique v2";
const DEFAULT_PERFORMANCE_TYPE = "classic";

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "1";
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCell(value) {
  return String(value ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\r/g, "")
    .trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueValues(values) {
  const out = [];
  const seen = new Set();
  for (const value of ensureArray(values)) {
    const entry = String(value ?? "").trim();
    if (!entry) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);
    out.push(entry);
  }
  return out;
}

function sqlQuote(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

function queryLocalD1(sql) {
  const output = execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "escribe-dev",
      "--config",
      "backend/worker/wrangler.toml",
      "--env=local",
      "--local",
      "--command",
      sql,
      "--json",
    ],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
    },
  );
  const payload = JSON.parse(output);
  return ensureArray(payload?.[0]?.results);
}

function queryLabelList(tableName) {
  const rows = queryLocalD1(`SELECT label FROM ${tableName} ORDER BY label;`);
  return uniqueValues(rows.map((row) => row?.label));
}

function loadLexicon() {
  return {
    offensive: queryLabelList("nl_offensive"),
    action: queryLabelList("nl_action"),
    defensive: queryLabelList("nl_defensive"),
    target: queryLabelList("nl_target"),
    movement: queryLabelList("nl_movement"),
    movementComplement: queryLabelList("nl_movement_complement"),
    guardNumber: queryLabelList("nl_guard_number"),
    guardAttribute: queryLabelList("nl_guard_attribute"),
    attackAttribute: queryLabelList("nl_attack_attribute"),
  };
}

function buildLookup(values) {
  const map = new Map();
  for (const value of ensureArray(values)) {
    map.set(normalizeText(value), value);
  }
  return map;
}

function addTypedNote(noteList, typeLabel, value) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) return;
  const entry = `${typeLabel}: ${cleaned}`;
  if (!noteList.includes(entry)) noteList.push(entry);
}

function splitByDelimiters(value) {
  return String(value ?? "")
    .split(/[·,/]| et /gi)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapDirect(rawValue, lookup) {
  const normalized = normalizeText(rawValue);
  if (!normalized) return "";
  return lookup.get(normalized) ?? "";
}

function collectMatches(rawValue, canonicalValues) {
  const normalized = normalizeText(rawValue);
  if (!normalized) return [];
  const out = [];
  for (const value of canonicalValues) {
    const candidate = normalizeText(value);
    if (!candidate) continue;
    if (normalized.includes(candidate)) out.push(value);
  }
  return uniqueValues(out);
}

function createEmptyStepPerformer() {
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

function mapTarget(rawTarget, context, noteList) {
  const direct = mapDirect(rawTarget, context.targetLookup);
  if (direct) return direct;

  const normalized = normalizeText(rawTarget);
  if (!normalized) return "";

  if (/\bepaule\b/.test(normalized)) {
    const canonical = normalized.includes("arriere")
      ? context.targetLookup.get(normalizeText("épaule arrière"))
      : context.targetLookup.get(normalizeText("épaule avant"));
    if (canonical) {
      addTypedNote(noteList, "cible", rawTarget);
      return canonical;
    }
  }

  if (/\bavant bras\b|\bbras\b|\bmain\b/.test(normalized)) {
    const canonical = context.targetLookup.get(normalizeText("bras"));
    if (canonical) {
      addTypedNote(noteList, "cible", rawTarget);
      return canonical;
    }
  }

  if (/\bcuisse\b|\btibia\b|\bpied\b|\bjambe\b/.test(normalized)) {
    const canonical = context.targetLookup.get(normalizeText("jambe avant"));
    if (canonical) {
      addTypedNote(noteList, "cible", rawTarget);
      return canonical;
    }
  }

  addTypedNote(noteList, "cible", rawTarget);
  return "";
}

function mapActionLabel(rawValue, context) {
  const direct = mapDirect(rawValue, context.actionLookup);
  if (direct) return direct;

  const normalized = normalizeText(rawValue);
  if (!normalized) return "";

  const aliases = [
    [/batt(e|é)/, "battement"],
    [/changement d engagement/, "changement d'engagement"],
    [/double engagement/, "double engagement"],
    [/degagement/, "dégagement"],
    [/coupe/, "coupé"],
    [/croise|croisee/, "croisé"],
    [/envelopp|enrob/, "enveloppement"],
    [/feinte/, "feinte"],
    [/froissement/, "froissement"],
    [/invite|invitation/, "invite"],
    [/lier|liement/, "liement"],
    [/menace/, "menace"],
    [/opposition/, "opposition"],
    [/pression/, "pression"],
    [/engagement/, "engagement"],
  ];

  for (const [pattern, canonical] of aliases) {
    if (!pattern.test(normalized)) continue;
    const resolved = context.actionLookup.get(normalizeText(canonical));
    if (resolved) return resolved;
  }
  return "";
}

function mapOffensiveLabel(rawValue, context) {
  const direct = mapDirect(rawValue, context.offensiveLookup);
  if (direct) return direct;

  const normalized = normalizeText(rawValue);
  if (!normalized) return "";

  if (normalized.includes("coup de pointe")) {
    return context.offensiveLookup.get(normalizeText("coup de pointe")) ?? "";
  }
  if (
    /\btranche|\btranchee|\bcoupe|\bcoupee|\bbrise|\bcouronn/.test(normalized)
  ) {
    return context.offensiveLookup.get(normalizeText("coupe de tranche")) ?? "";
  }
  return "";
}

function mapGuardNumber(rawValue, context, noteList) {
  const direct = mapDirect(rawValue, context.guardNumberLookup);
  if (direct) return direct;

  const normalized = normalizeText(rawValue);
  if (!normalized) return "";

  const digitMatch = normalized.match(/\b([1-9])\b/);
  if (digitMatch) {
    const resolved = context.guardNumberLookup.get(digitMatch[1]);
    if (resolved) return resolved;
  }

  addTypedNote(noteList, "position", rawValue);
  return "";
}

function extractGuardAttributes(rawValues, context) {
  const output = [];
  const guardAttributeSet = new Set(context.guardAttribute);

  function pushIfExists(label) {
    const canonical = context.guardAttributeLookup.get(normalizeText(label));
    if (!canonical) return;
    if (!guardAttributeSet.has(canonical)) return;
    if (!output.includes(canonical)) output.push(canonical);
  }

  const patterns = [
    [/semi[\s-]*circul/, "semi-circulaire"],
    [/\bcircul/, "circulaire"],
    [/\bhaute?\b/, "haute"],
    [/\bbasse?\b/, "basse"],
    [/\bcedant\b/, "en cédant"],
    [/\bopposition\b/, "opposition"],
    [/\bmain libre\b|\bparade de main\b|\bbate de la main\b/, "main libre"],
    [/\blateral|\blaterale|\blateral/, "latérale"],
    [/\binverse|\binversee|\binversee/, "inversée"],
    [/\bdouble\b/, "double"],
    [/\bcroix\b/, "en croix"],
    [/\bau tac\b|\bactive\b/, "au tac"],
    [/\bramass/, "ramassé"],
    [/\bdague\b|\bbocle\b/, "dague bocle"],
  ];

  for (const rawValue of rawValues) {
    const directMatches = collectMatches(rawValue, context.guardAttribute);
    for (const value of directMatches) {
      if (!output.includes(value)) output.push(value);
    }

    const normalized = normalizeText(rawValue);
    for (const [pattern, canonical] of patterns) {
      if (!pattern.test(normalized)) continue;
      pushIfExists(canonical);
    }
  }

  return output;
}

function extractAttackAttributes(rawValues, context) {
  const output = [];
  const attackAttributeSet = new Set(context.attackAttribute);

  function pushIfExists(label) {
    const canonical = context.attackAttributeLookup.get(normalizeText(label));
    if (!canonical) return;
    if (!attackAttributeSet.has(canonical)) return;
    if (!output.includes(canonical)) output.push(canonical);
  }

  const patterns = [
    [/\bbris/, "brisé"],
    [/\bcouronn/, "couronne"],
    [/\benleve/, "enlevé"],
    [/\bsupination/, "supination"],
    [/\bopposition\b/, "opposition"],
    [/\bmain libre\b/, "main libre"],
    [/\bdague\b|\bbocle\b/, "dague bocle"],
    [/\bterrass/, "terrassé"],
    [/\bdiagonal/, "diagonales"],
    [/\btranche exter/, "avers extérieur"],
    [/\btranche inter/, "revers intérieur"],
    [/\brevers\b/, "revers intérieur"],
  ];

  for (const rawValue of rawValues) {
    const directMatches = collectMatches(rawValue, context.attackAttribute);
    for (const value of directMatches) {
      if (!output.includes(value)) output.push(value);
    }

    const normalized = normalizeText(rawValue);
    for (const [pattern, canonical] of patterns) {
      if (!pattern.test(normalized)) continue;
      pushIfExists(canonical);
    }
  }
  return output;
}

function mapMovement(rawMovement, context, noteList) {
  const normalized = normalizeText(rawMovement);
  if (!normalized) return "";

  const direct = mapDirect(rawMovement, context.movementBaseLookup);
  const complements = [];

  function pushComplement(label) {
    const canonical = context.movementComplementLookup.get(normalizeText(label));
    if (!canonical) return;
    if (!complements.includes(canonical)) complements.push(canonical);
  }

  const complementAliases = [
    [/\bavant\b/, "avant"],
    [/\barriere\b/, "arrière"],
    [/\binterne\b|\binterieur\b/, "intérieur"],
    [/\bexterne\b|\bexterieur\b/, "extérieur"],
    [/\blateral\b|\blaterale\b/, "latérale"],
    [/\binverse|\binversee|\binversee/, "inverse"],
  ];

  for (const [pattern, canonical] of complementAliases) {
    if (!pattern.test(normalized)) continue;
    pushComplement(canonical);
  }

  let base = direct;
  if (!base) {
    for (const candidate of context.movementBaseSorted) {
      const normalizedCandidate = normalizeText(candidate);
      if (!normalizedCandidate) continue;
      if (!normalized.includes(normalizedCandidate)) continue;
      base = candidate;
      break;
    }
  }

  if (!base) {
    if (/\bmise en garde\b/.test(normalized)) {
      base = context.movementBaseLookup.get(normalizeText("retour en garde")) ?? "";
    } else if (/\bbond\b/.test(normalized)) {
      base = context.movementBaseLookup.get(normalizeText("bond saut")) ?? "";
    } else if (/\bcontre volte\b/.test(normalized)) {
      base = context.movementBaseLookup.get(normalizeText("volte")) ?? "";
      addTypedNote(noteList, "déplacement", rawMovement);
    }
  }

  if (!base) {
    addTypedNote(noteList, "déplacement", rawMovement);
    return "";
  }

  return uniqueValues([base, ...complements]).join(" · ");
}

function isPreparationOffensive(rawOffensive) {
  const normalized = normalizeText(rawOffensive);
  if (!normalized) return false;
  return (
    normalized.includes("feinte") ||
    normalized.includes("menace") ||
    normalized.includes("prise de fer") ||
    normalized.includes("attaq au fer") ||
    normalized.includes("attaque au fer")
  );
}

function isGenericAttackMarker(rawOffensive) {
  const normalized = normalizeText(rawOffensive);
  return normalized === "attaque" || normalized === "attack";
}

function hasStructuredContent(stepPerformer) {
  return Boolean(
    stepPerformer.offensive ||
      stepPerformer.action ||
      stepPerformer.target ||
      stepPerformer.attackMove ||
      ensureArray(stepPerformer.attackAttribute).length ||
      stepPerformer.defense ||
      ensureArray(stepPerformer.defenseDetails).length ||
      stepPerformer.paradeNumber ||
      stepPerformer.paradeAttribute ||
      stepPerformer.defendMove ||
      ensureArray(stepPerformer.actionDetails).length,
  );
}

function normalizeDefenseKind(rawDefensive, rawPosition, rawVariant) {
  const normalized = normalizeText(rawDefensive);
  const hasPosition = Boolean(normalizeText(rawPosition));
  const hasVariant = Boolean(normalizeText(rawVariant));
  const looksLikeEsquive =
    normalized.includes("esquive") || normalized.includes("desequilibre");
  const looksLikeParade =
    normalized.includes("parade") ||
    normalized.includes("invitation") ||
    normalized.includes("engagement") ||
    normalized.includes("subit");

  if (looksLikeEsquive && !looksLikeParade) return "esquive";
  if (looksLikeParade) return "parade";
  if (hasPosition || hasVariant) return "parade";
  return "";
}

function mapDefenseLabel(rawDefensive, context) {
  const direct = mapDirect(rawDefensive, context.defensiveLookup);
  if (direct) return direct;
  const normalized = normalizeText(rawDefensive);
  if (!normalized) return "";
  if (normalized.includes("desequilibre")) {
    return context.defensiveLookup.get(normalizeText("déséquilibre")) ?? "";
  }
  if (normalized.includes("esquive arriere")) {
    return context.defensiveLookup.get(normalizeText("esquive arrière")) ?? "";
  }
  if (normalized.includes("esquive basse")) {
    return context.defensiveLookup.get(normalizeText("esquive basse")) ?? "";
  }
  if (normalized.includes("saut")) {
    return context.defensiveLookup.get(normalizeText("esquive en sautant")) ?? "";
  }
  return "";
}

function extractBlock(columns, startIndex) {
  return {
    offensive: cleanCell(columns[startIndex]),
    action: cleanCell(columns[startIndex + 1]),
    target: cleanCell(columns[startIndex + 2]),
    defensive: cleanCell(columns[startIndex + 3]),
    position: cleanCell(columns[startIndex + 4]),
    variant: cleanCell(columns[startIndex + 5]),
    movement: cleanCell(columns[startIndex + 6]),
  };
}

function mapBlockToStepPerformer(block, context, stats) {
  const mapped = createEmptyStepPerformer();
  const notes = [];

  const hasAttackSignals = Boolean(
    normalizeText(block.offensive) ||
      normalizeText(block.action) ||
      normalizeText(block.target),
  );
  const hasDefenseSignals = Boolean(
    normalizeText(block.defensive) ||
      normalizeText(block.position) ||
      normalizeText(block.variant),
  );
  const hasMovementSignal = Boolean(normalizeText(block.movement));

  if (!hasAttackSignals && !hasDefenseSignals && !hasMovementSignal) {
    return mapped;
  }

  const mappedOffensiveFromAction = mapOffensiveLabel(block.action, context);
  const mappedOffensiveFromOffensive = mapOffensiveLabel(block.offensive, context);
  const mappedOffensive = mappedOffensiveFromAction || mappedOffensiveFromOffensive;

  const mappedActionFromAction = mapActionLabel(block.action, context);
  const mappedActionFromOffensive = mapActionLabel(block.offensive, context);
  const mappedPreparationAction = mappedActionFromAction || mappedActionFromOffensive;

  const shouldBePreparation =
    isPreparationOffensive(block.offensive) ||
    (mappedPreparationAction && !mappedOffensive && !isGenericAttackMarker(block.offensive));

  let role = "none";
  if (hasDefenseSignals && !hasAttackSignals) {
    role = "defense";
  } else if (hasAttackSignals && !hasDefenseSignals) {
    role = shouldBePreparation ? "preparation" : "attack";
  } else if (hasAttackSignals && hasDefenseSignals) {
    role = shouldBePreparation ? "preparation" : "attack";
  } else if (hasMovementSignal) {
    role = "none";
  }

  if (role === "attack") {
    mapped.role = "attack";
    mapped.mode = "combat";
    mapped.offensive = mappedOffensive;
    mapped.actionDetails = mappedPreparationAction
      ? [{ action: mappedPreparationAction, attribute: "" }]
      : [];
    mapped.action = mappedPreparationAction || "";
    mapped.target = mapTarget(block.target, context, notes);
    mapped.attackMove = mapMovement(block.movement, context, notes);
    mapped.attackAttribute = extractAttackAttributes(
      [block.action, block.variant],
      context,
    );

    if (block.offensive && !isGenericAttackMarker(block.offensive) && !mappedOffensive) {
      addTypedNote(notes, "offensive", block.offensive);
    }
    if (block.action && !mappedOffensive && !mappedPreparationAction) {
      addTypedNote(notes, "action", block.action);
    }
    if (block.variant && mapped.attackAttribute.length === 0) {
      addTypedNote(notes, "attribut", block.variant);
    }

    if (hasDefenseSignals) {
      const defenseSnippet = [
        block.defensive,
        block.position,
        block.variant,
      ]
        .filter(Boolean)
        .join(" ");
      addTypedNote(notes, "défense", defenseSnippet);
    }
  } else if (role === "preparation") {
    mapped.role = "preparation";
    mapped.mode = "combat";
    mapped.offensive = "preparation";
    mapped.action = mappedPreparationAction;
    const mappedPosition = mapGuardNumber(block.position, context, []);
    mapped.actionDetails = [
      {
        action: mappedPreparationAction,
        attribute: mappedPosition,
      },
    ];
    mapped.target = mapTarget(block.target, context, notes);
    mapped.attackMove = mapMovement(block.movement, context, notes);
    mapped.attackAttribute = extractGuardAttributes(
      [block.variant],
      context,
    );

    if (!mappedPreparationAction && block.action) {
      addTypedNote(notes, "action", block.action);
    }
    if (!mappedPreparationAction && block.offensive) {
      addTypedNote(notes, "offensive", block.offensive);
    }
    if (block.position && !mappedPosition) {
      addTypedNote(notes, "position", block.position);
    }
    if (block.variant && mapped.attackAttribute.length === 0) {
      addTypedNote(notes, "attribut de position", block.variant);
    }
    if (hasDefenseSignals) {
      const defenseSnippet = [
        block.defensive,
        block.position,
        block.variant,
      ]
        .filter(Boolean)
        .join(" ");
      addTypedNote(notes, "défense", defenseSnippet);
    }
  } else if (role === "defense") {
    mapped.role = "defense";
    mapped.mode = "combat";

    const defenseKind = normalizeDefenseKind(
      block.defensive,
      block.position,
      block.variant,
    );
    const mappedMove = mapMovement(block.movement, context, notes);
    mapped.defendMove = mappedMove;

    if (defenseKind === "esquive") {
      const mappedDefenseLabel = mapDefenseLabel(block.defensive, context);
      mapped.defense = "esquive";
      mapped.defenseDetails = [
        {
          defense: mappedDefenseLabel || block.defensive || "esquive",
          position: "",
          attribute: "",
        },
      ];
      if (!mappedDefenseLabel && block.defensive) {
        addTypedNote(notes, "défense", block.defensive);
      }
      if (block.position) addTypedNote(notes, "position", block.position);
      if (block.variant) addTypedNote(notes, "attribut", block.variant);
      mapped.paradeNumber = "";
      mapped.paradeAttribute = "";
    } else {
      mapped.defense = "parade";
      const defenseAttributes = extractGuardAttributes(
        [block.defensive, block.variant],
        context,
      );
      const mappedPosition = mapGuardNumber(block.position, context, []);
      const joinedAttributes = defenseAttributes.join(" · ");
      mapped.defenseDetails = [
        {
          defense: "parade",
          position: mappedPosition,
          attribute: joinedAttributes,
        },
      ];
      mapped.paradeNumber = mappedPosition;
      mapped.paradeAttribute = joinedAttributes;

      const normalizedDefensive = normalizeText(block.defensive);
      if (
        block.defensive &&
        !normalizedDefensive.includes("parade") &&
        !normalizedDefensive.includes("invitation") &&
        !normalizedDefensive.includes("engagement") &&
        !normalizedDefensive.includes("subit")
      ) {
        addTypedNote(notes, "défense", block.defensive);
      }
      if (
        block.defensive &&
        (normalizedDefensive.includes("invitation") ||
          normalizedDefensive.includes("engagement") ||
          normalizedDefensive.includes("subit"))
      ) {
        addTypedNote(notes, "défense", block.defensive);
      }
      if (block.position && !mappedPosition) {
        addTypedNote(notes, "position", block.position);
      }
      if (block.variant && defenseAttributes.length === 0) {
        addTypedNote(notes, "attribut", block.variant);
      }
    }

    if (hasAttackSignals) {
      const attackSnippet = [block.offensive, block.action, block.target]
        .filter(Boolean)
        .join(" ");
      addTypedNote(notes, "attaque secondaire", attackSnippet);
    }
  } else {
    mapped.mode = "note";
    mapped.role = "none";
    addTypedNote(notes, "offensive", block.offensive);
    addTypedNote(notes, "action", block.action);
    addTypedNote(notes, "cible", block.target);
    addTypedNote(notes, "défense", block.defensive);
    addTypedNote(notes, "position", block.position);
    addTypedNote(notes, "attribut", block.variant);
    addTypedNote(notes, "déplacement", block.movement);
  }

  mapped.note = uniqueValues(notes).join(" · ");

  if (mapped.note) {
    stats.totalNotes += 1;
  }

  if (!hasStructuredContent(mapped) && mapped.note) {
    mapped.mode = "note";
    mapped.role = "none";
  }

  return mapped;
}

function isPerformerEmpty(stepPerformer) {
  if (!stepPerformer) return true;
  if (hasStructuredContent(stepPerformer)) return false;
  return !String(stepPerformer.note ?? "").trim();
}

function isNamesRow(columns) {
  return (
    normalizeText(columns[1]).startsWith("tireur") &&
    normalizeText(columns[9]).startsWith("tireur")
  );
}

function isHeaderRow(columns) {
  return (
    normalizeText(columns[1]) === "offensive" &&
    normalizeText(columns[9]) === "offensive"
  );
}

function parseCsvRows(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  return raw.split(/\n/).map((line) => line.split(";").map(cleanCell));
}

function createLexiconContext(lexicon) {
  const movementComplementLookup = buildLookup(lexicon.movementComplement);
  const movementComplementNormalized = new Set(
    lexicon.movementComplement.map((value) => normalizeText(value)),
  );
  const movementBase = lexicon.movement.filter(
    (value) => !movementComplementNormalized.has(normalizeText(value)),
  );
  const movementBaseSorted = [...movementBase].sort(
    (left, right) => normalizeText(right).length - normalizeText(left).length,
  );

  return {
    offensive: lexicon.offensive,
    action: lexicon.action,
    defensive: lexicon.defensive,
    target: lexicon.target,
    movement: lexicon.movement,
    movementComplement: lexicon.movementComplement,
    guardNumber: lexicon.guardNumber,
    guardAttribute: lexicon.guardAttribute,
    attackAttribute: lexicon.attackAttribute,
    offensiveLookup: buildLookup(lexicon.offensive),
    actionLookup: buildLookup(lexicon.action),
    defensiveLookup: buildLookup(lexicon.defensive),
    targetLookup: buildLookup(lexicon.target),
    movementLookup: buildLookup(lexicon.movement),
    movementBaseLookup: buildLookup(movementBase),
    movementComplementLookup,
    guardNumberLookup: buildLookup(lexicon.guardNumber),
    guardAttributeLookup: buildLookup(lexicon.guardAttribute),
    attackAttributeLookup: buildLookup(lexicon.attackAttribute),
    movementBaseSorted,
  };
}

function inferPerformanceName(csvPath, explicitName) {
  if (explicitName) return explicitName;
  return path.basename(csvPath, path.extname(csvPath));
}

function inferJsonOutputPath(csvPath, explicitPath) {
  if (explicitPath) return path.resolve(WORKSPACE_ROOT, explicitPath);
  return DEFAULT_JSON_PATH;
}

function inferSqlOutputPath(explicitPath) {
  if (explicitPath) return path.resolve(WORKSPACE_ROOT, explicitPath);
  return DEFAULT_SQL_PATH;
}

function inferCsvPath(explicitPath) {
  if (explicitPath) return path.resolve(WORKSPACE_ROOT, explicitPath);
  return DEFAULT_CSV_PATH;
}

function splitSequencesByStepLimit(sequences, maxStepsPerSequence) {
  const limit = Number(maxStepsPerSequence);
  if (!Number.isInteger(limit) || limit <= 0) return sequences;

  const output = [];
  for (const sequence of sequences) {
    const steps = ensureArray(sequence?.steps);
    if (steps.length <= limit) {
      output.push(sequence);
      continue;
    }

    const totalParts = Math.ceil(steps.length / limit);
    for (let partIndex = 0; partIndex < totalParts; partIndex += 1) {
      const start = partIndex * limit;
      const end = start + limit;
      output.push({
        id: randomUUID(),
        name: `${sequence.name} · ${partIndex + 1}/${totalParts}`,
        steps: steps.slice(start, end),
      });
    }
  }
  return output;
}

function buildSqlImport({
  ownerEmail,
  performanceName,
  description,
  performers,
  sequences,
  formDraft,
  isDemo,
  createdAt,
  sqlOutputPath,
}) {
  const lines = [];
  lines.push(`-- generated from CSV mapping v2`);
  lines.push(`-- generated_at: ${createdAt}`);
  lines.push("");
  lines.push("DELETE FROM performance_sequences WHERE performance_id IN (");
  lines.push(
    `  SELECT id FROM performances WHERE user_id = (SELECT id FROM users WHERE email = ${sqlQuote(ownerEmail)}) AND name = ${sqlQuote(performanceName)}`,
  );
  lines.push(");");
  lines.push("DELETE FROM performance_shares WHERE performance_id IN (");
  lines.push(
    `  SELECT id FROM performances WHERE user_id = (SELECT id FROM users WHERE email = ${sqlQuote(ownerEmail)}) AND name = ${sqlQuote(performanceName)}`,
  );
  lines.push(");");
  lines.push(
    `DELETE FROM performances WHERE user_id = (SELECT id FROM users WHERE email = ${sqlQuote(ownerEmail)}) AND name = ${sqlQuote(performanceName)};`,
  );
  lines.push("");
  lines.push(
    "INSERT INTO performances (user_id, name, description, participants, form_draft, type, created_at, updated_at, archived, is_demo)",
  );
  lines.push("VALUES (");
  lines.push(
    `  (SELECT id FROM users WHERE email = ${sqlQuote(ownerEmail)}),`,
  );
  lines.push(`  ${sqlQuote(performanceName)},`);
  lines.push(`  ${sqlQuote(description)},`);
  lines.push(`  ${sqlQuote(JSON.stringify(performers))},`);
  lines.push(`  ${sqlQuote(JSON.stringify(formDraft))},`);
  lines.push(`  ${sqlQuote(DEFAULT_PERFORMANCE_TYPE)},`);
  lines.push(`  ${sqlQuote(createdAt)},`);
  lines.push(`  ${sqlQuote(createdAt)},`);
  lines.push("  0,");
  lines.push(`  ${Number(isDemo) ? 1 : 0}`);
  lines.push(");");
  lines.push("");

  sequences.forEach((sequence, position) => {
    const payload = {
      id: sequence.id,
      name: sequence.name,
      steps: sequence.steps,
    };
    lines.push(
      "INSERT INTO performance_sequences (performance_id, position, payload, created_at)",
    );
    lines.push("VALUES (");
    lines.push(
      `  (SELECT id FROM performances WHERE user_id = (SELECT id FROM users WHERE email = ${sqlQuote(ownerEmail)}) AND name = ${sqlQuote(performanceName)} ORDER BY id DESC LIMIT 1),`,
    );
    lines.push(`  ${position},`);
    lines.push(`  ${sqlQuote(JSON.stringify(payload))},`);
    lines.push(`  ${sqlQuote(createdAt)}`);
    lines.push(");");
  });

  lines.push("");
  fs.writeFileSync(sqlOutputPath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const csvPath = inferCsvPath(args.csv);
  const sqlOutputPath = inferSqlOutputPath(args["sql-output"]);
  const jsonOutputPath = inferJsonOutputPath(csvPath, args["json-output"]);
  const ownerEmail = args["owner-email"] || DEFAULT_OWNER_EMAIL;
  const performanceName = inferPerformanceName(csvPath, args.name);
  const description = args.description || DEFAULT_DESCRIPTION;
  const isDemo = Number(args.demo || 0);
  const maxStepsPerSequence = Number(args["max-steps-per-sequence"] || 0);
  const createdAt = new Date().toISOString();

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const lexicon = loadLexicon();
  const context = createLexiconContext(lexicon);
  const rows = parseCsvRows(csvPath);
  const stats = {
    totalRows: rows.length,
    totalSteps: 0,
    totalNotes: 0,
    totalSequences: 0,
  };

  let pendingPerformerNames = null;
  let performerNames = null;
  const sequences = [];
  let currentSequence = null;
  let sequenceCount = 0;

  function openSequence() {
    sequenceCount += 1;
    currentSequence = {
      id: randomUUID(),
      name: `Phrase ${sequenceCount}`,
      steps: [],
    };
  }

  function closeSequence() {
    if (!currentSequence) return;
    if (currentSequence.steps.length === 0) return;
    sequences.push(currentSequence);
    currentSequence = null;
  }

  for (const columns of rows) {
    const padded = [...columns];
    while (padded.length < 16) padded.push("");

    if (isNamesRow(padded)) {
      pendingPerformerNames = [cleanCell(padded[1]), cleanCell(padded[9])];
      continue;
    }

    if (isHeaderRow(padded)) {
      closeSequence();
      openSequence();
      if (!performerNames && pendingPerformerNames) {
        performerNames = pendingPerformerNames;
      }
      pendingPerformerNames = null;
      continue;
    }

    if (!currentSequence) continue;

    const nonEmptyCount = padded.reduce(
      (total, value) => total + (String(value ?? "").trim() ? 1 : 0),
      0,
    );
    if (nonEmptyCount === 0) continue;

    const leftBlock = extractBlock(padded, 1);
    const rightBlock = extractBlock(padded, 9);

    const leftPerformer = mapBlockToStepPerformer(leftBlock, context, stats);
    const rightPerformer = mapBlockToStepPerformer(rightBlock, context, stats);

    if (isPerformerEmpty(leftPerformer) && isPerformerEmpty(rightPerformer)) {
      continue;
    }

    currentSequence.steps.push({
      id: randomUUID(),
      lexicon: "classic-v2",
      performers: [leftPerformer, rightPerformer],
      participants: [leftPerformer, rightPerformer],
    });
    stats.totalSteps += 1;
  }

  closeSequence();
  const finalSequences = splitSequencesByStepLimit(
    sequences,
    maxStepsPerSequence,
  );
  stats.totalSequences = finalSequences.length;

  const resolvedPerformerNames = ensureArray(performerNames).length
    ? performerNames
    : ["Tireur 1", "Tireur 2"];
  const performers = resolvedPerformerNames.map((name, index) => ({
    name: String(name || `Tireur ${index + 1}`).trim() || `Tireur ${index + 1}`,
    weapon: "",
  }));
  const formDraft = performers.map(() => createEmptyStepPerformer());

  const exportPayload = {
    generatedAt: createdAt,
    sourceCsv: csvPath,
    performance: {
      name: performanceName,
      description,
      type: DEFAULT_PERFORMANCE_TYPE,
      performers,
      formDraft,
      isDemo: Number(isDemo) ? 1 : 0,
      ownerEmail,
    },
    sequences: finalSequences,
    stats,
  };

  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(exportPayload, null, 2)}\n`, "utf8");
  buildSqlImport({
    ownerEmail,
    performanceName,
    description,
    performers,
    sequences: finalSequences,
    formDraft,
    isDemo,
    createdAt,
    sqlOutputPath,
  });

  process.stdout.write(
    [
      "CSV import mapping completed.",
      `CSV: ${csvPath}`,
      `JSON output: ${jsonOutputPath}`,
      `SQL output: ${sqlOutputPath}`,
      `Performance: ${performanceName}`,
      `Sequences: ${stats.totalSequences}`,
      `Steps: ${stats.totalSteps}`,
      `Rows parsed: ${stats.totalRows}`,
      `Items with notes: ${stats.totalNotes}`,
    ].join("\n") + "\n",
  );
}

main();
