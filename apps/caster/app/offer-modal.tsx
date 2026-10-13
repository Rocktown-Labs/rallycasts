import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { useCasterGig } from "@/contexts/caster-gig-context";

const TOTAL_SECONDS = 55;
const RADIUS = 32;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function OfferModal() {
  const insets = useSafeAreaInsets();
  const { activeOffer, acceptOffer, declineOffer } = useCasterGig();
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          declineOffer();
          router.back();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [declineOffer]);

  if (!activeOffer) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyText}>No active match request.</Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Return to Home</Text>
        </Pressable>
      </View>
    );
  }

  const strokeDashoffset =
    CIRCUMFERENCE - (secondsLeft / TOTAL_SECONDS) * CIRCUMFERENCE;

  const handleAccept = () => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    acceptOffer(activeOffer);
    router.replace("/active-gig");
  };

  const handleDecline = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    declineOffer();
    router.back();
  };

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
      {/* Top Banner with Countdown */}
      <View style={styles.topBar}>
        <View style={styles.alertPill}>
          <Ionicons name="flash" size={14} color="#bcdf21" />
          <Text style={styles.alertPillText}>NEW BROADCAST REQUEST</Text>
        </View>

        {/* Circular SVG Timer */}
        <View style={styles.timerWrapper}>
          <Svg width={76} height={76} viewBox="0 0 76 76">
            <Circle
              cx={38}
              cy={38}
              r={RADIUS}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth={5}
              fill="transparent"
            />
            <Circle
              cx={38}
              cy={38}
              r={RADIUS}
              stroke="#bcdf21"
              strokeWidth={5}
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 38 38)"
            />
          </Svg>
          <View style={styles.timerNumberOverlay}>
            <Text style={styles.timerNumber}>{secondsLeft}</Text>
            <Text style={styles.timerSec}>SEC</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Payout Hero Card */}
        <View style={styles.payoutCard}>
          <Text style={styles.payoutLabel}>ESTIMATED PAYOUT</Text>
          <Text style={styles.payoutAmount}>
            ${activeOffer.payout.total.toFixed(2)}
          </Text>
          <Text style={styles.payoutSub}>
            Includes Base (${activeOffer.payout.baseFee.toFixed(2)}) + 4K Gear (${activeOffer.payout.gearStipend.toFixed(2)}) + Est. Tip (${activeOffer.payout.estimatedTip.toFixed(2)})
          </Text>
        </View>

        {/* Match Overview Card */}
        <View style={styles.infoCard}>
          <View style={styles.badgeRow}>
            <View style={styles.divisionBadge}>
              <Text style={styles.divisionBadgeText}>
                {activeOffer.division}
              </Text>
            </View>
            <View style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>
                {activeOffer.eventTitle}
              </Text>
            </View>
          </View>

          <Text style={styles.matchTitle}>{activeOffer.matchTitle}</Text>

          <View style={styles.divider} />

          {/* Location & Court */}
          <View style={styles.metaRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="location" size={18} color="#bcdf21" />
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaPrimary}>{activeOffer.venueName}</Text>
              <Text style={styles.courtTag}>{activeOffer.courtNumber}</Text>
              <Text style={styles.metaSecondary}>{activeOffer.address}</Text>
            </View>
          </View>

          {/* Drive & Distance */}
          <View style={styles.metaRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="navigate" size={18} color="#005c23" />
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaPrimary}>
                {activeOffer.distanceMiles} miles • ~{activeOffer.estimatedDriveMins} min drive
              </Text>
              <Text style={styles.metaSecondary}>
                Match scheduled for {activeOffer.scheduledStartTime} ({activeOffer.estimatedDuration})
              </Text>
            </View>
          </View>

          {/* Players matchup */}
          <View style={styles.metaRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="people" size={18} color="#ffffff" />
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaPrimary}>Featured Matchup</Text>
              <Text style={styles.metaSecondary}>
                {activeOffer.players.teamA} vs {activeOffer.players.teamB}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Footer: Accept / Decline (Spark Pattern) */}
      <View style={styles.footerBar}>
        <Pressable
          style={styles.declineButton}
          onPress={handleDecline}
          accessibilityRole="button"
          accessibilityLabel="Decline match request"
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>

        <Pressable
          style={styles.acceptButton}
          onPress={handleAccept}
          accessibilityRole="button"
          accessibilityLabel={`Accept match for $${activeOffer.payout.total.toFixed(2)}`}
        >
          <Ionicons name="checkmark-circle" size={20} color="#000000" />
          <Text style={styles.acceptText}>
            Accept (${activeOffer.payout.total.toFixed(2)})
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0c12",
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    marginTop: 16,
    backgroundColor: "#005c23",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 8,
  },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(188, 223, 33, 0.15)",
    borderColor: "#bcdf21",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  alertPillText: {
    color: "#bcdf21",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timerWrapper: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  timerNumberOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timerNumber: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  timerSec: {
    color: "#8892a0",
    fontSize: 9,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  payoutCard: {
    backgroundColor: "#005c23",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#005c23",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  payoutLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 1,
  },
  payoutAmount: {
    fontSize: 44,
    fontWeight: "900",
    color: "#bcdf21",
    marginVertical: 4,
  },
  payoutSub: {
    fontSize: 12,
    color: "#e0f2d4",
    textAlign: "center",
    fontWeight: "500",
  },
  infoCard: {
    backgroundColor: "#161b26",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#232834",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  divisionBadge: {
    backgroundColor: "rgba(188, 223, 33, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  divisionBadgeText: {
    color: "#bcdf21",
    fontSize: 12,
    fontWeight: "700",
  },
  eventBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventBadgeText: {
    color: "#c0c6d2",
    fontSize: 12,
    fontWeight: "600",
  },
  matchTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: "#232834",
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  metaTextCol: {
    flex: 1,
  },
  metaPrimary: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  courtTag: {
    fontSize: 13,
    fontWeight: "800",
    color: "#bcdf21",
    marginTop: 2,
  },
  metaSecondary: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  footerBar: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#232834",
  },
  declineButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3a4254",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  declineText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#8892a0",
  },
  acceptButton: {
    flex: 2,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#bcdf21",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#bcdf21",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000000",
  },
});
