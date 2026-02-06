import StepCard from "../components/StepCard.jsx";
import StepSummaryLine from "../components/StepSummaryLine.jsx";
import { labelForParticipant } from "../lib/participants.js";

export default function CombatOverviewPage({
  combatName,
  combatDescription,
  participants,
  phrases,
  onNavigate,
}) {
  function buildInlineLine(item, name) {
    return <StepSummaryLine item={item} name={name} />;
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Lecture du combat</h2>
          <p className="muted">Vue complète en lecture seule.</p>
        </div>
        <button
          type="button"
          className="chip"
          onClick={() => onNavigate?.("combats")}
        >
          Retour à la liste
        </button>
      </div>
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
                    <div className="phrase-row__title">
                      {phrase.name || `Phrase ${index + 1}`}
                    </div>
                    <div className="phrase-row__meta">
                      {phrase.steps?.length ?? 0} étape
                      {(phrase.steps?.length ?? 0) > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
              {phrases.length === 0 ? (
                <div className="empty">Aucune phrase.</div>
              ) : null}
            </div>
          </details>
        </div>
        <div className="option-main">
          <details className="fold" open>
            <summary className="fold-title fold-title--spaced">
              Lecture par cartes
            </summary>
            {phrases.length === 0 ? (
              <div className="lexicon-empty">
                <div className="lexicon-empty__title">Aucune phrase.</div>
                <div className="lexicon-empty__subtitle">
                  Crée une phrase pour commencer.
                </div>
              </div>
            ) : (
              <div className="phrase-stack">
                {phrases.map((phrase, phraseIndex) => (
                  <div key={phrase.id} className="phrase-block">
                    <div className="panel-header">
                      <div>
                        <h3>{phrase.name || `Phrase ${phraseIndex + 1}`}</h3>
                        <p className="muted">
                          {phrase.steps?.length ?? 0} étape
                          {(phrase.steps?.length ?? 0) > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="phrase phrase--reading">
                      <div
                        className="phrase__header"
                        style={{
                          gridTemplateColumns: `72px repeat(${participants.length}, minmax(0, 1fr))`,
                        }}
                      >
                        <div className="phrase__index phrase__index--header">#</div>
                        {participants.map((name, index) => (
                          <div key={index} className="phrase__name">
                            {labelForParticipant(name, index)}
                          </div>
                        ))}
                      </div>
                      <div className="phrase__body">
                        {phrase.steps?.length ? (
                          phrase.steps.map((step, index) => {
                            return (
                              <div
                                key={step.id}
                                className="phrase__row"
                                style={{
                                  gridTemplateColumns: `72px repeat(${participants.length}, minmax(0, 1fr))`,
                                }}
                              >
                                <div className="phrase__index">
                                  <div className="phrase__index-number">{index + 1}</div>
                                </div>
                                {step.participants.map((item, colIndex) => {
                                  const role = item.role;
                                  return (
                                    <div
                                      key={`${step.id}-${colIndex}`}
                                      className="phrase__cell"
                                    >
                                      {role === "attack" ||
                                      item.mode === "choregraphie" ||
                                      item.mode === "note" ? (
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
                                        />
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
            )}
          </details>
        </div>
      </div>
    </section>
  );
}
