import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCasterGig } from "@/contexts/caster-gig-context";

export default function GigDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { completedGigs, activeGig } = useCasterGig();

  const gig =
    (activeGig && activeGig.id === id ? activeGig : null) ??
    completedGigs.find((g) => g.id === id) ??
    completedGigs[0];

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.navBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </Pressable>
        <Text style={styles.navTitle}>Broadcast Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Payout Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>CONFIRMED PAYOUT</Text>
          <Text style={styles.heroAmount}>
            ${"payout" in gig && typeof gig.payout === "object" ? gig.payout.total.toFixed(2) : Number(gig.payout).toFixed(2)}
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>Completed & Deposited</Text>
          </View>
        </View>

        {/* Match Overview Card */}
        <View style={styles.card}>
          <Text style={styles.matchTitle}>{gig.matchTitle}</Text>
          <Text style={styles.divisionText}>{gig.division}</Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Ionicons name="location" size={16} color="#bcdf21" />
            <Text style={styles.metaText}>
              {gig.venueName} • {gig.courtNumber}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time" size={16} color="#8892a0" />
            <Text style={styles.metaText}>
              {"duration" in gig ? gig.duration : gig.estimatedDuration} duration
            </Text>
          </View>
        </View>

        {/* Financial Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PAYOUT BREAKDOWN</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Base Match Broadcast</Text>
            <Text style={styles.rowValue}>$25.00</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>4K Video & Mic Rig Stipend</Text>
            <Text style={styles.rowValue}>$10.00</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Player / Organizer Tip</Text>
            <Text style={[styles.rowValue, styles.tipValue]}>
              +${"tip" in gig ? gig.tip.toFixed(2) : "payout" in gig && typeof gig.payout === "object" ? gig.payout.estimatedTip.toFixed(2) : "7.50"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total Deposited</Text>
            <Text style={styles.totalValue}>
              ${"payout" in gig && typeof gig.payout === "object" ? gig.payout.total.toFixed(2) : Number(gig.payout).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Broadcast Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>BROADCAST TIMELINE</Text>

          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineCol}>
              <Text style={styles.timelineTitle}>Offer Accepted</Text>
              <Text style={styles.timelineTime}>Dispatched to venue</Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineCol}>
              <Text style={styles.timelineTitle}>Arrived at Court & Checked-in</Text>
              <Text style={styles.timelineTime}>Met players & organizer</Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineCol}>
              <Text style={styles.timelineTitle}>Live 4K Stream Broadcasted</Text>
              <Text style={styles.timelineTime}>
                {"highlightsCount" in gig ? gig.highlightsCount : 8} Highlights tagged for RallyCasts
              </Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotComplete]} />
            <View style={styles.timelineCol}>
              <Text style={styles.timelineTitle}>Broadcast Finished & Cloud Uploaded</Text>
              <Text style={styles.timelineTime}>100% upload complete</Text>
            </View>
          </View>
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
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  placeholder: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: "#005c23",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 42,
    fontWeight: "900",
    color: "#bcdf21",
    marginVertical: 4,
  },
  statusPill: {
    backgroundColor: "rgba(188, 223, 33, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#bcdf21",
  },
  card: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  divisionText: {
    fontSize: 13,
    color: "#8892a0",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#232834",
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#c0c6d2",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: "#c0c6d2",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  tipValue: {
    color: "#ffd700",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#bcdf21",
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#bcdf21",
    marginTop: 4,
  },
  timelineDotComplete: {
    backgroundColor: "#005c23",
  },
  timelineCol: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  timelineTime: {
    fontSize: 11,
    color: "#8892a0",
    marginTop: 2,
  },
});
