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
  Radio,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  EmptyState,
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
import { useHomeFeed, useProfile, useTrending, useVideos } from "@/lib/hooks";

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

function HeroBanner() {
  return (
    <section className="grid gap-6 rounded-2xl border border-border/60 bg-[linear-gradient(135deg,hsl(142_100%_18%/.15),transparent_52%,hsl(78_100%_60%/.08))] p-6 shadow-xs md:grid-cols-[1fr_auto] md:items-center sm:p-8">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
          <Sparkles className="size-3 text-[#bcdf21]" />
          <span>Pickleball around your courts</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl text-foreground">
          Pickleball videos, players, and casters around you.
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Watch local match highlights, find active parks, and book a RallyCasts
          caster when the game deserves a clean angle.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Link
          to="/trending"
          className={cn(
            buttonVariants(),
            "rounded-lg font-medium transition-transform duration-150 active:scale-97 cursor-pointer"
          )}
        >
          <Flame className="size-4 text-[#bcdf21]" />
          Trending Courts
        </Link>
        <Link
          to="/onboarding"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "rounded-lg font-medium transition-transform duration-150 active:scale-97 cursor-pointer hover:bg-accent/10"
          )}
        >
          <MapPin className="size-4 text-primary" />
          Set location
        </Link>
      </div>
    </section>
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

    return list;
  }, [rawFeedItems, latestVideosQuery.data?.videos]);

  // Split into Shorts (Clips) vs Standard Landscape Videos
  const { landscapeVideos, shortsVideos } = useMemo(() => {
    const shorts: VideoCardData[] = [];
    const landscape: VideoCardData[] = [];

    for (const video of allVideos) {
      const isShort =
        video.mediaType === "short" ||
        (video.durationSeconds !== undefined &&
          video.durationSeconds !== null &&
          video.durationSeconds > 0 &&
          video.durationSeconds <= 180);

      if (isShort && shorts.length < 10) {
        shorts.push(video);
      } else {
        landscape.push(video);
      }
    }

    // Ensure we have at least a few clips in the shelf for showcase if available
    if (shorts.length < 3 && landscape.length > 4) {
      const moved = landscape.splice(-2, 2);
      shorts.push(...moved);
    }

    return { landscapeVideos: landscape, shortsVideos: shorts };
  }, [allVideos]);

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
      <FeedSectionShell isLoading={true} title="Featured Highlights">
        <FeedSkeleton />
      </FeedSectionShell>
    );
  }

  return (
    <div className="space-y-14">
      {/* 1. Main Featured Matches (Landscape 16:9 shelf) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Featured Highlights & Matches
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Recent rallies, matches, and clinics recorded with RallyCasts.
            </p>
          </div>
          <Link
            to="/trending"
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-1"
          >
            Explore all →
          </Link>
        </div>

        {landscapeVideos.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {landscapeVideos.slice(0, 8).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <EmptyState
            message="Public ready videos will appear here once match uploads finish processing."
            title="No videos yet"
          />
        )}
      </section>

      {/* 2. Rallies & Clips (Shorts Shelf - Portrait 9:16) */}
      {shortsVideos.length > 0 ? <ShortsShelf videos={shortsVideos} /> : null}

      {/* 3. Courts & Parks Near You (Home court prioritized first) */}
      {venuesList.length > 0 ? (
        <NearbyParksSection venues={venuesList} />
      ) : null}

      {/* 4. Request a Caster (On-Demand Court Camera) */}
      <RequestCasterFeature />

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
            Rallies & Clips
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
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none"
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
          <Link
            to="/trending"
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-1"
          >
            Explore all courts →
          </Link>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none"
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

function RequestCasterFeature() {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <Radio className="size-4.5 text-emerald-500 animate-pulse" />
            </span>
            Order a Caster by the Hour (On-Demand Camera)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Request an on-court camera like an Uber. Order hours for your match
            or tournament—a verified caster shows up to your park, records your
            session, and delivers footage for your private review & approval.
          </p>
        </div>
        <Link
          to="/casters"
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-1"
        >
          Become a caster →
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-card to-muted/40 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE DISPATCH ACTIVE</span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl text-foreground">
              Order On-Court Recording Hours
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Playing a match or tournament? Order a caster for 1, 2, or custom
              hours. Dispatched like an Uber, a nearby caster shows up to your
              court with a stabilized 4K rig and directional court mics. You
              review and approve the recording before it is published.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <span className="text-emerald-500 font-bold">$25 / hr</span>{" "}
                standard rate
              </span>
              <span>•</span>
              <span>Order 1, 2, or custom hours</span>
              <span>•</span>
              <span>Fair platform split</span>
              <span>•</span>
              <span>Private review guarantee</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <Link to="/u/casts/new">
              <Button
                size="lg"
                className="w-full rounded-xl font-bold text-xs sm:text-sm cursor-pointer shadow-xs"
              >
                <Video className="mr-1.5 size-4" /> Order Caster Hours Now
              </Button>
            </Link>
            <Link to="/u/casts/all">
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl text-xs sm:text-sm cursor-pointer"
              >
                My Requests & Reviews
              </Button>
            </Link>
            <Link
              to="/casters"
              className="text-center text-[11px] text-muted-foreground hover:text-primary transition-colors pt-0.5"
            >
              Want to earn casting matches? Sign up here →
            </Link>
          </div>
        </div>
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
        <Link
          to="/trending"
          className={cn(buttonVariants({ variant: "ghost" }), "text-xs")}
        >
          Explore trending
        </Link>
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
