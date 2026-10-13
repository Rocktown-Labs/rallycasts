import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { HostCategoryData, SetupItem } from "./setup-guide";
import { buildHostCategory } from "./setup-guide";

const STORAGE_KEY_COLLAPSED = "rallycasts.organizer-setup.collapsed";
const EMPTY_EVENTS: unknown[] = [];
const EMPTY_ORGS: NonNullable<HostCategoryData["myOrgs"]> = [];

export interface OrganizerSetupCardProps {
  events?: unknown[];
  firstOrgDetails?: HostCategoryData["firstOrgDetails"];
  organizations?: HostCategoryData["myOrgs"];
}

function ChecklistItemRow({ item }: { item: SetupItem }) {
  const { isComplete } = item;

  return (
    <div
      className={`border-border/60 flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
        isComplete
          ? "bg-muted/20 opacity-80"
          : "bg-card/50 hover:border-primary/40 hover:bg-card"
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {isComplete ? (
          <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 fill-emerald-500/20 text-emerald-500" />
        ) : (
          <Circle className="text-muted-foreground/50 mt-0.5 size-4.5 shrink-0" />
        )}
        <div className="min-w-0">
          <p
            className={`text-xs font-bold ${
              isComplete
                ? "text-muted-foreground line-through"
                : "text-foreground"
            }`}
          >
            {item.title}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      <div className="shrink-0 pl-1">
        {isComplete ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
            Done
          </span>
        ) : (
          <Link to={item.to}>
            <Button
              className="cursor-pointer rounded-lg text-[10px] font-bold"
              size="xs"
              variant="outline"
            >
              {item.actionLabel}
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export function OrganizerSetupCard({
  events = EMPTY_EVENTS,
  firstOrgDetails = null,
  organizations = EMPTY_ORGS,
}: OrganizerSetupCardProps) {
  const hostCategory = useMemo(
    () =>
      buildHostCategory({
        firstOrgDetails,
        myEvents: events,
        myOrgs: organizations,
      }),
    [firstOrgDetails, events, organizations]
  );

  const { items } = hostCategory;
  const completedCount = useMemo(
    () => items.filter((item) => item.isComplete).length,
    [items]
  );
  const totalCount = items.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allComplete = completedCount === totalCount;

  const firstOrg = organizations[0]?.organization;
  const firstOrgSlug = firstOrg?.slug;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_COLLAPSED);
      if (stored !== null) {
        return stored === "true";
      }
      return allComplete;
    } catch {
      return allComplete;
    }
  });

  const handleToggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    try {
      window.localStorage.setItem(
        STORAGE_KEY_COLLAPSED,
        nextVal ? "true" : "false"
      );
    } catch {
      // Ignore storage error
    }
  };

  if (allComplete && isCollapsed) {
    return (
      <Card className="border-border/80 bg-card/60">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <p className="text-foreground text-xs font-bold">
                Organization Hub is 100% configured! 🎉
              </p>
              <p className="text-muted-foreground text-[11px]">
                Your group page is live, verified, and community ready.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {firstOrgSlug ? (
              <Link params={{ slug: firstOrgSlug }} to="/events/hosts/$slug">
                <Button
                  className="rounded-lg text-xs"
                  size="sm"
                  variant="outline"
                >
                  View Group Page
                  <ExternalLink className="size-3.5" />
                </Button>
              </Link>
            ) : null}
            <Button
              aria-label="Expand checklist"
              className="rounded-lg"
              onClick={handleToggleCollapse}
              size="sm"
              variant="ghost"
            >
              Checklist ({completedCount}/{totalCount})
              <ChevronDown className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card/60">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">
                  Organization Launch Checklist
                </CardTitle>
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {completedCount}/{totalCount} complete
                </span>
              </div>
              <CardDescription className="mt-0.5 text-xs">
                Set up your public group page, customize club branding, post
                updates, and host tournament brackets.
              </CardDescription>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {firstOrgSlug ? (
              <Link params={{ slug: firstOrgSlug }} to="/events/hosts/$slug">
                <Button
                  className="rounded-lg text-xs"
                  size="sm"
                  variant="outline"
                >
                  View Group Page
                  <ExternalLink className="size-3.5" />
                </Button>
              </Link>
            ) : null}
            <Button
              aria-label={
                isCollapsed ? "Expand checklist" : "Collapse checklist"
              }
              className="rounded-lg"
              onClick={handleToggleCollapse}
              size="icon-sm"
              variant="ghost"
            >
              {isCollapsed ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-5 pt-2">
          <div className="grid gap-2.5 md:grid-cols-2">
            {items.map((item) => (
              <ChecklistItemRow item={item} key={item.id} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
