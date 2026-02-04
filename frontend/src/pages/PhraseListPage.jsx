import StepCard from "../components/StepCard.jsx";
import { labelForParticipant } from "../lib/participants.js";

export default function PhraseListPage({ combatName, combatDescription, participants, steps, onRemoveStep }) {
  function badge(label, variant = "note", key) {
    if (!label) return null;
    return (
      <span key={key || label} className={`tag tag--${variant}`}>
        {label}
      </span>
    );
  }

  function buildInlineLine(item, name) {
    if (item.role === "attack") {
      if (item.noteOverrides) {
        return (
          <span>
            {name} attaque <span className="note-inline">{item.note}</span>
          </span>
        );
      }
      return (
        <span>
          {name} fait une{" "}
          {badge(item.offensive, "offensive", "offensive")}
          {badge(
            [
              item.action,
              item.attackAttribute?.length ? item.attackAttribute.join(", ") : ""
            ]
              .filter(Boolean)
              .join(" "),
            "action",
            "action"
          )}
          {item.target ? <span>sur {badge(item.target, "target", "target")}</span> : null}
          {item.attackMove ? <span> en {badge(item.attackMove, "move", "move")}</span> : null}
          {item.note ? <span> (<span className="note-inline">{item.note}</span>)</span> : null}
        </span>
      );
    }

    if (item.role === "defense") {
      if (item.noteOverrides) {
        return (
          <span>
            {name} défend <span className="note-inline">{item.note}</span>
          </span>
        );
      }
      const paradeLabel = [item.paradeNumber, item.paradeAttribute].filter(Boolean).join(" ");
      return (
        <span>
          {name} défend en {badge("parade", "defensive", "parade")}
          {badge(paradeLabel, "parade-number", "paradeLabel")}
          {item.defendMove ? <span> en {badge(item.defendMove, "move", "move")}</span> : null}
          {item.note ? <span> (<span className="note-inline">{item.note}</span>)</span> : null}
        </span>
      );
    }

    if (item.note) {
      return (
        <span>
          {name} (<span className="note-inline">{item.note}</span>)
        </span>
      );
    }

    return <span>{name} sans rôle</span>;
  }
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
                            lines={[buildInlineLine(item, labelForParticipant(participants[colIndex], colIndex))]}
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
                            lines={[buildInlineLine(item, labelForParticipant(participants[colIndex], colIndex))]}
                            tags={[
                              item.noteOverrides ? null : { label: "parade", variant: "note" },
                              item.noteOverrides
                                ? null
                                : {
                                    label: [item.paradeNumber, item.paradeAttribute].filter(Boolean).join(" "),
                                    variant: "note"
                                  },
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
                                left: isReverse
                                  ? `calc(${defender.index + 1} * 100% / ${participants.length})`
                                  : `calc(${attacker.index + 1} * 100% / ${participants.length})`,
                                width: isReverse
                                  ? `calc(${Math.max(0, attacker.index - defender.index - 1)} * 100% / ${participants.length})`
                                  : `calc(${Math.max(0, defender.index - attacker.index - 1)} * 100% / ${participants.length})`
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
