import { useEffect, useMemo, useState } from "react";
import { FaXmark } from "react-icons/fa6";
import { PERFORMANCE_STEP_LABELS } from "../../lib/performances.js";
import {
  useClassicCombatStepFormLogic,
  useSabreCombatStepFormLogic,
} from "../../hooks/usePerformanceFormLogic.js";

function hasStepFormContent(item) {
  if (!item || typeof item !== "object") return false;
  const note = typeof item.note === "string" ? item.note.trim() : "";
  if (item.mode === "note") return Boolean(note);
  if (item.mode === "choreography") return Boolean(item.chorePhase || note);
  if (note) return true;
  if (item.role === "attack") {
    return Boolean(
      item.offensive ||
        item.action ||
        item.target ||
        item.attackMove ||
        (Array.isArray(item.attackAttribute) && item.attackAttribute.length) ||
        (Array.isArray(item.actionDetails) && item.actionDetails.length),
    );
  }
  if (item.role === "preparation") {
    return Boolean(
      item.action ||
        item.target ||
        (Array.isArray(item.attackAttribute) && item.attackAttribute.length) ||
        (Array.isArray(item.actionDetails) && item.actionDetails.length),
    );
  }
  if (item.role === "defense") {
    return Boolean(
      item.defense ||
        item.defensive ||
        item.paradeNumber ||
        item.paradeAttribute ||
        item.defendMove ||
        (Array.isArray(item.defenseDetails) && item.defenseDetails.length),
    );
  }
  return false;
}

export default function PerformanceStepForm({
  form,
  performers,
  performerLabels,
  activePerformerIndex,
  setActivePerformerIndex,
  showPhase,
  phaseOptions,
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
  const showModeToggle = lexiconKey === "sabre-laser";
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
    setDefenseAttributeTokens,
    getActionDetails,
    getDefenseDetails,
    updateDefenseDetails,
    updateDefenseDetail,
    updatePrepDetails,
    addAttackComplement,
    removeAttackComplement,
    getV2Mode,
    resolveDefenseType,
    getAttackActionValue,
    getDefenseActionValue,
    withCurrentOption,
    summaryLines,
    hasAnySummary,
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
    resolveLabel,
  } = logic;
  const resolveTermLabel = (type, value) => resolveLabel(type, value);
  const [manuallyHiddenIndexes, setManuallyHiddenIndexes] = useState([]);
  const [manuallyShownIndexes, setManuallyShownIndexes] = useState([]);

  const autoHiddenIndexes = useMemo(
    () =>
      performers
        .map((_, index) => index)
        .filter(
          (index) =>
            index !== activePerformerIndex && !hasStepFormContent(form[index]),
        ),
    [performers, activePerformerIndex, form],
  );

  useEffect(() => {
    const maxIndex = performers.length - 1;
    setManuallyHiddenIndexes((prev) =>
      prev.filter((index) => index >= 0 && index <= maxIndex),
    );
    setManuallyShownIndexes((prev) =>
      prev.filter((index) => index >= 0 && index <= maxIndex),
    );
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
          const defenseDetail = getDefenseDetails(item)[0] ?? {};
          const attackActionValue = getAttackActionValue(item);
          const attackActionOptions = withCurrentOption(
            offensiveOptions,
            attackActionValue,
            "offensive",
          );
          const prepActionValue = getActionDetails(item)[0]?.action ?? "";
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
          const targetSelectOptions = withCurrentOption(
            targetOptions,
            item.target,
            "target",
          );
          // Defense type may come from local builder state or persisted data.
          const defenseType = resolveDefenseType(item, index);
          return (
            <div
              key={`${name}-${index}`}
              className={`performer-card ${index === activePerformerIndex ? "is-active" : ""}`}
            >
              <div className="performer-card-header">
                <div className="text-strong">{name}</div>
                {showModeToggle ? (
                  <div
                    className="segmented segmented--solid"
                    role="radiogroup"
                    aria-label={PERFORMANCE_STEP_LABELS.modeLabel(name)}
                  >
                    <button
                      type="button"
                      className={`segmented-button ${item.mode === "note" ? "is-active" : ""}`}
                      aria-pressed={item.mode === "note"}
                      onClick={() => onFormChange(index, { mode: "note" })}
                      disabled={isReadOnly}
                    >
                      {PERFORMANCE_STEP_LABELS.modeNote}
                    </button>
                    {showPhase ? (
                      <button
                        type="button"
                        className={`segmented-button ${item.mode === "choreography" ? "is-active" : ""}`}
                        aria-pressed={item.mode === "choreography"}
                        onClick={() =>
                          onFormChange(index, { mode: "choreography" })
                        }
                      >
                      {PERFORMANCE_STEP_LABELS.modeChoregraphie}
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
                      {PERFORMANCE_STEP_LABELS.modeCombat}
                    </button>
                  </div>
                ) : null}
              </div>

              {item.mode === "combat" ? (
                <div className="performer-fields">
                  <>
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
                            role: "attack",
                            noteOverrides: false,
                            actionDetails: [],
                            action: "",
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
                        className={`segmented-button ${v2Mode === "preparation" ? "is-active" : ""}`}
                        aria-pressed={v2Mode === "preparation"}
                        onClick={() =>
                          onFormChange(index, {
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
                          {PERFORMANCE_STEP_LABELS.rolePreparation}
                      </button>
                      <button
                        type="button"
                        className={`segmented-button ${v2Mode === "note" ? "is-active" : ""}`}
                        aria-pressed={v2Mode === "note"}
                        onClick={() => onFormChange(index, { role: "none" })}
                        disabled={isReadOnly}
                      >
                          {PERFORMANCE_STEP_LABELS.roleNote}
                      </button>
                    </div>

                    {!item.noteOverrides && v2Mode === "attack" ? (
                      <div className="form-section form-section--attack-layout">
                        <div className="action-row action-row--two preparation-position-row attack-layout-block attack-layout-block--offense">
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

                        <div className="action-row action-row--two attack-layout-block attack-layout-block--move">
                          <label>
                            {PERFORMANCE_STEP_LABELS.movementLabel}
                            <select
                              value={
                                getMoveParts(
                                  item.attackMove,
                                  attackMoveBaseValues,
                                ).base
                              }
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
                        </div>
                        {getMoveParts(item.attackMove, attackMoveBaseValues)
                          .complements.length > 0 && (
                          <div className="builder-tags attack-layout-full">
                            {getMoveParts(
                              item.attackMove,
                              attackMoveBaseValues,
                            ).complements.map((token) => (
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
                      <div className="form-section">
                        <label>
                          {PERFORMANCE_STEP_LABELS.defenseType}
                          <select
                            value={defenseType}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (!value) {
                                updateBuilderSelection(index, {
                                  defenseType: "",
                                });
                                updateDefenseDetails(index, []);
                                return;
                              }
                              if (value === "parade") {
                                updateBuilderSelection(index, {
                                  defenseType: "parade",
                                });
                                updateDefenseDetails(index, [
                                  {
                                    defense: "parade",
                                    position: "",
                                    attribute: "",
                                  },
                                ]);
                              } else {
                                updateBuilderSelection(index, {
                                  defenseType: "esquive",
                                });
                                updateDefenseDetails(index, [
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
                              {PERFORMANCE_STEP_LABELS.defenseParade}
                            </option>
                            <option value="esquive">
                              {PERFORMANCE_STEP_LABELS.defenseEsquive}
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
                                    updateDefenseDetail(index, 0, {
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
                              <label>
                                {PERFORMANCE_STEP_LABELS.attributeLabel}
                                <div className="input-row">
                                  <select
                                    value={
                                      builderSelections[index]
                                        ?.paradeComplement ?? ""
                                    }
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      if (!value) {
                                        updateBuilderSelection(index, {
                                          paradeComplement: "",
                                        });
                                        return;
                                      }
                                      const list =
                                        getDefenseAttributeTokens(item);
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
                            </div>
                            {getDefenseAttributeTokens(item).length > 0 && (
                              <div className="builder-tags">
                                {getDefenseAttributeTokens(item).map(
                                  (token) => (
                                    <span key={token} className="builder-tag">
                                      <span className="builder-tag-value">
                                        {resolveTermLabel("parade_attribut", token)}
                                      </span>
                                      <button
                                        type="button"
                                        className="button-icon button-ghost builder-tag-remove"
                                        onClick={() => {
                                          const next =
                                            getDefenseAttributeTokens(
                                              item,
                                            ).filter(
                                              (entry) => entry !== token,
                                            );
                                          setDefenseAttributeTokens(
                                            index,
                                            next,
                                          );
                                        }}
                                        aria-label={`Retirer ${token}`}
                                        title="Retirer"
                                      >
                                        <FaXmark />
                                      </button>
                                    </span>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {defenseType === "esquive" ? (
                          <label>
                            {uiLabels.defensive}
                            <select
                              value={defenseActionValue}
                              onChange={(event) =>
                                updateDefenseDetail(index, 0, {
                                  defense: event.target.value,
                                })
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

                        {defenseType === "parade" ||
                        defenseType === "esquive" ? (
                          <div className="form-section form-section--soft">
                            <div className="action-row action-row--two">
                              <label>
                                {PERFORMANCE_STEP_LABELS.movementLabel}
                                <select
                                  value={
                                    getMoveParts(
                                      item.defendMove,
                                      attackMoveBaseValues,
                                    ).base
                                  }
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
                            </div>
                            {getMoveParts(item.defendMove, attackMoveBaseValues)
                              .complements.length > 0 && (
                              <div className="builder-tags">
                                {getMoveParts(
                                  item.defendMove,
                                  attackMoveBaseValues,
                                ).complements.map((token) => (
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
                      </div>
                    ) : null}

                    {!item.noteOverrides && v2Mode === "preparation" ? (
                      <div className="form-section">
                        <label>
                          {PERFORMANCE_STEP_LABELS.preparationType}
                          <select
                            value={prepActionValue}
                            onChange={(event) =>
                              updatePrepDetails(index, event.target.value, "")
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

                        <label>
                          {PERFORMANCE_STEP_LABELS.target}
                          <select
                            value={item.target ?? ""}
                            onChange={(event) =>
                              onFormChange(index, {
                                role: "preparation",
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

                        <div className="action-row action-row--two">
                          <label>
                            {uiLabels.paradeNumber}
                            <select
                              value={getActionDetails(item)[0]?.attribute ?? ""}
                              onChange={(event) =>
                                updatePrepDetails(
                                  index,
                                  getActionDetails(item)[0]?.action ?? "",
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
                            {PERFORMANCE_STEP_LABELS.positionComplement}
                            <div className="input-row">
                              <select
                                value={
                                  builderSelections[index]
                                    ?.prepPositionComplement ?? ""
                                }
                                onChange={(event) => {
                                  const value = event.target.value;
                                  if (!value) {
                                    updateBuilderSelection(index, {
                                      prepPositionComplement: "",
                                    });
                                    return;
                                  }
                                  addAttackComplement(index, value);
                                  updateBuilderSelection(index, {
                                    prepPositionComplement: "",
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
                        </div>
                        {Array.isArray(item.attackAttribute) &&
                          item.attackAttribute.length > 0 && (
                            <div className="builder-tags">
                              {item.attackAttribute.map((token) => (
                                <span key={token} className="builder-tag">
                                  <span className="builder-tag-value">
                                    {resolveTermLabel("parade_attribut", token)}
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
              ) : null}

              {item.mode === "choreography" ? (
                <div className="performer-fields">
                  <label>
                    {PERFORMANCE_STEP_LABELS.chorePhase}
                    {isSabre ? (
                      <span className="field-hint">
                        {PERFORMANCE_STEP_LABELS.choreHint}
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
                            aria-label={PERFORMANCE_STEP_LABELS.noteClear}
                            title="Effacer"
                          />
                        ) : null}
                      </div>
                    </label>
                  ) : null}
                </div>
              ) : null}

              {item.mode !== "combat" && item.mode !== "choreography" ? (
                <div className="performer-fields">
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
                          aria-label={PERFORMANCE_STEP_LABELS.noteClear}
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
