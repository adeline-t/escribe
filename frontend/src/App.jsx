import { useEffect, useMemo, useRef, useState } from "react";
import lexicon from "./data/lexicon.json";
import "./App.css";

const DEFAULT_PARTICIPANTS = ["Portrait", "Fou", "Reflet"];
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

function normalizeLexicon(data) {
  return {
    offensive: data.offensive ?? [],
    action: data.action ?? [],
    defensive: data.defensive ?? [],
    cible: data.cible ?? [],
    attackMove: data["deplacement-attaque"] ?? data.deplacementAttaque ?? [],
    defendMove: data["deplacement-defense"] ?? data.deplacementDefense ?? [],
    paradeNumber: data["parade-numero"] ?? data.paradeNumero ?? [],
    paradeAttribute: data["parade-attribut"] ?? data.paradeAttribut ?? [],
    attackAttribute: data["attaque-attribut"] ?? data.attaqueAttribut ?? []
  };
}

function buildParticipantLabel(index) {
  return `Combattant ${index + 1}`;
}

function labelForParticipant(name, index) {
  return name && name.trim() ? name : buildParticipantLabel(index);
}

function emptyParticipantState() {
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

function normalizeParticipant(item) {
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

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return null;
  const participants = Array.isArray(raw.participants) && raw.participants.length
    ? raw.participants
    : DEFAULT_PARTICIPANTS;
  const formRaw = Array.isArray(raw.form) ? raw.form : [];
  const form = participants.map((_, index) => normalizeParticipant(formRaw[index] ?? {}));
  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : [];
  const steps = stepsRaw.map((step) => {
    const participantsRaw = Array.isArray(step?.participants) ? step.participants : [];
    return {
      ...step,
      participants: participants.map((_, index) => normalizeParticipant(participantsRaw[index] ?? {}))
    };
  });
  return { participants, form, steps };
}

function StepCard({ type, title, lines, accent, tags }) {
  return (
    <div className={`card-mini ${type}`}>
      <div className="card-mini__title">
        <span className={`dot ${accent}`} />
        {title}
      </div>
      <div className="card-mini__lines">
        {lines.filter(Boolean).map((line) => (
          <div key={line} className="card-mini__line">
            {line}
          </div>
        ))}
      </div>
      {tags?.length ? (
        <div className="card-mini__tags">
          {tags
            .filter((tag) => tag && tag.label)
            .map((tag) => (
              <span key={tag.label} className={`tag tag--${tag.variant || "neutral"}`}>
                {tag.label}
              </span>
            ))}
        </div>
      ) : null}
    </div>
  );
}

function buildSummaryLine(item, name) {
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

function toggleAttribute(current, value) {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

const LEXICON_TYPES = [
  { key: "offensive", label: "Offensive" },
  { key: "action", label: "Action d'arme" },
  { key: "attaque-attribut", label: "Attribut attaque" },
  { key: "cible", label: "Cible" },
  { key: "deplacement-attaque", label: "Déplacement attaque" },
  { key: "defensive", label: "Défensive" },
  { key: "parade-numero", label: "Numéro de parade" },
  { key: "parade-attribut", label: "Attribut parade" },
  { key: "deplacement-defense", label: "Déplacement défense" }
];

function LexiconAdmin({ apiBase }) {
  const [activeType, setActiveType] = useState(LEXICON_TYPES[0]?.key ?? "");
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [error, setError] = useState("");

  const activeLabel = useMemo(
    () => LEXICON_TYPES.find((type) => type.key === activeType)?.label ?? "",
    [activeType]
  );

  async function loadType(signal) {
    if (!activeType) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/lexicon/${activeType}`, { signal });
      const payload = await response.json().catch(() => ({}));
      setItems(payload.items ?? []);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("Lexicon load failed:", error);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadType(controller.signal);
    return () => {
      controller.abort();
    };
  }, [apiBase, activeType]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? items.filter((item) => item.label.toLowerCase().includes(query))
      : items;
    const sorted = [...list];
    if (sort === "az") {
      sorted.sort((a, b) => a.label.localeCompare(b.label, "fr"));
    } else if (sort === "za") {
      sorted.sort((a, b) => b.label.localeCompare(a.label, "fr"));
    } else if (sort === "new") {
      sorted.sort((a, b) => b.id - a.id);
    } else if (sort === "old") {
      sorted.sort((a, b) => a.id - b.id);
    }
    return sorted;
  }, [items, search, sort]);

  async function addItem() {
    const label = draft.trim();
    if (!label) return;
    setError("");
    const response = await fetch(`${apiBase}/api/lexicon/${activeType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (payload?.error === "duplicate") {
        setError("Valeur déjà présente.");
      }
      return;
    }
    if (payload?.item) {
      setItems((prev) => [...prev, payload.item]);
      setDraft("");
    }
  }


  async function deleteItem(id) {
    const response = await fetch(`${apiBase}/api/lexicon/${activeType}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Atelier de lexique</h2>
          <p className="muted">Organise et enrichis les catégories en un clic.</p>
        </div>
        <span className="muted">{loading ? "Chargement..." : "Données en base D1"}</span>
      </div>

      <div className="lexicon-layout">
        <aside className="lexicon-sidebar">
          <div className="lexicon-sidebar__title">Catégories</div>
          <div className="lexicon-sidebar__list">
            {LEXICON_TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                className={`lexicon-tab ${activeType === type.key ? "is-active" : ""}`}
                onClick={() => setActiveType(type.key)}
              >
                <span>{type.label}</span>
                <span className="lexicon-count">{type.key === activeType ? items.length : ""}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="lexicon-main">
          <div className="lexicon-header">
            <div>
              <div className="lexicon-title">{activeLabel}</div>
              <div className="lexicon-subtitle">
                {items.length} entrée{items.length > 1 ? "s" : ""}
              </div>
            </div>
            <div className="lexicon-actions">
              <input
                value={search}
                placeholder="Filtrer une entrée..."
                onChange={(event) => setSearch(event.target.value)}
              />
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
                <option value="new">Récent</option>
                <option value="old">Ancien</option>
              </select>
            </div>
          </div>

          <div className="lexicon-add">
            <input
              value={draft}
              placeholder={`Ajouter ${activeLabel.toLowerCase()}`}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="button" onClick={addItem}>
              Ajouter
            </button>
          </div>
          {error ? <div className="lexicon-error">{error}</div> : null}

          <div className="lexicon-table">
            {filteredItems.map((item) => (
              <div key={item.id} className="lexicon-row">
                <div className="lexicon-row__label">{item.label}</div>
                <div className="lexicon-row__meta">#{item.id}</div>
                <button type="button" className="chip chip--danger" onClick={() => deleteItem(item.id)}>
                  Supprimer
                </button>
              </div>
            ))}
            {filteredItems.length === 0 ? (
              <div className="lexicon-empty">
                <div className="lexicon-empty__title">Aucune valeur trouvée.</div>
                <div className="lexicon-empty__subtitle">
                  Essaie un autre filtre ou ajoute une nouvelle entrée.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState("editor");
  const [participants, setParticipants] = useState(DEFAULT_PARTICIPANTS);
  const [steps, setSteps] = useState([]);
  const [form, setForm] = useState(DEFAULT_PARTICIPANTS.map(() => emptyParticipantState()));
  const [isHydrated, setIsHydrated] = useState(false);
  const [lexiconData, setLexiconData] = useState(() => normalizeLexicon(lexicon));
  const saveTimerRef = useRef(null);

  const participantLabels = useMemo(
    () => participants.map((name, index) => labelForParticipant(name, index)),
    [participants]
  );
  const normalizedLexicon = useMemo(() => normalizeLexicon(lexiconData), [lexiconData]);

  useEffect(() => {
    let isMounted = true;
    async function loadState() {
      try {
        const lexiconResponse = await fetch(`${API_BASE}/api/lexicon`);
        if (lexiconResponse.ok) {
          const lexiconPayload = await lexiconResponse.json();
          if (lexiconPayload?.lexicon) {
            setLexiconData(lexiconPayload.lexicon);
          }
        }

        const response = await fetch(`${API_BASE}/api/state`);
        if (!response.ok) throw new Error("Failed to load state");
        const data = await response.json();
        const normalized = normalizeState(data?.state);
        if (isMounted && normalized) {
          setParticipants(normalized.participants);
          setSteps(normalized.steps);
          setForm(normalized.form);
        }
      } catch (error) {
        console.warn("State load skipped:", error);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }
    loadState();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    const payload = { participants, steps, form };
    saveTimerRef.current = setTimeout(() => {
      fetch(`${API_BASE}/api/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: payload })
      }).catch((error) => {
        console.warn("State save skipped:", error);
      });
    }, 400);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [participants, steps, form, isHydrated]);

  function updateParticipantName(index, value) {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function updateParticipantCount(value) {
    const count = Number(value);
    setParticipants((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i += 1) {
          next.push("");
        }
      }
      if (count < next.length) {
        next.splice(count);
      }
      return next;
    });

    setForm((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i += 1) {
          next.push(emptyParticipantState());
        }
      }
      if (count < next.length) {
        next.splice(count);
      }
      return next;
    });
  }

  function updateForm(index, patch) {
    setForm((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addStep() {
    const hasRole = form.some((item) => item.role !== "none");
    if (!hasRole) return;

    const step = {
      id: crypto.randomUUID(),
      participants: form.map((item) => ({ ...item }))
    };

    setSteps((prev) => [...prev, step]);
    setForm((prev) =>
      prev.map((item) => ({
        ...item,
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
      }))
    );
  }

  function removeStep(id) {
    setSteps((prev) => prev.filter((step) => step.id !== id));
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="kicker">Escribe</p>
          <h1>Archive vivante des phrases d'armes</h1>
          <p className="lead">
            Décrivez chaque étape avec précision, sans perdre la lecture globale.
          </p>
        </div>
        <div className="hero__panel">
          <label>
            Nombre de combattants
            <select value={participants.length} onChange={(event) => updateParticipantCount(event.target.value)}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <div className="names">
            {participants.map((name, index) => (
              <label key={index}>
                {`Nom ${index + 1}`}
                <input
                  value={name}
                  placeholder={buildParticipantLabel(index)}
                  onChange={(event) => updateParticipantName(index, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </header>

      <nav className="menu">
        <button
          type="button"
          className={`menu__item ${page === "editor" ? "is-active" : ""}`}
          onClick={() => setPage("editor")}
        >
          Phrase
        </button>
        <button
          type="button"
          className={`menu__item ${page === "lexicon" ? "is-active" : ""}`}
          onClick={() => setPage("lexicon")}
        >
          Lexique
        </button>
      </nav>

      {page === "lexicon" ? (
        <LexiconAdmin apiBase={API_BASE} />
      ) : null}

      {page === "editor" ? (
      <section className="panel">
        <h2>Ajouter une étape</h2>
        <div className="participant-grid" style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}>
          {participants.map((_, index) => {
            const item = form[index];
            const name = participantLabels[index];
            return (
              <div key={name} className="participant-card">
                <div className="participant-card__header">
                  <div className="participant-name">{name}</div>
                  <div className="segmented" role="radiogroup" aria-label={`Rôle de ${name}`}>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "none" ? "is-active" : ""}`}
                      aria-pressed={item.role === "none"}
                      onClick={() => updateForm(index, { role: "none" })}
                    >
                      Sans rôle
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "attack" ? "is-active" : ""}`}
                      aria-pressed={item.role === "attack"}
                      onClick={() => updateForm(index, { role: "attack" })}
                    >
                      Attaque
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "defense" ? "is-active" : ""}`}
                      aria-pressed={item.role === "defense"}
                      onClick={() => updateForm(index, { role: "defense" })}
                    >
                      Défense
                    </button>
                  </div>
                </div>

                {item.role === "attack" ? (
                  <div className="participant-fields">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={item.noteOverrides}
                        onChange={(event) => updateForm(index, { noteOverrides: event.target.checked })}
                      />
                      La note remplace la formulation
                    </label>
                    {!item.noteOverrides ? (
                      <>
                        <label>
                          Offensive
                          <select
                            value={item.offensive}
                            onChange={(event) => updateForm(index, { offensive: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.offensive.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Action d'arme
                          <select
                            value={item.action}
                            onChange={(event) => updateForm(index, { action: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.action.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Attribut attaque
                          <div className="checkbox-row">
                            {normalizedLexicon.attackAttribute.map((option) => (
                              <label key={option} className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={item.attackAttribute.includes(option)}
                                  onChange={() =>
                                    updateForm(index, {
                                      attackAttribute: toggleAttribute(item.attackAttribute, option)
                                    })
                                  }
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        </label>
                        <label>
                          Cible
                          <select
                            value={item.target}
                            onChange={(event) => updateForm(index, { target: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.cible.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Déplacement
                          <select
                            value={item.attackMove}
                            onChange={(event) => updateForm(index, { attackMove: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.attackMove.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                      </>
                    ) : null}
                    <label>
                      Notes
                      <input
                        value={item.note}
                        onChange={(event) => updateForm(index, { note: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}

                {item.role === "defense" ? (
                  <div className="participant-fields">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={item.noteOverrides}
                        onChange={(event) => updateForm(index, { noteOverrides: event.target.checked })}
                      />
                      La note remplace la formulation
                    </label>
                    {!item.noteOverrides ? (
                      <>
                        <label>
                          Défensive
                          <select
                            value={item.defense}
                            onChange={(event) => updateForm(index, { defense: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.defensive.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Numéro de parade
                          <select
                            value={item.paradeNumber}
                            onChange={(event) => updateForm(index, { paradeNumber: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.paradeNumber.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Attribut parade
                          <select
                            value={item.paradeAttribute}
                            onChange={(event) => updateForm(index, { paradeAttribute: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.paradeAttribute.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Déplacement
                          <select
                            value={item.defendMove}
                            onChange={(event) => updateForm(index, { defendMove: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.defendMove.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                      </>
                    ) : null}
                    <label>
                      Notes
                      <input
                        value={item.note}
                        onChange={(event) => updateForm(index, { note: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}

                {item.role === "none" ? (
                  <div className="participant-fields">
                    <label>
                      Notes
                      <input
                        value={item.note}
                        onChange={(event) => updateForm(index, { note: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="summary">
          <h3>Phrase résumée</h3>
          <div className="summary__body">
            {form.map((item, index) => (
              <div key={participantLabels[index]} className="summary__line">
                {buildSummaryLine(item, participantLabels[index])}
              </div>
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button type="button" onClick={addStep}>
            Ajouter l'étape
          </button>
        </div>
      </section>
      ) : null}

      {page === "editor" ? (
      <section className="panel">
        <div className="panel-header">
          <h2>Phrase en cours</h2>
          <span className="muted">{steps.length} étape{steps.length > 1 ? "s" : ""}</span>
        </div>
        <div className="phrase">
          <div className="phrase__header" style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}>
            {participants.map((name, index) => (
              <div key={index} className="phrase__name">
                {labelForParticipant(name, index)}
              </div>
            ))}
          </div>
          <div className="phrase__body">
            {steps.length === 0 ? (
              <div className="empty">Ajoutez une étape pour commencer la phrase.</div>
            ) : (
              steps.map((step, index) => {
                const attackers = step.participants
                  .map((item, idx) => ({ ...item, index: idx }))
                  .filter((item) => item.role === "attack");
                const defenders = step.participants
                  .map((item, idx) => ({ ...item, index: idx }))
                  .filter((item) => item.role === "defense");

                return (
                  <div key={step.id} className="phrase__row" style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}>
                    {step.participants.map((item, colIndex) => {
                      const role = item.role;
                      return (
                        <div key={`${step.id}-${colIndex}`} className="phrase__cell">
                          {role === "attack" ? (
                            <StepCard
                              type="action"
                              title={`Étape ${index + 1}`}
                              accent="accent-attack"
                              lines={item.noteOverrides ? [item.note] : [item.offensive, item.action]}
                              tags={[
                                item.noteOverrides ? null : { label: item.target, variant: "target" },
                                item.noteOverrides ? null : { label: item.attackMove, variant: "move" },
                                item.noteOverrides
                                  ? null
                                  : { label: item.attackAttribute?.join(", "), variant: "note" },
                                item.noteOverrides ? null : { label: item.note, variant: "note" }
                              ]}
                            />
                          ) : null}
                          {role === "defense" ? (
                            <StepCard
                              type="reaction"
                              title="Réaction"
                              accent="accent-defense"
                              lines={item.noteOverrides ? [item.note] : [item.defense]}
                              tags={[
                                item.noteOverrides ? null : { label: item.paradeNumber, variant: "note" },
                                item.noteOverrides ? null : { label: item.paradeAttribute, variant: "note" },
                                item.noteOverrides ? null : { label: item.defendMove, variant: "move" },
                                item.noteOverrides ? null : { label: item.note, variant: "note" }
                              ]}
                            />
                          ) : null}
                          {role === "none" && item.note ? (
                            <StepCard
                              type="neutral"
                              title="Note"
                              accent="accent-neutral"
                              lines={[item.note]}
                            />
                          ) : null}
                        </div>
                      );
                    })}

                    <div className="arrow-layer">
                      {attackers.flatMap((attacker) =>
                        defenders
                          .filter((defender) => defender.index !== attacker.index)
                          .map((defender) => {
                            const isReverse = defender.index < attacker.index;
                            return (
                              <div
                                key={`${step.id}-${attacker.index}-${defender.index}`}
                                className={`arrow ${isReverse ? "arrow--reverse" : ""}`}
                                style={{
                                  left: `calc(${isReverse ? defender.index + 1 : attacker.index + 1} * 100% / ${
                                    participants.length
                                  })`,
                                  width: `calc(${Math.max(0, Math.abs(defender.index - attacker.index) - 1)} * 100% / ${
                                    participants.length
                                  })`
                                }}
                              />
                            );
                          })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
      ) : null}

      {page === "editor" && steps.length > 0 ? (
        <section className="panel panel--ghost">
          <h2>Nettoyage</h2>
          <div className="chip-row">
            {steps.map((step, index) => (
              <button key={step.id} className="chip" onClick={() => removeStep(step.id)}>
                Supprimer l'étape {index + 1}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
