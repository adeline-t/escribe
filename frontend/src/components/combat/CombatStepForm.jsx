export default function CombatStepForm({
  form,
  participants,
  participantLabels,
  activeParticipantIndex,
  setActiveParticipantIndex,
  showPhase,
  phaseOptions,
  uiLabels,
  favoriteKeys,
  normalizedLexicon,
  orderOptions,
  onFormChange,
  toggleAttribute,
  isReadOnly,
  onResetForm,
  onAddStep,
  editingStepId,
  onCancelEditStep,
  buildSummaryLine,
  showParadeNumber,
  formVariant = "classic",
}) {
  const isSabre = formVariant === "sabre";

  function renderAttackFields(item, index) {
    if (item.noteOverrides || item.role !== "attack") return null;
    if (!isSabre) {
      return (
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
                    checked={item.attackAttribute.includes(option.value)}
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
      );
    }

    return (
      <div className="form-grid">
        <label>
          {uiLabels.action}
          <span className="field-hint">Préparation ou liaison</span>
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
          {uiLabels.offensive}
          <span className="field-hint">Technique principale</span>
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
        <label className="col-span-2">
          {uiLabels.attackAttribute}
          <select
            value={item.attackAttribute[0] ?? ""}
            onChange={(event) =>
              onFormChange(index, {
                attackAttribute: event.target.value
                  ? [event.target.value]
                  : [],
              })
            }
          >
            <option value="">—</option>
            {orderOptions(
              normalizedLexicon.attackAttribute,
              favoriteKeys.attackAttribute,
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
      </div>
    );
  }

  function renderDefenseFields(item, index) {
    if (item.noteOverrides || item.role !== "defense") return null;
    if (!isSabre) {
      return (
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
      );
    }

    return (
      <div className="form-grid">
        <label>
          {uiLabels.defensive}
          <span className="field-hint">Protection ou esquive</span>
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
        <label>
          {uiLabels.paradeAttribute}
          <span className="field-hint field-hint--spacer">.</span>
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
      </div>
    );
  }

  return (
    <>
      <div className="summary">
        <h3 className="subtitle">Phrase résumée</h3>
        <div className="text-md stack-1">
          {form.map((item, index) => (
            <div key={`${index}-summary`} className="summary-line">
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
      <div className={`participant-grid cols-${participants.length}`}>
        {participants.map((_, index) => {
          const item = form[index];
          const name = participantLabels[index];
          return (
            <div
              key={`${name}-${index}`}
              className={`participant-card ${index === activeParticipantIndex ? "is-active" : ""}`}
            >
              <div className="participant-card-header">
                <div className="text-strong">{name}</div>
                <div
                  className="segmented segmented--solid"
                  role="radiogroup"
                  aria-label={`Mode de ${name}`}
                >
                  <button
                    type="button"
                    className={`segmented-button ${item.mode === "note" ? "is-active" : ""}`}
                    aria-pressed={item.mode === "note"}
                    onClick={() => onFormChange(index, { mode: "note" })}
                    disabled={isReadOnly}
                  >
                    Note
                  </button>
                  {showPhase ? (
                    <button
                      type="button"
                      className={`segmented-button ${item.mode === "choregraphie" ? "is-active" : ""}`}
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
                    className={`segmented-button ${item.mode === "combat" ? "is-active" : ""}`}
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
                    className="segmented segmented--outline segmented--compact"
                    role="radiogroup"
                    aria-label={`Rôle de ${name}`}
                  >
                    <button
                      type="button"
                      className={`segmented-button ${item.role === "attack" ? "is-active" : ""}`}
                      aria-pressed={item.role === "attack"}
                      onClick={() => onFormChange(index, { role: "attack" })}
                      disabled={isReadOnly}
                    >
                      Attaque
                    </button>
                    <button
                      type="button"
                      className={`segmented-button ${item.role === "defense" ? "is-active" : ""}`}
                      aria-pressed={item.role === "defense"}
                      onClick={() => onFormChange(index, { role: "defense" })}
                      disabled={isReadOnly}
                    >
                      Défense
                    </button>
                    <button
                      type="button"
                      className={`segmented-button ${item.role === "none" ? "is-active" : ""}`}
                      aria-pressed={item.role === "none"}
                      onClick={() => onFormChange(index, { role: "none" })}
                      disabled={isReadOnly}
                    >
                      Inactif
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
                  {renderAttackFields(item, index)}
                  {renderDefenseFields(item, index)}
                </div>
              ) : null}

              {item.mode === "choregraphie" ? (
                <div className="participant-fields">
                  <label>
                    Phase de chorégraphie
                    {isSabre ? (
                      <span className="field-hint">
                        Mouvement scénique ou intention
                      </span>
                    ) : null}
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
}
