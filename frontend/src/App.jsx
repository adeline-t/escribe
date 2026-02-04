import { useEffect, useMemo, useRef, useState } from "react";
import lexicon from "./data/lexicon.json";
import "./App.css";

const DEFAULT_PARTICIPANTS = ["Portrait", "Fou", "Reflet"];
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
const TOKEN_KEY = "escribe_token";

function normalizeLexicon(data) {
  return {
    offensive: data.offensive ?? [],
    action: data.action ?? [],
    defensive: data.defensive ?? [],
    cible: data.cible ?? [],
    attackMove: data["deplacement-attaque"] ?? data.deplacementAttaque ?? [],
    defendMove: data["deplacement-defense"] ?? data.deplacementDefense ?? [],
    paradeNumber: data["parade-numero"] ?? data.paradeNumero ?? [],
    paradeAttribute: data["parade-attribut"] ?? data.paradeAttribut ?? [],
    attackAttribute: data["attaque-attribut"] ?? data.attaqueAttribut ?? []
  };
}

function buildParticipantLabel(index) {
  return `Combattant ${index + 1}`;
}

function labelForParticipant(name, index) {
  return name && name.trim() ? name : buildParticipantLabel(index);
}

function emptyParticipantState() {
  return {
    role: "none",
    offensive: "",
    action: "",
    target: "",
    attackMove: "",
    attackAttribute: [],
    defense: "",
    paradeNumber: "",
    paradeAttribute: "",
    defendMove: "",
    note: "",
    noteOverrides: false
  };
}

function normalizeParticipant(item) {
  const base = emptyParticipantState();
  const role = ["none", "attack", "defense"].includes(item?.role) ? item.role : base.role;
  return {
    ...base,
    ...item,
    role,
    attackAttribute: Array.isArray(item?.attackAttribute) ? item.attackAttribute : [],
    noteOverrides: Boolean(item?.noteOverrides)
  };
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return null;
  const participants = Array.isArray(raw.participants) && raw.participants.length
    ? raw.participants
    : DEFAULT_PARTICIPANTS;
  const formRaw = Array.isArray(raw.form) ? raw.form : [];
  const form = participants.map((_, index) => normalizeParticipant(formRaw[index] ?? {}));
  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : [];
  const steps = stepsRaw.map((step) => {
    const participantsRaw = Array.isArray(step?.participants) ? step.participants : [];
    return {
      ...step,
      participants: participants.map((_, index) => normalizeParticipant(participantsRaw[index] ?? {}))
    };
  });
  return { participants, form, steps };
}

function StepCard({ type, title, lines, accent, tags }) {
  return (
    <div className={`card-mini ${type}`}>
      <div className="card-mini__title">
        <span className={`dot ${accent}`} />
        {title}
      </div>
      <div className="card-mini__lines">
        {lines.filter(Boolean).map((line) => (
          <div key={line} className="card-mini__line">
            {line}
          </div>
        ))}
      </div>
      {tags?.length ? (
        <div className="card-mini__tags">
          {tags
            .filter((tag) => tag && tag.label)
            .map((tag) => (
              <span key={tag.label} className={`tag tag--${tag.variant || "neutral"}`}>
                {tag.label}
              </span>
            ))}
        </div>
      ) : null}
    </div>
  );
}

function buildSummaryLine(item, name) {
  if (item.role === "attack") {
    if (item.noteOverrides) {
      return item.note ? `${name} attaque: ${item.note}` : `${name} attaque (note à compléter)`;
    }
    const pieces = [
      `${name} attaque`,
      item.offensive,
      item.action,
      item.attackAttribute?.length ? `(${item.attackAttribute.join(", ")})` : "",
      item.target ? `sur ${item.target}` : "",
      item.attackMove ? `en ${item.attackMove}` : "",
      item.note ? `note: ${item.note}` : ""
    ];
    return pieces.filter(Boolean).join(" ");
  }

  if (item.role === "defense") {
    if (item.noteOverrides) {
      return item.note ? `${name} défend: ${item.note}` : `${name} défend (note à compléter)`;
    }
    const paradeBits = [item.paradeNumber, item.paradeAttribute].filter(Boolean).join(" ");
    const pieces = [
      `${name} défend`,
      item.defense,
      paradeBits ? `parade ${paradeBits}` : "",
      item.defendMove ? `en ${item.defendMove}` : "",
      item.note ? `note: ${item.note}` : ""
    ];
    return pieces.filter(Boolean).join(" ");
  }

  if (item.note) {
    return `${name} note: ${item.note}`;
  }

  return `${name} sans rôle`;
}

function toggleAttribute(current, value) {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

const LEXICON_TYPES = [
  { key: "offensive", label: "Offensive" },
  { key: "action", label: "Action d'arme" },
  { key: "attaque-attribut", label: "Attribut attaque" },
  { key: "cible", label: "Cible" },
  { key: "deplacement-attaque", label: "Déplacement attaque" },
  { key: "defensive", label: "Défensive" },
  { key: "parade-numero", label: "Numéro de parade" },
  { key: "parade-attribut", label: "Attribut parade" },
  { key: "deplacement-defense", label: "Déplacement défense" }
];

function LexiconAdmin({ apiBase, authToken, authUser }) {
  const [activeType, setActiveType] = useState(LEXICON_TYPES[0]?.key ?? "");
  const [scope, setScope] = useState("global");
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [error, setError] = useState("");

  const activeLabel = useMemo(
    () => LEXICON_TYPES.find((type) => type.key === activeType)?.label ?? "",
    [activeType]
  );

  function authFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return fetch(`${apiBase}${path}`, { ...options, headers });
  }

  const canEditGlobal = authUser && ["admin", "superadmin"].includes(authUser.role);
  const isGlobalScope = scope === "global";
  const canEdit = isGlobalScope ? canEditGlobal : true;

  async function loadType(signal) {
    if (!activeType) return;
    setLoading(true);
    setError("");
    try {
      const path =
        scope === "personal"
          ? `/api/lexicon/personal/${activeType}`
          : `/api/lexicon/${activeType}`;
      const response = await authFetch(path, { signal });
      const payload = await response.json().catch(() => ({}));
      setItems(payload.items ?? []);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("Lexicon load failed:", error);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadType(controller.signal);
    return () => {
      controller.abort();
    };
  }, [apiBase, activeType, scope]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? items.filter((item) => item.label.toLowerCase().includes(query))
      : items;
    const sorted = [...list];
    if (sort === "az") {
      sorted.sort((a, b) => a.label.localeCompare(b.label, "fr"));
    } else if (sort === "za") {
      sorted.sort((a, b) => b.label.localeCompare(a.label, "fr"));
    } else if (sort === "new") {
      sorted.sort((a, b) => b.id - a.id);
    } else if (sort === "old") {
      sorted.sort((a, b) => a.id - b.id);
    }
    return sorted;
  }, [items, search, sort]);

  async function addItem() {
    const label = draft.trim();
    if (!label) return;
    if (!canEdit) {
      setError("Seuls les administrateurs peuvent modifier le lexique global.");
      return;
    }
    setError("");
    const path =
      scope === "personal"
        ? `/api/lexicon/personal/${activeType}`
        : `/api/lexicon/${activeType}`;
    const response = await authFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (payload?.error === "duplicate") {
        setError("Valeur déjà présente.");
      }
      return;
    }
    if (payload?.item) {
      setItems((prev) => [...prev, payload.item]);
      setDraft("");
    }
  }


  async function deleteItem(id) {
    if (!canEdit) {
      setError("Seuls les administrateurs peuvent modifier le lexique global.");
      return;
    }
    const path =
      scope === "personal"
        ? `/api/lexicon/personal/${activeType}`
        : `/api/lexicon/${activeType}`;
    const response = await authFetch(path, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Atelier de lexique</h2>
          <p className="muted">Organise et enrichis les catégories en un clic.</p>
        </div>
        <span className="muted">{loading ? "Chargement..." : "Données en base D1"}</span>
      </div>

      <div className="lexicon-layout">
        <aside className="lexicon-sidebar">
          <div className="lexicon-sidebar__title">Catégories</div>
          <div className="lexicon-sidebar__list">
            {LEXICON_TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                className={`lexicon-tab ${activeType === type.key ? "is-active" : ""}`}
                onClick={() => setActiveType(type.key)}
              >
                <span>{type.label}</span>
                <span className="lexicon-count">{type.key === activeType ? items.length : ""}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="lexicon-main">
          <div className="lexicon-header">
            <div>
              <div className="lexicon-title">{activeLabel}</div>
              <div className="lexicon-subtitle">
                {items.length} entrée{items.length > 1 ? "s" : ""}
              </div>
            </div>
            <div className="lexicon-actions">
              <div className="segmented segmented--small">
                <button
                  type="button"
                  className={`segmented__item ${scope === "global" ? "is-active" : ""}`}
                  onClick={() => setScope("global")}
                >
                  Global
                </button>
                <button
                  type="button"
                  className={`segmented__item ${scope === "personal" ? "is-active" : ""}`}
                  onClick={() => setScope("personal")}
                >
                  Personnel
                </button>
              </div>
              <input
                value={search}
                placeholder="Filtrer une entrée..."
                onChange={(event) => setSearch(event.target.value)}
              />
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
                <option value="new">Récent</option>
                <option value="old">Ancien</option>
              </select>
            </div>
          </div>

          {!canEdit && isGlobalScope ? (
            <div className="lexicon-error">
              Lecture seule sur le lexique global. Passe sur “Personnel” pour ajouter tes entrées.
            </div>
          ) : null}

          <div className="lexicon-add">
            <input
              value={draft}
              placeholder={`Ajouter ${activeLabel.toLowerCase()}`}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="button" onClick={addItem} disabled={!canEdit}>
              Ajouter
            </button>
          </div>
          {error ? <div className="lexicon-error">{error}</div> : null}

          <div className="lexicon-table">
            {filteredItems.map((item) => (
              <div key={item.id} className="lexicon-row">
                <div className="lexicon-row__label">{item.label}</div>
                <div className="lexicon-row__meta">#{item.id}</div>
                <button type="button" className="chip chip--danger" onClick={() => deleteItem(item.id)}>
                  Supprimer
                </button>
              </div>
            ))}
            {filteredItems.length === 0 ? (
              <div className="lexicon-empty">
                <div className="lexicon-empty__title">Aucune valeur trouvée.</div>
                <div className="lexicon-empty__subtitle">
                  Essaie un autre filtre ou ajoute une nouvelle entrée.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function UsersAdmin({ apiBase, authToken }) {
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

function ProfilePage({ apiBase, authToken, authUser, setAuthUser }) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function authFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return fetch(`${apiBase}${path}`, { ...options, headers });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setStatus("");
    setError("");
    const formData = new FormData(event.currentTarget);
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const response = await authFetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName })
    });
    if (!response.ok) {
      setError("Impossible de mettre à jour le profil.");
      return;
    }
    setAuthUser((prev) => (prev ? { ...prev, firstName, lastName } : prev));
    setStatus("Profil mis à jour.");
  }

  async function changePassword(event) {
    event.preventDefault();
    setStatus("");
    setError("");
    const formData = new FormData(event.currentTarget);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const response = await authFetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.message || "Changement de mot de passe impossible.");
      return;
    }
    setStatus("Mot de passe mis à jour.");
    setAuthUser((prev) => (prev ? { ...prev, forceReset: false } : prev));
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Profil</h2>
      </div>
      <form className="profile-form" onSubmit={saveProfile}>
        <label>
          Prénom
          <input name="firstName" defaultValue={authUser.firstName || ""} />
        </label>
        <label>
          Nom
          <input name="lastName" defaultValue={authUser.lastName || ""} />
        </label>
        <label>
          Email
          <input name="email" defaultValue={authUser.email} disabled />
        </label>
        <button type="submit">Enregistrer</button>
      </form>
      <form className="profile-form" onSubmit={changePassword}>
        <h3>Mot de passe</h3>
        {!authUser.forceReset ? (
          <label>
            Mot de passe actuel
            <input name="currentPassword" type="password" />
          </label>
        ) : null}
        <label>
          Nouveau mot de passe
          <input name="newPassword" type="password" required minLength={12} />
        </label>
        <button type="submit">Changer le mot de passe</button>
      </form>
      {status ? <div className="muted">{status}</div> : null}
      {error ? <div className="lexicon-error">{error}</div> : null}
    </section>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [page, setPage] = useState("editor");
  const [participants, setParticipants] = useState(DEFAULT_PARTICIPANTS);
  const [steps, setSteps] = useState([]);
  const [form, setForm] = useState(DEFAULT_PARTICIPANTS.map(() => emptyParticipantState()));
  const [isHydrated, setIsHydrated] = useState(false);
  const [lexiconData, setLexiconData] = useState(() => normalizeLexicon(lexicon));
  const saveTimerRef = useRef(null);

  const participantLabels = useMemo(
    () => participants.map((name, index) => labelForParticipant(name, index)),
    [participants]
  );
  const normalizedLexicon = useMemo(() => normalizeLexicon(lexiconData), [lexiconData]);

  function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return fetch(`${API_BASE}${path}`, { ...options, headers });
  }

  useEffect(() => {
    let isMounted = true;
    async function loadAuth() {
      if (!authToken) {
        setAuthLoading(false);
        return;
      }
      try {
        const response = await apiFetch("/api/auth/me");
        if (!response.ok) throw new Error("Auth failed");
        const payload = await response.json();
        if (isMounted) {
          setAuthUser(payload.user ?? null);
        }
      } catch {
        if (isMounted) {
          setAuthUser(null);
          setAuthToken(null);
          localStorage.removeItem(TOKEN_KEY);
        }
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }
    loadAuth();
    return () => {
      isMounted = false;
    };
  }, [authToken]);

  useEffect(() => {
    let isMounted = true;
    async function loadState() {
      try {
        const lexiconResponse = await apiFetch("/api/lexicon");
        if (lexiconResponse.ok) {
          const lexiconPayload = await lexiconResponse.json();
          if (lexiconPayload?.lexicon) {
            setLexiconData(lexiconPayload.lexicon);
          }
        }

        if (!authUser) return;
        const response = await apiFetch("/api/state");
        if (!response.ok) throw new Error("Failed to load state");
        const data = await response.json();
        const normalized = normalizeState(data?.state);
        if (isMounted && normalized) {
          setParticipants(normalized.participants);
          setSteps(normalized.steps);
          setForm(normalized.form);
        }
      } catch (error) {
        console.warn("State load skipped:", error);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }
    loadState();
    return () => {
      isMounted = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (!isHydrated) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    const payload = { participants, steps, form };
    saveTimerRef.current = setTimeout(() => {
      apiFetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: payload })
      }).catch((error) => {
        console.warn("State save skipped:", error);
      });
    }, 400);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [participants, steps, form, isHydrated]);

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError("");
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAuthError("Identifiants invalides.");
      return;
    }
    setAuthToken(payload.token);
    localStorage.setItem(TOKEN_KEY, payload.token);
    setAuthUser(payload.user);
  }

  async function handleRegister(event) {
    event.preventDefault();
    setAuthError("");
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName })
    });
    if (!response.ok) {
      setAuthError("Inscription impossible.");
      return;
    }
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const loginPayload = await loginResponse.json().catch(() => ({}));
    if (!loginResponse.ok) {
      setAuthError("Connexion impossible.");
      return;
    }
    setAuthToken(loginPayload.token);
    localStorage.setItem(TOKEN_KEY, loginPayload.token);
    setAuthUser(loginPayload.user);
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setAuthError("");
    const formData = new FormData(event.currentTarget);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const response = await apiFetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAuthError(payload?.message || "Changement impossible.");
      return;
    }
    setAuthUser((prev) => (prev ? { ...prev, forceReset: false } : prev));
  }

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setAuthToken(null);
    setAuthUser(null);
    localStorage.removeItem(TOKEN_KEY);
  }

  function updateParticipantName(index, value) {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function updateParticipantCount(value) {
    const count = Number(value);
    setParticipants((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i += 1) {
          next.push("");
        }
      }
      if (count < next.length) {
        next.splice(count);
      }
      return next;
    });

    setForm((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i += 1) {
          next.push(emptyParticipantState());
        }
      }
      if (count < next.length) {
        next.splice(count);
      }
      return next;
    });
  }

  function updateForm(index, patch) {
    setForm((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addStep() {
    const hasRole = form.some((item) => item.role !== "none");
    if (!hasRole) return;

    const step = {
      id: crypto.randomUUID(),
      participants: form.map((item) => ({ ...item }))
    };

    setSteps((prev) => [...prev, step]);
    setForm((prev) =>
      prev.map((item) => ({
        ...item,
        offensive: "",
        action: "",
        target: "",
        attackMove: "",
        attackAttribute: [],
        defense: "",
        paradeNumber: "",
        paradeAttribute: "",
        defendMove: "",
        note: "",
        noteOverrides: false
      }))
    );
  }

  function removeStep(id) {
    setSteps((prev) => prev.filter((step) => step.id !== id));
  }

  const canEditGlobal = authUser && ["admin", "superadmin"].includes(authUser.role);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="kicker">Escribe</p>
          <h1>Archive vivante des phrases d'armes</h1>
          <p className="lead">
            Décrivez chaque étape avec précision, sans perdre la lecture globale.
          </p>
        </div>
        <div className="hero__panel">
          <label>
            Nombre de combattants
            <select value={participants.length} onChange={(event) => updateParticipantCount(event.target.value)}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <div className="names">
            {participants.map((name, index) => (
              <label key={index}>
                {`Nom ${index + 1}`}
                <input
                  value={name}
                  placeholder={buildParticipantLabel(index)}
                  onChange={(event) => updateParticipantName(index, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Compte</h2>
          {authUser ? (
            <button type="button" className="chip chip--ghost" onClick={handleLogout}>
              Déconnexion
            </button>
          ) : null}
        </div>
        {authLoading ? (
          <div className="muted">Chargement...</div>
        ) : authUser ? (
          <>
            <div className="muted">
              Connecté: {authUser.firstName || authUser.lastName
                ? `${authUser.firstName || ""} ${authUser.lastName || ""}`.trim()
                : authUser.email} ({authUser.role})
            </div>
            {authUser.forceReset ? (
              <form className="auth-form" onSubmit={handleChangePassword}>
                <label>
                  Nouveau mot de passe
                  <input name="newPassword" type="password" required minLength={12} />
                </label>
                <button type="submit">Changer le mot de passe</button>
              </form>
            ) : null}
          </>
        ) : (
          <div className="auth-grid">
            <form className="auth-form" onSubmit={handleLogin}>
              <h3>Connexion</h3>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Mot de passe
                <input name="password" type="password" required minLength={12} />
              </label>
              <button type="submit">Se connecter</button>
            </form>
            <form className="auth-form" onSubmit={handleRegister}>
              <h3>Inscription</h3>
              <label>
                Prénom
                <input name="firstName" type="text" />
              </label>
              <label>
                Nom
                <input name="lastName" type="text" />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Mot de passe
                <input name="password" type="password" required minLength={12} />
              </label>
              <button type="submit">Créer un compte</button>
            </form>
          </div>
        )}
        {authError ? <div className="lexicon-error">{authError}</div> : null}
      </section>

      {authUser ? null : (
        <div className="empty">Connecte-toi pour accéder aux données.</div>
      )}

      <nav className="menu">
        <button
          type="button"
          className={`menu__item ${page === "editor" ? "is-active" : ""}`}
          onClick={() => setPage("editor")}
        >
          Phrase
        </button>
        <button
          type="button"
          className={`menu__item ${page === "lexicon" ? "is-active" : ""}`}
          onClick={() => setPage("lexicon")}
        >
          Lexique
        </button>
        {authUser ? (
          <button
            type="button"
            className={`menu__item ${page === "profile" ? "is-active" : ""}`}
            onClick={() => setPage("profile")}
          >
            Profil
          </button>
        ) : null}
        {authUser && ["admin", "superadmin"].includes(authUser.role) ? (
          <button
            type="button"
            className={`menu__item ${page === "users" ? "is-active" : ""}`}
            onClick={() => setPage("users")}
          >
            Utilisateurs
          </button>
        ) : null}
      </nav>

      {page === "lexicon" && authUser ? (
        <LexiconAdmin apiBase={API_BASE} authToken={authToken} authUser={authUser} />
      ) : null}

      {page === "users" && authUser ? (
        <UsersAdmin apiBase={API_BASE} authToken={authToken} />
      ) : null}

      {page === "profile" && authUser ? (
        <ProfilePage apiBase={API_BASE} authToken={authToken} authUser={authUser} setAuthUser={setAuthUser} />
      ) : null}

      {page === "editor" && authUser ? (
      <section className="panel">
        <h2>Ajouter une étape</h2>
        <div className="participant-grid" style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}>
          {participants.map((_, index) => {
            const item = form[index];
            const name = participantLabels[index];
            return (
              <div key={name} className="participant-card">
                <div className="participant-card__header">
                  <div className="participant-name">{name}</div>
                  <div className="segmented" role="radiogroup" aria-label={`Rôle de ${name}`}>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "none" ? "is-active" : ""}`}
                      aria-pressed={item.role === "none"}
                      onClick={() => updateForm(index, { role: "none" })}
                    >
                      Sans rôle
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "attack" ? "is-active" : ""}`}
                      aria-pressed={item.role === "attack"}
                      onClick={() => updateForm(index, { role: "attack" })}
                    >
                      Attaque
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "defense" ? "is-active" : ""}`}
                      aria-pressed={item.role === "defense"}
                      onClick={() => updateForm(index, { role: "defense" })}
                    >
                      Défense
                    </button>
                  </div>
                </div>

                {item.role === "attack" ? (
                  <div className="participant-fields">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={item.noteOverrides}
                        onChange={(event) => updateForm(index, { noteOverrides: event.target.checked })}
                      />
                      La note remplace la formulation
                    </label>
                    {!item.noteOverrides ? (
                      <>
                        <label>
                          Offensive
                          <select
                            value={item.offensive}
                            onChange={(event) => updateForm(index, { offensive: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.offensive.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Action d'arme
                          <select
                            value={item.action}
                            onChange={(event) => updateForm(index, { action: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.action.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Attribut attaque
                          <div className="checkbox-row">
                            {normalizedLexicon.attackAttribute.map((option) => (
                              <label key={option} className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={item.attackAttribute.includes(option)}
                                  onChange={() =>
                                    updateForm(index, {
                                      attackAttribute: toggleAttribute(item.attackAttribute, option)
                                    })
                                  }
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        </label>
                        <label>
                          Cible
                          <select
                            value={item.target}
                            onChange={(event) => updateForm(index, { target: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.cible.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Déplacement
                          <select
                            value={item.attackMove}
                            onChange={(event) => updateForm(index, { attackMove: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.attackMove.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                      </>
                    ) : null}
                    <label>
                      Notes
                      <input
                        value={item.note}
                        onChange={(event) => updateForm(index, { note: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}

                {item.role === "defense" ? (
                  <div className="participant-fields">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={item.noteOverrides}
                        onChange={(event) => updateForm(index, { noteOverrides: event.target.checked })}
                      />
                      La note remplace la formulation
                    </label>
                    {!item.noteOverrides ? (
                      <>
                        <label>
                          Défensive
                          <select
                            value={item.defense}
                            onChange={(event) => updateForm(index, { defense: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.defensive.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Numéro de parade
                          <select
                            value={item.paradeNumber}
                            onChange={(event) => updateForm(index, { paradeNumber: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.paradeNumber.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Attribut parade
                          <select
                            value={item.paradeAttribute}
                            onChange={(event) => updateForm(index, { paradeAttribute: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.paradeAttribute.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                        <label>
                          Déplacement
                          <select
                            value={item.defendMove}
                            onChange={(event) => updateForm(index, { defendMove: event.target.value })}
                          >
                            <option value="">—</option>
                        {normalizedLexicon.defendMove.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                          </select>
                        </label>
                      </>
                    ) : null}
                    <label>
                      Notes
                      <input
                        value={item.note}
                        onChange={(event) => updateForm(index, { note: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}

                {item.role === "none" ? (
                  <div className="participant-fields">
                    <label>
                      Notes
                      <input
                        value={item.note}
                        onChange={(event) => updateForm(index, { note: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="summary">
          <h3>Phrase résumée</h3>
          <div className="summary__body">
            {form.map((item, index) => (
              <div key={participantLabels[index]} className="summary__line">
                {buildSummaryLine(item, participantLabels[index])}
              </div>
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button type="button" onClick={addStep}>
            Ajouter l'étape
          </button>
        </div>
      </section>
      ) : null}

      {page === "editor" ? (
      <section className="panel">
        <div className="panel-header">
          <h2>Phrase en cours</h2>
          <span className="muted">{steps.length} étape{steps.length > 1 ? "s" : ""}</span>
        </div>
        <div className="phrase">
          <div className="phrase__header" style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}>
            {participants.map((name, index) => (
              <div key={index} className="phrase__name">
                {labelForParticipant(name, index)}
              </div>
            ))}
          </div>
          <div className="phrase__body">
            {steps.length === 0 ? (
              <div className="empty">Ajoutez une étape pour commencer la phrase.</div>
            ) : (
              steps.map((step, index) => {
                const attackers = step.participants
                  .map((item, idx) => ({ ...item, index: idx }))
                  .filter((item) => item.role === "attack");
                const defenders = step.participants
                  .map((item, idx) => ({ ...item, index: idx }))
                  .filter((item) => item.role === "defense");

                return (
                  <div key={step.id} className="phrase__row" style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}>
                    {step.participants.map((item, colIndex) => {
                      const role = item.role;
                      return (
                        <div key={`${step.id}-${colIndex}`} className="phrase__cell">
                          {role === "attack" ? (
                            <StepCard
                              type="action"
                              title={`Étape ${index + 1}`}
                              accent="accent-attack"
                              lines={item.noteOverrides ? [item.note] : [item.offensive, item.action]}
                              tags={[
                                item.noteOverrides ? null : { label: item.target, variant: "target" },
                                item.noteOverrides ? null : { label: item.attackMove, variant: "move" },
                                item.noteOverrides
                                  ? null
                                  : { label: item.attackAttribute?.join(", "), variant: "note" },
                                item.noteOverrides ? null : { label: item.note, variant: "note" }
                              ]}
                            />
                          ) : null}
                          {role === "defense" ? (
                            <StepCard
                              type="reaction"
                              title="Réaction"
                              accent="accent-defense"
                              lines={item.noteOverrides ? [item.note] : [item.defense]}
                              tags={[
                                item.noteOverrides ? null : { label: item.paradeNumber, variant: "note" },
                                item.noteOverrides ? null : { label: item.paradeAttribute, variant: "note" },
                                item.noteOverrides ? null : { label: item.defendMove, variant: "move" },
                                item.noteOverrides ? null : { label: item.note, variant: "note" }
                              ]}
                            />
                          ) : null}
                          {role === "none" && item.note ? (
                            <StepCard
                              type="neutral"
                              title="Note"
                              accent="accent-neutral"
                              lines={[item.note]}
                            />
                          ) : null}
                        </div>
                      );
                    })}

                    <div className="arrow-layer">
                      {attackers.flatMap((attacker) =>
                        defenders
                          .filter((defender) => defender.index !== attacker.index)
                          .map((defender) => {
                            const isReverse = defender.index < attacker.index;
                            return (
                              <div
                                key={`${step.id}-${attacker.index}-${defender.index}`}
                                className={`arrow ${isReverse ? "arrow--reverse" : ""}`}
                                style={{
                                  left: `calc(${isReverse ? defender.index + 1 : attacker.index + 1} * 100% / ${
                                    participants.length
                                  })`,
                                  width: `calc(${Math.max(0, Math.abs(defender.index - attacker.index) - 1)} * 100% / ${
                                    participants.length
                                  })`
                                }}
                              />
                            );
                          })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
      ) : null}

      {page === "editor" && steps.length > 0 ? (
        <section className="panel panel--ghost">
          <h2>Nettoyage</h2>
          <div className="chip-row">
            {steps.map((step, index) => (
              <button key={step.id} className="chip" onClick={() => removeStep(step.id)}>
                Supprimer l'étape {index + 1}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
