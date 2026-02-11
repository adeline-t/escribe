import { useEffect, useMemo, useState } from "react";
import { FaXmark } from "react-icons/fa6";
import { PERFORMANCE_STEP_LABELS } from "../../lib/performances.js";
import { hasPerformerStepContent } from "../../lib/stepContent.js";
import {
  useClassicCombatStepFormLogic,
  useSabreCombatStepFormLogic,
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

export default function PerformanceStepForm({
  form,
  performers,
  performerLabels,
  activePerformerIndex,
  setActivePerformerIndex,
  uiLabels,
  favoriteKeys,
  normalizedLexicon,
  lexiconKey,
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
  // Both wrappers target the same logic core.
  // Keep this explicit selection so the component stays readable.
  const classicLogic = useClassicCombatStepFormLogic({
    form,
    performers,
    performerLabels,
    buildSummaryLine,
    normalizedLexicon,
    favoriteKeys,
    orderOptions,
    onFormChange,
  });
  const sabreLogic = useSabreCombatStepFormLogic({
    form,
    performers,
    performerLabels,
    buildSummaryLine,
    normalizedLexicon,
    favoriteKeys,
    orderOptions,
    onFormChange,
  });
  const logic = isSabre ? sabreLogic : classicLogic;
  // All UI/domain logic (options, attributes, modes, field sync)
  // comes from the hook to prevent divergence across screens.
  const {
    builderSelections,
    updateBuilderSelection,
    getMoveParts,
    updateMoveBase,
    addMoveComplement,
    removeMoveComplement,
    getDefenseAttributeTokens,
    getDefenseActionAttributeTokens,
    setDefenseAttributeTokens,
    setDefenseActionAttributeTokens,
    getDefenseDetails,
    updateDefenseDetails,
    updatePrepDetails,
    clearPrepDetails,
    addAttackComplement,
    removeAttackComplement,
    getV2Mode,
    getAttackActionValue,
    getDefenseActionValue,
    getPreparationAction,
    getPreparationTiming,
    hasPreparationAction,
    withCurrentOption,
    summaryLines,
    hasAnySummary,
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
  const [manuallyHiddenIndexes, setManuallyHiddenIndexes] = useState([]);
  const [manuallyShownIndexes, setManuallyShownIndexes] = useState(() =>
    performers.map((_, index) => index),
  );

  const autoHiddenIndexes = useMemo(
    () =>
      performers
        .map((_, index) => index)
        .filter(
          (index) =>
            index !== activePerformerIndex &&
            !hasPerformerStepContent(form[index]),
        ),
    [performers, activePerformerIndex, form],
  );

  useEffect(() => {
    const maxIndex = performers.length - 1;
    setManuallyHiddenIndexes((prev) =>
      prev.filter((index) => index >= 0 && index <= maxIndex),
    );
    setManuallyShownIndexes((prev) => {
      const filtered = prev.filter((index) => index >= 0 && index <= maxIndex);
      const known = new Set(filtered);
      for (let index = 0; index < performers.length; index += 1) {
        if (!known.has(index)) filtered.push(index);
      }
      return filtered;
    });
  }, [performers.length]);

  const hiddenPerformerIndexes = useMemo(() => {
    const hidden = new Set();
    const manualHiddenSet = new Set(manuallyHiddenIndexes);
    const manualShownSet = new Set(manuallyShownIndexes);
    for (let index = 0; index < performers.length; index += 1) {
      if (index === activePerformerIndex) continue;
      if (manualHiddenSet.has(index)) {
        hidden.add(index);
        continue;
      }
      if (manualShownSet.has(index)) continue;
      if (autoHiddenIndexes.includes(index)) hidden.add(index);
    }
    return hidden;
  }, [
    performers.length,
    activePerformerIndex,
    manuallyHiddenIndexes,
    manuallyShownIndexes,
    autoHiddenIndexes,
  ]);

  const visiblePerformerIndexes = useMemo(() => {
    const visible = performers
      .map((_, index) => index)
      .filter((index) => !hiddenPerformerIndexes.has(index));
    if (!visible.length && performers.length > 0) {
      return [Math.max(0, activePerformerIndex)];
    }
    return visible;
  }, [performers, hiddenPerformerIndexes, activePerformerIndex]);

  const allPerformersVisible =
    visiblePerformerIndexes.length === performers.length;
  const enableHorizontalGridScroll =
    allPerformersVisible && performers.length > 2;
  const visibleCountClass = `performer-grid--count-${visiblePerformerIndexes.length}`;
  const visibleColsClass =
    visiblePerformerIndexes.length >= 1 &&
    visiblePerformerIndexes.length <= 4
      ? `cols-${visiblePerformerIndexes.length}`
      : "";

  function showAllPerformers() {
    setManuallyHiddenIndexes([]);
    setManuallyShownIndexes(performers.map((_, index) => index));
  }

  function togglePerformerVisibility(index) {
    const isHidden = hiddenPerformerIndexes.has(index);
    if (isHidden) {
      setManuallyHiddenIndexes((prev) => prev.filter((entry) => entry !== index));
      setManuallyShownIndexes((prev) =>
        prev.includes(index) ? prev : [...prev, index],
      );
      return;
    }
    const visibleCount = visiblePerformerIndexes.length;
    const canHideCurrent = visibleCount > 1;
    if (!canHideCurrent) return;
    setManuallyShownIndexes((prev) => prev.filter((entry) => entry !== index));
    setManuallyHiddenIndexes((prev) =>
      prev.includes(index) ? prev : [...prev, index],
    );
    if (activePerformerIndex === index) {
      const fallback = visiblePerformerIndexes.find(
        (entry) => entry !== index,
      );
      if (Number.isInteger(fallback)) {
        setActivePerformerIndex(fallback);
      }
    }
  }

  return (
    <>
      {hasAnySummary ? (
        <div className="summary">
          <h3 className="subtitle">{PERFORMANCE_STEP_LABELS.summaryTitle}</h3>
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
      {performers.length > 1 ? (
        <div className="performer-visibility-toolbar">
          <span className="performer-visibility-label">
            {PERFORMANCE_STEP_LABELS.columnVisibility}
          </span>
          <div className="performer-visibility-chips">
            {performers.map((_, index) => {
              const name = performerLabels[index];
              const isActive = index === activePerformerIndex;
              const isHidden = hiddenPerformerIndexes.has(index);
              return (
                <button
                  key={`visibility-${name}-${index}`}
                  type="button"
                  className={`performer-visibility-chip ${
                    isHidden ? "is-hidden" : ""
                  } ${isActive ? "is-active" : ""}`}
                  onClick={() => togglePerformerVisibility(index)}
                  disabled={isReadOnly}
                  aria-pressed={!isHidden}
                  title={
                    isHidden
                      ? `Afficher ${name}`
                      : `Masquer temporairement ${name}`
                  }
                >
                  {name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="button-ghost performer-visibility-reset"
            onClick={showAllPerformers}
            disabled={isReadOnly || allPerformersVisible}
          >
            {PERFORMANCE_STEP_LABELS.showAllColumns}
          </button>
        </div>
      ) : null}
      <div
        className="performer-selector"
        role="tablist"
        aria-label={PERFORMANCE_STEP_LABELS.chooseFighterAria}
      >
        {performers.map((_, index) => {
          const name = performerLabels[index];
          const isActive = index === activePerformerIndex;
          return (
            <button
              key={`${name}-${index}`}
              type="button"
              className={`chip ${isActive ? "chip--active" : ""}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActivePerformerIndex(index)}
              disabled={isReadOnly}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div
        className={`performer-grid-scroll ${
          enableHorizontalGridScroll ? "is-scrollable" : ""
        }`}
      >
      <div
        className={`performer-grid ${visibleColsClass} ${visibleCountClass} ${
          enableHorizontalGridScroll ? "is-scrollable" : ""
        }`}
      >
        {visiblePerformerIndexes.map((index) => {
          const item = form[index];
          const name = performerLabels[index];
          // v2Mode is derived from role + existing data (legacy compatibility).
          const v2Mode = getV2Mode(item, index);
          const defenseDetails = getDefenseDetails(item);
          const defenseDetail = defenseDetails[0] ?? {
            defense: "",
            position: "",
            attribute: "",
          };
          const defenseActionAttributeTokens =
            getDefenseActionAttributeTokens(item);
          const attackActionValue = getAttackActionValue(item);
          const attackActionOptions = withCurrentOption(
            offensiveOptions,
            attackActionValue,
            "offensive",
          );
          const prepActionValue = getPreparationAction(item);
          const prepEnabled = hasPreparationAction(item);
          const prepTiming = getPreparationTiming(item);
          const prepTypeOptions = withCurrentOption(
            prepTypeList.map((value) => ({
              value,
              label: resolveTermLabel("action", value),
            })),
            prepActionValue,
            "action",
          );
          const defenseActionValue = getDefenseActionValue(item);
          const defenseActionOptions = withCurrentOption(
            defensiveOptions,
            defenseActionValue,
            "defensive",
          );
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
          const targetSelectOptions = withCurrentOption(
            targetOptions,
            item.target,
            "target",
          );
          const mainGuardSelectOptions = withCurrentOption(
            mainGuardOptions,
            item.mainGuard,
            "garde_principale",
          );
          const basePostureSelectOptions = withCurrentOption(
            basePostureOptions,
            item.basePosture,
            "postures_base",
          );
          const showMainGuardSelector = hasSelectableOptions(
            mainGuardSelectOptions,
            item.mainGuard,
          );
          const showBasePostureSelector = hasSelectableOptions(
            basePostureSelectOptions,
            item.basePosture,
          );
          const showAttackActionSelector = hasSelectableOptions(
            attackActionOptions,
            attackActionValue,
          );
          const showAttackAttributeSelector = hasSelectableOptions(
            attackAttributeOptions,
          );
          const showTargetSelector = hasSelectableOptions(
            targetSelectOptions,
            item.target,
          );
          const attackMoveParts = getMoveParts(item.attackMove, attackMoveBaseValues);
          const defendMoveParts = getMoveParts(item.defendMove, attackMoveBaseValues);
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
            <div
              key={`${name}-${index}`}
              className={`performer-card ${index === activePerformerIndex ? "is-active" : ""}`}
            >
              <div className="performer-card-header">
                <div className="text-strong">{name}</div>
              </div>

              <div className="performer-fields">
                  <>
                    {isSabre && (showMainGuardSelector || showBasePostureSelector) ? (
                      <div className="action-row performer-context-row">
                        {showMainGuardSelector ? (
                          <label>
                            {PERFORMANCE_STEP_LABELS.mainGuard}
                            <select
                              value={item.mainGuard ?? ""}
                              onChange={(event) =>
                                onFormChange(index, {
                                  mainGuard: event.target.value,
                                })
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
                              value={item.basePosture ?? ""}
                              onChange={(event) =>
                                onFormChange(index, {
                                  basePosture: event.target.value,
                                })
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
                        aria-label={PERFORMANCE_STEP_LABELS.roleLabel(name)}
                    >
                      <button
                        type="button"
                        className={`segmented-button ${v2Mode === "attack" ? "is-active" : ""}`}
                        aria-pressed={v2Mode === "attack"}
                        onClick={() =>
                          onFormChange(index, {
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
                        className={`segmented-button ${v2Mode === "defense" ? "is-active" : ""}`}
                        aria-pressed={v2Mode === "defense"}
                        onClick={() =>
                          onFormChange(index, {
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
                        className={`segmented-button ${v2Mode === "movement" ? "is-active" : ""}`}
                        aria-pressed={v2Mode === "movement"}
                        onClick={() =>
                          onFormChange(index, {
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
                        className={`segmented-button ${v2Mode === "note" ? "is-active" : ""}`}
                        aria-pressed={v2Mode === "note"}
                        onClick={() =>
                          onFormChange(index, { mode: "note", role: "none" })
                        }
                        disabled={isReadOnly}
                      >
                          {PERFORMANCE_STEP_LABELS.roleNote}
                      </button>
                    </div>

                    {!item.noteOverrides && v2Mode === "attack" ? (
                      <div className="form-section form-section--attack-layout">
                        <div className="preparation-toggle-row">
                          <label className="preparation-switch">
                            <input
                              type="checkbox"
                              checked={prepEnabled}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                if (!checked) {
                                  clearPrepDetails(index);
                                  return;
                                }
                                const fallback = prepTypeList[0] ?? "";
                                updatePrepDetails(
                                  index,
                                  prepActionValue || fallback,
                                  { role: "attack" },
                                );
                                onFormChange(index, {
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
                                  onFormChange(index, {
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
                                  onFormChange(index, {
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
                                updatePrepDetails(index, event.target.value, {
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
                                  onFormChange(index, {
                                    offensive: event.target.value,
                                  })
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
                                  value={
                                    builderSelections[index]?.attackComplement ??
                                    ""
                                  }
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (!value) {
                                      updateBuilderSelection(index, {
                                        attackComplement: "",
                                      });
                                      return;
                                    }
                                    addAttackComplement(index, value);
                                    updateBuilderSelection(index, {
                                      attackComplement: "",
                                    });
                                  }}
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
                              </div>
                            </label>
                          ) : null}
                        </div>
                        {Array.isArray(item.attackAttribute) &&
                        item.attackAttribute.length ? (
                          <div className="builder-tags">
                            {item.attackAttribute.map((token) => (
                                <span key={token} className="builder-tag">
                                <span className="builder-tag-value">
                                  {resolveTermLabel("attaque_attribut", token)}
                                </span>
                                <button
                                  type="button"
                                  className="button-icon button-ghost builder-tag-remove"
                                  onClick={() =>
                                    removeAttackComplement(index, token)
                                  }
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
                              value={item.target}
                              onChange={(event) =>
                                onFormChange(index, {
                                  target: event.target.value,
                                })
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
                                    index,
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
                                  value={
                                    builderSelections[index]
                                      ?.attackMoveComplement ?? ""
                                  }
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (!value) {
                                      updateBuilderSelection(index, {
                                        attackMoveComplement: "",
                                      });
                                      return;
                                    }
                                    addMoveComplement(
                                      index,
                                      "attackMove",
                                      value,
                                      attackMoveBaseValues,
                                    );
                                    updateBuilderSelection(index, {
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
                                      index,
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

                    {!item.noteOverrides && v2Mode === "defense" ? (
                      <div className="form-section form-section--attack-layout">
                        <div className="preparation-toggle-row">
                          <label className="preparation-switch">
                            <input
                              type="checkbox"
                              checked={prepEnabled}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                if (!checked) {
                                  clearPrepDetails(index);
                                  return;
                                }
                                const fallback = prepTypeList[0] ?? "";
                                updatePrepDetails(
                                  index,
                                  prepActionValue || fallback,
                                  { role: "defense" },
                                );
                                onFormChange(index, {
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
                                  onFormChange(index, {
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
                                  onFormChange(index, {
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
                                updatePrepDetails(index, event.target.value, {
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
                                  updateDefenseDetails(index, [
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
                                  value={
                                    builderSelections[index]
                                      ?.defenseActionComplement ?? ""
                                  }
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (!value) {
                                      updateBuilderSelection(index, {
                                        defenseActionComplement: "",
                                      });
                                      return;
                                    }
                                    if (!defenseActionAttributeTokens.includes(value)) {
                                      setDefenseActionAttributeTokens(index, [
                                        ...defenseActionAttributeTokens,
                                        value,
                                      ]);
                                    }
                                    updateBuilderSelection(index, {
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
                                      index,
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
                                      updateDefenseDetails(index, [
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
                                      value={
                                        builderSelections[index]?.paradeComplement ??
                                        ""
                                      }
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        if (!value) {
                                          updateBuilderSelection(index, {
                                            paradeComplement: "",
                                          });
                                          return;
                                        }
                                        const list = getDefenseAttributeTokens(item);
                                        if (!list.includes(value)) {
                                          setDefenseAttributeTokens(index, [
                                            ...list,
                                            value,
                                          ]);
                                        }
                                        updateBuilderSelection(index, {
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
                            {getDefenseAttributeTokens(item).length > 0 && (
                              <div className="builder-tags attack-layout-full">
                                {getDefenseAttributeTokens(item).map((token) => (
                                  <span key={token} className="builder-tag">
                                    <span className="builder-tag-value">
                                      {resolveTermLabel("parade_attribut", token)}
                                    </span>
                                    <button
                                      type="button"
                                      className="button-icon button-ghost builder-tag-remove"
                                      onClick={() => {
                                        const next = getDefenseAttributeTokens(
                                          item,
                                        ).filter((entry) => entry !== token);
                                        setDefenseAttributeTokens(index, next);
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
                                        index,
                                        "defendMove",
                                        event.target.value,
                                        attackMoveBaseValues,
                                      )
                                    }
                                  >
                                    <option value="">—</option>
                                    {attackMoveBaseOptions.map((option) => (
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
                              {showMoveAttributeSelector ? (
                                <label>
                                  {PERFORMANCE_STEP_LABELS.attributeLabel}
                                  <div className="input-row">
                                    <select
                                      value={
                                        builderSelections[index]
                                          ?.defendMoveComplement ?? ""
                                      }
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        if (!value) {
                                          updateBuilderSelection(index, {
                                            defendMoveComplement: "",
                                          });
                                          return;
                                        }
                                        addMoveComplement(
                                          index,
                                          "defendMove",
                                          value,
                                          attackMoveBaseValues,
                                        );
                                        updateBuilderSelection(index, {
                                          defendMoveComplement: "",
                                        });
                                      }}
                                    >
                                      <option value="">—</option>
                                      {attackMoveComplementOptions.map(
                                        (value) => (
                                          <option key={value} value={value}>
                                            {resolveTermLabel("deplacement_complement", value)}
                                          </option>
                                        ),
                                      )}
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
                                          index,
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

                    {!item.noteOverrides && v2Mode === "movement" ? (
                      <div className="form-section">
                        <div className="action-row action-row--two">
                          {showAttackMoveBaseSelector ? (
                            <label>
                              {PERFORMANCE_STEP_LABELS.movementLabel}
                              <select
                                value={attackMoveParts.base}
                                onChange={(event) =>
                                  updateMoveBase(
                                    index,
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
                                  value={
                                    builderSelections[index]
                                      ?.attackMoveComplement ?? ""
                                  }
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (!value) {
                                      updateBuilderSelection(index, {
                                        attackMoveComplement: "",
                                      });
                                      return;
                                    }
                                    addMoveComplement(
                                      index,
                                      "attackMove",
                                      value,
                                      attackMoveBaseValues,
                                    );
                                    updateBuilderSelection(index, {
                                      attackMoveComplement: "",
                                    });
                                  }}
                                >
                                  <option value="">—</option>
                                  {attackMoveComplementOptions.map((value) => (
                                    <option key={value} value={value}>
                                      {resolveTermLabel(
                                        "deplacement_complement",
                                        value,
                                      )}
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
                                  {resolveTermLabel(
                                    "deplacement_complement",
                                    token,
                                  )}
                                </span>
                                <button
                                  type="button"
                                  className="button-icon button-ghost builder-tag-remove"
                                  onClick={() =>
                                    removeMoveComplement(
                                      index,
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

                    {v2Mode === "note" ? (
                      <label>
                        {uiLabels.notes}
                        <div className="input-with-clear">
                          <input
                            value={item.note}
                            onChange={(event) =>
                              onFormChange(index, {
                                note: event.target.value,
                              })
                            }
                          />
                          {item.note ? (
                            <button
                              type="button"
                              className="input-clear"
                              onClick={() => onFormChange(index, { note: "" })}
                                aria-label={PERFORMANCE_STEP_LABELS.noteClear}
                              title="Effacer"
                            />
                          ) : null}
                        </div>
                      </label>
                    ) : null}

                    {v2Mode !== "note" ? (
                      <label>
                        {uiLabels.notes}
                        <div className="input-with-clear">
                          <input
                            value={item.note}
                            onChange={(event) =>
                              onFormChange(index, {
                                note: event.target.value,
                              })
                            }
                          />
                          {item.note ? (
                            <button
                              type="button"
                              className="input-clear"
                              onClick={() => onFormChange(index, { note: "" })}
                                aria-label={PERFORMANCE_STEP_LABELS.noteClear}
                              title="Effacer"
                            />
                          ) : null}
                        </div>
                      </label>
                    ) : null}
                  </>
              </div>
            </div>
          );
        })}
      </div>
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="button-secondary"
          onClick={onResetForm}
          disabled={isReadOnly}
        >
          {PERFORMANCE_STEP_LABELS.reset}
        </button>
        <button
          type="button"
          className="button-primary"
          onClick={onAddStep}
          disabled={isReadOnly}
        >
          {editingStepId
            ? PERFORMANCE_STEP_LABELS.updateStep
            : insertStepIndex != null
              ? PERFORMANCE_STEP_LABELS.insertStep
              : PERFORMANCE_STEP_LABELS.addStep}
        </button>
        {editingStepId ? (
          <button
            type="button"
            className="button-ghost"
            onClick={onCancelEditStep}
            disabled={isReadOnly}
          >
            {PERFORMANCE_STEP_LABELS.cancelEdit}
          </button>
        ) : null}
      </div>
    </>
  );
}
