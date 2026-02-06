import CombatPageLayout from "../components/combat/CombatPageLayout.jsx";
import CombatColumns from "../components/combat/CombatColumns.jsx";
import CombatLeftPanels from "../components/combat/CombatLeftPanels.jsx";
import CombatRightPanels from "../components/combat/CombatRightPanels.jsx";

export default function CombatReaderPage({
  combatName,
  combatDescription,
  participants,
  phrases,
  onNavigate,
}) {
  return (
    <CombatPageLayout
      title="Lecture du combat"
      subtitle="Vue complète en lecture seule."
      onBack={() => onNavigate?.("combats")}
    >
      <CombatColumns
        mode="read"
        readLeft={
          <CombatLeftPanels
            mode="read"
            combatName={combatName}
            combatDescription={combatDescription}
            participants={participants}
            showWeapons={participants.some((participant) => participant?.weapon)}
            uiLabels={{ weapon: "Arme" }}
            phrases={phrases}
          />
        }
        readRight={
          <CombatRightPanels
            mode="read"
            readingProps={{ phrases, participants }}
          />
        }
      />
    </CombatPageLayout>
  );
}
