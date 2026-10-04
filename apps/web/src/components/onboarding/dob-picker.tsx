import { Label } from "@rallycaststv/ui/components/label";
import { Calendar, Check, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MONTHS = [
  { label: "01 - January", value: "01" },
  { label: "02 - February", value: "02" },
  { label: "03 - March", value: "03" },
  { label: "04 - April", value: "04" },
  { label: "05 - May", value: "05" },
  { label: "06 - June", value: "06" },
  { label: "07 - July", value: "07" },
  { label: "08 - August", value: "08" },
  { label: "09 - September", value: "09" },
  { label: "10 - October", value: "10" },
  { label: "11 - November", value: "11" },
  { label: "12 - December", value: "12" },
];

const CURRENT_YEAR = new Date().getFullYear();
const MAX_PLAYER_YEAR = CURRENT_YEAR - 13;
const MIN_PLAYER_YEAR = CURRENT_YEAR - 110;

const YEARS = Array.from(
  { length: MAX_PLAYER_YEAR - MIN_PLAYER_YEAR + 1 },
  (_, i) => String(MAX_PLAYER_YEAR - i)
);

const getDaysInMonth = (monthStr: string, yearStr: string) => {
  if (!monthStr) {
    return 31;
  }
  const m = Math.trunc(Number(monthStr));
  const y = yearStr ? Math.trunc(Number(yearStr)) : 2000;
  return new Date(y, m, 0).getDate();
};

const calculateAge = (month: string, day: string, year: string) => {
  if (!month || !day || !year || year.length < 4) {
    return null;
  }
  const m = Math.trunc(Number(month));
  const d = Math.trunc(Number(day));
  const y = Math.trunc(Number(year));
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDelta = today.getMonth() - (m - 1);
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return age;
};

interface DateOfBirthPickerProps {
  error?: string;
  id?: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}

export function DateOfBirthPicker({
  error,
  id = "dob-picker",
  onChange,
  required = true,
  value,
}: DateOfBirthPickerProps) {
  // Parse initial MM/DD/YYYY if present
  const [initialMonth, initialDay, initialYear] = useMemo(() => {
    if (value && value.includes("/")) {
      const parts = value.split("/");
      if (parts.length === 3) {
        return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
      }
    }
    return ["", "", ""];
  }, [value]);

  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);
  const [year, setYear] = useState(initialYear);
  const [mode, setMode] = useState<"picker" | "text">("picker");
  const [textValue, setTextValue] = useState(value);

  // Sync internal state when prop changes from outside
  useEffect(() => {
    if (value && value.includes("/")) {
      const parts = value.split("/");
      if (parts.length === 3) {
        setMonth(parts[0] ?? "");
        setDay(parts[1] ?? "");
        setYear(parts[2] ?? "");
      }
    }
    setTextValue(value);
  }, [value]);

  const maxDays = getDaysInMonth(month, year);
  const daysList = Array.from({ length: maxDays }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  const handlePickerChange = (
    newMonth: string,
    newDay: string,
    newYear: string
  ) => {
    setMonth(newMonth);
    setDay(newDay);
    setYear(newYear);

    if (newMonth && newDay && newYear) {
      const formatted = `${newMonth}/${newDay}/${newYear}`;
      setTextValue(formatted);
      onChange(formatted);
    } else {
      onChange("");
    }
  };

  const handleTextChange = (raw: string) => {
    // Keep only numbers and slashes
    let cleaned = raw.replaceAll(/[^\d/]/gu, "");
    // Auto-insert slash after 2 digits and 4 digits if typed cleanly without slashes
    const digitsOnly = cleaned.replaceAll(/\D/gu, "");
    if (!cleaned.includes("/") && digitsOnly.length > 2) {
      cleaned =
        digitsOnly.length <= 4
          ? `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`
          : `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
    }

    setTextValue(cleaned);

    const parts = cleaned.split("/");
    if (parts.length === 3 && parts[2]?.length === 4) {
      const m = parts[0]?.padStart(2, "0") ?? "";
      const d = parts[1]?.padStart(2, "0") ?? "";
      const y = parts[2] ?? "";
      setMonth(m);
      setDay(d);
      setYear(y);
      onChange(`${m}/${d}/${y}`);
    } else {
      onChange(cleaned);
    }
  };

  const age = calculateAge(month, day, year);
  const isEligible = age !== null && age >= 13 && age <= 120;
  const isUnderage = age !== null && age < 13 && age >= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          Date of Birth
          {required && (
            <span
              className="text-destructive ml-1 font-bold"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </Label>
        <button
          className="text-muted-foreground hover:text-foreground cursor-pointer text-xs underline transition-colors"
          onClick={() =>
            setMode((prev) => (prev === "picker" ? "text" : "picker"))
          }
          type="button"
        >
          {mode === "picker"
            ? "Type MM/DD/YYYY instead"
            : "Use dropdown picker"}
        </button>
      </div>

      {mode === "picker" ? (
        <div className="grid grid-cols-3 gap-2" id={id}>
          {/* Month Select */}
          <div>
            <select
              aria-label="Birth Month"
              className="border-input bg-background/50 text-foreground focus-visible:border-ring focus-visible:ring-ring h-10 w-full cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-1"
              onChange={(e) => handlePickerChange(e.target.value, day, year)}
              value={month}
            >
              <option value="">Month</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Day Select */}
          <div>
            <select
              aria-label="Birth Day"
              className="border-input bg-background/50 text-foreground focus-visible:border-ring focus-visible:ring-ring h-10 w-full cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-1"
              onChange={(e) => handlePickerChange(month, e.target.value, year)}
              value={day}
            >
              <option value="">Day</option>
              {daysList.map((d) => (
                <option key={d} value={d}>
                  {Math.trunc(Number(d))}
                </option>
              ))}
            </select>
          </div>

          {/* Year Select */}
          <div>
            <select
              aria-label="Birth Year"
              className="border-input bg-background/50 text-foreground focus-visible:border-ring focus-visible:ring-ring h-10 w-full cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-1"
              onChange={(e) => handlePickerChange(month, day, e.target.value)}
              value={year}
            >
              <option value="">Year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Calendar className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
          <input
            aria-label="Date of Birth"
            className="border-input bg-background/50 text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring h-10 w-full rounded-lg border py-1 pr-3 pl-9 text-xs font-medium transition-colors outline-none focus-visible:ring-1"
            id={id}
            maxLength={10}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="MM/DD/YYYY"
            type="text"
            value={textValue}
          />
        </div>
      )}

      {/* Age eligibility status & feedback */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        {renderAgeStatus({ age, error, isEligible, isUnderage })}
      </div>
    </div>
  );
}

function renderAgeStatus({
  age,
  error,
  isEligible,
  isUnderage,
}: {
  age: number | null;
  error?: string;
  isEligible: boolean;
  isUnderage: boolean;
}) {
  if (isEligible) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
        <Check className="size-3.5 stroke-[2.5]" />
        <span>Age: {age} years old • Eligible RallyCasts player</span>
      </div>
    );
  }

  if (isUnderage) {
    return (
      <div className="text-destructive flex items-center gap-1.5 text-xs font-medium">
        <Info className="size-3.5" />
        <span>Age: {age} • Players must be at least 13 years old to join</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-xs">{error}</p>;
  }

  return (
    <p className="text-muted-foreground text-[11px]">
      Must be at least 13 years old to join RallyCasts.
    </p>
  );
}
