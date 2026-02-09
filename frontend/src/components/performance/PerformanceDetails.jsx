import { useState } from "react";
import { FaCheck, FaPen } from "react-icons/fa6";

export default function PerformanceDetails({
  performanceName,
  performanceDescription,
  onPerformanceNameChange,
  onPerformanceDescriptionChange,
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
            <div className="title">{performanceName}</div>
            <div className="subtitle text-muted">
              {performanceDescription || "Aucune description."}
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
          value={performanceName}
          onChange={(event) =>
            readOnly ? undefined : onPerformanceNameChange(event.target.value)
          }
          disabled={readOnly}
          readOnly={readOnly}
        />
      </label>
      <label className="col-span-2">
        Description
        <input
          value={performanceDescription}
          onChange={(event) =>
            readOnly ? undefined : onPerformanceDescriptionChange(event.target.value)
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
