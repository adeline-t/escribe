export default function ConfirmDeleteModal({
  isOpen,
  title = "Confirmer la suppression",
  message = "Cette action est définitive.",
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="subtitle">{title}</h3>
        <p className="meta text-muted">{message}</p>
        <div className="modal-actions">
          <button type="button" className="chip" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="chip chip--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
