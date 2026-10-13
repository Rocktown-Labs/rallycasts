import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCasterGig } from "@/contexts/caster-gig-context";
import { ThemeToggle } from "./theme-toggle";

interface CasterHeaderProps {
  title?: string;
  showZoneSelector?: boolean;
}

export function CasterHeader({
  title,
  showZoneSelector = true,
}: CasterHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isOnDuty, toggleDuty, onDutyUntil, activeZone } = useCasterGig();

  const handleDutyPress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleDuty();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 12) },
      ]}
    >
      <View style={styles.topRow}>
        {/* Left: Brand & Status toggle */}
        <View style={styles.leftCol}>
          <Pressable
            onPress={handleDutyPress}
            style={[
              styles.dutyPill,
              isOnDuty ? styles.dutyPillActive : styles.dutyPillInactive,
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: isOnDuty }}
            accessibilityLabel={
              isOnDuty ? `On Duty until ${onDutyUntil}` : "Offline, tap to go on duty"
            }
          >
            <View
              style={[
                styles.dutyDot,
                isOnDuty ? styles.dutyDotActive : styles.dutyDotInactive,
              ]}
            />
            <Text
              style={[
                styles.dutyText,
                isOnDuty ? styles.dutyTextActive : styles.dutyTextInactive,
              ]}
            >
              {isOnDuty ? "ON DUTY" : "OFFLINE"}
            </Text>
          </Pressable>

          {title ? (
            <Text style={styles.headerTitle}>{title}</Text>
          ) : (
            isOnDuty && (
              <Text style={styles.dutyTimer}>
                Until {onDutyUntil}
              </Text>
            )
          )}
        </View>

        {/* Right: Controls & Theme Toggle */}
        <View style={styles.rightCol}>
          <ThemeToggle />

          <Link href="/more" asChild>
            <Pressable
              style={styles.avatarButton}
              accessibilityLabel="Caster Profile & Settings"
            >
              <View style={styles.avatarInner}>
                <Ionicons name="videocam" size={16} color="#ffffff" />
              </View>
              <View style={styles.goldBadge}>
                <Ionicons name="star" size={8} color="#000000" />
              </View>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Zone selection pill (Spark style zone bar) */}
      {showZoneSelector && (
        <Link href="/zone-modal" asChild>
          <Pressable style={styles.zoneRow} accessibilityLabel="Change coverage zone">
            <View style={styles.zoneLeft}>
              <Ionicons name="location-sharp" size={14} color="#bcdf21" />
              <Text style={styles.zoneName} numberOfLines={1}>
                {activeZone.name}
              </Text>
            </View>
            <View style={styles.zoneRight}>
              {activeZone.isSurging && (
                <View style={styles.surgeTag}>
                  <Text style={styles.surgeText}>{activeZone.surgeMultiplier}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={14} color="#8892a0" />
            </View>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  dutyPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  dutyPillActive: {
    backgroundColor: "rgba(0, 92, 35, 0.4)",
    borderWidth: 1,
    borderColor: "#005c23",
  },
  dutyPillInactive: {
    backgroundColor: "rgba(120, 120, 128, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(120, 120, 128, 0.3)",
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dutyDotActive: {
    backgroundColor: "#bcdf21",
  },
  dutyDotInactive: {
    backgroundColor: "#8892a0",
  },
  dutyText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dutyTextActive: {
    color: "#bcdf21",
  },
  dutyTextInactive: {
    color: "#8892a0",
  },
  dutyTimer: {
    fontSize: 12,
    color: "#8892a0",
    fontWeight: "500",
  },
  avatarButton: {
    position: "relative",
  },
  avatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#005c23",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#bcdf21",
  },
  goldBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#ffd700",
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  zoneLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  zoneName: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "600",
    flex: 1,
  },
  zoneRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  surgeTag: {
    backgroundColor: "rgba(188, 223, 33, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  surgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bcdf21",
  },
});
