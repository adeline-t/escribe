import { useEffect, useMemo, useState } from "react";
import { FaTrash, FaShareNodes } from "react-icons/fa6";

export default function CombatListPage({
  apiBase,
  authToken,
  combatId,
  combatType = null,
  title = "Mes combats",
  subtitle = "Crée et sélectionne des combats.",
  autoOpenCreate = false,
  onSelectCombat,
  onCreateCombat,
  onNavigate,
}) {
  const [combats, setCombats] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draftType, setDraftType] = useState("classic");
  const [status, setStatus] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [shareCombat, setShareCombat] = useState(null);
  const [shareList, setShareList] = useState([]);
  const [shareQuery, setShareQuery] = useState("");
  const [shareUsers, setShareUsers] = useState([]);
  const [shareAllUsers, setShareAllUsers] = useState([]);
  const [shareSelectedUser, setShareSelectedUser] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareRole, setShareRole] = useState("read");

  // ==================== UTILITY FUNCTIONS ====================

  function buildDefaultTitle() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    return `Combat du ${day}-${month}-${year}`;
  }

  function authFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return fetch(`${apiBase}${path}`, { ...options, headers });
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString("fr-FR");
    } catch {
      return value;
    }
  }

  // ==================== DATA LOADING ====================

  async function loadCombats(signal) {
    const typeQuery = combatType
      ? `&type=${encodeURIComponent(combatType)}`
      : "";
    const response = await authFetch(`/api/combats?archived=0${typeQuery}`, {
      signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setAccessDenied(false);
      setCombats(payload.combats ?? []);
    } else if (response.status === 401) {
      setAccessDenied(true);
      setCombats([]);
      setStatus("");
    }
  }

  // ==================== EFFECTS ====================

  useEffect(() => {
    const controller = new AbortController();
    loadCombats(controller.signal).catch(() => null);
    return () => controller.abort();
  }, [combatType]);

  useEffect(() => {
    if (autoOpenCreate) {
      setIsCreateOpen(true);
    }
  }, [autoOpenCreate]);

  useEffect(() => {
    if (!shareCombat || !shareQuery.trim()) {
      setShareUsers([]);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(() => {
      authFetch(
        `/api/combats/share-users?query=${encodeURIComponent(shareQuery.trim())}`,
        {
          signal: controller.signal,
        },
      )
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          setShareUsers(payload?.users ?? []);
        })
        .catch(() => null);
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [shareCombat, shareQuery]);

  useEffect(() => {
    if (combatType) {
      setDraftType(combatType);
    }
  }, [combatType]);

  // ==================== COMPUTED VALUES ====================

  const filteredCombats = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? combats.filter((combat) => combat.name.toLowerCase().includes(query))
      : combats;
    const sorted = [...list];
    if (sort === "recent") {
      sorted.sort((a, b) =>
        (b.updatedAt || "").localeCompare(a.updatedAt || ""),
      );
    } else if (sort === "old") {
      sorted.sort((a, b) =>
        (a.updatedAt || "").localeCompare(b.updatedAt || ""),
      );
    } else if (sort === "az") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    } else if (sort === "za") {
      sorted.sort((a, b) => b.name.localeCompare(a.name, "fr"));
    }
    return sorted;
  }, [combats, search, sort]);

  const groupedCombats = useMemo(() => {
    if (combatType) {
      return {
        classic: filteredCombats,
        sabre: [],
      };
    }
    return {
      classic: filteredCombats.filter(
        (combat) => (combat.type ?? "classic") === "classic",
      ),
      sabre: filteredCombats.filter(
        (combat) => (combat.type ?? "classic") === "sabre-laser",
      ),
    };
  }, [filteredCombats, combatType]);

  // ==================== HANDLERS ====================

  async function createCombat() {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("Ajoute un nom pour créer le combat.");
      return;
    }
    if (accessDenied) return;
    setStatus("");
    const created = await onCreateCombat({
      name: trimmed,
      description,
      type: draftType,
    });
    if (created?.type && onNavigate) {
      setIsCreateOpen(false);
      onNavigate(created.type === "sabre-laser" ? "create-sabre" : "create");
      return;
    }
    setStatus("Création impossible.");
  }

  async function openCombat(id, type) {
    const resolvedType = (await onSelectCombat(id)) ?? type ?? combatType;
    if (resolvedType && onNavigate) {
      onNavigate(resolvedType === "sabre-laser" ? "create-sabre" : "create");
    }
  }

  async function readCombat(id) {
    const resolvedType = await onSelectCombat(id);
    if (resolvedType && onNavigate) {
      onNavigate("overview");
    }
  }

  async function deleteCombat(id) {
    await authFetch(`/api/combats/${id}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    await loadCombats();
  }

  async function openShareModal(combat) {
    setShareCombat(combat);
    setShareError("");
    setShareQuery("");
    setShareUsers([]);
    setShareAllUsers([]);
    setShareSelectedUser("");
    setShareRole("read");
    setShareLoading(true);
    const response = await authFetch(`/api/combats/${combat.id}/shares`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setShareError("Impossible de charger les partages.");
      setShareList([]);
    } else {
      setShareList(payload.shares ?? []);
    }
    const usersResponse = await authFetch(`/api/combats/share-users?all=1`);
    const usersPayload = await usersResponse.json().catch(() => ({}));
    if (usersResponse.ok) {
      setShareAllUsers(usersPayload.users ?? []);
    }
    setShareLoading(false);
  }

  async function addShare(userId) {
    if (!shareCombat) return;
    if (!userId) return;
    setShareError("");
    const response = await authFetch(`/api/combats/${shareCombat.id}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: shareRole }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setShareError("Impossible d'ajouter le partage.");
      return;
    }
    setShareList(payload.shares ?? []);
    setShareQuery("");
    setShareUsers([]);
    setShareSelectedUser("");
  }

  async function removeShare(userId) {
    if (!shareCombat) return;
    const response = await authFetch(`/api/combats/${shareCombat.id}/shares`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setShareError("Impossible de retirer le partage.");
      return;
    }
    setShareList(payload.shares ?? []);
  }

  // ==================== RENDER HELPERS ====================

  function CombatRow({ combat, layout = "grouped" }) {
    const isActive = combat.id === combatId;

    if (layout === "simple") {
      return (
        <div className={`combat-row ${isActive ? "is-active" : ""}`}>
          <div className="combat-details">
            <div className="combat-details__top">
              <div className="combat-details__id">#{combat.id}</div>
              <div className="combat-details__name">{combat.name}</div>
              <div className="combat-details__meta">
                {combat.participantsCount} combattant
                {combat.participantsCount > 1 ? "s" : ""}
              </div>
            </div>
            <div className="combat-details">
              <div className="combat-details__date">
                {formatDate(combat.createdAt)}
              </div>
              <div className="combat-details__meta">
                {combat.phraseCount} phrase
                {combat.phraseCount > 1 ? "s" : ""}
              </div>
            </div>
            <div className="combat-details">
              <div className="combat-details__actions">
                <button
                  type="button"
                  className="chip"
                  onClick={() => openCombat(combat.id, combat.type)}
                >
                  Ouvrir
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => readCombat(combat.id)}
                >
                  Lire
                </button>
                {combat.isOwner ? (
                  <>
                    <button
                      type="button"
                      className="chip icon-button"
                      onClick={() => openShareModal(combat)}
                      aria-label="Partager le combat"
                      title="Partager"
                    >
                      <FaShareNodes />
                    </button>
                    <button
                      type="button"
                      className="chip chip--danger icon-button"
                      onClick={() => deleteCombat(combat.id)}
                      aria-label="Supprimer le combat"
                      title="Supprimer"
                    >
                      <FaTrash />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`combat-row ${isActive ? "is-active" : ""}`}>
        <div className="combat-details">
          <div className="combat-details__top">
            <div className="combat-details__id">#{combat.id}</div>
            <div className="combat-details__name">{combat.name}</div>
            <div className="combat-details__meta">
              {combat.participantsCount} combattant
              {combat.participantsCount > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="combat-details">
          <div className="combat-details__date">
            {formatDate(combat.createdAt)}
          </div>
          <div className="combat-details__meta">
            {combat.phraseCount} phrase
            {combat.phraseCount > 1 ? "s" : ""}
          </div>
        </div>
        <div className="combat-details">
          <div className="combat-details__actions">
            <button
              type="button"
              className="chip"
              onClick={() => openCombat(combat.id, combat.type)}
            >
              Ouvrir
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => readCombat(combat.id)}
            >
              Lire
            </button>
            {combat.isOwner ? (
              <>
                <button
                  type="button"
                  className="chip icon-button"
                  onClick={() => openShareModal(combat)}
                  aria-label="Partager le combat"
                  title="Partager"
                >
                  <FaShareNodes />
                </button>
                <button
                  type="button"
                  className="chip chip--danger icon-button"
                  onClick={() => deleteCombat(combat.id)}
                  aria-label="Supprimer le combat"
                  title="Supprimer"
                >
                  <FaTrash />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  function CombatSection({ title, combats }) {
    return (
      <>
        <div className="lexicon-section">
          <div className="lexicon-title">{title}</div>
          <div className="lexicon-subtitle">
            {combats.length} combat{combats.length > 1 ? "s" : ""}
          </div>
        </div>
        {combats.map((combat) => (
          <CombatRow key={combat.id} combat={combat} layout="grouped" />
        ))}
      </>
    );
  }

  // ==================== MAIN RENDER ====================

  const creationTypeLabel =
    combatType === "sabre-laser" ? "sabre laser" : "escrime";

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
        {!accessDenied && (
          <button
            type="button"
            onClick={() => {
              setStatus("");
              setIsCreateOpen(true);
            }}
          >
            Nouveau combat
          </button>
        )}
      </div>

      {accessDenied ? (
        <div className="lexicon-empty">
          <div className="lexicon-empty__title">Accès indisponible.</div>
          <div className="lexicon-empty__subtitle">
            Vous n'avez pas les droits pour voir les combats.
          </div>
        </div>
      ) : (
        <>
          {isCreateOpen && (
            <div
              className="modal-backdrop"
              role="presentation"
              onClick={() => setIsCreateOpen(false)}
            >
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label="Créer un combat"
                onClick={(event) => event.stopPropagation()}
              >
                <h3>Créer un combat</h3>
                <p className="muted">
                  Saisis un nom pour démarrer le combat
                  {combatType ? ` (${creationTypeLabel})` : ""}.
                </p>
                {!combatType && (
                  <label>
                    Type de combat
                    <select
                      value={draftType}
                      onChange={(event) => setDraftType(event.target.value)}
                    >
                      <option value="classic">Escrime</option>
                      <option value="sabre-laser">Sabre laser</option>
                    </select>
                  </label>
                )}
                <label>
                  Nom du combat
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nom du combat"
                    autoFocus
                  />
                </label>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    setName(buildDefaultTitle());
                    setStatus("");
                  }}
                >
                  Titre par défaut {`( ${buildDefaultTitle()} )`}
                </button>
                <label>
                  Description (optionnel)
                  <input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Notes, contexte, etc."
                  />
                </label>
                {status && <div className="lexicon-error">{status}</div>}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="chip"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Annuler
                  </button>
                  <button type="button" onClick={createCombat}>
                    Créer le combat
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="panel" style={{ marginTop: "20px" }}>
            <div className="lexicon-header">
              <div></div>
              <div className="lexicon-actions">
                <input
                  value={search}
                  placeholder="Rechercher un combat..."
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="recent">Récent</option>
                  <option value="old">Ancien</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                </select>
              </div>
            </div>

            <div className="lexicon-table">
              {!combatType ? (
                <>
                  <CombatSection
                    title="Escrime"
                    combats={groupedCombats.classic}
                  />
                  <CombatSection
                    title="Sabre laser"
                    combats={groupedCombats.sabre}
                  />
                </>
              ) : (
                filteredCombats.map((combat) => (
                  <CombatRow key={combat.id} combat={combat} layout="simple" />
                ))
              )}
              {filteredCombats.length === 0 && (
                <div className="lexicon-empty">
                  <div className="lexicon-empty__title">Aucun combat.</div>
                  <div className="lexicon-empty__subtitle">
                    Crée un combat pour commencer.
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {shareCombat ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShareCombat(null)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Partager le combat"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Partager le combat</h3>
            <p className="muted">{shareCombat.name}</p>
            {shareLoading ? <div className="muted">Chargement...</div> : null}
            {shareError ? (
              <div className="lexicon-error">{shareError}</div>
            ) : null}

            <div className="share-section">
              <div className="lexicon-title">Partagé avec</div>
              <div className="share-list">
                {shareList.map((item) => (
                  <div key={item.user_id} className="share-row">
                    <div>
                      <div className="share-name">
                        {item.first_name || item.last_name
                          ? `${item.first_name || ""} ${item.last_name || ""}`.trim()
                          : item.email}
                      </div>
                      <div className="muted">
                        {item.email} ·{" "}
                        {item.role === "write"
                          ? "Lecture + écriture"
                          : "Lecture seule"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="chip chip--danger"
                      onClick={() => removeShare(item.user_id)}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                {shareList.length === 0 && !shareLoading ? (
                  <div className="muted">Aucun partage.</div>
                ) : null}
              </div>
            </div>

            <div className="share-section">
              <div className="lexicon-title">Ajouter un partage</div>
              <label>
                Droits
                <select
                  value={shareRole}
                  onChange={(event) => setShareRole(event.target.value)}
                >
                  <option value="read">Lecture seule</option>
                  <option value="write">Lecture + écriture</option>
                </select>
              </label>
              <label>
                Utilisateur
                <select
                  value={shareSelectedUser}
                  onChange={(event) => setShareSelectedUser(event.target.value)}
                >
                  <option value="">Choisir un utilisateur</option>
                  {shareAllUsers
                    .filter(
                      (user) =>
                        !shareList.some((item) => item.user_id === user.id),
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
                className="chip"
                onClick={() => addShare(Number(shareSelectedUser))}
                disabled={!shareSelectedUser}
              >
                Ajouter l'utilisateur
              </button>
              <input
                value={shareQuery}
                onChange={(event) => setShareQuery(event.target.value)}
                placeholder="Rechercher un utilisateur..."
              />
              <div className="share-users">
                {shareUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="chip"
                    onClick={() => addShare(user.id)}
                  >
                    {user.first_name || user.last_name
                      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                      : user.email}
                  </button>
                ))}
                {shareQuery && shareUsers.length === 0 ? (
                  <div className="muted">Aucun utilisateur.</div>
                ) : null}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="chip"
                onClick={() => setShareCombat(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
