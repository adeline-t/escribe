import { useEffect, useMemo, useState } from "react";
import { FaArrowRotateLeft, FaEye, FaEyeSlash } from "react-icons/fa6";

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
        <h3 className="subtitle">Journal d'audit</h3>
        <span className="meta text-muted">
          {loading ? "Chargement..." : `${logs.length} événements`}
        </span>
      </div>
      {error ? (
        <div className="banner banner--error text-sm">{error}</div>
      ) : null}
      <div className="audit-table">
        {logs.map((log) => (
          <div key={log.id} className="audit-row">
            <div className="text-strong">{log.action}</div>
            <div className="meta">
              {log.actor_email || log.actor_id || "system"}
            </div>
            <div className="meta">
              {new Date(log.created_at).toLocaleString("fr-FR")}
            </div>
          </div>
        ))}
        {logs.length === 0 && !loading ? (
          <div className="meta text-muted">Aucun événement.</div>
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
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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

  const normalizedQuery = useMemo(() => {
    const text = query.trim();
    if (!text) return "";
    return text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  }, [query]);

  const filteredUsers = useMemo(() => {
    const matchesQuery = (value) => {
      if (!normalizedQuery) return true;
      return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .includes(normalizedQuery);
    };

    const matchesRole = (role) => {
      if (roleFilter === "all") return true;
      if (roleFilter === "admins")
        return role === "admin" || role === "superadmin";
      return role === roleFilter;
    };

    return users.filter((user) => {
      if (!matchesRole(user.role)) return false;
      if (!normalizedQuery) return true;

      const firstName = user.first_name || "";
      const lastName = user.last_name || "";
      const email = user.email || "";
      const fullName = `${firstName} ${lastName}`.trim();

      return matchesQuery(fullName) || matchesQuery(email);
    });
  }, [users, normalizedQuery, roleFilter]);

  function resetFilters() {
    setQuery("");
    setRoleFilter("all");
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="title">Utilisateurs</h2>
        <span className="meta text-muted">
          {loading
            ? "Chargement..."
            : `${filteredUsers.length} / ${users.length} comptes`}
        </span>
      </div>
      {error ? (
        <div className="banner banner--error text-sm">{error}</div>
      ) : null}
      <div className="row-between">
        <div className="row-actions row-actions--end">
          <input
            value={query}
            placeholder="Cherche un utilisateur..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="segmented segmented--ghost segmented--compact">
            <button
              type="button"
              className={`segmented-button ${roleFilter === "all" ? "is-active" : ""}`}
              onClick={() => setRoleFilter("all")}
            >
              Tous
            </button>
            <button
              type="button"
              className={`segmented-button ${roleFilter === "admin" ? "is-active" : ""}`}
              onClick={() => setRoleFilter("admin")}
            >
              Admin
            </button>
            <button
              type="button"
              className={`segmented-button ${roleFilter === "superadmin" ? "is-active" : ""}`}
              onClick={() => setRoleFilter("superadmin")}
            >
              Super
            </button>
            <button
              type="button"
              className={`segmented-button ${roleFilter === "user" ? "is-active" : ""}`}
              onClick={() => setRoleFilter("user")}
            >
              Util.
            </button>
          </div>
          <button
            type="button"
            className="chip icon-button"
            onClick={resetFilters}
            aria-label="Réinitialiser les filtres"
            title="Réinitialiser les filtres"
          >
            <FaArrowRotateLeft />
          </button>
        </div>
      </div>
      <div className="users-table">
        {filteredUsers.map((user) => (
          <div key={user.id} className="users-row">
            <div className="users-row-group">
              <div className="kicker">#{user.id}</div>
              <div className="users-email">
                {user.first_name || user.last_name
                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                  : user.email}
              </div>
              <div className="meta text-muted">{user.email}</div>
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
                  <div className="meta text-muted">{roleStatus[user.id]}</div>
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
        {filteredUsers.length === 0 && !loading ? (
          <div className="meta text-muted">Aucun utilisateur.</div>
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
            <h3 className="subtitle">Réinitialiser le mot de passe</h3>
            <p className="meta text-muted">{resetUser.email}</p>
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
              <div className="banner banner--error text-sm">{resetError}</div>
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
