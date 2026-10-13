import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CasterHeader } from "@/components/caster-header";
import { useCasterGig } from "@/contexts/caster-gig-context";

export default function MetricsScreen() {
  const { metrics } = useCasterGig();

  const progressPct = Math.min(
    100,
    Math.round((metrics.points / metrics.maxPoints) * 100)
  );

  return (
    <View style={styles.container}>
      <CasterHeader title="Caster Metrics" showZoneSelector={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tier Banner Card */}
        <View style={styles.tierCard}>
          <View style={styles.tierTop}>
            <View style={styles.tierBadgeBox}>
              <Ionicons name="shield-checkmark" size={24} color="#ffd700" />
            </View>
            <View style={styles.tierTextCol}>
              <View style={styles.tierRow}>
                <Text style={styles.tierName}>{metrics.tier}</Text>
                <View style={styles.tierPerkPill}>
                  <Text style={styles.tierPerkText}>Priority Dispatch</Text>
                </View>
              </View>
              <Text style={styles.tierSub}>
                {metrics.points} / {metrics.maxPoints} pts to Pro Caster
              </Text>
            </View>
          </View>

          {/* Tier Progress Bar */}
          <View style={styles.tierProgressTrack}>
            <View
              style={[styles.tierProgressFill, { width: `${progressPct}%` }]}
            />
          </View>
          <Text style={styles.tierProgressCaption}>
            Earn 580 more points by Nov 1 to unlock Pro Caster + 15% bonus per broadcast
          </Text>
        </View>

        {/* Scorecards Grid (Spark Metric Cards) */}
        <Text style={styles.sectionHeader}>PERFORMANCE SCORECARDS</Text>
        <View style={styles.gridRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="time" size={18} color="#bcdf21" />
              <View style={styles.standingPill}>
                <Text style={styles.standingText}>High</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>
              {metrics.onTimeArrivalRate}%
            </Text>
            <Text style={styles.metricLabel}>On-Time Court Arrival</Text>
            <Text style={styles.metricDetail}>Target: 95% or higher</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="checkmark-done-circle" size={18} color="#bcdf21" />
              <View style={styles.standingPill}>
                <Text style={styles.standingText}>High</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>
              {metrics.broadcastCompletionRate}%
            </Text>
            <Text style={styles.metricLabel}>Broadcast Completion</Text>
            <Text style={styles.metricDetail}>0 dropped matches</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="videocam" size={18} color="#ffd700" />
              <View style={styles.standingPill}>
                <Text style={styles.standingText}>Top 5%</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>
              {metrics.streamQualityRating} ★
            </Text>
            <Text style={styles.metricLabel}>4K Stream Quality</Text>
            <Text style={styles.metricDetail}>Bitrate & framing score</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="people" size={18} color="#ffd700" />
              <View style={styles.standingPill}>
                <Text style={styles.standingText}>5.0 ★</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>
              {metrics.totalReviews}
            </Text>
            <Text style={styles.metricLabel}>Player Reviews</Text>
            <Text style={styles.metricDetail}>100% positive feedback</Text>
          </View>
        </View>

        {/* Active Surge Incentives & Quests (Spark Incentives Screen) */}
        <Text style={styles.sectionHeader}>ACTIVE SURGE INCENTIVES & QUESTS</Text>
        {metrics.activeIncentives.map((inc) => {
          const isDone = inc.progress >= inc.target;
          return (
            <View key={inc.id} style={styles.incentiveCard}>
              <View style={styles.incentiveTop}>
                <View style={styles.incIconBox}>
                  <Ionicons
                    name={isDone ? "checkmark-circle" : "flame"}
                    size={20}
                    color={isDone ? "#005c23" : "#ffd700"}
                  />
                </View>
                <View style={styles.incTextCol}>
                  <Text style={styles.incTitle}>{inc.title}</Text>
                  <Text style={styles.incDesc}>{inc.description}</Text>
                </View>
                <View
                  style={[
                    styles.incRewardBadge,
                    isDone && styles.incRewardBadgeDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.incRewardText,
                      isDone && styles.incRewardTextDone,
                    ]}
                  >
                    {inc.reward}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.incTrack}>
                <View
                  style={[
                    styles.incFill,
                    {
                      width: `${Math.min(100, (inc.progress / inc.target) * 100)}%`,
                    },
                    isDone && styles.incFillDone,
                  ]}
                />
              </View>
              <View style={styles.incFooter}>
                <Text style={styles.incProgress}>
                  {inc.progress} of {inc.target} Completed
                </Text>
                <Text style={styles.incExpiry}>{inc.expiresIn}</Text>
              </View>
            </View>
          );
        })}
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
  tierCard: {
    backgroundColor: "#161b26",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#232834",
  },
  tierTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  tierBadgeBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  tierTextCol: {
    flex: 1,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  tierPerkPill: {
    backgroundColor: "rgba(188, 223, 33, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierPerkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bcdf21",
  },
  tierSub: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  tierProgressTrack: {
    height: 8,
    backgroundColor: "#242b3a",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  tierProgressFill: {
    height: "100%",
    backgroundColor: "#ffd700",
    borderRadius: 4,
  },
  tierProgressCaption: {
    fontSize: 11,
    color: "#8892a0",
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#232834",
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  standingPill: {
    backgroundColor: "rgba(188, 223, 33, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  standingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#bcdf21",
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#ffffff",
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#c0c6d2",
    marginTop: 2,
  },
  metricDetail: {
    fontSize: 11,
    color: "#8892a0",
    marginTop: 4,
  },
  incentiveCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232834",
  },
  incentiveTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  incIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  incTextCol: {
    flex: 1,
  },
  incTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  incDesc: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  incRewardBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  incRewardBadgeDone: {
    backgroundColor: "rgba(0, 92, 35, 0.3)",
  },
  incRewardText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffd700",
  },
  incRewardTextDone: {
    color: "#bcdf21",
  },
  incTrack: {
    height: 6,
    backgroundColor: "#242b3a",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  incFill: {
    height: "100%",
    backgroundColor: "#ffd700",
    borderRadius: 3,
  },
  incFillDone: {
    backgroundColor: "#005c23",
  },
  incFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  incProgress: {
    fontSize: 11,
    color: "#c0c6d2",
    fontWeight: "600",
  },
  incExpiry: {
    fontSize: 11,
    color: "#8892a0",
  },
});
