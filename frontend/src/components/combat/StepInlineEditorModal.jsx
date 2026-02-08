import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaXmark, FaTrash } from "react-icons/fa6";

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
  showParadeNumber,
  isReadOnly,
  onClose,
  onSave,
  onUpdateInlineItem,
}) {
  if (!isOpen || !inlineEdit || !inlineItem) return null;

  const participantName = participantLabels[inlineEdit.participantIndex] || "—";
  const [builderSelection, setBuilderSelection] = useState({
    attackMove: "",
    defendMove: "",
    paradeAttribute: "",
  });
  const [actionFeedback, setActionFeedback] = useState(false);

  useEffect(() => {
    setBuilderSelection({ attackMove: "", defendMove: "", paradeAttribute: "" });
    setActionFeedback(false);
  }, [inlineEdit?.stepId, inlineEdit?.participantIndex]);

  const actionsOptions = useMemo(
    () =>
      orderOptions(normalizedLexicon.action ?? [], favoriteKeys.action),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const offensiveOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.offensive ?? [],
        favoriteKeys.offensive,
      ),
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
      orderOptions(
        normalizedLexicon.attackMove ?? [],
        favoriteKeys.attackMove,
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const defensiveOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.defensive ?? [],
        favoriteKeys.defensive,
      ),
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
      orderOptions(
        normalizedLexicon.defendMove ?? [],
        favoriteKeys.defendMove,
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );

  function updateInlineItem(patch) {
    onUpdateInlineItem?.(patch);
  }

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

  function getTokenList(key) {
    return splitTokens(inlineItem[key]);
  }

  function updateTokenList(key, nextList) {
    updateInlineItem({ [key]: joinTokens(nextList) });
  }

  function addToken(key, value) {
    if (!value) return;
    const list = getTokenList(key);
    if (list.includes(value)) return;
    updateTokenList(key, [...list, value]);
  }

  function removeToken(key, value) {
    const list = getTokenList(key);
    updateTokenList(
      key,
      list.filter((item) => item !== value),
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

  function updateDefenseDetails(nextDetails) {
    updateInlineItem({
      defenseDetails: nextDetails,
      defense: nextDetails[0]?.defense ?? "",
      paradeNumber: nextDetails[0]?.position ?? "",
      paradeAttribute: nextDetails[0]?.attribute ?? "",
    });
  }

  function addDefenseDetail() {
    const list = getDefenseDetails(inlineItem);
    updateDefenseDetails([
      ...list,
      { defense: "", position: "", attribute: "" },
    ]);
  }

  function updateDefenseDetail(detailIndex, patch) {
    const list = getDefenseDetails(inlineItem);
    const next = list.map((detail, idx) =>
      idx === detailIndex ? { ...detail, ...patch } : detail,
    );
    updateDefenseDetails(next);
  }

  function removeDefenseDetail(detailIndex) {
    const list = getDefenseDetails(inlineItem);
    updateDefenseDetails(list.filter((_, idx) => idx !== detailIndex));
  }

  function updateActionDetails(nextDetails) {
    updateInlineItem({
      actionDetails: nextDetails,
      action: nextDetails[0]?.action ?? "",
      attackAttribute: nextDetails[0]?.attribute
        ? [nextDetails[0].attribute]
        : [],
    });
  }

  function addActionDetail() {
    const list = getActionDetails(inlineItem);
    updateActionDetails([...list, { action: "", attribute: "" }]);
    setActionFeedback(true);
    setTimeout(() => setActionFeedback(false), 1200);
  }

  function updateActionDetail(detailIndex, patch) {
    const list = getActionDetails(inlineItem);
    const next = list.map((detail, idx) =>
      idx === detailIndex ? { ...detail, ...patch } : detail,
    );
    updateActionDetails(next);
  }

  function removeActionDetail(detailIndex) {
    const list = getActionDetails(inlineItem);
    updateActionDetails(list.filter((_, idx) => idx !== detailIndex));
  }

  function renderTokenField({
    label,
    fieldKey,
    options,
    selectionKey,
    emptyLabel,
    autoAddOnSelect = false,
  }) {
    const tokens = getTokenList(fieldKey);
    const selection = builderSelection[selectionKey] ?? "";

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
                        setBuilderSelection((prev) => ({
                          ...prev,
                          [selectionKey]: "",
                        }));
                        return;
                      }
                      addToken(fieldKey, value);
                      setBuilderSelection((prev) => ({
                        ...prev,
                        [selectionKey]: "",
                      }));
                    })()
                  : setBuilderSelection((prev) => ({
                      ...prev,
                      [selectionKey]: event.target.value,
                    }))
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
                addToken(fieldKey, selection);
                setBuilderSelection((prev) => ({
                  ...prev,
                  [selectionKey]: "",
                }));
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
                  onClick={() => removeToken(fieldKey, token)}
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
                className={`segmented-button ${
                  inlineItem.mode === "note" ? "is-active" : ""
                }`}
                aria-pressed={inlineItem.mode === "note"}
                onClick={() => updateInlineItem({ mode: "note" })}
                disabled={isReadOnly}
              >
                Note
              </button>
              {showPhase ? (
              <button
                type="button"
                className={`segmented-button ${
                  inlineItem.mode === "choregraphie" ? "is-active" : ""
                }`}
                aria-pressed={inlineItem.mode === "choregraphie"}
                onClick={() => updateInlineItem({ mode: "choregraphie" })}
              >
                Chorégraphie
              </button>
              ) : null}
              <button
                type="button"
                className={`segmented-button ${
                  inlineItem.mode === "combat" ? "is-active" : ""
                }`}
                aria-pressed={inlineItem.mode === "combat"}
                onClick={() =>
                  updateInlineItem({ mode: "combat", noteOverrides: false })
                }
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
                  className={`segmented-button ${
                    inlineItem.role === "attack" ? "is-active" : ""
                  }`}
                  aria-pressed={inlineItem.role === "attack"}
                  onClick={() =>
                    updateInlineItem({ role: "attack", noteOverrides: false })
                  }
                  disabled={isReadOnly}
                >
                  Attaque
                </button>
                <button
                  type="button"
                  className={`segmented-button ${
                    inlineItem.role === "defense" ? "is-active" : ""
                  }`}
                  aria-pressed={inlineItem.role === "defense"}
                  onClick={() =>
                    updateInlineItem({ role: "defense", noteOverrides: false })
                  }
                  disabled={isReadOnly}
                >
                  Défense
                </button>
                <button
                  type="button"
                  className={`segmented-button ${
                    inlineItem.role === "none" ? "is-active" : ""
                  }`}
                  aria-pressed={inlineItem.role === "none"}
                  onClick={() => updateInlineItem({ role: "none" })}
                  disabled={isReadOnly}
                >
                  Inactif
                </button>
              </div>

              {!inlineItem.noteOverrides && inlineItem.role === "attack" ? (
                <div className="form-section">
                  <label>
                    {uiLabels.offensive}
                    <select
                      value={inlineItem.offensive}
                      onChange={(event) =>
                        updateInlineItem({ offensive: event.target.value })
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
                    {actionFeedback ? (
                      <div className="text-sm text-muted">Action ajoutée.</div>
                    ) : null}
                    <div className="action-list">
                      {getActionDetails(inlineItem).map(
                        (detail, detailIndex) => (
                          <div
                            key={`action-${detailIndex}`}
                            className="action-row action-row--two"
                          >
                            <label>
                              Action
                              <select
                                value={detail.action}
                                onChange={(event) =>
                                  updateActionDetail(detailIndex, {
                                    action: event.target.value,
                                  })
                                }
                              >
                                <option value="">—</option>
                                {actionsOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
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
                                  updateActionDetail(detailIndex, {
                                    attribute: event.target.value,
                                  })
                                }
                              >
                                <option value="">—</option>
                                {attackAttributeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="button-icon button-ghost"
                              onClick={() => removeActionDetail(detailIndex)}
                              aria-label="Retirer l'action"
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
                        onClick={addActionDetail}
                      >
                        <FaPlus />
                        Ajouter une action
                      </button>
                    </div>
                  </div>

                  {getActionDetails(inlineItem).some((detail) => detail.action) ? (
                    <>
                      <label>
                        {uiLabels.target}
                        <select
                          value={inlineItem.target}
                          onChange={(event) =>
                            updateInlineItem({ target: event.target.value })
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

              {!inlineItem.noteOverrides && inlineItem.role === "defense" ? (
                <div className="form-section">
                  <div className="form-section form-section--soft">
                    <div className="text-strong">Défensive</div>
                    <div className="text-sm text-muted">
                      Ajoute une ou plusieurs défensives, chacune avec sa
                      position et son attribut.
                    </div>
                    <div className="action-list">
                      {getDefenseDetails(inlineItem).map(
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
                                  updateDefenseDetail(detailIndex, {
                                    defense: event.target.value,
                                  })
                                }
                              >
                                <option value="">—</option>
                                {defensiveOptions.map((option) => (
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
                                  value={detail.position}
                                  onChange={(event) =>
                                    updateDefenseDetail(detailIndex, {
                                      position: event.target.value,
                                    })
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
                                  updateDefenseDetail(detailIndex, {
                                    attribute: event.target.value,
                                  })
                                }
                              >
                                <option value="">—</option>
                                {paradeAttributeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="button-icon button-ghost"
                              onClick={() => removeDefenseDetail(detailIndex)}
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
                        onClick={addDefenseDetail}
                      >
                        <FaPlus />
                        Ajouter une défensive
                      </button>
                    </div>
                  </div>
                  {getDefenseDetails(inlineItem).some((detail) => detail.defense)
                    ? renderTokenField({
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
            </div>
          ) : null}

          {inlineItem.mode === "choregraphie" ? (
            <div className="participant-fields">
              <label>
                Phase de chorégraphie
                <select
                  value={inlineItem.chorePhase}
                  onChange={(event) =>
                    updateInlineItem({ chorePhase: event.target.value })
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
              <div className="input-with-clear">
                <input
                  value={inlineItem.note}
                  onChange={(event) =>
                    updateInlineItem({ note: event.target.value })
                  }
                />
                {inlineItem.note ? (
                  <button
                    type="button"
                    className="input-clear"
                    onClick={() => updateInlineItem({ note: "" })}
                    aria-label="Effacer la note"
                    title="Effacer"
                  />
                ) : null}
              </div>
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="button-primary" onClick={onSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
