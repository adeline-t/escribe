import { useEffect, useMemo, useState } from "react";
import { LEXICON_TYPES } from "../lib/lexicon.js";

export default function LexiconPage({ apiBase, authToken, authUser }) {
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
