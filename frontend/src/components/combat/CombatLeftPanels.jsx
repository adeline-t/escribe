import CombatDetails from "./CombatDetails.jsx";
import CombatParticipants from "./CombatParticipants.jsx";
import CombatPhraseList from "./CombatPhraseList.jsx";

export default function CombatLeftPanels({
  mode = "edit",
  combatName,
  combatDescription,
  onCombatNameChange,
  onCombatDescriptionChange,
  participants,
  buildParticipantLabel,
  onParticipantCountChange,
  onParticipantNameChange,
  onParticipantWeaponChange,
  participantWeaponOptions,
  showWeapons,
  uiLabels,
  phrases,
  activePhraseId,
  onCreatePhrase,
  onSelectPhrase,
  onMovePhrase,
  onMovePhraseToIndex,
  onRequestDeletePhrase,
  isReadOnly,
}) {
  const isReadMode = mode === "read";

  return (
    <>
      <details className="fold" open>
        <summary className="fold-kicker">
          <span className="kicker">Combat</span>
        </summary>
        <CombatDetails
          combatName={combatName}
          combatDescription={combatDescription}
          onCombatNameChange={onCombatNameChange}
          onCombatDescriptionChange={onCombatDescriptionChange}
          isReadOnly={isReadOnly}
          mode={mode}
        />
      </details>
      <details className="fold" open>
        <summary className="fold-kicker">
          <span className="kicker">Combattants</span>
        </summary>
        <CombatParticipants
          participants={participants}
          buildParticipantLabel={buildParticipantLabel}
          onParticipantCountChange={onParticipantCountChange}
          onParticipantNameChange={onParticipantNameChange}
          onParticipantWeaponChange={onParticipantWeaponChange}
          participantWeaponOptions={participantWeaponOptions}
          showWeapons={showWeapons}
          uiLabels={uiLabels}
          isReadOnly={isReadOnly}
          mode={mode}
        />
      </details>
      <details className="fold" open>
        {isReadMode ? (
          <>
            <summary className="fold-kicker">
              <span className="kicker">Liste des phrases</span>
            </summary>
            <CombatPhraseList phrases={phrases} mode="read" />
          </>
        ) : (
          <CombatPhraseList
            phrases={phrases}
            activePhraseId={activePhraseId}
            onCreatePhrase={onCreatePhrase}
            onSelectPhrase={onSelectPhrase}
            onMovePhrase={onMovePhrase}
            onMovePhraseToIndex={onMovePhraseToIndex}
            onRequestDeletePhrase={onRequestDeletePhrase}
            mode="edit"
          />
        )}
      </details>
    </>
  );
}
