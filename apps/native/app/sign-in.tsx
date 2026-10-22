import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { SignIn } from "@/components/sign-in";

export default function SignInScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            className="items-center"
            entering={FadeInDown.duration(350)}
          >
            <Image
              accessibilityLabel="RallyCasts"
              contentFit="contain"
              source={require("../assets/images/rallycasts-wordmark.png")}
              style={{ height: 40, width: 178 }}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(350)}>
            <Text className="mt-8 text-3xl font-black tracking-tight text-foreground">
              Welcome back
            </Text>
            <Text className="mt-2 text-sm text-muted">
              Sign in to follow players, message your court, and keep every
              match moving.
            </Text>
          </Animated.View>

          <Animated.View
            className="mt-7"
            entering={FadeInDown.delay(160).duration(350)}
          >
            <SignIn />
          </Animated.View>

          <Animated.View
            className="mt-8 flex-row items-center justify-center gap-1.5"
            entering={FadeInDown.delay(240).duration(350)}
          >
            <Text className="text-xs text-muted">New to RallyCasts?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/sign-up")}
              className="active:opacity-70"
            >
              <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
                Create an account
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
