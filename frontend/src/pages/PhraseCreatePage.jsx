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
  onParticipantCountChange,
  onParticipantNameChange,
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
  toggleAttribute
}) {
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

  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Combat</h2>
            <p className="muted">Décris le contexte avant de saisir les phrases d'armes.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="span-2">
            Nom du combat
            <input value={combatName} onChange={(event) => onCombatNameChange(event.target.value)} />
          </label>
          <label className="span-2">
            Description
            <input
              value={combatDescription}
              onChange={(event) => onCombatDescriptionChange(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Combat - participants</h2>
            <p className="muted">Définissez les combattants liés à ce combat.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Nombre de combattants
            <select value={participants.length} onChange={(event) => onParticipantCountChange(event.target.value)}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <div className="names span-2">
            {participants.map((name, index) => (
              <label key={index}>
                {`Nom ${index + 1}`}
                <input
                  value={name}
                  placeholder={buildParticipantLabel(index)}
                  onChange={(event) => onParticipantNameChange(index, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Phrases d'armes</h2>
            <p className="muted">Crée et organise les phrases d'armes de ce combat.</p>
          </div>
          <button type="button" onClick={onCreatePhrase}>
            Ajouter une phrase
          </button>
        </div>

        <div className="phrase-layout">
          <aside className="phrase-list">
            {phrases.length === 0 ? (
              <div className="lexicon-empty">
                <div className="lexicon-empty__title">Aucune phrase.</div>
                <div className="lexicon-empty__subtitle">Ajoute une phrase pour commencer.</div>
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
                    <div className="phrase-row__title">{phrase.name}</div>
                    <div className="phrase-row__meta">
                      {phrase.steps.length} étape{phrase.steps.length > 1 ? "s" : ""} · #{index + 1}
                    </div>
                  </button>
                  <div className="phrase-row__actions">
                    <button type="button" className="chip" onClick={() => onMovePhrase(phrase.id, "up")}>↑</button>
                    <button type="button" className="chip" onClick={() => onMovePhrase(phrase.id, "down")}>↓</button>
                    <button type="button" className="chip chip--danger" onClick={() => onDeletePhrase(phrase.id)}>Suppr.</button>
                  </div>
                </div>
              ))
            )}
          </aside>

          <div className="phrase-editor">
            {!activePhrase ? (
              <div className="lexicon-empty">
                <div className="lexicon-empty__title">Sélectionne une phrase.</div>
                <div className="lexicon-empty__subtitle">Choisis une phrase dans la liste ou crée-en une nouvelle.</div>
              </div>
            ) : (
              <>
                <div className="panel" style={{ marginBottom: "16px" }}>
                  <label>
                    Nom de la phrase d'arme
                    <input
                      value={activePhrase.name}
                      onChange={(event) => onRenamePhrase(activePhrase.id, event.target.value)}
                    />
                  </label>
                  <div className="muted" style={{ marginTop: "6px" }}>
                    Numéro de la phrase d'arme: {phrases.findIndex((phrase) => phrase.id === activePhrase.id) + 1}
                  </div>
                </div>

                <div className="panel-header">
                  <div>
                    <h3>Étapes de la phrase</h3>
                    <p className="muted">Numéro de l'étape: {stepsCount + 1}</p>
                  </div>
                  <div className="phrase-nav">
                    <button
                      type="button"
                      className="chip"
                      onClick={() => {
                        const index = phrases.findIndex((phrase) => phrase.id === activePhrase.id);
                        if (index > 0) {
                          onSelectPhrase(phrases[index - 1].id);
                        }
                      }}
                    >
                      Phrase précédente
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => {
                        const index = phrases.findIndex((phrase) => phrase.id === activePhrase.id);
                        if (index < phrases.length - 1) {
                          onSelectPhrase(phrases[index + 1].id);
                        }
                      }}
                    >
                      Phrase suivante
                    </button>
                  </div>
                </div>

                {activePhrase.steps.length > 0 ? (
                  <div className="step-list">
                    {activePhrase.steps.map((step, index) => (
                      <div key={step.id} className={`step-row ${editingStepId === step.id ? "is-active" : ""}`}>
                        <div>
                          <div className="step-row__title">Étape {index + 1}</div>
                          <div className="step-row__meta">
                            {step.participants?.filter((item) => item.role !== "none").length || 0} rôles actifs
                          </div>
                        </div>
                        <div className="step-row__actions">
                          <button type="button" className="chip" onClick={() => onEditStep(step.id)}>
                            Modifier
                          </button>
                          <button type="button" className="chip chip--danger" onClick={() => onRemoveStep(step.id)}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty">Aucune étape pour le moment.</div>
                )}

                <div
                  className="participant-grid"
                  style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}
                >
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
                        </div>

                        {item.role === "attack" ? (
                          <div className="participant-fields">
                            <label className="checkbox">
                              <input
                                type="checkbox"
                                checked={item.noteOverrides}
                                onChange={(event) => onFormChange(index, { noteOverrides: event.target.checked })}
                              />
                              La note remplace la formulation
                            </label>
                            {!item.noteOverrides ? (
                              <>
                                <label>
                                  Offensive
                                  <select
                                    value={item.offensive}
                                    onChange={(event) => onFormChange(index, { offensive: event.target.value })}
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
                                    onChange={(event) => onFormChange(index, { action: event.target.value })}
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
                                            onFormChange(index, {
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
                                    onChange={(event) => onFormChange(index, { target: event.target.value })}
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
                                    onChange={(event) => onFormChange(index, { attackMove: event.target.value })}
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
                                onChange={(event) => onFormChange(index, { note: event.target.value })}
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
                                onChange={(event) => onFormChange(index, { noteOverrides: event.target.checked })}
                              />
                              La note remplace la formulation
                            </label>
                            {!item.noteOverrides ? (
                              <>
                                <label>
                                  Défensive
                                  <select
                                    value={item.defense}
                                    onChange={(event) => onFormChange(index, { defense: event.target.value })}
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
                                    onChange={(event) => onFormChange(index, { paradeNumber: event.target.value })}
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
                                    onChange={(event) => onFormChange(index, { paradeAttribute: event.target.value })}
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
                                    onChange={(event) => onFormChange(index, { defendMove: event.target.value })}
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
                                onChange={(event) => onFormChange(index, { note: event.target.value })}
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
                                onChange={(event) => onFormChange(index, { note: event.target.value })}
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
                  <button type="button" onClick={onAddStep}>
                    {editingStepId ? "Mettre à jour l'étape" : "Ajouter l'étape"}
                  </button>
                  {editingStepId ? (
                    <button type="button" className="chip" onClick={onCancelEditStep}>
                      Annuler la modification
                    </button>
                  ) : null}
                </div>

                <section className="panel panel--ghost" style={{ marginTop: "16px" }}>
                  <div className="panel-header">
                    <div>
                      <h3>Lecture de la phrase</h3>
                      <p className="muted">Visualisez les étapes sous forme de cartes et flèches.</p>
                    </div>
                    <span className="muted">{activePhrase.steps.length} étape{activePhrase.steps.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="phrase">
                    <div className="phrase__header" style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}>
                      {participantLabels.map((name, index) => (
                        <div key={index} className="phrase__name">
                          {name}
                        </div>
                      ))}
                    </div>
                    <div className="phrase__body">
                      {activePhrase.steps.length === 0 ? (
                        <div className="empty">Ajoutez une étape pour voir la lecture.</div>
                      ) : (
                        activePhrase.steps.map((step, index) => {
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
                                      <StepCard type="neutral" title="Note" accent="accent-neutral" lines={[item.note]} />
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
                                            left: `calc(${isReverse ? defender.index : attacker.index} * 100% / ${participants.length} + 16px)`,
                                            width: `calc(${Math.max(0, Math.abs(defender.index - attacker.index))} * 100% / ${participants.length} - 32px)`
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
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
