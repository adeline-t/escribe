import { useEffect, useMemo, useState } from "react";
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
  DEFAULT_PARTICIPANTS,
  normalizeLexicon,
  normalizeNewLexicon,
  normalizeSabreLexicon,
} from "./lib/lexicon.js";
import {
  CLASSIC_LEXICON_OPTIONS,
  SABRE_FAVORITE_TYPE_KEYS,
  SABRE_UI_LABELS,
} from "./lib/combats.js";
import {
  buildParticipantLabel,
  normalizeState,
  toggleAttribute,
  buildSummaryLine,
  buildSummaryLines,
} from "./lib/participants.js";
import { useCombatStateManager } from "./hooks/useCombatStateManager.js";
import { useAppBootstrap } from "./hooks/useAppBootstrap.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";
const TOKEN_KEY = "escribe_token";
const FRONT_ENV =
  import.meta.env.VITE_ENVIRONMENT ?? import.meta.env.MODE ?? "";

export default function App() {
  const [page, setPage] = useState("home");
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
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
    lexiconData,
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
  const { combats } = services;
  const combatState = useCombatStateManager({
    isSaveEnabled: Boolean(authUser),
    saveState: (state) => combats.saveState(state),
  });
  const {
    participants,
    phrases,
    activePhraseId,
    form,
    editingStepId,
    insertStepIndex,
    insertionMode,
    deletionMode,
    combatId,
    combatName,
    combatDescription,
    combatType,
    combatShareRole,
    stepLexiconKey,
    participantLabels,
    activePhrase,
    setCombatName,
    setCombatDescription,
    applyNormalizedCombatState,
    initializeNewCombat,
    markHydrated,
    updateParticipantName,
    updateParticipantWeapon,
    updateParticipantCount,
    updateForm,
    updateStepParticipant,
    updateStepLexicon,
    resetForm,
    addStep,
    insertEmptyStep,
    removeStep,
    editStep,
    cancelEditStep,
    selectPhrase,
    togglePhraseParticipantVisibility,
    createPhrase,
    renamePhrase,
    movePhrase,
    movePhraseToIndex,
    deletePhrase,
    startInsertStep,
    toggleInsertionMode,
    toggleDeletionMode,
  } = combatState;

  const normalizedLexicon = useMemo(
    () => normalizeLexicon(lexiconData),
    [lexiconData],
  );

  const normalizedNewLexicon = useMemo(
    () => normalizeNewLexicon(newLexiconData),
    [newLexiconData],
  );

  const normalizedSabreLexicon = useMemo(
    () => normalizeSabreLexicon(sabreLexiconData),
    [sabreLexiconData],
  );

  useEffect(() => {
    let isMounted = true;
    async function loadState() {
      try {
        if (!authUser) return;
        const stateResult = await combats.getState();
        if (!stateResult.ok) throw new Error("Failed to load state");
        const normalized = normalizeState(
          stateResult.state,
          DEFAULT_PARTICIPANTS,
        );
        if (isMounted && normalized) {
          applyNormalizedCombatState(normalized);
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
  }, [authUser, combats]);

  async function loadCombatById(id) {
    if (!id) return;
    const result = await combats.getState({ combatId: id });
    if (!result.ok) return;
    const normalized = normalizeState(result.state, DEFAULT_PARTICIPANTS);
    if (normalized) {
      applyNormalizedCombatState(normalized, { fallbackCombatId: id });
      return normalized.combatType ?? "classic";
    }
    return null;
  }

  async function handleCreateCombat(payload) {
    const type = payload?.type === "sabre-laser" ? "sabre-laser" : "classic";
    const defaultParticipants = DEFAULT_PARTICIPANTS.map((participant) => ({
      ...participant,
    }));
    const result = await combats.createCombat({
      name: payload?.name,
      description: payload?.description,
      participants: defaultParticipants,
      type,
    });
    if (!result.ok || !result.combat?.id) return null;
    initializeNewCombat({
      id: result.combat.id,
      name: result.combat.name,
      description: result.combat.description,
      type,
      participants: defaultParticipants,
    });
    return { id: result.combat.id, type };
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
            onTogglePhraseParticipantVisibility={
              togglePhraseParticipantVisibility
            }
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
            lexiconKey="sabre-laser"
            favorites={sabreFavorites}
            labels={SABRE_UI_LABELS}
            favoriteTypeKeys={SABRE_FAVORITE_TYPE_KEYS}
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
            onTogglePhraseParticipantVisibility={
              togglePhraseParticipantVisibility
            }
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

        {page === "overview" ? (
          <CombatReaderPage
            combatName={combatName}
            combatDescription={combatDescription}
            participants={participants}
            phrases={phrases}
            isReadOnly={combatShareRole === "read"}
            onTogglePhraseParticipantVisibility={
              togglePhraseParticipantVisibility
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
