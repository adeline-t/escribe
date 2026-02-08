import { useState } from "react";
import { FaCheckSquare } from "react-icons/fa";
import { FaCheck, FaPen } from "react-icons/fa6";

export default function CombatDetails({
  combatName,
  combatDescription,
  onCombatNameChange,
  onCombatDescriptionChange,
  isReadOnly,
  mode = "edit",
}) {
  const readOnly = mode === "read" || isReadOnly;
  const [isEditing, setIsEditing] = useState(false);

  if (readOnly || !isEditing) {
    return (
      <div className="card mb-3">
        <div className="row-between">
          <div>
            <div className="title">{combatName}</div>
            <div className="subtitle text-muted">
              {combatDescription || "Aucune description."}
            </div>
          </div>
          {!readOnly ? (
            <button
              type="button"
              className="button-icon button-secondary"
              onClick={() => setIsEditing(true)}
              aria-label="Modifier le combat"
              title="Modifier"
            >
              <FaPen />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-3 form-grid form-grid-last ">
      <label className="col-span-2">
        Nom du combat
        <input
          value={combatName}
          onChange={(event) =>
            readOnly ? undefined : onCombatNameChange(event.target.value)
          }
          disabled={readOnly}
          readOnly={readOnly}
        />
      </label>
      <label className="col-span-2">
        Description
        <input
          value={combatDescription}
          onChange={(event) =>
            readOnly ? undefined : onCombatDescriptionChange(event.target.value)
          }
          disabled={readOnly}
          readOnly={readOnly}
        />
      </label>
      <div className="form-actions">
        <button
          type="button"
          className="button-icon button-secondary"
          onClick={() => setIsEditing(false)}
        >
          <FaCheck />
        </button>
      </div>
    </div>
  );
}
