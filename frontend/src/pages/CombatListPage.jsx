import { useEffect, useMemo, useState } from "react";

export default function CombatListPage({
  apiBase,
  authToken,
  combatId,
  combatType = "classic",
  title = "Liste des combats",
  subtitle = "Crée et sélectionne des combats.",
  autoOpenCreate = false,
  onSelectCombat,
  onCreateCombat,
  onNavigate,
}) {
  const [combats, setCombats] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  async function loadCombats(signal) {
    const typeQuery = combatType
      ? `&type=${encodeURIComponent(combatType)}`
      : "";
    const response = await authFetch(
      `/api/combats?archived=${includeArchived ? "1" : "0"}${typeQuery}`,
      { signal },
    );
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

  useEffect(() => {
    const controller = new AbortController();
    loadCombats(controller.signal).catch(() => null);
    return () => controller.abort();
  }, [includeArchived, combatType]);

  useEffect(() => {
    if (autoOpenCreate) {
      setIsCreateOpen(true);
    }
  }, [autoOpenCreate]);

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

  async function createCombat() {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("Ajoute un nom pour créer le combat.");
      return;
    }
    if (accessDenied) return;
    setStatus("");
    await onCreateCombat({ name: trimmed, description, type: combatType });
    setName("");
    setDescription("");
    setIsCreateOpen(false);
    await loadCombats();
  }

  async function toggleArchive(id, archived) {
    await authFetch(`/api/combats/${id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    await loadCombats();
  }

  async function openCombat(id, type) {
    const resolvedType = (await onSelectCombat(id)) ?? type ?? combatType;
    if (resolvedType && onNavigate) {
      onNavigate(resolvedType === "sabre-laser" ? "create-sabre" : "create");
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
        {!accessDenied ? (
          <button
            type="button"
            onClick={() => {
              setStatus("");
              setIsCreateOpen(true);
            }}
          >
            Nouveau combat
          </button>
        ) : null}
      </div>

      {accessDenied ? (
        <div className="lexicon-empty">
          <div className="lexicon-empty__title">Accès indisponible.</div>
          <div className="lexicon-empty__subtitle">
            Vous n’avez pas les droits pour voir les combats.
          </div>
        </div>
      ) : (
        <>
          {isCreateOpen ? (
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
                <p className="muted">Saisis un nom pour démarrer le combat.</p>
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
                {status ? <div className="lexicon-error">{status}</div> : null}
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
          ) : null}

          <div className="panel" style={{ marginTop: "20px" }}>
            <div className="lexicon-header">
              <div>
                <div className="lexicon-title">Tous les combats</div>
                <div className="lexicon-subtitle">
                  {filteredCombats.length} combat
                  {filteredCombats.length > 1 ? "s" : ""}
                </div>
              </div>
              <div className="lexicon-actions">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(event) =>
                      setIncludeArchived(event.target.checked)
                    }
                  />
                  Inclure les archivés
                </label>
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
              {filteredCombats.map((combat) => (
                <div
                  key={combat.id}
                  className={`lexicon-row combat-row ${combat.id === combatId ? "is-active" : ""}`}
                >
                  <div className="lexicon-row__label">{combat.name}</div>
                  <div className="lexicon-row__meta">
                    {combat.participantsCount} combattant
                    {combat.participantsCount > 1 ? "s" : ""} ·{" "}
                    {combat.phraseCount} phrase
                    {combat.phraseCount > 1 ? "s" : ""}
                  </div>
                  <div className="lexicon-row__meta">
                    {combat.archived ? "Archivé" : "Actif"}
                  </div>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => openCombat(combat.id, combat.type)}
                  >
                    Ouvrir
                  </button>
                  <button
                    type="button"
                    className="chip chip--danger"
                    onClick={() => toggleArchive(combat.id, !combat.archived)}
                  >
                    {combat.archived ? "Désarchiver" : "Archiver"}
                  </button>
                </div>
              ))}
              {filteredCombats.length === 0 ? (
                <div className="lexicon-empty">
                  <div className="lexicon-empty__title">Aucun combat.</div>
                  <div className="lexicon-empty__subtitle">
                    Crée un combat pour commencer.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
