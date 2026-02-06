import StepCard from "../components/StepCard.jsx";
import StepSummaryLine from "../components/StepSummaryLine.jsx";
import { labelForParticipant } from "../lib/participants.js";

export default function PhraseListPage({
  combatName,
  combatDescription,
  participants,
  steps,
  onRemoveStep,
}) {
  function buildInlineLine(item, name) {
    return <StepSummaryLine item={item} name={name} inactiveLabel="inactif" />;
  }
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Liste des phrases créées</h2>
          <p className="muted">
            Phrase en cours, composée des passes ajoutées.
          </p>
          <div className="muted" style={{ marginTop: "6px" }}>
            Combat: {combatName || "Combat sans nom"}
          </div>
          {combatDescription ? (
            <div className="muted">{combatDescription}</div>
          ) : null}
        </div>
        <span className="muted">
          {steps.length} passe{steps.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="phrase">
        <div
          className="phrase__header"
          style={{
            gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))`,
          }}
        >
          {participants.map((name, index) => (
            <div key={index} className="phrase__name">
              {labelForParticipant(name, index)}
            </div>
          ))}
        </div>
        <div className="phrase__body">
          {steps.length === 0 ? (
            <div className="empty">
              Ajoutez une passe pour commencer la phrase.
            </div>
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
                  style={{
                    gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))`,
                  }}
                >
                  {step.participants.map((item, colIndex) => {
                    const role = item.role;
                    return (
                      <div
                        key={`${step.id}-${colIndex}`}
                        className="phrase__cell"
                      >
                        {role === "attack" ? (
                          <StepCard
                            type="action"
                            lines={[
                              buildInlineLine(
                                item,
                                labelForParticipant(
                                  participants[colIndex],
                                  colIndex,
                                ),
                              ),
                            ]}
                            tags={[
                              item.noteOverrides
                                ? null
                                : { label: item.target, variant: "target" },
                              item.noteOverrides
                                ? null
                                : { label: item.attackMove, variant: "move" },
                              item.noteOverrides
                                ? null
                                : {
                                    label: item.attackAttribute?.join(", "),
                                    variant: "note",
                                  },
                              item.noteOverrides
                                ? null
                                : { label: item.note, variant: "note" },
                            ]}
                          />
                        ) : null}
                        {role === "defense" ? (
                          <StepCard
                            type="reaction"
                            lines={[
                              buildInlineLine(
                                item,
                                labelForParticipant(
                                  participants[colIndex],
                                  colIndex,
                                ),
                              ),
                            ]}
                            tags={[
                              item.noteOverrides
                                ? null
                                : { label: "parade", variant: "note" },
                              item.noteOverrides
                                ? null
                                : {
                                    label: [
                                      item.paradeNumber,
                                      item.paradeAttribute,
                                    ]
                                      .filter(Boolean)
                                      .join(" "),
                                    variant: "note",
                                  },
                              item.noteOverrides
                                ? null
                                : { label: item.defendMove, variant: "move" },
                              item.noteOverrides
                                ? null
                                : { label: item.note, variant: "note" },
                            ]}
                          />
                        ) : null}
                        {role === "none" && item.note ? (
                          <StepCard type="neutral" lines={[item.note]} />
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
                                left: isReverse
                                  ? `calc(${defender.index + 1} * 100% / ${participants.length})`
                                  : `calc(${attacker.index + 1} * 100% / ${participants.length})`,
                                width: isReverse
                                  ? `calc(${Math.max(0, attacker.index - defender.index - 1)} * 100% / ${participants.length})`
                                  : `calc(${Math.max(0, defender.index - attacker.index - 1)} * 100% / ${participants.length})`,
                              }}
                            />
                          );
                        }),
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
              <button
                key={step.id}
                className="chip"
                onClick={() => onRemoveStep(step.id)}
              >
                Supprimer la passe {index + 1}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
