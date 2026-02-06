import { useEffect, useRef, useState } from "react";
import {
  FaBookOpen,
  FaEllipsis,
  FaFilePdf,
  FaPrint,
  FaShareNodes,
  FaTrash,
  FaUpRightFromSquare,
} from "react-icons/fa6";

export default function CombatRow({
  combat,
  isActive,
  formatDate,
  onOpenCombat,
  onReadCombat,
  onRowOpen,
  onExportCombat,
  onShare,
  onDelete,
  isExporting = false,
}) {
  const rowClass = `row-card row-grid-3 row-card--soft ${isActive ? "is-active" : ""}`;
  const rowLabel = `Ouvrir ${combat.name}`;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  function handleRowClick() {
    if (!onRowOpen) return;
    onRowOpen(combat);
  }

  function handleRowKeyDown(event) {
    if (!onRowOpen) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowOpen(combat);
    }
  }

  function stopRowClick(event) {
    event.stopPropagation();
  }

  function toggleMenu(event) {
    stopRowClick(event);
    setIsMenuOpen((prev) => !prev);
  }

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClick(event) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target)) return;
      setIsMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMenuOpen]);

  return (
    <div
      className={`${rowClass} combat-row`}
      role="button"
      tabIndex={0}
      aria-label={rowLabel}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
    >
      <div className="combat-row-title">
        <div className="meta combat-id">#{combat.id}</div>
        <div className="text-strong">{combat.name}</div>
      </div>
      <div className="combat-row-meta stack-1">
        <div className="meta">
          {combat.participantsCount} combattant
          {combat.participantsCount > 1 ? "s" : ""}
        </div>
        <div className="meta">{formatDate(combat.createdAt)}</div>
        <div className="meta">
          {combat.phraseCount} phrase{combat.phraseCount > 1 ? "s" : ""}
        </div>
      </div>
      <div className="align-end">
        <div className="row-actions desktop-only">
          <button
            type="button"
            className="chip icon-button"
            onClick={(event) => {
              stopRowClick(event);
              onOpenCombat(combat.id, combat.type);
            }}
            aria-label="Ouvrir le combat"
            title="Ouvrir"
          >
            <FaUpRightFromSquare />
          </button>
          <button
            type="button"
            className="chip icon-button"
            onClick={(event) => {
              stopRowClick(event);
              onReadCombat(combat.id);
            }}
            aria-label="Lire le combat"
            title="Lire"
          >
            <FaBookOpen />
          </button>
          <button
            type="button"
            className="chip icon-button"
            onClick={(event) => {
              stopRowClick(event);
              onExportCombat?.(combat);
            }}
            aria-label="Exporter le combat en PDF"
            title="Exporter PDF"
            disabled={isExporting}
          >
            <FaFilePdf />
          </button>
          <button
            type="button"
            className="chip icon-button"
            onClick={(event) => {
              stopRowClick(event);
              onExportCombat?.(combat, { theme: "bw" });
            }}
            aria-label="Exporter le combat en PDF noir et blanc"
            title="Exporter PDF N&B"
            disabled={isExporting}
          >
            <FaPrint />
          </button>
          {combat.isOwner ? (
            <>
              <button
                type="button"
                className="chip icon-button"
                onClick={(event) => {
                  stopRowClick(event);
                  onShare(combat);
                }}
                aria-label="Partager le combat"
                title="Partager"
              >
                <FaShareNodes />
              </button>
              <button
                type="button"
                className="icon-button button-danger"
                onClick={(event) => {
                  stopRowClick(event);
                  onDelete(combat.id);
                }}
                aria-label="Supprimer le combat"
                title="Supprimer"
              >
                <FaTrash />
              </button>
            </>
          ) : null}
        </div>
        <div className="mobile-only">
          <button
            type="button"
            className="chip icon-button"
            onClick={toggleMenu}
            aria-label="Actions"
            title="Actions"
          >
            <FaEllipsis />
          </button>
          {isMenuOpen ? (
            <div
              ref={menuRef}
              className="combat-row-menu"
              role="menu"
            >
              <button
                type="button"
                className="icon-button"
                onClick={(event) => {
                  stopRowClick(event);
                  onOpenCombat(combat.id, combat.type);
                  setIsMenuOpen(false);
                }}
                aria-label="Ouvrir"
                title="Ouvrir"
              >
                <FaUpRightFromSquare />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={(event) => {
                  stopRowClick(event);
                  onReadCombat(combat.id);
                  setIsMenuOpen(false);
                }}
                aria-label="Lire"
                title="Lire"
              >
                <FaBookOpen />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={(event) => {
                  stopRowClick(event);
                  onExportCombat?.(combat);
                  setIsMenuOpen(false);
                }}
                aria-label="Exporter PDF"
                title="Exporter PDF"
                disabled={isExporting}
              >
                <FaFilePdf />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={(event) => {
                  stopRowClick(event);
                  onExportCombat?.(combat, { theme: "bw" });
                  setIsMenuOpen(false);
                }}
                aria-label="Exporter PDF N&B"
                title="Exporter PDF N&B"
                disabled={isExporting}
              >
                <FaPrint />
              </button>
              {combat.isOwner ? (
                <>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={(event) => {
                      stopRowClick(event);
                      onShare(combat);
                      setIsMenuOpen(false);
                    }}
                    aria-label="Partager"
                    title="Partager"
                  >
                    <FaShareNodes />
                  </button>
                  <button
                    type="button"
                    className="icon-button button-danger"
                    onClick={(event) => {
                      stopRowClick(event);
                      onDelete(combat.id);
                      setIsMenuOpen(false);
                    }}
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    <FaTrash />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
