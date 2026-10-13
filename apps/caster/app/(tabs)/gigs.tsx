import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CasterHeader } from "@/components/caster-header";
import { useCasterGig } from "@/contexts/caster-gig-context";

export default function GigsScreen() {
  const { completedGigs, activeGig } = useCasterGig();
  const [filter, setFilter] = useState<"all" | "today">("all");

  const filteredGigs =
    filter === "today"
      ? completedGigs.filter((g) => g.date.includes("Today"))
      : completedGigs;

  const handleFilterChange = (newFilter: "all" | "today") => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setFilter(newFilter);
  };

  return (
    <View style={styles.container}>
      <CasterHeader title="Broadcast Gigs" showZoneSelector={false} />

      {/* Filter Segment Tabs */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={[
            styles.segmentBtn,
            filter === "all" && styles.segmentBtnActive,
          ]}
          onPress={() => handleFilterChange("all")}
        >
          <Text
            style={[
              styles.segmentText,
              filter === "all" && styles.segmentTextActive,
            ]}
          >
            All Matches ({completedGigs.length})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentBtn,
            filter === "today" && styles.segmentBtnActive,
          ]}
          onPress={() => handleFilterChange("today")}
        >
          <Text
            style={[
              styles.segmentText,
              filter === "today" && styles.segmentTextActive,
            ]}
          >
            Today's Activity
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Gig in Progress (if any) */}
        {activeGig && (
          <Link href="/active-gig" asChild>
            <Pressable style={styles.liveCard}>
              <View style={styles.liveBadgeRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveBadgeText}>IN PROGRESS</Text>
              </View>
              <Text style={styles.liveTitle}>{activeGig.matchTitle}</Text>
              <Text style={styles.liveSub}>
                {activeGig.venueName} • {activeGig.courtNumber}
              </Text>
              <View style={styles.liveFooter}>
                <Text style={styles.livePayout}>
                  ${activeGig.payout.total.toFixed(2)} Est. Payout
                </Text>
                <Text style={styles.liveAction}>Open Viewfinder →</Text>
              </View>
            </Pressable>
          </Link>
        )}

        {/* Historic Gigs List */}
        {filteredGigs.map((gig) => (
          <Link key={gig.id} href={`/gig/${gig.id}`} asChild>
            <Pressable style={styles.gigCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.dateText}>
                    {gig.date} • {gig.time}
                  </Text>
                  <Text style={styles.titleText}>{gig.matchTitle}</Text>
                </View>
                <View style={styles.payoutCol}>
                  <Text style={styles.payoutText}>
                    ${gig.payout.toFixed(2)}
                  </Text>
                  {gig.tip > 0 && (
                    <Text style={styles.tipText}>+${gig.tip.toFixed(2)} tip</Text>
                  )}
                </View>
              </View>

              <View style={styles.venueRow}>
                <Ionicons name="location" size={14} color="#bcdf21" />
                <Text style={styles.venueText}>
                  {gig.venueName} ({gig.courtNumber})
                </Text>
              </View>

              <View style={styles.footerRow}>
                <View style={styles.tagsGroup}>
                  <View style={styles.statusTag}>
                    <Text style={styles.statusTagText}>{gig.status}</Text>
                  </View>
                  <View style={styles.durationTag}>
                    <Ionicons name="time" size={12} color="#8892a0" />
                    <Text style={styles.durationTagText}>{gig.duration}</Text>
                  </View>
                  <View style={styles.highlightTag}>
                    <Ionicons name="star" size={12} color="#ffd700" />
                    <Text style={styles.highlightTagText}>
                      {gig.highlightsCount} Highlights
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#8892a0" />
              </View>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0c12",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#161b26",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232834",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: "#005c23",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8892a0",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  liveCard: {
    backgroundColor: "rgba(0, 92, 35, 0.4)",
    borderColor: "#bcdf21",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  liveBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff3b30",
  },
  liveBadgeText: {
    color: "#bcdf21",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  liveTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  liveSub: {
    fontSize: 13,
    color: "#c0d8c2",
    marginTop: 2,
  },
  liveFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(188, 223, 33, 0.3)",
  },
  livePayout: {
    fontSize: 14,
    fontWeight: "800",
    color: "#bcdf21",
  },
  liveAction: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  gigCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232834",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  metaCol: {
    flex: 1,
    marginRight: 12,
  },
  dateText: {
    fontSize: 12,
    color: "#8892a0",
    fontWeight: "600",
  },
  titleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 2,
  },
  payoutCol: {
    alignItems: "flex-end",
  },
  payoutText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#bcdf21",
  },
  tipText: {
    fontSize: 11,
    color: "#ffd700",
    fontWeight: "700",
    marginTop: 1,
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  venueText: {
    fontSize: 13,
    color: "#c0c6d2",
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#202533",
  },
  tagsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  statusTag: {
    backgroundColor: "rgba(0, 92, 35, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bcdf21",
  },
  durationTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationTagText: {
    fontSize: 11,
    color: "#8892a0",
    fontWeight: "600",
  },
  highlightTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  highlightTagText: {
    fontSize: 11,
    color: "#ffd700",
    fontWeight: "700",
  },
});
