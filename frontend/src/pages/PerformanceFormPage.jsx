import { useEffect, useState } from "react";
import ConfirmDeleteModal from "../components/modals/ConfirmDeleteModal.jsx";
import PerformancePageLayout from "../components/performance/PerformancePageLayout.jsx";
import PerformanceColumns from "../components/performance/PerformanceColumns.jsx";
import PerformanceDetails from "../components/performance/PerformanceDetails.jsx";
import PerformanceStepForm from "../components/performance/PerformanceStepForm.jsx";
import StepInlineEditorModal from "../components/performance/StepInlineEditorModal.jsx";
import PerformanceLeftPanels from "../components/performance/PerformanceLeftPanels.jsx";
import PerformanceRightPanels from "../components/performance/PerformanceRightPanels.jsx";
import {
  PERFORMANCE_FAVORITE_TYPE_KEYS,
  PERFORMANCE_UI_LABELS,
} from "../lib/performances.js";
import { resolveLexiconTermLabel } from "../lib/lexicon.js";

export default function PerformanceFormPage({
  performers,
  form,
  performanceName,
  performanceDescription,
  stepsCount,
  sequences,
  activeSequenceId,
  activeSequence,
  performerLabels,
  normalizedLexicon,
  lexiconByKey,
  favorites,
  favoritesByLexicon,
  lexiconKey,
  labels,
  favoriteTypeKeys,
  showParadeNumber = true,
  performerWeaponOptions,
  phaseOptions,
  isReadOnly = false,
  onPerformerCountChange,
  onPerformerNameChange,
  onPerformerWeaponChange,
  onFormChange,
  onAddStep,
  onPerformanceNameChange,
  onPerformanceDescriptionChange,
  onCreateSequence,
  onSelectSequence,
  onRenameSequence,
  onToggleSequencePerformerVisibility,
  onMoveSequence,
  onMoveSequenceToIndex,
  onDeleteSequence,
  onEditStep,
  onRemoveStep,
  onCancelEditStep,
  editingStepId,
  buildPerformerLabel,
  buildSummaryLine,
  buildSummaryLines,
  toggleAttribute,
  onNavigate,
  onUpdateStepPerformer,
  onUpdateStepLexicon,
  onResetForm,
  insertStepIndex,
  onInsertStep,
  insertionMode,
  onToggleInsertionMode,
  onInsertEmptyStep,
  deletionMode,
  onToggleDeletionMode,
  onDeleteStep,
}) {
  const [activePerformerIndex, setActivePerformerIndex] = useState(0);
  const showWeapons =
    Array.isArray(performerWeaponOptions) &&
    performerWeaponOptions.length > 0;
  const showPhase = Array.isArray(phaseOptions) && phaseOptions.length > 0;
  const availableLexiconKeys = lexiconByKey ? Object.keys(lexiconByKey) : [];
  const activeLexiconKey = lexiconKey ?? availableLexiconKeys[0];
  const resolvedLexicon =
    lexiconByKey && activeLexiconKey && lexiconByKey[activeLexiconKey]
      ? lexiconByKey[activeLexiconKey]
      : normalizedLexicon;
  const [inlineEdit, setInlineEdit] = useState(null);
  const [inlineItem, setInlineItem] = useState(null);
  const [inlineLexiconKey, setInlineLexiconKey] = useState(null);
  const [pendingSequenceDelete, setPendingSequenceDelete] = useState(null);
  const [pendingSequenceRename, setPendingSequenceRename] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const inlineStepIndex = inlineEdit
    ? (activeSequence?.steps?.findIndex(
        (step) => step.id === inlineEdit.stepId,
      ) ?? -1)
    : -1;

  const favoriteMap =
    favoritesByLexicon && activeLexiconKey
      ? (favoritesByLexicon[activeLexiconKey] ?? {})
      : favorites || {};
  const inlineFavoriteMap =
    favoritesByLexicon && inlineLexiconKey
      ? (favoritesByLexicon[inlineLexiconKey] ?? {})
      : favoriteMap;
  const inlineLexicon =
    lexiconByKey && inlineLexiconKey
      ? (lexiconByKey[inlineLexiconKey] ?? resolvedLexicon)
      : resolvedLexicon;
  const resolveCurrentTermLabel = (type, value) =>
    resolveLexiconTermLabel(resolvedLexicon, value, type);

  const uiLabels = { ...PERFORMANCE_UI_LABELS, ...labels };

  const favoriteKeys = { ...PERFORMANCE_FAVORITE_TYPE_KEYS, ...favoriteTypeKeys };

  useEffect(() => {
    if (performers.length === 0) return;
    if (activePerformerIndex > performers.length - 1) {
      setActivePerformerIndex(performers.length - 1);
    }
  }, [performers.length, activePerformerIndex]);

  function createOrderOptions(map) {
    return (list, typeKey, getLabel = (value) => value) => {
      const favs = new Set(map[typeKey] ?? []);
      const favoriteItems = list
        .filter((item) => {
          const label = getLabel(item);
          return favs.has(item) || favs.has(label);
        })
        .map((item) => ({ value: item, label: `★ ${getLabel(item)}` }));
      const others = list
        .filter((item) => {
          const label = getLabel(item);
          return !favs.has(item) && !favs.has(label);
        })
        .map((item) => ({ value: item, label: getLabel(item) }));
      return [...favoriteItems, ...others];
    };
  }

  const orderOptions = createOrderOptions(favoriteMap);
  const inlineOrderOptions = createOrderOptions(inlineFavoriteMap);

  const sequenceIndex = activeSequence
    ? sequences.findIndex((sequence) => sequence.id === activeSequence.id)
    : -1;
  const editingStepIndex = editingStepId
    ? (activeSequence?.steps?.findIndex((step) => step.id === editingStepId) ??
      -1)
    : -1;
  const nextStepIndex = activeSequence?.steps?.length ?? -1;

  function openInlineEditor(stepId, performerIndex, item) {
    const step = activeSequence?.steps?.find((entry) => entry.id === stepId);
    const stepKey =
      typeof step?.lexicon === "string"
        ? step.lexicon
        : (activeLexiconKey ?? "classic");
    setInlineEdit({ stepId, performerIndex, lexiconKey: stepKey });
    setInlineLexiconKey(stepKey);
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
    setInlineLexiconKey(null);
  }

  function updateInlineItem(patch) {
    setInlineItem((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function saveInlineEditor() {
    if (!inlineEdit || !inlineItem || !onUpdateStepPerformer) return;
    onUpdateStepPerformer(
      inlineEdit.stepId,
      inlineEdit.performerIndex,
      inlineItem,
    );
    if (onUpdateStepLexicon && inlineLexiconKey) {
      onUpdateStepLexicon(inlineEdit.stepId, inlineLexiconKey);
    }
    closeInlineEditor();
  }

  function openRenameSequenceModal(payload) {
    if (!payload) return;
    setPendingSequenceRename(payload);
    setRenameValue(payload.name ?? "");
  }

  function closeRenameSequenceModal() {
    setPendingSequenceRename(null);
  }

  function submitRenameSequence(event) {
    event?.preventDefault?.();
    if (!pendingSequenceRename) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    onRenameSequence(pendingSequenceRename.id, trimmed);
    closeRenameSequenceModal();
  }

  const stepForm = (
    <PerformanceStepForm
      form={form}
      performers={performers}
      performerLabels={performerLabels}
      activePerformerIndex={activePerformerIndex}
      setActivePerformerIndex={setActivePerformerIndex}
      showPhase={showPhase}
      phaseOptions={phaseOptions}
      uiLabels={uiLabels}
      favoriteKeys={favoriteKeys}
      normalizedLexicon={resolvedLexicon}
      lexiconKey={activeLexiconKey}
      orderOptions={orderOptions}
      onFormChange={onFormChange}
      toggleAttribute={toggleAttribute}
      isReadOnly={isReadOnly}
      onResetForm={onResetForm}
      onAddStep={onAddStep}
      insertStepIndex={insertStepIndex}
      editingStepId={editingStepId}
      onCancelEditStep={onCancelEditStep}
      buildSummaryLine={buildSummaryLine}
      showParadeNumber={showParadeNumber}
      formVariant={showPhase && !showParadeNumber ? "sabre" : "classic"}
    />
  );

  return (
    <>
      <PerformancePageLayout
        title="Combat"
        subtitle="Édite les phrases et les passes."
        onBack={() => onNavigate?.("performances")}
      >
        <PerformanceDetails
          performanceName={performanceName}
          performanceDescription={performanceDescription}
          onPerformanceNameChange={onPerformanceNameChange}
          onPerformanceDescriptionChange={onPerformanceDescriptionChange}
          isReadOnly={isReadOnly}
          mode={"edit"}
        />
        <PerformanceColumns
          mode="edit"
          editLeft={
            <PerformanceLeftPanels
              mode="edit"
              performers={performers}
              buildPerformerLabel={buildPerformerLabel}
              onPerformerCountChange={onPerformerCountChange}
              onPerformerNameChange={onPerformerNameChange}
              onPerformerWeaponChange={onPerformerWeaponChange}
              performerWeaponOptions={performerWeaponOptions}
              showWeapons={showWeapons}
              uiLabels={uiLabels}
              sequences={sequences}
              activeSequenceId={activeSequenceId}
              onCreateSequence={onCreateSequence}
              onSelectSequence={onSelectSequence}
              onMoveSequence={onMoveSequence}
              onMoveSequenceToIndex={onMoveSequenceToIndex}
              onRequestDeleteSequence={setPendingSequenceDelete}
              onRequestRenameSequence={openRenameSequenceModal}
              isReadOnly={isReadOnly}
            />
          }
          editRight={
            <PerformanceRightPanels
              mode="edit"
              readingProps={{
                activeSequence,
                sequences,
                performers,
                performerLabels,
                resolveTermLabel: resolveCurrentTermLabel,
                onResetForm,
                setActivePerformerIndex,
                isReadOnly,
                onEditCard: openInlineEditor,
                onInsertStep,
                insertionMode,
                onToggleInsertionMode,
                onInsertEmptyStep,
                deletionMode,
                onToggleDeletionMode,
                onDeleteStep,
                onSelectSequence,
                onRenameSequence,
                onToggleSequencePerformerVisibility,
              }}
              stepForm={stepForm}
              nextStepIndex={nextStepIndex}
              sequenceIndex={sequenceIndex}
              insertStepIndex={insertStepIndex}
            />
          }
        />
      </PerformancePageLayout>
      <StepInlineEditorModal
        isOpen={!!inlineEdit && !!inlineItem}
        inlineEdit={inlineEdit}
        inlineItem={inlineItem}
        performerLabels={performerLabels}
        inlineStepIndex={inlineStepIndex}
        showPhase={showPhase}
        phaseOptions={phaseOptions}
        uiLabels={uiLabels}
        favoriteKeys={favoriteKeys}
        normalizedLexicon={inlineLexicon}
        orderOptions={inlineOrderOptions}
        showParadeNumber={showParadeNumber}
        isReadOnly={isReadOnly}
        lexiconKey={inlineLexiconKey}
        onClose={closeInlineEditor}
        onSave={saveInlineEditor}
        onUpdateInlineItem={updateInlineItem}
      />
      {pendingSequenceRename ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closeRenameSequenceModal}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="kicker">Renommer la phrase</div>
            <form className="stack-2" onSubmit={submitRenameSequence}>
              <label>
                Nom de la phrase
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  autoFocus
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={closeRenameSequenceModal}
                >
                  Annuler
                </button>
                <button type="submit" className="button-primary">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <ConfirmDeleteModal
        isOpen={!!pendingSequenceDelete}
        title="Supprimer la phrase"
        message={
          pendingSequenceDelete
            ? `Supprimer définitivement ${pendingSequenceDelete.name} ?`
            : ""
        }
        onCancel={() => setPendingSequenceDelete(null)}
        onConfirm={() => {
          if (!pendingSequenceDelete) return;
          onDeleteSequence(pendingSequenceDelete.id);
          setPendingSequenceDelete(null);
        }}
      />
    </>
  );
}
