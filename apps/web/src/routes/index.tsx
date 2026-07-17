import { buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Calendar, Flame, MapPin, MessageSquare, Users } from "lucide-react";
import type { ReactNode } from "react";

import {
  EmptyState,
  EventCard,
  PlayerCard,
  VenueCard,
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
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="grid gap-4 rounded-lg border border-border bg-[linear-gradient(135deg,hsl(142_100%_18%/.2),transparent_52%,hsl(78_100%_60%/.08))] p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold text-primary">
            Pickleball around your courts
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal md:text-4xl">
            Pickleball videos, players, and casters around you.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Watch local match highlights, find active parks, and book a
            RallyCasts caster when the game deserves a clean angle.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/trending" className={cn(buttonVariants(), "rounded-md")}>
            <Flame className="size-4" />
            Trending
          </Link>
          <Link
            to="/onboarding"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-md")}
          >
            <MapPin className="size-4" />
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

function PersonalizedFeedSection({
  sessionPending,
}: {
  sessionPending: boolean;
}) {
  const homeFeed = useHomeFeed(true);
  const isLoading = sessionPending || homeFeed.isLoading;
  const feedItems = homeFeed.data?.items ?? [];

  return (
    <FeedSectionShell isPersonalized isLoading={isLoading} title="Home Feed">
      {feedItems.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {feedItems.map((item) => (
            <HomeFeedCard key={`${item.entityType}:${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          message="Add a home park, follow players, or publish public RallyCasts to wake up your feed."
          title="Your feed is warming up"
        />
      )}
    </FeedSectionShell>
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
          <h2 className="text-2xl font-bold">{title}</h2>
          {isPersonalized ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Ranked from your game, home park, friends, local activity, and
              semantic match.
            </p>
          ) : null}
        </div>
        <Link to="/trending" className={buttonVariants({ variant: "ghost" })}>
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
        <div key={index} className="h-52 animate-pulse rounded-lg bg-muted" />
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
  return (
    <article className="space-y-2">
      <div className="flex items-center gap-2 px-1 text-xs font-semibold text-primary">
        <FeedItemIcon type={item.entityType} />
        <span>{item.reason}</span>
      </div>
      {item.entityType === "video" ? (
        <VideoCard video={item.entity as VideoCardData} />
      ) : null}
      {item.entityType === "event" ? (
        <EventCard event={item.entity as EventCardData} />
      ) : null}
      {item.entityType === "venue" ? (
        <VenueCard venue={item.entity as VenueCardData} />
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
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {post.author?.name ?? "RallyCasts player"}
          </p>
          <Link
            to="/players/$username"
            params={{ username }}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            @{username}
          </Link>
        </div>
        <MessageSquare className="size-4 text-primary" />
      </div>
      <p className="mt-4 line-clamp-4 text-sm text-muted-foreground">
        {post.content}
      </p>
    </div>
  );
}
