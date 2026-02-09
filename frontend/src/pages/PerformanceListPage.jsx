import { useEffect, useMemo, useState } from "react";
import PerformanceRow from "../components/performance/PerformanceRow.jsx";
import PerformanceShareModal from "../components/performance/PerformanceShareModal.jsx";
import ConfirmDeleteModal from "../components/modals/ConfirmDeleteModal.jsx";
import { useWorkerServices } from "../hooks/useWorkerServices.js";

export default function PerformanceListPage({
  apiBase,
  authToken,
  performanceId,
  performanceType = null,
  title = "Mes combats",
  subtitle = "Crée et sélectionne des combats.",
  autoOpenCreate = false,
  onSelectPerformance,
  onCreatePerformance,
  onNavigate,
}) {
  const [performances, setPerformances] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draftType, setDraftType] = useState("classic");
  const [status, setStatus] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sharePerformance, setSharePerformance] = useState(null);
  const [shareList, setShareList] = useState([]);
  const [shareQuery, setShareQuery] = useState("");
  const [shareUsers, setShareUsers] = useState([]);
  const [shareAllUsers, setShareAllUsers] = useState([]);
  const [shareSelectedUser, setShareSelectedUser] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareRole, setShareRole] = useState("read");
  const [exportingPerformanceId, setExportingPerformanceId] = useState(null);
  const [pendingPerformanceDelete, setPendingPerformanceDelete] = useState(null);
  const { performances: performanceService } = useWorkerServices(
    apiBase,
    authToken,
  );

  // ==================== UTILITY FUNCTIONS ====================

  function buildDefaultTitle() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    return `Combat du ${day}-${month}-${year}`;
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

  async function loadPerformances(signal) {
    const result = await performanceService.listPerformances({
      archived: 0,
      type: performanceType,
      signal,
    });
    if (result.ok) {
      setAccessDenied(false);
      setPerformances(result.performances ?? []);
    } else if (result.status === 401) {
      setAccessDenied(true);
      setPerformances([]);
      setStatus("");
    }
  }

  // ==================== EFFECTS ====================

  useEffect(() => {
    const controller = new AbortController();
    loadPerformances(controller.signal).catch(() => null);
    return () => controller.abort();
  }, [performanceType, performanceService]);

  useEffect(() => {
    if (autoOpenCreate) {
      setIsCreateOpen(true);
    }
  }, [autoOpenCreate]);

  useEffect(() => {
    if (!sharePerformance || !shareQuery.trim()) {
      setShareUsers([]);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(() => {
      performanceService
        .searchShareUsers({
          query: shareQuery.trim(),
          signal: controller.signal,
        })
        .then((result) => {
          if (!result.ok) {
            setShareError("Impossible de charger les utilisateurs.");
            return;
          }
          setShareUsers(result.users ?? []);
        })
        .catch(() => null);
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [sharePerformance, shareQuery, performanceService]);

  useEffect(() => {
    if (performanceType) {
      setDraftType(performanceType);
    }
  }, [performanceType]);

  // ==================== COMPUTED VALUES ====================

  const filteredPerformances = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? performances.filter((performance) =>
          performance.name.toLowerCase().includes(query),
        )
      : performances;
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
  }, [performances, search, sort]);

  const groupedPerformances = useMemo(() => {
    if (performanceType) {
      return {
        classic: filteredPerformances,
        sabre: [],
        demo: [],
      };
    }
    return {
      demo: filteredPerformances.filter((performance) => performance.isDemo),
      classic: filteredPerformances.filter(
        (performance) =>
          !performance.isDemo && (performance.type ?? "classic") === "classic",
      ),
      sabre: filteredPerformances.filter(
        (performance) =>
          !performance.isDemo &&
          (performance.type ?? "classic") === "sabre-laser",
      ),
    };
  }, [filteredPerformances, performanceType]);

  // ==================== HANDLERS ====================

  async function createPerformance() {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("Ajoute un nom pour créer le combat.");
      return;
    }
    if (accessDenied) return;
    setStatus("");
    const created = await onCreatePerformance({
      name: trimmed,
      description,
      type: draftType,
    });
    if (created?.type && onNavigate) {
      setIsCreateOpen(false);
      onNavigate(
        created.type === "sabre-laser"
          ? "performance-create-sabre"
          : "performance-create",
      );
      return;
    }
    setStatus("Création impossible.");
  }

  async function openPerformance(id, type) {
    const resolvedType = (await onSelectPerformance(id)) ?? type ?? performanceType;
    if (resolvedType && onNavigate) {
      onNavigate(
        resolvedType === "sabre-laser"
          ? "performance-create-sabre"
          : "performance-create",
      );
    }
  }

  async function readPerformance(id) {
    const resolvedType = await onSelectPerformance(id);
    if (resolvedType && onNavigate) {
      onNavigate("performance-reader");
    }
  }

  function openFromRow(performance) {
    const canWrite =
      performance?.isOwner ||
      performance?.shareRole === "write" ||
      performance?.shareRole === "owner";
    if (canWrite) {
      openPerformance(performance.id, performance.type);
    } else {
      readPerformance(performance.id);
    }
  }

  async function exportPerformancePdfFromRow(performance, options = {}) {
    if (!performance || exportingPerformanceId) return;
    setExportingPerformanceId(performance.id);
    try {
      const result = await performanceService.getPerformanceById(performance.id);
      if (!result.ok || !result.state) {
        setStatus("Export PDF impossible.");
        return;
      }
      const state = result.state;
      const { exportPerformancePdf } = await import("../lib/performancePdf.jsx");
      const { blob, fileName } = await exportPerformancePdf(
        {
          name: state.performanceName,
          description: state.performanceDescription,
          performers: state.performers ?? state.participants ?? [],
          sequences: state.sequences ?? [],
        },
        options,
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
      setExportingPerformanceId(null);
    }
  }

  function requestDeletePerformance(performanceOrId) {
    if (performanceOrId && typeof performanceOrId === "object") {
      setPendingPerformanceDelete(performanceOrId);
      return;
    }
    const numericId = Number(performanceOrId);
    if (!Number.isFinite(numericId)) {
      setPendingPerformanceDelete(null);
      setStatus("Suppression impossible: identifiant invalide.");
      return;
    }
    const foundPerformance = performances.find(
      (performance) => Number(performance.id) === numericId,
    );
    setPendingPerformanceDelete(
      foundPerformance ?? {
        id: numericId,
        name: `#${numericId}`,
      },
    );
  }

  function closeDeletePerformanceModal() {
    setPendingPerformanceDelete(null);
  }

  async function confirmDeletePerformance() {
    if (!pendingPerformanceDelete) return;
    const id = Number(pendingPerformanceDelete.id);
    if (!Number.isFinite(id)) {
      setStatus("Suppression impossible: identifiant invalide.");
      setPendingPerformanceDelete(null);
      return;
    }
    await performanceService.deletePerformance(id);
    await loadPerformances();
    setPendingPerformanceDelete(null);
  }

  async function openShareModal(performance) {
    setSharePerformance(performance);
    setShareError("");
    setShareQuery("");
    setShareUsers([]);
    setShareAllUsers([]);
    setShareSelectedUser("");
    setShareRole("read");
    setShareLoading(true);
    const sharesResult = await performanceService.getShares(performance.id);
    if (!sharesResult.ok) {
      setShareError("Impossible de charger les partages.");
      setShareList([]);
    } else {
      setShareList(sharesResult.shares ?? []);
    }
    const usersResult = await performanceService.listShareUsers();
    if (usersResult.ok) {
      setShareAllUsers(usersResult.users ?? []);
    } else {
      setShareError(
        usersResult?.payload?.error
          ? "Impossible de charger les utilisateurs."
          : "Erreur lors du chargement des utilisateurs.",
      );
      setShareAllUsers([]);
    }
    setShareLoading(false);
  }

  async function addShare(userId) {
    if (!sharePerformance) return;
    if (!userId) return;
    setShareError("");
    const result = await performanceService.addShare({
      performanceId: sharePerformance.id,
      userId,
      role: shareRole,
    });
    if (!result.ok) {
      setShareError("Impossible d'ajouter le partage.");
      return;
    }
    setShareList(result.shares ?? []);
    setShareQuery("");
    setShareUsers([]);
    setShareSelectedUser("");
  }

  async function removeShare(userId) {
    if (!sharePerformance) return;
    const result = await performanceService.removeShare({
      performanceId: sharePerformance.id,
      userId,
    });
    if (!result.ok) {
      setShareError("Impossible de retirer le partage.");
      return;
    }
    setShareList(result.shares ?? []);
  }

  // ==================== RENDER HELPERS ====================

  function PerformanceSection({ title, performances: sectionPerformances }) {
    return (
      <>
        <div className="section-card">
          <div className="text-bold text-lg">{title}</div>
          <div className="meta">
            {sectionPerformances.length} combat
            {sectionPerformances.length > 1 ? "s" : ""}
          </div>
        </div>
        {sectionPerformances.map((performance) => (
          <PerformanceRow
            key={performance.id}
            performance={performance}
            isActive={performance.id === performanceId}
            formatDate={formatDate}
            onOpenPerformance={openPerformance}
            onReadPerformance={readPerformance}
            onRowOpen={openFromRow}
            onExportPerformance={exportPerformancePdfFromRow}
            onShare={openShareModal}
            onDelete={requestDeletePerformance}
            isExporting={exportingPerformanceId === performance.id}
          />
        ))}
      </>
    );
  }

  // ==================== MAIN RENDER ====================

  const creationTypeLabel =
    performanceType === "sabre-laser" ? "sabre laser" : "escrime";

  return (
    <section className="panel">
      <div className="panel-header panel-header--stacked">
        <div className="panel-header-left">
          <div className="panel-header-top">
            <h2 className="title">{title}</h2>
            {!accessDenied ? (
              <button
                type="button"
                className="chip icon-button mobile-only combat-add-fab"
                onClick={() => {
                  setStatus("");
                  setIsCreateOpen(true);
                }}
                aria-label="Nouveau combat"
                title="Nouveau combat"
              >
                +
              </button>
            ) : null}
          </div>
          <p className="meta text-muted">{subtitle}</p>
        </div>
        {!accessDenied ? (
          <div className="panel-header-actions desktop-only">
            <button
              type="button"
              onClick={() => {
                setStatus("");
                setIsCreateOpen(true);
              }}
            >
              Nouveau combat
            </button>
          </div>
        ) : null}
      </div>

      {accessDenied ? (
        <div className="empty">
          <div className="text-strong">Accès indisponible.</div>
          <div className="text-sm text-muted">
            Vous n'avez pas les droits pour voir les performances.
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
                  {performanceType ? ` (${creationTypeLabel})` : ""}.
                </p>
                {!performanceType && (
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
                  <button type="button" onClick={createPerformance}>
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
              {!performanceType ? (
                <>
                  {groupedPerformances.demo.length ? (
                    <details className="fold fold-combat" open>
                      <summary className="fold-kicker demo-fold-summary">
                        <span className="demo-fold-title">
                          <span className="text-bold text-lg">Démo</span>
                          <span className="meta text-muted">
                            {groupedPerformances.demo.length} combat
                            {groupedPerformances.demo.length > 1 ? "s" : ""}
                          </span>
                        </span>
                      </summary>
                      <div className="stack-2 stretch-rows">
                        {groupedPerformances.demo.map((performance) => (
                          <PerformanceRow
                            key={performance.id}
                            performance={performance}
                            isActive={performance.id === performanceId}
                            formatDate={formatDate}
                            onOpenPerformance={openPerformance}
                            onReadPerformance={readPerformance}
                            onRowOpen={openFromRow}
                            onExportPerformance={exportPerformancePdfFromRow}
                            onShare={openShareModal}
                            onDelete={requestDeletePerformance}
                            isExporting={exportingPerformanceId === performance.id}
                          />
                        ))}
                      </div>
                    </details>
                  ) : null}
                  <PerformanceSection
                    title="Escrime"
                    performances={groupedPerformances.classic}
                  />
                  <PerformanceSection
                    title="Sabre laser"
                    performances={groupedPerformances.sabre}
                  />
                </>
              ) : (
                filteredPerformances.map((performance) => (
                  <PerformanceRow
                    key={performance.id}
                    performance={performance}
                    isActive={performance.id === performanceId}
                    formatDate={formatDate}
                    onOpenPerformance={openPerformance}
                    onReadPerformance={readPerformance}
                    onRowOpen={openFromRow}
                    onExportPerformance={exportPerformancePdfFromRow}
                    onShare={openShareModal}
                    onDelete={requestDeletePerformance}
                    isExporting={exportingPerformanceId === performance.id}
                  />
                ))
              )}
              {filteredPerformances.length === 0 && (
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
      <PerformanceShareModal
        performance={sharePerformance}
        shareLoading={shareLoading}
        shareError={shareError}
        shareList={shareList}
        shareRole={shareRole}
        shareSelectedUser={shareSelectedUser}
        shareAllUsers={shareAllUsers}
        shareQuery={shareQuery}
        shareUsers={shareUsers}
        onClose={() => setSharePerformance(null)}
        onRequestRemoveShare={removeShare}
        onRoleChange={setShareRole}
        onSelectedUserChange={setShareSelectedUser}
        onAddShare={(userId) => addShare(userId)}
        onQueryChange={setShareQuery}
        onQuickAddShare={addShare}
      />
      <ConfirmDeleteModal
        isOpen={!!pendingPerformanceDelete}
        title="Supprimer le combat ?"
        message={
          pendingPerformanceDelete
            ? `Le combat "${pendingPerformanceDelete.name}" sera supprimé.`
            : "Ce combat sera supprimé."
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={confirmDeletePerformance}
        onCancel={closeDeletePerformanceModal}
      />
    </section>
  );
}
