import { useEffect, useState } from "react";
import ConfirmDeleteModal from "../components/modals/ConfirmDeleteModal.jsx";
import CombatPageLayout from "../components/combat/CombatPageLayout.jsx";
import CombatColumns from "../components/combat/CombatColumns.jsx";
import CombatStepForm from "../components/combat/CombatStepForm.jsx";
import StepInlineEditorModal from "../components/combat/StepInlineEditorModal.jsx";
import CombatLeftPanels from "../components/combat/CombatLeftPanels.jsx";
import CombatRightPanels from "../components/combat/CombatRightPanels.jsx";

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
  favorites,
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
  onResetForm,
}) {
  const favoriteMap = favorites || {};
  const [activeParticipantIndex, setActiveParticipantIndex] = useState(0);
  const showWeapons =
    Array.isArray(participantWeaponOptions) &&
    participantWeaponOptions.length > 0;
  const showPhase = Array.isArray(phaseOptions) && phaseOptions.length > 0;
  const [inlineEdit, setInlineEdit] = useState(null);
  const [inlineItem, setInlineItem] = useState(null);
  const [pendingPhraseDelete, setPendingPhraseDelete] = useState(null);
  const inlineStepIndex = inlineEdit
    ? (activePhrase?.steps?.findIndex(
        (step) => step.id === inlineEdit.stepId,
      ) ?? -1)
    : -1;

  const uiLabels = {
    offensive: "Offensive",
    action: "Action d'arme",
    attackAttribute: "Attribut attaque",
    target: "Cible",
    attackMove: "Déplacement",
    defensive: "Défensive",
    paradeNumber: "Position de parade",
    paradeAttribute: "Attribut parade",
    defendMove: "Déplacement",
    notes: "Notes",
    weapon: "Arme",
    ...labels,
  };

  const favoriteKeys = {
    offensive: "offensive",
    action: "action",
    attackAttribute: "attaque-attribut",
    target: "cible",
    attackMove: "deplacement-attaque",
    defensive: "defensive",
    paradeNumber: "parade-numero",
    paradeAttribute: "parade-attribut",
    defendMove: "deplacement-defense",
    ...favoriteTypeKeys,
  };

  useEffect(() => {
    if (participants.length === 0) return;
    if (activeParticipantIndex > participants.length - 1) {
      setActiveParticipantIndex(participants.length - 1);
    }
  }, [participants.length, activeParticipantIndex]);

  function orderOptions(list, typeKey) {
    const favs = new Set(favoriteMap[typeKey] ?? []);
    const favoriteItems = list
      .filter((item) => favs.has(item))
      .map((item) => ({ value: item, label: `★ ${item}` }));
    const others = list
      .filter((item) => !favs.has(item))
      .map((item) => ({ value: item, label: item }));
    return [...favoriteItems, ...others];
  }

  const phraseIndex = activePhrase
    ? phrases.findIndex((phrase) => phrase.id === activePhrase.id)
    : -1;
  const editingStepIndex = editingStepId
    ? (activePhrase?.steps?.findIndex((step) => step.id === editingStepId) ??
      -1)
    : -1;
  const nextStepIndex = activePhrase?.steps?.length ?? -1;

  function openInlineEditor(stepId, participantIndex, item) {
    setInlineEdit({ stepId, participantIndex });
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
    closeInlineEditor();
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
      normalizedLexicon={normalizedLexicon}
      orderOptions={orderOptions}
      onFormChange={onFormChange}
      toggleAttribute={toggleAttribute}
      isReadOnly={isReadOnly}
      onResetForm={onResetForm}
      onAddStep={onAddStep}
      editingStepId={editingStepId}
      onCancelEditStep={onCancelEditStep}
      buildSummaryLine={buildSummaryLine}
      showParadeNumber={showParadeNumber}
    />
  );

  return (
    <>
      <CombatPageLayout
        title="Combat"
        subtitle="Édite les phrases et les passes."
        onBack={() => onNavigate?.("combats")}
      >
        <CombatColumns
          mode="edit"
          editLeft={
            <CombatLeftPanels
              mode="edit"
              combatName={combatName}
              combatDescription={combatDescription}
              onCombatNameChange={onCombatNameChange}
              onCombatDescriptionChange={onCombatDescriptionChange}
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
              isReadOnly={isReadOnly}
            />
          }
          editRight={
            <CombatRightPanels
              mode="edit"
              readingProps={{
                activePhrase,
                participants,
                participantLabels,
                onResetForm,
                setActiveParticipantIndex,
                isReadOnly,
                onEditCard: openInlineEditor,
              }}
              stepForm={stepForm}
              nextStepIndex={nextStepIndex}
              phraseIndex={phraseIndex}
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
        normalizedLexicon={normalizedLexicon}
        orderOptions={orderOptions}
        toggleAttribute={toggleAttribute}
        showParadeNumber={showParadeNumber}
        isReadOnly={isReadOnly}
        onClose={closeInlineEditor}
        onSave={saveInlineEditor}
        onUpdateInlineItem={updateInlineItem}
      />
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
