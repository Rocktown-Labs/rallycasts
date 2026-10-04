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
    /^(?<month>0[1-9]|1[0-2])\/(?<day>0[1-9]|[12]\d|3[01])\/\d{4}$/u,
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

export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
  { code: "PR", name: "Puerto Rico" },
] as const;

export const locationSchema = z.object({
  homeCity: z.string().trim().min(1, "City is required"),
  homeCourtName: z.string().trim().min(1, "Home court is required"),
  homeLatitude: z.number(),
  homeLongitude: z.number(),
  homeState: z
    .string()
    .trim()
    .length(2, "State code must be exactly 2 letters")
    .regex(/^[A-Za-z]{2}$/u, "Must be a 2-letter state code (e.g. AR, CA, NY)")
    .transform((val) => val.toUpperCase()),
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

export const initialWizardValues: WizardValues = {
  game: {
    bio: "",
    skillLevel: "intermediate",
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
    accountTier: "free",
    isCaster: false,
    isOrganizer: false,
    isPlayer: true,
  },
};

export const wizardFormOpts = formOptions({
  defaultValues: initialWizardValues,
});
