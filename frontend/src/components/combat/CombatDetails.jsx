export default function CombatDetails({
  combatName,
  combatDescription,
  onCombatNameChange,
  onCombatDescriptionChange,
  isReadOnly,
  mode = "edit",
}) {
  const readOnly = mode === "read" || isReadOnly;

  return (
    <div className="form-grid">
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
    </div>
  );
}
