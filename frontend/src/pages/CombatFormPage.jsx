import { useEffect, useState } from "react";
import ConfirmDeleteModal from "../components/modals/ConfirmDeleteModal.jsx";
import CombatPageLayout from "../components/combat/CombatPageLayout.jsx";
import CombatColumns from "../components/combat/CombatColumns.jsx";
import CombatDetails from "../components/combat/CombatDetails.jsx";
import CombatStepForm from "../components/combat/CombatStepForm.jsx";
import StepInlineEditorModal from "../components/combat/StepInlineEditorModal.jsx";
import CombatLeftPanels from "../components/combat/CombatLeftPanels.jsx";
import CombatRightPanels from "../components/combat/CombatRightPanels.jsx";
import {
  COMBAT_FAVORITE_TYPE_KEYS,
  COMBAT_UI_LABELS,
} from "../lib/combats.js";

export default function CombatFormPage({
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
  lexiconByKey,
  favorites,
  favoritesByLexicon,
  lexiconKey,
  labels,
  favoriteTypeKeys,
  showParadeNumber = true,
  participantWeaponOptions,
  phaseOptions,
  isReadOnly = false,
  onParticipantCountChange,
  onParticipantNameChange,
  onParticipantWeaponChange,
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
  buildSummaryLines,
  toggleAttribute,
  onNavigate,
  onUpdateStepParticipant,
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
  const [activeParticipantIndex, setActiveParticipantIndex] = useState(0);
  const showWeapons =
    Array.isArray(participantWeaponOptions) &&
    participantWeaponOptions.length > 0;
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
  const [pendingPhraseDelete, setPendingPhraseDelete] = useState(null);
  const [pendingPhraseRename, setPendingPhraseRename] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const inlineStepIndex = inlineEdit
    ? (activePhrase?.steps?.findIndex(
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

  const uiLabels = { ...COMBAT_UI_LABELS, ...labels };

  const favoriteKeys = { ...COMBAT_FAVORITE_TYPE_KEYS, ...favoriteTypeKeys };

  useEffect(() => {
    if (participants.length === 0) return;
    if (activeParticipantIndex > participants.length - 1) {
      setActiveParticipantIndex(participants.length - 1);
    }
  }, [participants.length, activeParticipantIndex]);

  function createOrderOptions(map) {
    return (list, typeKey) => {
      const favs = new Set(map[typeKey] ?? []);
      const favoriteItems = list
        .filter((item) => favs.has(item))
        .map((item) => ({ value: item, label: `★ ${item}` }));
      const others = list
        .filter((item) => !favs.has(item))
        .map((item) => ({ value: item, label: item }));
      return [...favoriteItems, ...others];
    };
  }

  const orderOptions = createOrderOptions(favoriteMap);
  const inlineOrderOptions = createOrderOptions(inlineFavoriteMap);

  const phraseIndex = activePhrase
    ? phrases.findIndex((phrase) => phrase.id === activePhrase.id)
    : -1;
  const editingStepIndex = editingStepId
    ? (activePhrase?.steps?.findIndex((step) => step.id === editingStepId) ??
      -1)
    : -1;
  const nextStepIndex = activePhrase?.steps?.length ?? -1;

  function openInlineEditor(stepId, participantIndex, item) {
    const step = activePhrase?.steps?.find((entry) => entry.id === stepId);
    const stepKey =
      typeof step?.lexicon === "string"
        ? step.lexicon
        : (activeLexiconKey ?? "classic");
    setInlineEdit({ stepId, participantIndex, lexiconKey: stepKey });
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
    if (!inlineEdit || !inlineItem || !onUpdateStepParticipant) return;
    onUpdateStepParticipant(
      inlineEdit.stepId,
      inlineEdit.participantIndex,
      inlineItem,
    );
    if (onUpdateStepLexicon && inlineLexiconKey) {
      onUpdateStepLexicon(inlineEdit.stepId, inlineLexiconKey);
    }
    closeInlineEditor();
  }

  function openRenamePhraseModal(payload) {
    if (!payload) return;
    setPendingPhraseRename(payload);
    setRenameValue(payload.name ?? "");
  }

  function closeRenamePhraseModal() {
    setPendingPhraseRename(null);
  }

  function submitRenamePhrase(event) {
    event?.preventDefault?.();
    if (!pendingPhraseRename) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    onRenamePhrase(pendingPhraseRename.id, trimmed);
    closeRenamePhraseModal();
  }

  const stepForm = (
    <CombatStepForm
      form={form}
      participants={participants}
      participantLabels={participantLabels}
      activeParticipantIndex={activeParticipantIndex}
      setActiveParticipantIndex={setActiveParticipantIndex}
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
      <CombatPageLayout
        title="Combat"
        subtitle="Édite les phrases et les passes."
        onBack={() => onNavigate?.("combats")}
      >
        <CombatDetails
          combatName={combatName}
          combatDescription={combatDescription}
          onCombatNameChange={onCombatNameChange}
          onCombatDescriptionChange={onCombatDescriptionChange}
          isReadOnly={isReadOnly}
          mode={"edit"}
        />
        <CombatColumns
          mode="edit"
          editLeft={
            <CombatLeftPanels
              mode="edit"
              participants={participants}
              buildParticipantLabel={buildParticipantLabel}
              onParticipantCountChange={onParticipantCountChange}
              onParticipantNameChange={onParticipantNameChange}
              onParticipantWeaponChange={onParticipantWeaponChange}
              participantWeaponOptions={participantWeaponOptions}
              showWeapons={showWeapons}
              uiLabels={uiLabels}
              phrases={phrases}
              activePhraseId={activePhraseId}
              onCreatePhrase={onCreatePhrase}
              onSelectPhrase={onSelectPhrase}
              onMovePhrase={onMovePhrase}
              onMovePhraseToIndex={onMovePhraseToIndex}
              onRequestDeletePhrase={setPendingPhraseDelete}
              onRequestRenamePhrase={openRenamePhraseModal}
              isReadOnly={isReadOnly}
            />
          }
          editRight={
            <CombatRightPanels
              mode="edit"
              readingProps={{
                activePhrase,
                phrases,
                participants,
                participantLabels,
                onResetForm,
                setActiveParticipantIndex,
                isReadOnly,
                onEditCard: openInlineEditor,
                onInsertStep,
                insertionMode,
                onToggleInsertionMode,
                onInsertEmptyStep,
                deletionMode,
                onToggleDeletionMode,
                onDeleteStep,
                onSelectPhrase,
                onRenamePhrase,
              }}
              stepForm={stepForm}
              nextStepIndex={nextStepIndex}
              phraseIndex={phraseIndex}
              insertStepIndex={insertStepIndex}
            />
          }
        />
      </CombatPageLayout>
      <StepInlineEditorModal
        isOpen={!!inlineEdit && !!inlineItem}
        inlineEdit={inlineEdit}
        inlineItem={inlineItem}
        participantLabels={participantLabels}
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
      {pendingPhraseRename ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closeRenamePhraseModal}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="kicker">Renommer la phrase</div>
            <form className="stack-2" onSubmit={submitRenamePhrase}>
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
                  onClick={closeRenamePhraseModal}
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
        isOpen={!!pendingPhraseDelete}
        title="Supprimer la phrase"
        message={
          pendingPhraseDelete
            ? `Supprimer définitivement ${pendingPhraseDelete.name} ?`
            : ""
        }
        onCancel={() => setPendingPhraseDelete(null)}
        onConfirm={() => {
          if (!pendingPhraseDelete) return;
          onDeletePhrase(pendingPhraseDelete.id);
          setPendingPhraseDelete(null);
        }}
      />
    </>
  );
}
