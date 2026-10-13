import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { CasterHeader } from "@/components/caster-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCasterGig } from "@/contexts/caster-gig-context";

export default function MoreScreen() {
  const { activeZone, metrics } = useCasterGig();
  const [autoAcceptPreferred, setAutoAcceptPreferred] = useState(false);
  const [loudAlerts, setLoudAlerts] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const handleToggle = (setter: (v: boolean) => void, val: boolean) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setter(val);
  };

  const handleGearGuide = () => {
    Alert.alert(
      "RallyCaster Recommended Rig",
      "• Tripod: 6ft+ height with fluid ballhead\n• Optics: 4K 60fps recording capability\n• Audio: Wireless 2.4GHz lavalier or court boundary mic\n• Power: 20,000mAh external battery pack",
      [{ text: "Got it", style: "default" }]
    );
  };

  return (
    <View style={styles.container}>
      <CasterHeader title="Caster Profile" showZoneSelector={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Ionicons name="videocam" size={28} color="#ffffff" />
            <View style={styles.goldBadge}>
              <Ionicons name="star" size={10} color="#000000" />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Austin Miller</Text>
            <Text style={styles.casterId}>Caster ID: #RC-8821 • Little Rock, AR</Text>
            <View style={styles.profileBadgeRow}>
              <View style={styles.tierPill}>
                <Text style={styles.tierPillText}>{metrics.tier}</Text>
              </View>
              <View style={styles.verifiedPill}>
                <Ionicons name="checkmark-circle" size={12} color="#bcdf21" />
                <Text style={styles.verifiedText}>Certified 4K Caster</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section: Rig & Dispatch Preferences */}
        <Text style={styles.sectionHeader}>BROADCAST & DISPATCH</Text>
        <View style={styles.card}>
          <Link href="/zone-modal" asChild>
            <Pressable style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <Ionicons name="location" size={18} color="#bcdf21" />
                <View>
                  <Text style={styles.menuLabel}>Coverage Zone</Text>
                  <Text style={styles.menuSub}>{activeZone.name}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8892a0" />
            </Pressable>
          </Link>

          <Pressable style={styles.menuRow} onPress={handleGearGuide}>
            <View style={styles.menuLeft}>
              <Ionicons name="camera" size={18} color="#ffd700" />
              <View>
                <Text style={styles.menuLabel}>Equipment & Rig Checklist</Text>
                <Text style={styles.menuSub}>
                  4K Mount, Wireless Mic, Battery Pack
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8892a0" />
          </Pressable>

          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Ionicons name="volume-high" size={18} color="#ffffff" />
              <View>
                <Text style={styles.menuLabel}>Loud Match Alert Sound</Text>
                <Text style={styles.menuSub}>Over-ride silent mode for offers</Text>
              </View>
            </View>
            <Switch
              value={loudAlerts}
              onValueChange={(val) => handleToggle(setLoudAlerts, val)}
              trackColor={{ false: "#232834", true: "#005c23" }}
              thumbColor={loudAlerts ? "#bcdf21" : "#8892a0"}
            />
          </View>

          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Ionicons name="phone-portrait" size={18} color="#ffffff" />
              <View>
                <Text style={styles.menuLabel}>Haptic Feedback</Text>
                <Text style={styles.menuSub}>Vibrate on swipe confirmation</Text>
              </View>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={(val) => handleToggle(setHapticsEnabled, val)}
              trackColor={{ false: "#232834", true: "#005c23" }}
              thumbColor={hapticsEnabled ? "#bcdf21" : "#8892a0"}
            />
          </View>
        </View>

        {/* Section: Account & Taxes */}
        <Text style={styles.sectionHeader}>TAXES & PAYOUTS</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.menuRow}
            onPress={() => {
              Alert.alert(
                "Direct Deposit Account",
                "Connected to Chase Bank •••• 4192\nEarnings automatically deposited every Tuesday at 6 AM."
              );
            }}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="card" size={18} color="#bcdf21" />
              <View>
                <Text style={styles.menuLabel}>Direct Deposit Bank Account</Text>
                <Text style={styles.menuSub}>Chase Bank •••• 4192 (Active)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8892a0" />
          </Pressable>

          <Pressable
            style={styles.menuRow}
            onPress={() => {
              Alert.alert(
                "Tax Documents",
                "1099-NEC for tax year 2025 is filed and available for download at rallycasts.tv/caster/taxes."
              );
            }}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="document-text" size={18} color="#c0c6d2" />
              <View>
                <Text style={styles.menuLabel}>1099 Tax Documents</Text>
                <Text style={styles.menuSub}>W-9 Verified • Electronic delivery</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8892a0" />
          </Pressable>
        </View>

        {/* Section: App Settings */}
        <Text style={styles.sectionHeader}>APP PREFERENCES</Text>
        <View style={styles.card}>
          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Ionicons name="color-palette" size={18} color="#bcdf21" />
              <View>
                <Text style={styles.menuLabel}>Appearance Theme</Text>
                <Text style={styles.menuSub}>Light or Dark Court Mode</Text>
              </View>
            </View>
            <ThemeToggle />
          </View>
        </View>

        {/* Version & Build */}
        <View style={styles.footerNote}>
          <Text style={styles.footerVersion}>
            RallyCaster Mobile • v1.4.0 (Build 2026)
          </Text>
          <Text style={styles.footerCopyright}>
            Designed for live pickleball broadcasting
          </Text>
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
  profileCard: {
    backgroundColor: "#161b26",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#232834",
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#005c23",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#bcdf21",
    position: "relative",
  },
  goldBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#ffd700",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  casterId: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  profileBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  tierPill: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffd700",
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(188, 223, 33, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#bcdf21",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  card: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#202533",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  menuSub: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  footerNote: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  footerVersion: {
    fontSize: 12,
    color: "#6b778a",
    fontWeight: "600",
  },
  footerCopyright: {
    fontSize: 11,
    color: "#4e5768",
    marginTop: 2,
  },
});
