import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { cn } from "@rallycaststv/ui/lib/utils";
import { barX, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import {
  Ban,
  Check,
  Crosshair,
  Megaphone,
  Pencil,
  Plus,
  Rocket,
  Pause,
  Play,
  Wallet,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { fromLocalInputValue, toLocalInputValue } from "@/lib/datetime";
import {
  useAdCampaignAction,
  useAdCampaigns,
  useAdStats,
  useAdTopup,
  useCreateAdCampaign,
  useUpdateAdCampaign,
} from "@/lib/hooks/use-ads";
import type {
  CampaignEditInput,
  CreateCampaignInput,
} from "@/lib/hooks/use-ads";
import { formatDollars } from "@/lib/hooks/use-organizer-analytics";

type CampaignStatus =
  | "active"
  | "completed"
  | "draft"
  | "paused"
  | "pending_approval"
  | "rejected";

interface Campaign {
  city: string | null;
  clicks: number;
  cpmCents: number;
  creatives: CampaignCreative[];
  createdAt: string;
  dailyBudgetCents: number;
  endsAt: string | null;
  eventId: string;
  fundedCents: number;
  id: string;
  impressions: number;
  name: string;
  placements: "both" | "display" | "preroll";
  rejectionReason: string | null;
  skillLevel: "advanced" | "beginner" | "intermediate" | "pro" | null;
  spentCents: number;
  startsAt: string | null;
  state: string | null;
  status: CampaignStatus;
  totalBudgetCents: number;
  videoCpmCents: number;
}

interface CampaignCreative {
  body: string | null;
  ctaPath: string | null;
  id: string;
  imageUrl: string | null;
  kind: "display" | "preroll";
  title: string;
  videoId: string | null;
}

interface ManagerEvent {
  id: string;
  name: string;
  startsAt: string;
  status: string;
}

interface ManagerVideo {
  id: string;
  title: string;
}

const statusStyles: Record<CampaignStatus, string> = {
  active: "bg-primary text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  paused: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  pending_approval: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  rejected: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<CampaignStatus, string> = {
  active: "Active",
  completed: "Completed",
  draft: "Draft",
  paused: "Paused",
  pending_approval: "In review",
  rejected: "Rejected",
};

const EDITABLE_STATUSES = new Set<CampaignStatus>(["draft", "rejected"]);

const placementLabels: Record<Campaign["placements"], string> = {
  both: "Cards + prerolls",
  display: "Cards only",
  preroll: "Prerolls only",
};

const skillLabels: Record<string, string> = {
  advanced: "Advanced",
  beginner: "Beginner",
  intermediate: "Intermediate",
  pro: "Pro",
};

const ctrFor = (clicks: number, impressions: number) =>
  impressions > 0 ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—";

const dollars = (value: string) => Math.round(Number(value) * 100);

interface AdsManagerProps {
  events: ManagerEvent[];
  organizationId: string;
  organizationName: string;
  videos: ManagerVideo[];
}

export function AdsManager({
  events,
  organizationId,
  organizationName,
  videos,
}: AdsManagerProps) {
  const { data } = useAdCampaigns(organizationId);
  const campaigns = data?.campaigns ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const activeCount = campaigns.filter(
    (campaign) => campaign.status === "active"
  ).length;
  const totals = { clicks: 0, funded: 0, impressions: 0, spent: 0 };
  for (const campaign of campaigns) {
    totals.clicks += campaign.clicks;
    totals.funded += campaign.fundedCents;
    totals.impressions += campaign.impressions;
    totals.spent += campaign.spentCents;
  }

  const detailCampaign =
    campaigns.find((campaign) => campaign.id === detailId) ?? null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Megaphone className="text-primary size-5" /> Campaigns
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {activeCount > 0
              ? `${activeCount} active · ${totals.impressions.toLocaleString()} impressions · ${totals.clicks.toLocaleString()} clicks · ${formatDollars(totals.spent)} spent`
              : "Boost your events across the RallyCasts feed and video prerolls."}
          </p>
        </div>
        <Button
          className="rounded-lg"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          size="sm"
        >
          <Plus data-icon="inline-start" /> New campaign
        </Button>
      </div>

      {/* Campaigns table */}
      {campaigns.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
          No campaigns yet. Launch your first boost to put{" "}
          <span className="text-foreground font-semibold">
            {organizationName}
          </span>{" "}
          events in front of players.
        </div>
      ) : (
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-muted-foreground text-xs">
              <tr>
                <th className="pb-2">Campaign</th>
                <th className="pb-2">Delivery</th>
                <th className="pb-2">Spend</th>
                <th className="pb-2">Flight</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="py-3 pr-3 align-top">
                    <p className="font-semibold">{campaign.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                          statusStyles[campaign.status]
                        )}
                      >
                        {statusLabels[campaign.status]}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {placementLabels[campaign.placements]}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 align-top text-xs">
                    <p className="font-medium">
                      {campaign.impressions.toLocaleString()} impressions
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {campaign.clicks.toLocaleString()} clicks ·{" "}
                      {ctrFor(campaign.clicks, campaign.impressions)} CTR
                    </p>
                  </td>
                  <td className="py-3 pr-3 align-top text-xs">
                    <p className="font-medium">
                      {formatDollars(campaign.spentCents)}
                    </p>
                    <div className="bg-muted mt-1 h-1.5 w-24 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{
                          width: `${
                            campaign.fundedCents > 0
                              ? Math.min(
                                  100,
                                  Math.round(
                                    (campaign.spentCents /
                                      campaign.fundedCents) *
                                      100
                                  )
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      of {formatDollars(campaign.fundedCents)} funded
                    </p>
                  </td>
                  <td className="text-muted-foreground py-3 pr-3 align-top text-xs">
                    {campaign.startsAt || campaign.endsAt
                      ? `${campaign.startsAt ? new Date(campaign.startsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—"} → ${campaign.endsAt ? new Date(campaign.endsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—"}`
                      : "No schedule"}
                  </td>
                  <td className="py-3 text-right align-top">
                    <div className="flex justify-end gap-1.5">
                      {EDITABLE_STATUSES.has(campaign.status) ? (
                        <Button
                          disabled={false}
                          onClick={() => {
                            setEditing(campaign);
                            setFormOpen(true);
                          }}
                          size="xs"
                          variant="ghost"
                        >
                          <Pencil data-icon="inline-start" /> Edit
                        </Button>
                      ) : null}
                      <Button
                        onClick={() => setDetailId(campaign.id)}
                        size="xs"
                        variant="outline"
                      >
                        Details
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen ? (
        <CampaignFormDialog
          events={events}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          organizationId={organizationId}
          videos={videos}
          campaign={editing}
        />
      ) : null}

      {detailCampaign ? (
        <CampaignDetailDialog
          campaign={detailCampaign}
          events={events}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setEditing(detailCampaign);
            setDetailId(null);
            setFormOpen(true);
          }}
          organizationId={organizationId}
        />
      ) : null}
    </div>
  );
}

interface CampaignFormState {
  clipId: string;
  city: string;
  dailyBudget: string;
  displayBody: string;
  displayTitle: string;
  endsAt: string;
  eventId: string;
  name: string;
  placements: Campaign["placements"];
  showClipField: boolean;
  skillLevel: string;
  startsAt: string;
  state: string;
  totalBudget: string;
}

type CampaignPayloadResult = { error: string } | { json: CampaignEditInput };

// Mirrors the server's campaign validation so errors surface before the request.
// oxlint-disable-next-line complexity -- Linear guard sequence: each check returns one validation error.
const buildCampaignPayload = (
  form: CampaignFormState
): CampaignPayloadResult => {
  if (!form.name.trim()) {
    return { error: "Campaign name is required" };
  }
  if (!form.eventId) {
    return { error: "Pick the event to promote" };
  }
  const dailyCents = dollars(form.dailyBudget);
  const totalCents = dollars(form.totalBudget);
  if (!Number.isFinite(dailyCents) || dailyCents < 100) {
    return { error: "Daily budget must be at least $1" };
  }
  if (!Number.isFinite(totalCents) || totalCents < dailyCents) {
    return { error: "Total budget must be at least the daily budget" };
  }
  const startsIso = fromLocalInputValue(form.startsAt);
  const endsIso = fromLocalInputValue(form.endsAt);
  if (startsIso && endsIso && new Date(endsIso) <= new Date(startsIso)) {
    return { error: "The campaign must end after it starts" };
  }
  const showCardFields = form.placements !== "preroll";
  const creatives: CreateCampaignInput["creatives"] = [];
  if (showCardFields) {
    creatives.push({
      body: form.displayBody.trim() || undefined,
      kind: "display",
      title: form.displayTitle.trim() || form.name.trim(),
    });
  }
  if (form.showClipField) {
    if (!form.clipId) {
      return { error: "Pick a sponsor clip (30s or shorter) for prerolls" };
    }
    creatives.push({
      kind: "preroll",
      title: form.displayTitle.trim() || form.name.trim(),
      videoId: form.clipId,
    });
  }
  return {
    json: {
      city: form.city.trim() || undefined,
      creatives,
      dailyBudgetCents: dailyCents,
      endsAt: endsIso ?? undefined,
      eventId: form.eventId,
      name: form.name.trim(),
      placements: form.placements,
      skillLevel: form.skillLevel
        ? (form.skillLevel as "advanced" | "beginner" | "intermediate" | "pro")
        : undefined,
      startsAt: startsIso ?? undefined,
      state: form.state.trim() || undefined,
      totalBudgetCents: totalCents,
    },
  };
};

// oxlint-disable-next-line complexity -- One form, four sections; each branch maps to a placement option.
function CampaignFormDialog({
  campaign,
  events,
  onClose,
  organizationId,
  videos,
}: {
  campaign: Campaign | null;
  events: ManagerEvent[];
  onClose: () => void;
  organizationId: string;
  videos: ManagerVideo[];
}) {
  const createCampaign = useCreateAdCampaign(organizationId);
  const updateCampaign = useUpdateAdCampaign(organizationId);

  const publishedEvents = events.filter(
    (event) => event.status === "published"
  );
  const isEdit = campaign !== null;
  const pending = createCampaign.isPending || updateCampaign.isPending;

  const [name, setName] = useState(campaign?.name ?? "");
  const [eventId, setEventId] = useState(campaign?.eventId ?? "");
  const [placements, setPlacements] = useState<Campaign["placements"]>(
    campaign?.placements ?? "both"
  );
  const [dailyBudget, setDailyBudget] = useState(
    campaign ? (campaign.dailyBudgetCents / 100).toFixed(2) : "10"
  );
  const [totalBudget, setTotalBudget] = useState(
    campaign ? (campaign.totalBudgetCents / 100).toFixed(2) : "50"
  );
  const [startsAt, setStartsAt] = useState(
    toLocalInputValue(campaign?.startsAt)
  );
  const [endsAt, setEndsAt] = useState(toLocalInputValue(campaign?.endsAt));
  const [city, setCity] = useState(campaign?.city ?? "");
  const [state, setState] = useState(campaign?.state ?? "");
  const [skillLevel, setSkillLevel] = useState<string>(
    campaign?.skillLevel ?? ""
  );
  const [displayTitle, setDisplayTitle] = useState(
    campaign?.creatives?.find((creative) => creative.kind === "display")
      ?.title ?? ""
  );
  const [displayBody, setDisplayBody] = useState(
    campaign?.creatives?.find((creative) => creative.kind === "display")
      ?.body ?? ""
  );
  const [clipId, setClipId] = useState(
    campaign?.creatives?.find((creative) => creative.kind === "preroll")
      ?.videoId ?? ""
  );
  const [error, setError] = useState<string | null>(null);

  const showCardFields = placements === "both" || placements === "display";
  const showClipField = placements === "both" || placements === "preroll";

  const handlePlacements = (next: string) => {
    if (next === "both" || next === "display" || next === "preroll") {
      setPlacements(next);
    }
  };

  const handleSubmit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    const result = buildCampaignPayload({
      city,
      clipId,
      dailyBudget,
      displayBody,
      displayTitle,
      endsAt,
      eventId,
      name,
      placements,
      showClipField,
      skillLevel,
      startsAt,
      state,
      totalBudget,
    });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);

    if (isEdit && campaign) {
      updateCampaign.mutate(
        { campaignId: campaign.id, json: result.json },
        {
          onError: (mutationError) => setError(mutationError.message),
          onSuccess: () => {
            toast.success("Campaign updated");
            onClose();
          },
        }
      );
      return;
    }
    createCampaign.mutate(
      { ...result.json, organizationId },
      {
        onError: (mutationError) => setError(mutationError.message),
        onSuccess: () => {
          toast.success(
            "Campaign drafted. Fund it and submit it for review to launch."
          );
          onClose();
        },
      }
    );
  };

  return (
    <dialog
      aria-label={isEdit ? "Edit campaign" : "New campaign"}
      className="fixed inset-0 z-[60] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4"
      open
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        type="button"
      />
      <div className="border-border bg-card relative flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border shadow-xl">
        <div className="border-border flex h-11 shrink-0 items-center justify-between border-b px-4">
          <span className="text-base font-semibold">
            {isEdit ? `Edit ${campaign?.name}` : "New campaign"}
          </span>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <form
          className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4"
          onSubmit={handleSubmit}
        >
          {/* Basics */}
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Basics
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-name">Campaign name</Label>
              <Input
                className="text-base sm:text-sm"
                id="campaign-name"
                onChange={(changeEvent) => setName(changeEvent.target.value)}
                placeholder="Spring Classic promo"
                value={name}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-event">Event to promote</Label>
              <select
                aria-label="Event to promote"
                className="bg-background mt-1 w-full rounded-md border p-2 text-base sm:text-sm"
                id="campaign-event"
                onChange={(changeEvent) => setEventId(changeEvent.target.value)}
                value={eventId}
              >
                <option value="">Select a published event</option>
                {publishedEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ·{" "}
                    {new Date(event.startsAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </option>
                ))}
              </select>
              {publishedEvents.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Publish an event first — campaigns promote live events.
                </p>
              ) : null}
            </div>
          </section>

          {/* Budget & schedule */}
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Budget &amp; schedule
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="campaign-daily">Daily budget ($)</Label>
                <Input
                  className="text-base sm:text-sm"
                  id="campaign-daily"
                  inputMode="decimal"
                  onChange={(changeEvent) =>
                    setDailyBudget(changeEvent.target.value)
                  }
                  value={dailyBudget}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-total">Total budget ($)</Label>
                <Input
                  className="text-base sm:text-sm"
                  id="campaign-total"
                  inputMode="decimal"
                  onChange={(changeEvent) =>
                    setTotalBudget(changeEvent.target.value)
                  }
                  value={totalBudget}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="campaign-starts">Starts</Label>
                <Input
                  className="text-base sm:text-sm"
                  id="campaign-starts"
                  onChange={(changeEvent) =>
                    setStartsAt(changeEvent.target.value)
                  }
                  type="datetime-local"
                  value={startsAt}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-ends">Ends</Label>
                <Input
                  className="text-base sm:text-sm"
                  id="campaign-ends"
                  onChange={(changeEvent) =>
                    setEndsAt(changeEvent.target.value)
                  }
                  type="datetime-local"
                  value={endsAt}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Platform rates: {formatDollars(campaign?.cpmCents ?? 500)} per
              1,000 card impressions ·{" "}
              {formatDollars(campaign?.videoCpmCents ?? 1500)} per 1,000 preroll
              views.
            </p>
          </section>

          {/* Audience */}
          <section className="space-y-3">
            <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
              <Crosshair className="size-3.5" /> Audience
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="campaign-city">City</Label>
                <Input
                  className="text-base sm:text-sm"
                  id="campaign-city"
                  onChange={(changeEvent) => setCity(changeEvent.target.value)}
                  placeholder="Any city"
                  value={city}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-state">State</Label>
                <Input
                  className="text-base sm:text-sm"
                  id="campaign-state"
                  onChange={(changeEvent) => setState(changeEvent.target.value)}
                  placeholder="Any state"
                  value={state}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-skill">Skill level</Label>
              <select
                aria-label="Skill level"
                className="bg-background mt-1 w-full rounded-md border p-2 text-base sm:text-sm"
                id="campaign-skill"
                onChange={(changeEvent) =>
                  setSkillLevel(changeEvent.target.value)
                }
                value={skillLevel}
              >
                <option value="">All skill levels</option>
                {Object.entries(skillLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Placements & creative */}
          <section className="space-y-3">
            <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Placements &amp; creative
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-placements">Placements</Label>
              <select
                aria-label="Ad placements"
                className="bg-background mt-1 w-full rounded-md border p-2 text-base sm:text-sm"
                id="campaign-placements"
                onChange={(changeEvent) =>
                  handlePlacements(changeEvent.target.value)
                }
                value={placements}
              >
                <option value="both">Cards + video prerolls</option>
                <option value="display">Cards only</option>
                <option value="preroll">Video prerolls only</option>
              </select>
            </div>
            {showCardFields ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-title">Card title</Label>
                  <Input
                    className="text-base sm:text-sm"
                    id="campaign-title"
                    maxLength={120}
                    onChange={(changeEvent) =>
                      setDisplayTitle(changeEvent.target.value)
                    }
                    placeholder="Defaults to the campaign name"
                    value={displayTitle}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-body">Card body</Label>
                  <Input
                    className="text-base sm:text-sm"
                    id="campaign-body"
                    maxLength={280}
                    onChange={(changeEvent) =>
                      setDisplayBody(changeEvent.target.value)
                    }
                    placeholder="Optional supporting line"
                    value={displayBody}
                  />
                </div>
              </>
            ) : null}
            {showClipField ? (
              <div className="space-y-1.5">
                <Label htmlFor="campaign-clip">Sponsor clip</Label>
                <select
                  aria-label="Sponsor clip"
                  className="bg-background mt-1 w-full rounded-md border p-2 text-base sm:text-sm"
                  id="campaign-clip"
                  onChange={(changeEvent) =>
                    setClipId(changeEvent.target.value)
                  }
                  value={clipId}
                >
                  <option value="">Select one of your clips</option>
                  {videos.map((video) => (
                    <option key={video.id} value={video.id}>
                      {video.title}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">
                  Public videos 30 seconds or shorter. Skippable preroll on
                  related videos.
                </p>
              </div>
            ) : null}
          </section>

          {error ? (
            <p className="text-destructive text-xs font-medium">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              disabled={pending}
              onClick={onClose}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={pending} size="sm" type="submit">
              {isEdit ? "Save changes" : "Draft campaign"}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// oxlint-disable-next-line complexity -- Detail view renders lifecycle actions per campaign status.
function CampaignDetailDialog({
  campaign,
  events,
  onClose,
  onEdit,
  organizationId,
}: {
  campaign: Campaign;
  events: ManagerEvent[];
  onClose: () => void;
  onEdit: () => void;
  organizationId: string;
}) {
  const campaignAction = useAdCampaignAction(organizationId);
  const topup = useAdTopup();
  const { data: statsData } = useAdStats(campaign.id);
  const [topupAmount, setTopupAmount] = useState("25");

  const promotedEvent = events.find((event) => event.id === campaign.eventId);
  const isEditable = EDITABLE_STATUSES.has(campaign.status);

  const chartDefinition = useMemo(() => {
    // Daily stats are tracked per placement, so a "both" campaign produces
    // two rows per day. Sum them per day or the chart under-reports
    // delivery and draws overlapping bars.
    const impressionsByDay = new Map<string, number>();
    for (const row of statsData?.byDay ?? []) {
      impressionsByDay.set(
        row.day,
        (impressionsByDay.get(row.day) ?? 0) + row.impressions
      );
    }
    const rows = [...impressionsByDay.entries()]
      .toSorted((left, right) => left[0].localeCompare(right[0]))
      .map(([day, impressions]) => ({
        date: day.slice(5),
        impressions,
      }));
    if (rows.length === 0) {
      return null;
    }
    return defineChart({
      marks: [barX(rows, { x: "impressions", y: "date" })],
      scales: {
        x: { axis: { label: "Impressions" }, nice: true, scale: scaleLinear },
        y: { scale: () => scaleBand<string>().padding(0.1) },
      },
    });
  }, [statsData]);

  const runAction = (
    action: "pause" | "resume" | "submit",
    message: string
  ) => {
    campaignAction.mutate(
      { action, id: campaign.id },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => toast.success(message),
      }
    );
  };

  const handleTopup = () => {
    const amountCents = dollars(topupAmount);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      toast.error("Top-up must be at least $1");
      return;
    }
    topup.mutate(
      { amountCents, id: campaign.id },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: (result) => {
          if (result.checkoutUrl) {
            window.location.assign(result.checkoutUrl);
          }
        },
      }
    );
  };

  const remaining = Math.max(0, campaign.fundedCents - campaign.spentCents);
  const targeting = [
    campaign.city,
    campaign.state,
    campaign.skillLevel ? skillLabels[campaign.skillLevel] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <dialog
      aria-label={`Campaign details for ${campaign.name}`}
      className="fixed inset-0 z-[60] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4"
      open
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        type="button"
      />
      <div className="border-border bg-card relative flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border shadow-xl">
        <div className="border-border flex h-11 shrink-0 items-center justify-between border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-semibold">
              {campaign.name}
            </span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                statusStyles[campaign.status]
              )}
            >
              {statusLabels[campaign.status]}
            </span>
          </div>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
          {campaign.status === "rejected" && campaign.rejectionReason ? (
            <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-xs">
              Rejected: {campaign.rejectionReason}
            </p>
          ) : null}

          {/* Totals */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DetailStat
              label="Impressions"
              value={campaign.impressions.toLocaleString()}
            />
            <DetailStat
              label="Clicks"
              value={campaign.clicks.toLocaleString()}
            />
            <DetailStat
              label="CTR"
              value={ctrFor(campaign.clicks, campaign.impressions)}
            />
            <DetailStat
              label="Spent"
              value={formatDollars(campaign.spentCents)}
            />
          </div>

          {/* Budget */}
          <section className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Budget
            </h3>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {formatDollars(campaign.spentCents)} spent
              </span>
              <span className="text-muted-foreground">
                {formatDollars(remaining)} left of{" "}
                {formatDollars(campaign.fundedCents)} funded
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{
                  width: `${
                    campaign.fundedCents > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (campaign.spentCents / campaign.fundedCents) * 100
                          )
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Input
                aria-label="Top-up amount in dollars"
                className="w-24 text-base sm:text-sm"
                inputMode="decimal"
                onChange={(changeEvent) =>
                  setTopupAmount(changeEvent.target.value)
                }
                value={topupAmount}
              />
              <Button
                disabled={topup.isPending}
                onClick={handleTopup}
                size="sm"
                variant="outline"
              >
                <Wallet data-icon="inline-start" /> Add funds
              </Button>
              <span className="text-muted-foreground text-xs">
                Daily budget {formatDollars(campaign.dailyBudgetCents)}
              </span>
            </div>
          </section>

          {/* Delivery */}
          <section className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Delivery
            </h3>
            {chartDefinition ? (
              <Chart
                ariaDescription="Ad impressions per day"
                ariaLabel="Impressions per day"
                aspectRatio={16 / 9}
                definition={chartDefinition}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                {campaign.status === "active"
                  ? "No delivery yet — impressions appear within a day of serving."
                  : "Delivery starts once the campaign is funded, approved, and active."}
              </p>
            )}
          </section>

          {/* Setup summary */}
          <section className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Setup
            </h3>
            <dl className="divide-border divide-y text-sm">
              <DetailRow
                label="Event"
                value={promotedEvent?.name ?? campaign.eventId}
              />
              <DetailRow
                label="Placements"
                value={placementLabels[campaign.placements]}
              />
              <DetailRow
                label="Audience"
                value={targeting || "Everyone on RallyCasts"}
              />
              <DetailRow
                label="Flight"
                value={
                  campaign.startsAt || campaign.endsAt
                    ? `${campaign.startsAt ? new Date(campaign.startsAt).toLocaleDateString() : "—"} → ${campaign.endsAt ? new Date(campaign.endsAt).toLocaleDateString() : "—"}`
                    : "No schedule"
                }
              />
            </dl>
          </section>

          {/* Creatives */}
          {campaign.creatives?.length ? (
            <section className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Creatives
              </h3>
              <div className="space-y-2">
                {campaign.creatives.map((creative) => (
                  <div className="rounded-lg border p-3" key={creative.id}>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          creative.kind === "display"
                            ? "bg-primary/10 text-primary"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        )}
                      >
                        {creative.kind}
                      </span>
                      {creative.title}
                    </p>
                    {creative.body ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {creative.body}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="border-border flex flex-wrap justify-end gap-2 border-t p-4">
          {isEditable ? (
            <>
              <Button onClick={onEdit} size="sm" variant="ghost">
                <Pencil data-icon="inline-start" /> Edit
              </Button>
              <Button
                disabled={campaignAction.isPending}
                onClick={() => runAction("submit", "Submitted for review")}
                size="sm"
              >
                <Rocket data-icon="inline-start" /> Submit for review
              </Button>
            </>
          ) : null}
          {campaign.status === "active" ? (
            <Button
              disabled={campaignAction.isPending}
              onClick={() => runAction("pause", "Campaign paused")}
              size="sm"
              variant="outline"
            >
              <Pause data-icon="inline-start" /> Pause
            </Button>
          ) : null}
          {campaign.status === "paused" ? (
            <Button
              disabled={campaignAction.isPending}
              onClick={() => runAction("resume", "Campaign resumed")}
              size="sm"
            >
              <Play data-icon="inline-start" /> Resume
            </Button>
          ) : null}
          {campaign.status === "pending_approval" ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Check className="text-primary size-3.5" /> Awaiting platform
              review
            </p>
          ) : null}
          {campaign.status === "rejected" ? (
            <p className="text-destructive flex items-center gap-1.5 text-xs">
              <Ban className="size-3.5" /> Edit and resubmit
            </p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right text-xs font-medium">{value}</dd>
    </div>
  );
}
