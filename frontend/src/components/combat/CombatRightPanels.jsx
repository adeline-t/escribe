import CombatReading from "./CombatReading.jsx";

export default function CombatRightPanels({
  mode = "edit",
  readingProps,
  stepForm,
  nextStepIndex,
  phraseIndex,
  insertStepIndex,
}) {
  const isReadMode = mode === "read";

  return (
    <>
      <div className="fold">
        <div className="fold-kicker fold-kicker-row">
          {readingProps?.onToggleInsertionMode ? null : null}
        </div>
        <CombatReading mode={mode} {...readingProps} />
      </div>
      {!isReadMode ? (
        <div className="fold">
          <div className="panel-header fold-kicker">
            <div className="header-with-badge">
              <div
                className={`kicker ${
                  phraseIndex === 0 && nextStepIndex === 0 ? "kicker-alert" : ""
                }`}
              >
                Ajout nouvelle passe
              </div>
              <div className="text-sm text-muted">
                Passe{" "}
                <span className="badge">
                  #
                  {insertStepIndex != null
                    ? insertStepIndex + 1
                    : nextStepIndex >= 0
                      ? nextStepIndex + 1
                      : "—"}
                </span>{" "}
                de la phrase
                <span className="badge">
                  #{phraseIndex >= 0 ? phraseIndex + 1 : "—"}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`step-form-panel ${phraseIndex === 0 && nextStepIndex === 0 ? "step-form-panel--accent" : ""}`}
          >
            {stepForm}
          </div>
        </div>
      ) : null}
    </>
  );
}
