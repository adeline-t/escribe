import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LexiconPage from "./pages/LexiconPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import CombatReaderPage from "./pages/CombatReaderPage.jsx";
import CombatFormPage from "./pages/CombatFormPage.jsx";
import CombatListPage from "./pages/CombatListPage.jsx";
import VersionFooter from "./components/VersionFooter.jsx";
import frontendVersion from "./version.json";
import {
  FaBookOpen,
  FaHouse,
  FaLayerGroup,
  FaPenNib,
  FaUser,
  FaUsers,
  FaRightFromBracket,
  FaBars,
  FaAngleLeft,
} from "react-icons/fa6";
import {
  DEFAULT_LEXICON,
  DEFAULT_PARTICIPANTS,
  DEFAULT_SABRE_LEXICON,
  normalizeLexicon,
  normalizeSabreLexicon,
} from "./lib/lexicon.js";
import {
  buildParticipantLabel,
  labelForParticipant,
  emptyParticipantState,
  normalizeState,
  toggleAttribute,
  buildSummaryLine,
  buildSummaryLines,
} from "./lib/participants.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
const TOKEN_KEY = "escribe_token";
const FRONT_ENV = import.meta.env.VITE_ENVIRONMENT ?? import.meta.env.MODE ?? "";

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [page, setPage] = useState("home");

  const [participants, setParticipants] = useState(() =>
    DEFAULT_PARTICIPANTS.map((participant) => ({ ...participant })),
  );
  const [phrases, setPhrases] = useState([]);
  const [activePhraseId, setActivePhraseId] = useState(null);
  const [form, setForm] = useState(
    DEFAULT_PARTICIPANTS.map(() => emptyParticipantState()),
  );
  const [editingStepId, setEditingStepId] = useState(null);
  const [combatId, setCombatId] = useState(null);
  const [combatName, setCombatName] = useState("Combat sans nom");
  const [combatDescription, setCombatDescription] = useState("");
  const [combatType, setCombatType] = useState("classic");
  const [combatShareRole, setCombatShareRole] = useState("read");
  const [isHydrated, setIsHydrated] = useState(false);
  const [lexiconData, setLexiconData] = useState(() =>
    normalizeLexicon(DEFAULT_LEXICON),
  );
  const [sabreLexiconData, setSabreLexiconData] = useState(
    () => DEFAULT_SABRE_LEXICON,
  );
  const [favorites, setFavorites] = useState({});
  const [sabreFavorites, setSabreFavorites] = useState({});
  const saveTimerRef = useRef(null);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [backendVersion, setBackendVersion] = useState(null);

  const participantLabels = useMemo(
    () => participants.map((name, index) => labelForParticipant(name, index)),
    [participants],
  );

  const activePhrase = useMemo(
    () => phrases.find((phrase) => phrase.id === activePhraseId) ?? null,
    [phrases, activePhraseId],
  );

  const normalizedLexicon = useMemo(
    () => normalizeLexicon(lexiconData),
    [lexiconData],
  );

  const normalizedSabreLexicon = useMemo(
    () => normalizeSabreLexicon(sabreLexiconData),
    [sabreLexiconData],
  );

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
        const sabreLexiconResponse = await apiFetch(
          "/api/lexicon?lexicon=sabre-laser",
        );
        if (sabreLexiconResponse.ok) {
          const sabrePayload = await sabreLexiconResponse.json();
          if (sabrePayload?.lexicon) {
            setSabreLexiconData(sabrePayload.lexicon);
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
          const sabreFavoritesResponse = await apiFetch(
            "/api/lexicon/favorites?lexicon=sabre-laser",
          );
          if (sabreFavoritesResponse.ok) {
            const sabreFavoritesPayload = await sabreFavoritesResponse.json();
            if (sabreFavoritesPayload?.favorites) {
              setSabreFavorites(sabreFavoritesPayload.favorites);
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
          setCombatType(normalized.combatType ?? "classic");
          setCombatShareRole(normalized.combatShareRole ?? "read");
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
    let isMounted = true;
    fetch(`${API_BASE}/api/version`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (isMounted && payload) {
          setBackendVersion(payload);
        }
      })
      .catch(() => null);
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !authUser) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    const payload = {
      combatId,
      combatName,
      combatDescription,
      combatType,
      participants,
      phrases,
      form,
    };
    saveTimerRef.current = setTimeout(() => {
      apiFetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: payload }),
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
  }, [
    participants,
    phrases,
    form,
    combatName,
    combatDescription,
    combatId,
    combatType,
    combatShareRole,
    isHydrated,
    authUser,
  ]);

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
      setCombatType(normalized.combatType ?? "classic");
      setCombatShareRole(normalized.combatShareRole ?? "read");
      if (normalized.phrases?.length) {
        setActivePhraseId(normalized.phrases[0].id);
      } else {
        setActivePhraseId(null);
      }
      return normalized.combatType ?? "classic";
    }
    return null;
  }

  async function handleCreateCombat(payload) {
    const type = payload?.type === "sabre-laser" ? "sabre-laser" : "classic";
    const defaultParticipants = DEFAULT_PARTICIPANTS.map((participant) => ({
      ...participant,
    }));
    const response = await apiFetch("/api/combats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload?.name,
        description: payload?.description,
        participants: defaultParticipants,
        type,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.combat?.id) return null;
    const newId = data.combat.id;
    const initialPhrase = {
      id: crypto.randomUUID(),
      name: "Phrase 1",
      steps: [],
    };
    setCombatId(newId);
    setCombatName(data.combat.name ?? "Combat sans nom");
    setCombatDescription(data.combat.description ?? "");
    setCombatType(type);
    setCombatShareRole("owner");
    setParticipants(defaultParticipants);
    setPhrases([initialPhrase]);
    setActivePhraseId(initialPhrase.id);
    setForm(defaultParticipants.map(() => emptyParticipantState()));
    return { id: newId, type };
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError("");
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAuthError(payload?.error || "Identifiants invalides.");
        return;
      }
      setAuthToken(payload.token);
      localStorage.setItem(TOKEN_KEY, payload.token);
      setAuthUser(payload.user);
    } catch {
      setAuthError("Impossible de se connecter. Vérifie ta connexion.");
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setAuthError("");
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setAuthError(payload?.error || "Inscription impossible.");
        return;
      }
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginPayload = await loginResponse.json().catch(() => ({}));
      if (!loginResponse.ok) {
        setAuthError(loginPayload?.error || "Connexion impossible.");
        return;
      }
      setAuthToken(loginPayload.token);
      localStorage.setItem(TOKEN_KEY, loginPayload.token);
      setAuthUser(loginPayload.user);
    } catch {
      setAuthError("Impossible de créer le compte. Vérifie ta connexion.");
    }
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
      const current =
        next[index] && typeof next[index] === "object"
          ? next[index]
          : { name: "", weapon: "" };
      next[index] = { ...current, name: value };
      return next;
    });
  }

  function updateParticipantWeapon(index, value) {
    setParticipants((prev) => {
      const next = [...prev];
      const current =
        next[index] && typeof next[index] === "object"
          ? next[index]
          : { name: "", weapon: "" };
      next[index] = { ...current, weapon: value };
      return next;
    });
  }

  function updateParticipantCount(value) {
    const count = Number(value);
    setParticipants((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i += 1) {
          next.push({ name: "", weapon: "" });
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

  function updateStepParticipant(stepId, participantIndex, updates) {
    setPhrases((prev) =>
      prev.map((phrase) => {
        if (phrase.id !== activePhraseId) return phrase;
        return {
          ...phrase,
          steps: phrase.steps.map((step) => {
            if (step.id !== stepId) return step;
            return {
              ...step,
              participants: step.participants.map((item, index) =>
                index === participantIndex ? { ...item, ...updates } : item,
              ),
            };
          }),
        };
      }),
    );
  }

  function resetForm() {
    setForm(participants.map(() => emptyParticipantState()));
    setEditingStepId(null);
  }

  function addStep() {
    const hasContent = form.some((item) => {
      if (item.mode === "combat") {
        return item.role !== "none";
      }
      if (item.mode === "choregraphie") {
        return Boolean(item.chorePhase) || Boolean(item.note);
      }
      if (item.mode === "note") {
        return Boolean(item.note);
      }
      return false;
    });
    if (!hasContent) return;

    const step = {
      id: crypto.randomUUID(),
      participants: form.map((item) => ({ ...item })),
    };

    if (!activePhraseId) return;
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === activePhraseId
          ? { ...phrase, steps: [...phrase.steps, step] }
          : phrase,
      ),
    );
    setEditingStepId(null);
    setForm(participants.map(() => emptyParticipantState()));
  }

  function removeStep(id) {
    if (!activePhraseId) return;
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === activePhraseId
          ? { ...phrase, steps: phrase.steps.filter((step) => step.id !== id) }
          : phrase,
      ),
    );
    if (editingStepId === id) {
      setEditingStepId(null);
    }
  }

  function editStep(id) {
    if (!activePhraseId) return;
    setEditingStepId(id);
  }

  function cancelEditStep() {
    setEditingStepId(null);
    setForm(participants.map(() => emptyParticipantState()));
  }

  function selectPhrase(id) {
    setActivePhraseId(id);
    setEditingStepId(null);
    setForm(participants.map(() => emptyParticipantState()));
  }

  function createPhrase() {
    const nextNumber = phrases.length + 1;
    const newPhrase = {
      id: crypto.randomUUID(),
      name: `Phrase ${nextNumber}`,
      steps: [],
    };
    setPhrases((prev) => [...prev, newPhrase]);
    setActivePhraseId(newPhrase.id);
    setEditingStepId(null);
    setForm(participants.map(() => emptyParticipantState()));
  }

  function renamePhrase(id, name) {
    setPhrases((prev) =>
      prev.map((phrase) => (phrase.id === id ? { ...phrase, name } : phrase)),
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
      setEditingStepId(null);
      setForm(participants.map(() => emptyParticipantState()));
    }
  }

  if (!authUser) {
    return (
      <>
        <AuthPage
          authLoading={authLoading}
          authError={authError}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
        <VersionFooter
          frontend={frontendVersion}
          backend={backendVersion}
          frontendEnv={FRONT_ENV}
        />
      </>
    );
  }

  const isSabreList = page === "combats-sabre" || page === "combats-sabre-new";
  const autoOpenSabreCreate = page === "combats-sabre-new";
  const autoOpenCreate = page === "combats-new";

  return (
    <div
      className={`page layout ${isMenuCollapsed ? "layout--collapsed" : "layout--expanded"}`}
    >
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
        <div
          className="menu-overlay"
          onClick={() => setIsMenuCollapsed(true)}
        />
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

        <div className="brand stack-2">
          <p className="kicker"></p>
          <div className="inline-center">
            <img className="app-icon" src="/icon.png" alt="Escribe" />
            <span className="app-title">Escribe</span>
          </div>
          <p className="lead">
            Décrivez chaque passe avec précision, sans perdre la lecture
            globale.
          </p>
        </div>

        <nav className="menu stack-4">
          <button
            type="button"
            className={`menu-item ${page === "home" ? "is-active" : ""}`}
            onClick={() => {
              setPage("home");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu-icon" aria-hidden="true">
              <FaHouse />
            </span>
            <span className="menu-label">Accueil</span>
          </button>
          <button
            type="button"
            className={`menu-item ${page === "combats" ? "is-active" : ""}`}
            onClick={() => {
              setPage("combats-new");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu-icon" aria-hidden="true">
              <FaPenNib />
            </span>
            <span className="menu-label">Créer un combat</span>
          </button>
          <button
            type="button"
            className={`menu-item ${page === "combats" ? "is-active" : ""}`}
            onClick={() => {
              setPage("combats");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu-icon" aria-hidden="true">
              <FaBookOpen />
            </span>
            <span className="menu-label">Mes combats</span>
          </button>
          <button
            type="button"
            className={`menu-item ${isSabreList ? "is-active" : ""}`}
            onClick={() => {
              setPage("lexicon");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu-icon" aria-hidden="true">
              <FaLayerGroup />
            </span>
            <span className="menu-label">Lexique</span>
          </button>
          <button
            type="button"
            className={`menu-item ${page === "account" ? "is-active" : ""}`}
            onClick={() => {
              setPage("account");
              setIsMenuCollapsed(true);
            }}
          >
            <span className="menu-icon" aria-hidden="true">
              <FaUser />
            </span>
            <span className="menu-label">Mon compte</span>
          </button>
          {authUser && ["admin", "superadmin"].includes(authUser.role) ? (
            <button
              type="button"
              className={`menu-item ${page === "users" ? "is-active" : ""}`}
              onClick={() => {
                setPage("users");
                setIsMenuCollapsed(true);
              }}
            >
              <span className="menu-icon" aria-hidden="true">
                <FaUsers />
              </span>
              <span className="menu-label">Utilisateurs</span>
            </button>
          ) : null}
          <button
            type="button"
            className="menu-item menu-item--logout"
            onClick={() => {
              handleLogout();
              setIsMenuCollapsed(true);
            }}
            title="Se déconnecter"
            aria-label="Se déconnecter"
          >
            <span className="menu-icon" aria-hidden="true">
              <FaRightFromBracket />
            </span>
            <span className="menu-label">Déconnexion</span>
          </button>
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
              loadCombatById(id).then((type) => {
                if (!type) return;
                setPage(type === "sabre-laser" ? "create-sabre" : "create");
              });
            }}
          />
        ) : null}

        {page === "combats-new" ? (
          <CombatListPage
            apiBase={API_BASE}
            authToken={authToken}
            combatId={combatId}
            title="Créer un combat"
            subtitle="Choisis le type et démarre un combat."
            autoOpenCreate
            onSelectCombat={loadCombatById}
            onCreateCombat={handleCreateCombat}
            onNavigate={setPage}
          />
        ) : null}

        {page === "combats" ? (
          <CombatListPage
            apiBase={API_BASE}
            authToken={authToken}
            combatId={combatId}
            title="Mes combats"
            subtitle="Tous les combats, regroupés par type."
            onSelectCombat={loadCombatById}
            onCreateCombat={handleCreateCombat}
            onNavigate={setPage}
          />
        ) : null}

        {isSabreList ? (
          <CombatListPage
            apiBase={API_BASE}
            authToken={authToken}
            combatId={combatId}
            combatType="sabre-laser"
            title="Combats sabre laser"
            subtitle="Crée, sélectionne et archive des combats sabre laser."
            autoOpenCreate={autoOpenSabreCreate}
            onSelectCombat={loadCombatById}
            onCreateCombat={handleCreateCombat}
            onNavigate={setPage}
          />
        ) : null}

        {page === "create" ? (
          <CombatFormPage
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
            isReadOnly={combatShareRole === "read"}
            onParticipantCountChange={updateParticipantCount}
            onParticipantNameChange={updateParticipantName}
            onParticipantWeaponChange={updateParticipantWeapon}
            onFormChange={updateForm}
            onAddStep={addStep}
            onCombatNameChange={setCombatName}
            onCombatDescriptionChange={setCombatDescription}
            onCreatePhrase={createPhrase}
            onSelectPhrase={selectPhrase}
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
            onNavigate={setPage}
            onUpdateStepParticipant={updateStepParticipant}
            onResetForm={resetForm}
          />
        ) : null}

        {page === "create-sabre" ? (
          <CombatFormPage
            participants={participants}
            form={form}
            combatName={combatName}
            combatDescription={combatDescription}
            phrases={phrases}
            activePhraseId={activePhraseId}
            activePhrase={activePhrase}
            stepsCount={activePhrase?.steps?.length ?? 0}
            participantLabels={participantLabels}
            normalizedLexicon={normalizedSabreLexicon}
            favorites={sabreFavorites}
            labels={{
              offensive: "Technique offensive",
              action: "Préparation",
              attackAttribute: "Attribut offensif",
              target: "Cible",
              attackMove: "Déplacement",
              defensive: "Technique défensive",
              paradeAttribute: "Attribut défensif",
              defendMove: "Déplacement",
              notes: "Notes",
              weapon: "Arme",
            }}
            favoriteTypeKeys={{
              offensive: "techniques_offensives",
              action: "preparations",
              attackAttribute: "attributs_offensifs",
              target: "cibles",
              attackMove: "deplacements",
              defensive: "techniques_defensives",
              paradeAttribute: "attributs_defensifs",
              defendMove: "deplacements",
            }}
            showParadeNumber={false}
            participantWeaponOptions={normalizedSabreLexicon.armes ?? []}
            isReadOnly={combatShareRole === "read"}
            onParticipantCountChange={updateParticipantCount}
            onParticipantNameChange={updateParticipantName}
            onParticipantWeaponChange={updateParticipantWeapon}
            onFormChange={updateForm}
            onAddStep={addStep}
            onCombatNameChange={setCombatName}
            onCombatDescriptionChange={setCombatDescription}
            onCreatePhrase={createPhrase}
            onSelectPhrase={selectPhrase}
            onRenamePhrase={renamePhrase}
            onMovePhrase={movePhrase}
            onMovePhraseToIndex={movePhraseToIndex}
            onDeletePhrase={deletePhrase}
            onEditStep={editStep}
            onRemoveStep={removeStep}
            onCancelEditStep={cancelEditStep}
            editingStepId={editingStepId}
            phaseOptions={normalizedSabreLexicon.phases ?? []}
            buildParticipantLabel={buildParticipantLabel}
            buildSummaryLine={buildSummaryLine}
            buildSummaryLines={buildSummaryLines}
            toggleAttribute={toggleAttribute}
            onNavigate={setPage}
            onUpdateStepParticipant={updateStepParticipant}
            onResetForm={resetForm}
          />
        ) : null}

        {page === "overview" ? (
          <CombatReaderPage
            combatName={combatName}
            combatDescription={combatDescription}
            participants={participants}
            phrases={phrases}
            onNavigate={setPage}
          />
        ) : null}

        {page === "lexicon" ? (
          <LexiconPage
            apiBase={API_BASE}
            authToken={authToken}
            authUser={authUser}
            favorites={favorites}
            setFavorites={setFavorites}
            sabreFavorites={sabreFavorites}
            setSabreFavorites={setSabreFavorites}
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
      <VersionFooter
        frontend={frontendVersion}
        backend={backendVersion}
        frontendEnv={FRONT_ENV}
      />
    </div>
  );
}
