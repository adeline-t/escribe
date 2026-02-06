export default function CombatParticipants({
  participants,
  buildParticipantLabel,
  onParticipantCountChange,
  onParticipantNameChange,
  onParticipantWeaponChange,
  participantWeaponOptions,
  showWeapons,
  uiLabels,
  isReadOnly,
  mode = "edit",
}) {
  const readOnly = mode === "read" || isReadOnly;

  return (
    <div className="form-grid">
      <label>
        Nombre de combattants
        {readOnly ? (
          <input value={participants.length} readOnly />
        ) : (
          <select
            value={participants.length}
            onChange={(event) => onParticipantCountChange(event.target.value)}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        )}
      </label>
      <div className="stack-2 col-span-2">
        {participants.map((participant, index) => (
          <div key={index} className="stack-2">
            <label>
              {`Nom ${index + 1}`}
              <input
                value={participant?.name ?? participant ?? ""}
                placeholder={
                  readOnly ? undefined : buildParticipantLabel?.(index)
                }
                onChange={(event) =>
                  readOnly
                    ? undefined
                    : onParticipantNameChange(index, event.target.value)
                }
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>
            {showWeapons ? (
              <label>
                {`${uiLabels.weapon} ${index + 1}`}
                {readOnly ? (
                  <input value={participant?.weapon ?? ""} readOnly />
                ) : (
                  <select
                    value={participant?.weapon ?? ""}
                    onChange={(event) =>
                      onParticipantWeaponChange?.(index, event.target.value)
                    }
                  >
                    <option value="">—</option>
                    {participantWeaponOptions.map((weapon) => (
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
