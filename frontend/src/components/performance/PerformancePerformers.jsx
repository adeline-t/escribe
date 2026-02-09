export default function PerformancePerformers({
  performers,
  buildPerformerLabel,
  onPerformerCountChange,
  onPerformerNameChange,
  onPerformerWeaponChange,
  performerWeaponOptions,
  showWeapons,
  uiLabels,
  isReadOnly,
  mode = "edit",
}) {
  const readOnly = mode === "read" || isReadOnly;
  const performerList = Array.isArray(performers) ? performers : [];
  const weaponOptions = performerWeaponOptions ?? [];

  return (
    <div className="form-grid">
      <label>
        Nombre de combattants
        {readOnly ? (
          <input value={performerList.length} readOnly />
        ) : (
          <select
            value={performerList.length}
            onChange={(event) => onPerformerCountChange?.(event.target.value)}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        )}
      </label>
      <div className="stack-2 col-span-2">
        {performerList.map((performer, index) => (
          <div key={index} className="stack-2">
            <label>
              {`Nom ${index + 1}`}
              <input
                value={performer?.name ?? performer ?? ""}
                placeholder={
                  readOnly ? undefined : buildPerformerLabel?.(index)
                }
                onChange={(event) =>
                  readOnly
                    ? undefined
                    : onPerformerNameChange?.(index, event.target.value)
                }
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>
            {showWeapons ? (
              <label>
                {`${uiLabels.weapon} ${index + 1}`}
                {readOnly ? (
                  <input value={performer?.weapon ?? ""} readOnly />
                ) : (
                  <select
                    value={performer?.weapon ?? ""}
                    onChange={(event) =>
                      onPerformerWeaponChange?.(index, event.target.value)
                    }
                  >
                    <option value="">—</option>
                    {weaponOptions.map((weapon) => (
                      <option key={weapon} value={weapon}>
                        {weapon}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
