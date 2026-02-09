import { useEffect, useRef, useState } from "react";
import { FaEllipsis, FaPen, FaPlus } from "react-icons/fa6";
import { resolvePhraseName } from "../../../../shared/phraseModel.js";

export default function CombatPhraseList({
  phrases,
  activePhraseId,
  onCreatePhrase,
  onSelectPhrase,
  onMovePhrase,
  onMovePhraseToIndex,
  onRequestDeletePhrase,
  onRequestRenamePhrase,
  mode = "edit",
}) {
  const readOnly = mode === "read";
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

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

  function toggleMenu(phraseId) {
    setOpenMenuId((prev) => (prev === phraseId ? null : phraseId));
  }

  function closeMenu() {
    setOpenMenuId(null);
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) {
        closeMenu();
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  return (
    <>
      {!readOnly ? (
        <div className="header-with-badge header-with-badge--space fold-kicker">
          <span className="kicker">Phrases d'armes</span>
          <button
            type="button"
            className="button-icon button-secondary"
            onClick={onCreatePhrase}
            aria-label="Ajouter une phrase"
            title="Ajouter une phrase"
          >
            <FaPlus />
          </button>
        </div>
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
          phrases.map((phrase, index) => {
            const phraseName = resolvePhraseName(phrase?.name, index);
            return (
              <div
              key={phrase.id}
              className={`row-card row-card--soft row-grid-2 ${phrase.id === activePhraseId ? "is-active" : ""}`}
              draggable={!readOnly}
              onDragStart={(event) => handleDragStart(event, phrase.id)}
              onDragOver={handleDragOver}
              onClick={() => onSelectPhrase(phrase.id)}
              onDrop={(event) => handleDrop(event, index)}
            >
              {readOnly ? (
                <div className="row">
                  <div className="text-strong">{phraseName}</div>
                  <div className="meta">
                    {phrase.steps?.length ?? 0} passe
                    {(phrase.steps?.length ?? 0) > 1 ? "s" : ""}
                  </div>
                </div>
              ) : (
                <>
                  <div className="row">
                    <div className="text-md">
                      {phraseName}
                      {" • "}
                      <span className="meta">
                        {phrase.steps.length} passe
                        {phrase.steps.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="button-icon button-secondary"
                      onClick={() => toggleMenu(phrase.id)}
                      aria-label="Actions"
                      title="Actions"
                    >
                      <FaEllipsis />
                    </button>
                    {openMenuId === phrase.id ? (
                      <div className="row-menu" role="menu" ref={menuRef}>
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => {
                            onRequestRenamePhrase?.({
                              id: phrase.id,
                              name: phraseName,
                            });
                            setTimeout(closeMenu, 0);
                          }}
                        >
                          Renommer
                        </button>
                        {phrases.length > 1 ? (
                          <>
                            <button
                              type="button"
                              className="button-ghost"
                              onClick={() => {
                                onMovePhrase(phrase.id, "up");
                                closeMenu();
                              }}
                            >
                              Monter
                            </button>
                            <button
                              type="button"
                              className="button-ghost"
                              onClick={() => {
                                onMovePhrase(phrase.id, "down");
                                closeMenu();
                              }}
                            >
                              Descendre
                            </button>
                            <button
                              type="button"
                              className="button-ghost button-danger"
                              onClick={() => {
                                onRequestDeletePhrase({
                                  id: phrase.id,
                                  name: phraseName,
                                });
                                closeMenu();
                              }}
                            >
                              Supprimer
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
