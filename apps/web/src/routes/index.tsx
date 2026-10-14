import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  MapPin,
  MessageSquare,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useSidebar } from "@/components/layout/sidebar-context";
import {
  EventCard,
  ParkHeatCard,
  PlayerCard,
  RallyClipCard,
  VideoCard,
} from "@/components/rally/cards";
import type {
  EventCardData,
  PlayerCardData,
  VenueCardData,
  VideoCardData,
} from "@/components/rally/cards";
import { authClient } from "@/lib/auth-client";
import { demoEnabled, demoVideos } from "@/lib/demo-data";
import {
  useHomeFeed,
  useInfiniteVideos,
  useProfile,
  useTrending,
  useVideos,
} from "@/lib/hooks";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const HOME_TABS = [
  { id: "all", label: "All" },
  { id: "matches", label: "Matches" },
  { id: "highlights", label: "Highlights" },
  { id: "courts", label: "Courts & Parks" },
  { id: "tournaments", label: "Tournaments" },
  { id: "community", label: "Community" },
] as const;

type HomeTabId = (typeof HOME_TABS)[number]["id"];

function LocationPill() {
  const { data: profileData } = useProfile();
  const profile = profileData?.profile as
    | { homeCity?: string; homeState?: string }
    | undefined;
  const homeLabel =
    profile?.homeCity && profile.homeState
      ? `${profile.homeCity}, ${profile.homeState}`
      : (profile?.homeCity ?? null);

  return (
    <Link
      to="/trending"
      title="View trending courts near you"
      className="bg-card hover:bg-accent border-border/80 text-foreground hover:border-primary/50 group inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all duration-150 active:scale-97"
    >
      <MapPin className="text-primary size-3.5 shrink-0 transition-transform group-hover:scale-110" />
      <span className="max-w-[130px] truncate sm:max-w-[180px]">
        {homeLabel ?? "Set location"}
      </span>
      <ChevronRight className="text-muted-foreground size-3 shrink-0" />
    </Link>
  );
}

function HomeTabsBar({
  activeTab,
  onSelectTab,
  showLocationPill,
}: {
  activeTab: HomeTabId;
  onSelectTab: (tab: HomeTabId) => void;
  showLocationPill: boolean;
}) {
  return (
    <div className="bg-background/95 border-border/40 sticky top-(--header-height) z-20 -mx-4 -mt-2 mb-6 border-b px-4 py-2.5 backdrop-blur-md md:-mx-8 md:px-8">
      <div className="flex scrollbar-none items-center gap-2 overflow-x-auto py-0.5">
        {showLocationPill && (
          <>
            <LocationPill />
            <div className="bg-border/70 mx-1 h-5 w-px shrink-0" />
          </>
        )}

        {HOME_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                "shrink-0 cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 select-none",
                isActive
                  ? "bg-foreground text-background hover:bg-foreground/90 font-bold shadow-xs"
                  : "bg-muted/70 text-foreground/80 hover:bg-muted hover:text-foreground active:scale-97"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HomeComponent() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isPersonalized = Boolean(session?.user);

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-6 duration-200">
      {!isPersonalized && <HeroBanner />}

      <HomeFeedView
        isPersonalized={isPersonalized}
        sessionPending={sessionPending}
      />
    </div>
  );
}

function HeroLocationButton() {
  const { data: profileData } = useProfile();
  const profile = profileData?.profile as
    | { homeCity?: string; homeState?: string }
    | undefined;
  const homeLabel =
    profile?.homeCity && profile.homeState
      ? `${profile.homeCity}, ${profile.homeState}`
      : (profile?.homeCity ?? null);

  return (
    <Link
      to="/trending"
      className={cn(
        buttonVariants({ variant: "outline" }),
        "cursor-pointer rounded-lg border-white/25 bg-transparent text-white transition-transform duration-150 hover:bg-white/10 hover:text-white active:scale-97"
      )}
    >
      <MapPin className="size-4 text-[#bcdf21]" />
      {homeLabel ?? "Set location"}
    </Link>
  );
}

function HeroBanner() {
  return (
    <section className="bg-primary relative overflow-hidden rounded-2xl p-6 text-white shadow-xl sm:p-8">
      <div className="relative z-10 max-w-2xl space-y-2">
        <div className="bg-secondary/20 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
          <span>Pickleball around your courts</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
          Pickleball videos, players, and casters around you.
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-gray-200 sm:text-base">
          Watch local match highlights, find active parks, and book a RallyCasts
          caster when the game deserves a clean angle.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/trending"
            className={cn(
              buttonVariants(),
              "rounded-lg bg-[#bcdf21] font-semibold text-black hover:bg-[#d3f34b]"
            )}
          >
            <Flame className="size-4" />
            Trending Courts
          </Link>
          <HeroLocationButton />
        </div>
      </div>
    </section>
  );
}

const isShortVideo = (video: VideoCardData): boolean =>
  video.mediaType === "short" ||
  ((video.durationSeconds ?? 0) > 0 &&
    (video.durationSeconds ?? 0) <= 60 &&
    video.title.toLowerCase().includes("clip"));

type FeedItem = NonNullable<
  ReturnType<typeof useHomeFeed>["data"]
>["items"][number];

function useAggregatedVideos(
  rawFeedItems: FeedItem[],
  latestVideos: VideoCardData[] = []
): VideoCardData[] {
  return useMemo(() => {
    const list: VideoCardData[] = [];
    const seen = new Set<string>();

    for (const item of rawFeedItems) {
      if (item.entityType === "video") {
        const v = item.entity as VideoCardData;
        if (!seen.has(v.id)) {
          seen.add(v.id);
          list.push(v);
        }
      }
    }

    for (const v of latestVideos) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        list.push(v);
      }
    }

    // Demo content keeps fresh preview environments from looking broken.
    // Production builds ship without VITE_DEMO_DATA, so this never runs there.
    if (list.length === 0 && demoEnabled) {
      for (const v of demoVideos) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          list.push(v);
        }
      }
    }

    return list;
  }, [rawFeedItems, latestVideos]);
}

function useVenuesList(
  rawFeedItems: FeedItem[],
  trendingVenues: VenueCardData[] = [],
  userHomeCourt?: string | null
): VenueCardData[] {
  return useMemo(() => {
    const list: VenueCardData[] = [];
    const seen = new Set<string>();

    for (const item of rawFeedItems) {
      if (item.entityType === "venue") {
        const v = item.entity as unknown as VenueCardData;
        if (!seen.has(v.id)) {
          seen.add(v.id);
          list.push(v);
        }
      }
    }

    for (const v of trendingVenues) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        list.push(v);
      }
    }

    const homeCourtName = userHomeCourt?.toLowerCase().trim();
    if (homeCourtName) {
      for (const v of list) {
        if (
          v.name.toLowerCase().includes(homeCourtName) ||
          homeCourtName.includes(v.name.toLowerCase())
        ) {
          v.isHomeCourt = true;
          v.isFavorited = true;
        }
      }
    }

    return list.toSorted((a, b) => {
      if (a.isHomeCourt && !b.isHomeCourt) {
        return -1;
      }
      if (!a.isHomeCourt && b.isHomeCourt) {
        return 1;
      }
      return (b.activePlayers ?? 0) - (a.activePlayers ?? 0);
    });
  }, [rawFeedItems, trendingVenues, userHomeCourt]);
}

function getTabVisibility({
  activeTab,
  hasCommunity,
  hasFeatured,
  hasHighlights,
  hasTournaments,
  hasVenues,
}: {
  activeTab: HomeTabId;
  hasCommunity: boolean;
  hasFeatured: boolean;
  hasHighlights: boolean;
  hasTournaments: boolean;
  hasVenues: boolean;
}) {
  const showAll = activeTab === "all";
  const tabShows = (tab: Exclude<HomeTabId, "all">): boolean =>
    showAll || activeTab === tab;

  const showFeaturedMatches = tabShows("matches") && hasFeatured;
  const showHighlights = tabShows("highlights") && hasHighlights;
  const showMoreMatches = tabShows("matches");
  const showVenues = tabShows("courts") && hasVenues;
  const showTournaments = tabShows("tournaments") && hasTournaments;
  const showCommunity = tabShows("community") && hasCommunity;

  const hasContentForTab: Record<Exclude<HomeTabId, "all">, boolean> = {
    community: showCommunity,
    courts: showVenues,
    highlights: showHighlights,
    matches: showFeaturedMatches || showMoreMatches,
    tournaments: showTournaments,
  };
  const isFilteredEmpty = !showAll && !hasContentForTab[activeTab];

  return {
    isFilteredEmpty,
    showCommunity,
    showFeaturedMatches,
    showHighlights,
    showMoreMatches,
    showTournaments,
    showVenues,
  };
}

function HomeEmptyFilterState({
  activeTab,
  onReset,
}: {
  activeTab: HomeTabId;
  onReset: () => void;
}) {
  const tabLabel =
    HOME_TABS.find((t) => t.id === activeTab)?.label ?? "this category";
  return (
    <div className="bg-card/40 border-border/80 rounded-2xl border border-dashed p-12 text-center">
      <p className="text-muted-foreground text-sm font-medium">
        No items found under {tabLabel}.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 cursor-pointer"
        onClick={onReset}
      >
        View All
      </Button>
    </div>
  );
}

function FeaturedMatchesShelf({
  videoGridClass,
  videos,
}: {
  videoGridClass: string;
  videos: VideoCardData[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
          Featured Matches
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Recent rallies, matches, and clinics recorded with RallyCasts.
        </p>
      </div>
      <div className={videoGridClass}>
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}

function TournamentsSection({ items }: { items: FeedItem[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
            Tournaments & Court Activity
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Upcoming tournaments, brackets, and open play sessions.
          </p>
        </div>
        <Link
          className="text-primary hover:text-primary/80 hidden text-xs font-semibold sm:inline"
          to="/events"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) =>
          item.entityType === "event" ? (
            <EventCard
              event={item.entity as unknown as EventCardData}
              key={`${item.entityType}:${item.id}`}
            />
          ) : null
        )}
      </div>
    </section>
  );
}

function CommunityFeedSection({ items }: { items: FeedItem[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
            Court Activity & Tournaments
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Upcoming open plays, tournament brackets, and player updates.
          </p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <HomeFeedCard key={`${item.entityType}:${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function HomeFeedSections({
  communityItems,
  featuredLandscape,
  fetchNextPage,
  hasNextPage,
  highlightsVideos,
  isFetchingNextPage,
  moreMatches,
  tournamentItems,
  venuesList,
  videoGridClass,
  visibility,
}: {
  communityItems: FeedItem[];
  featuredLandscape: VideoCardData[];
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  highlightsVideos: VideoCardData[];
  isFetchingNextPage: boolean;
  moreMatches: VideoCardData[];
  tournamentItems: FeedItem[];
  venuesList: VenueCardData[];
  videoGridClass: string;
  visibility: ReturnType<typeof getTabVisibility>;
}) {
  return (
    <>
      {visibility.showFeaturedMatches ? (
        <FeaturedMatchesShelf
          videoGridClass={videoGridClass}
          videos={featuredLandscape}
        />
      ) : null}

      {visibility.showHighlights ? (
        <ShortsShelf videos={highlightsVideos} />
      ) : null}

      {visibility.showMoreMatches ? (
        <MoreMatchesSection
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          videoGridClass={videoGridClass}
          videos={moreMatches}
        />
      ) : null}

      {visibility.showVenues ? (
        <NearbyParksSection venues={venuesList} />
      ) : null}

      {visibility.showTournaments ? (
        <TournamentsSection items={tournamentItems} />
      ) : null}

      {visibility.showCommunity ? (
        <CommunityFeedSection items={communityItems} />
      ) : null}
    </>
  );
}

function HomeFeedView({
  isPersonalized,
  sessionPending,
}: {
  isPersonalized: boolean;
  sessionPending: boolean;
}) {
  const homeFeed = useHomeFeed(isPersonalized);
  const latestVideosQuery = useVideos();
  const trendingQuery = useTrending();
  const profileQuery = useProfile();

  const isLoading =
    sessionPending ||
    (isPersonalized && homeFeed.isLoading) ||
    latestVideosQuery.isLoading;

  const rawFeedItems = useMemo(
    () => (isPersonalized ? (homeFeed.data?.items ?? []) : []),
    [isPersonalized, homeFeed.data?.items]
  );
  const allVideos = useAggregatedVideos(
    rawFeedItems,
    latestVideosQuery.data?.videos
  );

  // Split into Highlights (vertical clips) vs landscape videos
  const { landscapeVideos, shortsVideos } = useMemo(() => {
    const shorts: VideoCardData[] = [];
    const landscape: VideoCardData[] = [];

    for (const video of allVideos) {
      if (isShortVideo(video)) {
        shorts.push(video);
      } else {
        landscape.push(video);
      }
    }

    return { landscapeVideos: landscape, shortsVideos: shorts };
  }, [allVideos]);

  // Infinite "More Matches" feed: extra pages load as the visitor scrolls.
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteVideos(12);

  const infiniteSplit = useMemo(() => {
    const seen = new Set<string>();
    const landscape: VideoCardData[] = [];
    const shorts: VideoCardData[] = [];
    for (const page of infiniteData?.pages ?? []) {
      for (const video of page.videos) {
        if (seen.has(video.id)) {
          continue;
        }
        seen.add(video.id);
        if (isShortVideo(video)) {
          shorts.push(video);
        } else {
          landscape.push(video);
        }
      }
    }
    return { landscape, shorts };
  }, [infiniteData?.pages]);

  // Aggregate venues ensuring user's home court is first and favorited
  const userProfile = profileQuery.data?.profile;
  const userHomeCourt =
    userProfile && "homeCourtName" in userProfile
      ? (userProfile as { homeCourtName?: string | null }).homeCourtName
      : undefined;

  const venuesList = useVenuesList(
    rawFeedItems,
    trendingQuery.data?.venues,
    userHomeCourt
  );

  // Community feed items (Events, Players, Posts)
  const communityItems = useMemo(
    () =>
      rawFeedItems.filter(
        (item) => item.entityType !== "video" && item.entityType !== "venue"
      ),
    [rawFeedItems]
  );

  // Tournaments tab shows only upcoming events, not the mixed feed.
  const tournamentItems = useMemo(
    () => communityItems.filter((item) => item.entityType === "event"),
    [communityItems]
  );

  // Called before any early return: the loading skeleton below must not
  // change the hook count between renders, or React throws.
  const { collapsed: sidebarCollapsed } = useSidebar();
  const [activeTab, setActiveTab] = useState<HomeTabId>("all");

  if (isLoading) {
    return (
      <FeedSectionShell isLoading={true} title="Featured Matches">
        <FeedSkeleton />
      </FeedSectionShell>
    );
  }

  const videoGridClass = sidebarCollapsed
    ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

  const featuredLandscape = landscapeVideos.slice(0, sidebarCollapsed ? 8 : 6);
  const featuredIds = new Set(featuredLandscape.map((video) => video.id));
  const shortIds = new Set(shortsVideos.map((video) => video.id));
  const highlightsVideos = [
    ...shortsVideos,
    ...infiniteSplit.shorts.filter((video) => !shortIds.has(video.id)),
  ];
  // "More" is fed purely by the paginated query: rows reveal as you scroll.
  const moreMatches = infiniteSplit.landscape.filter(
    (video) => !featuredIds.has(video.id)
  );

  const visibility = getTabVisibility({
    activeTab,
    hasCommunity: communityItems.length > 0,
    hasFeatured: featuredLandscape.length > 0,
    hasHighlights: highlightsVideos.length > 0,
    hasTournaments: tournamentItems.length > 0,
    hasVenues: venuesList.length > 0,
  });

  return (
    <div className="space-y-8">
      {/* YouTube-style sticky category chips with Location pill */}
      <HomeTabsBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        showLocationPill={isPersonalized}
      />

      {visibility.isFilteredEmpty ? (
        <HomeEmptyFilterState
          activeTab={activeTab}
          onReset={() => setActiveTab("all")}
        />
      ) : null}

      <HomeFeedSections
        communityItems={communityItems}
        featuredLandscape={featuredLandscape}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        highlightsVideos={highlightsVideos}
        isFetchingNextPage={isFetchingNextPage}
        moreMatches={moreMatches}
        tournamentItems={tournamentItems}
        venuesList={venuesList}
        videoGridClass={videoGridClass}
        visibility={visibility}
      />
    </div>
  );
}

const MORE_PAGE_SIZE = 9;

function MoreMatchesSection({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  videoGridClass,
  videos,
}: {
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  videoGridClass: string;
  videos: VideoCardData[];
}) {
  const [visibleCount, setVisibleCount] = useState(MORE_PAGE_SIZE);

  const visibleVideos = videos.slice(0, visibleCount);
  const hiddenCount = videos.length - visibleCount;
  const showLoadMore = hasNextPage || hiddenCount > 0;

  const handleLoadMore = () => {
    setVisibleCount((previous) => previous + MORE_PAGE_SIZE);
    // Top up the buffer so the button always has another batch ready.
    if (hiddenCount <= MORE_PAGE_SIZE && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  if (videos.length === 0 && !hasNextPage) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
          More Matches & Highlights
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Community open play recordings, kitchen battles, and clinics.
        </p>
      </div>
      {visibleVideos.length > 0 ? (
        <div className={videoGridClass}>
          {visibleVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <FeedSkeleton />
      )}
      {showLoadMore ? (
        <div className="flex justify-center pt-2">
          <Button
            className="cursor-pointer gap-1.5 rounded-lg font-semibold"
            disabled={isFetchingNextPage}
            onClick={handleLoadMore}
            variant="outline"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function ShortsShelf({ videos }: { videos: VideoCardData[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scrollByAmount = (offset: number) => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollBy({ behavior: "smooth", left: offset });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <span className="flex size-7 items-center justify-center rounded-lg bg-red-600/15 text-red-500">
              <Flame className="size-4.5 fill-red-500" />
            </span>
            Highlights
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Bite-sized points, kitchen battles, and clutch shots from the
            courts.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer rounded-full transition-transform active:scale-95 disabled:opacity-30"
            disabled={!canScrollLeft}
            onClick={() => scrollByAmount(-280)}
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer rounded-full transition-transform active:scale-95 disabled:opacity-30"
            disabled={!canScrollRight}
            onClick={() => scrollByAmount(280)}
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-4 flex touch-pan-y snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto scroll-smooth px-4 pt-1 pb-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {videos.map((video) => (
          <RallyClipCard key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}

function NearbyParksSection({ venues }: { venues: VenueCardData[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scrollByAmount = (offset: number) => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollBy({ behavior: "smooth", left: offset });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <MapPin className="text-primary size-5" />
            Parks near you
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Courts with active heat, open play sessions, and checked-in players.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <Button
              variant="outline"
              size="icon"
              className="size-8 cursor-pointer rounded-full transition-transform active:scale-95 disabled:opacity-30"
              disabled={!canScrollLeft}
              onClick={() => scrollByAmount(-340)}
              aria-label="Scroll left"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 cursor-pointer rounded-full transition-transform active:scale-95 disabled:opacity-30"
              disabled={!canScrollRight}
              onClick={() => scrollByAmount(340)}
              aria-label="Scroll right"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-4 flex touch-pan-y snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto scroll-smooth px-4 pt-1 pb-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {venues.map((venue) => (
          <div
            key={venue.id}
            className="w-[280px] shrink-0 snap-start sm:w-[320px]"
          >
            <ParkHeatCard venue={venue} />
          </div>
        ))}
      </div>
    </section>
  );
}

function FeedSectionShell({
  children,
  isLoading,
  title,
}: {
  children: ReactNode;
  isLoading: boolean;
  title: string;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        </div>
      </div>
      {isLoading ? <FeedSkeleton /> : children}
    </section>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="bg-muted/50 border-border/40 h-52 animate-pulse rounded-xl border"
        />
      ))}
    </div>
  );
}

function HomeFeedCard({
  item,
}: {
  item: {
    entity: unknown;
    entityType: string;
    id: string;
    reason: string;
    title: string;
  };
}) {
  if (item.entityType === "video") {
    return <VideoCard video={item.entity as VideoCardData} />;
  }

  return (
    <article className="space-y-2">
      <div className="text-primary flex items-center gap-1.5 px-1 text-xs font-semibold">
        <FeedItemIcon type={item.entityType} />
        <span>{item.reason}</span>
      </div>
      {item.entityType === "event" ? (
        <EventCard event={item.entity as EventCardData} />
      ) : null}
      {item.entityType === "venue" ? (
        <ParkHeatCard venue={item.entity as VenueCardData} />
      ) : null}
      {item.entityType === "player" ? (
        <PlayerCard player={item.entity as PlayerCardData} />
      ) : null}
      {item.entityType === "post" ? (
        <PostFeedCard post={item.entity as PostFeedData} />
      ) : null}
    </article>
  );
}

function FeedItemIcon({ type }: { type: string }) {
  if (type === "event") {
    return <Calendar className="size-3.5" />;
  }
  if (type === "player") {
    return <Users className="size-3.5" />;
  }
  if (type === "venue") {
    return <MapPin className="size-3.5" />;
  }
  if (type === "post") {
    return <MessageSquare className="size-3.5" />;
  }
  return <Flame className="size-3.5" />;
}

interface PostFeedData {
  author?: {
    displayUsername?: string | null;
    name?: string | null;
    username?: string | null;
  } | null;
  content?: string;
  id: string;
}

function PostFeedCard({ post }: { post: PostFeedData }) {
  const username =
    post.author?.username ?? post.author?.displayUsername ?? "player";

  return (
    <div className="border-border bg-card hover:border-primary/30 rounded-xl border p-5 shadow-xs transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-foreground text-sm font-semibold">
            {post.author?.name ?? "RallyCasts player"}
          </p>
          <Link
            to="/players/$username"
            params={{ username }}
            className="text-muted-foreground hover:text-primary text-xs transition-colors"
          >
            @{username}
          </Link>
        </div>
        <MessageSquare className="text-primary size-4" />
      </div>
      <p className="text-muted-foreground mt-3 line-clamp-4 text-sm leading-relaxed">
        {post.content}
      </p>
    </div>
  );
}
