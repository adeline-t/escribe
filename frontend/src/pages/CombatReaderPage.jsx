import CombatPageLayout from "../components/combat/CombatPageLayout.jsx";
import CombatColumns from "../components/combat/CombatColumns.jsx";
import CombatDetails from "../components/combat/CombatDetails.jsx";
import CombatLeftPanels from "../components/combat/CombatLeftPanels.jsx";
import CombatRightPanels from "../components/combat/CombatRightPanels.jsx";

export default function CombatReaderPage({
  combatName,
  combatDescription,
  participants,
  phrases,
  isReadOnly = true,
  onTogglePhraseParticipantVisibility,
  onNavigate,
}) {
  return (
    <CombatPageLayout
      title="Lecture du combat"
      subtitle="Vue complète en lecture seule."
      onBack={() => onNavigate?.("combats")}
    >
      <CombatDetails
        combatName={combatName}
        combatDescription={combatDescription}
        onCombatNameChange={() => {}}
        onCombatDescriptionChange={() => {}}
        isReadOnly
        mode="read"
      />
      <CombatColumns
        mode="read"
        readLeft={
          <CombatLeftPanels
            mode="read"
            participants={participants}
            showWeapons={participants.some((participant) => participant?.weapon)}
            uiLabels={{ weapon: "Arme" }}
            phrases={phrases}
          />
        }
        readRight={
          <CombatRightPanels
            mode="read"
            readingProps={{
              phrases,
              participants,
              isReadOnly,
              onTogglePhraseParticipantVisibility,
            }}
          />
        }
      />
    </CombatPageLayout>
  );
}
