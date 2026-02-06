import {
  FaBookOpen,
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

  return (
    <div
      className={rowClass}
      role="button"
      tabIndex={0}
      aria-label={rowLabel}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
    >
      <div className="stack-1">
        <div className="row-top">
          <div className="meta">#{combat.id}</div>
          <div className="text-strong">{combat.name}</div>
          <div className="meta">
            {combat.participantsCount} combattant
            {combat.participantsCount > 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <div className="stack-1">
        <div className="meta">{formatDate(combat.createdAt)}</div>
        <div className="meta">
          {combat.phraseCount} phrase{combat.phraseCount > 1 ? "s" : ""}
        </div>
      </div>
      <div className="align-end">
        <div className="row-actions">
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
      </div>
    </div>
  );
}
