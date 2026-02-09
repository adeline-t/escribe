import { useEffect, useRef, useState } from "react";
import { FaEllipsis, FaPlus } from "react-icons/fa6";
import { resolveSequenceName } from "../../../../shared/sequenceModel.js";

export default function PerformanceSequenceList({
  sequences,
  activeSequenceId,
  onCreateSequence,
  onSelectSequence,
  onMoveSequence,
  onMoveSequenceToIndex,
  onRequestDeleteSequence,
  onRequestRenameSequence,
  mode = "edit",
}) {
  const readOnly = mode === "read";
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  function handleDragStart(event, sequenceId) {
    if (readOnly) return;
    event.dataTransfer.setData("text/plain", sequenceId);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(event, targetIndex) {
    if (readOnly) return;
    event.preventDefault();
    const sequenceId = event.dataTransfer.getData("text/plain");
    if (!sequenceId) return;
    onMoveSequenceToIndex(sequenceId, targetIndex);
  }

  function handleDragOver(event) {
    if (readOnly) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function toggleMenu(sequenceId) {
    setOpenMenuId((prev) => (prev === sequenceId ? null : sequenceId));
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
            onClick={onCreateSequence}
            aria-label="Ajouter une phrase"
            title="Ajouter une phrase"
          >
            <FaPlus />
          </button>
        </div>
      ) : null}
      <div className="stack-2">
        {sequences.length === 0 ? (
          <div className="empty">
            <div className="text-strong">Aucune phrase.</div>
            <div className="text-sm text-muted">
              {readOnly
                ? "Aucune phrase disponible."
                : "Ajoute une phrase pour commencer."}
            </div>
          </div>
        ) : (
          sequences.map((sequence, index) => {
            const sequenceName = resolveSequenceName(sequence?.name, index);
            return (
              <div
                key={sequence.id}
                className={`row-card row-card--soft row-grid-2 ${sequence.id === activeSequenceId ? "is-active" : ""}`}
                draggable={!readOnly}
                onDragStart={(event) => handleDragStart(event, sequence.id)}
                onDragOver={handleDragOver}
                onClick={() => onSelectSequence(sequence.id)}
                onDrop={(event) => handleDrop(event, index)}
              >
              {readOnly ? (
                <div className="row">
                  <div className="text-strong">{sequenceName}</div>
                  <div className="meta">
                    {sequence.steps?.length ?? 0} passe
                    {(sequence.steps?.length ?? 0) > 1 ? "s" : ""}
                  </div>
                </div>
              ) : (
                <>
                  <div className="row">
                    <div className="text-md">
                      {sequenceName}
                      {" • "}
                      <span className="meta">
                        {sequence.steps.length} passe
                        {sequence.steps.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="button-icon button-secondary"
                      onClick={() => toggleMenu(sequence.id)}
                      aria-label="Actions"
                      title="Actions"
                    >
                      <FaEllipsis />
                    </button>
                    {openMenuId === sequence.id ? (
                      <div className="row-menu" role="menu" ref={menuRef}>
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => {
                            onRequestRenameSequence?.({
                              id: sequence.id,
                              name: sequenceName,
                            });
                            setTimeout(closeMenu, 0);
                          }}
                        >
                          Renommer
                        </button>
                        {sequences.length > 1 ? (
                          <>
                            <button
                              type="button"
                              className="button-ghost"
                              onClick={() => {
                                onMoveSequence(sequence.id, "up");
                                closeMenu();
                              }}
                            >
                              Monter
                            </button>
                            <button
                              type="button"
                              className="button-ghost"
                              onClick={() => {
                                onMoveSequence(sequence.id, "down");
                                closeMenu();
                              }}
                            >
                              Descendre
                            </button>
                            <button
                              type="button"
                              className="button-ghost button-danger"
                              onClick={() => {
                                onRequestDeleteSequence?.({
                                  id: sequence.id,
                                  name: sequenceName,
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
