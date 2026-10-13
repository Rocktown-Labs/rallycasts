import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CasterHeader } from "@/components/caster-header";
import { CourtMapView } from "@/components/court-map-view";
import { PopularTimesChart } from "@/components/popular-times-chart";
import { useCasterGig } from "@/contexts/caster-gig-context";

export default function HomeDispatchScreen() {
  const {
    isOnDuty,
    toggleDuty,
    onDutyUntil,
    activeOffer,
    activeGig,
    simulateOffer,
    metrics,
  } = useCasterGig();

  const handleSimulate = () => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    simulateOffer();
    router.push("/offer-modal");
  };

  const handleToggleDuty = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleDuty();
  };

  return (
    <View style={styles.container}>
      <CasterHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Gig in Progress Alert (if any) */}
        {activeGig && activeGig.stage !== "completed" && (
          <Link href="/active-gig" asChild>
            <Pressable style={styles.activeGigCard}>
              <View style={styles.activeGigLeft}>
                <View style={styles.recPulseDot} />
                <View>
                  <Text style={styles.activeGigTitle}>
                    Broadcast in Progress
                  </Text>
                  <Text style={styles.activeGigSub}>
                    {activeGig.venueName} • {activeGig.courtNumber}
                  </Text>
                </View>
              </View>
              <View style={styles.activeGigRight}>
                <Text style={styles.resumeText}>Resume</Text>
                <Ionicons name="chevron-forward" size={16} color="#bcdf21" />
              </View>
            </Pressable>
          </Link>
        )}

        {/* Incoming Offer Alert Card (if offer is available) */}
        {activeOffer && !activeGig && (
          <Link href="/offer-modal" asChild>
            <Pressable style={styles.offerAlertCard}>
              <View style={styles.offerAlertLeft}>
                <View style={styles.offerBadge}>
                  <Ionicons name="flash" size={16} color="#000000" />
                </View>
                <View>
                  <Text style={styles.offerAlertTitle}>
                    1 Match Broadcast Request!
                  </Text>
                  <Text style={styles.offerAlertSub}>
                    {activeOffer.matchTitle} • ${activeOffer.payout.total.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.offerReviewBtn}>
                <Text style={styles.offerReviewText}>Review</Text>
              </View>
            </Pressable>
          </Link>
        )}

        {/* Pickleball Parks & Courts Map (Spark style) */}
        <CourtMapView />

        {/* Main Cast Now / On Duty Action Card */}
        <View style={styles.dutyCard}>
          <View style={styles.dutyInfoRow}>
            <View>
              <Text style={styles.dutyCardTitle}>
                {isOnDuty ? "Broadcaster Status: Online" : "You are currently Offline"}
              </Text>
              <Text style={styles.dutyCardSub}>
                {isOnDuty
                  ? `Receiving match requests until ${onDutyUntil}`
                  : "Go on duty to receive paid match broadcast offers"}
              </Text>
            </View>
          </View>

          <View style={styles.dutyButtonRow}>
            <Pressable
              style={[
                styles.mainDutyButton,
                isOnDuty ? styles.mainDutyButtonOnline : styles.mainDutyButtonOffline,
              ]}
              onPress={handleToggleDuty}
            >
              <Ionicons
                name={isOnDuty ? "radio" : "power"}
                size={20}
                color={isOnDuty ? "#000000" : "#ffffff"}
              />
              <Text
                style={[
                  styles.mainDutyButtonText,
                  isOnDuty && styles.mainDutyButtonTextOnline,
                ]}
              >
                {isOnDuty ? "CASTING NOW" : "GO ON DUTY"}
              </Text>
            </Pressable>

            {/* Test Simulation Trigger */}
            <Pressable
              style={styles.simButton}
              onPress={handleSimulate}
              accessibilityLabel="Simulate match offer"
            >
              <Ionicons name="refresh" size={16} color="#bcdf21" />
              <Text style={styles.simButtonText}>Test Offer</Text>
            </Pressable>
          </View>
        </View>

        {/* Spark-style Popular Times Chart */}
        <PopularTimesChart />

        {/* Active Surge Incentive Preview */}
        {metrics.activeIncentives[0] && (
          <Link href="/metrics" asChild>
            <Pressable style={styles.incentiveCard}>
              <View style={styles.incentiveHeader}>
                <View style={styles.incentiveIconBox}>
                  <Ionicons name="trophy" size={18} color="#ffd700" />
                </View>
                <View style={styles.incentiveTextCol}>
                  <Text style={styles.incentiveTitle}>
                    {metrics.activeIncentives[0].title}
                  </Text>
                  <Text style={styles.incentiveDesc}>
                    {metrics.activeIncentives[0].description}
                  </Text>
                </View>
                <View style={styles.rewardTag}>
                  <Text style={styles.rewardTagText}>
                    {metrics.activeIncentives[0].reward}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(metrics.activeIncentives[0].progress / metrics.activeIncentives[0].target) * 100}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressCount}>
                  {metrics.activeIncentives[0].progress} of {metrics.activeIncentives[0].target} Matches Completed
                </Text>
                <Text style={styles.progressExpires}>
                  {metrics.activeIncentives[0].expiresIn}
                </Text>
              </View>
            </Pressable>
          </Link>
        )}
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
    paddingBottom: 24,
  },
  activeGigCard: {
    backgroundColor: "rgba(0, 92, 35, 0.4)",
    borderColor: "#bcdf21",
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeGigLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  recPulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff3b30",
  },
  activeGigTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  activeGigSub: {
    color: "#c0d8c2",
    fontSize: 12,
  },
  activeGigRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resumeText: {
    color: "#bcdf21",
    fontWeight: "800",
    fontSize: 13,
  },
  offerAlertCard: {
    backgroundColor: "#1c2230",
    borderColor: "#bcdf21",
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offerAlertLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  offerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#bcdf21",
    alignItems: "center",
    justifyContent: "center",
  },
  offerAlertTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  offerAlertSub: {
    color: "#8892a0",
    fontSize: 12,
  },
  offerReviewBtn: {
    backgroundColor: "#bcdf21",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  offerReviewText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 12,
  },
  dutyCard: {
    backgroundColor: "#161b26",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  dutyInfoRow: {
    marginBottom: 14,
  },
  dutyCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  dutyCardSub: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  dutyButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  mainDutyButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mainDutyButtonOnline: {
    backgroundColor: "#bcdf21",
  },
  mainDutyButtonOffline: {
    backgroundColor: "#005c23",
  },
  mainDutyButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  mainDutyButtonTextOnline: {
    color: "#000000",
  },
  simButton: {
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bcdf21",
    backgroundColor: "rgba(188, 223, 33, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  simButtonText: {
    color: "#bcdf21",
    fontWeight: "700",
    fontSize: 12,
  },
  incentiveCard: {
    backgroundColor: "#161b26",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  incentiveHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  incentiveIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  incentiveTextCol: {
    flex: 1,
  },
  incentiveTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  incentiveDesc: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  rewardTag: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rewardTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffd700",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#232834",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ffd700",
    borderRadius: 3,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressCount: {
    fontSize: 11,
    color: "#c0c6d2",
    fontWeight: "600",
  },
  progressExpires: {
    fontSize: 11,
    color: "#8892a0",
  },
});
