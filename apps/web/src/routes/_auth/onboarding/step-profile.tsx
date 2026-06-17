import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { withForm } from "@/lib/hooks/onboarding-form";

import { wizardFormOpts } from "./shared-form";

const PRESET_AVATARS = [
  { emoji: "🎾", end: "#10b981", start: "#a3e635" },
  { emoji: "🏆", end: "#d946ef", start: "#8b5cf6" },
  { emoji: "😎", end: "#06b6d4", start: "#3b82f6" },
  { emoji: "⚡", end: "#ef4444", start: "#f59e0b" },
  { emoji: "👟", end: "#e11d48", start: "#fda4af" },
  { emoji: "🥇", end: "#d97706", start: "#fbbf24" },
];

function generateEmojiAvatar(
  emoji: string,
  startColor: string,
  endColor: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad-${emoji}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${startColor}" />
        <stop offset="100%" stop-color="${endColor}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#grad-${emoji})" />
    <text x="50" y="58" font-size="48" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export const StepProfile = withForm({
  ...wizardFormOpts,
  props: {
    setStep: (_step: number) => void 0,
    step: 0,
  },
  render: function render({ form, setStep }) {
    const { data: session } = authClient.useSession();
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [usernameSuccess, setUsernameSuccess] = useState(false);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const usernameValue = form.getFieldValue("profile.username");

    // Sync session data into form defaults on mount
    useEffect(() => {
      if (session?.user) {
        if (session.user.name) {
          form.setFieldValue("profile.name", session.user.name);
        }
        if (session.user.username) {
          form.setFieldValue("profile.username", session.user.username);
        }
        if (session.user.image) {
          form.setFieldValue("profile.image", session.user.image);
        }
      }
    }, [session?.user, form]);

    // Debounced username availability check
    useEffect(() => {
      const cleanUsername = usernameValue?.trim();
      if (!cleanUsername || cleanUsername.length < 3) {
        setUsernameError(null);
        setUsernameSuccess(false);
        return;
      }

      if (session?.user?.username === cleanUsername) {
        setUsernameError(null);
        setUsernameSuccess(true);
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(async () => {
        setIsCheckingUsername(true);
        setUsernameError(null);
        try {
          const res = await authClient.isUsernameAvailable({
            username: cleanUsername,
          });
          if (res.data?.available) {
            setUsernameSuccess(true);
          } else {
            setUsernameSuccess(false);
            setUsernameError("Username is already taken");
          }
        } catch {
          setUsernameSuccess(false);
          setUsernameError("Failed to check username");
        } finally {
          setIsCheckingUsername(false);
        }
      }, 400);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, [usernameValue, session?.user?.username]);

    const imageValue = form.getFieldValue("profile.image") || "";

    return (
      <form.FormGroup
        name="profile"
        onGroupSubmit={() => {
          if (!usernameSuccess) {
            toast.error("Please fix username errors before continuing");
            return;
          }
          setStep(1);
        }}
      >
        {(formGroup) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              formGroup.handleSubmit();
            }}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Who are you?</h2>
                <p className="text-sm text-muted-foreground">
                  Let the community know who you are on the courts.
                </p>
              </div>

              {/* Avatar Selector */}
              <div className="space-y-3">
                <label className="text-sm font-medium" htmlFor="avatar-select">
                  Pick an avatar
                </label>
                <div className="grid grid-cols-6 gap-2 max-w-xs">
                  {PRESET_AVATARS.map((preset) => {
                    const svgDataUrl = generateEmojiAvatar(
                      preset.emoji,
                      preset.start,
                      preset.end
                    );
                    const isSelected = imageValue === svgDataUrl;
                    return (
                      <button
                        key={preset.emoji}
                        className={`aspect-square rounded-full flex items-center justify-center text-xl transition-all relative border-2 hover:scale-105 cursor-pointer ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/20 scale-105"
                            : "border-transparent hover:border-border"
                        }`}
                        onClick={() => {
                          form.setFieldValue("profile.image", svgDataUrl);
                        }}
                        style={{
                          background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`,
                        }}
                        title={`Select ${preset.emoji} avatar`}
                        type="button"
                      >
                        <span className="select-none">{preset.emoji}</span>
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border border-background">
                            <Check className="size-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {imageValue && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => form.setFieldValue("profile.image", "")}
                    type="button"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              <form.AppField name="profile.name">
                {(field) => (
                  <field.FormInput
                    label="Full Name"
                    placeholder="e.g. CG Stewart"
                  />
                )}
              </form.AppField>

              <div className="space-y-2">
                <form.AppField name="profile.username">
                  {(field) => (
                    <field.FormInput
                      label="Username"
                      placeholder="e.g. cgstewart"
                    />
                  )}
                </form.AppField>
                {isCheckingUsername && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Checking availability...
                  </p>
                )}
                {usernameError && (
                  <p className="text-xs text-destructive">{usernameError}</p>
                )}
                {usernameSuccess && !usernameError && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Check className="size-3" /> Available
                  </p>
                )}
              </div>

              <form.AppField name="profile.dob">
                {(field) => (
                  <field.FormInput
                    label="Date of Birth"
                    placeholder="MM/DD/YYYY"
                  />
                )}
              </form.AppField>

              <div className="flex justify-end">
                <form.AppForm>
                  <form.SubmitButton>Continue</form.SubmitButton>
                </form.AppForm>
              </div>

              {formGroup.state.meta.errorMap.onChange && (
                <pre className="text-xs text-destructive">
                  {JSON.stringify(formGroup.state.meta.errorMap, null, 2)}
                </pre>
              )}
            </div>
          </form>
        )}
      </form.FormGroup>
    );
  },
});
