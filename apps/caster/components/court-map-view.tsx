import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

interface VenuePin {
  id: string;
  name: string;
  shortName: string;
  courtsCount: number;
  activeMatches: number;
  surgeBonus: string;
  isHot: boolean;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

const VENUES: VenuePin[] = [
  {
    id: "v-burns",
    name: "Burns Park Pickleball Complex",
    shortName: "Burns Park",
    courtsCount: 16,
    activeMatches: 8,
    surgeBonus: "+$15",
    isHot: true,
    x: 48,
    y: 32,
  },
  {
    id: "v-kanis",
    name: "Kanis Park Pickleball Facility",
    shortName: "Kanis Park",
    courtsCount: 8,
    activeMatches: 4,
    surgeBonus: "+$10",
    isHot: false,
    x: 28,
    y: 65,
  },
  {
    id: "v-lrac",
    name: "Little Rock Athletic Club",
    shortName: "LRAC Stadium",
    courtsCount: 6,
    activeMatches: 5,
    surgeBonus: "+$12",
    isHot: true,
    x: 74,
    y: 58,
  },
  {
    id: "v-riverfront",
    name: "Riverfront Park Courts",
    shortName: "Riverfront",
    courtsCount: 6,
    activeMatches: 3,
    surgeBonus: "+$8",
    isHot: false,
    x: 62,
    y: 38,
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_HEIGHT = 280;

export function CourtMapView({
  onSelectVenue,
}: {
  onSelectVenue?: (venue: VenuePin) => void;
}) {
  const [selectedVenue, setSelectedVenue] = useState<VenuePin>(VENUES[0]);

  // Radar pulse animation for active duty
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    pulseScale.set(
      withRepeat(
        withSequence(
          withTiming(1.6, { duration: 1500 }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      )
    );
    pulseOpacity.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 1500 }),
          withTiming(0.6, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [pulseOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.get() }],
    opacity: pulseOpacity.get(),
  }));

  const handlePinPress = (venue: VenuePin) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedVenue(venue);
    if (onSelectVenue) {
      onSelectVenue(venue);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Graphic Canvas */}
      <View style={styles.mapCanvas}>
        <Svg
          width="100%"
          height={MAP_HEIGHT}
          viewBox="0 0 400 280"
          style={StyleSheet.absoluteFill}
        >
          {/* Background Map Grid & Roads */}
          <Rect x="0" y="0" width="400" height="280" fill="#131722" />

          {/* River / Natural water curve */}
          <Path
            d="M 0 110 Q 120 130 200 90 T 400 120 L 400 145 Q 260 115 190 120 T 0 135 Z"
            fill="#18283a"
          />

          {/* Major Roads / Arteries */}
          <Line
            x1="30"
            y1="0"
            x2="380"
            y2="280"
            stroke="#212a3d"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <Line
            x1="0"
            y1="190"
            x2="400"
            y2="180"
            stroke="#212a3d"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <Line
            x1="180"
            y1="0"
            x2="190"
            y2="280"
            stroke="#28334a"
            strokeWidth="5"
          />
          <Line
            x1="0"
            y1="80"
            x2="400"
            y2="70"
            stroke="#1d2535"
            strokeWidth="4"
          />

          {/* Park Green Areas */}
          <Rect
            x="160"
            y="60"
            width="80"
            height="55"
            rx="12"
            fill="rgba(0, 92, 35, 0.25)"
            stroke="rgba(0, 92, 35, 0.5)"
            strokeWidth="1.5"
          />
          <Rect
            x="80"
            y="160"
            width="65"
            height="50"
            rx="10"
            fill="rgba(0, 92, 35, 0.2)"
            stroke="rgba(0, 92, 35, 0.4)"
            strokeWidth="1"
          />
          <Rect
            x="260"
            y="140"
            width="70"
            height="50"
            rx="10"
            fill="rgba(0, 92, 35, 0.2)"
            stroke="rgba(0, 92, 35, 0.4)"
            strokeWidth="1"
          />

          {/* Hot Surge Radius around Burns Park */}
          <Circle
            cx="192"
            cy="90"
            r="44"
            fill="rgba(188, 223, 33, 0.08)"
            stroke="rgba(188, 223, 33, 0.4)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        </Svg>

        {/* User Caster Position Marker (Center-South) */}
        <View style={[styles.userPosition, { left: "42%", top: "72%" }]}>
          <Animated.View style={[styles.userRadarRing, pulseStyle]} />
          <View style={styles.userDot}>
            <Ionicons name="radio" size={14} color="#000000" />
          </View>
        </View>

        {/* Interactive Venue Pins */}
        {VENUES.map((venue) => {
          const isSelected = selectedVenue.id === venue.id;
          return (
            <Pressable
              key={venue.id}
              onPress={() => handlePinPress(venue)}
              style={[
                styles.pinWrapper,
                { left: `${venue.x}%`, top: `${venue.y}%` },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${venue.name}, ${venue.courtsCount} courts`}
            >
              <View
                style={[
                  styles.pinCard,
                  isSelected && styles.pinCardSelected,
                  venue.isHot && styles.pinCardHot,
                ]}
              >
                <View style={styles.pinIconRow}>
                  <Ionicons
                    name="tennisball"
                    size={11}
                    color={venue.isHot ? "#bcdf21" : "#ffffff"}
                  />
                  <Text style={styles.pinText}>{venue.shortName}</Text>
                </View>
                {venue.isHot && (
                  <View style={styles.pinSurgeBadge}>
                    <Text style={styles.pinSurgeText}>{venue.surgeBonus}</Text>
                  </View>
                )}
              </View>
              {/* Pin Arrow */}
              <View
                style={[
                  styles.pinArrow,
                  isSelected && styles.pinArrowSelected,
                ]}
              />
            </Pressable>
          );
        })}

        {/* Floating Map Legend Pill */}
        <View style={styles.legendOverlay}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#bcdf21" }]} />
            <Text style={styles.legendText}>High Match Surge</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#005c23" }]} />
            <Text style={styles.legendText}>Courts Active</Text>
          </View>
        </View>
      </View>

      {/* Selected Venue Card Preview */}
      <View style={styles.venueInfoCard}>
        <View style={styles.venueHeader}>
          <View style={styles.venueTitleCol}>
            <Text style={styles.venueName}>{selectedVenue.name}</Text>
            <Text style={styles.venueSubtitle}>
              {selectedVenue.courtsCount} Courts Total • {selectedVenue.activeMatches} Matches Live Now
            </Text>
          </View>
          <View style={styles.surgeBadgeLarge}>
            <Text style={styles.surgeBadgeText}>{selectedVenue.surgeBonus}</Text>
            <Text style={styles.surgeBadgeSub}>Per Match</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#131722",
    borderWidth: 1,
    borderColor: "#232834",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  mapCanvas: {
    height: MAP_HEIGHT,
    position: "relative",
  },
  userPosition: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    marginLeft: -16,
    marginTop: -16,
  },
  userRadarRing: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(188, 223, 33, 0.4)",
  },
  userDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#bcdf21",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  pinWrapper: {
    position: "absolute",
    alignItems: "center",
    marginLeft: -45,
    marginTop: -32,
  },
  pinCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(23, 27, 38, 0.92)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  pinCardSelected: {
    borderColor: "#bcdf21",
    backgroundColor: "#005c23",
  },
  pinCardHot: {
    borderColor: "#bcdf21",
  },
  pinIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pinText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  pinSurgeBadge: {
    backgroundColor: "#bcdf21",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  pinSurgeText: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "800",
  },
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(23, 27, 38, 0.92)",
  },
  pinArrowSelected: {
    borderTopColor: "#005c23",
  },
  legendOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(10, 12, 18, 0.8)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    color: "#c0c6d2",
    fontSize: 10,
    fontWeight: "600",
  },
  venueInfoCard: {
    padding: 12,
    backgroundColor: "#161b26",
    borderTopWidth: 1,
    borderTopColor: "#232834",
  },
  venueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  venueTitleCol: {
    flex: 1,
  },
  venueName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  venueSubtitle: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  surgeBadgeLarge: {
    backgroundColor: "rgba(188, 223, 33, 0.15)",
    borderColor: "#bcdf21",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  surgeBadgeText: {
    color: "#bcdf21",
    fontSize: 13,
    fontWeight: "800",
  },
  surgeBadgeSub: {
    color: "#bcdf21",
    fontSize: 9,
    fontWeight: "600",
  },
});
