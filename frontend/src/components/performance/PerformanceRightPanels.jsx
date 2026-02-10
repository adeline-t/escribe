import PerformanceReading from "./PerformanceReading.jsx";

export default function PerformanceRightPanels({
  mode = "edit",
  readingProps,
  stepForm,
  nextStepIndex,
  sequenceIndex,
  insertStepIndex,
}) {
  const isReadMode = mode === "read";

  return (
    <>
      <div className="fold performance-right-read-panel">
        <div className="fold-kicker fold-kicker-row">
          {readingProps?.onToggleInsertionMode ? null : null}
        </div>
        <PerformanceReading mode={mode} {...readingProps} />
      </div>
      {!isReadMode ? (
        <div className="fold performance-right-form-panel">
          <div className="panel-header fold-kicker">
            <div className="header-with-badge">
              <div
                className={`kicker ${
                  sequenceIndex === 0 && nextStepIndex === 0 ? "kicker-alert" : ""
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
                  #{sequenceIndex >= 0 ? sequenceIndex + 1 : "—"}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`step-form-panel ${sequenceIndex === 0 && nextStepIndex === 0 ? "step-form-panel--accent" : ""}`}
          >
            <div className="step-form-scroll-shell">{stepForm}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
