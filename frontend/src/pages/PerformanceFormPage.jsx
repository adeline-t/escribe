import { useEffect, useMemo, useState } from "react";
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


function normalizeLookupToken(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getLexiconNodeName(node) {
  return String(node?.nom ?? node?.name ?? node?.label ?? "").trim();
}

function getLexiconNodeChildren(node) {
  const children = [];
  if (Array.isArray(node?.children)) children.push(...node.children);
  if (Array.isArray(node?.categories)) children.push(...node.categories);
  if (Array.isArray(node?.sous_categories)) children.push(...node.sous_categories);
  if (Array.isArray(node?.elements)) children.push(...node.elements);
  return children;
}

function buildLexiconCatalog(rawLexicon) {
  if (!rawLexicon || typeof rawLexicon !== "object") {
    return { termById: {}, termByName: {}, categories: [] };
  }
  const root =
    rawLexicon?.lexicon && typeof rawLexicon.lexicon === "object"
      ? rawLexicon.lexicon
      : rawLexicon;
  const rootChildren = getLexiconNodeChildren(root);
  const termById = {};
  const termByName = {};
  const categorySet = new Set();

  function visit(node, topCategory) {
    if (!node || typeof node !== "object") return;
    const nodeId = String(node.id ?? node.lexicon_id ?? "").trim();
    const label = getLexiconNodeName(node);
    const description = String(
      node.description ??
        node.definition ??
        (Array.isArray(node.details) ? node.details.join(" · ") : ""),
    ).trim();
    const children = getLexiconNodeChildren(node);
    const normalizedName = normalizeLookupToken(label);
    if (topCategory) categorySet.add(topCategory);
    if (nodeId && label) {
      const entry = {
        id: nodeId,
        label,
        description,
        category: topCategory || "autres",
      };
      if (!termById[nodeId]) termById[nodeId] = entry;
      if (normalizedName && !termByName[normalizedName]) {
        termByName[normalizedName] = entry;
      }
    }
    for (const child of children) {
      const childCategory = topCategory || label || "autres";
      visit(child, childCategory);
    }
  }

  for (const child of rootChildren) {
    const categoryName = getLexiconNodeName(child) || "autres";
    visit(child, categoryName);
  }

  return {
    termById,
    termByName,
    categories: [...categorySet].sort((a, b) => a.localeCompare(b, "fr")),
  };
}

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
  rawLexiconByKey,
  favorites,
  favoritesByLexicon,
  lexiconKey,
  labels,
  favoriteTypeKeys,
  showParadeNumber = true,
  performerWeaponOptions,
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
  const [lexiconSearch, setLexiconSearch] = useState("");
  const [lexiconCategory, setLexiconCategory] = useState("");
  const [isLexiconAssistantOpen, setIsLexiconAssistantOpen] = useState(false);
  const [selectedLexiconDefinitionId, setSelectedLexiconDefinitionId] =
    useState("");
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
  const rawActiveLexicon =
    rawLexiconByKey && activeLexiconKey
      ? (rawLexiconByKey[activeLexiconKey] ?? null)
      : null;
  const lexiconCatalog = useMemo(
    () => buildLexiconCatalog(rawActiveLexicon),
    [rawActiveLexicon],
  );

  const uiLabels = { ...PERFORMANCE_UI_LABELS, ...labels };

  const favoriteKeys = { ...PERFORMANCE_FAVORITE_TYPE_KEYS, ...favoriteTypeKeys };

  useEffect(() => {
    if (performers.length === 0) return;
    if (activePerformerIndex > performers.length - 1) {
      setActivePerformerIndex(performers.length - 1);
    }
  }, [performers.length, activePerformerIndex]);

  function createOrderOptions(map) {
    const collator = new Intl.Collator("fr", {
      sensitivity: "base",
      numeric: true,
    });
    return (list, typeKey, getLabel = (value) => value) => {
      const favs = new Set(map[typeKey] ?? []);
      const entries = list.map((item) => {
        const baseLabel = String(getLabel(item) ?? "").trim();
        const isFavorite = favs.has(item) || favs.has(baseLabel);
        return {
          value: item,
          label: isFavorite ? `★ ${baseLabel}` : baseLabel,
          baseLabel,
          isFavorite,
        };
      });
      const favoriteItems = entries
        .filter((entry) => entry.isFavorite)
        .sort((a, b) => collator.compare(a.baseLabel, b.baseLabel))
        .map(({ value, label }) => ({ value, label }));
      const others = entries
        .filter((entry) => !entry.isFavorite)
        .sort((a, b) => collator.compare(a.baseLabel, b.baseLabel))
        .map(({ value, label }) => ({ value, label }));
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
        : (activeLexiconKey ?? "classic-v2");
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

  const assistedTermList = useMemo(() => {
    const allTerms = Object.values(lexiconCatalog.termById);
    const query = normalizeLookupToken(lexiconSearch);
    return allTerms
      .filter((term) => {
        if (lexiconCategory && term.category !== lexiconCategory) return false;
        if (!query) return true;
        return normalizeLookupToken(term.label).includes(query);
      })
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [lexiconCatalog, lexiconSearch, lexiconCategory]);

  const stepForm = (
    <PerformanceStepForm
      form={form}
      performers={performers}
      performerLabels={performerLabels}
      activePerformerIndex={activePerformerIndex}
      setActivePerformerIndex={setActivePerformerIndex}
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
      formVariant={lexiconKey === "sabre-laser" ? "sabre" : "classic"}
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
      <button
        type="button"
        className="lexicon-assistant-tab"
        onClick={() => setIsLexiconAssistantOpen(true)}
        aria-label="Ouvrir le lexique assisté"
      >
        Lexique
      </button>
      {isLexiconAssistantOpen ? (
        <div
          className="modal-backdrop lexicon-assistant-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsLexiconAssistantOpen(false)}
        >
          <div
            className="modal lexicon-assistant-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="kicker">Lexique assisté</div>
            <h4 className="subtitle">Lexique assisté</h4>
            <div className="stack-1">
              <input
                value={lexiconSearch}
                onChange={(event) => setLexiconSearch(event.target.value)}
                placeholder="Rechercher un terme..."
              />
              <select
                value={lexiconCategory}
                onChange={(event) => setLexiconCategory(event.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {lexiconCatalog.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="lexicon-proto-list lexicon-proto-list--dense">
              {assistedTermList.slice(0, 180).map((term) => {
                const isSelected = selectedLexiconDefinitionId === term.id;
                return (
                  <button
                    key={term.id}
                    type="button"
                    className={`lexicon-proto-term ${
                      isSelected ? "is-selected" : ""
                    }`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedLexiconDefinitionId(term.id)}
                  >
                    <span className="lexicon-proto-term-head">
                      <span className="text-sm text-strong">{term.label}</span>
                      <span className="text-xs text-muted lexicon-proto-term-category">
                        {term.category || "—"}
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      {term.description || "Définition non trouvée."}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsLexiconAssistantOpen(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <StepInlineEditorModal
        isOpen={!!inlineEdit && !!inlineItem}
        inlineEdit={inlineEdit}
        inlineItem={inlineItem}
        performerLabels={performerLabels}
        inlineStepIndex={inlineStepIndex}
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
