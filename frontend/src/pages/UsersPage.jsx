import { useEffect, useState } from "react";

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
        <span className="muted">{loading ? "Chargement..." : `${logs.length} événements`}</span>
      </div>
      {error ? <div className="lexicon-error">{error}</div> : null}
      <div className="audit-table">
        {logs.map((log) => (
          <div key={log.id} className="audit-row">
            <div className="audit-action">{log.action}</div>
            <div className="audit-meta">{log.actor_email || log.actor_id || "system"}</div>
            <div className="audit-time">{new Date(log.created_at).toLocaleString("fr-FR")}</div>
          </div>
        ))}
        {logs.length === 0 && !loading ? <div className="muted">Aucun événement.</div> : null}
      </div>
    </div>
  );
}

export default function UsersPage({ apiBase, authToken }) {
  const [users, setUsers] = useState([]);
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
    const response = await authFetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role })
    });
    if (!response.ok) {
      setError("Mise à jour impossible.");
      return;
    }
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Utilisateurs</h2>
        <span className="muted">{loading ? "Chargement..." : `${users.length} comptes`}</span>
      </div>
      {error ? <div className="lexicon-error">{error}</div> : null}
      <div className="users-table">
        {users.map((user) => (
          <div key={user.id} className="users-row">
            <div>
              <div className="users-email">
                {user.first_name || user.last_name
                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                  : user.email}
              </div>
              <div className="muted">{user.email}</div>
              <div className="muted">#{user.id}</div>
            </div>
            <div className="users-meta">
              {user.force_reset ? <span className="chip chip--danger">Reset requis</span> : null}
            </div>
            <select value={user.role} onChange={(event) => updateRole(user.id, event.target.value)}>
              <option value="user">Utilisateur</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
        ))}
        {users.length === 0 && !loading ? <div className="muted">Aucun utilisateur.</div> : null}
      </div>
      <AuditPanel apiBase={apiBase} authToken={authToken} />
    </section>
  );
}
