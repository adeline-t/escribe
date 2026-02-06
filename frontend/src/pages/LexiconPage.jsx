import { useEffect, useMemo, useState } from "react";
import { LEXICON_TYPES, SABRE_LEXICON_TYPES } from "../lib/lexicon.js";
import ConfirmDeleteModal from "../components/modals/ConfirmDeleteModal.jsx";

export default function LexiconPage({
  apiBase,
  authToken,
  authUser,
  favorites,
  setFavorites,
  sabreFavorites,
  setSabreFavorites,
}) {
  const [lexiconKey, setLexiconKey] = useState(() => {
    try {
      return localStorage.getItem("escribe_lexicon_mode") || "classic";
    } catch {
      return "classic";
    }
  });
  const lexiconTypes =
    lexiconKey === "sabre-laser" ? SABRE_LEXICON_TYPES : LEXICON_TYPES;
  const [activeType, setActiveType] = useState(lexiconTypes[0]?.key ?? "");
  const [scope, setScope] = useState("global");
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [view, setView] = useState("all");
  const [error, setError] = useState("");
  const [localFavorites, setLocalFavorites] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  const activeLabel = useMemo(
    () => lexiconTypes.find((type) => type.key === activeType)?.label ?? "",
    [activeType, lexiconTypes],
  );

  function authFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return fetch(`${apiBase}${path}`, { ...options, headers });
  }

  const canEditGlobal =
    authUser && ["admin", "superadmin"].includes(authUser.role);
  const isGlobalScope = scope === "global";
  const canEdit = isGlobalScope ? canEditGlobal : scope === "personal";
  const favoritesSource =
    lexiconKey === "classic" ? favorites : (sabreFavorites ?? localFavorites);
  const favoriteSet = useMemo(
    () => new Set(favoritesSource?.[activeType] ?? []),
    [favoritesSource, activeType],
  );

  async function loadType(signal) {
    if (!activeType) return;
    setLoading(true);
    setError("");
    try {
      if (scope === "all") {
        const [globalResponse, personalResponse] = await Promise.all([
          authFetch(`/api/lexicon/${activeType}?lexicon=${lexiconKey}`, {
            signal,
          }),
          authFetch(
            `/api/lexicon/personal/${activeType}?lexicon=${lexiconKey}`,
            { signal },
          ),
        ]);
        const globalPayload = await globalResponse.json().catch(() => ({}));
        const personalPayload = await personalResponse.json().catch(() => ({}));
        const merged = new Map();
        (personalPayload.items ?? []).forEach((item) => {
          merged.set(item.label, item);
        });
        (globalPayload.items ?? []).forEach((item) => {
          if (!merged.has(item.label)) merged.set(item.label, item);
        });
        setItems(Array.from(merged.values()));
      } else {
        const path =
          scope === "personal"
            ? `/api/lexicon/personal/${activeType}?lexicon=${lexiconKey}`
            : `/api/lexicon/${activeType}?lexicon=${lexiconKey}`;
        const response = await authFetch(path, { signal });
        const payload = await response.json().catch(() => ({}));
        setItems(payload.items ?? []);
      }
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
  }, [apiBase, activeType, scope, lexiconKey]);

  useEffect(() => {
    if (!authUser) return;
    const controller = new AbortController();
    authFetch(`/api/lexicon/favorites?lexicon=${lexiconKey}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload?.favorites) return;
        if (lexiconKey === "classic") {
          setFavorites?.(payload.favorites);
        } else if (setSabreFavorites) {
          setSabreFavorites(payload.favorites);
        } else {
          setLocalFavorites(payload.favorites);
        }
      })
      .catch(() => null);
    return () => controller.abort();
  }, [apiBase, authUser, lexiconKey, setFavorites]);

  useEffect(() => {
    setActiveType(lexiconTypes[0]?.key ?? "");
    setScope("global");
    setView("all");
    setSearch("");
  }, [lexiconKey, lexiconTypes]);

  useEffect(() => {
    try {
      localStorage.setItem("escribe_lexicon_mode", lexiconKey);
    } catch {
      // ignore
    }
  }, [lexiconKey]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = query
      ? items.filter((item) => item.label.toLowerCase().includes(query))
      : items;
    if (view === "favorites") {
      list = list.filter((item) => favoriteSet.has(item.label));
    }
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
  }, [items, search, sort, view, favoriteSet]);

  async function addItem() {
    const label = draft.trim();
    if (!label) return;
    if (!canEdit) {
      return;
    }
    setError("");
    const path =
      scope === "personal"
        ? `/api/lexicon/personal/${activeType}?lexicon=${lexiconKey}`
        : `/api/lexicon/${activeType}?lexicon=${lexiconKey}`;
    const response = await authFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
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
      return;
    }
    const path =
      scope === "personal"
        ? `/api/lexicon/personal/${activeType}?lexicon=${lexiconKey}`
        : `/api/lexicon/${activeType}?lexicon=${lexiconKey}`;
    const response = await authFetch(path, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function toggleFavorite(label) {
    if (!authUser) return;
    const next = !favoriteSet.has(label);
    const response = await authFetch("/api/lexicon/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: activeType,
        label,
        favorite: next,
        lexicon: lexiconKey,
      }),
    });
    if (!response.ok) return;
    const updateFavorites = (prev) => {
      const copy = { ...(prev || {}) };
      const list = new Set(copy[activeType] ?? []);
      if (next) {
        list.add(label);
      } else {
        list.delete(label);
      }
      copy[activeType] = Array.from(list);
      return copy;
    };
    if (lexiconKey === "classic") {
      setFavorites?.(updateFavorites);
    } else if (setSabreFavorites) {
      setSabreFavorites(updateFavorites);
    } else {
      setLocalFavorites(updateFavorites);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="title">Atelier de lexique</h2>
          <p className="meta text-muted">
            Organise et enrichis les catégories en un clic.
          </p>
        </div>
        <span className="meta text-muted">
          {loading ? "Chargement..." : "Données en base D1"}
        </span>
      </div>

      <div className="card stack-3">
        <div className="stack-3 mb-2">
          <div className="kicker">Base lexicale</div>
          <div className="segmented segmented--outline segmented--compact">
            <button
              type="button"
              className={`segmented-button ${lexiconKey === "classic" ? "is-active" : ""}`}
              onClick={() => setLexiconKey("classic")}
            >
              Escrime
            </button>
            <button
              type="button"
              className={`segmented-button ${lexiconKey === "sabre-laser" ? "is-active" : ""}`}
              onClick={() => setLexiconKey("sabre-laser")}
            >
              Sabre laser
            </button>
          </div>
        </div>
        <div className="split-layout">
          <aside className="card sidebar-sticky">
            <div className="kicker">Catégories</div>
            <div className="stack-2">
              {lexiconTypes.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  className={`tab-button ${activeType === type.key ? "is-active" : ""}`}
                  onClick={() => setActiveType(type.key)}
                >
                  <span>{type.label}</span>
                  <span className="meta">
                    {type.key === activeType ? items.length : ""}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="stack-4">
            <div className="row-between">
              <div>
                <div className="text-bold text-lg">{activeLabel}</div>
                <div className="meta">
                  {items.length} entrée{items.length > 1 ? "s" : ""}
                </div>
              </div>
              <div className="row-actions">
                <div className="segmented segmented--ghost">
                  <button
                    type="button"
                    className={`segmented-button ${scope === "all" ? "is-active" : ""}`}
                    onClick={() => setScope("all")}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    className={`segmented-button ${scope === "global" ? "is-active" : ""}`}
                    onClick={() => setScope("global")}
                  >
                    Global
                  </button>
                  <button
                    type="button"
                    className={`segmented-button ${scope === "personal" ? "is-active" : ""}`}
                    onClick={() => setScope("personal")}
                  >
                    Personnel
                  </button>
                </div>
                <div className="segmented segmented--ghost">
                  <button
                    type="button"
                    className={`segmented-button ${view === "all" ? "is-active" : ""}`}
                    onClick={() => setView("all")}
                  >
                    Tout
                  </button>
                  <button
                    type="button"
                    className={`segmented-button ${view === "favorites" ? "is-active" : ""}`}
                    onClick={() => setView("favorites")}
                  >
                    Favoris
                  </button>
                </div>
                <input
                  value={search}
                  placeholder="Chercher une entrée..."
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                  <option value="new">Récent</option>
                  <option value="old">Ancien</option>
                </select>
              </div>
            </div>

            {canEdit ? (
              <div className="input-row">
                <input
                  value={draft}
                  placeholder={`Ajouter ${activeLabel.toLowerCase()}`}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="button" onClick={addItem}>
                  Ajouter
                </button>
              </div>
            ) : null}
            {error ? (
              <div className="banner banner--error text-sm">{error}</div>
            ) : null}

            <div className="stack-2 lexicon-list">
              {filteredItems.map((item) => (
                <div key={item.id} className="row-card row-grid-4">
                  <div className="meta">#{item.id}</div>
                  <div className="text-strong">{item.label}</div>
                  <button
                    type="button"
                    className={`chip ${favoriteSet.has(item.label) ? "chip--active" : ""}`}
                    onClick={() => toggleFavorite(item.label)}
                  >
                    {favoriteSet.has(item.label) ? "★ Favori" : "☆ Favori"}
                  </button>
                {canEdit ? (
                  <button
                    type="button"
                    className="chip chip--danger"
                    onClick={() =>
                      setPendingDelete({ id: item.id, label: item.label })
                    }
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
            ))}
              {filteredItems.length === 0 ? (
                <div className="empty">
                  <div className="text-strong">Aucune valeur trouvée.</div>
                  <div className="text-sm text-muted">
                    Essaie un autre filtre ou ajoute une nouvelle entrée.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <ConfirmDeleteModal
            isOpen={!!pendingDelete}
            title="Supprimer l'entrée"
            message={
              pendingDelete
                ? `Supprimer définitivement « ${pendingDelete.label} » ?`
                : ""
            }
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => {
              if (!pendingDelete) return;
              deleteItem(pendingDelete.id);
              setPendingDelete(null);
            }}
          />
        </div>
      </div>
    </section>
  );
}
