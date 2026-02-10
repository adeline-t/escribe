import { useEffect, useMemo, useState } from "react";
import "./App.css";
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LexiconPage from "./pages/LexiconPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import PerformanceReaderPage from "./pages/PerformanceReaderPage.jsx";
import PerformanceFormPage from "./pages/PerformanceFormPage.jsx";
import PerformanceListPage from "./pages/PerformanceListPage.jsx";
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
  DEFAULT_PERFORMERS,
  normalizeNewLexicon,
  normalizeSabreLexicon,
  resolveLexiconTermLabel,
} from "./lib/lexicon.js";
import {
  CLASSIC_LEXICON_OPTIONS,
  SABRE_FAVORITE_TYPE_KEYS,
  SABRE_UI_LABELS,
} from "./lib/performances.js";
import {
  buildPerformerLabel,
  normalizeState,
  toggleAttribute,
  buildSummaryLine,
  buildSummaryLines,
} from "./lib/performers.js";
import { usePerformanceStateManager } from "./hooks/usePerformanceStateManager.js";
import { useAppBootstrap } from "./hooks/useAppBootstrap.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
const TOKEN_KEY = "escribe_token";
const FRONT_ENV =
  import.meta.env.VITE_ENVIRONMENT ?? import.meta.env.MODE ?? "";

export default function App() {
  const [page, setPage] = useState("home");
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(true);
  const bootstrap = useAppBootstrap({
    apiBase: API_BASE,
    tokenKey: TOKEN_KEY,
  });
  const {
    services,
    authUser,
    setAuthUser,
    authToken,
    authLoading,
    authError,
    newLexiconData,
    sabreLexiconData,
    favorites,
    newFavorites,
    sabreFavorites,
    setNewFavorites,
    setSabreFavorites,
    backendVersion,
    login,
    register,
    logout,
  } = bootstrap;
  const { performances } = services;
  const performanceState = usePerformanceStateManager({
    isSaveEnabled: Boolean(authUser),
    saveState: (state) => performances.saveState(state),
  });
  const {
    performers,
    sequences,
    activeSequenceId,
    form,
    editingStepId,
    insertStepIndex,
    insertionMode,
    deletionMode,
    performanceId,
    performanceName,
    performanceDescription,
    performanceType,
    performanceShareRole,
    stepLexiconKey,
    performerLabels,
    activeSequence,
    setPerformanceName,
    setPerformanceDescription,
    applyNormalizedPerformanceState,
    initializeNewPerformance,
    markHydrated,
    updatePerformerName,
    updatePerformerWeapon,
    updatePerformerCount,
    updateForm,
    updateStepPerformer,
    updateStepLexicon,
    resetForm,
    addStep,
    insertEmptyStep,
    removeStep,
    editStep,
    cancelEditStep,
    selectSequence,
    toggleSequencePerformerVisibility,
    createSequence,
    renameSequence,
    moveSequence,
    moveSequenceToIndex,
    deleteSequence,
    startInsertStep,
    toggleInsertionMode,
    toggleDeletionMode,
  } = performanceState;

  const normalizedNewLexicon = useMemo(
    () => normalizeNewLexicon(newLexiconData),
    [newLexiconData],
  );
  const normalizedLexicon = normalizedNewLexicon;

  const normalizedSabreLexicon = useMemo(
    () => normalizeSabreLexicon(sabreLexiconData),
    [sabreLexiconData],
  );
  const resolveAnyTermLabel = (type, value) => {
    const token = String(value ?? "").trim();
    if (!token) return "";
    const candidates = [normalizedNewLexicon, normalizedSabreLexicon];
    for (const lexicon of candidates) {
      const resolved = resolveLexiconTermLabel(lexicon, token, type);
      if (resolved && resolved !== token) return resolved;
    }
    return token;
  };

  useEffect(() => {
    let isMounted = true;
    async function loadState() {
      try {
        if (!authUser) return;
        const stateResult = await performances.getState();
        if (!stateResult.ok) throw new Error("Failed to load state");
        const normalized = normalizeState(
          stateResult.state,
          DEFAULT_PERFORMERS,
        );
        if (isMounted && normalized) {
          applyNormalizedPerformanceState(normalized);
        }
      } catch (error) {
        console.warn("State load skipped:", error);
      } finally {
        if (isMounted) markHydrated(true);
      }
    }
    loadState();
    return () => {
      isMounted = false;
    };
  }, [authUser, performances]);

  async function loadPerformanceById(id) {
    if (!id) return;
    const result = await performances.getState({ performanceId: id });
    if (!result.ok) return;
    const normalized = normalizeState(result.state, DEFAULT_PERFORMERS);
    if (normalized) {
      applyNormalizedPerformanceState(normalized, { fallbackPerformanceId: id });
      return normalized.performanceType ?? "classic";
    }
    return null;
  }

  async function handleCreatePerformance(payload) {
    const type = payload?.type === "sabre-laser" ? "sabre-laser" : "classic";
    const defaultPerformers = DEFAULT_PERFORMERS.map((performer) => ({
      ...performer,
    }));
    const result = await performances.createPerformance({
      name: payload?.name,
      description: payload?.description,
      performers: defaultPerformers,
      type,
    });
    if (!result.ok || !result.performance?.id) return null;
    initializeNewPerformance({
      id: result.performance.id,
      name: result.performance.name,
      description: result.performance.description,
      type,
      performers: defaultPerformers,
    });
    return { id: result.performance.id, type };
  }

  async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    await login({ email, password });
  }

  async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    await register({ email, password, firstName, lastName });
  }

  async function handleLogout() {
    await logout();
    setPage("home");
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

  const isSabreList =
    page === "performances-sabre" || page === "performances-sabre-new";
  const autoOpenSabreCreate = page === "performances-sabre-new";
  const autoOpenCreate = page === "performances-new";

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
            className={`menu-item ${page === "performances" ? "is-active" : ""}`}
            onClick={() => {
              setPage("performances-new");
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
            className={`menu-item ${page === "performances" ? "is-active" : ""}`}
            onClick={() => {
              setPage("performances");
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
            performanceName={performanceName}
            performanceDescription={performanceDescription}
            performanceId={performanceId}
            stepsCount={activeSequence?.steps?.length ?? 0}
            performersCount={performers.length}
            onNavigate={setPage}
            onOpenPerformance={(id) => {
              if (!id) return;
              loadPerformanceById(id).then((type) => {
                if (!type) return;
                setPage(
                  type === "sabre-laser"
                    ? "performance-create-sabre"
                    : "performance-create"
                );
              });
            }}
          />
        ) : null}

        {page === "performances-new" ? (
          <PerformanceListPage
            apiBase={API_BASE}
            authToken={authToken}
            performanceId={performanceId}
            title="Créer un combat"
            subtitle="Choisis le type et démarre un combat."
            autoOpenCreate
            onSelectPerformance={loadPerformanceById}
            onCreatePerformance={handleCreatePerformance}
            onNavigate={setPage}
          />
        ) : null}

        {page === "performances" ? (
          <PerformanceListPage
            apiBase={API_BASE}
            authToken={authToken}
            performanceId={performanceId}
            title="Mes combats"
            subtitle="Tous les combats, regroupés par type."
            onSelectPerformance={loadPerformanceById}
            onCreatePerformance={handleCreatePerformance}
            onNavigate={setPage}
          />
        ) : null}

        {isSabreList ? (
          <PerformanceListPage
            apiBase={API_BASE}
            authToken={authToken}
            performanceId={performanceId}
            performanceType="sabre-laser"
            title="Combats sabre laser"
            subtitle="Crée, sélectionne et archive des combats sabre laser."
            autoOpenCreate={autoOpenSabreCreate}
            onSelectPerformance={loadPerformanceById}
            onCreatePerformance={handleCreatePerformance}
            onNavigate={setPage}
          />
        ) : null}

        {page === "performance-create" ? (
          <PerformanceFormPage
            performers={performers}
            form={form}
            performanceName={performanceName}
            performanceDescription={performanceDescription}
            sequences={sequences}
            activeSequenceId={activeSequenceId}
            activeSequence={activeSequence}
            stepsCount={activeSequence?.steps?.length ?? 0}
            performerLabels={performerLabels}
            normalizedLexicon={normalizedLexicon}
            lexiconByKey={{
              classic: normalizedLexicon,
              "classic-v2": normalizedNewLexicon,
            }}
            favorites={favorites}
            favoritesByLexicon={{
              classic: favorites,
              "classic-v2": newFavorites,
            }}
            lexiconKey={stepLexiconKey}
            isReadOnly={performanceShareRole === "read"}
            onPerformerCountChange={updatePerformerCount}
            onPerformerNameChange={updatePerformerName}
            onPerformerWeaponChange={updatePerformerWeapon}
            onFormChange={updateForm}
            onAddStep={addStep}
            onPerformanceNameChange={setPerformanceName}
            onPerformanceDescriptionChange={setPerformanceDescription}
            onCreateSequence={createSequence}
            onSelectSequence={selectSequence}
            onRenameSequence={renameSequence}
            onToggleSequencePerformerVisibility={
              toggleSequencePerformerVisibility
            }
            onMoveSequence={moveSequence}
            onMoveSequenceToIndex={moveSequenceToIndex}
            onDeleteSequence={deleteSequence}
            onEditStep={editStep}
            onRemoveStep={removeStep}
            onCancelEditStep={cancelEditStep}
            editingStepId={editingStepId}
            buildPerformerLabel={buildPerformerLabel}
            buildSummaryLine={buildSummaryLine}
            buildSummaryLines={buildSummaryLines}
            toggleAttribute={toggleAttribute}
            onNavigate={setPage}
            onUpdateStepPerformer={updateStepPerformer}
            onUpdateStepLexicon={updateStepLexicon}
            onResetForm={resetForm}
            insertStepIndex={insertStepIndex}
            onInsertStep={(index) =>
              startInsertStep(index, { resetLexicon: true })
            }
            insertionMode={insertionMode}
            onToggleInsertionMode={toggleInsertionMode}
            onInsertEmptyStep={insertEmptyStep}
            deletionMode={deletionMode}
            onToggleDeletionMode={toggleDeletionMode}
            onDeleteStep={removeStep}
            lexiconOptions={CLASSIC_LEXICON_OPTIONS}
          />
        ) : null}

        {page === "performance-create-sabre" ? (
          <PerformanceFormPage
            performers={performers}
            form={form}
            performanceName={performanceName}
            performanceDescription={performanceDescription}
            sequences={sequences}
            activeSequenceId={activeSequenceId}
            activeSequence={activeSequence}
            stepsCount={activeSequence?.steps?.length ?? 0}
            performerLabels={performerLabels}
            normalizedLexicon={normalizedSabreLexicon}
            lexiconKey="sabre-laser"
            favorites={sabreFavorites}
            labels={SABRE_UI_LABELS}
            favoriteTypeKeys={SABRE_FAVORITE_TYPE_KEYS}
            showParadeNumber={false}
            performerWeaponOptions={normalizedSabreLexicon.armes ?? []}
            isReadOnly={performanceShareRole === "read"}
            onPerformerCountChange={updatePerformerCount}
            onPerformerNameChange={updatePerformerName}
            onPerformerWeaponChange={updatePerformerWeapon}
            onFormChange={updateForm}
            onAddStep={addStep}
            onPerformanceNameChange={setPerformanceName}
            onPerformanceDescriptionChange={setPerformanceDescription}
            onCreateSequence={createSequence}
            onSelectSequence={selectSequence}
            onRenameSequence={renameSequence}
            onToggleSequencePerformerVisibility={
              toggleSequencePerformerVisibility
            }
            onMoveSequence={moveSequence}
            onMoveSequenceToIndex={moveSequenceToIndex}
            onDeleteSequence={deleteSequence}
            onEditStep={editStep}
            onRemoveStep={removeStep}
            onCancelEditStep={cancelEditStep}
            editingStepId={editingStepId}
            phaseOptions={normalizedSabreLexicon.phases ?? []}
            buildPerformerLabel={buildPerformerLabel}
            buildSummaryLine={buildSummaryLine}
            buildSummaryLines={buildSummaryLines}
            toggleAttribute={toggleAttribute}
            onNavigate={setPage}
            onUpdateStepPerformer={updateStepPerformer}
            onResetForm={resetForm}
            insertStepIndex={insertStepIndex}
            onInsertStep={startInsertStep}
            insertionMode={insertionMode}
            onToggleInsertionMode={toggleInsertionMode}
            onInsertEmptyStep={insertEmptyStep}
            deletionMode={deletionMode}
            onToggleDeletionMode={toggleDeletionMode}
            onDeleteStep={removeStep}
          />
        ) : null}

        {page === "performance-reader" ? (
          <PerformanceReaderPage
            performanceName={performanceName}
            performanceDescription={performanceDescription}
            performers={performers}
            sequences={sequences}
            resolveTermLabel={resolveAnyTermLabel}
            isReadOnly={performanceShareRole === "read"}
            onToggleSequencePerformerVisibility={
              toggleSequencePerformerVisibility
            }
            onNavigate={setPage}
          />
        ) : null}

        {page === "lexicon" ? (
          <LexiconPage
            apiBase={API_BASE}
            authToken={authToken}
            authUser={authUser}
            newFavorites={newFavorites}
            setNewFavorites={setNewFavorites}
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
      <div className="app-footer">
        <a
          href="https://github.com/adeline-t/escribe"
          target="_blank"
          rel="noreferrer"
          className="text-link"
        >
          github.com/adeline-t/escribe
        </a>
      </div>
    </div>
  );
}
