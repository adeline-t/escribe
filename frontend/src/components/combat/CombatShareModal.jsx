export default function CombatShareModal({
  combat,
  shareLoading,
  shareError,
  shareList,
  shareRole,
  shareSelectedUser,
  shareAllUsers,
  shareQuery,
  shareUsers,
  onClose,
  onRequestRemoveShare,
  onRoleChange,
  onSelectedUserChange,
  onAddShare,
  onQueryChange,
  onQuickAddShare,
}) {
  if (!combat) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Partager le combat"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="title mb-2">Partager le combat : {combat.name}</h3>
        {shareLoading ? (
          <div className="meta text-muted">Chargement...</div>
        ) : null}
        {shareError ? (
          <div className="banner banner--error text-sm">{shareError}</div>
        ) : null}

        <div className="stack-2">
          <div className="kicker text-bold text-lg">Partagé avec</div>
          <div className="stack-2">
            {shareList.map((item) => (
              <div key={item.user_id} className="row-card row-grid-2">
                <div>
                  <div className="text-strong">
                    {item.first_name || item.last_name
                      ? `${item.first_name || ""} ${item.last_name || ""}`.trim()
                      : item.email}
                  </div>
                  <div className="meta text-muted">
                    {item.email} ·{" "}
                    {item.role === "write"
                      ? "Lecture + écriture"
                      : "Lecture seule"}
                  </div>
                </div>
                <button
                  type="button"
                  className="chip chip--danger"
                  onClick={() => onRequestRemoveShare(item.user_id)}
                >
                  Retirer
                </button>
              </div>
            ))}
            {shareList.length === 0 && !shareLoading ? (
              <div className="meta text-muted">Aucun partage.</div>
            ) : null}
          </div>
        </div>

        <div className="panel stack-2">
          <div className="kicker text-bold text-lg">Ajouter un partage</div>
          <label>
            Droits
            <select
              value={shareRole}
              onChange={(event) => onRoleChange(event.target.value)}
            >
              <option value="read">Lecture seule</option>
              <option value="write">Lecture + écriture</option>
            </select>
          </label>
          <label>
            Utilisateur
            <select
              value={shareSelectedUser}
              onChange={(event) => onSelectedUserChange(event.target.value)}
            >
              <option value="">Choisir un utilisateur</option>
              {shareAllUsers
                .filter(
                  (user) => !shareList.some((item) => item.user_id === user.id),
                )
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name || user.last_name
                      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                      : user.email}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className="button-primary"
            onClick={() => onAddShare(Number(shareSelectedUser))}
            disabled={!shareSelectedUser}
          >
            Ajouter l'utilisateur
          </button>
          <input
            value={shareQuery}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Rechercher un utilisateur..."
          />
          <div className="chip-row">
            {shareUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className="chip"
                onClick={() => onQuickAddShare(user.id)}
              >
                {user.first_name || user.last_name
                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                  : user.email}
              </button>
            ))}
            {shareQuery && shareUsers.length === 0 ? (
              <div className="meta text-muted">Aucun utilisateur.</div>
            ) : null}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="chip" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
