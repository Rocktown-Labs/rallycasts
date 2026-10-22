import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { authClient } from "@/lib/auth-client";

type Step = "details" | "otp";
type Pending = null | "otp-send" | "otp-verify" | "social";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown): string {
  if (typeof error === "string" && error) {
    return error;
  }
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; statusText?: unknown };
    if (typeof record.message === "string" && record.message) {
      return record.message;
    }
    if (typeof record.statusText === "string" && record.statusText) {
      return record.statusText;
    }
  }
  return "Something went wrong. Please try again.";
}

function SocialButton({
  icon,
  label,
  onPress,
  pending,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  pending: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={pending}
      onPress={onPress}
      className="flex-row items-center justify-center gap-2 rounded-xl border border-border/60 bg-surface py-3 active:opacity-80"
    >
      <Ionicons name={icon} size={16} className="text-foreground" />
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
    </Pressable>
  );
}

function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<TextInput>(null);
  const submittedOtpRef = useRef("");

  const trimmedEmail = email.trim();
  const trimmedName = name.trim();
  const canContinue =
    trimmedName.length > 1 &&
    EMAIL_PATTERN.test(trimmedEmail) &&
    pending === null;

  const handleSendOtp = useCallback(async () => {
    if (trimmedName.length < 2) {
      setError("Tell us your name");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Enter a valid email address");
      return;
    }
    setPending("otp-send");
    setError(null);
    const { error: otpError } = await authClient.emailOtp.sendVerificationOtp(
      { email: trimmedEmail, type: "sign-in" }
    );
    setPending(null);
    if (otpError) {
      setError(getErrorMessage(otpError));
      return;
    }
    setStep("otp");
    setOtp("");
    setTimeout(() => otpInputRef.current?.focus(), 150);
  }, [trimmedEmail, trimmedName]);

  const handleVerifyOtp = useCallback(async () => {
    const code = otp.trim();
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setPending("otp-verify");
    setError(null);
    // The sign-in OTP auto-registers first-time users; passing the name
    // keeps the profile complete without a password.
    const { error: verifyError } = await authClient.signIn.emailOtp({
      email: trimmedEmail,
      name: trimmedName,
      otp: code,
    });
    setPending(null);
    if (verifyError) {
      submittedOtpRef.current = "";
      setOtp("");
      setError(getErrorMessage(verifyError));
      return;
    }
    router.replace("/");
  }, [otp, router, trimmedEmail, trimmedName]);

  useEffect(() => {
    const code = otp.trim();
    if (
      step === "otp" &&
      code.length === 6 &&
      submittedOtpRef.current !== code &&
      pending === null
    ) {
      submittedOtpRef.current = code;
      void handleVerifyOtp();
    }
    if (code.length < 6) {
      submittedOtpRef.current = "";
    }
  }, [handleVerifyOtp, otp, pending, step]);

  const handleSocial = useCallback(
    async (provider: "github" | "google") => {
      setPending("social");
      setError(null);
      const { error: socialError } = await authClient.signIn.social({
        callbackURL: "/",
        provider,
      });
      setPending(null);
      if (socialError) {
        setError(getErrorMessage(socialError));
        return;
      }
      router.replace("/");
    },
    [router]
  );

  return (
    <View className="gap-4">
      {error ? (
        <View className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3">
          <Text className="text-xs font-medium text-red-500">{error}</Text>
        </View>
      ) : null}

      {step === "details" ? (
        <Animated.View entering={FadeInDown.duration(300)} className="gap-4">
          <TextInput
            autoComplete="name"
            className="rounded-xl border border-border/60 bg-surface px-4 py-3.5 text-sm text-foreground"
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor="#888888"
            textContentType="name"
            value={name}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            className="rounded-xl border border-border/60 bg-surface px-4 py-3.5 text-sm text-foreground"
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="Email address"
            placeholderTextColor="#888888"
            textContentType="emailAddress"
            value={email}
          />

          <Pressable
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={() => void handleSendOtp()}
            className="items-center justify-center rounded-xl bg-[#005c23] py-3.5 active:opacity-80 disabled:opacity-40 dark:bg-[#bcdf21]"
          >
            {pending === "otp-send" ? (
              <ActivityIndicator color="#bcdf21" />
            ) : (
              <Text className="text-sm font-bold text-white dark:text-black">
                Create account with a code
              </Text>
            )}
          </Pressable>

          <Text className="text-center text-[11px] leading-relaxed text-muted">
            We'll email you a 6-digit code to confirm it's you. No password
            needed.
          </Text>
        </Animated.View>
      ) : null}

      {step === "otp" ? (
        <Animated.View entering={FadeInDown.duration(300)} className="gap-4">
          <Text className="text-center text-xs text-muted">
            We sent a 6-digit code to{"\n"}
            <Text className="font-semibold text-foreground">
              {trimmedEmail}
            </Text>
          </Text>

          <TextInput
            autoFocus
            className="rounded-xl border border-border/60 bg-surface px-4 py-4 text-center text-2xl font-bold tracking-[12px] text-foreground"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(value) => setOtp(value.replace(/\D/g, ""))}
            placeholder="••••••"
            placeholderTextColor="#888888"
            ref={otpInputRef}
            textContentType="oneTimeCode"
            value={otp}
          />

          <Pressable
            accessibilityRole="button"
            disabled={otp.trim().length !== 6 || pending !== null}
            onPress={() => void handleVerifyOtp()}
            className="items-center justify-center rounded-xl bg-[#005c23] py-3.5 active:opacity-80 disabled:opacity-40 dark:bg-[#bcdf21]"
          >
            {pending === "otp-verify" ? (
              <ActivityIndicator color="#bcdf21" />
            ) : (
              <Text className="text-sm font-bold text-white dark:text-black">
                Verify & create account
              </Text>
            )}
          </Pressable>

          <View className="flex-row items-center justify-center gap-4">
            <Pressable
              accessibilityRole="button"
              disabled={pending !== null}
              onPress={() => void handleSendOtp()}
              className="active:opacity-70"
            >
              <Text className="text-xs font-semibold text-muted">
                Resend code
              </Text>
            </Pressable>
            <View className="h-3 w-px bg-border" />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError(null);
                setOtp("");
                setStep("details");
              }}
              className="active:opacity-70"
            >
              <Text className="text-xs font-semibold text-muted">
                Change email
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {step !== "otp" ? (
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <View className="flex-row items-center gap-3 py-1">
            <View className="h-px flex-1 bg-border/60" />
            <Text className="text-[10px] font-bold uppercase tracking-wider text-muted">
              or sign up with
            </Text>
            <View className="h-px flex-1 bg-border/60" />
          </View>

          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <SocialButton
                icon="logo-google"
                label="Google"
                onPress={() => void handleSocial("google")}
                pending={pending !== null}
              />
            </View>
            <View className="flex-1">
              <SocialButton
                icon="logo-github"
                label="GitHub"
                onPress={() => void handleSocial("github")}
                pending={pending !== null}
              />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export { SignUp };
