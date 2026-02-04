import StepCard from "../components/StepCard.jsx";
import { labelForParticipant } from "../lib/participants.js";

export default function PhraseListPage({ combatName, combatDescription, participants, steps, onRemoveStep }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Liste des phrases créées</h2>
          <p className="muted">Phrase en cours, composée des étapes ajoutées.</p>
          <div className="muted" style={{ marginTop: "6px" }}>
            Combat: {combatName || "Combat sans nom"}
          </div>
          {combatDescription ? <div className="muted">{combatDescription}</div> : null}
        </div>
        <span className="muted">{steps.length} étape{steps.length > 1 ? "s" : ""}</span>
      </div>
      <div className="phrase">
        <div className="phrase__header" style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}>
          {participants.map((name, index) => (
            <div key={index} className="phrase__name">
              {labelForParticipant(name, index)}
            </div>
          ))}
        </div>
        <div className="phrase__body">
          {steps.length === 0 ? (
            <div className="empty">Ajoutez une étape pour commencer la phrase.</div>
          ) : (
            steps.map((step, index) => {
              const attackers = step.participants
                .map((item, idx) => ({ ...item, index: idx }))
                .filter((item) => item.role === "attack");
              const defenders = step.participants
                .map((item, idx) => ({ ...item, index: idx }))
                .filter((item) => item.role === "defense");

              return (
                <div
                  key={step.id}
                  className="phrase__row"
                  style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}
                >
                  {step.participants.map((item, colIndex) => {
                    const role = item.role;
                    return (
                      <div key={`${step.id}-${colIndex}`} className="phrase__cell">
                        {role === "attack" ? (
                          <StepCard
                            type="action"
                            title={`Étape ${index + 1}`}
                            accent="accent-attack"
                            lines={item.noteOverrides ? [item.note] : [item.offensive, item.action]}
                            tags={[
                              item.noteOverrides ? null : { label: item.target, variant: "target" },
                              item.noteOverrides ? null : { label: item.attackMove, variant: "move" },
                              item.noteOverrides
                                ? null
                                : { label: item.attackAttribute?.join(", "), variant: "note" },
                              item.noteOverrides ? null : { label: item.note, variant: "note" }
                            ]}
                          />
                        ) : null}
                        {role === "defense" ? (
                          <StepCard
                            type="reaction"
                            title="Réaction"
                            accent="accent-defense"
                            lines={item.noteOverrides ? [item.note] : [item.defense]}
                            tags={[
                              item.noteOverrides ? null : { label: item.paradeNumber, variant: "note" },
                              item.noteOverrides ? null : { label: item.paradeAttribute, variant: "note" },
                              item.noteOverrides ? null : { label: item.defendMove, variant: "move" },
                              item.noteOverrides ? null : { label: item.note, variant: "note" }
                            ]}
                          />
                        ) : null}
                        {role === "none" && item.note ? (
                          <StepCard type="neutral" title="Note" accent="accent-neutral" lines={[item.note]} />
                        ) : null}
                      </div>
                    );
                  })}

                  <div className="arrow-layer">
                    {attackers.flatMap((attacker) =>
                      defenders
                        .filter((defender) => defender.index !== attacker.index)
                        .map((defender) => {
                          const isReverse = defender.index < attacker.index;
                          return (
                            <div
                              key={`${step.id}-${attacker.index}-${defender.index}`}
                              className={`arrow ${isReverse ? "arrow--reverse" : ""}`}
                              style={{
                                left: `calc(${isReverse ? defender.index : attacker.index} * 100% / ${
                                  participants.length
                                } + 16px)`,
                                width: `calc(${Math.max(0, Math.abs(defender.index - attacker.index))} * 100% / ${
                                  participants.length
                                } - 32px)`
                              }}
                            />
                          );
                        })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {steps.length > 0 ? (
        <section className="panel panel--ghost" style={{ marginTop: "20px" }}>
          <h3>Nettoyage</h3>
          <div className="chip-row">
            {steps.map((step, index) => (
              <button key={step.id} className="chip" onClick={() => onRemoveStep(step.id)}>
                Supprimer l'étape {index + 1}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
