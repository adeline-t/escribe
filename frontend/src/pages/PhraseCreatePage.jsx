import { useEffect, useState } from "react";
import StepCard from "../components/StepCard.jsx";

export default function PhraseCreatePage({
  participants,
  form,
  combatName,
  combatDescription,
  stepsCount,
  phrases,
  activePhraseId,
  activePhrase,
  participantLabels,
  normalizedLexicon,
  favorites,
  labels,
  favoriteTypeKeys,
  showParadeNumber = true,
  participantWeaponOptions,
  phaseOptions,
  onParticipantCountChange,
  onParticipantNameChange,
  onParticipantWeaponChange,
  onFormChange,
  onAddStep,
  onCombatNameChange,
  onCombatDescriptionChange,
  onCreatePhrase,
  onSelectPhrase,
  onRenamePhrase,
  onMovePhrase,
  onMovePhraseToIndex,
  onDeletePhrase,
  onEditStep,
  onRemoveStep,
  onCancelEditStep,
  editingStepId,
  buildParticipantLabel,
  buildSummaryLine,
  buildSummaryLines,
  toggleAttribute,
}) {
  const favoriteMap = favorites || {};
  const [activeParticipantIndex, setActiveParticipantIndex] = useState(0);
  const showWeapons =
    Array.isArray(participantWeaponOptions) &&
    participantWeaponOptions.length > 0;
  const showPhase = Array.isArray(phaseOptions) && phaseOptions.length > 0;

  const uiLabels = {
    offensive: "Offensive",
    action: "Action d'arme",
    attackAttribute: "Attribut attaque",
    target: "Cible",
    attackMove: "Déplacement",
    defensive: "Défensive",
    paradeNumber: "Position de parade",
    paradeAttribute: "Attribut parade",
    defendMove: "Déplacement",
    notes: "Notes",
    weapon: "Arme",
    ...labels,
  };

  const favoriteKeys = {
    offensive: "offensive",
    action: "action",
    attackAttribute: "attaque-attribut",
    target: "cible",
    attackMove: "deplacement-attaque",
    defensive: "defensive",
    paradeNumber: "parade-numero",
    paradeAttribute: "parade-attribut",
    defendMove: "deplacement-defense",
    ...favoriteTypeKeys,
  };

  useEffect(() => {
    if (participants.length === 0) return;
    if (activeParticipantIndex > participants.length - 1) {
      setActiveParticipantIndex(participants.length - 1);
    }
  }, [participants.length, activeParticipantIndex]);

  function orderOptions(list, typeKey) {
    const favs = new Set(favoriteMap[typeKey] ?? []);
    const favoriteItems = list
      .filter((item) => favs.has(item))
      .map((item) => ({ value: item, label: `★ ${item}` }));
    const others = list
      .filter((item) => !favs.has(item))
      .map((item) => ({ value: item, label: item }));
    return [...favoriteItems, ...others];
  }

  function handleDragStart(event, phraseId) {
    event.dataTransfer.setData("text/plain", phraseId);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(event, targetIndex) {
    event.preventDefault();
    const phraseId = event.dataTransfer.getData("text/plain");
    if (!phraseId) return;
    onMovePhraseToIndex(phraseId, targetIndex);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  const phraseIndex = activePhrase
    ? phrases.findIndex((phrase) => phrase.id === activePhrase.id)
    : -1;

  function badge(label, variant = "note", key) {
    if (!label) return null;
    return (
      <span key={key || label} className={`tag tag--${variant}`}>
        {label}
      </span>
    );
  }

  function buildInlineLine(item, name) {
    if (item.mode === "choregraphie") {
      return (
        <span>
          {name} chorégraphie{" "}
          {item.chorePhase ? (
            <span className="note-inline">{item.chorePhase}</span>
          ) : (
            ""
          )}
          {item.note ? (
            <span>
              {" "}
              (<span className="note-inline">{item.note}</span>)
            </span>
          ) : null}
        </span>
      );
    }

    if (item.mode === "note") {
      return (
        <span>
          {name} note{" "}
          <span className="note-inline">{item.note || "à compléter"}</span>
        </span>
      );
    }

    if (item.role === "attack") {
      if (item.noteOverrides) {
        return (
          <span>
            {name} attaque <span className="note-inline">{item.note}</span>
          </span>
        );
      }
      return (
        <span>
          {name} fait une {badge(item.offensive, "offensive", "offensive")}
          {badge(
            [
              item.action,
              item.attackAttribute?.length
                ? item.attackAttribute.join(", ")
                : "",
            ]
              .filter(Boolean)
              .join(" "),
            "action",
            "action",
          )}
          {item.target ? (
            <span>sur {badge(item.target, "target", "target")}</span>
          ) : null}
          {item.attackMove ? (
            <span> en {badge(item.attackMove, "move", "move")}</span>
          ) : null}
          {item.note ? (
            <span>
              {" "}
              (<span className="note-inline">{item.note}</span>)
            </span>
          ) : null}
        </span>
      );
    }

    if (item.role === "defense") {
      if (item.noteOverrides) {
        return (
          <span>
            {name} défend <span className="note-inline">{item.note}</span>
          </span>
        );
      }
      const paradeLabel = [item.paradeNumber, item.paradeAttribute]
        .filter(Boolean)
        .join(" ");
      return (
        <span>
          {name} défend en {badge("parade", "defensive", "parade")}
          {badge(paradeLabel, "parade-number", "paradeLabel")}
          {item.defendMove ? (
            <span> en {badge(item.defendMove, "move", "move")}</span>
          ) : null}
          {item.note ? (
            <span>
              {" "}
              (<span className="note-inline">{item.note}</span>)
            </span>
          ) : null}
        </span>
      );
    }

    if (item.note) {
      return (
        <span>
          {name} (<span className="note-inline">{item.note}</span>)
        </span>
      );
    }

    return <span>{name} inactif</span>;
  }

  const combatFull = (
    <div className="form-grid">
      <label className="span-2">
        Nom du combat
        <input
          value={combatName}
          onChange={(event) => onCombatNameChange(event.target.value)}
        />
      </label>
      <label className="span-2">
        Description
        <input
          value={combatDescription}
          onChange={(event) => onCombatDescriptionChange(event.target.value)}
        />
      </label>
    </div>
  );

  const participantsBlock = (
    <div className="form-grid">
      <label>
        Nombre de combattants
        <select
          value={participants.length}
          onChange={(event) => onParticipantCountChange(event.target.value)}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>
      <div className="names span-2">
        {participants.map((participant, index) => (
          <div key={index} className="participant-entry">
            <label>
              {`Nom ${index + 1}`}
              <input
                value={participant?.name ?? ""}
                placeholder={buildParticipantLabel(index)}
                onChange={(event) =>
                  onParticipantNameChange(index, event.target.value)
                }
              />
            </label>
            {showWeapons ? (
              <label>
                {`${uiLabels.weapon} ${index + 1}`}
                <select
                  value={participant?.weapon ?? ""}
                  onChange={(event) =>
                    onParticipantWeaponChange?.(index, event.target.value)
                  }
                >
                  <option value="">—</option>
                  {participantWeaponOptions.map((weapon) => (
                    <option key={weapon} value={weapon}>
                      {weapon}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );

  const combatCompact = (
    <div className="combat-compact">
      <label>
        Nom
        <input
          value={combatName}
          onChange={(event) => onCombatNameChange(event.target.value)}
        />
      </label>
      <label>
        Description
        <input
          value={combatDescription}
          onChange={(event) => onCombatDescriptionChange(event.target.value)}
        />
      </label>
      <label>
        Combattants
        <select
          value={participants.length}
          onChange={(event) => onParticipantCountChange(event.target.value)}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>
    </div>
  );

  const phraseList = (
    <>
      <div className="panel-header">
        <div>
          <h3>Phrases d'armes</h3>
          <p className="muted">Crée, sélectionne et réorganise les phrases.</p>
        </div>
        <button type="button" onClick={onCreatePhrase}>
          Ajouter une phrase
        </button>
      </div>
      <div className="phrase-list">
        {phrases.length === 0 ? (
          <div className="lexicon-empty">
            <div className="lexicon-empty__title">Aucune phrase.</div>
            <div className="lexicon-empty__subtitle">
              Ajoute une phrase pour commencer.
            </div>
          </div>
        ) : (
          phrases.map((phrase, index) => (
            <div
              key={phrase.id}
              className={`phrase-row ${phrase.id === activePhraseId ? "is-active" : ""}`}
              draggable
              onDragStart={(event) => handleDragStart(event, phrase.id)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, index)}
            >
              <button
                type="button"
                className="phrase-row__main"
                onClick={() => onSelectPhrase(phrase.id)}
              >
                <div className="phrase-row__title">
                  {phrase.name?.trim() || `Phrase ${index + 1}`}
                </div>
                <div className="phrase-row__meta">
                  {phrase.steps.length} passe
                  {phrase.steps.length > 1 ? "s" : ""} · #{index + 1}
                </div>
              </button>
              <div className="phrase-row__actions">
                <button
                  type="button"
                  className="chip"
                  onClick={() => onMovePhrase(phrase.id, "up")}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => onMovePhrase(phrase.id, "down")}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="chip chip--danger"
                  onClick={() => onDeletePhrase(phrase.id)}
                >
                  Suppr.
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const phraseHeader = null;

  const phraseNavigation = (
    <div className="phrase-nav">
      <button
        type="button"
        className="chip"
        onClick={() => {
          if (phraseIndex > 0) {
            onSelectPhrase(phrases[phraseIndex - 1].id);
          }
        }}
      >
        Phrase précédente
      </button>
      <button
        type="button"
        className="chip"
        onClick={() => {
          if (phraseIndex < phrases.length - 1) {
            onSelectPhrase(phrases[phraseIndex + 1].id);
          }
        }}
      >
        Phrase suivante
      </button>
    </div>
  );

  const stepsList = activePhrase ? (
    activePhrase.steps.length > 0 ? (
      <div className="step-list">
        {activePhrase.steps.map((step, index) => (
          <div
            key={step.id}
            className={`step-row ${editingStepId === step.id ? "is-active" : ""}`}
          >
            <div>
              <div className="step-row__title">Passe {index + 1}</div>
              <div className="step-row__meta">
                {step.participants?.filter(
                  (item) => item.mode === "combat" && item.role !== "none",
                ).length || 0}{" "}
                rôles actifs
              </div>
            </div>
            <div className="step-row__actions">
              <button
                type="button"
                className="chip"
                onClick={() => onEditStep(step.id)}
              >
                Modifier
              </button>
              <button
                type="button"
                className="chip chip--danger"
                onClick={() => onRemoveStep(step.id)}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="empty">Aucune passe pour le moment.</div>
    )
  ) : null;

  const stepForm = (
    <>
      <div className="summary">
        <h3>Phrase résumée</h3>
        <div className="summary__body">
          {form.map((item, index) => (
            <div key={`${index}-summary`} className="summary__line">
              {buildSummaryLine(item, participants[index], index)}
            </div>
          ))}
        </div>
      </div>
      <div
        className="participant-selector"
        role="tablist"
        aria-label="Choisir un combattant"
      >
        {participants.map((_, index) => {
          const name = participantLabels[index];
          const isActive = index === activeParticipantIndex;
          return (
            <button
              key={`${name}-${index}`}
              type="button"
              className={`chip ${isActive ? "chip--active" : ""}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveParticipantIndex(index)}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div
        className="participant-grid"
        style={{
          gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))`,
        }}
      >
        {participants.map((_, index) => {
          const item = form[index];
          const name = participantLabels[index];
          return (
            <div
              key={`${name}-${index}`}
              className={`participant-card ${index === activeParticipantIndex ? "is-active" : ""}`}
            >
              <div className="participant-card__header">
                <div className="participant-name">{name}</div>
                <div
                  className="segmented"
                  role="radiogroup"
                  aria-label={`Mode de ${name}`}
                >
                  <button
                    type="button"
                    className={`segmented__item ${item.mode === "note" ? "is-active" : ""}`}
                    aria-pressed={item.mode === "note"}
                    onClick={() => onFormChange(index, { mode: "note" })}
                  >
                    Note
                  </button>
                  {showPhase ? (
                    <button
                      type="button"
                      className={`segmented__item ${item.mode === "choregraphie" ? "is-active" : ""}`}
                      aria-pressed={item.mode === "choregraphie"}
                      onClick={() =>
                        onFormChange(index, { mode: "choregraphie" })
                      }
                    >
                      Chorégraphie
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`segmented__item ${item.mode === "combat" ? "is-active" : ""}`}
                    aria-pressed={item.mode === "combat"}
                    onClick={() => onFormChange(index, { mode: "combat" })}
                  >
                    Combat
                  </button>
                </div>
              </div>

              {item.mode === "combat" ? (
                <div className="participant-fields">
                  <div
                    className="segmented segmented--tight"
                    role="radiogroup"
                    aria-label={`Rôle de ${name}`}
                  >
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "none" ? "is-active" : ""}`}
                      aria-pressed={item.role === "none"}
                      onClick={() => onFormChange(index, { role: "none" })}
                    >
                      Sans rôle
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "attack" ? "is-active" : ""}`}
                      aria-pressed={item.role === "attack"}
                      onClick={() => onFormChange(index, { role: "attack" })}
                    >
                      Attaque
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "defense" ? "is-active" : ""}`}
                      aria-pressed={item.role === "defense"}
                      onClick={() => onFormChange(index, { role: "defense" })}
                    >
                      Défense
                    </button>
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={item.noteOverrides}
                      onChange={(event) =>
                        onFormChange(index, {
                          noteOverrides: event.target.checked,
                        })
                      }
                    />
                    La note remplace la formulation
                  </label>
                  {!item.noteOverrides && item.role === "attack" ? (
                    <>
                      <label>
                        {uiLabels.offensive}
                        <select
                          value={item.offensive}
                          onChange={(event) =>
                            onFormChange(index, {
                              offensive: event.target.value,
                            })
                          }
                        >
                          <option value="">—</option>
                          {orderOptions(
                            normalizedLexicon.offensive,
                            favoriteKeys.offensive,
                          ).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {uiLabels.action}
                        <select
                          value={item.action}
                          onChange={(event) =>
                            onFormChange(index, { action: event.target.value })
                          }
                        >
                          <option value="">—</option>
                          {orderOptions(
                            normalizedLexicon.action,
                            favoriteKeys.action,
                          ).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {uiLabels.attackAttribute}
                        <div className="checkbox-row">
                          {orderOptions(
                            normalizedLexicon.attackAttribute,
                            favoriteKeys.attackAttribute,
                          ).map((option) => (
                            <label key={option.value} className="checkbox">
                              <input
                                type="checkbox"
                                checked={item.attackAttribute.includes(
                                  option.value,
                                )}
                                onChange={() =>
                                  onFormChange(index, {
                                    attackAttribute: toggleAttribute(
                                      item.attackAttribute,
                                      option.value,
                                    ),
                                  })
                                }
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </label>
                      <label>
                        {uiLabels.target}
                        <select
                          value={item.target}
                          onChange={(event) =>
                            onFormChange(index, { target: event.target.value })
                          }
                        >
                          <option value="">—</option>
                          {orderOptions(
                            normalizedLexicon.cible,
                            favoriteKeys.target,
                          ).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {uiLabels.attackMove}
                        <select
                          value={item.attackMove}
                          onChange={(event) =>
                            onFormChange(index, {
                              attackMove: event.target.value,
                            })
                          }
                        >
                          <option value="">—</option>
                          {orderOptions(
                            normalizedLexicon.attackMove,
                            favoriteKeys.attackMove,
                          ).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}
                  {!item.noteOverrides && item.role === "defense" ? (
                    <>
                      <label>
                        {uiLabels.defensive}
                        <select
                          value={item.defense}
                          onChange={(event) =>
                            onFormChange(index, { defense: event.target.value })
                          }
                        >
                          <option value="">—</option>
                          {orderOptions(
                            normalizedLexicon.defensive,
                            favoriteKeys.defensive,
                          ).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {showParadeNumber ? (
                        <label>
                          {uiLabels.paradeNumber}
                          <select
                            value={item.paradeNumber}
                            onChange={(event) =>
                              onFormChange(index, {
                                paradeNumber: event.target.value,
                              })
                            }
                          >
                            <option value="">—</option>
                            {orderOptions(
                              normalizedLexicon.paradeNumber,
                              favoriteKeys.paradeNumber,
                            ).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <label>
                        {uiLabels.paradeAttribute}
                        <select
                          value={item.paradeAttribute}
                          onChange={(event) =>
                            onFormChange(index, {
                              paradeAttribute: event.target.value,
                            })
                          }
                        >
                          <option value="">—</option>
                          {orderOptions(
                            normalizedLexicon.paradeAttribute,
                            favoriteKeys.paradeAttribute,
                          ).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {uiLabels.defendMove}
                        <select
                          value={item.defendMove}
                          onChange={(event) =>
                            onFormChange(index, {
                              defendMove: event.target.value,
                            })
                          }
                        >
                          <option value="">—</option>
                          {orderOptions(
                            normalizedLexicon.defendMove,
                            favoriteKeys.defendMove,
                          ).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}
                </div>
              ) : null}

              {item.mode === "choregraphie" ? (
                <div className="participant-fields">
                  <label>
                    Phase de chorégraphie
                    <select
                      value={item.chorePhase}
                      onChange={(event) =>
                        onFormChange(index, { chorePhase: event.target.value })
                      }
                    >
                      <option value="">—</option>
                      {phaseOptions.map((phase) => (
                        <option key={phase} value={phase}>
                          {phase}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <div className="participant-fields">
                <label>
                  {uiLabels.notes}
                  <input
                    value={item.note}
                    onChange={(event) =>
                      onFormChange(index, { note: event.target.value })
                    }
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <div className="form-actions">
        <button type="button" onClick={onAddStep}>
          {editingStepId ? "Mettre à jour la passe" : "Ajouter la passe"}
        </button>
        {editingStepId ? (
          <button type="button" className="chip" onClick={onCancelEditStep}>
            Annuler la modification
          </button>
        ) : null}
      </div>
    </>
  );

  const readingBlock = activePhrase ? (
    <div className="phrase">
      <div
        className="phrase__header"
        style={{
          gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))`,
        }}
      >
        {participantLabels.map((name, index) => (
          <div key={index} className="phrase__name">
            {name}
          </div>
        ))}
      </div>
      <div className="phrase__body">
        {activePhrase.steps.length === 0 ? (
          <div className="empty">Ajoutez une passe pour voir la lecture.</div>
        ) : (
          activePhrase.steps.map((step, index) => {
            const attackers = step.participants
              .map((item, idx) => ({ ...item, index: idx }))
              .filter((item) => item.role === "attack");
            const defenders = step.participants
              .map((item, idx) => ({ ...item, index: idx }))
              .filter((item) => item.role === "defense");

            return (
              <div
                key={step.id}
                className="phrase__row"
                style={{
                  gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))`,
                }}
              >
                {step.participants.map((item, colIndex) => {
                  const role = item.role;
                  return (
                    <div
                      key={`${step.id}-${colIndex}`}
                      className="phrase__cell"
                    >
                      {role === "attack" ? (
                        <StepCard
                          type="action"
                          title={`Passe ${index + 1}`}
                          accent="accent-attack"
                          lines={[
                            buildInlineLine(item, participantLabels[colIndex]),
                          ]}
                        />
                      ) : null}
                      {role === "defense" ? (
                        <StepCard
                          type="reaction"
                          title="Réaction"
                          accent="accent-defense"
                          lines={[
                            buildInlineLine(item, participantLabels[colIndex]),
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
                              left: isReverse
                                ? `calc(${defender.index + 1} * 100% / ${participants.length})`
                                : `calc(${attacker.index + 1} * 100% / ${participants.length})`,
                              width: isReverse
                                ? `calc(${Math.max(0, attacker.index - defender.index - 1)} * 100% / ${participants.length})`
                                : `calc(${Math.max(0, defender.index - attacker.index - 1)} * 100% / ${participants.length})`,
                            }}
                          />
                        );
                      }),
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  ) : (
    <div className="lexicon-empty">
      <div className="lexicon-empty__title">Sélectionne une phrase.</div>
      <div className="lexicon-empty__subtitle">
        Choisis une phrase dans la liste ou crée-en une nouvelle.
      </div>
    </div>
  );

  return (
    <>
      <section className="panel">
        <div className="option-grid">
          <div className="option-side">
            <details className="fold" open>
              <summary>Combat</summary>
              {combatFull}
            </details>
            <details className="fold" open>
              <summary>Combattants</summary>
              {participantsBlock}
            </details>
            <details className="fold" open>
              <summary>Liste des phrases</summary>
              {phraseList}
            </details>
          </div>
          <div className="option-main">
            <details className="fold" open>
              <summary>Lecture par cartes</summary>
              {readingBlock}
            </details>
            <details className="fold" open>
              <summary>Édition des passes</summary>
              <div className="panel-header">
                <div className="header-with-badge">
                  <h3>Passes de la phrase</h3>
                  <span className="badge">#{phraseIndex + 1}</span>
                </div>
                {phraseNavigation}
              </div>
              {stepsList}
              {stepForm}
            </details>
          </div>
        </div>
      </section>
    </>
  );
}
