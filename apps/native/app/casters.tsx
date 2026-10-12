import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CasterCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import { useCasters } from "@/lib/hooks";

export default function CastersScreen() {
  const { data: castersData } = useCasters();
  const casters = castersData?.casters || [];

  // Caster application form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [cameraGear, setCameraGear] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleApply = () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert("Missing Information", "Please enter your full name and email.");
      return;
    }

    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsSubmitted(true);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScreenHeader
        showBack
        title="Casters"
        subtitle="On-court broadcasting & match coverage"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero banner */}
        <View className="p-4">
          <View className="overflow-hidden rounded-3xl bg-[#005c23] p-5 shadow-md">
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-[#bcdf21]/20 px-2.5 py-1">
              <Ionicons name="videocam" size={13} color="#bcdf21" />
              <Text className="text-[11px] font-bold text-[#bcdf21]">
                On-Demand Court Cameras
              </Text>
            </View>

            <Text className="mt-3 text-2xl font-black tracking-tight text-white">
              Give your matches the coverage they deserve.
            </Text>

            <Text className="mt-2 text-xs leading-relaxed text-gray-200">
              RallyCasts Casters arrive with 4K cameras, stabilized gimbals, and wireless court audio to record, livestream, and generate highlight clips of your pickleball battles.
            </Text>
          </View>
        </View>

        {/* Benefits Grid */}
        <View className="px-4">
          <Text className="mb-3 text-sm font-bold text-foreground">
            Why Players Book Casters
          </Text>

          <View className="flex-row gap-2.5">
            <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
              <Ionicons name="film-outline" size={20} color="#bcdf21" />
              <Text className="mt-2 text-xs font-bold text-foreground">4K Multi-Angle</Text>
              <Text className="mt-0.5 text-[11px] text-muted">Crisp resolution from the kitchen line</Text>
            </View>

            <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
              <Ionicons name="mic-outline" size={20} color="#bcdf21" />
              <Text className="mt-2 text-xs font-bold text-foreground">Court Audio</Text>
              <Text className="mt-0.5 text-[11px] text-muted">Paddle pop & line calls crystal clear</Text>
            </View>

            <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
              <Ionicons name="flash-outline" size={20} color="#bcdf21" />
              <Text className="mt-2 text-xs font-bold text-foreground">Instant Clips</Text>
              <Text className="mt-0.5 text-[11px] text-muted">AI-edited highlights ready in minutes</Text>
            </View>
          </View>
        </View>

        {/* Available Casters List */}
        <View className="mt-6 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">
              Featured Casters
            </Text>
            <Text className="text-xs text-muted">Available for dispatch</Text>
          </View>

          {casters.map((caster) => (
            <CasterCard
              key={caster.id}
              caster={caster}
              onBook={() => {
                Alert.alert(
                  "Book Caster",
                  `Booking request sent to ${caster.displayName || "Caster"}! They will coordinate arrival time.`
                );
              }}
            />
          ))}
        </View>

        {/* Caster Sign Up Section */}
        <View className="mt-6 px-4">
          <View className="rounded-3xl border border-[#bcdf21]/30 bg-surface p-5 shadow-sm">
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-[#005c23]/15 px-2.5 py-1">
              <Ionicons name="sparkles" size={13} color="#005c23" />
              <Text className="text-[11px] font-bold text-[#005c23] dark:text-[#bcdf21]">
                Earn on the Court
              </Text>
            </View>

            <Text className="mt-2.5 text-xl font-bold tracking-tight text-foreground">
              Apply to Become a RallyCaster
            </Text>

            <Text className="mt-1 text-xs leading-relaxed text-muted">
              Bring your camera gear, film local tournaments and matches, and get paid directly through the upcoming dedicated RallyCaster mobile app.
            </Text>

            {isSubmitted ? (
              <View className="mt-4 items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                <Text className="mt-2 text-sm font-bold text-foreground">
                  Application Submitted!
                </Text>
                <Text className="mt-1 text-center text-xs text-muted">
                  We'll email you at {email} with credentials to access the RallyCaster app.
                </Text>
              </View>
            ) : (
              <View className="mt-4 gap-3">
                <View>
                  <Text className="mb-1 text-xs font-semibold text-muted">Full Name</Text>
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="e.g. Alex Rivera"
                    placeholderTextColor="#888888"
                    className="rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm text-foreground"
                  />
                </View>

                <View>
                  <Text className="mb-1 text-xs font-semibold text-muted">Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="alex@example.com"
                    placeholderTextColor="#888888"
                    className="rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm text-foreground"
                  />
                </View>

                <View>
                  <Text className="mb-1 text-xs font-semibold text-muted">Home City & State</Text>
                  <TextInput
                    value={homeCity}
                    onChangeText={setHomeCity}
                    placeholder="e.g. Austin, TX"
                    placeholderTextColor="#888888"
                    className="rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm text-foreground"
                  />
                </View>

                <View>
                  <Text className="mb-1 text-xs font-semibold text-muted">Camera Gear / Phone Setup</Text>
                  <TextInput
                    value={cameraGear}
                    onChangeText={setCameraGear}
                    placeholder="e.g. Sony A7IV or iPhone 16 Pro + Gimbal"
                    placeholderTextColor="#888888"
                    className="rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm text-foreground"
                  />
                </View>

                <Pressable
                  onPress={handleApply}
                  className="mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-[#005c23] py-3 active:opacity-90"
                >
                  <Ionicons name="paper-plane-outline" size={16} color="#ffffff" />
                  <Text className="text-sm font-bold text-white">
                    Submit Caster Application
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
