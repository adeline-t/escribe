export default function StepInlineEditorModal({
  isOpen,
  inlineEdit,
  inlineItem,
  participantLabels,
  inlineStepIndex,
  showPhase,
  phaseOptions,
  uiLabels,
  favoriteKeys,
  normalizedLexicon,
  orderOptions,
  toggleAttribute,
  showParadeNumber,
  isReadOnly,
  onClose,
  onSave,
  onUpdateInlineItem,
}) {
  if (!isOpen || !inlineEdit || !inlineItem) return null;

  const participantName =
    participantLabels[inlineEdit.participantIndex] || "—";

  function updateInlineItem(patch) {
    onUpdateInlineItem?.(patch);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Modifier la passe"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="subtitle">
          Passe {inlineStepIndex >= 0 ? inlineStepIndex + 1 : "—"} ·{" "}
          {participantName}
        </h3>

        <div className="participant-card">
          <div className="participant-card-header">
            <div className="text-strong">{participantName}</div>
            <div
              className="segmented segmented--solid"
              role="radiogroup"
              aria-label="Mode de la passe"
            >
              <button
                type="button"
                className={`segmented-button ${inlineItem.mode === "note" ? "is-active" : ""}`}
                aria-pressed={inlineItem.mode === "note"}
                onClick={() => updateInlineItem({ mode: "note" })}
                disabled={isReadOnly}
              >
                Note
              </button>
              {showPhase ? (
                <button
                  type="button"
                  className={`segmented-button ${inlineItem.mode === "choregraphie" ? "is-active" : ""}`}
                  aria-pressed={inlineItem.mode === "choregraphie"}
                  onClick={() => updateInlineItem({ mode: "choregraphie" })}
                >
                  Chorégraphie
                </button>
              ) : null}
              <button
                type="button"
                className={`segmented-button ${inlineItem.mode === "combat" ? "is-active" : ""}`}
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
                className="segmented segmented--outline segmented--compact"
                role="radiogroup"
                aria-label="Rôle"
              >
                <button
                  type="button"
                  className={`segmented-button ${inlineItem.role === "attack" ? "is-active" : ""}`}
                  aria-pressed={inlineItem.role === "attack"}
                  onClick={() => updateInlineItem({ role: "attack" })}
                  disabled={isReadOnly}
                >
                  Attaque
                </button>
                <button
                  type="button"
                  className={`segmented-button ${inlineItem.role === "defense" ? "is-active" : ""}`}
                  aria-pressed={inlineItem.role === "defense"}
                  onClick={() => updateInlineItem({ role: "defense" })}
                  disabled={isReadOnly}
                >
                  Défense
                </button>
                <button
                  type="button"
                  className={`segmented-button ${inlineItem.role === "none" ? "is-active" : ""}`}
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
              {!inlineItem.noteOverrides && inlineItem.role === "defense" ? (
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
          <button type="button" className="chip" onClick={onClose}>
            Annuler
          </button>
          <button type="button" onClick={onSave} disabled={isReadOnly}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
