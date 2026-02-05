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

export function buildSummaryLine(item, participant, index) {
  const name = getParticipantName(participant, index);
  if (item.mode === "choregraphie") {
    const note = item.note ? ` (${item.note})` : "";
    return item.chorePhase
      ? `${name} chorégraphie: ${item.chorePhase}${note}`
      : item.note
        ? `${name} note: ${item.note}`
        : `${name} chorégraphie`;
  }

  if (item.mode === "note") {
    return item.note
      ? `${name} note: ${item.note}`
      : `${name} note à compléter`;
  }

  if (item.role === "attack") {
    if (item.noteOverrides) {
      return item.note
        ? `${name} attaque: ${item.note}`
        : `${name} attaque (note à compléter)`;
    }
    const pieces = [
      `${name} attaque`,
      item.offensive,
      item.action,
      item.attackAttribute?.length
        ? `(${item.attackAttribute.join(", ")})`
        : "",
      item.target ? `sur ${item.target}` : "",
      item.attackMove ? `en ${item.attackMove}` : "",
      item.note ? `note: ${item.note}` : "",
    ];
    return pieces.filter(Boolean).join(" ");
  }

  if (item.role === "defense") {
    if (item.noteOverrides) {
      return item.note
        ? `${name} défend: ${item.note}`
        : `${name} défend (note à compléter)`;
    }
    const paradeBits = [item.paradeNumber, item.paradeAttribute]
      .filter(Boolean)
      .join(" ");
    const pieces = [
      `${name} défend`,
      item.defense,
      paradeBits ? `parade ${paradeBits}` : "",
      item.defendMove ? `en ${item.defendMove}` : "",
      item.note ? `note: ${item.note}` : "",
    ];
    return pieces.filter(Boolean).join(" ");
  }

  if (item.note) {
    return `${name} note: ${item.note}`;
  }

  return `${name} inactif`;
}

export function buildSummaryLines(item, participant, index) {
  const name = getParticipantName(participant, index);
  if (item.mode === "choregraphie") {
    const note = item.note ? ` (${item.note})` : "";
    return [
      item.chorePhase
        ? `${name} chorégraphie: ${item.chorePhase}${note}`
        : `${name} chorégraphie`,
    ];
  }

  if (item.mode === "note") {
    return [
      item.note ? `${name} note: ${item.note}` : `${name} note à compléter`,
    ];
  }

  if (item.role === "attack") {
    if (item.noteOverrides) {
      return [
        item.note
          ? `${name} attaque: ${item.note}`
          : `${name} attaque (note à compléter)`,
      ];
    }
    const line1 = [
      `${name} attaque`,
      item.offensive,
      item.action,
      item.attackAttribute?.length
        ? `(${item.attackAttribute.join(", ")})`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    return [line1].filter(Boolean);
  }

  if (item.role === "defense") {
    if (item.noteOverrides) {
      return [
        item.note
          ? `${name} défend: ${item.note}`
          : `${name} défend (note à compléter)`,
      ];
    }
    const paradeBits = [item.paradeNumber, item.paradeAttribute]
      .filter(Boolean)
      .join(" ");
    const line1 = [
      `${name} défend en`,
      item.defense,
      paradeBits ? `parade ${paradeBits}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return [line1].filter(Boolean);
  }

  if (item.note) {
    return [`${name} note: ${item.note}`];
  }

  return [`${name} inactif`];
}
