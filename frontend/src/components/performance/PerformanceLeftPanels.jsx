import PerformancePerformers from "./PerformancePerformers.jsx";
import PerformanceSequenceList from "./PerformanceSequenceList.jsx";

export default function PerformanceLeftPanels({
  mode = "edit",
  performers,
  buildPerformerLabel,
  onPerformerCountChange,
  onPerformerNameChange,
  onPerformerWeaponChange,
  performerWeaponOptions,
  showWeapons,
  uiLabels,
  sequences,
  activeSequenceId,
  onCreateSequence,
  onSelectSequence,
  onMoveSequence,
  onMoveSequenceToIndex,
  onRequestDeleteSequence,
  onRequestRenameSequence,
  isReadOnly,
}) {
  const isReadMode = mode === "read";
  const performerList = performers ?? [];

  return (
    <>
      <details className="fold">
        <summary className="fold-kicker">
          <span className="kicker">Combattants</span>
        </summary>
        <PerformancePerformers
          performers={performerList}
          buildPerformerLabel={buildPerformerLabel}
          onPerformerCountChange={onPerformerCountChange}
          onPerformerNameChange={onPerformerNameChange}
          onPerformerWeaponChange={onPerformerWeaponChange}
          performerWeaponOptions={performerWeaponOptions}
          showWeapons={showWeapons}
          uiLabels={uiLabels}
          isReadOnly={isReadOnly}
          mode={mode}
        />
      </details>
      {isReadMode ? (
        <details className="fold" open>
          <summary className="fold-kicker">
            <span className="kicker">Liste des séquences</span>
          </summary>
          <PerformanceSequenceList sequences={sequences} mode="read" />
        </details>
      ) : (
        <PerformanceSequenceList
          sequences={sequences}
          activeSequenceId={activeSequenceId}
          onCreateSequence={onCreateSequence}
          onSelectSequence={onSelectSequence}
          onMoveSequence={onMoveSequence}
          onMoveSequenceToIndex={onMoveSequenceToIndex}
          onRequestDeleteSequence={onRequestDeleteSequence}
          onRequestRenameSequence={onRequestRenameSequence}
          mode="edit"
        />
      )}
    </>
  );
}
