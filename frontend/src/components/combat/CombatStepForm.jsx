import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaXmark, FaTrash } from "react-icons/fa6";

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
  insertStepIndex,
  editingStepId,
  onCancelEditStep,
  buildSummaryLine,
  showParadeNumber,
  formVariant = "classic",
}) {
  const isSabre = formVariant === "sabre";
  const [builderSelections, setBuilderSelections] = useState(() =>
    participants.map(() => ({
      attackMove: "",
      defendMove: "",
      paradeAttribute: "",
    })),
  );
  const [actionFeedback, setActionFeedback] = useState(() =>
    participants.map(() => false),
  );

  useEffect(() => {
    setBuilderSelections((prev) =>
      participants.map(
        (_, index) =>
          prev[index] ?? {
            attackMove: "",
            defendMove: "",
            paradeAttribute: "",
          },
      ),
    );
    setActionFeedback((prev) =>
      participants.map((_, index) => prev[index] ?? false),
    );
  }, [participants.length]);

  const actionsOptions = useMemo(
    () => orderOptions(normalizedLexicon.action ?? [], favoriteKeys.action),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const offensiveOptions = useMemo(
    () =>
      orderOptions(normalizedLexicon.offensive ?? [], favoriteKeys.offensive),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const attackAttributeOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.attackAttribute ?? [],
        favoriteKeys.attackAttribute,
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const targetOptions = useMemo(
    () => orderOptions(normalizedLexicon.cible ?? [], favoriteKeys.target),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const attackMoveOptions = useMemo(
    () =>
      orderOptions(normalizedLexicon.attackMove ?? [], favoriteKeys.attackMove),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const defensiveOptions = useMemo(
    () =>
      orderOptions(normalizedLexicon.defensive ?? [], favoriteKeys.defensive),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const paradeNumberOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.paradeNumber ?? [],
        favoriteKeys.paradeNumber,
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const paradeAttributeOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.paradeAttribute ?? [],
        favoriteKeys.paradeAttribute,
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const defendMoveOptions = useMemo(
    () =>
      orderOptions(normalizedLexicon.defendMove ?? [], favoriteKeys.defendMove),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );

  function splitTokens(value) {
    if (!value) return [];
    return value
      .split(" · ")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function joinTokens(values) {
    return values.join(" · ");
  }

  function getTokenList(item, key) {
    return splitTokens(item[key]);
  }

  function updateTokenList(index, key, nextList) {
    onFormChange(index, { [key]: joinTokens(nextList) });
  }

  function addToken(index, key, value) {
    if (!value) return;
    const list = getTokenList(form[index], key);
    if (list.includes(value)) return;
    updateTokenList(index, key, [...list, value]);
  }

  function removeToken(index, key, value) {
    const list = getTokenList(form[index], key);
    updateTokenList(
      index,
      key,
      list.filter((item) => item !== value),
    );
  }

  function updateBuilderSelection(index, patch) {
    setBuilderSelections((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    );
  }

  function getActionDetails(item) {
    if (Array.isArray(item.actionDetails) && item.actionDetails.length) {
      return item.actionDetails.map((detail) => ({
        action: detail?.action ?? "",
        attribute: detail?.attribute ?? "",
      }));
    }
    if (item.action || (item.attackAttribute && item.attackAttribute.length)) {
      return [
        {
          action: item.action ?? "",
          attribute: item.attackAttribute?.[0] ?? "",
        },
      ];
    }
    return [];
  }

  function getDefenseDetails(item) {
    if (Array.isArray(item.defenseDetails) && item.defenseDetails.length) {
      return item.defenseDetails.map((detail) => ({
        defense: detail?.defense ?? "",
        position: detail?.position ?? "",
        attribute: detail?.attribute ?? "",
      }));
    }
    if (item.defense || item.paradeNumber || item.paradeAttribute) {
      return [
        {
          defense: item.defense ?? "",
          position: item.paradeNumber ?? "",
          attribute: item.paradeAttribute ?? "",
        },
      ];
    }
    return [];
  }

  function updateDefenseDetails(index, nextDetails) {
    onFormChange(index, {
      defenseDetails: nextDetails,
      defense: nextDetails[0]?.defense ?? "",
      paradeNumber: nextDetails[0]?.position ?? "",
      paradeAttribute: nextDetails[0]?.attribute ?? "",
    });
  }

  function addDefenseDetail(index) {
    const list = getDefenseDetails(form[index]);
    updateDefenseDetails(index, [
      ...list,
      { defense: "", position: "", attribute: "" },
    ]);
  }

  function updateDefenseDetail(index, detailIndex, patch) {
    const list = getDefenseDetails(form[index]);
    const next = list.map((detail, idx) =>
      idx === detailIndex ? { ...detail, ...patch } : detail,
    );
    updateDefenseDetails(index, next);
  }

  function removeDefenseDetail(index, detailIndex) {
    const list = getDefenseDetails(form[index]);
    updateDefenseDetails(
      index,
      list.filter((_, idx) => idx !== detailIndex),
    );
  }

  function updateActionDetails(index, nextDetails) {
    onFormChange(index, {
      actionDetails: nextDetails,
      action: nextDetails[0]?.action ?? "",
      attackAttribute: nextDetails[0]?.attribute
        ? [nextDetails[0].attribute]
        : [],
    });
  }

  function addActionDetail(index) {
    const list = getActionDetails(form[index]);
    updateActionDetails(index, [...list, { action: "", attribute: "" }]);
    setActionFeedback((prev) =>
      prev.map((flag, idx) => (idx === index ? true : flag)),
    );
    setTimeout(() => {
      setActionFeedback((prev) =>
        prev.map((flag, idx) => (idx === index ? false : flag)),
      );
    }, 1200);
  }

  function updateActionDetail(index, detailIndex, patch) {
    const list = getActionDetails(form[index]);
    const next = list.map((detail, idx) =>
      idx === detailIndex ? { ...detail, ...patch } : detail,
    );
    updateActionDetails(index, next);
  }

  function removeActionDetail(index, detailIndex) {
    const list = getActionDetails(form[index]);
    updateActionDetails(
      index,
      list.filter((_, idx) => idx !== detailIndex),
    );
  }

  function renderTokenField({
    index,
    item,
    label,
    fieldKey,
    options,
    selectionKey,
    emptyLabel,
    autoAddOnSelect = false,
  }) {
    const tokens = getTokenList(item, fieldKey);
    const selection = builderSelections[index]?.[selectionKey] ?? "";

    return (
      <div className="builder builder--compact">
        <div className="builder-header">
          <div className="text-strong">{label}</div>
          <div className="text-sm text-muted">{emptyLabel}</div>
        </div>
        <div className="builder-controls">
          <label>
            Sélection
            <select
              value={selection}
              onChange={(event) =>
                autoAddOnSelect
                  ? (() => {
                      const value = event.target.value;
                      if (!value) {
                        updateBuilderSelection(index, { [selectionKey]: "" });
                        return;
                      }
                      addToken(index, fieldKey, value);
                      updateBuilderSelection(index, { [selectionKey]: "" });
                    })()
                  : updateBuilderSelection(index, {
                      [selectionKey]: event.target.value,
                    })
              }
            >
              <option value="">—</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {!autoAddOnSelect ? (
            <button
              type="button"
              className="button-icon button-secondary"
              onClick={() => {
                if (!selection) return;
                addToken(index, fieldKey, selection);
                updateBuilderSelection(index, { [selectionKey]: "" });
              }}
              disabled={!selection}
              aria-label={`Ajouter ${label}`}
              title="Ajouter"
            >
              <FaPlus />
            </button>
          ) : null}
        </div>
        {tokens.length ? (
          <div className="builder-tags">
            {tokens.map((token) => (
              <span key={token} className="builder-tag">
                <span className="builder-tag-value">{token}</span>
                <button
                  type="button"
                  className="button-icon button-ghost builder-tag-remove"
                  onClick={() => removeToken(index, fieldKey, token)}
                  aria-label={`Retirer ${token}`}
                  title="Retirer"
                >
                  <FaXmark />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted">Aucun mot sélectionné.</div>
        )}
      </div>
    );
  }

  const summaryLines = form.map((item, index) => ({
    name: participantLabels[index] ?? participants[index],
    text: buildSummaryLine(item, participants[index], index),
  }));
  const hasAnySummary = summaryLines.some(
    (line) => line.text && line.text !== "inactif",
  );

  return (
    <>
      {hasAnySummary ? (
        <div className="summary">
          <h3 className="subtitle">Phrase résumée</h3>
          <div className="text-md stack-1">
            {summaryLines.map((line, index) => (
              <div key={`${index}-summary`} className="summary-line">
                <span className="summary-name">{line.name}</span>
                <span className="summary-text">{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
                    onClick={() =>
                      onFormChange(index, {
                        mode: "combat",
                        noteOverrides: false,
                      })
                    }
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
                      onClick={() =>
                        onFormChange(index, {
                          role: "attack",
                          noteOverrides: false,
                        })
                      }
                      disabled={isReadOnly}
                    >
                      Attaque
                    </button>
                    <button
                      type="button"
                      className={`segmented-button ${item.role === "defense" ? "is-active" : ""}`}
                      aria-pressed={item.role === "defense"}
                      onClick={() =>
                        onFormChange(index, {
                          role: "defense",
                          noteOverrides: false,
                        })
                      }
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

                  {!item.noteOverrides && item.role === "attack" ? (
                    <div className="form-section">
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
                          {offensiveOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="form-section form-section--soft">
                        <div className="text-strong">Action d&apos;arme</div>
                        <div className="text-sm text-muted">
                          Ajoute une ou plusieurs actions, chacune avec son
                          attribut.
                        </div>
                        {actionFeedback[index] ? (
                          <div className="text-sm text-muted">
                            Action ajoutée.
                          </div>
                        ) : null}
                        <div className="action-list">
                          {getActionDetails(item).map((detail, detailIndex) => (
                            <div
                              key={`action-${detailIndex}`}
                              className="action-row action-row--two"
                            >
                              <label>
                                Action
                                <select
                                  value={detail.action}
                                  onChange={(event) =>
                                    updateActionDetail(index, detailIndex, {
                                      action: event.target.value,
                                    })
                                  }
                                >
                                  <option value="">—</option>
                                  {actionsOptions.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Attribut
                                <select
                                  value={detail.attribute}
                                  onChange={(event) =>
                                    updateActionDetail(index, detailIndex, {
                                      attribute: event.target.value,
                                    })
                                  }
                                >
                                  <option value="">—</option>
                                  {attackAttributeOptions.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                className="button-icon button-ghost"
                                onClick={() =>
                                  removeActionDetail(index, detailIndex)
                                }
                                aria-label="Retirer l'action"
                                title="Retirer"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="button-secondary button-with-icon"
                            onClick={() => addActionDetail(index)}
                          >
                            <FaPlus />
                            Ajouter une action
                          </button>
                        </div>
                      </div>

                      {getActionDetails(item).some(
                        (detail) => detail.action,
                      ) ? (
                        <>
                          <label>
                            {uiLabels.target}
                            <select
                              value={item.target}
                              onChange={(event) =>
                                onFormChange(index, {
                                  target: event.target.value,
                                })
                              }
                            >
                              <option value="">—</option>
                              {targetOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          {renderTokenField({
                            index,
                            item,
                            label: uiLabels.attackMove,
                            fieldKey: "attackMove",
                            options: attackMoveOptions,
                            selectionKey: "attackMove",
                            emptyLabel: "Ajoute un ou plusieurs déplacements.",
                            autoAddOnSelect: true,
                          })}
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  {!item.noteOverrides && item.role === "defense" ? (
                    <div className="form-section">
                      <div className="form-section form-section--soft">
                        <div className="text-strong">Défensive</div>
                        <div className="text-sm text-muted">
                          Ajoute une ou plusieurs défensives, chacune avec sa
                          position et son attribut.
                        </div>
                        <div className="action-list">
                          {getDefenseDetails(item).map(
                            (detail, detailIndex) => (
                              <div
                                key={`defense-${detailIndex}`}
                                className="action-row"
                              >
                                <label>
                                  {uiLabels.defensive}
                                  <select
                                    value={detail.defense}
                                    onChange={(event) =>
                                      updateDefenseDetail(index, detailIndex, {
                                        defense: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="">—</option>
                                    {defensiveOptions.map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                {showParadeNumber ? (
                                  <label>
                                    {uiLabels.paradeNumber}
                                    <select
                                      value={detail.position}
                                      onChange={(event) =>
                                        updateDefenseDetail(
                                          index,
                                          detailIndex,
                                          {
                                            position: event.target.value,
                                          },
                                        )
                                      }
                                    >
                                      <option value="">—</option>
                                      {paradeNumberOptions.map((option) => (
                                        <option
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}
                                <label>
                                  {uiLabels.paradeAttribute}
                                  <select
                                    value={detail.attribute}
                                    onChange={(event) =>
                                      updateDefenseDetail(index, detailIndex, {
                                        attribute: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="">—</option>
                                    {paradeAttributeOptions.map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <button
                                  type="button"
                                  className="button-icon button-ghost"
                                  onClick={() =>
                                    removeDefenseDetail(index, detailIndex)
                                  }
                                  aria-label="Retirer la défensive"
                                  title="Retirer"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            ),
                          )}
                          <button
                            type="button"
                            className="button-secondary button-with-icon"
                            onClick={() => addDefenseDetail(index)}
                          >
                            <FaPlus />
                            Ajouter une défensive
                          </button>
                        </div>
                      </div>

                      {getDefenseDetails(item).some((detail) => detail.defense)
                        ? renderTokenField({
                            index,
                            item,
                            label: uiLabels.defendMove,
                            fieldKey: "defendMove",
                            options: defendMoveOptions,
                            selectionKey: "defendMove",
                            emptyLabel: "Ajoute un ou plusieurs déplacements.",
                            autoAddOnSelect: true,
                          })
                        : null}
                    </div>
                  ) : null}

                  {item.role === "none" ? (
                    <label>
                      {uiLabels.notes}
                      <div className="input-with-clear">
                        <input
                          value={item.note}
                          onChange={(event) =>
                            onFormChange(index, { note: event.target.value })
                          }
                        />
                        {item.note ? (
                          <button
                            type="button"
                            className="input-clear"
                            onClick={() => onFormChange(index, { note: "" })}
                            aria-label="Effacer la note"
                            title="Effacer"
                          />
                        ) : null}
                      </div>
                    </label>
                  ) : null}

                  {item.role !== "none" ? (
                    <label>
                      {uiLabels.notes}
                      <div className="input-with-clear">
                        <input
                          value={item.note}
                          onChange={(event) =>
                            onFormChange(index, { note: event.target.value })
                          }
                        />
                        {item.note ? (
                          <button
                            type="button"
                            className="input-clear"
                            onClick={() => onFormChange(index, { note: "" })}
                            aria-label="Effacer la note"
                            title="Effacer"
                          />
                        ) : null}
                      </div>
                    </label>
                  ) : null}
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
                  {item.chorePhase ? (
                    <label>
                      {uiLabels.notes}
                      <div className="input-with-clear">
                        <input
                          value={item.note}
                          onChange={(event) =>
                            onFormChange(index, { note: event.target.value })
                          }
                        />
                        {item.note ? (
                          <button
                            type="button"
                            className="input-clear"
                            onClick={() => onFormChange(index, { note: "" })}
                            aria-label="Effacer la note"
                            title="Effacer"
                          />
                        ) : null}
                      </div>
                    </label>
                  ) : null}
                </div>
              ) : null}

              {item.mode !== "combat" && item.mode !== "choregraphie" ? (
                <div className="participant-fields">
                  <label>
                    {uiLabels.notes}
                    <div className="input-with-clear">
                      <input
                        value={item.note}
                        onChange={(event) =>
                          onFormChange(index, { note: event.target.value })
                        }
                      />
                      {item.note ? (
                        <button
                          type="button"
                          className="input-clear"
                          onClick={() => onFormChange(index, { note: "" })}
                          aria-label="Effacer la note"
                          title="Effacer"
                        />
                      ) : null}
                    </div>
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="button-secondary"
          onClick={onResetForm}
          disabled={isReadOnly}
        >
          Réinitialiser
        </button>
        <button
          type="button"
          className="button-primary"
          onClick={onAddStep}
          disabled={isReadOnly}
        >
          {editingStepId
            ? "Mettre à jour la passe"
            : insertStepIndex != null
              ? "Insérer la passe"
              : "Ajouter la passe"}
        </button>
        {editingStepId ? (
          <button
            type="button"
            className="button-ghost"
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
