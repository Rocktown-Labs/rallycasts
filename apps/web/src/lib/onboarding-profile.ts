import { z } from "zod";

const MAX_TWO_DIGIT_BIRTH_YEAR = 26;
const MIN_FULL_YEAR = 1900;
const MAX_FULL_YEAR = 2100;

const ageSchema = z
  .number()
  .int("Age must be a whole number")
  .min(5, "Age must be at least 5")
  .max(115, "Age must be at most 115");

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

interface DateParts {
  day: number;
  month: number;
  year: number;
}

export interface ParsedDateOfBirth {
  age: number;
  formatted: string;
}

export interface OnboardingBioInput {
  availability: string[];
  contentFormats: string[];
  frequencyLabel: string;
  goalLabels: string[];
  playStyle: string;
}

const toFourDigitYear = (value: string) => {
  if (value.length === 2) {
    const year = Number.parseInt(value, 10);
    return year > MAX_TWO_DIGIT_BIRTH_YEAR ? MIN_FULL_YEAR + year : 2000 + year;
  }

  return Number.parseInt(value, 10);
};

const getDateParts = (input: string, clean: string): DateParts | null => {
  if (clean.length === 6) {
    return {
      day: Number.parseInt(clean.slice(2, 4), 10),
      month: Number.parseInt(clean.slice(0, 2), 10),
      year: toFourDigitYear(clean.slice(4, 6)),
    };
  }

  if (clean.length === 8) {
    const possibleYear = Number.parseInt(clean.slice(0, 4), 10);

    if (possibleYear >= MIN_FULL_YEAR && possibleYear <= MAX_FULL_YEAR) {
      return {
        day: Number.parseInt(clean.slice(6, 8), 10),
        month: Number.parseInt(clean.slice(4, 6), 10),
        year: possibleYear,
      };
    }

    return {
      day: Number.parseInt(clean.slice(2, 4), 10),
      month: Number.parseInt(clean.slice(0, 2), 10),
      year: Number.parseInt(clean.slice(4, 8), 10),
    };
  }

  const parts = input.split(/[/\-.]/u);
  if (parts.length !== 3) {
    return null;
  }

  const [firstPart, secondPart, yearPart] = parts;
  if (!firstPart || !secondPart || !yearPart) {
    return null;
  }

  const firstValue = Number.parseInt(firstPart, 10);
  if (firstValue >= MIN_FULL_YEAR && firstValue <= MAX_FULL_YEAR) {
    return {
      day: Number.parseInt(yearPart, 10),
      month: Number.parseInt(secondPart, 10),
      year: firstValue,
    };
  }

  if (![2, 4].includes(yearPart.length)) {
    return null;
  }

  return {
    day: Number.parseInt(secondPart, 10),
    month: Number.parseInt(firstPart, 10),
    year:
      yearPart.length === 2
        ? toFourDigitYear(yearPart)
        : Number.parseInt(yearPart, 10),
  };
};

export const parseDateOfBirth = (
  input: string,
  today = new Date()
): ParsedDateOfBirth | null => {
  const clean = input.replaceAll(/\D/gu, "");
  const parts = getDateParts(input, clean);

  if (!parts) {
    return null;
  }

  const { month, day, year } = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
    return null;
  }

  let computedAge = today.getFullYear() - year;
  const monthDelta = today.getMonth() - (month - 1);
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < day)) {
    computedAge -= 1;
  }

  const ageResult = ageSchema.safeParse(computedAge);
  if (!ageResult.success) {
    return null;
  }

  return {
    age: computedAge,
    formatted: `${months[month - 1]} ${day}, ${year}`,
  };
};

export const getDateOfBirthValidation = (
  value: string,
  parsedDateOfBirth: ParsedDateOfBirth | null
) => {
  if (value === "") {
    return { errorText: null, isValid: false };
  }

  if (!parsedDateOfBirth) {
    return {
      errorText: "Please enter a valid date of birth.",
      isValid: false,
    };
  }

  return { errorText: null, isValid: true };
};

export const buildOnboardingBio = ({
  availability,
  contentFormats,
  frequencyLabel,
  goalLabels,
  playStyle,
}: OnboardingBioInput) => {
  const parts = [
    `Looking for ${goalLabels.join(", ").toLowerCase()}`,
    `plays ${frequencyLabel.toLowerCase()}`,
    `${playStyle.toLowerCase()} court energy`,
    `usually available ${availability.join(", ").toLowerCase()}`,
    `wants ${contentFormats.join(", ").toLowerCase()} in their feed`,
  ];

  return parts.join(". ");
};
