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

function HomeComponent() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isPersonalized = Boolean(session?.user);

  return (
    <div className="mx-auto max-w-7xl space-y-12 animate-in fade-in duration-200">
      <HeroBanner />

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
        "rounded-lg border-white/25 bg-transparent text-white transition-transform duration-150 hover:bg-white/10 hover:text-white active:scale-97 cursor-pointer"
      )}
    >
      <MapPin className="size-4 text-[#bcdf21]" />
      {homeLabel ?? "Set location"}
    </Link>
  );
}

function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-xl sm:p-8">
      <div className="relative z-10 max-w-2xl space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
          <span>Pickleball around your courts</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl text-white">
          Pickleball videos, players, and casters around you.
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm text-gray-200 sm:text-base leading-relaxed">
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
  const allVideos: VideoCardData[] = useMemo(() => {
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

    for (const v of latestVideosQuery.data?.videos ?? []) {
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
  }, [rawFeedItems, latestVideosQuery.data?.videos]);

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

  const venuesList: VenueCardData[] = useMemo(() => {
    const list: VenueCardData[] = [];
    const seen = new Set<string>();

    // 1. From personalized feed
    for (const item of rawFeedItems) {
      if (item.entityType === "venue") {
        const v = item.entity as unknown as VenueCardData;
        if (!seen.has(v.id)) {
          seen.add(v.id);
          list.push(v);
        }
      }
    }

    // 2. Supplement from trending venues if feed is thin
    for (const v of trendingQuery.data?.venues ?? []) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        list.push(v);
      }
    }

    // 3. Prioritize & badge home court
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

    // Sort: home court first, then by heat or active players
    return list.toSorted((a, b) => {
      if (a.isHomeCourt && !b.isHomeCourt) {
        return -1;
      }
      if (!a.isHomeCourt && b.isHomeCourt) {
        return 1;
      }
      return (b.activePlayers ?? 0) - (a.activePlayers ?? 0);
    });
  }, [rawFeedItems, trendingQuery.data?.venues, userHomeCourt]);

  // Community feed items (Events, Players, Posts)
  const communityItems = useMemo(
    () =>
      rawFeedItems.filter(
        (item) => item.entityType !== "video" && item.entityType !== "venue"
      ),
    [rawFeedItems]
  );

  if (isLoading) {
    return (
      <FeedSectionShell isLoading={true} title="Featured Matches">
        <FeedSkeleton />
      </FeedSectionShell>
    );
  }

  const { collapsed: sidebarCollapsed } = useSidebar();
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

  return (
    <div className="space-y-14">
      {/* 1. Featured Matches (Landscape 16:9 shelf) */}
      {featuredLandscape.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Featured Matches
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Recent rallies, matches, and clinics recorded with RallyCasts.
            </p>
          </div>
          <div className={videoGridClass}>
            {featuredLandscape.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 2. Highlights (Shorts Shelf - Portrait 9:16) */}
      {highlightsVideos.length > 0 ? (
        <ShortsShelf videos={highlightsVideos} />
      ) : null}

      {/* 3. More Matches & Highlights (reveals 9 at a time via Load more) */}
      <MoreMatchesSection
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        videoGridClass={videoGridClass}
        videos={moreMatches}
      />

      {/* 4. Courts & Parks Near You (Home court prioritized first, below videos) */}
      {venuesList.length > 0 ? (
        <NearbyParksSection venues={venuesList} />
      ) : null}

      {/* 5. Community Feed / Upcoming Events */}
      {communityItems.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Court Activity & Tournaments
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Upcoming open plays, tournament brackets, and player updates.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {communityItems.map((item) => (
              <HomeFeedCard key={`${item.entityType}:${item.id}`} item={item} />
            ))}
          </div>
        </section>
      ) : null}
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
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          More Matches & Highlights
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
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
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <span className="flex size-7 items-center justify-center rounded-lg bg-red-600/15 text-red-500">
              <Flame className="size-4.5 fill-red-500" />
            </span>
            Highlights
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bite-sized points, kitchen battles, and clutch shots from the
            courts.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-full transition-transform active:scale-95 disabled:opacity-30 cursor-pointer"
            disabled={!canScrollLeft}
            onClick={() => scrollByAmount(-280)}
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-full transition-transform active:scale-95 disabled:opacity-30 cursor-pointer"
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
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none touch-pan-y"
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
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <MapPin className="size-5 text-primary" />
            Parks near you
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Courts with active heat, open play sessions, and checked-in players.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full transition-transform active:scale-95 disabled:opacity-30 cursor-pointer"
              disabled={!canScrollLeft}
              onClick={() => scrollByAmount(-340)}
              aria-label="Scroll left"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full transition-transform active:scale-95 disabled:opacity-30 cursor-pointer"
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
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {venues.map((venue) => (
          <div
            key={venue.id}
            className="w-[280px] sm:w-[320px] shrink-0 snap-start"
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
          className="h-52 animate-pulse rounded-xl bg-muted/50 border border-border/40"
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
      <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-primary">
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
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all duration-200 hover:border-primary/30">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {post.author?.name ?? "RallyCasts player"}
          </p>
          <Link
            to="/players/$username"
            params={{ username }}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            @{username}
          </Link>
        </div>
        <MessageSquare className="size-4 text-primary" />
      </div>
      <p className="mt-3 line-clamp-4 text-sm text-muted-foreground leading-relaxed">
        {post.content}
      </p>
    </div>
  );
}
