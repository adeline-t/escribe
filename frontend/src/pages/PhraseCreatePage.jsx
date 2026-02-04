export default function PhraseCreatePage({
  participants,
  form,
  participantLabels,
  normalizedLexicon,
  onParticipantCountChange,
  onParticipantNameChange,
  onFormChange,
  onAddStep,
  buildParticipantLabel,
  buildSummaryLine,
  toggleAttribute
}) {
  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Création d'une phrase d'armes</h2>
            <p className="muted">Définissez les participants avant d'ajouter les étapes.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Nombre de combattants
            <select value={participants.length} onChange={(event) => onParticipantCountChange(event.target.value)}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <div className="names span-2">
            {participants.map((name, index) => (
              <label key={index}>
                {`Nom ${index + 1}`}
                <input
                  value={name}
                  placeholder={buildParticipantLabel(index)}
                  onChange={(event) => onParticipantNameChange(index, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Ajouter une étape</h2>
        <div
          className="participant-grid"
          style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(0, 1fr))` }}
        >
          {participants.map((_, index) => {
            const item = form[index];
            const name = participantLabels[index];
            return (
              <div key={name} className="participant-card">
                <div className="participant-card__header">
                  <div className="participant-name">{name}</div>
                  <div className="segmented" role="radiogroup" aria-label={`Rôle de ${name}`}>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "none" ? "is-active" : ""}`}
                      aria-pressed={item.role === "none"}
                      onClick={() => onFormChange(index, { role: "none" })}
                    >
                      Sans rôle
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "attack" ? "is-active" : ""}`}
                      aria-pressed={item.role === "attack"}
                      onClick={() => onFormChange(index, { role: "attack" })}
                    >
                      Attaque
                    </button>
                    <button
                      type="button"
                      className={`segmented__item ${item.role === "defense" ? "is-active" : ""}`}
                      aria-pressed={item.role === "defense"}
                      onClick={() => onFormChange(index, { role: "defense" })}
                    >
                      Défense
                    </button>
                  </div>
                </div>

                {item.role === "attack" ? (
                  <div className="participant-fields">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={item.noteOverrides}
                        onChange={(event) => onFormChange(index, { noteOverrides: event.target.checked })}
                      />
                      La note remplace la formulation
                    </label>
                    {!item.noteOverrides ? (
                      <>
                        <label>
                          Offensive
                          <select
                            value={item.offensive}
                            onChange={(event) => onFormChange(index, { offensive: event.target.value })}
                          >
                            <option value="">—</option>
                            {normalizedLexicon.offensive.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Action d'arme
                          <select
                            value={item.action}
                            onChange={(event) => onFormChange(index, { action: event.target.value })}
                          >
                            <option value="">—</option>
                            {normalizedLexicon.action.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Attribut attaque
                          <div className="checkbox-row">
                            {normalizedLexicon.attackAttribute.map((option) => (
                              <label key={option} className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={item.attackAttribute.includes(option)}
                                  onChange={() =>
                                    onFormChange(index, {
                                      attackAttribute: toggleAttribute(item.attackAttribute, option)
                                    })
                                  }
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        </label>
                        <label>
                          Cible
                          <select
                            value={item.target}
                            onChange={(event) => onFormChange(index, { target: event.target.value })}
                          >
                            <option value="">—</option>
                            {normalizedLexicon.cible.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Déplacement
                          <select
                            value={item.attackMove}
                            onChange={(event) => onFormChange(index, { attackMove: event.target.value })}
                          >
                            <option value="">—</option>
                            {normalizedLexicon.attackMove.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : null}
                    <label>
                      Notes
                      <input
                        value={item.note}
                        onChange={(event) => onFormChange(index, { note: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}

                {item.role === "defense" ? (
                  <div className="participant-fields">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={item.noteOverrides}
                        onChange={(event) => onFormChange(index, { noteOverrides: event.target.checked })}
                      />
                      La note remplace la formulation
                    </label>
                    {!item.noteOverrides ? (
                      <>
                        <label>
                          Défensive
                          <select
                            value={item.defense}
                            onChange={(event) => onFormChange(index, { defense: event.target.value })}
                          >
                            <option value="">—</option>
                            {normalizedLexicon.defensive.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Numéro de parade
                          <select
                            value={item.paradeNumber}
                            onChange={(event) => onFormChange(index, { paradeNumber: event.target.value })}
                          >
                            <option value="">—</option>
                            {normalizedLexicon.paradeNumber.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Attribut parade
                          <select
                            value={item.paradeAttribute}
                            onChange={(event) => onFormChange(index, { paradeAttribute: event.target.value })}
                          >
                            <option value="">—</option>
                            {normalizedLexicon.paradeAttribute.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Déplacement
                          <select
                            value={item.defendMove}
                            onChange={(event) => onFormChange(index, { defendMove: event.target.value })}
                          >
                            <option value="">—</option>
                            {normalizedLexicon.defendMove.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : null}
                    <label>
                      Notes
                      <input
                        value={item.note}
                        onChange={(event) => onFormChange(index, { note: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}

                {item.role === "none" ? (
                  <div className="participant-fields">
                    <label>
                      Notes
                      <input
                        value={item.note}
                        onChange={(event) => onFormChange(index, { note: event.target.value })}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="summary">
          <h3>Phrase résumée</h3>
          <div className="summary__body">
            {form.map((item, index) => (
              <div key={participantLabels[index]} className="summary__line">
                {buildSummaryLine(item, participantLabels[index])}
              </div>
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button type="button" onClick={onAddStep}>
            Ajouter l'étape
          </button>
        </div>
      </section>
    </>
  );
}
