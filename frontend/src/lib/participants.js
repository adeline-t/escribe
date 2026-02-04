export function buildParticipantLabel(index) {
  return `Combattant ${index + 1}`;
}

export function labelForParticipant(name, index) {
  return name && name.trim() ? name : buildParticipantLabel(index);
}

export function emptyParticipantState() {
  return {
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
    note: "",
    noteOverrides: false
  };
}

export function normalizeParticipant(item) {
  const base = emptyParticipantState();
  const role = ["none", "attack", "defense"].includes(item?.role) ? item.role : base.role;
  return {
    ...base,
    ...item,
    role,
    attackAttribute: Array.isArray(item?.attackAttribute) ? item.attackAttribute : [],
    noteOverrides: Boolean(item?.noteOverrides)
  };
}

export function normalizeState(raw, defaultParticipants) {
  if (!raw || typeof raw !== "object") return null;
  const combatId = Number.isFinite(Number(raw.combatId)) ? Number(raw.combatId) : null;
  const combatName = typeof raw.combatName === "string" ? raw.combatName : "Combat sans nom";
  const combatDescription = typeof raw.combatDescription === "string" ? raw.combatDescription : "";
  const participants = Array.isArray(raw.participants) && raw.participants.length
    ? raw.participants
    : defaultParticipants;
  const formRaw = Array.isArray(raw.form) ? raw.form : [];
  const form = participants.map((_, index) => normalizeParticipant(formRaw[index] ?? {}));
  const phrasesRaw = Array.isArray(raw.phrases) ? raw.phrases : [];
  const phrases = phrasesRaw.map((phrase, phraseIndex) => {
    const stepsRaw = Array.isArray(phrase?.steps) ? phrase.steps : [];
    const steps = stepsRaw.map((step) => {
      const participantsRaw = Array.isArray(step?.participants) ? step.participants : [];
      return {
        ...step,
        participants: participants.map((_, index) => normalizeParticipant(participantsRaw[index] ?? {}))
      };
    });
    return {
      id: phrase?.id ?? crypto.randomUUID(),
      name: typeof phrase?.name === "string" && phrase.name.trim()
        ? phrase.name
        : `Phrase ${phraseIndex + 1}`,
      steps
    };
  });
  return { combatId, combatName, combatDescription, participants, form, phrases };
}

export function toggleAttribute(current, value) {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

export function buildSummaryLine(item, name) {
  if (item.role === "attack") {
    if (item.noteOverrides) {
      return item.note ? `${name} attaque: ${item.note}` : `${name} attaque (note à compléter)`;
    }
    const pieces = [
      `${name} attaque`,
      item.offensive,
      item.action,
      item.attackAttribute?.length ? `(${item.attackAttribute.join(", ")})` : "",
      item.target ? `sur ${item.target}` : "",
      item.attackMove ? `en ${item.attackMove}` : "",
      item.note ? `note: ${item.note}` : ""
    ];
    return pieces.filter(Boolean).join(" ");
  }

  if (item.role === "defense") {
    if (item.noteOverrides) {
      return item.note ? `${name} défend: ${item.note}` : `${name} défend (note à compléter)`;
    }
    const paradeBits = [item.paradeNumber, item.paradeAttribute].filter(Boolean).join(" ");
    const pieces = [
      `${name} défend`,
      item.defense,
      paradeBits ? `parade ${paradeBits}` : "",
      item.defendMove ? `en ${item.defendMove}` : "",
      item.note ? `note: ${item.note}` : ""
    ];
    return pieces.filter(Boolean).join(" ");
  }

  if (item.note) {
    return `${name} note: ${item.note}`;
  }

  return `${name} sans rôle`;
}
