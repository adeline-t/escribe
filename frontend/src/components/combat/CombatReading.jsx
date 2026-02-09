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
import {
  emptyParticipantState,
  labelForParticipant,
} from "../../lib/participants.js";

export default function CombatReading({
  mode = "edit",
  activePhrase,
  phrases = [],
  participants = [],
  participantLabels = [],
  isReadOnly,
  onEditCard,
  onInsertEmptyStep,
  insertionMode,
  deletionMode,
  onDeleteStep,
  onToggleInsertionMode,
  onToggleDeletionMode,
  onSelectPhrase,
  onRenamePhrase,
}) {
  const readOnly = mode === "read" || isReadOnly;
  const hasActivePhrase = Boolean(activePhrase);
  const activePhraseName = activePhrase?.name?.trim() || "Phrase active";
  const activePhraseIndex = activePhrase
    ? phrases.findIndex((phrase) => phrase.id === activePhrase.id)
    : -1;
  const hasMultiplePhrases = phrases.length > 1;
  const hasPrevPhrase = activePhraseIndex > 0;
  const hasNextPhrase =
    activePhraseIndex >= 0 && activePhraseIndex < phrases.length - 1;
  const hasSteps = Boolean(activePhrase?.steps?.length);
  const phraseName = activePhrase?.name?.trim() || "";
  const [phraseDraft, setPhraseDraft] = useState(activePhrase?.name ?? "");

  useEffect(() => {
    setPhraseDraft(activePhrase?.name ?? "");
  }, [activePhrase?.id, activePhrase?.name]);

  function hasItemDisplayContent(item) {
    if (!item || typeof item !== "object") return false;
    const note = typeof item.note === "string" ? item.note.trim() : "";
    if (item.mode === "note") {
      return Boolean(note);
    }
    if (item.mode === "choregraphie") {
      return Boolean(item.chorePhase || note);
    }
    if (note) return true;
    if (item.role === "attack") {
      const actionDetails = Array.isArray(item.actionDetails)
        ? item.actionDetails
        : [];
      const hasActionDetails = actionDetails.some(
        (detail) => detail?.action || detail?.attribute,
      );
      return Boolean(
        item.offensive ||
          item.action ||
          item.target ||
          item.attackMove ||
          hasActionDetails ||
          (Array.isArray(item.attackAttribute) && item.attackAttribute.length),
      );
    }
    if (item.role === "preparation") {
      const actionDetails = Array.isArray(item.actionDetails)
        ? item.actionDetails
        : [];
      const hasActionDetails = actionDetails.some(
        (detail) => detail?.action || detail?.attribute,
      );
      return Boolean(
        item.action ||
          item.target ||
          hasActionDetails ||
          (Array.isArray(item.attackAttribute) && item.attackAttribute.length),
      );
    }
    if (item.role === "defense") {
      const defenseDetails = Array.isArray(item.defenseDetails)
        ? item.defenseDetails
        : [];
      const hasDefenseDetails = defenseDetails.some(
        (detail) => detail?.defense || detail?.position || detail?.attribute,
      );
      return Boolean(
        item.defense ||
          item.defensive ||
          item.paradeNumber ||
          item.paradeAttribute ||
          item.defendMove ||
          hasDefenseDetails,
      );
    }
    return false;
  }

  function getReadCardType(item) {
    const hasDisplayContent = hasItemDisplayContent(item);
    if (!hasDisplayContent) return null;
    if (item.role === "defense") return "reaction";
    if (item.role === "preparation") return "preparation";
    if (
      item.role === "attack" ||
      item.mode === "choregraphie" ||
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

  function renderParticipantCell({
    item,
    stepId,
    stepIndex,
    participantIndex,
  }) {
    const role = item.role;
    const hasCard =
      role === "attack" ||
      role === "defense" ||
      role === "preparation" ||
      (role === "none" && item.note);

    if (role === "attack") {
      return (
        <StepSummaryCard
          type="action"
          item={item}
          inactiveLabel="inactif"
          onEdit={() => onEditCard(stepId, participantIndex, item)}
          onLongPress={() => onEditCard(stepId, participantIndex, item)}
          editLabel={`Modifier la passe ${stepIndex + 1}`}
          disabled={readOnly}
        />
      );
    }

    if (role === "preparation") {
      return (
        <StepSummaryCard
          type="preparation"
          item={item}
          inactiveLabel="inactif"
          onEdit={() => onEditCard(stepId, participantIndex, item)}
          onLongPress={() => onEditCard(stepId, participantIndex, item)}
          editLabel={`Modifier la passe ${stepIndex + 1}`}
          disabled={readOnly}
        />
      );
    }

    if (role === "defense") {
      return (
        <StepSummaryCard
          type="reaction"
          item={item}
          inactiveLabel="inactif"
          onEdit={() => onEditCard(stepId, participantIndex, item)}
          onLongPress={() => onEditCard(stepId, participantIndex, item)}
          editLabel={`Modifier la passe ${stepIndex + 1}`}
          disabled={readOnly}
        />
      );
    }

    if (role === "none" && item.note) {
      return (
        <StepCard
          type="neutral"
          lines={[item.note]}
          onEdit={() => onEditCard(stepId, participantIndex, item)}
          onLongPress={() => onEditCard(stepId, participantIndex, item)}
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
            onEditCard(stepId, participantIndex, {
              ...emptyParticipantState(),
              ...(item ?? {}),
            })
          }
          disabled={readOnly}
          aria-label={`Ajouter une action pour ${participantLabels[participantIndex]}`}
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
    if (phrases.length === 0) {
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
        {phrases.map((phrase, phraseIndex) => (
          <div key={phrase.id} className="phrase-block">
            <div className="panel-header">
              <div>
                <h3 className="subtitle">
                  {phrase.name || `Phrase ${phraseIndex + 1}`}
                </h3>
                <p className="meta text-muted">
                  {phrase.steps?.length ?? 0} étape
                  {(phrase.steps?.length ?? 0) > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="phrase--reading stack-3">
              <div
                className={`phrase-header cols-index-${participants.length} index-wide ${
                  participants.length === 1 ? "index-hidden" : ""
                }`}
              >
                {participants.length > 1 ? (
                  <div className="phrase-index phrase-index--header">#</div>
                ) : null}
                {participants.map((name, index) => (
                  <div key={index} className="phrase-name">
                    {labelForParticipant(name, index)}
                  </div>
                ))}
              </div>
              <div className="stack-2">
                {phrase.steps?.length ? (
                  phrase.steps.map((step, index) => {
                    const stepCardTypes = step.participants.map(getReadCardType);
                    const stepConnectorRoles = step.participants.map(
                      (item, participantIndex) =>
                        stepCardTypes[participantIndex]
                          ? getReadConnectorRole(item)
                          : null,
                    );
                    const connectorIndices = stepConnectorRoles.reduce(
                      (accumulator, role, participantIndex) => {
                        if (role) accumulator.push(participantIndex);
                        return accumulator;
                      },
                      [],
                    );
                    const connectorLinks = [];
                    for (
                      let pairIndex = 0;
                      pairIndex < connectorIndices.length - 1;
                      pairIndex += 1
                    ) {
                      const fromIndex = connectorIndices[pairIndex];
                      const toIndex = connectorIndices[pairIndex + 1];
                      const fromRole = stepConnectorRoles[fromIndex];
                      const toRole = stepConnectorRoles[toIndex];
                      if (!isAttackResponsePair(fromRole, toRole)) {
                        continue;
                      }
                      connectorLinks.push({
                        fromIndex,
                        toIndex,
                        span: toIndex - fromIndex,
                      });
                    }

                    return (
                      <div
                        key={step.id}
                        className={`phrase-grid-row cols-index-${participants.length} index-wide ${
                          participants.length === 1 ? "index-hidden" : ""
                        }`}
                      >
                        {participants.length > 1 ? (
                          <div className="phrase-index">
                            <div className="phrase-index-number">
                              {index + 1}
                            </div>
                          </div>
                        ) : null}
                        {step.participants.map((item, colIndex) => {
                          const cardType = stepCardTypes[colIndex];
                          const incomingLink = connectorLinks.find(
                            (link) => link.toIndex === colIndex,
                          );
                          const outgoingLink = connectorLinks.find(
                            (link) => link.fromIndex === colIndex,
                          );
                          const hasPrevLink = Boolean(incomingLink);
                          const hasNextLink = Boolean(outgoingLink);
                          const showLeftColumnDot = Boolean(cardType) && hasNextLink;
                          const showRightColumnDot = Boolean(cardType) && hasPrevLink;
                          const isDefenseMarker = cardType === "reaction";
                          const nextLinkSpan = outgoingLink?.span ?? 1;
                          return (
                            <div
                              key={`${step.id}-${colIndex}`}
                              className="phrase-cell"
                            >
                              {participants.length === 1 ? (
                                <div className="phrase-step-number-inline">
                                  {index + 1}
                                </div>
                              ) : null}
                              {cardType ? (
                                <div className="phrase-cell-card-wrap">
                                  <StepSummaryCard type={cardType} item={item} />
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
                                      {hasNextLink ? (
                                        <span
                                          className={`phrase-cell-link-line span-${nextLinkSpan}`}
                                          aria-hidden="true"
                                        />
                                      ) : null}
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
        ))}
      </div>
    );
  }

  if (!activePhrase) {
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
              value={phraseDraft}
              onChange={(event) => setPhraseDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const nextName = phraseDraft.trim();
                  if (nextName && nextName !== phraseName) {
                    onRenamePhrase?.(activePhrase.id, nextName);
                  }
                }
              }}
              aria-label="Nom de la phrase"
            />
            {phraseDraft.trim() !== phraseName ? (
              <button
                type="button"
                className="button-icon button-secondary"
                onClick={() =>
                  onRenamePhrase?.(activePhrase.id, phraseDraft.trim())
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
          !readOnly && hasMultiplePhrases ? (
            <div className="phrase-reading-nav">
              <button
                type="button"
                className="button-icon button-secondary"
                onClick={() =>
                  hasPrevPhrase &&
                  onSelectPhrase?.(phrases[activePhraseIndex - 1]?.id)
                }
                disabled={!hasPrevPhrase}
                aria-label="Phrase précédente"
                title="Phrase précédente"
              >
                <FaChevronLeft />
              </button>
              <button
                type="button"
                className="button-icon button-secondary"
                onClick={() =>
                  hasNextPhrase &&
                  onSelectPhrase?.(phrases[activePhraseIndex + 1]?.id)
                }
                disabled={!hasNextPhrase}
                aria-label="Phrase suivante"
                title="Phrase suivante"
              >
                <FaChevronRight />
              </button>
            </div>
          ) : null,
      })}
      {hasSteps ? (
        <div
          className={`phrase-header cols-index-${participants.length} index-compact ${
            participants.length === 1 ? "index-hidden" : ""
          }`}
        >
          {participants.length > 1 ? (
            <div className="phrase-index phrase-index--header" />
          ) : null}
          {participantLabels.map((name, index) => (
            <div key={index} className="phrase-name">
              {name}
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
                className={`phrase-insert-row cols-index-${participants.length} index-compact`}
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
            {activePhrase.steps.map((step, index) => (
              <div
                key={step.id}
                className={`stack-2 phrase-row ${
                  deletionMode && !insertionMode ? "is-deleting" : ""
                }`}
              >
                <div
                  className={`phrase-grid-row cols-index-${participants.length} index-compact ${
                    participants.length === 1 ? "index-hidden" : ""
                  }`}
                >
                  {participants.length > 1 ? (
                    <div className="phrase-index">
                      <div className="phrase-index-number">{index + 1}</div>
                    </div>
                  ) : null}
                  {step.participants.map((item, colIndex) => {
                    return (
                      <div
                        key={`${step.id}-${colIndex}`}
                        className="phrase-cell"
                      >
                        {participants.length === 1 ? (
                          <div className="phrase-step-number-inline">
                            {index + 1}
                          </div>
                        ) : null}
                        {renderParticipantCell({
                          item,
                          stepId: step.id,
                          stepIndex: index,
                          participantIndex: colIndex,
                        })}
                      </div>
                    );
                  })}
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
                    className={`phrase-insert-row cols-index-${participants.length} index-compact`}
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
