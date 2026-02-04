import { useEffect, useMemo, useState } from "react";
import { LEXICON_TYPES } from "../lib/lexicon.js";

export default function LexiconPage({ apiBase, authToken, authUser, favorites, setFavorites }) {
  const [activeType, setActiveType] = useState(LEXICON_TYPES[0]?.key ?? "");
  const [scope, setScope] = useState("global");
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [view, setView] = useState("all");
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
  const favoriteSet = useMemo(
    () => new Set(favorites?.[activeType] ?? []),
    [favorites, activeType]
  );

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
  }, [items, search, sort]);

  async function addItem() {
    const label = draft.trim();
    if (!label) return;
    if (!canEdit) {
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

  async function toggleFavorite(label) {
    if (!authUser) return;
    const next = !favoriteSet.has(label);
    const response = await authFetch("/api/lexicon/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activeType, label, favorite: next })
    });
    if (!response.ok) return;
    setFavorites((prev) => {
      const copy = { ...(prev || {}) };
      const list = new Set(copy[activeType] ?? []);
      if (next) {
        list.add(label);
      } else {
        list.delete(label);
      }
      copy[activeType] = Array.from(list);
      return copy;
    });
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
              <div className="segmented segmented--small">
                <button
                  type="button"
                  className={`segmented__item ${view === "all" ? "is-active" : ""}`}
                  onClick={() => setView("all")}
                >
                  Tout
                </button>
                <button
                  type="button"
                  className={`segmented__item ${view === "favorites" ? "is-active" : ""}`}
                  onClick={() => setView("favorites")}
                >
                  Favoris
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

          {canEdit ? (
            <div className="lexicon-add">
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
          {error ? <div className="lexicon-error">{error}</div> : null}

          <div className="lexicon-table">
            {filteredItems.map((item) => (
              <div key={item.id} className="lexicon-row">
                <div className="lexicon-row__label">{item.label}</div>
                <div className="lexicon-row__meta">#{item.id}</div>
                <button
                  type="button"
                  className={`chip ${favoriteSet.has(item.label) ? "chip--active" : ""}`}
                  onClick={() => toggleFavorite(item.label)}
                >
                  {favoriteSet.has(item.label) ? "★ Favori" : "☆ Favori"}
                </button>
                {canEdit ? (
                  <button type="button" className="chip chip--danger" onClick={() => deleteItem(item.id)}>
                    Supprimer
                  </button>
                ) : null}
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
