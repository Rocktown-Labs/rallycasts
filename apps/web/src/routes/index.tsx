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
  Sparkles,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  EmptyState,
  EventCard,
  ParkHeatCard,
  PlayerCard,
  VideoCard,
} from "@/components/rally/cards";
import type {
  EventCardData,
  PlayerCardData,
  VenueCardData,
  VideoCardData,
} from "@/components/rally/cards";
import { authClient } from "@/lib/auth-client";
import { useHomeFeed, useVideos } from "@/lib/hooks";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const isPersonalized = Boolean(session?.user);

  return (
    <div className="mx-auto max-w-7xl space-y-10 animate-in fade-in duration-200">
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
            Watch local match highlights, find active parks, and book a
            RallyCasts caster when the game deserves a clean angle.
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

      {isPersonalized ? (
        <PersonalizedFeedSection sessionPending={sessionPending} />
      ) : (
        <PublicVideoSection sessionPending={sessionPending} />
      )}
    </div>
  );
}

function NearbyParksSection({
  items,
}: {
  items: { entity: unknown; id: string; title: string }[];
}) {
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
        {items.map((item) => (
          <div
            key={item.id}
            className="w-[280px] sm:w-[320px] shrink-0 snap-start"
          >
            <ParkHeatCard venue={item.entity as VenueCardData} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PersonalizedFeedSection({
  sessionPending,
}: {
  sessionPending: boolean;
}) {
  const homeFeed = useHomeFeed(true);
  const isLoading = sessionPending || homeFeed.isLoading;
  const feedItems = homeFeed.data?.items ?? [];

  const venueItems = feedItems.filter((item) => item.entityType === "venue");
  const contentItems = feedItems.filter((item) => item.entityType !== "venue");

  if (isLoading) {
    return (
      <FeedSectionShell isPersonalized isLoading={isLoading} title="Home Feed">
        <FeedSkeleton />
      </FeedSectionShell>
    );
  }

  if (feedItems.length === 0) {
    return (
      <FeedSectionShell isPersonalized isLoading={false} title="Home Feed">
        <EmptyState
          message="Add a home park, follow players, or publish public RallyCasts to wake up your feed."
          title="Your feed is warming up"
        />
      </FeedSectionShell>
    );
  }

  return (
    <div className="space-y-10">
      {venueItems.length > 0 ? <NearbyParksSection items={venueItems} /> : null}

      {contentItems.length > 0 ? (
        <FeedSectionShell isPersonalized isLoading={false} title="Home Feed">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {contentItems.map((item) => (
              <HomeFeedCard key={`${item.entityType}:${item.id}`} item={item} />
            ))}
          </div>
        </FeedSectionShell>
      ) : null}
    </div>
  );
}

function PublicVideoSection({ sessionPending }: { sessionPending: boolean }) {
  const latestVideos = useVideos();
  const isLoading = sessionPending || latestVideos.isLoading;
  const videos = latestVideos.data?.videos ?? [];

  return (
    <FeedSectionShell isLoading={isLoading} title="Latest RallyCasts">
      {videos.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <EmptyState
          message="Public ready videos will appear here once Mux uploads finish processing."
          title="No public videos yet"
        />
      )}
    </FeedSectionShell>
  );
}

function FeedSectionShell({
  children,
  isLoading,
  isPersonalized = false,
  title,
}: {
  children: ReactNode;
  isLoading: boolean;
  isPersonalized?: boolean;
  title: string;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {isPersonalized ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Ranked from your game, home park, friends, local activity, and
              semantic match.
            </p>
          ) : null}
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
  // On videos, user explicitly asked: "the little chip/badge on teh video can go"
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
