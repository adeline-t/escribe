import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

function AuditPanel({ apiBase, authToken }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function authFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return fetch(`${apiBase}${path}`, { ...options, headers });
  }

  useEffect(() => {
    let isMounted = true;
    async function loadLogs() {
      setLoading(true);
      try {
        const response = await authFetch("/api/admin/audit?limit=100");
        const payload = await response.json().catch(() => ({}));
        if (isMounted) setLogs(payload.logs ?? []);
      } catch (error) {
        setError("Impossible de charger l'audit.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadLogs();
    return () => {
      isMounted = false;
    };
  }, [apiBase, authToken]);

  return (
    <div className="audit-panel">
      <div className="panel-header">
        <h3>Journal d'audit</h3>
        <span className="muted">
          {loading ? "Chargement..." : `${logs.length} événements`}
        </span>
      </div>
      {error ? <div className="lexicon-error">{error}</div> : null}
      <div className="audit-table">
        {logs.map((log) => (
          <div key={log.id} className="audit-row">
            <div className="audit-action">{log.action}</div>
            <div className="audit-meta">
              {log.actor_email || log.actor_id || "system"}
            </div>
            <div className="audit-time">
              {new Date(log.created_at).toLocaleString("fr-FR")}
            </div>
          </div>
        ))}
        {logs.length === 0 && !loading ? (
          <div className="muted">Aucun événement.</div>
        ) : null}
      </div>
    </div>
  );
}

export default function UsersPage({ apiBase, authToken }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roleDrafts, setRoleDrafts] = useState({});
  const [roleStatus, setRoleStatus] = useState({});
  const [resetUser, setResetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetForce, setResetForce] = useState(true);
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  function authFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return fetch(`${apiBase}${path}`, { ...options, headers });
  }

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      setLoading(true);
      try {
        const response = await authFetch("/api/admin/users");
        const payload = await response.json().catch(() => ({}));
        if (isMounted) {
          setUsers(payload.users ?? []);
        }
      } catch (error) {
        setError("Impossible de charger les utilisateurs.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [apiBase, authToken]);

  async function updateRole(userId, role) {
    setError("");
    setRoleStatus((prev) => ({ ...prev, [userId]: "" }));
    const response = await authFetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!response.ok) {
      setError("Mise à jour impossible.");
      return;
    }
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, role } : user)),
    );
    setRoleStatus((prev) => ({ ...prev, [userId]: "Rôle mis à jour." }));
  }

  async function submitReset() {
    if (!resetUser) return;
    setResetError("");
    if (!resetPassword.trim()) {
      setResetError("Entre un mot de passe.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError("Les mots de passe ne correspondent pas.");
      return;
    }
    setResetLoading(true);
    const response = await authFetch("/api/admin/users/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: resetUser.id,
        password: resetPassword,
        forceReset: resetForce,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setResetError(payload?.message || "Réinitialisation impossible.");
      setResetLoading(false);
      return;
    }
    setUsers((prev) =>
      prev.map((user) =>
        user.id === resetUser.id
          ? { ...user, force_reset: resetForce ? 1 : 0 }
          : user,
      ),
    );
    setResetLoading(false);
    setResetUser(null);
    setResetPassword("");
    setResetConfirm("");
    setResetForce(true);
    setShowResetPassword(false);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Utilisateurs</h2>
        <span className="muted">
          {loading ? "Chargement..." : `${users.length} comptes`}
        </span>
      </div>
      {error ? <div className="lexicon-error">{error}</div> : null}
      <div className="users-table">
        {users.map((user) => (
          <div key={user.id} className="users-row">
            <div className="users-row-group">
              <div className="kicker">#{user.id}</div>
              <div className="users-email">
                {user.first_name || user.last_name
                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                  : user.email}
              </div>
              <div className="muted">{user.email}</div>
            </div>
            <div className="users-row-inline">
              <div className="users-role">
                <select
                  value={roleDrafts[user.id] ?? user.role}
                  onChange={(event) =>
                    setRoleDrafts((prev) => ({
                      ...prev,
                      [user.id]: event.target.value,
                    }))
                  }
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
                {roleStatus[user.id] ? (
                  <div className="muted">{roleStatus[user.id]}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="chip"
                disabled={(roleDrafts[user.id] ?? user.role) === user.role}
                onClick={() =>
                  updateRole(user.id, roleDrafts[user.id] ?? user.role)
                }
              >
                Valider
              </button>
            </div>

            <div className="users-row-inline">
              <div className="users-meta">
                {user.force_reset ? (
                  <span className="chip chip--danger">Reset requis</span>
                ) : null}
              </div>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setResetUser(user);
                  setResetPassword("");
                  setResetConfirm("");
                  setResetForce(true);
                  setResetError("");
                  setShowResetPassword(false);
                }}
              >
                Réinitialiser le mot de passe
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && !loading ? (
          <div className="muted">Aucun utilisateur.</div>
        ) : null}
      </div>
      <AuditPanel apiBase={apiBase} authToken={authToken} />

      {resetUser ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setResetUser(null)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Réinitialiser le mot de passe"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Réinitialiser le mot de passe</h3>
            <p className="muted">{resetUser.email}</p>
            <label>
              Nouveau mot de passe
              <div className="password-input">
                <input
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  minLength={12}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowResetPassword((prev) => !prev)}
                  aria-label={
                    showResetPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  title={
                    showResetPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showResetPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>
            <label>
              Confirmer le mot de passe
              <input
                type={showResetPassword ? "text" : "password"}
                value={resetConfirm}
                onChange={(event) => setResetConfirm(event.target.value)}
                minLength={12}
                required
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={resetForce}
                onChange={(event) => setResetForce(event.target.checked)}
              />
              Forcer le changement à la prochaine connexion
            </label>
            {resetError ? (
              <div className="lexicon-error">{resetError}</div>
            ) : null}
            <div className="modal-actions">
              <button
                type="button"
                className="chip"
                onClick={() => setResetUser(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitReset}
                disabled={resetLoading}
              >
                {resetLoading ? "En cours..." : "Réinitialiser"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
