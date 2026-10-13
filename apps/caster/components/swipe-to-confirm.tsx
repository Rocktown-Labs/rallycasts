import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

interface SwipeToConfirmProps {
  label: string;
  completedLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  color?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
}

const THUMB_SIZE = 52;
const PADDING = 4;

export function SwipeToConfirm({
  label,
  completedLabel = "Confirmed",
  onConfirm,
  disabled = false,
  color = "#005c23",
  iconName = "arrow-forward",
}: SwipeToConfirmProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const isCompleted = useSharedValue(false);

  const maxTranslate = Math.max(0, trackWidth - THUMB_SIZE - PADDING * 2);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const triggerSuccess = () => {
    setIsDone(true);
    if (onConfirm) {
      onConfirm();
    }
  };

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(!disabled && !isDone)
      .activeOffsetX([0, 10])
      .onStart(() => {
        startX.set(translateX.get());
      })
      .onUpdate((e) => {
        const target = startX.get() + e.translationX;
        const clamped = Math.min(Math.max(0, target), maxTranslate);
        translateX.set(clamped);
      })
      .onEnd((e) => {
        const current = translateX.get();
        // Momentum projection
        const projected = current + (e.velocityX / 1000) * 100;
        const threshold = maxTranslate * 0.75;

        if (projected >= threshold || current >= threshold) {
          isCompleted.set(true);
          translateX.set(
            withSpring(
              maxTranslate,
              {
                dampingRatio: 1,
                duration: 250,
              },
              (finished) => {
                if (finished) {
                  scheduleOnRN(Haptics.notificationAsync, Haptics.NotificationFeedbackType.Success);
                  scheduleOnRN(triggerSuccess);
                }
              }
            )
          );
        } else {
          translateX.set(
            withSpring(0, {
              dampingRatio: 0.8,
              duration: 300,
              velocity: e.velocityX,
            })
          );
          scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
        }
      });
  }, [disabled, isDone, maxTranslate, onConfirm]);

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.get() }],
    };
  });

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.get(),
      [0, maxTranslate * 0.5],
      [1, 0.1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  const progressTrackAnimatedStyle = useAnimatedStyle(() => {
    const width = translateX.get() + THUMB_SIZE + PADDING;
    return {
      width,
    };
  });

  return (
    <View
      onLayout={handleLayout}
      accessibilityRole="button"
      accessibilityLabel={isDone ? completedLabel : label}
      style={[
        styles.track,
        disabled && styles.disabled,
      ]}
    >
      {/* Progress fill */}
      <Animated.View
        style={[
          styles.progressFill,
          { backgroundColor: color },
          progressTrackAnimatedStyle,
        ]}
      />

      {/* Center Label */}
      <Animated.View style={[styles.labelContainer, labelAnimatedStyle]}>
        <Text style={styles.labelText}>
          {isDone ? completedLabel : label}
        </Text>
      </Animated.View>

      {/* Draggable Thumb */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.thumb,
            thumbAnimatedStyle,
            isDone && styles.thumbCompleted,
          ]}
        >
          <Ionicons
            name={isDone ? "checkmark" : iconName}
            size={24}
            color={isDone ? "#ffffff" : color}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 60,
    backgroundColor: "rgba(120, 120, 128, 0.16)",
    borderRadius: 30,
    padding: PADDING,
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.5,
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 30,
    opacity: 0.25,
  },
  labelContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  labelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbCompleted: {
    backgroundColor: "#005c23",
  },
});
