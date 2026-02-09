import { useEffect, useMemo, useState } from "react";
import CombatRow from "../components/combat/CombatRow.jsx";
import CombatShareModal from "../components/combat/CombatShareModal.jsx";
import ConfirmDeleteModal from "../components/modals/ConfirmDeleteModal.jsx";
import { useWorkerServices } from "../hooks/useWorkerServices.js";

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
  const [pendingCombatDelete, setPendingCombatDelete] = useState(null);
  const { combats: combatService } = useWorkerServices(apiBase, authToken);

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

  async function loadCombats(signal) {
    const result = await combatService.listCombats({
      archived: 0,
      type: combatType,
      signal,
    });
    if (result.ok) {
      setAccessDenied(false);
      setCombats(result.combats ?? []);
    } else if (result.status === 401) {
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
  }, [combatType, combatService]);

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
      combatService
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
  }, [shareCombat, shareQuery, combatService]);

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
        demo: [],
      };
    }
    return {
      demo: filteredCombats.filter((combat) => combat.isDemo),
      classic: filteredCombats.filter(
        (combat) => !combat.isDemo && (combat.type ?? "classic") === "classic",
      ),
      sabre: filteredCombats.filter(
        (combat) =>
          !combat.isDemo && (combat.type ?? "classic") === "sabre-laser",
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

  function openFromRow(combat) {
    const canWrite =
      combat?.isOwner ||
      combat?.shareRole === "write" ||
      combat?.shareRole === "owner";
    if (canWrite) {
      openCombat(combat.id, combat.type);
    } else {
      readCombat(combat.id);
    }
  }

  async function exportCombatPdfFromRow(combat, options = {}) {
    if (!combat || exportingCombatId) return;
    setExportingCombatId(combat.id);
    try {
      const result = await combatService.getCombatById(combat.id);
      if (!result.ok || !result.state) {
        setStatus("Export PDF impossible.");
        return;
      }
      const state = result.state;
      const { exportCombatPdf } = await import("../lib/combatPdf.jsx");
      const { blob, fileName } = await exportCombatPdf(
        {
          name: state.combatName,
          description: state.combatDescription,
          participants: state.participants ?? [],
          phrases: state.phrases ?? [],
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
      setExportingCombatId(null);
    }
  }

  function requestDeleteCombat(combatOrId) {
    if (combatOrId && typeof combatOrId === "object") {
      setPendingCombatDelete(combatOrId);
      return;
    }
    const numericId = Number(combatOrId);
    if (!Number.isFinite(numericId)) {
      setPendingCombatDelete(null);
      setStatus("Suppression impossible: identifiant invalide.");
      return;
    }
    const foundCombat = combats.find((combat) => Number(combat.id) === numericId);
    setPendingCombatDelete(
      foundCombat ?? {
        id: numericId,
        name: `#${numericId}`,
      },
    );
  }

  function closeDeleteCombatModal() {
    setPendingCombatDelete(null);
  }

  async function confirmDeleteCombat() {
    if (!pendingCombatDelete) return;
    const id = Number(pendingCombatDelete.id);
    if (!Number.isFinite(id)) {
      setStatus("Suppression impossible: identifiant invalide.");
      setPendingCombatDelete(null);
      return;
    }
    await combatService.deleteCombat(id);
    await loadCombats();
    setPendingCombatDelete(null);
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
    const sharesResult = await combatService.getShares(combat.id);
    if (!sharesResult.ok) {
      setShareError("Impossible de charger les partages.");
      setShareList([]);
    } else {
      setShareList(sharesResult.shares ?? []);
    }
    const usersResult = await combatService.listShareUsers();
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
    if (!shareCombat) return;
    if (!userId) return;
    setShareError("");
    const result = await combatService.addShare({
      combatId: shareCombat.id,
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
    if (!shareCombat) return;
    const result = await combatService.removeShare({
      combatId: shareCombat.id,
      userId,
    });
    if (!result.ok) {
      setShareError("Impossible de retirer le partage.");
      return;
    }
    setShareList(result.shares ?? []);
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
            onRowOpen={openFromRow}
            onExportCombat={exportCombatPdfFromRow}
            onShare={openShareModal}
            onDelete={requestDeleteCombat}
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
                  {groupedCombats.demo.length ? (
                    <details className="fold fold-combat" open>
                      <summary className="fold-kicker demo-fold-summary">
                        <span className="demo-fold-title">
                          <span className="text-bold text-lg">Démo</span>
                          <span className="meta text-muted">
                            {groupedCombats.demo.length} combat
                            {groupedCombats.demo.length > 1 ? "s" : ""}
                          </span>
                        </span>
                      </summary>
                      <div className="stack-2 stretch-rows">
                        {groupedCombats.demo.map((combat) => (
                          <CombatRow
                            key={combat.id}
                            combat={combat}
                            isActive={combat.id === combatId}
                            formatDate={formatDate}
                            onOpenCombat={openCombat}
                            onReadCombat={readCombat}
                            onRowOpen={openFromRow}
                            onExportCombat={exportCombatPdfFromRow}
                            onShare={openShareModal}
                            onDelete={requestDeleteCombat}
                            isExporting={exportingCombatId === combat.id}
                          />
                        ))}
                      </div>
                    </details>
                  ) : null}
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
                    onRowOpen={openFromRow}
                    onExportCombat={exportCombatPdfFromRow}
                    onShare={openShareModal}
                    onDelete={requestDeleteCombat}
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
      <ConfirmDeleteModal
        isOpen={!!pendingCombatDelete}
        title="Supprimer le combat ?"
        message={
          pendingCombatDelete
            ? `Le combat "${pendingCombatDelete.name}" sera supprimé.`
            : "Ce combat sera supprimé."
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={confirmDeleteCombat}
        onCancel={closeDeleteCombatModal}
      />
    </section>
  );
}
