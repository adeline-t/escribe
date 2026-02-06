import { useEffect, useMemo, useState } from "react";
import CombatRow from "../components/combat/CombatRow.jsx";
import CombatShareModal from "../components/combat/CombatShareModal.jsx";

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
  const [exportingCombatId, setExportingCombatId] = useState(null);

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
        .then(async (response) => {
          if (!response.ok) {
            setShareError("Impossible de charger les utilisateurs.");
            return null;
          }
          return response.json().catch(() => ({}));
        })
        .then((payload) => {
          if (payload) setShareUsers(payload?.users ?? []);
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

  async function exportCombatPdfFromRow(combat, options = {}) {
    if (!combat || exportingCombatId) return;
    setExportingCombatId(combat.id);
    try {
      const response = await authFetch(`/api/combats/${combat.id}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.state) {
        setStatus("Export PDF impossible.");
        return;
      }
      const state = payload.state;
      const { exportCombatPdf } = await import("../lib/combatPdf.jsx");
      const { blob, fileName } = await exportCombatPdf(
        {
          name: state.combatName,
          description: state.combatDescription,
          participants: state.participants ?? [],
          phrases: state.phrases ?? []
        },
        options
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCombatId(null);
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
    const usersResponse = await authFetch(`/api/combats/share-users/all`);
    const usersPayload = await usersResponse.json().catch(() => ({}));
    if (usersResponse.ok) {
      setShareAllUsers(usersPayload.users ?? []);
    } else {
      setShareError(
        usersPayload?.error ? "Impossible de charger les utilisateurs." : "Erreur lors du chargement des utilisateurs."
      );
      setShareAllUsers([]);
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

  function CombatSection({ title, combats }) {
    return (
      <>
        <div className="section-card">
          <div className="text-bold text-lg">{title}</div>
          <div className="meta">
            {combats.length} combat{combats.length > 1 ? "s" : ""}
          </div>
        </div>
        {combats.map((combat) => (
          <CombatRow
            key={combat.id}
            combat={combat}
            isActive={combat.id === combatId}
            formatDate={formatDate}
            onOpenCombat={openCombat}
            onReadCombat={readCombat}
            onExportCombat={exportCombatPdfFromRow}
            onShare={openShareModal}
            onDelete={deleteCombat}
            isExporting={exportingCombatId === combat.id}
          />
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
          <h2 className="title">{title}</h2>
          <p className="meta text-muted">{subtitle}</p>
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
        <div className="empty">
          <div className="text-strong">Accès indisponible.</div>
          <div className="text-sm text-muted">
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
                <h3 className="subtitle">Créer un combat</h3>
                <p className="meta text-muted">
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
                {status && (
                  <div className="banner banner--error text-sm">{status}</div>
                )}
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

          <div className="panel mt-6">
            <div className="row-between">
              <div></div>
              <div className="row-actions">
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

            <div className="stack-2">
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
                  <CombatRow
                    key={combat.id}
                    combat={combat}
                    isActive={combat.id === combatId}
                    formatDate={formatDate}
                    onOpenCombat={openCombat}
                    onReadCombat={readCombat}
                    onExportCombat={exportCombatPdfFromRow}
                    onShare={openShareModal}
                    onDelete={deleteCombat}
                    isExporting={exportingCombatId === combat.id}
                  />
                ))
              )}
              {filteredCombats.length === 0 && (
                <div className="empty">
                  <div className="text-strong">Aucun combat.</div>
                  <div className="text-sm text-muted">
                    Crée un combat pour commencer.
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <CombatShareModal
        combat={shareCombat}
        shareLoading={shareLoading}
        shareError={shareError}
        shareList={shareList}
        shareRole={shareRole}
        shareSelectedUser={shareSelectedUser}
        shareAllUsers={shareAllUsers}
        shareQuery={shareQuery}
        shareUsers={shareUsers}
        onClose={() => setShareCombat(null)}
        onRequestRemoveShare={removeShare}
        onRoleChange={setShareRole}
        onSelectedUserChange={setShareSelectedUser}
        onAddShare={(userId) => addShare(userId)}
        onQueryChange={setShareQuery}
        onQuickAddShare={addShare}
      />
    </section>
  );
}
