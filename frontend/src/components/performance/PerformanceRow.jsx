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

export default function PerformanceRow({
  performance,
  isActive,
  formatDate,
  onOpenPerformance,
  onReadPerformance,
  onRowOpen,
  onExportPerformance,
  onShare,
  onDelete,
  isExporting = false,
}) {
  const rowClass = `row-card row-grid-3 row-card--soft ${isActive ? "is-active" : ""}`;
  const rowLabel = `Ouvrir ${performance.name}`;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const canWrite =
    performance?.isOwner ||
    performance?.shareRole === "write" ||
    performance?.shareRole === "owner";
  const performersCount = Number(performance?.performersCount ?? 0);

  function handleRowClick() {
    if (!onRowOpen) return;
    onRowOpen(performance);
  }

  function handleRowKeyDown(event) {
    if (!onRowOpen) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowOpen(performance);
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
        <div className="meta combat-id">#{performance.id}</div>
        <div className="inline-center">
          <div className="text-strong">{performance.name}</div>
        </div>
      </div>
      <div className="combat-row-meta stack-1">
        <div className="meta">
          {performersCount} combattant
          {performersCount > 1 ? "s" : ""}
        </div>
        <div className="meta">{formatDate(performance.createdAt)}</div>
        <div className="meta">
          {performance.sequenceCount} phrase
          {performance.sequenceCount > 1 ? "s" : ""}
        </div>
      </div>
      <div className="align-end">
        <div className="row-actions desktop-only">
          {canWrite ? (
            <button
              type="button"
              className="chip icon-button"
              onClick={(event) => {
                stopRowClick(event);
                onOpenPerformance(performance.id, performance.type);
              }}
              aria-label="Ouvrir le combat"
              title="Ouvrir"
            >
              <FaUpRightFromSquare />
            </button>
          ) : null}
          <button
            type="button"
            className="chip icon-button"
            onClick={(event) => {
              stopRowClick(event);
              onReadPerformance(performance.id);
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
              onExportPerformance?.(performance);
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
              onExportPerformance?.(performance, { theme: "bw" });
            }}
            aria-label="Exporter le combat en PDF noir et blanc"
            title="Exporter PDF N&B"
            disabled={isExporting}
          >
            <FaPrint />
          </button>
          {performance.isOwner ? (
            <>
              <button
                type="button"
                className="chip icon-button"
                onClick={(event) => {
                  stopRowClick(event);
                  onShare(performance);
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
                  onDelete(performance);
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
            <div ref={menuRef} className="combat-row-menu" role="menu">
              {canWrite ? (
                <button
                  type="button"
                  className="icon-button"
                  onClick={(event) => {
                    stopRowClick(event);
                    onOpenPerformance(performance.id, performance.type);
                    setIsMenuOpen(false);
                  }}
                  aria-label="Ouvrir"
                  title="Ouvrir"
                >
                  <FaUpRightFromSquare />
                </button>
              ) : null}
              <button
                type="button"
                className="icon-button"
                onClick={(event) => {
                  stopRowClick(event);
                  onReadPerformance(performance.id);
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
                  onExportPerformance?.(performance);
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
                  onExportPerformance?.(performance, { theme: "bw" });
                  setIsMenuOpen(false);
                }}
                aria-label="Exporter PDF N&B"
                title="Exporter PDF N&B"
                disabled={isExporting}
              >
                <FaPrint />
              </button>
              {performance.isOwner ? (
                <>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={(event) => {
                      stopRowClick(event);
                      onShare(performance);
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
                      onDelete(performance);
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
