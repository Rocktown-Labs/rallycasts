import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CasterHeader } from "@/components/caster-header";
import { useCasterGig } from "@/contexts/caster-gig-context";

const PAST_STATEMENTS = [
  { week: "Oct 6 - Oct 12", broadcasts: 12, amount: 520.0, tips: 94.0 },
  { week: "Sep 29 - Oct 5", broadcasts: 10, amount: 465.0, tips: 78.5 },
  { week: "Sep 22 - Sep 28", broadcasts: 14, amount: 610.0, tips: 110.0 },
];

export default function EarningsScreen() {
  const { weeklyEarnings } = useCasterGig();

  const handleCashOut = () => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert(
      "Instant Cash Out",
      `Transfer $${weeklyEarnings.total.toFixed(2)} to your connected debit card ending in •••• 4192?\n\nProcessing fee: $0.00 (RallyCaster Gold perk)`,
      [
        { text: "Confirm Transfer", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const maxDaily = Math.max(...weeklyEarnings.daily.map((d) => d.amount), 1);

  return (
    <View style={styles.container}>
      <CasterHeader title="Earnings" showZoneSelector={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly Earnings Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>THIS WEEK'S CONFIRMED EARNINGS</Text>
          <Text style={styles.heroAmount}>
            ${weeklyEarnings.total.toFixed(2)}
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>
                {weeklyEarnings.broadcastsCount}
              </Text>
              <Text style={styles.heroStatLbl}>Matches</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>
                {weeklyEarnings.hoursBroadcast}h
              </Text>
              <Text style={styles.heroStatLbl}>Court Time</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>
                ${weeklyEarnings.tipsTotal.toFixed(2)}
              </Text>
              <Text style={styles.heroStatLbl}>Tips</Text>
            </View>
          </View>

          <Pressable style={styles.cashOutButton} onPress={handleCashOut}>
            <Ionicons name="flash" size={16} color="#000000" />
            <Text style={styles.cashOutButtonText}>Instant Cash Out</Text>
          </Pressable>
        </View>

        {/* Daily Breakdown Bar Chart (Spark Style) */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>DAILY BREAKDOWN</Text>
          <View style={styles.barsContainer}>
            {weeklyEarnings.daily.map((day) => {
              const heightPct = Math.max(10, (day.amount / maxDaily) * 100);
              return (
                <View key={day.day} style={styles.barCol}>
                  <Text style={styles.barAmount}>
                    ${day.amount > 0 ? Math.round(day.amount) : 0}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPct}%` },
                        day.isToday && styles.barFillToday,
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barDayLabel,
                      day.isToday && styles.barDayLabelToday,
                    ]}
                  >
                    {day.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Payout Category Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>PAYOUT COMPOSITION</Text>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.colorDot, { backgroundColor: "#005c23" }]} />
              <Text style={styles.breakdownLabel}>Base Match Broadcast Fees</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              ${(weeklyEarnings.total - weeklyEarnings.tipsTotal - 70).toFixed(2)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.colorDot, { backgroundColor: "#bcdf21" }]} />
              <Text style={styles.breakdownLabel}>4K Rig & Audio Stipends</Text>
            </View>
            <Text style={styles.breakdownAmount}>$70.00</Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.colorDot, { backgroundColor: "#ffd700" }]} />
              <Text style={styles.breakdownLabel}>Player & Organizer Tips</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              ${weeklyEarnings.tipsTotal.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Weekly Statement Archive */}
        <View style={styles.statementsCard}>
          <Text style={styles.sectionTitle}>PREVIOUS WEEKLY STATEMENTS</Text>
          {PAST_STATEMENTS.map((stmt) => (
            <View key={stmt.week} style={styles.statementRow}>
              <View>
                <Text style={styles.stmtWeek}>{stmt.week}</Text>
                <Text style={styles.stmtSub}>
                  {stmt.broadcasts} broadcasts • ${stmt.tips.toFixed(2)} in tips
                </Text>
              </View>
              <View style={styles.stmtRight}>
                <Text style={styles.stmtAmount}>
                  ${stmt.amount.toFixed(2)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#8892a0" />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0c12",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: "#161b26",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 44,
    fontWeight: "900",
    color: "#bcdf21",
    marginVertical: 6,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
    width: "100%",
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
  },
  heroStatVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroStatLbl: {
    fontSize: 11,
    color: "#8892a0",
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#2a3142",
  },
  cashOutButton: {
    backgroundColor: "#bcdf21",
    height: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginTop: 6,
  },
  cashOutButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
  },
  chartCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barAmount: {
    fontSize: 10,
    color: "#8892a0",
    fontWeight: "700",
    marginBottom: 6,
  },
  barTrack: {
    flex: 1,
    width: 18,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
    backgroundColor: "rgba(188, 223, 33, 0.3)",
    borderRadius: 4,
  },
  barFillToday: {
    backgroundColor: "#bcdf21",
  },
  barDayLabel: {
    fontSize: 11,
    color: "#6b778a",
    marginTop: 6,
    fontWeight: "600",
  },
  barDayLabelToday: {
    color: "#bcdf21",
    fontWeight: "800",
  },
  breakdownCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#202533",
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#c0c6d2",
    fontWeight: "600",
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  statementsCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  statementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#202533",
  },
  stmtWeek: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  stmtSub: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  stmtRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stmtAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#bcdf21",
  },
});
