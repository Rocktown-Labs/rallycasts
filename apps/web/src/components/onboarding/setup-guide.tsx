import { Button } from "@rallycaststv/ui/components/button";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Maximize2,
  Minimize2,
  Sparkles,
  User,
  Video,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useMyEvents } from "@/lib/hooks/use-events";
import { useMyOrganizations } from "@/lib/hooks/use-organizations";
import { useProfile } from "@/lib/hooks/use-profile";
import { useMyVideos } from "@/lib/hooks/use-videos";

interface SetupItem {
  actionLabel: string;
  description: string;
  id: string;
  isComplete: boolean;
  title: string;
  to: string;
}

interface SetupCategory {
  description: string;
  icon: typeof User;
  id: string;
  items: SetupItem[];
  title: string;
}

const STORAGE_KEY_MINIMIZED = "rallycasts.setup-guide.minimized";
const STORAGE_KEY_DISMISSED = "rallycasts.setup-guide.dismissed";

function buildPlayerCategory(
  user: { name: string; username?: string | null },
  profile: unknown
): SetupCategory {
  const isProfileComplete = profile && typeof profile === "object";
  const hasCourt = Boolean(
    isProfileComplete &&
    (("homeCourtName" in profile && profile.homeCourtName) ||
      ("homeCity" in profile && profile.homeCity))
  );
  const hasRating = Boolean(
    isProfileComplete && "skillLevel" in profile && profile.skillLevel
  );

  return {
    description: "Get your player identity and home court ready.",
    icon: User,
    id: "player",
    items: [
      {
        actionLabel: "Edit Profile",
        description: "Your display name, unique handle, and profile picture.",
        id: "player_info",
        isComplete: Boolean(user.name && user.username),
        title: "Set up profile & handle",
        to: "/u/settings",
      },
      {
        actionLabel: "Set Court",
        description: "Where you play, used to discover local matches.",
        id: "player_court",
        isComplete: hasCourt,
        title: "Select home court & location",
        to: "/u/settings",
      },
      {
        actionLabel: "Set Rating",
        description: "Self-assessed or DUPR rating (beginner to pro).",
        id: "player_rating",
        isComplete: hasRating,
        title: "Choose skill rating & paddle",
        to: "/u/settings",
      },
    ],
    title: "Player Profile",
  };
}

function buildHostCategory(
  myOrgs: {
    organization: {
      bio?: string | null;
      logoUrl?: string | null;
      slug: string;
    };
  }[],
  myEvents: unknown[]
): SetupCategory {
  const firstOrg = myOrgs[0]?.organization;
  const orgManageUrl = firstOrg
    ? `/events/hosts/${firstOrg.slug}/manage`
    : "/events/hosts/new";

  const hasBranding = Boolean(
    myOrgs.some((o) => o.organization.bio || o.organization.logoUrl)
  );

  return {
    description: "Set up your club identity and host tournament brackets.",
    icon: Building2,
    id: "host",
    items: [
      {
        actionLabel: "Create Org",
        description: "A public host profile to organize tournaments.",
        id: "org_create",
        isComplete: myOrgs.length > 0,
        title: "Create an organization",
        to: "/events/hosts/new",
      },
      {
        actionLabel: "Branding",
        description: "Add a logo, bio, and city for your club or series.",
        id: "org_branding",
        isComplete: hasBranding,
        title: "Customize organization & logo",
        to: orgManageUrl,
      },
      {
        actionLabel: "New Tournament",
        description: "Publish a bracket with seeds, dates, and courts.",
        id: "org_tournament",
        isComplete: myEvents.length > 0,
        title: "Host your first tournament",
        to: orgManageUrl,
      },
    ],
    title: "Host & Organization",
  };
}

function buildCasterCategory(myVideos: unknown[]): SetupCategory {
  const hasVideos = myVideos.length > 0;

  return {
    description: "Stream matches and broadcast with live commentary.",
    icon: Video,
    id: "caster",
    items: [
      {
        actionLabel: "Open Studio",
        description: "Access recording tools, stream keys, and clipper.",
        id: "caster_studio",
        isComplete: true,
        title: "Open RallyCasts Studio",
        to: "/u/studio",
      },
      {
        actionLabel: "Studio Setup",
        description: "Connect camera, OBS, or mobile court feed.",
        id: "caster_camera",
        isComplete: hasVideos,
        title: "Configure stream key & camera",
        to: "/u/studio",
      },
      {
        actionLabel: "Upload / Stream",
        description: "Upload match footage or broadcast a live match.",
        id: "caster_match",
        isComplete: hasVideos,
        title: "Record or stream your first match",
        to: "/u/studio",
      },
    ],
    title: "Caster & Streaming",
  };
}

function getIsRoleActive(
  profile: unknown,
  roleKey: "isOrganizer" | "isCaster"
) {
  if (!profile || typeof profile !== "object") {
    return false;
  }
  return Boolean((profile as Record<string, unknown>)[roleKey]);
}

export function SetupGuide() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const { data: profileData } = useProfile();
  const user = profileData?.user;
  const profile = profileData?.profile;

  const { data: orgsData } = useMyOrganizations(Boolean(user));
  const { data: eventsData } = useMyEvents();
  const { data: videosData } = useMyVideos();

  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY_MINIMIZED) === "true";
    } catch {
      return false;
    }
  });

  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY_DISMISSED) === "true";
    } catch {
      return false;
    }
  });

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    null
  );

  const categories = useMemo((): SetupCategory[] => {
    if (!user) {
      return [];
    }

    const myOrgs = orgsData?.organizations ?? [];
    const myEvents = eventsData?.events ?? [];
    const myVideos = videosData?.videos ?? [];

    const showHost =
      myOrgs.length > 0 || getIsRoleActive(profile, "isOrganizer");
    const showCaster =
      myVideos.length > 0 || getIsRoleActive(profile, "isCaster");

    const result: SetupCategory[] = [buildPlayerCategory(user, profile)];
    if (showHost) {
      result.push(buildHostCategory(myOrgs, myEvents));
    }
    if (showCaster) {
      result.push(buildCasterCategory(myVideos));
    }

    return result;
  }, [user, profile, orgsData, eventsData, videosData]);

  const allItems = useMemo(
    () => categories.flatMap((cat) => cat.items),
    [categories]
  );

  const completedCount = useMemo(
    () => allItems.filter((i) => i.isComplete).length,
    [allItems]
  );

  const totalCount = allItems.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const nextPendingItem = useMemo(
    () => allItems.find((i) => !i.isComplete) ?? null,
    [allItems]
  );

  if (
    !user ||
    !currentPath.startsWith("/u") ||
    currentPath === "/onboarding" ||
    totalCount === 0
  ) {
    return null;
  }

  const handleToggleMinimize = () => {
    const nextVal = !isMinimized;
    setIsMinimized(nextVal);
    try {
      window.localStorage.setItem(
        STORAGE_KEY_MINIMIZED,
        nextVal ? "true" : "false"
      );
    } catch {
      // Ignore storage error
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY_DISMISSED, "true");
    } catch {
      // Ignore storage error
    }
  };

  const handleReopen = () => {
    setIsDismissed(false);
    setIsMinimized(false);
    try {
      window.localStorage.setItem(STORAGE_KEY_DISMISSED, "false");
      window.localStorage.setItem(STORAGE_KEY_MINIMIZED, "false");
    } catch {
      // Ignore storage error
    }
  };

  if (isDismissed) {
    return (
      <SetupGuidePill
        completedCount={completedCount}
        onReopen={handleReopen}
        totalCount={totalCount}
      />
    );
  }

  if (isMinimized) {
    return (
      <SetupGuideMinimized
        nextPendingItem={nextPendingItem}
        onDismiss={handleDismiss}
        onToggleMinimize={handleToggleMinimize}
        progressPercent={progressPercent}
      />
    );
  }

  return (
    <SetupGuideExpanded
      categories={categories}
      completedCount={completedCount}
      expandedCategoryId={expandedCategoryId}
      nextPendingItem={nextPendingItem}
      onDismiss={handleDismiss}
      onToggleCategory={(id) =>
        setExpandedCategoryId((prev) => (prev === id ? "none" : id))
      }
      onToggleMinimize={handleToggleMinimize}
      progressPercent={progressPercent}
      totalCount={totalCount}
    />
  );
}

function SetupGuidePill({
  completedCount,
  onReopen,
  totalCount,
}: {
  completedCount: number;
  onReopen: () => void;
  totalCount: number;
}) {
  return (
    <button
      aria-label="Reopen setup guide"
      className="border-border/80 bg-card/95 text-foreground hover:border-primary/50 hover:shadow-primary/10 fixed right-4 bottom-20 z-50 flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold shadow-2xl backdrop-blur-md transition-all active:scale-95"
      onClick={onReopen}
      type="button"
    >
      <Sparkles className="text-primary size-4 animate-pulse" />
      <span>
        Setup Guide ({completedCount}/{totalCount})
      </span>
    </button>
  );
}

function SetupGuideMinimized({
  nextPendingItem,
  onDismiss,
  onToggleMinimize,
  progressPercent,
}: {
  nextPendingItem: SetupItem | null;
  onDismiss: () => void;
  onToggleMinimize: () => void;
  progressPercent: number;
}) {
  return (
    <div className="border-border/80 bg-card/95 animate-in fade-in slide-in-from-bottom-2 fixed right-4 bottom-20 z-50 w-80 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md duration-200 sm:w-88">
      <div className="bg-muted h-1 w-full overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 p-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-xs font-extrabold">
              Setup guide
            </span>
            <span className="bg-primary/10 py-0.2 text-primary rounded-full px-2 text-[10px] font-bold">
              {progressPercent}%
            </span>
          </div>
          {nextPendingItem ? (
            <Link
              className="text-primary mt-0.5 block truncate text-[11px] font-semibold hover:underline"
              to={nextPendingItem.to}
            >
              Next: {nextPendingItem.title}
            </Link>
          ) : (
            <p className="mt-0.5 text-[11px] font-bold text-emerald-500">
              All setup completed! 🎉
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            className="text-muted-foreground hover:text-foreground px-1.5 py-1 text-[11px] font-medium"
            to="/u/settings"
          >
            Edit
          </Link>
          <button
            aria-label="Expand setup guide"
            className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-md p-1.5 transition-colors"
            onClick={onToggleMinimize}
            type="button"
          >
            <Maximize2 className="size-3.5" />
          </button>
          <button
            aria-label="Close setup guide"
            className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-md p-1.5 transition-colors"
            onClick={onDismiss}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupGuideExpanded({
  categories,
  completedCount,
  expandedCategoryId,
  nextPendingItem,
  onDismiss,
  onToggleCategory,
  onToggleMinimize,
  progressPercent,
  totalCount,
}: {
  categories: SetupCategory[];
  completedCount: number;
  expandedCategoryId: string | null;
  nextPendingItem: SetupItem | null;
  onDismiss: () => void;
  onToggleCategory: (id: string) => void;
  onToggleMinimize: () => void;
  progressPercent: number;
  totalCount: number;
}) {
  return (
    <div className="border-border/80 bg-card/95 animate-in fade-in slide-in-from-bottom-3 fixed right-4 bottom-20 z-50 w-88 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md duration-200 sm:w-96">
      <div className="bg-muted h-1 w-full overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="border-border/60 flex items-center justify-between border-b p-4 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-foreground text-sm font-extrabold">
              Setup guide
            </h3>
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold">
              {completedCount}/{totalCount} complete
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 max-w-[220px] truncate text-[11px]">
            {nextPendingItem
              ? `Next: ${nextPendingItem.title}`
              : "Everything is set up and ready to go!"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            className="text-primary px-1.5 py-1 text-xs font-semibold hover:underline"
            to="/u/settings"
          >
            Edit
          </Link>
          <button
            aria-label="Minimize setup guide"
            className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-md p-1.5 transition-colors"
            onClick={onToggleMinimize}
            type="button"
          >
            <Minimize2 className="size-3.5" />
          </button>
          <button
            aria-label="Close setup guide"
            className="text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-md p-1.5 transition-colors"
            onClick={onDismiss}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="divide-border/40 max-h-96 divide-y overflow-y-auto p-2">
        {categories.map((category) => (
          <SetupCategoryAccordion
            category={category}
            isExpanded={
              expandedCategoryId === category.id ||
              (!expandedCategoryId && category.items.some((i) => !i.isComplete))
            }
            key={category.id}
            onToggle={() => onToggleCategory(category.id)}
          />
        ))}
      </div>

      <div className="border-border/60 bg-muted/20 flex items-center justify-between border-t px-4 py-2.5 text-[11px]">
        <Link
          className="text-muted-foreground hover:text-foreground font-medium"
          to="/u/settings"
        >
          Manage Roles & Profile
        </Link>
        <button
          className="text-muted-foreground hover:text-foreground cursor-pointer font-medium"
          onClick={onDismiss}
          type="button"
        >
          Dismiss guide
        </button>
      </div>
    </div>
  );
}

function SetupCategoryAccordion({
  category,
  isExpanded,
  onToggle,
}: {
  category: SetupCategory;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const CategoryIcon = category.icon;
  const catCompleted = category.items.filter((i) => i.isComplete).length;
  const catTotal = category.items.length;
  const isCategoryComplete = catCompleted === catTotal;

  return (
    <div className="px-1 py-2">
      <button
        className="group flex w-full cursor-pointer items-center justify-between gap-2 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-primary/10 text-primary shrink-0 rounded-lg p-1.5">
            <CategoryIcon className="size-3.5" />
          </div>
          <div>
            <p className="text-foreground group-hover:text-primary text-xs font-bold transition-colors">
              {category.title}
            </p>
            <p className="text-muted-foreground text-[10px]">
              {catCompleted}/{catTotal} completed
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isCategoryComplete && (
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500">
              Ready
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="text-muted-foreground size-3.5" />
          ) : (
            <ChevronDown className="text-muted-foreground size-3.5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-primary/20 mt-2 ml-3 space-y-1.5 border-l-2 pl-3">
          {category.items.map((item) => (
            <div
              className="flex items-center justify-between gap-2 py-1.5"
              key={item.id}
            >
              <div className="flex min-w-0 items-start gap-2">
                {item.isComplete ? (
                  <CheckCircle2 className="text-primary fill-primary/20 mt-0.5 size-4 shrink-0" />
                ) : (
                  <Circle className="text-muted-foreground/50 mt-0.5 size-4 shrink-0" />
                )}
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-semibold ${
                      item.isComplete
                        ? "text-muted-foreground decoration-muted-foreground/40 line-through"
                        : "text-foreground"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-muted-foreground line-clamp-1 text-[10px]">
                    {item.description}
                  </p>
                </div>
              </div>

              {!item.isComplete && (
                <Link className="shrink-0" to={item.to}>
                  <Button
                    className="h-6 cursor-pointer rounded-md px-2 text-[10px] font-bold"
                    size="xs"
                    variant="outline"
                  >
                    {item.actionLabel}
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
