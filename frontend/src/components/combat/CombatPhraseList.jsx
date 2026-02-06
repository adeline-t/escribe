import { FaPlus } from "react-icons/fa6";

export default function CombatPhraseList({
  phrases,
  activePhraseId,
  onCreatePhrase,
  onSelectPhrase,
  onMovePhrase,
  onMovePhraseToIndex,
  onRequestDeletePhrase,
  mode = "edit",
}) {
  const readOnly = mode === "read";

  function handleDragStart(event, phraseId) {
    if (readOnly) return;
    event.dataTransfer.setData("text/plain", phraseId);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(event, targetIndex) {
    if (readOnly) return;
    event.preventDefault();
    const phraseId = event.dataTransfer.getData("text/plain");
    if (!phraseId) return;
    onMovePhraseToIndex(phraseId, targetIndex);
  }

  function handleDragOver(event) {
    if (readOnly) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  return (
    <>
      {!readOnly ? (
        <summary className="header-with-badge header-with-badge--space fold-kicker">
          <span className="kicker">Phrases d'armes</span>
          <button
            type="button"
            className="button-small"
            onClick={onCreatePhrase}
          >
            <FaPlus />
          </button>
        </summary>
      ) : null}
      <div className="stack-2">
        {phrases.length === 0 ? (
          <div className="empty">
            <div className="text-strong">Aucune phrase.</div>
            <div className="text-sm text-muted">
              {readOnly
                ? "Aucune phrase disponible."
                : "Ajoute une phrase pour commencer."}
            </div>
          </div>
        ) : (
          phrases.map((phrase, index) => (
            <div
              key={phrase.id}
              className={`row-card row-card--soft row-grid-2 ${phrase.id === activePhraseId ? "is-active" : ""}`}
              draggable={!readOnly}
              onDragStart={(event) => handleDragStart(event, phrase.id)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, index)}
            >
              {readOnly ? (
                <div className="row-top">
                  <div className="text-strong">
                    {phrase.name?.trim() || `Phrase ${index + 1}`}
                  </div>
                  <div className="meta">
                    {phrase.steps?.length ?? 0} passe
                    {(phrase.steps?.length ?? 0) > 1 ? "s" : ""}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="chip chip--ghost chip--plain button-block align-left-center"
                    onClick={() => onSelectPhrase(phrase.id)}
                  >
                    <div className="text-strong">
                      {phrase.name?.trim() || `Phrase ${index + 1}`} •
                      <span className="meta">
                        {phrase.steps.length} passe
                        {phrase.steps.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="chip"
                      onClick={() => onMovePhrase(phrase.id, "up")}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => onMovePhrase(phrase.id, "down")}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="chip chip--danger"
                      onClick={() =>
                        onRequestDeletePhrase({
                          id: phrase.id,
                          name: phrase.name?.trim() || `Phrase ${index + 1}`,
                        })
                      }
                    >
                      Suppr.
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
