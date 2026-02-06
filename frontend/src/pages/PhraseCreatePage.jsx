import { useEffect, useState } from "react";
import StepCard from "../components/StepCard.jsx";
import StepSummaryLine from "../components/StepSummaryLine.jsx";
import { FaPlus } from "react-icons/fa6";
import { emptyParticipantState } from "../lib/participants.js";

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
  isReadOnly = false,
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
  onNavigate,
  onUpdateStepParticipant,
  onResetForm,
}) {
  const favoriteMap = favorites || {};
  const [activeParticipantIndex, setActiveParticipantIndex] = useState(0);
  const showWeapons =
    Array.isArray(participantWeaponOptions) &&
    participantWeaponOptions.length > 0;
  const showPhase = Array.isArray(phaseOptions) && phaseOptions.length > 0;
  const [inlineEdit, setInlineEdit] = useState(null);
  const [inlineItem, setInlineItem] = useState(null);
  const inlineStepIndex = inlineEdit
    ? (activePhrase?.steps?.findIndex(
        (step) => step.id === inlineEdit.stepId,
      ) ?? -1)
    : -1;

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
  const editingStepIndex = editingStepId
    ? (activePhrase?.steps?.findIndex((step) => step.id === editingStepId) ??
      -1)
    : -1;
  const nextStepIndex = activePhrase?.steps?.length ?? -1;

  function buildInlineLine(item, name) {
    return (
      <StepSummaryLine
        item={item}
        name={name}
        variant="compact"
        inactiveLabel="inactif"
      />
    );
  }

  function openInlineEditor(stepId, participantIndex, item) {
    setInlineEdit({ stepId, participantIndex });
    setInlineItem({
      ...item,
      attackAttribute: Array.isArray(item.attackAttribute)
        ? item.attackAttribute
        : [],
    });
  }

  function closeInlineEditor() {
    setInlineEdit(null);
    setInlineItem(null);
  }

  function updateInlineItem(patch) {
    setInlineItem((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function saveInlineEditor() {
    if (!inlineEdit || !inlineItem || !onUpdateStepParticipant) return;
    onUpdateStepParticipant(
      inlineEdit.stepId,
      inlineEdit.participantIndex,
      inlineItem,
    );
    closeInlineEditor();
  }

  const combatFull = (
    <div className="form-grid">
      <label className="span-2">
        Nom du combat
        <input
          value={combatName}
          onChange={(event) => onCombatNameChange(event.target.value)}
          disabled={isReadOnly}
        />
      </label>
      <label className="span-2">
        Description
        <input
          value={combatDescription}
          onChange={(event) => onCombatDescriptionChange(event.target.value)}
          disabled={isReadOnly}
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
          disabled={isReadOnly}
        />
      </label>
      <label>
        Description
        <input
          value={combatDescription}
          onChange={(event) => onCombatDescriptionChange(event.target.value)}
          disabled={isReadOnly}
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
      <summary className="header-with-badge">
        <h3>Phrases d'armes</h3>
        <button type="button" className="button-small" onClick={onCreatePhrase}>
          <FaPlus />
        </button>
      </summary>
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
              disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                      disabled={isReadOnly}
                    >
                      Inactif
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "attack" ? "is-active" : ""}`}
                      aria-pressed={item.role === "attack"}
                      onClick={() => onFormChange(index, { role: "attack" })}
                      disabled={isReadOnly}
                    >
                      Attaque
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "defense" ? "is-active" : ""}`}
                      aria-pressed={item.role === "defense"}
                      onClick={() => onFormChange(index, { role: "defense" })}
                      disabled={isReadOnly}
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
                                disabled={isReadOnly}
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
        <button
          type="button"
          className="chip"
          onClick={onResetForm}
          disabled={isReadOnly}
        >
          Réinitialiser
        </button>
        <button type="button" onClick={onAddStep} disabled={isReadOnly}>
          {editingStepId ? "Mettre à jour la passe" : "Ajouter la passe"}
        </button>
        {editingStepId ? (
          <button
            type="button"
            className="chip"
            onClick={onCancelEditStep}
            disabled={isReadOnly}
          >
            Annuler la modification
          </button>
        ) : null}
      </div>
    </>
  );

  const readingIndexWidth = "30px";
  const readingBlock = activePhrase ? (
    <div className="phrase phrase--reading">
      <div
        className="phrase__header"
        style={{
          gridTemplateColumns: `${readingIndexWidth} repeat(${participants.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="phrase__index phrase__index--header">#</div>
        {participantLabels.map((name, index) => (
          <div key={index} className="phrase__name">
            {name}
          </div>
        ))}
      </div>
      <div className="phrase__body">
        {activePhrase.steps.length === 0 ? (
          <div className="empty">
            <div>Ajoutez une passe pour voir la lecture.</div>
            <button
              type="button"
              className="empty-add"
              onClick={() => {
                onResetForm?.();
                setActiveParticipantIndex(0);
              }}
              disabled={isReadOnly}
              aria-label="Ajouter une passe"
              title="Ajouter une passe"
            >
              <span className="empty-add__icon">
                <FaPlus />
              </span>
            </button>
          </div>
        ) : (
          activePhrase.steps.map((step, index) => {
            return (
              <div
                key={step.id}
                className="phrase__row"
                style={{
                  gap: `10px`,
                  gridTemplateColumns: `${readingIndexWidth} repeat(${participants.length}, minmax(0, 1fr))`,
                }}
              >
                <div className="phrase__index">
                  <div className="phrase__index-number">{index + 1}</div>
                </div>
                {step.participants.map((item, colIndex) => {
                  const role = item.role;
                  const hasCard =
                    role === "attack" ||
                    role === "defense" ||
                    (role === "none" && item.note);
                  return (
                    <div
                      key={`${step.id}-${colIndex}`}
                      className="phrase__cell"
                    >
                      {role === "attack" ? (
                        <StepCard
                          type="action"
                          lines={[
                            buildInlineLine(item, participantLabels[colIndex]),
                          ]}
                          onEdit={() =>
                            openInlineEditor(step.id, colIndex, item)
                          }
                          onLongPress={() =>
                            openInlineEditor(step.id, colIndex, item)
                          }
                          editLabel={`Modifier la passe ${index + 1}`}
                          disabled={isReadOnly}
                        />
                      ) : null}
                      {role === "defense" ? (
                        <StepCard
                          type="reaction"
                          lines={[
                            buildInlineLine(item, participantLabels[colIndex]),
                          ]}
                          onEdit={() =>
                            openInlineEditor(step.id, colIndex, item)
                          }
                          onLongPress={() =>
                            openInlineEditor(step.id, colIndex, item)
                          }
                          editLabel={`Modifier la passe ${index + 1}`}
                          disabled={isReadOnly}
                        />
                      ) : null}
                      {role === "none" && item.note ? (
                        <StepCard
                          type="neutral"
                          lines={[item.note]}
                          onEdit={() =>
                            openInlineEditor(step.id, colIndex, item)
                          }
                          onLongPress={() =>
                            openInlineEditor(step.id, colIndex, item)
                          }
                          editLabel={`Modifier la passe ${index + 1}`}
                          disabled={isReadOnly}
                        />
                      ) : null}
                      {!hasCard ? (
                        <button
                          type="button"
                          className="card-mini__plus-button"
                          onClick={() =>
                            openInlineEditor(
                              step.id,
                              colIndex,
                              {
                                ...emptyParticipantState(),
                                ...(item ?? {}),
                              },
                            )
                          }
                          disabled={isReadOnly}
                          aria-label={`Ajouter une action pour ${participantLabels[colIndex]}`}
                          title="Ajouter"
                        >
                          <span className="card-mini__plus">
                            <FaPlus />
                          </span>
                        </button>
                      ) : null}
                    </div>
                  );
                })}
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
        <div className="panel-header">
          <div>
            <h2>Combat</h2>
            <p className="muted">Édite les phrases et les passes.</p>
          </div>
          <button
            type="button"
            className="chip"
            onClick={() => onNavigate?.("combats")}
          >
            Retour à la liste
          </button>
        </div>
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
              {phraseList}
            </details>
          </div>
          <div className="option-main">
            <details className="fold" open>
              <summary className="fold-title fold-title--spaced">
                Lecture par cartes
              </summary>
              {readingBlock}
            </details>
            <details className="fold" open>
              <summary className="panel-header">
                <div className="header-with-badge">
                  <h3 className="step-header__title">
                    Passe{" "}
                    <span className="badge">
                      #{nextStepIndex >= 0 ? nextStepIndex + 1 : "—"}
                    </span>{" "}
                    de la phrase
                    <span className="badge">
                      #{phraseIndex >= 0 ? phraseIndex + 1 : "—"}
                    </span>
                  </h3>
                </div>
              </summary>
              {stepForm}
            </details>
          </div>
        </div>
      </section>
      {inlineEdit && inlineItem ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closeInlineEditor}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Modifier la passe"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>
              Passe {inlineStepIndex >= 0 ? inlineStepIndex + 1 : "—"} ·{" "}
              {participantLabels[inlineEdit.participantIndex]}
            </h3>

            <div className="participant-card">
              <div className="participant-card__header">
                <div className="participant-name">
                  {participantLabels[inlineEdit.participantIndex]}
                </div>
                <div
                  className="segmented"
                  role="radiogroup"
                  aria-label="Mode de la passe"
                >
                  <button
                    type="button"
                    className={`segmented__item ${inlineItem.mode === "note" ? "is-active" : ""}`}
                    aria-pressed={inlineItem.mode === "note"}
                    onClick={() => updateInlineItem({ mode: "note" })}
                    disabled={isReadOnly}
                  >
                    Note
                  </button>
                  {showPhase ? (
                    <button
                      type="button"
                      className={`segmented__item ${inlineItem.mode === "choregraphie" ? "is-active" : ""}`}
                      aria-pressed={inlineItem.mode === "choregraphie"}
                      onClick={() => updateInlineItem({ mode: "choregraphie" })}
                    >
                      Chorégraphie
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`segmented__item ${inlineItem.mode === "combat" ? "is-active" : ""}`}
                    aria-pressed={inlineItem.mode === "combat"}
                    onClick={() => updateInlineItem({ mode: "combat" })}
                    disabled={isReadOnly}
                  >
                    Combat
                  </button>
                </div>
              </div>

              {inlineItem.mode === "combat" ? (
                <div className="participant-fields">
                  <div
                    className="segmented segmented--tight"
                    role="radiogroup"
                    aria-label="Rôle"
                  >
                    <button
                      type="button"
                      className={`segmented__item ${inlineItem.role === "attack" ? "is-active" : ""}`}
                      aria-pressed={inlineItem.role === "attack"}
                      onClick={() => updateInlineItem({ role: "attack" })}
                      disabled={isReadOnly}
                    >
                      Attaque
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${inlineItem.role === "defense" ? "is-active" : ""}`}
                      aria-pressed={inlineItem.role === "defense"}
                      onClick={() => updateInlineItem({ role: "defense" })}
                      disabled={isReadOnly}
                    >
                      Défense
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${inlineItem.role === "none" ? "is-active" : ""}`}
                      aria-pressed={inlineItem.role === "none"}
                      onClick={() => updateInlineItem({ role: "none" })}
                      disabled={isReadOnly}
                    >
                      Inactif
                    </button>
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={inlineItem.noteOverrides}
                      onChange={(event) =>
                        updateInlineItem({
                          noteOverrides: event.target.checked,
                        })
                      }
                    />
                    La note remplace la formulation
                  </label>
                  {!inlineItem.noteOverrides && inlineItem.role === "attack" ? (
                    <>
                      <label>
                        {uiLabels.offensive}
                        <select
                          value={inlineItem.offensive}
                          onChange={(event) =>
                            updateInlineItem({
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
                          value={inlineItem.action}
                          onChange={(event) =>
                            updateInlineItem({ action: event.target.value })
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
                                checked={inlineItem.attackAttribute.includes(
                                  option.value,
                                )}
                                onChange={() =>
                                  updateInlineItem({
                                    attackAttribute: toggleAttribute(
                                      inlineItem.attackAttribute,
                                      option.value,
                                    ),
                                  })
                                }
                                disabled={isReadOnly}
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </label>
                      <label>
                        {uiLabels.target}
                        <select
                          value={inlineItem.target}
                          onChange={(event) =>
                            updateInlineItem({ target: event.target.value })
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
                          value={inlineItem.attackMove}
                          onChange={(event) =>
                            updateInlineItem({
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
                  {!inlineItem.noteOverrides &&
                  inlineItem.role === "defense" ? (
                    <>
                      <label>
                        {uiLabels.defensive}
                        <select
                          value={inlineItem.defense}
                          onChange={(event) =>
                            updateInlineItem({
                              defense: event.target.value,
                            })
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
                            value={inlineItem.paradeNumber}
                            onChange={(event) =>
                              updateInlineItem({
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
                          value={inlineItem.paradeAttribute}
                          onChange={(event) =>
                            updateInlineItem({
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
                          value={inlineItem.defendMove}
                          onChange={(event) =>
                            updateInlineItem({
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

              {inlineItem.mode === "choregraphie" ? (
                <div className="participant-fields">
                  <label>
                    Phase de chorégraphie
                    <select
                      value={inlineItem.chorePhase}
                      onChange={(event) =>
                        updateInlineItem({
                          chorePhase: event.target.value,
                        })
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
                    value={inlineItem.note}
                    onChange={(event) =>
                      updateInlineItem({ note: event.target.value })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="chip"
                onClick={closeInlineEditor}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveInlineEditor}
                disabled={isReadOnly}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
