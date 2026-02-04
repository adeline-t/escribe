import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LexiconPage from "./pages/LexiconPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import PhraseCreatePage from "./pages/PhraseCreatePage.jsx";
import PhraseListPage from "./pages/PhraseListPage.jsx";
import {
  FaBookOpen,
  FaHouse,
  FaLayerGroup,
  FaPenNib,
  FaUser,
  FaUsers
} from "react-icons/fa6";
import {
  DEFAULT_LEXICON,
  DEFAULT_PARTICIPANTS,
  normalizeLexicon
} from "./lib/lexicon.js";
import {
  buildParticipantLabel,
  labelForParticipant,
  emptyParticipantState,
  normalizeState,
  toggleAttribute,
  buildSummaryLine
} from "./lib/participants.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
const TOKEN_KEY = "escribe_token";

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [page, setPage] = useState("home");

  const [participants, setParticipants] = useState(DEFAULT_PARTICIPANTS);
  const [steps, setSteps] = useState([]);
  const [form, setForm] = useState(DEFAULT_PARTICIPANTS.map(() => emptyParticipantState()));
  const [isHydrated, setIsHydrated] = useState(false);
  const [lexiconData, setLexiconData] = useState(() => normalizeLexicon(DEFAULT_LEXICON));
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
        const normalized = normalizeState(data?.state, DEFAULT_PARTICIPANTS);
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
    if (!isHydrated || !authUser) return;
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
  }, [participants, steps, form, isHydrated, authUser]);

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

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setAuthToken(null);
    setAuthUser(null);
    localStorage.removeItem(TOKEN_KEY);
    setPage("home");
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

  if (!authUser) {
    return (
      <AuthPage
        authLoading={authLoading}
        authError={authError}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <div className="page layout">
      <aside className="sidebar">
        <div className="brand">
          <p className="kicker">Escribe</p>
          <h1>Archive vivante</h1>
          <p className="lead">Une page par usage pour garder l’édition lisible.</p>
        </div>

        <nav className="menu">
          <button
            type="button"
            className={`menu__item ${page === "home" ? "is-active" : ""}`}
            onClick={() => setPage("home")}
          >
            <span className="menu__icon" aria-hidden="true"><FaHouse /></span>
            Accueil
          </button>
          <button
            type="button"
            className={`menu__item ${page === "create" ? "is-active" : ""}`}
            onClick={() => setPage("create")}
          >
            <span className="menu__icon" aria-hidden="true"><FaPenNib /></span>
            Créer une phrase
          </button>
          <button
            type="button"
            className={`menu__item ${page === "phrases" ? "is-active" : ""}`}
            onClick={() => setPage("phrases")}
          >
            <span className="menu__icon" aria-hidden="true"><FaBookOpen /></span>
            Phrases créées
          </button>
          <button
            type="button"
            className={`menu__item ${page === "lexicon" ? "is-active" : ""}`}
            onClick={() => setPage("lexicon")}
          >
            <span className="menu__icon" aria-hidden="true"><FaLayerGroup /></span>
            Lexique
          </button>
          <button
            type="button"
            className={`menu__item ${page === "account" ? "is-active" : ""}`}
            onClick={() => setPage("account")}
          >
            <span className="menu__icon" aria-hidden="true"><FaUser /></span>
            Mon compte
          </button>
          {authUser && ["admin", "superadmin"].includes(authUser.role) ? (
            <button
              type="button"
              className={`menu__item ${page === "users" ? "is-active" : ""}`}
              onClick={() => setPage("users")}
            >
              <span className="menu__icon" aria-hidden="true"><FaUsers /></span>
              Utilisateurs
            </button>
          ) : null}
        </nav>
      </aside>

      <main className="content">
        {page === "home" ? (
          <HomePage
            authUser={authUser}
            stepsCount={steps.length}
            participantsCount={participants.length}
            onNavigate={setPage}
          />
        ) : null}

        {page === "create" ? (
          <PhraseCreatePage
            participants={participants}
            form={form}
            participantLabels={participantLabels}
            normalizedLexicon={normalizedLexicon}
            onParticipantCountChange={updateParticipantCount}
            onParticipantNameChange={updateParticipantName}
            onFormChange={updateForm}
            onAddStep={addStep}
            buildParticipantLabel={buildParticipantLabel}
            buildSummaryLine={buildSummaryLine}
            toggleAttribute={toggleAttribute}
          />
        ) : null}

        {page === "phrases" ? (
          <PhraseListPage
            participants={participants}
            steps={steps}
            onRemoveStep={removeStep}
          />
        ) : null}

        {page === "lexicon" ? (
          <LexiconPage apiBase={API_BASE} authToken={authToken} authUser={authUser} />
        ) : null}

        {page === "users" ? (
          <UsersPage apiBase={API_BASE} authToken={authToken} />
        ) : null}

        {page === "account" ? (
          <ProfilePage
            apiBase={API_BASE}
            authToken={authToken}
            authUser={authUser}
            setAuthUser={setAuthUser}
            onLogout={handleLogout}
          />
        ) : null}
      </main>
    </div>
  );
}
