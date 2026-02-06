import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { buildSummaryLine, formatParticipantSummary } from "./participants.js";

function sanitizeFileName(value) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getCardVariant(item) {
  if (!item) return "empty";
  if (item.mode === "note") return "neutral";
  if (item.mode === "choregraphie") return "action";
  if (item.role === "attack") return "action";
  if (item.role === "defense") return "reaction";
  if (item.note) return "neutral";
  return "empty";
}

function getPalette(theme) {
  if (theme === "bw") {
    return {
      text: "#111111",
      muted: "#555555",
      border: "#333333",
      borderSoft: "#bbbbbb",
      surface: "#ffffff",
      surfaceSoft: "#f5f5f5",
      attack: "#111111",
      defense: "#444444",
      neutral: "#8a8a8a"
    };
  }
  return {
    text: "#1c1a17",
    muted: "#6f655b",
    border: "#eadfce",
    borderSoft: "#f2cfa5",
    surface: "#fffaf3",
    surfaceSoft: "#f7efe6",
    attack: "#f2cfa5",
    defense: "#bcd3e6",
    neutral: "#eadfce"
  };
}

function createStyles(theme) {
  const palette = getPalette(theme);
  return StyleSheet.create({
    page: {
      padding: 32,
      fontSize: 11,
      color: palette.text,
      fontFamily: "Helvetica"
    },
    title: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 6
    },
    subtitle: {
      fontSize: 12,
      color: palette.muted,
      marginBottom: 12
    },
    summaryBlock: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      padding: 12,
      backgroundColor: palette.surface,
      marginBottom: 16
    },
    summaryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 8
    },
    summaryItem: {
      fontSize: 11,
      marginRight: 12,
      lineHeight: 1.5,
      marginBottom: 4
    },
    participantsList: {
      marginTop: 8
    },
    participantItem: {
      fontSize: 11,
      lineHeight: 1.5,
      marginBottom: 4
    },
    phraseBlock: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16
    },
    phraseHeaderBlock: {
      marginBottom: 8
    },
    phraseHeader: {
      marginBottom: 10
    },
    phraseTitle: {
      fontSize: 13,
      fontWeight: 700,
      lineHeight: 1.4,
      marginBottom: 4
    },
    phraseMeta: {
      fontSize: 10,
      color: palette.muted,
      lineHeight: 1.4,
      marginBottom: 8
    },
    gridHeader: {
      flexDirection: "row",
      marginTop: 6,
      marginBottom: 6
    },
    indexCell: {
      width: 26,
      textAlign: "center",
      fontWeight: 700,
      color: palette.muted,
      alignSelf: "center"
    },
    participantCell: {
      flex: 1,
      paddingHorizontal: 3
    },
    participantLabel: {
      backgroundColor: palette.surfaceSoft,
      borderRadius: 8,
      paddingVertical: 4,
      textAlign: "center",
      fontSize: 10,
      fontWeight: 600,
      color: palette.text
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 6
    },
    card: {
      borderRadius: 10,
      padding: 6,
      minHeight: 36,
      borderWidth: 1
    },
    cardStack: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    },
    cardLine: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 3
    },
    cardAction: {
      backgroundColor: theme === "bw" ? "#f2f2f2" : "#fff1dc",
      borderColor: palette.attack,
      borderLeftWidth: theme === "bw" ? 6 : 3,
      borderLeftColor: palette.attack,
      borderStyle: "solid"
    },
    cardReaction: {
      backgroundColor: theme === "bw" ? "#ffffff" : "#e6f0fb",
      borderColor: palette.defense,
      borderLeftWidth: 1,
      borderLeftColor: palette.defense,
      borderStyle: theme === "bw" ? "dashed" : "solid"
    },
    cardNeutral: {
      backgroundColor: theme === "bw" ? "#f2f2f2" : "#f7efe6",
      borderColor: palette.neutral,
      borderLeftWidth: 1,
      borderLeftColor: palette.border,
      borderStyle: "solid"
    },
    cardEmpty: {
      backgroundColor: "#ffffff",
      borderColor: palette.border
    },
    cardText: {
      fontSize: 10,
      lineHeight: 1.4,
      color: palette.text
    },
    cardNote: {
      fontSize: 9,
      color: palette.muted,
      lineHeight: 1.3
    },
    badge: {
      fontSize: 9,
      paddingVertical: 1,
      paddingHorizontal: 5,
      borderRadius: 12,
      borderWidth: 1
    },
    badgeOffensive: {
      backgroundColor: theme === "bw" ? "#ffffff" : "#ffe9c2",
      borderColor: palette.attack,
      color: palette.text
    },
    badgeAction: {
      backgroundColor: theme === "bw" ? "#ffffff" : "#f6e0c7",
      borderColor: palette.attack,
      color: palette.text
    },
    badgeTarget: {
      backgroundColor: theme === "bw" ? "#ffffff" : "#fde3e1",
      borderColor: palette.neutral,
      color: palette.text
    },
    badgeDefensive: {
      backgroundColor: theme === "bw" ? "#ffffff" : "#e6f0fb",
      borderColor: palette.defense,
      color: palette.text
    },
    badgeParade: {
      backgroundColor: theme === "bw" ? "#ffffff" : "#efe7ff",
      borderColor: palette.defense,
      color: palette.text
    },
    badgeMove: {
      backgroundColor: theme === "bw" ? "#ffffff" : "#e9f7ef",
      borderColor: palette.neutral,
      color: palette.text
    }
  });
}

function createHelpers(styles, theme) {
  function Badge({ label, variant }) {
    if (!label) return null;
    return <Text style={[styles.badge, styles[`badge${variant}`]]}>{label}</Text>;
  }

  function renderCardContent(item) {
    if (!item) return null;

    if (item.mode === "note") {
      return <Text style={styles.cardText}>{item.note || "à compléter"}</Text>;
    }

    if (item.mode === "choregraphie") {
      return (
        <View style={styles.cardStack}>
          <Text style={styles.cardText}>Chorégraphie</Text>
          {item.chorePhase ? (
            <Text style={styles.cardNote}>{item.chorePhase}</Text>
          ) : null}
          {item.note ? <Text style={styles.cardNote}>({item.note})</Text> : null}
        </View>
      );
    }

    if (item.noteOverrides) {
      return <Text style={styles.cardText}>{item.note}</Text>;
    }

    if (item.role === "attack") {
      const attackAttribute = item.attackAttribute?.length
        ? item.attackAttribute.join(", ")
        : "";
      const actionBits = [item.action, attackAttribute].filter(Boolean).join(" ");
      return (
        <View style={styles.cardStack}>
          <View style={styles.cardLine}>
            <Badge label={item.offensive} variant="Offensive" />
            {actionBits ? (
              <>
                <Text style={styles.cardText}>en</Text>
                <Badge label={actionBits} variant="Action" />
              </>
            ) : null}
            {item.target ? (
              <>
                <Text style={styles.cardText}>sur</Text>
                <Badge label={item.target} variant="Target" />
              </>
            ) : null}
            {item.attackMove ? (
              <>
                <Text style={styles.cardText}>avec</Text>
                <Badge label={item.attackMove} variant="Move" />
              </>
            ) : null}
          </View>
          {item.note ? <Text style={styles.cardNote}>({item.note})</Text> : null}
        </View>
      );
    }

    if (item.role === "defense") {
      const defenseLabel = item.defense ?? item.defensive ?? "";
      const paradeLabel = [item.paradeNumber, item.paradeAttribute]
        .filter(Boolean)
        .join(" ");
      return (
        <View style={styles.cardStack}>
          <View style={styles.cardLine}>
            <Badge label={defenseLabel} variant="Defensive" />
            {paradeLabel ? (
              <>
                <Text style={styles.cardText}>de</Text>
                <Badge label={paradeLabel} variant="Parade" />
              </>
            ) : null}
            {item.defendMove ? (
              <>
                <Text style={styles.cardText}>en</Text>
                <Badge label={item.defendMove} variant="Move" />
              </>
            ) : null}
          </View>
          {item.note ? <Text style={styles.cardNote}>({item.note})</Text> : null}
        </View>
      );
    }

    if (item.note) {
      return <Text style={styles.cardNote}>({item.note})</Text>;
    }

    const fallback = buildSummaryLine(item);
    return <Text style={styles.cardText}>{fallback}</Text>;
  }

  return { renderCardContent };
}

function CombatDocument({ combat, theme }) {
  const styles = createStyles(theme);
  const { renderCardContent } = createHelpers(styles, theme);
  const phraseCount = combat.phrases.length;
  const totalPasses = combat.phrases.reduce(
    (sum, phrase) => sum + (phrase.steps?.length ?? 0),
    0
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{combat.name || "Combat"}</Text>
        {combat.description ? (
          <Text style={styles.subtitle}>{combat.description}</Text>
        ) : null}

        <View style={styles.summaryBlock}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryItem}>
              {combat.participants.length} participant
              {combat.participants.length > 1 ? "s" : ""}
            </Text>
            <Text style={styles.summaryItem}>
              {phraseCount} phrase{phraseCount > 1 ? "s" : ""}
            </Text>
            <Text style={styles.summaryItem}>
              {totalPasses} passe{totalPasses > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.participantsList}>
            {combat.participants.map((participant, index) => (
              <Text key={index} style={styles.participantItem}>
                • {formatParticipantSummary(participant, index)}
              </Text>
            ))}
          </View>
        </View>

        {combat.phrases.map((phrase, phraseIndex) => (
          <View
            key={phrase.id || phraseIndex}
            style={styles.phraseBlock}
            minPresenceAhead={140}
          >
            <View style={styles.phraseHeaderBlock} wrap={false}>
              <View style={styles.phraseHeader}>
                <Text style={styles.phraseTitle}>
                  {phrase.name || `Phrase ${phraseIndex + 1}`}
                </Text>
                <Text style={styles.phraseMeta}>
                  {phrase.steps?.length ?? 0} passe
                  {(phrase.steps?.length ?? 0) > 1 ? "s" : ""}
                </Text>
              </View>

              <View style={styles.gridHeader}>
                <Text style={styles.indexCell}>#</Text>
                {combat.participants.map((participant, index) => (
                  <View key={index} style={styles.participantCell}>
                    <Text style={styles.participantLabel}>
                      {formatParticipantSummary(participant, index)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {(phrase.steps || []).map((step, stepIndex) => (
              <View
                key={step.id || stepIndex}
                style={styles.row}
                wrap={false}
                minPresenceAhead={16}
              >
                <Text style={styles.indexCell}>{stepIndex + 1}</Text>
                {step.participants.map((item, index) => {
                  const variant = getCardVariant(item);
                  const cardStyle = {
                    ...styles.card,
                    ...(variant === "action"
                      ? styles.cardAction
                      : variant === "reaction"
                        ? styles.cardReaction
                        : variant === "neutral"
                          ? styles.cardNeutral
                          : styles.cardEmpty)
                  };
                  return (
                    <View key={`${stepIndex}-${index}`} style={styles.participantCell}>
                      <View style={cardStyle}>
                        {renderCardContent(item)}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function exportCombatPdf(combat, options = {}) {
  const theme = options.theme === "bw" ? "bw" : "color";
  const doc = <CombatDocument combat={combat} theme={theme} />;
  const blob = await pdf(doc).toBlob();
  const fileName = sanitizeFileName(
    `${combat.name || "combat"} - ${new Date().toISOString().slice(0, 10)}.pdf`
  );
  return { blob, fileName };
}
