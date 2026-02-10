import { useEffect, useState } from "react";
import {
  FaArrowDown,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaTrash,
} from "react-icons/fa6";
import StepCard, { StepSummaryCard } from "./StepCard.jsx";
import { PERFORMANCE_STEP_LABELS } from "../../lib/performances.js";
import {
  emptyPerformerState,
  getVisiblePerformerIndexes,
  labelForPerformer,
  normalizeHiddenPerformerIndexes,
} from "../../lib/performers.js";
import { hasPerformerStepContent } from "../../lib/stepContent.js";
import { resolveSequenceName } from "../../../../shared/sequenceModel.js";

export default function PerformanceReading({
  mode = "edit",
  activeSequence,
  sequences = [],
  performers = [],
  performerLabels = [],
  isReadOnly,
  onEditCard,
  onInsertEmptyStep,
  insertionMode,
  deletionMode,
  onDeleteStep,
  onToggleInsertionMode,
  onToggleDeletionMode,
  onSelectSequence,
  onRenameSequence,
  onToggleSequencePerformerVisibility,
  resolveTermLabel,
}) {
  const readOnly = mode === "read" || isReadOnly;
  const canEditSequenceVisibility =
    typeof onToggleSequencePerformerVisibility === "function" && !isReadOnly;
  const activeSequenceIndex = activeSequence
    ? sequences.findIndex((sequence) => sequence.id === activeSequence.id)
    : -1;
  const hasMultipleSequences = sequences.length > 1;
  const hasPreviousSequence = activeSequenceIndex > 0;
  const hasNextSequence =
    activeSequenceIndex >= 0 && activeSequenceIndex < sequences.length - 1;
  const hasSteps = Boolean(activeSequence?.steps?.length);
  const sequenceName = resolveSequenceName(
    activeSequence?.name,
    activeSequenceIndex >= 0 ? activeSequenceIndex : 0,
  );
  const activeVisiblePerformerIndexes = activeSequence
    ? getSequenceVisibleIndexes(activeSequence)
    : [];
  const showActiveIndexColumn = activeVisiblePerformerIndexes.length > 1;
  const [sequenceDraft, setSequenceDraft] = useState(sequenceName);

  useEffect(() => {
    setSequenceDraft(sequenceName);
  }, [activeSequence?.id, sequenceName]);

  function getSequenceHiddenIndexes(sequence) {
    return normalizeHiddenPerformerIndexes(
      sequence?.hiddenPerformerIndexes,
      performers.length,
    );
  }

  function getSequenceVisibleIndexes(sequence) {
    const hidden = getSequenceHiddenIndexes(sequence);
    const visible = getVisiblePerformerIndexes(performers.length, hidden);
    if (!visible.length && performers.length > 0) return [0];
    return visible;
  }

  function toggleSequencePerformerVisibility(sequenceId, performerIndex) {
    if (!canEditSequenceVisibility) return;
    onToggleSequencePerformerVisibility?.(sequenceId, performerIndex);
  }

  function renderSequenceVisibilityControls(sequence) {
    if (performers.length <= 1) return null;
    const hiddenIndexes = new Set(getSequenceHiddenIndexes(sequence));
    const visibleIndexes = getSequenceVisibleIndexes(sequence);
    return (
      <div className="performer-visibility-toolbar phrase-visibility-toolbar">
        <span className="performer-visibility-label">
          {PERFORMANCE_STEP_LABELS.columnVisibility}
        </span>
        <div className="performer-visibility-chips">
          {performers.map((performer, index) => {
            const label =
              performerLabels[index] ?? labelForPerformer(performer, index);
            const isHidden = hiddenIndexes.has(index);
            const canHide = !isHidden && visibleIndexes.length > 1;
            return (
              <button
                key={`phrase-${sequence?.id ?? "unknown"}-visibility-${index}`}
                type="button"
                className={`performer-visibility-chip ${
                  isHidden ? "is-hidden" : ""
                }`}
                onClick={() =>
                  toggleSequencePerformerVisibility(sequence?.id, index)
                }
                disabled={!canEditSequenceVisibility || !sequence?.id || !canHide && !isHidden}
                aria-pressed={!isHidden}
                title={isHidden ? `Afficher ${label}` : `Masquer ${label}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="button-ghost performer-visibility-reset"
          onClick={() => {
            const hidden = getSequenceHiddenIndexes(sequence);
            hidden.forEach((index) =>
              toggleSequencePerformerVisibility(sequence?.id, index),
            );
          }}
          disabled={
            !canEditSequenceVisibility ||
            !sequence?.id ||
            getSequenceHiddenIndexes(sequence).length === 0
          }
        >
          {PERFORMANCE_STEP_LABELS.showAllColumns}
        </button>
      </div>
    );
  }

  function getReadCardType(item) {
    const hasDisplayContent = hasPerformerStepContent(item);
    if (!hasDisplayContent) return null;
    if (item.role === "defense") return "reaction";
    if (item.role === "movement" || item.role === "preparation") return "preparation";
    if (
      item.role === "attack" ||
      item.mode === "note"
    ) {
      return "action";
    }
    return null;
  }

  function getReadConnectorRole(item) {
    if (!item || typeof item !== "object") return null;
    if (item.role === "attack") return "attack";
    if (item.role === "defense") return "response";
    return null;
  }

  function isAttackResponsePair(leftRole, rightRole) {
    return (
      (leftRole === "attack" && rightRole === "response") ||
      (leftRole === "response" && rightRole === "attack")
    );
  }

  function buildConnectorLinks(connectorRoles = []) {
    const links = [];
    for (let fromIndex = 0; fromIndex < connectorRoles.length; fromIndex += 1) {
      for (
        let toIndex = fromIndex + 1;
        toIndex < connectorRoles.length;
        toIndex += 1
      ) {
        const fromRole = connectorRoles[fromIndex];
        const toRole = connectorRoles[toIndex];
        if (!isAttackResponsePair(fromRole, toRole)) continue;
        links.push({
          fromIndex,
          toIndex,
          span: toIndex - fromIndex,
        });
      }
    }
    return links;
  }

  function getEditCardType(item) {
    if (!item || typeof item !== "object") return null;
    if (!hasPerformerStepContent(item)) return null;
    if (item.role === "attack") return "action";
    if (item.role === "movement" || item.role === "preparation") return "preparation";
    if (item.role === "defense") return "reaction";
    if (item.role === "none" && item.note) return "neutral";
    return null;
  }

  function getEditConnectorRole(item) {
    if (!item || typeof item !== "object") return null;
    if (item.role === "attack") return "attack";
    if (item.role === "defense") return "response";
    return null;
  }

  function renderReadingHeader({
    title,
    subtitle,
    subtitleNode,
    showStepInsert = false,
    showStepDelete = false,
    centerControls = null,
    disableStepActions = false,
  }) {
    return (
      <div className="phrase-reading-header">
        <div>
          <div className="kicker">{title}</div>
          {subtitleNode ? (
            <div className="phrase-name-editor">{subtitleNode}</div>
          ) : subtitle ? (
            <div className="text-strong">{subtitle}</div>
          ) : null}
        </div>
        {centerControls ? (
          <div className="phrase-reading-center">{centerControls}</div>
        ) : null}
        {!readOnly && (showStepInsert || showStepDelete) ? (
          <div className="phrase-reading-actions">
            {showStepInsert ? (
              <button
                type="button"
                className={`button-icon button-secondary phrase-mode-button ${
                  insertionMode ? "is-active" : ""
                }`}
                onClick={onToggleInsertionMode}
                disabled={disableStepActions}
                aria-label={
                  insertionMode
                    ? "Quitter le mode insertion"
                    : "Insérer une passe"
                }
                title={
                  insertionMode ? "Quitter l'insertion" : "Insérer une passe"
                }
              >
                <FaPlus />
              </button>
            ) : null}
            {showStepDelete ? (
              <button
                type="button"
                className={`button-icon button-danger phrase-mode-button ${
                  deletionMode ? "is-active" : ""
                }`}
                onClick={onToggleDeletionMode}
                disabled={disableStepActions}
                aria-label={
                  deletionMode
                    ? "Quitter le mode suppression"
                    : "Supprimer une passe"
                }
                title={
                  deletionMode
                    ? "Quitter la suppression"
                    : "Supprimer une passe"
                }
              >
                <FaTrash />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderPerformerCell({
    item,
    stepId,
    stepIndex,
    performerIndex,
  }) {
    const hasDisplayContent = hasPerformerStepContent(item);
    const role = item.role;
    const hasCard =
      hasDisplayContent &&
      (role === "attack" ||
        role === "defense" ||
        role === "movement" ||
        role === "preparation" ||
        (role === "none" && item.note));

    if (role === "attack" && hasDisplayContent) {
      return (
        <StepSummaryCard
          type="action"
          item={item}
          resolveTermLabel={resolveTermLabel}
          inactiveLabel="inactif"
          onEdit={() => onEditCard(stepId, performerIndex, item)}
          onLongPress={() => onEditCard(stepId, performerIndex, item)}
          editLabel={`Modifier la passe ${stepIndex + 1}`}
          disabled={readOnly}
        />
      );
    }

    if ((role === "movement" || role === "preparation") && hasDisplayContent) {
      return (
        <StepSummaryCard
          type="preparation"
          item={item}
          resolveTermLabel={resolveTermLabel}
          inactiveLabel="inactif"
          onEdit={() => onEditCard(stepId, performerIndex, item)}
          onLongPress={() => onEditCard(stepId, performerIndex, item)}
          editLabel={`Modifier la passe ${stepIndex + 1}`}
          disabled={readOnly}
        />
      );
    }

    if (role === "defense" && hasDisplayContent) {
      return (
        <StepSummaryCard
          type="reaction"
          item={item}
          resolveTermLabel={resolveTermLabel}
          inactiveLabel="inactif"
          onEdit={() => onEditCard(stepId, performerIndex, item)}
          onLongPress={() => onEditCard(stepId, performerIndex, item)}
          editLabel={`Modifier la passe ${stepIndex + 1}`}
          disabled={readOnly}
        />
      );
    }

    if (role === "none" && item.note && hasDisplayContent) {
      return (
        <StepCard
          type="neutral"
          lines={[item.note]}
          onEdit={() => onEditCard(stepId, performerIndex, item)}
          onLongPress={() => onEditCard(stepId, performerIndex, item)}
          editLabel={`Modifier la passe ${stepIndex + 1}`}
          disabled={readOnly}
        />
      );
    }

    if (!hasCard) {
      return (
        <button
          type="button"
          className="card-mini-plus-button"
          onClick={() =>
            onEditCard(stepId, performerIndex, {
              ...emptyPerformerState(),
              mode: "combat",
              role: "attack",
              noteOverrides: false,
            })
          }
          disabled={readOnly}
          aria-label={`Ajouter une action pour ${performerLabels[performerIndex]}`}
          title="Ajouter"
        >
          <span className="card-mini-plus">
            <FaPlus />
          </span>
        </button>
      );
    }

    return null;
  }

  if (readOnly) {
    if (sequences.length === 0) {
      return (
        <div className="empty">
          <div className="text-strong">Aucune phrase.</div>
          <div className="text-sm text-muted">
            Crée une phrase pour commencer.
          </div>
        </div>
      );
    }

    return (
      <div className="stack-4 combat-reading-readonly">
        {sequences.map((sequence, sequenceIndex) => {
          const visiblePerformerIndexes = getSequenceVisibleIndexes(sequence);
          const showIndexColumn = visiblePerformerIndexes.length > 1;
          return (
            <div key={sequence.id} className="phrase-block">
              <div className="panel-header">
                <div>
                  <h3 className="subtitle">
                    {resolveSequenceName(sequence?.name, sequenceIndex)}
                  </h3>
                  <p className="meta text-muted">
                    {sequence.steps?.length ?? 0} étape
                    {(sequence.steps?.length ?? 0) > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {renderSequenceVisibilityControls(sequence)}
              <div className="phrase--reading stack-3">
                <div
                  className={`phrase-header cols-index-${visiblePerformerIndexes.length} index-wide ${
                    !showIndexColumn ? "index-hidden" : ""
                  }`}
                >
                  {showIndexColumn ? (
                    <div className="phrase-index phrase-index--header">#</div>
                  ) : null}
                  {visiblePerformerIndexes.map((performerIndex) => (
                    <div key={performerIndex} className="phrase-name">
                      {labelForPerformer(
                        performers[performerIndex],
                        performerIndex,
                      )}
                    </div>
                  ))}
                </div>
                <div className="stack-2">
                  {sequence.steps?.length ? (
                    sequence.steps.map((step, index) => {
                      const visibleStepPerformers = visiblePerformerIndexes.map(
                        (performerIndex) =>
                          step?.performers?.[performerIndex] ??
                          emptyPerformerState(),
                      );
                      const stepCardTypes = visibleStepPerformers.map(
                        getReadCardType,
                      );
                      const stepConnectorRoles = visibleStepPerformers.map(
                        (item, performerIndex) =>
                          stepCardTypes[performerIndex]
                            ? getReadConnectorRole(item)
                            : null,
                      );
                      const connectorLinks = buildConnectorLinks(
                        stepConnectorRoles,
                      );

                      return (
                        <div
                          key={step.id}
                          className={`phrase-grid-row cols-index-${visiblePerformerIndexes.length} index-wide ${
                            !showIndexColumn ? "index-hidden" : ""
                          }`}
                        >
                          {showIndexColumn ? (
                            <div className="phrase-index">
                              <div className="phrase-index-number">
                                {index + 1}
                              </div>
                            </div>
                          ) : null}
                          {visibleStepPerformers.map((item, colIndex) => {
                            const cardType = stepCardTypes[colIndex];
                            const incomingLinks = connectorLinks.filter(
                              (link) => link.toIndex === colIndex,
                            );
                            const outgoingLinks = connectorLinks.filter(
                              (link) => link.fromIndex === colIndex,
                            );
                            const hasPrevLink = incomingLinks.length > 0;
                            const hasNextLink = outgoingLinks.length > 0;
                            const showLeftColumnDot =
                              Boolean(cardType) && hasNextLink;
                            const showRightColumnDot =
                              Boolean(cardType) && hasPrevLink;
                            const isDefenseMarker = cardType === "reaction";
                            return (
                              <div
                                key={`${step.id}-${colIndex}`}
                                className="phrase-cell"
                              >
                                {!showIndexColumn ? (
                                  <div className="phrase-step-number-inline">
                                    {index + 1}
                                  </div>
                                ) : null}
                                {cardType ? (
                                  <div className="phrase-cell-card-wrap">
                                    <StepSummaryCard
                                      type={cardType}
                                      item={item}
                                      resolveTermLabel={resolveTermLabel}
                                    />
                                    {showRightColumnDot ? (
                                      <span
                                        className={`phrase-cell-left-dot ${
                                          isDefenseMarker
                                            ? "is-defense-marker"
                                            : ""
                                        }`}
                                        aria-hidden="true"
                                      >
                                        {isDefenseMarker ? ">" : ""}
                                      </span>
                                    ) : null}
                                    {showLeftColumnDot ? (
                                      <>
                                        {outgoingLinks.map((link, linkIndex) => {
                                          const offset =
                                            (linkIndex -
                                              (outgoingLinks.length - 1) / 2) *
                                            3;
                                          return (
                                            <span
                                              key={`${step.id}-${colIndex}-link-${link.toIndex}`}
                                              className={`phrase-cell-link-line span-${link.span}`}
                                              style={{
                                                "--link-offset": `${offset}px`,
                                              }}
                                              aria-hidden="true"
                                            />
                                          );
                                        })}
                                        <span
                                          className={`phrase-cell-right-dot ${
                                            isDefenseMarker
                                              ? "is-defense-marker"
                                              : ""
                                          }`}
                                          aria-hidden="true"
                                        >
                                          {isDefenseMarker ? "<" : ""}
                                        </span>
                                      </>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty">Aucune étape.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (!activeSequence) {
    return (
      <div className="stack-3">
        {renderReadingHeader({
          title: "Lecture par cartes",
          subtitle: "Sélectionne une phrase pour commencer.",
        })}
        <div className="empty">
          <div className="text-strong">Sélectionne une phrase.</div>
          <div className="text-sm text-muted">
            Choisis une phrase dans la liste ou crée-en une nouvelle.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phrase--reading stack-3">
      {renderReadingHeader({
        title: "Phrase active",
        subtitleNode: (
          <>
            <input
              className="input"
              value={sequenceDraft}
              onChange={(event) => setSequenceDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const nextName = sequenceDraft.trim();
                  if (nextName && nextName !== sequenceName) {
                    onRenameSequence?.(activeSequence.id, nextName);
                  }
                }
              }}
              aria-label="Nom de la phrase"
            />
            {sequenceDraft.trim() !== sequenceName ? (
              <button
                type="button"
                className="button-icon button-secondary"
                onClick={() =>
                  onRenameSequence?.(activeSequence.id, sequenceDraft.trim())
                }
                aria-label="Valider le nom de la phrase"
                title="Valider"
              >
                <FaCheck />
              </button>
            ) : null}
          </>
        ),
        showStepInsert: true,
        showStepDelete: true,
        disableStepActions: !hasSteps,
        centerControls:
          !readOnly && hasMultipleSequences ? (
            <div className="phrase-reading-nav">
              <button
                type="button"
                className="button-icon button-secondary"
                onClick={() =>
                  hasPreviousSequence &&
                  onSelectSequence?.(sequences[activeSequenceIndex - 1]?.id)
                }
                disabled={!hasPreviousSequence}
                aria-label="Phrase précédente"
                title="Phrase précédente"
              >
                <FaChevronLeft />
              </button>
              <button
                type="button"
                className="button-icon button-secondary"
                onClick={() =>
                  hasNextSequence &&
                  onSelectSequence?.(sequences[activeSequenceIndex + 1]?.id)
                }
                disabled={!hasNextSequence}
                aria-label="Phrase suivante"
                title="Phrase suivante"
              >
                <FaChevronRight />
              </button>
            </div>
          ) : null,
      })}
      {renderSequenceVisibilityControls(activeSequence)}
      {hasSteps ? (
        <div
          className={`phrase-header cols-index-${activeVisiblePerformerIndexes.length} index-compact ${
            !showActiveIndexColumn ? "index-hidden" : ""
          }`}
        >
          {showActiveIndexColumn ? (
            <div className="phrase-index phrase-index--header" />
          ) : null}
          {activeVisiblePerformerIndexes.map((performerIndex) => (
            <div key={performerIndex} className="phrase-name">
              {performerLabels[performerIndex] ??
                labelForPerformer(performers[performerIndex], performerIndex)}
            </div>
          ))}
        </div>
      ) : null}
      <div className="stack-2">
        {!hasSteps ? (
          <div className="empty empty-centered">
            <div>Aucune passe ajoutée</div>
          </div>
        ) : (
          <>
            {insertionMode ? (
              <div
                className={`phrase-insert-row cols-index-${activeVisiblePerformerIndexes.length} index-compact`}
              >
                <div className="phrase-insert-cell">
                  <button
                    type="button"
                    className="button-icon button-ghost phrase-insert-arrow"
                    onClick={() => onInsertEmptyStep?.(0)}
                    disabled={readOnly}
                    aria-label="Insérer une passe au début"
                    title="Insérer au début"
                  >
                    <FaArrowDown />
                  </button>
                </div>
              </div>
            ) : null}
            {activeSequence.steps.map((step, index) => (
              <div
                key={step.id}
                className={`stack-2 phrase-row ${
                  deletionMode && !insertionMode ? "is-deleting" : ""
                }`}
              >
                <div
                  className={`phrase-grid-row cols-index-${activeVisiblePerformerIndexes.length} index-compact ${
                    !showActiveIndexColumn ? "index-hidden" : ""
                  }`}
                >
                  {showActiveIndexColumn ? (
                    <div className="phrase-index">
                      <div className="phrase-index-number">{index + 1}</div>
                    </div>
                  ) : null}
                  {(() => {
                    const visibleStepPerformers = activeVisiblePerformerIndexes.map(
                      (performerIndex) =>
                        step?.performers?.[performerIndex] ??
                        emptyPerformerState(),
                    );
                    const editCardTypes = visibleStepPerformers.map(
                      getEditCardType,
                    );
                    const editConnectorRoles = visibleStepPerformers.map(
                      (item, performerIndex) =>
                        editCardTypes[performerIndex]
                          ? getEditConnectorRole(item)
                          : null,
                    );
                    const connectorLinks = buildConnectorLinks(editConnectorRoles);

                    return visibleStepPerformers.map((item, colIndex) => {
                      const performerIndex =
                        activeVisiblePerformerIndexes[colIndex];
                      const incomingLinks = connectorLinks.filter(
                        (link) => link.toIndex === colIndex,
                      );
                      const outgoingLinks = connectorLinks.filter(
                        (link) => link.fromIndex === colIndex,
                      );
                      const hasPrevLink = incomingLinks.length > 0;
                      const hasNextLink = outgoingLinks.length > 0;
                      const showLeftColumnDot = hasNextLink;
                      const showRightColumnDot = hasPrevLink;
                      const isDefenseMarker = item.role === "defense";

                      return (
                        <div
                          key={`${step.id}-${performerIndex}`}
                          className="phrase-cell"
                        >
                          {!showActiveIndexColumn ? (
                            <div className="phrase-step-number-inline">
                              {index + 1}
                            </div>
                          ) : null}
                          <div className="phrase-cell-card-wrap">
                            {renderPerformerCell({
                              item,
                              stepId: step.id,
                              stepIndex: index,
                              performerIndex,
                            })}
                            {showRightColumnDot ? (
                              <span
                                className={`phrase-cell-left-dot ${
                                  isDefenseMarker ? "is-defense-marker" : ""
                                }`}
                                aria-hidden="true"
                              >
                                {isDefenseMarker ? ">" : ""}
                              </span>
                            ) : null}
                            {showLeftColumnDot ? (
                              <>
                                {outgoingLinks.map((link, linkIndex) => {
                                  const offset =
                                    (linkIndex - (outgoingLinks.length - 1) / 2) * 3;
                                  return (
                                    <span
                                      key={`${step.id}-${colIndex}-edit-link-${link.toIndex}`}
                                      className={`phrase-cell-link-line span-${link.span}`}
                                      style={{ "--link-offset": `${offset}px` }}
                                      aria-hidden="true"
                                    />
                                  );
                                })}
                                <span
                                  className={`phrase-cell-right-dot ${
                                    isDefenseMarker ? "is-defense-marker" : ""
                                  }`}
                                  aria-hidden="true"
                                >
                                  {isDefenseMarker ? "<" : ""}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                {deletionMode && !insertionMode ? (
                  <button
                    type="button"
                    className="button-icon button-danger phrase-delete-button"
                    onClick={() => onDeleteStep?.(step.id)}
                    disabled={readOnly}
                    aria-label={`Supprimer la passe ${index + 1}`}
                    title="Supprimer"
                  >
                    <FaTrash />
                  </button>
                ) : null}
                {insertionMode ? (
                  <div
                    className={`phrase-insert-row cols-index-${activeVisiblePerformerIndexes.length} index-compact`}
                  >
                    <div className="phrase-insert-cell">
                      <button
                        type="button"
                        className="button-icon button-ghost phrase-insert-arrow"
                        onClick={() => onInsertEmptyStep?.(index + 1)}
                        disabled={readOnly}
                        aria-label={`Insérer une passe après ${index + 1}`}
                        title="Insérer ici"
                      >
                        <FaArrowDown />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
