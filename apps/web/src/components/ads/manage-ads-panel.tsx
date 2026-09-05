import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { Megaphone } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  useAdCampaignAction,
  useAdCampaigns,
  useAdStats,
  useAdTopup,
  useCreateAdCampaign,
} from "@/lib/hooks/use-ads";
import type { CreateCampaignInput } from "@/lib/hooks/use-ads";

interface OrgEvent {
  id: string;
  name: string;
  status: string;
}

interface OrgVideo {
  durationSeconds?: number | null;
  id: string;
  muxPlaybackId?: string | null;
  status?: string;
  title: string;
  visibility?: string;
}

const cents = (dollars: string) => Math.round(Number(dollars) * 100);

export function ManageAdsPanel({
  events,
  organizationId,
  videos,
}: {
  events: OrgEvent[];
  organizationId: string;
  videos: OrgVideo[];
}) {
  const { data } = useAdCampaigns(organizationId);
  const createCampaign = useCreateAdCampaign(organizationId);
  const campaignAction = useAdCampaignAction(organizationId);
  const topup = useAdTopup();
  const [expandedStats, setExpandedStats] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");
  const [dailyBudget, setDailyBudget] = useState("10");
  const [totalBudget, setTotalBudget] = useState("50");
  const [placements, setPlacements] = useState<"both" | "display" | "preroll">(
    "both"
  );
  const [clipId, setClipId] = useState("");
  const [topupAmount, setTopupAmount] = useState("25");

  const publishedEvents = events.filter((item) => item.status === "published");
  const eligibleClips = videos.filter(
    (item) =>
      item.status === "ready" &&
      item.visibility === "public" &&
      item.muxPlaybackId &&
      (!item.durationSeconds || item.durationSeconds <= 30)
  );

  const handleCreate = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!eventId) {
      toast.error("Pick the tournament to promote.");
      return;
    }
    const creatives: CreateCampaignInput["creatives"] = [
      { kind: "display", title: name || "Promoted tournament" },
    ];
    if (placements !== "display") {
      if (!clipId) {
        toast.error("Pick a sponsor clip (30s or shorter) for prerolls.");
        return;
      }
      creatives.push({
        kind: "preroll",
        title: name || "Promoted tournament",
        videoId: clipId,
      });
    }
    createCampaign.mutate(
      {
        creatives,
        dailyBudgetCents: cents(dailyBudget),
        eventId,
        name: name || "Tournament boost",
        organizationId,
        placements,
        totalBudgetCents: cents(totalBudget),
      },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => {
          toast.success("Campaign drafted. Submit it for review to launch.");
          setName("");
        },
      }
    );
  };

  const handleTopup = (campaignId: string) => {
    topup.mutate(
      { amountCents: cents(topupAmount), id: campaignId },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: (result: { checkoutUrl?: string }) => {
          if (result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
          }
        },
      }
    );
  };

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <Megaphone className="size-4 text-primary" /> Promoted tournaments
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Boosts run as event cards across trending, search, and the home feed,
        plus skippable prerolls on related videos. Billed per thousand views
        from prepaid budget. Campaigns go live after admin review.
      </p>

      <div className="mt-5 grid gap-3">
        {(data?.campaigns ?? []).map((campaign) => (
          <div className="rounded-lg border p-4" key={campaign.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold">{campaign.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {campaign.status} · ${(campaign.spentCents / 100).toFixed(2)}{" "}
                  spent of ${(campaign.fundedCents / 100).toFixed(2)} funded ·{" "}
                  {campaign.placements}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {campaign.status === "draft" ||
                campaign.status === "rejected" ? (
                  <Button
                    onClick={() =>
                      campaignAction.mutate({
                        action: "submit",
                        id: campaign.id,
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Submit for review
                  </Button>
                ) : null}
                {campaign.status === "active" ? (
                  <Button
                    onClick={() =>
                      campaignAction.mutate({
                        action: "pause",
                        id: campaign.id,
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Pause
                  </Button>
                ) : null}
                {campaign.status === "paused" ? (
                  <Button
                    onClick={() =>
                      campaignAction.mutate({
                        action: "resume",
                        id: campaign.id,
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Resume
                  </Button>
                ) : null}
                <Button
                  onClick={() =>
                    setExpandedStats(
                      expandedStats === campaign.id ? null : campaign.id
                    )
                  }
                  size="sm"
                  variant="ghost"
                >
                  {expandedStats === campaign.id ? "Hide stats" : "Stats"}
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                aria-label="Top-up amount in dollars"
                className="w-28"
                inputMode="decimal"
                onChange={(event) => setTopupAmount(event.target.value)}
                placeholder="25"
                value={topupAmount}
              />
              <Button
                disabled={topup.isPending}
                onClick={() => handleTopup(campaign.id)}
                size="sm"
              >
                Add funds
              </Button>
            </div>
            {expandedStats === campaign.id ? (
              <CampaignStats campaignId={campaign.id} />
            ) : null}
          </div>
        ))}
        {(data?.campaigns ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No campaigns yet. Draft your first boost below.
          </p>
        ) : null}
      </div>

      <form className="mt-6 space-y-3 border-t pt-6" onSubmit={handleCreate}>
        <h3 className="font-bold">New boost</h3>
        <Input
          aria-label="Campaign name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Spring Classic boost"
          value={name}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm" htmlFor="ad-event">
            Tournament
            <select
              aria-label="Tournament to promote"
              className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
              id="ad-event"
              onChange={(event) => setEventId(event.target.value)}
              value={eventId}
            >
              <option value="">Select a published tournament</option>
              {publishedEvents.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm" htmlFor="ad-placements">
            Placements
            <select
              aria-label="Ad placements"
              className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
              id="ad-placements"
              onChange={(event) =>
                setPlacements(
                  event.target.value as "both" | "display" | "preroll"
                )
              }
              value={placements}
            >
              <option value="both">Cards + video prerolls</option>
              <option value="display">Cards only</option>
              <option value="preroll">Video prerolls only</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm" htmlFor="ad-daily-budget">
            Daily budget ($)
            <Input
              id="ad-daily-budget"
              inputMode="decimal"
              onChange={(event) => setDailyBudget(event.target.value)}
              value={dailyBudget}
            />
          </label>
          <label className="text-sm" htmlFor="ad-total-budget">
            Total budget ($)
            <Input
              id="ad-total-budget"
              inputMode="decimal"
              onChange={(event) => setTotalBudget(event.target.value)}
              value={totalBudget}
            />
          </label>
        </div>
        {placements === "display" ? null : (
          <div className="space-y-1">
            <span className="text-sm">
              Sponsor clip (your public video, 30s or shorter)
            </span>
            <select
              aria-label="Sponsor clip"
              className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
              id="ad-clip"
              onChange={(event) => setClipId(event.target.value)}
              value={clipId}
            >
              <option value="">Select a clip</option>
              {eligibleClips.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button disabled={createCampaign.isPending} type="submit">
          Draft campaign
        </Button>
      </form>
    </div>
  );
}

function CampaignStats({ campaignId }: { campaignId: string }) {
  const { data } = useAdStats(campaignId);
  if (!data) {
    return <p className="mt-3 text-xs text-muted-foreground">Loading stats…</p>;
  }
  return (
    <div className="mt-3 text-xs text-muted-foreground">
      <p>
        {data.totals.impressions} impressions · {data.totals.clicks} clicks · $
        {(data.totals.spentCents / 100).toFixed(2)} spent
      </p>
    </div>
  );
}
