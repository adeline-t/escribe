import { FaXmark } from "react-icons/fa6";
import { PERFORMANCE_STEP_LABELS } from "../../lib/performances.js";
import {
  useClassicInlineStepFormLogic,
  useSabreInlineStepFormLogic,
} from "../../hooks/usePerformanceFormLogic.js";

function shouldShowDefenseParadeFields({
  defenseActionValue,
  showParadeNumber,
}) {
  if (!showParadeNumber) return false;
  const token = String(defenseActionValue ?? "").trim().toLowerCase();
  if (!token) return false;
  return token === "parry";
}

function hasSelectableOptions(options, currentValue = "") {
  if (Array.isArray(options) && options.length > 0) return true;
  return Boolean(String(currentValue ?? "").trim());
}

export default function StepInlineEditorModal({
  isOpen,
  inlineEdit,
  inlineItem,
  performerLabels,
  inlineStepIndex,
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

  const performerName = performerLabels[inlineEdit.performerIndex] || "—";
  const isSabre = lexiconKey === "sabre-laser";
  // Same principle as PerformanceStepForm: distinct wrappers, shared logic.
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
  // The hook exposes functions already adapted to inline mode (single item).
  const {
    builderSelection,
    updateBuilderSelection,
    updateInlineItem,
    getMoveParts,
    updateMoveBase,
    addMoveComplement,
    removeMoveComplement,
    getDefenseAttributeTokens,
    getDefenseActionAttributeTokens,
    setDefenseAttributeTokens,
    setDefenseActionAttributeTokens,
    updateDefenseDetails,
    updatePrepDetails,
    clearPrepDetails,
    addAttackComplement,
    removeAttackComplement,
    getAttackActionValue,
    getDefenseActionValue,
    getPreparationAction,
    getPreparationTiming,
    hasPreparationAction,
    withCurrentOption,
    v2Mode,
    offensiveOptions,
    mainGuardOptions,
    basePostureOptions,
    attackAttributeOptions,
    targetOptions,
    defensiveOptions,
    defenseAttributeOptions,
    paradeNumberOptions,
    attackMoveBaseOptions,
    attackMoveComplementOptions,
    paradeComplementOptions,
    prepTypeList,
    attackMoveBaseValues,
    resolveLabel,
  } = logic;
  const resolveTermLabel = (type, value) => resolveLabel(type, value);
  const attackActionValue = getAttackActionValue(inlineItem);
  const attackActionOptions = withCurrentOption(
    offensiveOptions,
    attackActionValue,
    "offensive",
  );
  const prepActionValue = getPreparationAction(inlineItem);
  const prepEnabled = hasPreparationAction(inlineItem);
  const prepTiming = getPreparationTiming(inlineItem);
  const prepTypeOptions = withCurrentOption(
    prepTypeList.map((value) => ({
      value,
      label: resolveTermLabel("action", value),
    })),
    prepActionValue,
    "action",
  );
  const defenseActionValue = getDefenseActionValue(inlineItem);
  const defenseActionOptions = withCurrentOption(
    defensiveOptions,
    defenseActionValue,
    "defensive",
  );
  const targetSelectOptions = withCurrentOption(
    targetOptions,
    inlineItem.target,
    "target",
  );
  const mainGuardSelectOptions = withCurrentOption(
    mainGuardOptions,
    inlineItem.mainGuard,
    "garde_principale",
  );
  const basePostureSelectOptions = withCurrentOption(
    basePostureOptions,
    inlineItem.basePosture,
    "postures_base",
  );
  const defenseDetails = logic.getDefenseDetails(inlineItem);
  const defenseDetail = defenseDetails[0] ?? {
    defense: "",
    position: "",
    attribute: "",
  };
  const positionSelectOptions =
    lexiconKey === "sabre-laser"
      ? withCurrentOption(
          targetOptions,
          defenseDetail?.position ?? "",
          "target",
        )
      : withCurrentOption(
          paradeNumberOptions,
          defenseDetail?.position ?? "",
          "parade_numero",
        );
  const defenseActionAttributeTokens = getDefenseActionAttributeTokens();
  const showMainGuardSelector = hasSelectableOptions(
    mainGuardSelectOptions,
    inlineItem.mainGuard,
  );
  const showBasePostureSelector = hasSelectableOptions(
    basePostureSelectOptions,
    inlineItem.basePosture,
  );
  const showAttackActionSelector = hasSelectableOptions(
    attackActionOptions,
    attackActionValue,
  );
  const showAttackAttributeSelector = hasSelectableOptions(attackAttributeOptions);
  const showTargetSelector = hasSelectableOptions(
    targetSelectOptions,
    inlineItem.target,
  );
  const attackMoveParts = getMoveParts(inlineItem.attackMove, attackMoveBaseValues);
  const defendMoveParts = getMoveParts(inlineItem.defendMove, attackMoveBaseValues);
  const showAttackMoveBaseSelector = hasSelectableOptions(
    attackMoveBaseOptions,
    attackMoveParts.base,
  );
  const showDefendMoveBaseSelector = hasSelectableOptions(
    attackMoveBaseOptions,
    defendMoveParts.base,
  );
  const showMoveAttributeSelector = hasSelectableOptions(
    attackMoveComplementOptions,
  );
  const showDefenseActionSelector = hasSelectableOptions(
    defenseActionOptions,
    defenseActionValue,
  );
  const showDefenseActionAttributeSelector = hasSelectableOptions(
    defenseAttributeOptions,
  );
  const showPositionSelector = hasSelectableOptions(
    positionSelectOptions,
    defenseDetail?.position ?? "",
  );
  const showParadeAttributeSelector = hasSelectableOptions(
    paradeComplementOptions,
  );

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={PERFORMANCE_STEP_LABELS.editStepAria}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="subtitle">
          {PERFORMANCE_STEP_LABELS.editStepTitle(inlineStepIndex, performerName)}
        </h3>

        <div className="performer-card performer-card--inline-modal">
          <div className="performer-card-header">
            <div className="text-strong">{performerName}</div>
          </div>

          <div className="performer-fields">
              <>
                {isSabre && (showMainGuardSelector || showBasePostureSelector) ? (
                  <div className="action-row performer-context-row">
                    {showMainGuardSelector ? (
                      <label>
                        {PERFORMANCE_STEP_LABELS.mainGuard}
                        <select
                          value={inlineItem.mainGuard ?? ""}
                          onChange={(event) =>
                            updateInlineItem({ mainGuard: event.target.value })
                          }
                        >
                          <option value="">—</option>
                          {mainGuardSelectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {showBasePostureSelector ? (
                      <label>
                        {PERFORMANCE_STEP_LABELS.basePosture}
                        <select
                          value={inlineItem.basePosture ?? ""}
                          onChange={(event) =>
                            updateInlineItem({ basePosture: event.target.value })
                          }
                        >
                          <option value="">—</option>
                          {basePostureSelectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                ) : null}
                <div
                  className="segmented segmented--outline segmented--compact"
                  role="radiogroup"
                  aria-label={PERFORMANCE_STEP_LABELS.roleLabelInline}
                >
                  <button
                    type="button"
                    className={`segmented-button ${
                      v2Mode === "attack" ? "is-active" : ""
                    }`}
                    aria-pressed={v2Mode === "attack"}
                    onClick={() =>
                      updateInlineItem({
                        mode: "combat",
                        role: "attack",
                        noteOverrides: false,
                      })
                    }
                    disabled={isReadOnly}
                  >
                    {PERFORMANCE_STEP_LABELS.roleAttack}
                  </button>
                  <button
                    type="button"
                    className={`segmented-button ${
                      v2Mode === "defense" ? "is-active" : ""
                    }`}
                    aria-pressed={v2Mode === "defense"}
                    onClick={() =>
                      updateInlineItem({
                        mode: "combat",
                        role: "defense",
                        noteOverrides: false,
                      })
                    }
                    disabled={isReadOnly}
                  >
                    {PERFORMANCE_STEP_LABELS.roleDefense}
                  </button>
                  <button
                    type="button"
                    className={`segmented-button ${
                      v2Mode === "movement" ? "is-active" : ""
                    }`}
                    aria-pressed={v2Mode === "movement"}
                    onClick={() =>
                      updateInlineItem({
                        mode: "combat",
                        role: "movement",
                        noteOverrides: false,
                        offensive: "",
                        target: "",
                        attackMove: "",
                        attackAttribute: [],
                        defense: "",
                        defenseDetails: [],
                        paradeNumber: "",
                        paradeAttribute: "",
                        defendMove: "",
                        actionDetails: [],
                        preparationAction: "",
                        action: "",
                        preparationTiming: "before",
                      })
                    }
                    disabled={isReadOnly}
                  >
                    {PERFORMANCE_STEP_LABELS.roleMovement}
                  </button>
                  <button
                    type="button"
                    className={`segmented-button ${
                      v2Mode === "note" ? "is-active" : ""
                    }`}
                    aria-pressed={v2Mode === "note"}
                    onClick={() => updateInlineItem({ mode: "note", role: "none" })}
                    disabled={isReadOnly}
                  >
                    {PERFORMANCE_STEP_LABELS.roleNote}
                  </button>
                </div>

                {!inlineItem.noteOverrides && v2Mode === "attack" ? (
                  <div className="form-section form-section--attack-layout">
                    <div className="preparation-toggle-row">
                      <label className="preparation-switch">
                        <input
                          type="checkbox"
                          checked={prepEnabled}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            if (!checked) {
                              clearPrepDetails();
                              return;
                            }
                            const fallback = prepTypeList[0] ?? "";
                            updatePrepDetails(prepActionValue || fallback, {
                              role: "attack",
                            });
                            updateInlineItem({
                              role: "attack",
                              preparationTiming: prepTiming,
                            });
                          }}
                          disabled={isReadOnly}
                        />
                        <span>{PERFORMANCE_STEP_LABELS.addPreparation}</span>
                      </label>
                      {prepEnabled ? (
                        <div className="segmented segmented--ghost segmented--compact preparation-timing-segmented">
                          <button
                            type="button"
                            className={`segmented-button ${
                              prepTiming === "before" ? "is-active" : ""
                            }`}
                            onClick={() =>
                              updateInlineItem({
                                role: "attack",
                                preparationTiming: "before",
                              })
                            }
                            disabled={isReadOnly}
                          >
                            {PERFORMANCE_STEP_LABELS.preparationBefore}
                          </button>
                          <button
                            type="button"
                            className={`segmented-button ${
                              prepTiming === "after" ? "is-active" : ""
                            }`}
                            onClick={() =>
                              updateInlineItem({
                                role: "attack",
                                preparationTiming: "after",
                              })
                            }
                            disabled={isReadOnly}
                          >
                            {PERFORMANCE_STEP_LABELS.preparationAfter}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {prepEnabled ? (
                      <label className="attack-layout-full">
                        {PERFORMANCE_STEP_LABELS.preparationType}
                        <select
                          value={prepActionValue}
                          onChange={(event) =>
                            updatePrepDetails(event.target.value, {
                              role: "attack",
                            })
                          }
                        >
                          <option value="">—</option>
                          {prepTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <div className="action-row action-row--two preparation-position-row attack-layout-block attack-layout-block--offense">
                      {showAttackActionSelector ? (
                        <label>
                          {uiLabels.offensive}
                          <select
                            value={attackActionValue}
                            onChange={(event) =>
                              updateInlineItem({ offensive: event.target.value })
                            }
                          >
                            <option value="">—</option>
                            {attackActionOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {showAttackAttributeSelector ? (
                        <label>
                          {uiLabels.attackAttributeLabel ??
                            PERFORMANCE_STEP_LABELS.complement}
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
                      ) : null}
                    </div>
                    {Array.isArray(inlineItem.attackAttribute) &&
                    inlineItem.attackAttribute.length ? (
                      <div className="builder-tags">
                        {inlineItem.attackAttribute.map((token) => (
                          <span key={token} className="builder-tag">
                            <span className="builder-tag-value">
                              {resolveTermLabel("attaque_attribut", token)}
                            </span>
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

                    {showTargetSelector ? (
                      <label className="attack-layout-block attack-layout-block--target">
                        {uiLabels.target}
                        <select
                          value={inlineItem.target}
                          onChange={(event) =>
                            updateInlineItem({ target: event.target.value })
                          }
                        >
                          <option value="">—</option>
                          {targetSelectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <div className="action-row action-row--two attack-layout-block attack-layout-block--move">
                      {showAttackMoveBaseSelector ? (
                        <label>
                          {PERFORMANCE_STEP_LABELS.movementLabel}
                          <select
                            value={attackMoveParts.base}
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
                      ) : null}
                      {showMoveAttributeSelector ? (
                        <label>
                          {PERFORMANCE_STEP_LABELS.attributeLabel}
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
                                  {resolveTermLabel("deplacement_complement", value)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                      ) : null}
                    </div>
                    {attackMoveParts.complements.length > 0 && (
                      <div className="builder-tags attack-layout-full">
                        {attackMoveParts.complements.map((token) => (
                          <span key={token} className="builder-tag">
                            <span className="builder-tag-value">
                              {resolveTermLabel("deplacement_complement", token)}
                            </span>
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
                  <div className="form-section form-section--attack-layout">
                    <div className="preparation-toggle-row">
                      <label className="preparation-switch">
                        <input
                          type="checkbox"
                          checked={prepEnabled}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            if (!checked) {
                              clearPrepDetails();
                              return;
                            }
                            const fallback = prepTypeList[0] ?? "";
                            updatePrepDetails(prepActionValue || fallback, {
                              role: "defense",
                            });
                            updateInlineItem({
                              role: "defense",
                              preparationTiming: prepTiming,
                            });
                          }}
                          disabled={isReadOnly}
                        />
                        <span>{PERFORMANCE_STEP_LABELS.addPreparation}</span>
                      </label>
                      {prepEnabled ? (
                        <div className="segmented segmented--ghost segmented--compact preparation-timing-segmented">
                          <button
                            type="button"
                            className={`segmented-button ${
                              prepTiming === "before" ? "is-active" : ""
                            }`}
                            onClick={() =>
                              updateInlineItem({
                                role: "defense",
                                preparationTiming: "before",
                              })
                            }
                            disabled={isReadOnly}
                          >
                            {PERFORMANCE_STEP_LABELS.preparationBefore}
                          </button>
                          <button
                            type="button"
                            className={`segmented-button ${
                              prepTiming === "after" ? "is-active" : ""
                            }`}
                            onClick={() =>
                              updateInlineItem({
                                role: "defense",
                                preparationTiming: "after",
                              })
                            }
                            disabled={isReadOnly}
                          >
                            {PERFORMANCE_STEP_LABELS.preparationAfter}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {prepEnabled ? (
                      <label>
                        {PERFORMANCE_STEP_LABELS.preparationType}
                        <select
                          value={prepActionValue}
                          onChange={(event) =>
                            updatePrepDetails(event.target.value, {
                              role: "defense",
                            })
                          }
                        >
                          <option value="">—</option>
                          {prepTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <div className="action-row action-row--two attack-layout-block attack-layout-block--offense">
                      {showDefenseActionSelector ? (
                        <label>
                          {uiLabels.defensive}
                          <select
                            value={defenseActionValue}
                            onChange={(event) =>
                              updateDefenseDetails([
                                {
                                  defense: event.target.value,
                                  position: defenseDetail?.position ?? "",
                                  attribute: defenseDetail?.attribute ?? "",
                                },
                                ...defenseDetails.slice(1),
                              ])
                            }
                          >
                            <option value="">—</option>
                            {defenseActionOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {showDefenseActionAttributeSelector ? (
                        <label>
                          {PERFORMANCE_STEP_LABELS.attributeLabel}
                          <div className="input-row">
                            <select
                              value={builderSelection.defenseActionComplement ?? ""}
                              onChange={(event) => {
                                const value = event.target.value;
                                if (!value) {
                                  updateBuilderSelection({
                                    defenseActionComplement: "",
                                  });
                                  return;
                                }
                                if (!defenseActionAttributeTokens.includes(value)) {
                                  setDefenseActionAttributeTokens([
                                    ...defenseActionAttributeTokens,
                                    value,
                                  ]);
                                }
                                updateBuilderSelection({
                                  defenseActionComplement: "",
                                });
                              }}
                            >
                              <option value="">—</option>
                              {defenseAttributeOptions.map((value) => (
                                <option key={value} value={value}>
                                  {resolveTermLabel("defense_attribut", value)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                      ) : null}
                    </div>
                    {defenseActionAttributeTokens.length > 0 && (
                      <div className="builder-tags attack-layout-full">
                        {defenseActionAttributeTokens.map((token) => (
                          <span key={token} className="builder-tag">
                            <span className="builder-tag-value">
                              {resolveTermLabel("defense_attribut", token)}
                            </span>
                            <button
                              type="button"
                              className="button-icon button-ghost builder-tag-remove"
                              onClick={() =>
                                setDefenseActionAttributeTokens(
                                  defenseActionAttributeTokens.filter(
                                    (entry) => entry !== token,
                                  ),
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

                    {shouldShowDefenseParadeFields({
                      defenseActionValue,
                      showParadeNumber,
                    }) ? (
                      <>
                        <div className="action-row action-row--two attack-layout-block attack-layout-block--position">
                          {showPositionSelector ? (
                            <label>
                              {uiLabels.paradeNumber}
                              <select
                                value={defenseDetail?.position ?? ""}
                                onChange={(event) =>
                                  updateDefenseDetails([
                                    {
                                      defense: defenseDetail?.defense ?? "",
                                      position: event.target.value,
                                      attribute: defenseDetail?.attribute ?? "",
                                    },
                                    ...defenseDetails.slice(1),
                                  ])
                                }
                              >
                                <option value="">—</option>
                                {positionSelectOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                          {showParadeAttributeSelector ? (
                            <label>
                              {PERFORMANCE_STEP_LABELS.attributeLabel}
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
                                      {resolveTermLabel("parade_attribut", value)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </label>
                          ) : null}
                        </div>
                        {getDefenseAttributeTokens().length > 0 && (
                          <div className="builder-tags attack-layout-full">
                            {getDefenseAttributeTokens().map((token) => (
                              <span key={token} className="builder-tag">
                                <span className="builder-tag-value">
                                  {resolveTermLabel("parade_attribut", token)}
                                </span>
                                <button
                                  type="button"
                                  className="button-icon button-ghost builder-tag-remove"
                                  onClick={() => {
                                    const next = getDefenseAttributeTokens().filter(
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
                      </>
                    ) : null}

                    <div className="action-row action-row--two attack-layout-block attack-layout-block--move">
                        {showDefendMoveBaseSelector ? (
                          <label>
                            {PERFORMANCE_STEP_LABELS.movementLabel}
                            <select
                              value={defendMoveParts.base}
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
                        ) : null}
                        {showMoveAttributeSelector ? (
                          <label>
                            {PERFORMANCE_STEP_LABELS.attributeLabel}
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
                                    {resolveTermLabel("deplacement_complement", value)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </label>
                        ) : null}
                      </div>
                      {defendMoveParts.complements.length > 0 && (
                        <div className="builder-tags attack-layout-full">
                          {defendMoveParts.complements.map((token) => (
                            <span key={token} className="builder-tag">
                              <span className="builder-tag-value">
                                {resolveTermLabel("deplacement_complement", token)}
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

                {!inlineItem.noteOverrides && v2Mode === "movement" ? (
                  <div className="form-section">
                    <div className="action-row action-row--two">
                      {showAttackMoveBaseSelector ? (
                        <label>
                          {PERFORMANCE_STEP_LABELS.movementLabel}
                          <select
                            value={attackMoveParts.base}
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
                      ) : null}
                      {showMoveAttributeSelector ? (
                        <label>
                          {PERFORMANCE_STEP_LABELS.attributeLabel}
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
                                  {resolveTermLabel("deplacement_complement", value)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                      ) : null}
                    </div>
                    {attackMoveParts.complements.length > 0 && (
                      <div className="builder-tags">
                        {attackMoveParts.complements.map((token) => (
                          <span key={token} className="builder-tag">
                            <span className="builder-tag-value">
                              {resolveTermLabel("deplacement_complement", token)}
                            </span>
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
              </>
            </div>

          <div className="performer-fields">
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
                    aria-label={PERFORMANCE_STEP_LABELS.noteClear}
                    title="Effacer"
                  />
                ) : null}
              </div>
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            {PERFORMANCE_STEP_LABELS.modalCancel}
          </button>
          <button type="button" className="button-primary" onClick={onSave}>
            {PERFORMANCE_STEP_LABELS.modalSave}
          </button>
        </div>
      </div>
    </div>
  );
}
