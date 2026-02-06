import {
  FaBookOpen,
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
  onShare,
  onDelete,
}) {
  const rowClass = `row-card row-grid-3 row-card--soft ${isActive ? "is-active" : ""}`;

  return (
    <div className={rowClass}>
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
            onClick={() => onOpenCombat(combat.id, combat.type)}
            aria-label="Ouvrir le combat"
            title="Ouvrir"
          >
            <FaUpRightFromSquare />
          </button>
          <button
            type="button"
            className="chip icon-button"
            onClick={() => onReadCombat(combat.id)}
            aria-label="Lire le combat"
            title="Lire"
          >
            <FaBookOpen />
          </button>
          {combat.isOwner ? (
            <>
              <button
                type="button"
                className="chip icon-button"
                onClick={() => onShare(combat)}
                aria-label="Partager le combat"
                title="Partager"
              >
                <FaShareNodes />
              </button>
              <button
                type="button"
                className="icon-button button-danger"
                onClick={() => onDelete(combat.id)}
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
