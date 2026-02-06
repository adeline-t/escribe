export function buildParticipantLabel(index) {
  return `Combattant ${index + 1}`;
}

export function normalizeParticipantIdentity(item, index, fallbackName) {
  if (typeof item === "string") {
    return { name: item, weapon: "" };
  }
  if (item && typeof item === "object") {
    const name = typeof item.name === "string" ? item.name : "";
    const weapon = typeof item.weapon === "string" ? item.weapon : "";
    return { name, weapon };
  }
  return { name: fallbackName || "", weapon: "" };
}

export function getParticipantName(participant, index) {
  const name =
    typeof participant === "string"
      ? participant
      : typeof participant?.name === "string"
        ? participant.name
        : "";
  return name && name.trim() ? name : buildParticipantLabel(index);
}

export function getParticipantWeapon(participant) {
  if (
    participant &&
    typeof participant === "object" &&
    typeof participant.weapon === "string"
  ) {
    return participant.weapon.trim();
  }
  return "";
}

export function formatParticipantSummary(participant, index) {
  const name = getParticipantName(participant, index);
  const weapon = getParticipantWeapon(participant);
  return weapon ? `${name} (${weapon})` : name;
}

export function labelForParticipant(participant, index) {
  return getParticipantName(participant, index);
}

export function emptyParticipantState() {
  return {
    mode: "combat",
    role: "none",
    offensive: "",
    action: "",
    target: "",
    attackMove: "",
    attackAttribute: [],
    defense: "",
    paradeNumber: "",
    paradeAttribute: "",
    defendMove: "",
    chorePhase: "",
    note: "",
    noteOverrides: false,
  };
}

export function normalizeParticipant(item) {
  const base = emptyParticipantState();
  const role = ["none", "attack", "defense"].includes(item?.role)
    ? item.role
    : base.role;
  const mode = ["combat", "note", "choregraphie"].includes(item?.mode)
    ? item.mode
    : base.mode;
  return {
    ...base,
    ...item,
    mode,
    role,
    attackAttribute: Array.isArray(item?.attackAttribute)
      ? item.attackAttribute
      : [],
    noteOverrides: Boolean(item?.noteOverrides),
  };
}

export function normalizeState(raw, defaultParticipants) {
  if (!raw || typeof raw !== "object") return null;
  const combatId = Number.isFinite(Number(raw.combatId))
    ? Number(raw.combatId)
    : null;
  const combatName =
    typeof raw.combatName === "string" ? raw.combatName : "Combat sans nom";
  const combatDescription =
    typeof raw.combatDescription === "string" ? raw.combatDescription : "";
  const participantsRaw =
    Array.isArray(raw.participants) && raw.participants.length
      ? raw.participants
      : defaultParticipants;
  const participants = participantsRaw.map((item, index) =>
    normalizeParticipantIdentity(item, index, buildParticipantLabel(index)),
  );
  const formRaw = Array.isArray(raw.form) ? raw.form : [];
  const form = participants.map((_, index) =>
    normalizeParticipant(formRaw[index] ?? {}),
  );
  const phrasesRaw = Array.isArray(raw.phrases) ? raw.phrases : [];
  const phrases = phrasesRaw.map((phrase, phraseIndex) => {
    const stepsRaw = Array.isArray(phrase?.steps) ? phrase.steps : [];
    const steps = stepsRaw.map((step) => {
      const participantsRaw = Array.isArray(step?.participants)
        ? step.participants
        : [];
      return {
        ...step,
        participants: participants.map((_, index) =>
          normalizeParticipant(participantsRaw[index] ?? {}),
        ),
      };
    });
    return {
      id: phrase?.id ?? crypto.randomUUID(),
      name:
        typeof phrase?.name === "string" && phrase.name.trim()
          ? phrase.name
          : `Phrase ${phraseIndex + 1}`,
      steps,
    };
  });
  const combatType =
    typeof raw.combatType === "string" ? raw.combatType : "classic";
  const combatShareRole =
    typeof raw.combatShareRole === "string" ? raw.combatShareRole : "read";
  return {
    combatId,
    combatName,
    combatDescription,
    participants,
    form,
    phrases,
    combatType,
    combatShareRole,
  };
}

export function toggleAttribute(current, value) {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

function buildNoteSummary(item) {
  return item.note ? `${item.note}` : "note à compléter";
}

function buildChoregraphieSummary(item, { includeNoteWhenEmpty }) {
  const note = item.note ? ` (${item.note})` : "";
  if (item.chorePhase) return `${item.chorePhase}${note}`;
  if (item.note && includeNoteWhenEmpty) return `${item.note}`;
  return "chorégraphie";
}

function buildAttackSummary(item) {
  const actionBits = [
    item.action,
    item.attackAttribute?.length ? item.attackAttribute.join(", ") : ""
  ]
    .filter(Boolean)
    .join(" ");
  const pieces = [
    item.offensive,
    actionBits ? `en ${actionBits}` : "",
    item.target ? `sur ${item.target}` : "",
    item.attackMove ? `avec ${item.attackMove}` : "",
    item.note ? `(${item.note})` : "",
  ];
  return pieces.filter(Boolean).join(" ");
}

function buildDefenseSummary(item) {
  const paradeBits = [item.paradeNumber, item.paradeAttribute]
    .filter(Boolean)
    .join(" ");
  const pieces = [
    item.defense,
    paradeBits ? `de ${paradeBits}` : "",
    item.defendMove ? `en ${item.defendMove}` : "",
    item.note ? `(${item.note})` : "",
  ];
  return pieces.filter(Boolean).join(" ");
}

export function buildSummaryLine(item) {
  if (item.mode === "choregraphie") {
    return buildChoregraphieSummary(item, { includeNoteWhenEmpty: true });
  }

  if (item.mode === "note") {
    return buildNoteSummary(item);
  }

  if (item.role === "attack") {
    if (item.noteOverrides) {
      return buildNoteSummary(item);
    }
    return buildAttackSummary(item);
  }

  if (item.role === "defense") {
    if (item.noteOverrides) {
      return buildNoteSummary(item);
    }
    return buildDefenseSummary(item);
  }

  if (item.note) {
    return `${item.note}`;
  }

  return "inactif";
}

export function buildSummaryLines(item) {
  if (item.mode === "choregraphie") {
    return [buildChoregraphieSummary(item, { includeNoteWhenEmpty: false })];
  }

  if (item.mode === "note") {
    return [buildNoteSummary(item)];
  }

  if (item.role === "attack") {
    if (item.noteOverrides) {
      return [buildNoteSummary(item)];
    }
    return [buildAttackSummary(item)].filter(Boolean);
  }

  if (item.role === "defense") {
    if (item.noteOverrides) {
      return [buildNoteSummary(item)];
    }
    return [buildDefenseSummary(item)].filter(Boolean);
  }

  if (item.note) {
    return [`${item.note}`];
  }

  return ["inactif"];
}
