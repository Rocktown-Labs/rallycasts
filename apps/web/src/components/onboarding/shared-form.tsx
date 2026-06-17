import { formOptions } from "@tanstack/react-form";
import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/u,
    "Username can only contain letters, numbers, and underscores"
  );

export const nameSchema = z
  .string()
  .min(2, "Full name must be at least 2 characters")
  .max(50, "Full name must be at most 50 characters");

export const dobSchema = z
  .string()
  .regex(
    /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/u,
    "Use MM/DD/YYYY format"
  )
  .refine((val) => {
    const [monthStr, dayStr, yearStr] = val.split("/");
    const month = Number(monthStr);
    const day = Number(dayStr);
    const year = Number(yearStr);
    const date = new Date(year, month - 1, day);
    const age = Math.floor(
      (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return age >= 13 && age <= 120;
  }, "You must be between 13 and 120 years old");

export const profileSchema = z.object({
  dob: dobSchema,
  image: z.string().optional(),
  name: nameSchema,
  username: usernameSchema,
});

export const locationSchema = z.object({
  homeCity: z.string().min(1, "City is required"),
  homeCourtName: z.string().min(1, "Home court is required"),
  homeLatitude: z.number(),
  homeLongitude: z.number(),
  homeState: z.string().min(1, "State is required").max(2, "Use state code"),
  radarPlaceId: z.string().optional(),
});

export const gameSchema = z.object({
  bio: z.string().max(500, "Bio must be at most 500 characters").optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "pro"]),
});

export const rolesSchema = z.object({
  accountTier: z.enum(["free", "premium"]),
  isCaster: z.boolean(),
  isOrganizer: z.boolean(),
  isPlayer: z.boolean(),
});

export const wizardSchema = z.object({
  game: gameSchema,
  location: locationSchema,
  profile: profileSchema,
  roles: rolesSchema,
});

export type WizardValues = z.infer<typeof wizardSchema>;

export const wizardFormOpts = formOptions({
  defaultValues: {
    game: {
      bio: "",
      skillLevel: "intermediate" as const,
    },
    location: {
      homeCity: "",
      homeCourtName: "",
      homeLatitude: 0,
      homeLongitude: 0,
      homeState: "",
      radarPlaceId: "",
    },
    profile: {
      dob: "",
      image: "",
      name: "",
      username: "",
    },
    roles: {
      accountTier: "free" as const,
      isCaster: false,
      isOrganizer: false,
      isPlayer: true,
    },
  } satisfies WizardValues,
});
