import { FaPlus } from "react-icons/fa6";
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
  onResetForm,
  setActiveParticipantIndex,
  isReadOnly,
  onEditCard,
}) {
  if (mode === "read") {
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
      <div className="stack-4">
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
                className={`phrase-header cols-index-${participants.length} index-wide`}
              >
                <div className="phrase-index phrase-index--header">#</div>
                {participants.map((name, index) => (
                  <div key={index} className="phrase-name">
                    {labelForParticipant(name, index)}
                  </div>
                ))}
              </div>
              <div className="stack-2">
                {phrase.steps?.length ? (
                  phrase.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`phrase-grid-row cols-index-${participants.length} index-wide`}
                    >
                      <div className="phrase-index">
                        <div className="phrase-index-number">{index + 1}</div>
                      </div>
                      {step.participants.map((item, colIndex) => {
                        const role = item.role;
                        return (
                          <div
                            key={`${step.id}-${colIndex}`}
                            className="phrase-cell"
                          >
                            {role === "attack" ||
                            item.mode === "choregraphie" ||
                            item.mode === "note" ? (
                              <StepSummaryCard
                                type="action"
                                item={item}
                              />
                            ) : null}
                            {role === "defense" ? (
                              <StepSummaryCard
                                type="reaction"
                                item={item}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))
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
      <div className="empty">
        <div className="text-strong">Sélectionne une phrase.</div>
        <div className="text-sm text-muted">
          Choisis une phrase dans la liste ou crée-en une nouvelle.
        </div>
      </div>
    );
  }

  return (
    <div className="phrase--reading stack-3">
      <div
        className={`phrase-header cols-index-${participants.length} index-compact`}
      >
        <div className="phrase-index phrase-index--header">#</div>
        {participantLabels.map((name, index) => (
          <div key={index} className="phrase-name">
            {name}
          </div>
        ))}
      </div>
      <div className="stack-2">
        {activePhrase.steps.length === 0 ? (
          <div className="empty">
            <div>Ajoutez une passe pour voir la lecture.</div>
            <button
              type="button"
              className="empty-add"
              onClick={() => {
                onResetForm?.();
                setActiveParticipantIndex(0);
              }}
              disabled={isReadOnly}
              aria-label="Ajouter une passe"
              title="Ajouter une passe"
            >
              <span className="empty-add-icon">
                <FaPlus />
              </span>
            </button>
          </div>
        ) : (
          activePhrase.steps.map((step, index) => (
            <div
              key={step.id}
              className={`phrase-grid-row cols-index-${participants.length} index-compact`}
            >
              <div className="phrase-index">
                <div className="phrase-index-number">{index + 1}</div>
              </div>
              {step.participants.map((item, colIndex) => {
                const role = item.role;
                const hasCard =
                  role === "attack" ||
                  role === "defense" ||
                  (role === "none" && item.note);
                return (
                  <div key={`${step.id}-${colIndex}`} className="phrase-cell">
                    {role === "attack" ? (
                      <StepSummaryCard
                        type="action"
                        item={item}
                        inactiveLabel="inactif"
                        onEdit={() => onEditCard(step.id, colIndex, item)}
                        onLongPress={() => onEditCard(step.id, colIndex, item)}
                        editLabel={`Modifier la passe ${index + 1}`}
                        disabled={isReadOnly}
                      />
                    ) : null}
                    {role === "defense" ? (
                      <StepSummaryCard
                        type="reaction"
                        item={item}
                        inactiveLabel="inactif"
                        onEdit={() => onEditCard(step.id, colIndex, item)}
                        onLongPress={() => onEditCard(step.id, colIndex, item)}
                        editLabel={`Modifier la passe ${index + 1}`}
                        disabled={isReadOnly}
                      />
                    ) : null}
                    {role === "none" && item.note ? (
                      <StepCard
                        type="neutral"
                        lines={[item.note]}
                        onEdit={() => onEditCard(step.id, colIndex, item)}
                        onLongPress={() => onEditCard(step.id, colIndex, item)}
                        editLabel={`Modifier la passe ${index + 1}`}
                        disabled={isReadOnly}
                      />
                    ) : null}
                    {!hasCard ? (
                      <button
                        type="button"
                        className="card-mini-plus-button"
                        onClick={() =>
                          onEditCard(step.id, colIndex, {
                            ...emptyParticipantState(),
                            ...(item ?? {}),
                          })
                        }
                        disabled={isReadOnly}
                        aria-label={`Ajouter une action pour ${participantLabels[colIndex]}`}
                        title="Ajouter"
                      >
                        <span className="card-mini-plus">
                          <FaPlus />
                        </span>
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
