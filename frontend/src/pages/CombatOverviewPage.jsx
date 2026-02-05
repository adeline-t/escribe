import StepCard from "../components/StepCard.jsx";
import { labelForParticipant } from "../lib/participants.js";

export default function CombatOverviewPage({
  combatName,
  combatDescription,
  participants,
  phrases
}) {
  function badge(label, variant = "note", key) {
    if (!label) return null;
    return (
      <span key={key || label} className={`tag tag--${variant}`}>
        {label}
      </span>
    );
  }

  function buildInlineLine(item, name) {
    if (item.mode === "choregraphie") {
      return (
        <span>
          {name} chorégraphie {item.chorePhase ? <span className="note-inline">{item.chorePhase}</span> : ""}
          {item.note ? <span> (<span className="note-inline">{item.note}</span>)</span> : null}
        </span>
      );
    }

    if (item.mode === "note") {
      return (
        <span>
          {name} note <span className="note-inline">{item.note || "à compléter"}</span>
        </span>
      );
    }

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
      <div className="option-grid">
        <div className="option-side">
          <details className="fold" open>
            <summary>Combat</summary>
            <div className="form-grid">
              <label className="span-2">
                Nom du combat
                <input value={combatName} readOnly />
              </label>
              <label className="span-2">
                Description
                <input value={combatDescription} readOnly />
              </label>
            </div>
          </details>
          <details className="fold" open>
            <summary>Combattants</summary>
            <div className="form-grid">
              <label>
                Nombre de combattants
                <input value={participants.length} readOnly />
              </label>
              <div className="names span-2">
                {participants.map((name, index) => (
                  <label key={index}>
                    {`Nom ${index + 1}`}
                    <input value={name?.name ?? name ?? ""} readOnly />
                  </label>
                ))}
              </div>
            </div>
          </details>
          <details className="fold" open>
            <summary>Liste des phrases</summary>
            <div className="phrase-list">
              {phrases.map((phrase, index) => (
                <div key={phrase.id} className="phrase-row">
                  <div>
                    <div className="phrase-row__title">{phrase.name || `Phrase ${index + 1}`}</div>
                    <div className="phrase-row__meta">
                      {phrase.steps?.length ?? 0} étape{(phrase.steps?.length ?? 0) > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
              {phrases.length === 0 ? <div className="empty">Aucune phrase.</div> : null}
            </div>
          </details>
        </div>
        <div className="option-main">
          <details className="fold" open>
            <summary>Lecture par cartes</summary>
            {phrases.length === 0 ? (
              <div className="lexicon-empty">
                <div className="lexicon-empty__title">Aucune phrase.</div>
                <div className="lexicon-empty__subtitle">Crée une phrase pour commencer.</div>
              </div>
            ) : (
              <div className="phrase-stack">
                {phrases.map((phrase, phraseIndex) => (
                  <div key={phrase.id} className="phrase-block">
                    <div className="panel-header">
                      <div>
                        <h3>{phrase.name || `Phrase ${phraseIndex + 1}`}</h3>
                        <p className="muted">{phrase.steps?.length ?? 0} étape{(phrase.steps?.length ?? 0) > 1 ? "s" : ""}</p>
                      </div>
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
                        {phrase.steps?.length ? (
                          phrase.steps.map((step, index) => {
                            const attackers = step.participants
                              .map((item, idx) => ({ ...item, index: idx }))
                              .filter((item) => item.role === "attack");
                            const defenders = step.participants
                              .map((item, idx) => ({ ...item, index: idx }))
                              .filter((item) => item.role === "defense");

                            return (
                              <div key={step.id} className="phrase__row" style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}>
                                {step.participants.map((item, colIndex) => {
                                  const role = item.role;
                                  return (
                                    <div key={`${step.id}-${colIndex}`} className="phrase__cell">
                                      {role === "attack" || item.mode === "choregraphie" || item.mode === "note" ? (
                                        <StepCard
                                          type="action"
                                          title={`Étape ${index + 1}`}
                                          accent="accent-attack"
                                          lines={[buildInlineLine(item, labelForParticipant(participants[colIndex], colIndex))]}
                                        />
                                      ) : null}
                                      {role === "defense" ? (
                                        <StepCard
                                          type="reaction"
                                          title="Réaction"
                                          accent="accent-defense"
                                          lines={[buildInlineLine(item, labelForParticipant(participants[colIndex], colIndex))]}
                                        />
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
                        ) : (
                          <div className="empty">Aucune étape.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </details>
        </div>
      </div>
    </section>
  );
}
