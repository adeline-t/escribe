import PerformancePageLayout from "../components/performance/PerformancePageLayout.jsx";
import PerformanceColumns from "../components/performance/PerformanceColumns.jsx";
import PerformanceDetails from "../components/performance/PerformanceDetails.jsx";
import PerformanceLeftPanels from "../components/performance/PerformanceLeftPanels.jsx";
import PerformanceRightPanels from "../components/performance/PerformanceRightPanels.jsx";

export default function PerformanceReaderPage({
  performanceName,
  performanceDescription,
  performers,
  sequences,
  isReadOnly = true,
  onToggleSequencePerformerVisibility,
  onNavigate,
}) {
  return (
    <PerformancePageLayout
      title="Lecture du combat"
      subtitle="Vue complète en lecture seule."
      onBack={() => onNavigate?.("performances")}
    >
      <PerformanceDetails
        performanceName={performanceName}
        performanceDescription={performanceDescription}
        onPerformanceNameChange={() => {}}
        onPerformanceDescriptionChange={() => {}}
        isReadOnly
        mode="read"
      />
      <PerformanceColumns
        mode="read"
        readLeft={
          <PerformanceLeftPanels
            mode="read"
            performers={performers}
            showWeapons={performers.some((performer) => performer?.weapon)}
            uiLabels={{ weapon: "Arme" }}
            sequences={sequences}
          />
        }
        readRight={
          <PerformanceRightPanels
            mode="read"
            readingProps={{
              sequences,
              performers,
              isReadOnly,
              onToggleSequencePerformerVisibility,
            }}
          />
        }
      />
    </PerformancePageLayout>
  );
}
