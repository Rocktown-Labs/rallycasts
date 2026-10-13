import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCasterGig } from "@/contexts/caster-gig-context";

export default function ZoneModal() {
  const insets = useSafeAreaInsets();
  const { activeZone, availableZones, setActiveZone } = useCasterGig();

  const handleSelect = (zone: (typeof availableZones)[0]) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveZone(zone);
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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Court Coverage Zones</Text>
          <Text style={styles.subtitle}>
            Select your preferred broadcast dispatch zone
          </Text>
        </View>
        <Pressable
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {availableZones.map((zone) => {
          const isSelected = zone.id === activeZone.id;
          return (
            <Pressable
              key={zone.id}
              style={[
                styles.zoneCard,
                isSelected && styles.zoneCardSelected,
              ]}
              onPress={() => handleSelect(zone)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.nameCol}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneCity}>{zone.city}</Text>
                </View>
                <View style={styles.radio}>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color="#bcdf21" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={22} color="#56627a" />
                  )}
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Ionicons name="tennisball" size={12} color="#ffffff" />
                  <Text style={styles.statPillText}>
                    {zone.venueCount} Parks & Venues
                  </Text>
                </View>

                <View style={styles.statPill}>
                  <Ionicons name="radio" size={12} color="#bcdf21" />
                  <Text style={styles.statPillText}>
                    {zone.activeMatches} Matches Live
                  </Text>
                </View>

                {zone.isSurging && (
                  <View style={styles.surgeBadge}>
                    <Text style={styles.surgeText}>{zone.surgeMultiplier}</Text>
                  </View>
                )}
              </View>
            </Pressable>
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
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "#8892a0",
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  zoneCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#232834",
  },
  zoneCardSelected: {
    borderColor: "#bcdf21",
    backgroundColor: "#12201b",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  nameCol: {
    flex: 1,
    marginRight: 10,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  zoneCity: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  radio: {
    paddingTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statPillText: {
    fontSize: 11,
    color: "#c0c6d2",
    fontWeight: "600",
  },
  surgeBadge: {
    backgroundColor: "rgba(188, 223, 33, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  surgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#bcdf21",
  },
});
