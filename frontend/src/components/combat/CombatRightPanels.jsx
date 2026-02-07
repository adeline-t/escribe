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
      <details className="fold" open>
        <summary className="fold-kicker fold-kicker-row">
          <span className="kicker">Lecture par cartes</span>
          {readingProps?.onToggleInsertionMode ? (
            <div className="phrase-mode-actions">
              <button
                type="button"
                className={`button-secondary phrase-insert-toggle ${
                  readingProps?.insertionMode ? "is-active" : ""
                }`}
                onClick={readingProps.onToggleInsertionMode}
                disabled={readingProps?.deletionMode}
              >
                {readingProps?.insertionMode
                  ? "Quitter l'insertion"
                  : "Mode insertion"}
              </button>
              {readingProps?.onToggleDeletionMode ? (
                <button
                  type="button"
                  className={`button-secondary phrase-delete-toggle ${
                    readingProps?.deletionMode ? "is-active" : ""
                  }`}
                  onClick={readingProps.onToggleDeletionMode}
                  disabled={readingProps?.insertionMode}
                >
                  {readingProps?.deletionMode
                    ? "Quitter la suppression"
                    : "Mode suppression"}
                </button>
              ) : null}
            </div>
          ) : null}
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
          </summary>
          <div className="step-form-panel">{stepForm}</div>
        </details>
      ) : null}
    </>
  );
}
