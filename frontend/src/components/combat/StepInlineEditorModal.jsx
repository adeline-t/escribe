import { FaXmark } from "react-icons/fa6";
import { COMBAT_STEP_LABELS } from "../../lib/combats.js";
import {
  useClassicInlineStepFormLogic,
  useSabreInlineStepFormLogic,
} from "../../hooks/useCombatFormLogic.js";

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
  lexiconKey,
  onClose,
  onSave,
  onUpdateInlineItem,
}) {
  if (!isOpen || !inlineEdit || !inlineItem) return null;

  const participantName = participantLabels[inlineEdit.participantIndex] || "—";
  const isSabre = lexiconKey === "sabre-laser";
  // Même principe que CombatStepForm: wrappers distincts, logique partagée.
  const classicLogic = useClassicInlineStepFormLogic({
    inlineItem,
    inlineEdit,
    normalizedLexicon,
    favoriteKeys,
    orderOptions,
    onUpdateInlineItem,
  });
  const sabreLogic = useSabreInlineStepFormLogic({
    inlineItem,
    inlineEdit,
    normalizedLexicon,
    favoriteKeys,
    orderOptions,
    onUpdateInlineItem,
  });
  const logic = isSabre ? sabreLogic : classicLogic;
  // Le hook expose directement les fonctions adaptées au mode inline (single item).
  const {
    builderSelection,
    updateBuilderSelection,
    updateInlineItem,
    getMoveParts,
    updateMoveBase,
    addMoveComplement,
    removeMoveComplement,
    getDefenseAttributeTokens,
    setDefenseAttributeTokens,
    getActionDetails,
    updateDefenseDetails,
    updateDefenseDetail,
    updatePrepDetails,
    addAttackComplement,
    removeAttackComplement,
    v2Mode,
    defenseDetail,
    defenseType,
    offensiveOptions,
    attackAttributeOptions,
    targetOptions,
    defensiveOptions,
    paradeNumberOptions,
    attackMoveBaseOptions,
    attackMoveComplementOptions,
    paradeComplementOptions,
    prepTypeList,
    attackMoveBaseValues,
  } = logic;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={COMBAT_STEP_LABELS.editStepAria}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="subtitle">
          {COMBAT_STEP_LABELS.editStepTitle(inlineStepIndex, participantName)}
        </h3>

        <div className="participant-card">
          <div className="participant-card-header">
            <div className="text-strong">{participantName}</div>
            {lexiconKey === "sabre-laser" ? (
              <div
                className="segmented segmented--solid"
                role="radiogroup"
                aria-label={COMBAT_STEP_LABELS.modeLabelInline}
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
                  {COMBAT_STEP_LABELS.modeNote}
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
                    {COMBAT_STEP_LABELS.modeChoregraphie}
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
                  {COMBAT_STEP_LABELS.modeCombat}
                </button>
              </div>
            ) : null}
          </div>

          {inlineItem.mode === "combat" ? (
            <div className="participant-fields">
              <>
                <div
                  className="segmented segmented--outline segmented--compact"
                  role="radiogroup"
                  aria-label={COMBAT_STEP_LABELS.roleLabelInline}
                >
                  <button
                    type="button"
                    className={`segmented-button ${
                      v2Mode === "attack" ? "is-active" : ""
                    }`}
                    aria-pressed={v2Mode === "attack"}
                    onClick={() =>
                      updateInlineItem({
                        role: "attack",
                        noteOverrides: false,
                        actionDetails: [],
                        action: "",
                      })
                    }
                    disabled={isReadOnly}
                  >
                    {COMBAT_STEP_LABELS.roleAttack}
                  </button>
                  <button
                    type="button"
                    className={`segmented-button ${
                      v2Mode === "defense" ? "is-active" : ""
                    }`}
                    aria-pressed={v2Mode === "defense"}
                    onClick={() =>
                      updateInlineItem({
                        role: "defense",
                        noteOverrides: false,
                      })
                    }
                    disabled={isReadOnly}
                  >
                    {COMBAT_STEP_LABELS.roleDefense}
                  </button>
                  <button
                    type="button"
                    className={`segmented-button ${
                      v2Mode === "preparation" ? "is-active" : ""
                    }`}
                    aria-pressed={v2Mode === "preparation"}
                    onClick={() =>
                      updateInlineItem({
                        role: "preparation",
                        noteOverrides: false,
                        offensive: "",
                        attackMove: "",
                        attackAttribute: [],
                        actionDetails: [{ action: "", attribute: "" }],
                        action: "",
                      })
                    }
                    disabled={isReadOnly}
                  >
                    {COMBAT_STEP_LABELS.rolePreparation}
                  </button>
                  <button
                    type="button"
                    className={`segmented-button ${
                      v2Mode === "note" ? "is-active" : ""
                    }`}
                    aria-pressed={v2Mode === "note"}
                    onClick={() => updateInlineItem({ role: "none" })}
                    disabled={isReadOnly}
                  >
                    {COMBAT_STEP_LABELS.roleNote}
                  </button>
                </div>

                {!inlineItem.noteOverrides && v2Mode === "attack" ? (
                  <div className="form-section">
                    <div className="action-row action-row--two preparation-position-row">
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
                        <label>
                          {uiLabels.attackAttributeLabel ??
                            COMBAT_STEP_LABELS.complement}
                        <div className="input-row">
                          <select
                            value={builderSelection.attackComplement}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (!value) {
                                updateBuilderSelection({
                                  attackComplement: "",
                                });
                                return;
                              }
                              addAttackComplement(value);
                              updateBuilderSelection({
                                attackComplement: "",
                              });
                            }}
                          >
                            <option value="">—</option>
                            {attackAttributeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                    </div>
                    {Array.isArray(inlineItem.attackAttribute) &&
                    inlineItem.attackAttribute.length ? (
                      <div className="builder-tags">
                        {inlineItem.attackAttribute.map((token) => (
                          <span key={token} className="builder-tag">
                            <span className="builder-tag-value">{token}</span>
                            <button
                              type="button"
                              className="button-icon button-ghost builder-tag-remove"
                              onClick={() => removeAttackComplement(token)}
                              aria-label={`Retirer ${token}`}
                              title="Retirer"
                            >
                              <FaXmark />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}

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

                    <div className="action-row action-row--two">
                      <label>
                        {COMBAT_STEP_LABELS.movementLabel}
                        <select
                          value={
                            getMoveParts(
                              inlineItem.attackMove,
                              attackMoveBaseValues,
                            ).base
                          }
                          onChange={(event) =>
                            updateMoveBase(
                              "attackMove",
                              event.target.value,
                              attackMoveBaseValues,
                            )
                          }
                        >
                          <option value="">—</option>
                          {attackMoveBaseOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {COMBAT_STEP_LABELS.attributeLabel}
                        <div className="input-row">
                          <select
                            value={builderSelection.attackMoveComplement}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (!value) {
                                updateBuilderSelection({
                                  attackMoveComplement: "",
                                });
                                return;
                              }
                              addMoveComplement(
                                "attackMove",
                                value,
                                attackMoveBaseValues,
                              );
                              updateBuilderSelection({
                                attackMoveComplement: "",
                              });
                            }}
                          >
                            <option value="">—</option>
                            {attackMoveComplementOptions.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                    </div>
                    {getMoveParts(inlineItem.attackMove, attackMoveBaseValues)
                      .complements.length > 0 && (
                      <div className="builder-tags">
                        {getMoveParts(
                          inlineItem.attackMove,
                          attackMoveBaseValues,
                        ).complements.map((token) => (
                          <span key={token} className="builder-tag">
                            <span className="builder-tag-value">{token}</span>
                            <button
                              type="button"
                              className="button-icon button-ghost builder-tag-remove"
                              onClick={() =>
                                removeMoveComplement(
                                  "attackMove",
                                  token,
                                  attackMoveBaseValues,
                                )
                              }
                              aria-label={`Retirer ${token}`}
                              title="Retirer"
                            >
                              <FaXmark />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {!inlineItem.noteOverrides && v2Mode === "defense" ? (
                  <div className="form-section">
                    <label>
                        {COMBAT_STEP_LABELS.defenseType}
                      <select
                        value={defenseType}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (!value) {
                            updateBuilderSelection({
                              defenseType: "",
                            });
                            updateDefenseDetails([]);
                            return;
                          }
                          if (value === "parade") {
                            updateBuilderSelection({
                              defenseType: "parade",
                            });
                            updateDefenseDetails([
                              {
                                defense: "parade",
                                position: "",
                                attribute: "",
                              },
                            ]);
                          } else {
                            updateBuilderSelection({
                              defenseType: "esquive",
                            });
                            updateDefenseDetails([
                              {
                                defense:
                                  defenseDetail?.defense &&
                                  defenseDetail.defense !== "parade"
                                    ? defenseDetail.defense
                                    : "",
                                position: "",
                                attribute: "",
                              },
                            ]);
                          }
                        }}
                      >
                        <option value="">—</option>
                        <option value="parade">
                          {COMBAT_STEP_LABELS.defenseParade}
                        </option>
                        <option value="esquive">
                          {COMBAT_STEP_LABELS.defenseEsquive}
                        </option>
                      </select>
                    </label>

                    {defenseType === "parade" ? (
                      <div className="form-section form-section--soft">
                        <div className="action-row action-row--two">
                          <label>
                            {uiLabels.paradeNumber}
                            <select
                              value={defenseDetail?.position ?? ""}
                              onChange={(event) =>
                                updateDefenseDetail(0, {
                                  position: event.target.value,
                                })
                              }
                            >
                              <option value="">—</option>
                              {paradeNumberOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {COMBAT_STEP_LABELS.attributeLabel}
                            <div className="input-row">
                              <select
                                value={builderSelection.paradeComplement}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  if (!value) {
                                    updateBuilderSelection({
                                      paradeComplement: "",
                                    });
                                    return;
                                  }
                                  const list = getDefenseAttributeTokens();
                                  if (!list.includes(value)) {
                                    setDefenseAttributeTokens([...list, value]);
                                  }
                                  updateBuilderSelection({
                                    paradeComplement: "",
                                  });
                                }}
                              >
                                <option value="">—</option>
                                {paradeComplementOptions.map((value) => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </label>
                        </div>
                        {getDefenseAttributeTokens().length > 0 && (
                          <div className="builder-tags">
                            {getDefenseAttributeTokens().map((token) => (
                              <span key={token} className="builder-tag">
                                <span className="builder-tag-value">
                                  {token}
                                </span>
                                <button
                                  type="button"
                                  className="button-icon button-ghost builder-tag-remove"
                                  onClick={() => {
                                    const next =
                                      getDefenseAttributeTokens().filter(
                                        (entry) => entry !== token,
                                      );
                                    setDefenseAttributeTokens(next);
                                  }}
                                  aria-label={`Retirer ${token}`}
                                  title="Retirer"
                                >
                                  <FaXmark />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {defenseType === "esquive" ? (
                      <label>
                        {uiLabels.defensive}
                        <select
                          value={defenseDetail?.defense ?? ""}
                          onChange={(event) =>
                            updateDefenseDetail(0, {
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
                    ) : null}

                      {defenseType === "parade" || defenseType === "esquive" ? (
                        <div className="form-section form-section--soft">
                          <div className="action-row action-row--two">
                            <label>
                              {COMBAT_STEP_LABELS.movementLabel}
                              <select
                                value={
                                  getMoveParts(
                                    inlineItem.defendMove,
                                    attackMoveBaseValues,
                                  ).base
                                }
                                onChange={(event) =>
                                  updateMoveBase(
                                    "defendMove",
                                    event.target.value,
                                    attackMoveBaseValues,
                                  )
                                }
                              >
                                <option value="">—</option>
                                {attackMoveBaseOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              {COMBAT_STEP_LABELS.attributeLabel}
                              <div className="input-row">
                                <select
                                  value={builderSelection.defendMoveComplement}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (!value) {
                                      updateBuilderSelection({
                                        defendMoveComplement: "",
                                      });
                                      return;
                                    }
                                    addMoveComplement(
                                      "defendMove",
                                      value,
                                      attackMoveBaseValues,
                                    );
                                    updateBuilderSelection({
                                      defendMoveComplement: "",
                                    });
                                  }}
                                >
                                  <option value="">—</option>
                                  {attackMoveComplementOptions.map((value) => (
                                    <option key={value} value={value}>
                                      {value}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </label>
                          </div>
                        {getMoveParts(
                          inlineItem.defendMove,
                          attackMoveBaseValues,
                        ).complements.length > 0 && (
                          <div className="builder-tags">
                            {getMoveParts(
                              inlineItem.defendMove,
                              attackMoveBaseValues,
                            ).complements.map((token) => (
                              <span key={token} className="builder-tag">
                                <span className="builder-tag-value">
                                  {token}
                                </span>
                                <button
                                  type="button"
                                  className="button-icon button-ghost builder-tag-remove"
                                  onClick={() =>
                                    removeMoveComplement(
                                      "defendMove",
                                      token,
                                      attackMoveBaseValues,
                                    )
                                  }
                                  aria-label={`Retirer ${token}`}
                                  title="Retirer"
                                >
                                  <FaXmark />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!inlineItem.noteOverrides && v2Mode === "preparation" ? (
                  <div className="form-section">
                    <label>
                      {COMBAT_STEP_LABELS.preparationType}
                      <select
                        value={getActionDetails(inlineItem)[0]?.action ?? ""}
                        onChange={(event) =>
                          updatePrepDetails(event.target.value, "")
                        }
                      >
                        <option value="">—</option>
                        {prepTypeList.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      {COMBAT_STEP_LABELS.target}
                      <select
                        value={inlineItem.target ?? ""}
                        onChange={(event) =>
                          updateInlineItem({
                            role: "preparation",
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

                    <div className="action-row action-row--two">
                      <label>
                        {uiLabels.paradeNumber}
                        <select
                          value={getActionDetails(inlineItem)[0]?.attribute ?? ""}
                          onChange={(event) =>
                            updatePrepDetails(
                              getActionDetails(inlineItem)[0]?.action ?? "",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">—</option>
                          {paradeNumberOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {COMBAT_STEP_LABELS.positionComplement}
                        <div className="input-row">
                          <select
                            value={builderSelection.prepPositionComplement}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (!value) {
                                updateBuilderSelection({
                                  prepPositionComplement: "",
                                });
                                return;
                              }
                              addAttackComplement(value);
                              updateBuilderSelection({
                                prepPositionComplement: "",
                              });
                            }}
                          >
                            <option value="">—</option>
                            {paradeComplementOptions.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                    </div>
                    {Array.isArray(inlineItem.attackAttribute) &&
                      inlineItem.attackAttribute.length > 0 && (
                        <div className="builder-tags">
                          {inlineItem.attackAttribute.map((token) => (
                            <span key={token} className="builder-tag">
                              <span className="builder-tag-value">{token}</span>
                              <button
                                type="button"
                                className="button-icon button-ghost builder-tag-remove"
                                onClick={() => removeAttackComplement(token)}
                                aria-label={`Retirer ${token}`}
                                title="Retirer"
                              >
                                <FaXmark />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                ) : null}
              </>
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
                    aria-label={COMBAT_STEP_LABELS.noteClear}
                    title="Effacer"
                  />
                ) : null}
              </div>
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            {COMBAT_STEP_LABELS.modalCancel}
          </button>
          <button type="button" className="button-primary" onClick={onSave}>
            {COMBAT_STEP_LABELS.modalSave}
          </button>
        </div>
      </div>
    </div>
  );
}
