import CombatReading from "./CombatReading.jsx";

export default function CombatRightPanels({
  mode = "edit",
  readingProps,
  stepForm,
  nextStepIndex,
  phraseIndex,
}) {
  const isReadMode = mode === "read";

  return (
    <>
      <details className="fold" open>
        <summary className="fold-kicker">
          <span className="kicker">Lecture par cartes</span>
        </summary>
        <CombatReading mode={mode} {...readingProps} />
      </details>
      {!isReadMode ? (
        <details className="fold" open>
          <summary className="panel-header fold-kicker">
            <div className="header-with-badge">
              <div className="kicker">
                Passe{" "}
                <span className="badge">
                  #{nextStepIndex >= 0 ? nextStepIndex + 1 : "—"}
                </span>{" "}
                de la phrase
                <span className="badge">
                  #{phraseIndex >= 0 ? phraseIndex + 1 : "—"}
                </span>
              </div>
            </div>
          </summary>
          {stepForm}
        </details>
      ) : null}
    </>
  );
}
