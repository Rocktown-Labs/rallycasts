import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface HourBucket {
  hour: string;
  volume: number; // 0 - 100
  isPeak: boolean;
  isNow?: boolean;
}

const HOURLY_DATA: HourBucket[] = [
  { hour: "7A", volume: 35, isPeak: false },
  { hour: "8A", volume: 75, isPeak: true },
  { hour: "9A", volume: 95, isPeak: true, isNow: true },
  { hour: "10A", volume: 88, isPeak: true },
  { hour: "11A", volume: 60, isPeak: false },
  { hour: "12P", volume: 30, isPeak: false },
  { hour: "1P", volume: 20, isPeak: false },
  { hour: "2P", volume: 25, isPeak: false },
  { hour: "3P", volume: 40, isPeak: false },
  { hour: "4P", volume: 65, isPeak: false },
  { hour: "5P", volume: 90, isPeak: true },
  { hour: "6P", volume: 100, isPeak: true },
  { hour: "7P", volume: 80, isPeak: true },
  { hour: "8P", volume: 45, isPeak: false },
];

export function PopularTimesChart() {
  const [selectedDay, setSelectedDay] = useState<"Today" | "Tomorrow">("Today");

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>Popular Match Times</Text>
          <Text style={styles.subtitle}>
            Demand is highest right now (8:30 AM - 11:00 AM)
          </Text>
        </View>
        <View style={styles.dayToggle}>
          <Pressable
            onPress={() => setSelectedDay("Today")}
            style={[
              styles.dayButton,
              selectedDay === "Today" && styles.dayButtonActive,
            ]}
          >
            <Text
              style={[
                styles.dayButtonText,
                selectedDay === "Today" && styles.dayButtonTextActive,
              ]}
            >
              Today
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedDay("Tomorrow")}
            style={[
              styles.dayButton,
              selectedDay === "Tomorrow" && styles.dayButtonActive,
            ]}
          >
            <Text
              style={[
                styles.dayButtonText,
                selectedDay === "Tomorrow" && styles.dayButtonTextActive,
              ]}
            >
              Tomorrow
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Bar Chart View */}
      <View style={styles.chartContainer}>
        {HOURLY_DATA.map((item) => {
          const heightPct = Math.max(12, item.volume);
          return (
            <View key={item.hour} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${heightPct}%` },
                    item.isPeak && styles.barFillPeak,
                    item.isNow && styles.barFillNow,
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.hourText,
                  item.isNow && styles.hourTextNow,
                ]}
              >
                {item.hour}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend & Advice */}
      <View style={styles.adviceRow}>
        <Ionicons name="flash" size={14} color="#bcdf21" />
        <Text style={styles.adviceText}>
          Expect ~3-4 broadcast offers/hr during morning & evening rushes.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleCol: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  dayToggle: {
    flexDirection: "row",
    backgroundColor: "#11141d",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "#232834",
  },
  dayButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  dayButtonActive: {
    backgroundColor: "#005c23",
  },
  dayButtonText: {
    fontSize: 11,
    color: "#8892a0",
    fontWeight: "600",
  },
  dayButtonTextActive: {
    color: "#ffffff",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 90,
    paddingTop: 10,
    marginBottom: 12,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
  },
  barTrack: {
    flex: 1,
    width: 14,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
    backgroundColor: "rgba(136, 146, 160, 0.35)",
    borderRadius: 4,
  },
  barFillPeak: {
    backgroundColor: "rgba(188, 223, 33, 0.4)",
  },
  barFillNow: {
    backgroundColor: "#bcdf21",
    shadowColor: "#bcdf21",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  hourText: {
    fontSize: 9,
    color: "#6b778a",
    marginTop: 6,
    fontWeight: "600",
  },
  hourTextNow: {
    color: "#bcdf21",
    fontWeight: "800",
  },
  adviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(188, 223, 33, 0.08)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  adviceText: {
    fontSize: 12,
    color: "#c7d2a5",
    fontWeight: "500",
    flex: 1,
  },
});
