import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LexiconPage from "./pages/LexiconPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import PhraseCreatePage from "./pages/PhraseCreatePage.jsx";
import PhraseListPage from "./pages/PhraseListPage.jsx";
import CombatListPage from "./pages/CombatListPage.jsx";
import {
  FaBookOpen,
  FaHouse,
  FaLayerGroup,
  FaPenNib,
  FaUser,
  FaUsers,
  FaBars,
  FaAngleLeft
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
  buildSummaryLine,
  buildSummaryLines
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
  const [phrases, setPhrases] = useState([]);
  const [activePhraseId, setActivePhraseId] = useState(null);
  const [form, setForm] = useState(DEFAULT_PARTICIPANTS.map(() => emptyParticipantState()));
  const [editingStepId, setEditingStepId] = useState(null);
  const [combatId, setCombatId] = useState(null);
  const [combatName, setCombatName] = useState("Combat sans nom");
  const [combatDescription, setCombatDescription] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [lexiconData, setLexiconData] = useState(() => normalizeLexicon(DEFAULT_LEXICON));
  const [favorites, setFavorites] = useState({});
  const saveTimerRef = useRef(null);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const participantLabels = useMemo(
    () => participants.map((name, index) => labelForParticipant(name, index)),
    [participants]
  );

  const activePhrase = useMemo(
    () => phrases.find((phrase) => phrase.id === activePhraseId) ?? null,
    [phrases, activePhraseId]
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

        if (authUser) {
          const favoritesResponse = await apiFetch("/api/lexicon/favorites");
          if (favoritesResponse.ok) {
            const favoritesPayload = await favoritesResponse.json();
            if (favoritesPayload?.favorites) {
              setFavorites(favoritesPayload.favorites);
            }
          }
        }

        if (!authUser) return;
        const response = await apiFetch("/api/state");
        if (!response.ok) throw new Error("Failed to load state");
        const data = await response.json();
        const normalized = normalizeState(data?.state, DEFAULT_PARTICIPANTS);
        if (isMounted && normalized) {
          setParticipants(normalized.participants);
          setPhrases(normalized.phrases ?? []);
          setForm(normalized.form);
          setCombatId(normalized.combatId ?? null);
          setCombatName(normalized.combatName ?? "Combat sans nom");
          setCombatDescription(normalized.combatDescription ?? "");
          if (normalized.phrases?.length) {
            setActivePhraseId(normalized.phrases[0].id);
          } else {
            setActivePhraseId(null);
          }
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
    const payload = { combatId, combatName, combatDescription, participants, phrases, form };
    saveTimerRef.current = setTimeout(() => {
      apiFetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: payload })
      })
        .then((response) => response?.json?.())
        .then((data) => {
          if (data?.combatId && !combatId) {
            setCombatId(data.combatId);
          }
        })
        .catch((error) => {
        console.warn("State save skipped:", error);
      });
    }, 400);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [participants, phrases, form, combatName, combatDescription, combatId, isHydrated, authUser]);

  async function loadCombatById(id) {
    if (!id) return;
    const response = await apiFetch(`/api/state?combatId=${id}`);
    if (!response.ok) return;
    const data = await response.json();
    const normalized = normalizeState(data?.state, DEFAULT_PARTICIPANTS);
    if (normalized) {
      setParticipants(normalized.participants);
      setPhrases(normalized.phrases ?? []);
      setForm(normalized.form);
      setCombatId(normalized.combatId ?? id);
      setCombatName(normalized.combatName ?? "Combat sans nom");
      setCombatDescription(normalized.combatDescription ?? "");
      if (normalized.phrases?.length) {
        setActivePhraseId(normalized.phrases[0].id);
      } else {
        setActivePhraseId(null);
      }
      return true;
    }
    return false;
  }

  async function handleCreateCombat(payload) {
    const response = await apiFetch("/api/combats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload?.name,
        description: payload?.description,
        participants: DEFAULT_PARTICIPANTS
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.combat?.id) return;
    const newId = data.combat.id;
    setCombatId(newId);
    setCombatName(data.combat.name ?? "Combat sans nom");
    setCombatDescription(data.combat.description ?? "");
    setParticipants(DEFAULT_PARTICIPANTS);
    setPhrases([]);
    setActivePhraseId(null);
    setForm(DEFAULT_PARTICIPANTS.map(() => emptyParticipantState()));
    setPage("create");
  }

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

    if (!activePhraseId) return;
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === activePhraseId
          ? editingStepId
            ? {
                ...phrase,
                steps: phrase.steps.map((item) => (item.id === editingStepId ? { ...step, id: editingStepId } : item))
              }
            : { ...phrase, steps: [...phrase.steps, step] }
          : phrase
      )
    );
    setEditingStepId(null);
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
    if (!activePhraseId) return;
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === activePhraseId
          ? { ...phrase, steps: phrase.steps.filter((step) => step.id !== id) }
          : phrase
      )
    );
    if (editingStepId === id) {
      setEditingStepId(null);
    }
  }

  function editStep(id) {
    if (!activePhraseId) return;
    const phrase = phrases.find((item) => item.id === activePhraseId);
    const step = phrase?.steps?.find((item) => item.id === id);
    if (!step) return;
    const nextForm = participants.map((_, index) => ({
      ...emptyParticipantState(),
      ...(step.participants?.[index] ?? {})
    }));
    setForm(nextForm);
    setEditingStepId(id);
  }

  function cancelEditStep() {
    setEditingStepId(null);
    setForm(DEFAULT_PARTICIPANTS.map(() => emptyParticipantState()));
  }

  function createPhrase() {
    const nextNumber = phrases.length + 1;
    const newPhrase = {
      id: crypto.randomUUID(),
      name: `Phrase ${nextNumber}`,
      steps: []
    };
    setPhrases((prev) => [...prev, newPhrase]);
    setActivePhraseId(newPhrase.id);
  }

  function renamePhrase(id, name) {
    setPhrases((prev) =>
      prev.map((phrase) => (phrase.id === id ? { ...phrase, name } : phrase))
    );
  }

  function movePhrase(id, direction) {
    setPhrases((prev) => {
      const index = prev.findIndex((phrase) => phrase.id === id);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, moved);
      return copy;
    });
  }

  function movePhraseToIndex(id, targetIndex) {
    setPhrases((prev) => {
      const index = prev.findIndex((phrase) => phrase.id === id);
      if (index < 0) return prev;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      if (index === targetIndex) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  }

  function deletePhrase(id) {
    setPhrases((prev) => prev.filter((phrase) => phrase.id !== id));
    if (activePhraseId === id) {
      const remaining = phrases.filter((phrase) => phrase.id !== id);
      setActivePhraseId(remaining[0]?.id ?? null);
    }
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
    <div className={`page layout ${isMenuCollapsed ? "layout--collapsed" : "layout--expanded"}`}>
      {isMenuCollapsed ? (
        <button
          type="button"
          className="menu-fab"
          onClick={() => setIsMenuCollapsed(false)}
          aria-label="Ouvrir le menu"
          title="Ouvrir le menu"
        >
          <FaBars />
        </button>
      ) : null}
      {!isMenuCollapsed ? (
        <div className="menu-overlay" onClick={() => setIsMenuCollapsed(true)} />
      ) : null}
      <aside className={`sidebar ${isMenuCollapsed ? "is-collapsed" : ""}`}>
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setIsMenuCollapsed((prev) => !prev)}
          aria-label={isMenuCollapsed ? "Afficher le menu" : "Réduire le menu"}
          title={isMenuCollapsed ? "Afficher le menu" : "Réduire le menu"}
        >
          {isMenuCollapsed ? <FaBars /> : <FaAngleLeft />}
        </button>

        <div className="brand">
          <p className="kicker">Escribe</p>
          <h1>Archive vivante</h1>
          <p className="lead">Une page par usage pour garder l’édition lisible.</p>
        </div>

        <nav className="menu">
          <button
            type="button"
            className={`menu__item ${page === "home" ? "is-active" : ""}`}
            onClick={() => {
              setPage("home");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu__icon" aria-hidden="true"><FaHouse /></span>
            <span className="menu__label">Accueil</span>
          </button>
          <button
            type="button"
            className={`menu__item ${page === "combats" ? "is-active" : ""}`}
            onClick={() => {
              setPage("combats");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu__icon" aria-hidden="true"><FaPenNib /></span>
            <span className="menu__label">Créer un combat</span>
          </button>
          <button
            type="button"
            className={`menu__item ${page === "phrases" ? "is-active" : ""}`}
            onClick={() => {
              setPage("combats");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu__icon" aria-hidden="true"><FaBookOpen /></span>
            <span className="menu__label">Mes combats</span>
          </button>
          <button
            type="button"
            className={`menu__item ${page === "lexicon" ? "is-active" : ""}`}
            onClick={() => {
              setPage("lexicon");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu__icon" aria-hidden="true"><FaLayerGroup /></span>
            <span className="menu__label">Lexique</span>
          </button>
          <button
            type="button"
            className={`menu__item ${page === "account" ? "is-active" : ""}`}
            onClick={() => {
              setPage("account");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu__icon" aria-hidden="true"><FaUser /></span>
            <span className="menu__label">Mon compte</span>
          </button>
          {authUser && ["admin", "superadmin"].includes(authUser.role) ? (
            <button
              type="button"
              className={`menu__item ${page === "users" ? "is-active" : ""}`}
              onClick={() => {
                setPage("users");
                setIsMenuCollapsed(true);
              }}
            >
              <span className="menu__icon" aria-hidden="true"><FaUsers /></span>
              <span className="menu__label">Utilisateurs</span>
            </button>
          ) : null}
        </nav>
      </aside>

      <main className="content">
        {page === "home" ? (
          <HomePage
            authUser={authUser}
            combatName={combatName}
            combatDescription={combatDescription}
            combatId={combatId}
            stepsCount={activePhrase?.steps?.length ?? 0}
            participantsCount={participants.length}
            onNavigate={setPage}
            onOpenCombat={(id) => {
              if (!id) return;
              loadCombatById(id).then(() => setPage("create"));
            }}
          />
        ) : null}

        {page === "combats" ? (
          <CombatListPage
            apiBase={API_BASE}
            authToken={authToken}
            combatId={combatId}
            onSelectCombat={loadCombatById}
            onCreateCombat={handleCreateCombat}
            onNavigate={setPage}
          />
        ) : null}

        {page === "create" ? (
          <PhraseCreatePage
            participants={participants}
            form={form}
            combatName={combatName}
            combatDescription={combatDescription}
            phrases={phrases}
            activePhraseId={activePhraseId}
            activePhrase={activePhrase}
            stepsCount={activePhrase?.steps?.length ?? 0}
            participantLabels={participantLabels}
            normalizedLexicon={normalizedLexicon}
            favorites={favorites}
            onParticipantCountChange={updateParticipantCount}
            onParticipantNameChange={updateParticipantName}
            onFormChange={updateForm}
            onAddStep={addStep}
            onCombatNameChange={setCombatName}
            onCombatDescriptionChange={setCombatDescription}
            onCreatePhrase={createPhrase}
            onSelectPhrase={setActivePhraseId}
            onRenamePhrase={renamePhrase}
            onMovePhrase={movePhrase}
            onMovePhraseToIndex={movePhraseToIndex}
            onDeletePhrase={deletePhrase}
            onEditStep={editStep}
            onRemoveStep={removeStep}
            onCancelEditStep={cancelEditStep}
            editingStepId={editingStepId}
            buildParticipantLabel={buildParticipantLabel}
            buildSummaryLine={buildSummaryLine}
            buildSummaryLines={buildSummaryLines}
            toggleAttribute={toggleAttribute}
          />
        ) : null}

        {page === "phrases" ? (
          <PhraseListPage
            combatName={combatName}
            combatDescription={combatDescription}
            participants={participants}
            steps={activePhrase?.steps ?? []}
            onRemoveStep={removeStep}
          />
        ) : null}

        {page === "lexicon" ? (
          <LexiconPage
            apiBase={API_BASE}
            authToken={authToken}
            authUser={authUser}
            favorites={favorites}
            setFavorites={setFavorites}
          />
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
