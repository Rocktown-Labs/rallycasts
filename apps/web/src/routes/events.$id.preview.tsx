import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Eye,
  Lock,
  MapPin,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { toast } from "sonner";

import { accentText } from "@/lib/accent-color";
import { useUpdateEvent } from "@/lib/hooks";
import {
  PREVIEW_BRACKET_SIZES,
  buildPreviewBracket,
  buildPreviewTeams,
  isByeMatch,
  previewAvatar,
} from "@/lib/preview-roster";
import type {
  PreviewMatch,
  PreviewMode,
  PreviewPlayer,
  PreviewTeam,
} from "@/lib/preview-roster";

import { useEventContext } from "./events.$id";

export const Route = createFileRoute("/events/$id/preview")({
  component: EventPreviewTab,
});

/** Theme presets; the accent color is what gets persisted. */
const THEME_PRESETS: { accent: string; label: string }[] = [
  { accent: "#16a34a", label: "Emerald" },
  { accent: "#0ea5e9", label: "Sky" },
  { accent: "#f97316", label: "Sunset" },
  { accent: "#8b5cf6", label: "Violet" },
  { accent: "#e11d48", label: "Rose" },
  { accent: "#facc15", label: "Gold" },
];

const DEFAULT_ACCENT = "#16a34a";

interface BrandingDraft {
  accentColor?: string;
  bannerUrl?: string | null;
  logoUrl?: string | null;
}

const previewBracketSizeForCapacity = (
  capacity: number | null | undefined,
  mode: PreviewMode
): number => {
  const entrants = Math.max(
    1,
    Math.ceil((capacity ?? 16) / (mode === "doubles" ? 2 : 1))
  );
  const lastSize = PREVIEW_BRACKET_SIZES.at(-1) ?? 128;
  return PREVIEW_BRACKET_SIZES.find((size) => size >= entrants) ?? lastSize;
};

function EventPreviewTab() {
  const { canManageEvent, details, event } = useEventContext();
  const updateEvent = useUpdateEvent(event.id);

  const persisted = event.branding;
  const [draft, setDraft] = useState<BrandingDraft>(() => ({
    accentColor: persisted?.accentColor ?? DEFAULT_ACCENT,
    bannerUrl: persisted?.bannerUrl ?? null,
    logoUrl: persisted?.logoUrl ?? null,
  }));
  const [mode, setMode] = useState<PreviewMode>("singles");
  const [bracketSize, setBracketSize] = useState<number>(() =>
    previewBracketSizeForCapacity(event.capacity, "singles")
  );

  const accentColor = draft.accentColor ?? DEFAULT_ACCENT;

  const teams = useMemo(
    () => buildPreviewTeams(mode, bracketSize),
    [mode, bracketSize]
  );
  const bracket = useMemo(() => buildPreviewBracket(teams), [teams]);

  if (!canManageEvent) {
    return (
      <div className="bg-card mx-auto max-w-md rounded-2xl border p-10 text-center">
        <Lock className="text-muted-foreground mx-auto size-8" />
        <p className="mt-3 font-bold">Organizer access only</p>
        <p className="text-muted-foreground mt-1 text-sm">
          The private preview is available to the event organizer and their
          organization managers.
        </p>
        <Link params={{ id: event.id }} to="/events/$id">
          <Button className="mt-4 rounded-lg" size="sm" variant="outline">
            Back to event
          </Button>
        </Link>
      </div>
    );
  }

  const saveBranding = () => {
    updateEvent.mutate(
      {
        branding: {
          accentColor: draft.accentColor,
          bannerUrl: draft.bannerUrl?.trim() || null,
          logoUrl: draft.logoUrl?.trim() || null,
        },
      },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => toast.success("Branding saved"),
      }
    );
  };

  const resetBranding = () => {
    setDraft({
      accentColor: DEFAULT_ACCENT,
      bannerUrl: null,
      logoUrl: null,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Branding studio */}
      <aside className="bg-card h-fit rounded-2xl border p-5 lg:sticky lg:top-(--header-height)">
        <div className="flex items-center gap-2">
          <Palette className="text-primary size-4" />
          <h2 className="font-bold">Branding studio</h2>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Changes appear in the preview instantly. Save to apply them to the
          published event page.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <Label>Theme</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {THEME_PRESETS.map((preset) => (
                <button
                  aria-label={`${preset.label} theme`}
                  className={cn(
                    "size-8 cursor-pointer rounded-full border-2 transition-transform active:scale-95",
                    accentColor === preset.accent
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  key={preset.accent}
                  onClick={() =>
                    setDraft((previous) => ({
                      ...previous,
                      accentColor: preset.accent,
                    }))
                  }
                  style={{ backgroundColor: preset.accent }}
                  title={preset.label}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="preview-accent">Accent color</Label>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="border-border bg-background size-10 cursor-pointer rounded-lg border p-1"
                id="preview-accent"
                onChange={(changeEvent) =>
                  setDraft((previous) => ({
                    ...previous,
                    accentColor: changeEvent.target.value,
                  }))
                }
                type="color"
                value={accentColor}
              />
              <Input
                aria-label="Accent color hex"
                className="rounded-lg font-mono"
                maxLength={7}
                onChange={(changeEvent) =>
                  setDraft((previous) => ({
                    ...previous,
                    accentColor: changeEvent.target.value,
                  }))
                }
                placeholder="#16a34a"
                value={draft.accentColor ?? ""}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="preview-logo">Logo URL</Label>
            <Input
              aria-label="Logo URL"
              className="mt-2 rounded-lg"
              id="preview-logo"
              onChange={(changeEvent) =>
                setDraft((previous) => ({
                  ...previous,
                  logoUrl: changeEvent.target.value,
                }))
              }
              placeholder="https://…/logo.png"
              value={draft.logoUrl ?? ""}
            />
          </div>

          <div>
            <Label htmlFor="preview-banner">Banner image URL</Label>
            <Input
              aria-label="Banner image URL"
              className="mt-2 rounded-lg"
              id="preview-banner"
              onChange={(changeEvent) =>
                setDraft((previous) => ({
                  ...previous,
                  bannerUrl: changeEvent.target.value,
                }))
              }
              placeholder="https://…/banner.jpg"
              value={draft.bannerUrl ?? ""}
            />
          </div>

          <div>
            <Label>Preview roster</Label>
            <div className="mt-2 space-y-2">
              <div className="bg-muted/60 flex rounded-lg p-1">
                {(["singles", "doubles"] as const).map((value) => (
                  <button
                    className={cn(
                      "flex-1 cursor-pointer rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                      mode === value
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    key={value}
                    onClick={() => {
                      setMode(value);
                      setBracketSize(
                        previewBracketSizeForCapacity(event.capacity, value)
                      );
                    }}
                    type="button"
                  >
                    {value === "singles" ? "Singles" : "Doubles"}
                  </button>
                ))}
              </div>
              <select
                aria-label="Bracket size"
                className="border-border bg-background focus-visible:border-ring w-full cursor-pointer rounded-lg border px-3 py-2 text-sm outline-none"
                onChange={(changeEvent) =>
                  setBracketSize(Number(changeEvent.target.value))
                }
                value={bracketSize}
              >
                {PREVIEW_BRACKET_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} {mode === "doubles" ? "teams" : "players"}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-muted-foreground mt-2 text-[11px]">
              Dummy roster — User One, @userone1, etc. Nothing is stored.
            </p>
          </div>

          <div className="flex items-center gap-2 border-t pt-4">
            <Button
              className="rounded-lg"
              disabled={updateEvent.isPending}
              onClick={saveBranding}
            >
              <Save className="size-4" />
              {updateEvent.isPending ? "Saving…" : "Save branding"}
            </Button>
            <Button
              className="rounded-lg"
              onClick={resetBranding}
              variant="outline"
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </div>
      </aside>

      {/* Live preview */}
      <section className="min-w-0 space-y-4">
        <div className="bg-primary/10 text-primary border-primary/20 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold">
          <Eye className="size-4" />
          Private preview — only you can see this. Publish from Manage to go
          live.
        </div>

        <PreviewHero
          accentColor={accentColor}
          bannerUrl={draft.bannerUrl ?? null}
          details={details}
          event={event}
          logoUrl={draft.logoUrl ?? null}
        />

        <PreviewBracketView
          accentColor={accentColor}
          bracket={bracket}
          mode={mode}
        />
      </section>
    </div>
  );
}

function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className="text-foreground text-xs font-semibold" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function PreviewHero({
  accentColor,
  bannerUrl,
  details,
  event,
  logoUrl,
}: {
  accentColor: string;
  bannerUrl: string | null;
  details: { imageUrl: string; location: string };
  event: {
    eventType: string;
    name: string;
    startsAt: string;
  };
  logoUrl: string | null;
}) {
  const startsAt = new Date(event.startsAt);
  const dateLabel = Number.isNaN(startsAt.getTime())
    ? "Date to be announced"
    : startsAt.toLocaleString(undefined, {
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        month: "long",
        year: "numeric",
      });

  return (
    <div
      className="relative overflow-hidden rounded-2xl border shadow-sm"
      style={
        {
          "--preview-accent": accentColor,
        } as CSSProperties
      }
    >
      <div className="relative h-36 sm:h-44">
        {bannerUrl ? (
          <img alt="" className="size-full object-cover" src={bannerUrl} />
        ) : (
          <div
            className="size-full"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}22)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="bg-card relative px-5 pb-5">
        <div className="-mt-10 flex items-end justify-between gap-4">
          <div
            className="border-card bg-background grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border-4 shadow-md"
            style={{ backgroundColor: `${accentColor}1a` }}
          >
            {logoUrl ? (
              <img
                alt="Tournament logo"
                className="size-full object-contain"
                src={logoUrl}
              />
            ) : (
              <Trophy className="size-8" style={{ color: accentColor }} />
            )}
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase"
            style={{
              backgroundColor: `${accentColor}22`,
              color: accentText(accentColor),
            }}
          >
            {event.eventType.replaceAll("_", " ")}
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-black tracking-tight">
          {event.name}
        </h2>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" style={{ color: accentColor }} />
            {dateLabel}
          </span>
          <span className="flex min-w-0 items-center gap-1">
            <MapPin
              className="size-3.5 shrink-0"
              style={{ color: accentColor }}
            />
            <span className="truncate">{details.location}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

const previewRoundLabel = (index: number, total: number): string => {
  const fromFinal = total - 1 - index;
  if (fromFinal === 0) {
    return "Finals";
  }
  if (fromFinal === 1) {
    return "Semifinals";
  }
  return `Round ${index + 1}`;
};

function PreviewBracketView({
  accentColor,
  bracket,
  mode,
}: {
  accentColor: string;
  bracket: ReturnType<typeof buildPreviewBracket>;
  mode: PreviewMode;
}) {
  return (
    <div className="bg-card rounded-2xl border p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-bold">
            <Sparkles className="size-4" style={{ color: accentColor }} />
            Bracket preview
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {bracket.matchesByRound[0]?.length ?? 0} first-round{" "}
            {mode === "doubles" ? "team matches" : "matches"} · byes fill the
            rest of the draw.
          </p>
        </div>
        <span className="text-muted-foreground text-[10px] font-semibold">
          {bracket.paddedSize}-player draw
        </span>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-4">
          {bracket.matchesByRound.map((matches, roundIndex) => (
            <div
              className="flex flex-col justify-around"
              key={`round-${roundIndex + 1}`}
            >
              <div className="mb-2 text-center text-[10px] font-bold tracking-wider text-[color:var(--preview-accent)] uppercase">
                {previewRoundLabel(roundIndex, bracket.matchesByRound.length)}
              </div>
              {matches.map((match) => (
                <PreviewMatchCard
                  accentColor={accentColor}
                  key={match.id}
                  match={match}
                  mode={mode}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewMatchCard({
  accentColor,
  match,
  mode,
}: {
  accentColor: string;
  match: PreviewMatch;
  mode: PreviewMode;
}) {
  const bye = isByeMatch(match);
  let seedLabel = "TBD";
  if (match.seedOne && match.seedTwo) {
    seedLabel = `Seeds ${match.seedOne} \u00B7 ${match.seedTwo}`;
  } else if (match.seedOne) {
    seedLabel = `Seed ${match.seedOne}`;
  }

  return (
    <div
      className={cn(
        "mb-2 w-44 rounded-lg border p-2.5",
        bye ? "bg-muted/30 border-dashed" : "border-border bg-background"
      )}
    >
      <div className="text-muted-foreground mb-1 flex items-center justify-between text-[9px] font-semibold tracking-wider uppercase">
        <span>{seedLabel}</span>
      </div>
      <PreviewSlot
        accentColor={accentColor}
        match={match}
        mode={mode}
        team={match.homeTeam}
      />
      <PreviewSlot
        accentColor={accentColor}
        away
        match={match}
        mode={mode}
        team={match.awayTeam}
      />
    </div>
  );
}

function PreviewSlot({
  accentColor,
  away = false,
  match,
  mode,
  team,
}: {
  accentColor: string;
  away?: boolean;
  match: PreviewMatch;
  mode: PreviewMode;
  team: PreviewTeam | null;
}) {
  if (!team) {
    return (
      <div
        className={cn(
          "text-muted-foreground/60 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs",
          away && "border-border/40 border-t"
        )}
      >
        {match.round === 1 && away ? "BYE" : "TBD"}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5",
        away && "border-border/40 border-t"
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold" title={team.name}>
          {team.name}
        </p>
        {mode === "doubles" && (
          <p className="text-muted-foreground truncate text-[10px]">
            {team.players.map((player) => player.name).join(" & ")}
          </p>
        )}
      </div>
      <PreviewPlayerCard
        accentColor={accentColor}
        player={team.players[0]}
        team={mode === "doubles" ? team : null}
      />
    </div>
  );
}

/**
 * Small fast-info card on hover/focus: avatar, name, username, rating. For
 * doubles it shows both teammates. Pure CSS hover for mouse, focus/click
 * works for touch.
 */
function PreviewPlayerCard({
  accentColor,
  player,
  team,
}: {
  accentColor: string;
  player: PreviewPlayer;
  team: PreviewTeam | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        aria-label={`${team ? team.name : player.name} details`}
        className="focus-visible:ring-ring grid size-6 cursor-pointer place-items-center rounded-full text-[9px] font-bold text-white transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
        onClick={() => setOpen((previous) => !previous)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          backgroundColor: `hsl(${previewAvatar(player.name).hue} 45% 40%)`,
        }}
        type="button"
      >
        {previewAvatar(player.name).initials}
      </button>

      {open ? (
        <div className="bg-card border-border absolute right-0 z-30 mt-1 flex gap-2 rounded-xl border p-3 shadow-xl">
          {(team ? team.players : [player]).map((member) => (
            <PlayerCardBody
              accentColor={accentColor}
              key={member.username}
              player={member}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlayerCardBody({
  accentColor,
  player,
}: {
  accentColor: string;
  player: PreviewPlayer;
}) {
  const avatar = previewAvatar(player.name);
  return (
    <div className="w-40 shrink-0 text-center">
      <div
        className="mx-auto grid size-12 place-items-center rounded-full text-sm font-black text-white"
        style={{ backgroundColor: `hsl(${avatar.hue} 45% 40%)` }}
      >
        {avatar.initials}
      </div>
      <p className="mt-1.5 truncate text-xs font-bold" title={player.name}>
        {player.name}
      </p>
      <p className="text-muted-foreground truncate text-[10px]">
        @{player.username}
      </p>
      <p
        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
        style={{
          backgroundColor: `${accentColor}1a`,
          color: accentText(accentColor),
        }}
      >
        {player.rating.toFixed(2)} · {player.skillLevel}
      </p>
    </div>
  );
}
