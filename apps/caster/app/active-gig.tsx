import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Rect } from "react-native-svg";

import { SwipeToConfirm } from "@/components/swipe-to-confirm";
import { GigStage, useCasterGig } from "@/contexts/caster-gig-context";

export default function ActiveGigScreen() {
  const insets = useSafeAreaInsets();
  const {
    activeGig,
    updateGigStage,
    updateScore,
    tagHighlight,
    finishGig,
    clearActiveGig,
  } = useCasterGig();

  // If there's no active gig, redirect back
  if (!activeGig) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyTitle}>No active match broadcast.</Text>
        <Pressable
          style={styles.actionBtnPrimary}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.actionBtnText}>Go to Dispatch Hub</Text>
        </Pressable>
      </View>
    );
  }

  const stage = activeGig.stage;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {/* Top Breadcrumb & Status Nav */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <View style={styles.liveIndicator}>
            <View
              style={[
                styles.stageDot,
                stage === "recording"
                  ? styles.stageDotRecording
                  : styles.stageDotActive,
              ]}
            />
            <Text style={styles.stageTitle}>
              {stage === "en_route" && "EN ROUTE TO COURT"}
              {stage === "arrived" && "ARRIVED • CHECK-IN"}
              {stage === "setup" && "CAMERA & GEAR SETUP"}
              {stage === "recording" && "LIVE BROADCAST IN PROGRESS"}
              {stage === "completed" && "BROADCAST COMPLETED"}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.helpButton}
          onPress={() => {
            Alert.alert(
              "Tournament Organizer",
              `${activeGig.organizerName}\nPhone: ${activeGig.organizerPhone}\nCourt: ${activeGig.courtNumber}`,
              [
                { text: "Call Organizer", style: "default" },
                { text: "Close", style: "cancel" },
              ]
            );
          }}
        >
          <Ionicons name="call" size={16} color="#ffffff" />
          <Text style={styles.helpButtonText}>Contact</Text>
        </Pressable>
      </View>

      {/* Dynamic Stage Renderers */}
      {stage === "en_route" && (
        <StageEnRoute
          activeGig={activeGig}
          onArrive={() => updateGigStage("arrived")}
        />
      )}

      {stage === "arrived" && (
        <StageArrived
          activeGig={activeGig}
          onProceedToSetup={() => updateGigStage("setup")}
        />
      )}

      {stage === "setup" && (
        <StageSetup
          activeGig={activeGig}
          onStartRecording={() => updateGigStage("recording")}
        />
      )}

      {stage === "recording" && (
        <StageRecording
          activeGig={activeGig}
          onUpdateScore={updateScore}
          onTagHighlight={tagHighlight}
          onFinishBroadcast={() => {
            finishGig();
          }}
        />
      )}

      {stage === "completed" && (
        <StageCompleted
          activeGig={activeGig}
          onDone={() => {
            clearActiveGig();
            router.replace("/(tabs)");
          }}
        />
      )}
    </View>
  );
}

// -------------------------------------------------------------
// STAGE 1: EN ROUTE (Navigation & ETA)
// -------------------------------------------------------------
function StageEnRoute({
  activeGig,
  onArrive,
}: {
  activeGig: NonNullable<ReturnType<typeof useCasterGig>["activeGig"]>;
  onArrive: () => void;
}) {
  return (
    <View style={styles.stageContent}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Navigation Map Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <View style={styles.turnIconBox}>
              <Ionicons name="arrow-up" size={24} color="#000000" />
            </View>
            <View style={styles.turnTextBox}>
              <Text style={styles.turnTitle}>Head North on Main St</Text>
              <Text style={styles.turnSubtitle}>In 500 ft, turn left onto Joe W. Foster Pkwy</Text>
            </View>
          </View>

          {/* Route Map Graphic */}
          <View style={styles.routeMapGraphic}>
            <Svg width="100%" height={160} viewBox="0 0 360 160">
              <Rect width="360" height="160" fill="#131722" rx="12" />
              {/* Roads */}
              <Line x1="40" y1="160" x2="180" y2="20" stroke="#2a3348" strokeWidth="16" />
              <Line x1="180" y1="20" x2="320" y2="30" stroke="#2a3348" strokeWidth="16" />
              {/* Green Nav Route */}
              <Line x1="50" y1="150" x2="180" y2="25" stroke="#bcdf21" strokeWidth="6" strokeLinecap="round" />
              <Line x1="180" y1="25" x2="300" y2="30" stroke="#bcdf21" strokeWidth="6" strokeLinecap="round" />
            </Svg>

            <View style={styles.etaOverlay}>
              <Text style={styles.etaTime}>8 MIN</Text>
              <Text style={styles.etaSub}>2.4 MI • 9:18 AM ETA</Text>
            </View>
          </View>
        </View>

        {/* Destination Info Card */}
        <View style={styles.venueCard}>
          <Text style={styles.venueSectionHeader}>MATCH DESTINATION</Text>
          <Text style={styles.venueNameText}>{activeGig.venueName}</Text>
          <View style={styles.courtBadgeRow}>
            <View style={styles.courtBadge}>
              <Ionicons name="tennisball" size={14} color="#005c23" />
              <Text style={styles.courtBadgeText}>{activeGig.courtNumber}</Text>
            </View>
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>Match starts {activeGig.scheduledStartTime}</Text>
            </View>
          </View>
          <Text style={styles.venueAddress}>{activeGig.address}</Text>

          <View style={styles.metaDivider} />

          <View style={styles.playersBox}>
            <Text style={styles.playersTitle}>Match Teams</Text>
            <Text style={styles.playersNames}>
              {activeGig.players.teamA} vs {activeGig.players.teamB}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Swipe to Arrive (Spark Gesture Bar) */}
      <View style={styles.swipeBarContainer}>
        <SwipeToConfirm
          label="Swipe to Arrive at Court"
          completedLabel="Arrived at Court!"
          color="#005c23"
          iconName="location"
          onConfirm={onArrive}
        />
      </View>
    </View>
  );
}

// -------------------------------------------------------------
// STAGE 2: ARRIVED (Meetup & Court Check-in)
// -------------------------------------------------------------
function StageArrived({
  activeGig,
  onProceedToSetup,
}: {
  activeGig: NonNullable<ReturnType<typeof useCasterGig>["activeGig"]>;
  onProceedToSetup: () => void;
}) {
  const [confirmedOrganizer, setConfirmedOrganizer] = useState(true);
  const [confirmedPlayers, setConfirmedPlayers] = useState(true);
  const [confirmedCourt, setConfirmedCourt] = useState(true);

  const canProceed = confirmedOrganizer && confirmedPlayers && confirmedCourt;

  return (
    <View style={styles.stageContent}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.arrivedBanner}>
          <Ionicons name="checkmark-circle" size={32} color="#bcdf21" />
          <View style={styles.arrivedBannerCol}>
            <Text style={styles.arrivedBannerTitle}>You have arrived at the venue!</Text>
            <Text style={styles.arrivedBannerSub}>
              Meet the organizer & players before beginning the broadcast.
            </Text>
          </View>
        </View>

        {/* Verification Checklist */}
        <View style={styles.checklistCard}>
          <Text style={styles.checklistHeader}>ON-SITE CHECK-IN VERIFICATION</Text>

          <Pressable
            style={styles.checkItem}
            onPress={() => {
              if (Platform.OS === "ios") Haptics.selectionAsync();
              setConfirmedCourt((v) => !v);
            }}
          >
            <Ionicons
              name={confirmedCourt ? "checkbox" : "square-outline"}
              size={24}
              color={confirmedCourt ? "#bcdf21" : "#8892a0"}
            />
            <View style={styles.checkItemTextCol}>
              <Text style={styles.checkItemTitle}>Locate {activeGig.courtNumber}</Text>
              <Text style={styles.checkItemSub}>
                North Court Row • Championship netting
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.checkItem}
            onPress={() => {
              if (Platform.OS === "ios") Haptics.selectionAsync();
              setConfirmedOrganizer((v) => !v);
            }}
          >
            <Ionicons
              name={confirmedOrganizer ? "checkbox" : "square-outline"}
              size={24}
              color={confirmedOrganizer ? "#bcdf21" : "#8892a0"}
            />
            <View style={styles.checkItemTextCol}>
              <Text style={styles.checkItemTitle}>Check in with Organizer</Text>
              <Text style={styles.checkItemSub}>
                {activeGig.organizerName} • Verified official
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.checkItem}
            onPress={() => {
              if (Platform.OS === "ios") Haptics.selectionAsync();
              setConfirmedPlayers((v) => !v);
            }}
          >
            <Ionicons
              name={confirmedPlayers ? "checkbox" : "square-outline"}
              size={24}
              color={confirmedPlayers ? "#bcdf21" : "#8892a0"}
            />
            <View style={styles.checkItemTextCol}>
              <Text style={styles.checkItemTitle}>Confirm Players Present</Text>
              <Text style={styles.checkItemSub}>
                {activeGig.players.teamA} vs {activeGig.players.teamB}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Ionicons name="information-circle" size={20} color="#bcdf21" />
          <Text style={styles.instructionText}>
            Introduce yourself as the RallyCaster match broadcaster. Let them know you'll be recording 4K footage and highlights for their RallyCasts profile.
          </Text>
        </View>
      </ScrollView>

      {/* Button to proceed to gear setup */}
      <View style={styles.footerButtonContainer}>
        <Pressable
          style={[
            styles.actionBtnPrimary,
            !canProceed && styles.actionBtnDisabled,
          ]}
          disabled={!canProceed}
          onPress={() => {
            if (Platform.OS === "ios") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            onProceedToSetup();
          }}
        >
          <Text style={styles.actionBtnText}>
            Continue to Camera Setup
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#000000" />
        </Pressable>
      </View>
    </View>
  );
}

// -------------------------------------------------------------
// STAGE 3: SETUP (Tripod & Equipment Pre-flight)
// -------------------------------------------------------------
function StageSetup({
  activeGig,
  onStartRecording,
}: {
  activeGig: NonNullable<ReturnType<typeof useCasterGig>["activeGig"]>;
  onStartRecording: () => void;
}) {
  return (
    <View style={styles.stageContent}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Simulated Camera Viewfinder Preview */}
        <View style={styles.viewfinderPreview}>
          <Svg width="100%" height={180} viewBox="0 0 360 180">
            {/* Dark Court Floor */}
            <Rect width="360" height="180" fill="#142417" rx="12" />
            {/* Pickleball Court Lines */}
            <Rect x="40" y="30" width="280" height="120" fill="none" stroke="#ffffff" strokeWidth="2" opacity={0.7} />
            {/* Kitchen Line */}
            <Line x1="120" y1="30" x2="120" y2="150" stroke="#ffffff" strokeWidth="2" opacity={0.7} />
            <Line x1="240" y1="30" x2="240" y2="150" stroke="#ffffff" strokeWidth="2" opacity={0.7} />
            {/* Center Net */}
            <Line x1="180" y1="20" x2="180" y2="160" stroke="#bcdf21" strokeWidth="3" />
            {/* Center Service Line */}
            <Line x1="40" y1="90" x2="120" y2="90" stroke="#ffffff" strokeWidth="2" opacity={0.7} />
            <Line x1="240" y1="90" x2="320" y2="90" stroke="#ffffff" strokeWidth="2" opacity={0.7} />
          </Svg>

          {/* Grid target overlay */}
          <View style={styles.viewfinderOverlay}>
            <View style={styles.crosshair} />
            <View style={styles.badge4K}>
              <Text style={styles.badge4KText}>4K 60FPS READY</Text>
            </View>
          </View>
        </View>

        {/* Gear Checklist Status */}
        <View style={styles.gearCard}>
          <Text style={styles.gearCardTitle}>BROADCAST RIG PRE-FLIGHT CHECK</Text>

          <View style={styles.gearRow}>
            <Ionicons name="camera" size={18} color="#bcdf21" />
            <Text style={styles.gearLabel}>Camera Alignment</Text>
            <Text style={styles.gearStatus}>Level & Centered</Text>
          </View>

          <View style={styles.gearRow}>
            <Ionicons name="mic" size={18} color="#bcdf21" />
            <Text style={styles.gearLabel}>Court Wireless Mic</Text>
            <Text style={styles.gearStatus}>Synced (-6 dB)</Text>
          </View>

          <View style={styles.gearRow}>
            <Ionicons name="battery-charging" size={18} color="#bcdf21" />
            <Text style={styles.gearLabel}>Battery & Storage</Text>
            <Text style={styles.gearStatus}>88% • 120 GB Free</Text>
          </View>
        </View>

        <View style={styles.warningNote}>
          <Ionicons name="shield-checkmark" size={18} color="#bcdf21" />
          <Text style={styles.warningNoteText}>
            Once recording starts, the broadcast will stream to players' mobile apps in real-time.
          </Text>
        </View>
      </ScrollView>

      {/* Swipe to Start Recording (Spark Gesture Bar) */}
      <View style={styles.swipeBarContainer}>
        <SwipeToConfirm
          label="Swipe to Start Recording"
          completedLabel="Recording Started!"
          color="#d32f2f"
          iconName="videocam"
          onConfirm={onStartRecording}
        />
      </View>
    </View>
  );
}

// -------------------------------------------------------------
// STAGE 4: RECORDING (Live Viewfinder, Score, Highlight Tagger)
// -------------------------------------------------------------
function StageRecording({
  activeGig,
  onUpdateScore,
  onTagHighlight,
  onFinishBroadcast,
}: {
  activeGig: NonNullable<ReturnType<typeof useCasterGig>["activeGig"]>;
  onUpdateScore: (team: "A" | "B", delta: number) => void;
  onTagHighlight: (title?: string) => void;
  onFinishBroadcast: () => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(2052); // ~34 mins in

  // Pulsing recording dot
  const recDotOpacity = useSharedValue(1);
  useEffect(() => {
    recDotOpacity.set(
      withRepeat(
        withSequence(
          withTiming(0.2, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      )
    );

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [recDotOpacity]);

  const recDotStyle = useAnimatedStyle(() => ({
    opacity: recDotOpacity.get(),
  }));

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleHighlight = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onTagHighlight();
  };

  return (
    <View style={styles.stageContent}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Live Broadcast Viewfinder Canvas */}
        <View style={styles.liveViewfinder}>
          <Svg width="100%" height={200} viewBox="0 0 360 200">
            <Rect width="360" height="200" fill="#0d1b11" rx="14" />
            <Rect x="30" y="25" width="300" height="150" fill="none" stroke="#255d34" strokeWidth="2" />
            <Line x1="180" y1="15" x2="180" y2="185" stroke="#bcdf21" strokeWidth="3" />
            <Line x1="100" y1="25" x2="100" y2="175" stroke="#255d34" strokeWidth="2" />
            <Line x1="260" y1="25" x2="260" y2="175" stroke="#255d34" strokeWidth="2" />
          </Svg>

          {/* Top Camera Status Overlay */}
          <View style={styles.camTopOverlay}>
            <View style={styles.recBadge}>
              <Animated.View style={[styles.recDot, recDotStyle]} />
              <Text style={styles.recText}>REC [4K 60FPS]</Text>
            </View>

            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
            </View>
          </View>

          {/* Audio Visualizer Mock */}
          <View style={styles.audioMeter}>
            <Ionicons name="mic" size={12} color="#bcdf21" />
            <View style={styles.audioBars}>
              <View style={[styles.audioBar, { height: 12, backgroundColor: "#bcdf21" }]} />
              <View style={[styles.audioBar, { height: 16, backgroundColor: "#bcdf21" }]} />
              <View style={[styles.audioBar, { height: 10, backgroundColor: "#bcdf21" }]} />
              <View style={[styles.audioBar, { height: 14, backgroundColor: "#bcdf21" }]} />
            </View>
          </View>
        </View>

        {/* Live Scoreboard Overlay Control */}
        <View style={styles.scoreControlCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>LIVE MATCH SCOREBOARD</Text>
            <Text style={styles.setIndicator}>Set 2 (Set 1: 11-9)</Text>
          </View>

          <View style={styles.teamsScoreRow}>
            {/* Team A */}
            <View style={styles.teamCol}>
              <Text style={styles.teamName} numberOfLines={1}>
                {activeGig.players.teamA}
              </Text>
              <Text style={styles.scoreDigit}>{activeGig.score.set2[0]}</Text>
              <View style={styles.scoreAdjustRow}>
                <Pressable
                  style={styles.scoreBtn}
                  onPress={() => {
                    if (Platform.OS === "ios") Haptics.selectionAsync();
                    onUpdateScore("A", -1);
                  }}
                >
                  <Ionicons name="remove" size={16} color="#ffffff" />
                </Pressable>
                <Pressable
                  style={[styles.scoreBtn, styles.scoreBtnAdd]}
                  onPress={() => {
                    if (Platform.OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onUpdateScore("A", 1);
                  }}
                >
                  <Ionicons name="add" size={16} color="#000000" />
                </Pressable>
              </View>
            </View>

            <View style={styles.scoreVsCol}>
              <Text style={styles.scoreVsText}>VS</Text>
            </View>

            {/* Team B */}
            <View style={styles.teamCol}>
              <Text style={styles.teamName} numberOfLines={1}>
                {activeGig.players.teamB}
              </Text>
              <Text style={styles.scoreDigit}>{activeGig.score.set2[1]}</Text>
              <View style={styles.scoreAdjustRow}>
                <Pressable
                  style={styles.scoreBtn}
                  onPress={() => {
                    if (Platform.OS === "ios") Haptics.selectionAsync();
                    onUpdateScore("B", -1);
                  }}
                >
                  <Ionicons name="remove" size={16} color="#ffffff" />
                </Pressable>
                <Pressable
                  style={[styles.scoreBtn, styles.scoreBtnAdd]}
                  onPress={() => {
                    if (Platform.OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onUpdateScore("B", 1);
                  }}
                >
                  <Ionicons name="add" size={16} color="#000000" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Highlight Tagger Button */}
        <Pressable
          style={styles.highlightButton}
          onPress={handleHighlight}
          accessibilityRole="button"
          accessibilityLabel="Tag clutch highlight"
        >
          <Ionicons name="star" size={20} color="#000000" />
          <Text style={styles.highlightButtonText}>
            Tag Clutch Highlight ({activeGig.taggedHighlights.length})
          </Text>
        </Pressable>

        {/* Tagged Highlights List */}
        <View style={styles.highlightsCard}>
          <Text style={styles.highlightsHeader}>BOOKMARKED REEL CLIPS</Text>
          {activeGig.taggedHighlights.map((hl) => (
            <View key={hl.id} style={styles.highlightItem}>
              <View style={styles.highlightTimeBadge}>
                <Text style={styles.highlightTimeText}>{hl.timestamp}</Text>
              </View>
              <Text style={styles.highlightTitleText}>{hl.title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Swipe to Finish Broadcast (Spark Gesture Bar) */}
      <View style={styles.swipeBarContainer}>
        <SwipeToConfirm
          label="Swipe to Finish Broadcast"
          completedLabel="Broadcast Submitted!"
          color="#005c23"
          iconName="flag"
          onConfirm={onFinishBroadcast}
        />
      </View>
    </View>
  );
}

// -------------------------------------------------------------
// STAGE 5: COMPLETED (Celebration & Payout Transfer)
// -------------------------------------------------------------
function StageCompleted({
  activeGig,
  onDone,
}: {
  activeGig: NonNullable<ReturnType<typeof useCasterGig>["activeGig"]>;
  onDone: () => void;
}) {
  return (
    <View style={[styles.stageContent, styles.completedContainer]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.celebrateCard}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={40} color="#005c23" />
        </View>

        <Text style={styles.celebrateTitle}>Broadcast Complete!</Text>
        <Text style={styles.celebrateSubtitle}>
          4K stream uploaded & highlights clipped for RallyCasts.
        </Text>

        {/* Payout Credited Box */}
        <View style={styles.creditBox}>
          <Text style={styles.creditLabel}>EARNINGS CREDITED</Text>
          <Text style={styles.creditAmount}>
            +${activeGig.payout.total.toFixed(2)}
          </Text>
          <Text style={styles.creditSub}>
            Includes ${activeGig.payout.estimatedTip.toFixed(2)} tip from tournament players
          </Text>
        </View>

        {/* Broadcast Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{activeGig.estimatedDuration}</Text>
            <Text style={styles.statLbl}>Duration</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{activeGig.taggedHighlights.length}</Text>
            <Text style={styles.statLbl}>Highlights</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>+50 pts</Text>
            <Text style={styles.statLbl}>Caster Score</Text>
          </View>
        </View>
      </Animated.View>

      <Pressable style={styles.returnButton} onPress={onDone}>
        <Text style={styles.returnButtonText}>Return to Dispatch Hub</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0c12",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "700",
    marginBottom: 16,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1d2330",
  },
  navLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageDotActive: {
    backgroundColor: "#bcdf21",
  },
  stageDotRecording: {
    backgroundColor: "#ff3b30",
  },
  stageTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  helpButtonText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
  },
  stageContent: {
    flex: 1,
    display: "flex",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  routeCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#232834",
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  turnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#bcdf21",
    alignItems: "center",
    justifyContent: "center",
  },
  turnTextBox: {
    flex: 1,
  },
  turnTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  turnSubtitle: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  routeMapGraphic: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  etaOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(10, 12, 18, 0.85)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  etaTime: {
    fontSize: 18,
    fontWeight: "900",
    color: "#bcdf21",
  },
  etaSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "#c0c6d2",
  },
  venueCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  venueSectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
  },
  venueNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 4,
  },
  courtBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  courtBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#bcdf21",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  courtBadgeText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 12,
  },
  tagBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagBadgeText: {
    color: "#c0c6d2",
    fontSize: 11,
    fontWeight: "600",
  },
  venueAddress: {
    fontSize: 13,
    color: "#8892a0",
    marginTop: 8,
  },
  metaDivider: {
    height: 1,
    backgroundColor: "#232834",
    marginVertical: 12,
  },
  playersBox: {},
  playersTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8892a0",
  },
  playersNames: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 2,
  },
  swipeBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  arrivedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(0, 92, 35, 0.3)",
    borderColor: "#005c23",
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  arrivedBannerCol: {
    flex: 1,
  },
  arrivedBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  arrivedBannerSub: {
    fontSize: 12,
    color: "#c5dec5",
    marginTop: 2,
  },
  checklistCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#232834",
  },
  checklistHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#202533",
  },
  checkItemTextCol: {
    flex: 1,
  },
  checkItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  checkItemSub: {
    fontSize: 12,
    color: "#8892a0",
    marginTop: 2,
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(188, 223, 33, 0.08)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 12,
    color: "#d0d9b4",
    flex: 1,
    lineHeight: 18,
  },
  footerButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionBtnPrimary: {
    height: 54,
    backgroundColor: "#bcdf21",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },
  viewfinderPreview: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshair: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 30,
  },
  badge4K: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badge4KText: {
    color: "#bcdf21",
    fontSize: 10,
    fontWeight: "800",
  },
  gearCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#232834",
  },
  gearCardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  gearRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#202533",
  },
  gearLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    flex: 1,
    marginLeft: 10,
  },
  gearStatus: {
    fontSize: 13,
    fontWeight: "700",
    color: "#bcdf21",
  },
  warningNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0, 92, 35, 0.25)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningNoteText: {
    fontSize: 12,
    color: "#b8d9be",
    flex: 1,
  },
  liveViewfinder: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
  },
  camTopOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff3b30",
  },
  recText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  timerBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
    fontVariant: ["tabular-nums"],
  },
  audioMeter: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  audioBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 16,
  },
  audioBar: {
    width: 3,
    borderRadius: 1,
  },
  scoreControlCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232834",
  },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scoreTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
  },
  setIndicator: {
    fontSize: 12,
    fontWeight: "700",
    color: "#bcdf21",
  },
  teamsScoreRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  teamCol: {
    flex: 1,
    alignItems: "center",
  },
  teamName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  scoreDigit: {
    fontSize: 42,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 46,
  },
  scoreAdjustRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  scoreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#242a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBtnAdd: {
    backgroundColor: "#bcdf21",
  },
  scoreVsCol: {
    paddingHorizontal: 12,
  },
  scoreVsText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#4e5768",
  },
  highlightButton: {
    backgroundColor: "#ffd700",
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  highlightButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#000000",
  },
  highlightsCard: {
    backgroundColor: "#161b26",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232834",
  },
  highlightsHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8892a0",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1d2330",
  },
  highlightTimeBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  highlightTimeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffd700",
  },
  highlightTitleText: {
    fontSize: 12,
    color: "#c0c6d2",
    fontWeight: "600",
    flex: 1,
  },
  completedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  celebrateCard: {
    backgroundColor: "#161b26",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#232834",
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#bcdf21",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  celebrateTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  celebrateSubtitle: {
    fontSize: 13,
    color: "#8892a0",
    textAlign: "center",
    marginTop: 6,
  },
  creditBox: {
    backgroundColor: "#005c23",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    width: "100%",
    marginVertical: 18,
  },
  creditLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#bcdf21",
    letterSpacing: 1,
  },
  creditAmount: {
    fontSize: 40,
    fontWeight: "900",
    color: "#ffffff",
    marginVertical: 2,
  },
  creditSub: {
    fontSize: 12,
    color: "#b8d9be",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 8,
  },
  statCol: {
    alignItems: "center",
  },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  statLbl: {
    fontSize: 11,
    color: "#8892a0",
    marginTop: 2,
  },
  returnButton: {
    marginTop: 20,
    backgroundColor: "#bcdf21",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  returnButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000000",
  },
});
