import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAppForm } from "@/lib/hooks/onboarding-form";

import { locationSchema, wizardFormOpts } from "./shared-form";
import { StepGame } from "./step-game";
import { StepProfile } from "./step-profile";
import { StepRoles } from "./step-roles";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: {
          id: "user-1",
          image: "",
          name: "Alex Pickler",
          username: "alexpickler",
        },
      },
    }),
  },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    api: {
      v1: {
        profile: {
          "check-username": {
            $get: vi.fn().mockResolvedValue({
              json: () =>
                Promise.resolve({ available: true, source: "bloom_filter" }),
              ok: true,
            }),
          },
        },
      },
    },
  },
}));

afterEach(() => {
  cleanup();
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function StepProfileWrapper() {
  const form = useAppForm({ ...wizardFormOpts });
  return (
    <QueryClientProvider client={queryClient}>
      <StepProfile form={form} setStep={vi.fn()} step={0} />
    </QueryClientProvider>
  );
}

function StepGameWrapper() {
  const form = useAppForm({ ...wizardFormOpts });
  return (
    <QueryClientProvider client={queryClient}>
      <StepGame form={form} setStep={vi.fn()} step={2} />
    </QueryClientProvider>
  );
}

function StepRolesWrapper() {
  const form = useAppForm({ ...wizardFormOpts });
  return (
    <QueryClientProvider client={queryClient}>
      <StepRoles form={form} onFinish={vi.fn()} setStep={vi.fn()} step={3} />
    </QueryClientProvider>
  );
}

describe("Onboarding Wizard Steps & Validation", () => {
  describe("locationSchema", () => {
    it("enforces 2-letter state code and uppercase transformation", () => {
      const valid = locationSchema.safeParse({
        homeCity: "Searcy",
        homeCourtName: "Berryhill Park",
        homeLatitude: 35.25,
        homeLongitude: -91.74,
        homeState: "ar",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.homeState).toBe("AR");
      }

      const invalidLength = locationSchema.safeParse({
        homeCity: "Searcy",
        homeCourtName: "Berryhill Park",
        homeLatitude: 35.25,
        homeLongitude: -91.74,
        homeState: "ARK",
      });
      expect(invalidLength.success).toBe(false);

      const invalidChars = locationSchema.safeParse({
        homeCity: "Searcy",
        homeCourtName: "Berryhill Park",
        homeLatitude: 35.25,
        homeLongitude: -91.74,
        homeState: "12",
      });
      expect(invalidChars.success).toBe(false);
    });
  });

  describe("StepProfile (Step 1)", () => {
    it("allows selecting an avatar style and reflects it in the UI", () => {
      render(<StepProfileWrapper />);

      const avatarButton = screen.getByTitle("The Dink Master");
      expect(avatarButton).toBeTruthy();

      fireEvent.click(avatarButton);

      // The button should now be selected and contain a check icon
      expect(avatarButton.classList.contains("border-primary")).toBe(true);
    });
  });

  describe("StepGame (Step 3)", () => {
    it("allows selecting player rating and toggling bio chips", () => {
      render(<StepGameWrapper />);

      // Advanced rating option
      const advancedBtn = screen.getByText("Advanced");
      fireEvent.click(advancedBtn);

      // Bio prompt toggle
      const bioChip = screen.getByText("🎾 Right-handed");
      fireEvent.click(bioChip);

      const textarea = screen.getByLabelText(
        "Player Bio"
      ) as HTMLTextAreaElement;
      expect(textarea.value).toContain("🎾 Right-handed");

      // Toggling again should remove it
      fireEvent.click(bioChip);
      expect(textarea.value).not.toContain("🎾 Right-handed");
    });
  });

  describe("StepRoles (Step 4)", () => {
    it("offers player and host roles only; caster lives in the mobile app", () => {
      render(<StepRolesWrapper />);

      // The web onboarding offers Player and Host only.
      expect(screen.getByText("Player")).toBeTruthy();
      expect(screen.getByText("Host")).toBeTruthy();
      expect(screen.queryByText("Caster")).toBeNull();
      expect(screen.queryByText("$50 Express Fee")).toBeNull();
      expect(screen.queryByText("Caster Express Verification")).toBeNull();
    });

    it("allows switching between Monthly and Annual billing and selecting Pro tier", () => {
      render(<StepRolesWrapper />);

      // Check for Court Pass and RallyCasts Pro
      expect(screen.getByText("Court Pass")).toBeTruthy();
      expect(screen.getByText("RallyCasts Pro")).toBeTruthy();

      // Pro tier button
      const proCard = screen.getByText("RallyCasts Pro").closest("button");
      expect(proCard).toBeTruthy();
      if (proCard) {
        fireEvent.click(proCard);
      }

      // Check that Pro tier displays free trial callout
      expect(screen.getAllByText(/7-Day Trial/iu).length).toBeGreaterThan(0);
      expect(screen.getByText(/Cancel anytime within 7 days/iu)).toBeTruthy();

      // Toggle billing interval
      const monthlyBtn = screen.getByText("Monthly");
      fireEvent.click(monthlyBtn);
      expect(screen.getByText("$14.99")).toBeTruthy();
    });
  });
});
