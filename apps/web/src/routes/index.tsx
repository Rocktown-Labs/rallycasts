import { buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Flame, MapPin } from "lucide-react";

import { EmptyState, VideoCard } from "@/components/rally/cards";
import { authClient } from "@/lib/auth-client";
import { useRecommendedVideos, useVideos } from "@/lib/hooks";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const latestVideos = useVideos();
  const recommendedVideos = useRecommendedVideos(Boolean(session?.user));
  const feedData = session?.user ? recommendedVideos.data : latestVideos.data;
  const isLoading =
    sessionPending ||
    (session?.user ? recommendedVideos.isLoading : latestVideos.isLoading);
  const videos = feedData?.videos ?? [];
  const isPersonalized =
    session?.user && recommendedVideos.data?.mode === "hybrid";

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

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isPersonalized ? "For You" : "Latest RallyCasts"}
            </h2>
            {isPersonalized ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Ranked from your game, home court, friends, and activity.
              </p>
            ) : null}
          </div>
          <Link to="/trending" className={buttonVariants({ variant: "ghost" })}>
            Explore trending
          </Link>
        </div>
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-52 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        )}
        {!isLoading && videos.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {videos.map((video) => (
              <div className="space-y-2" key={video.id}>
                <VideoCard video={video} />
                {"recommendationReason" in video ? (
                  <p className="px-1 text-[11px] font-medium text-primary">
                    {video.recommendationReason}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {!isLoading && videos.length === 0 && (
          <EmptyState
            message="Public ready videos will appear here once Mux uploads finish processing."
            title="No public videos yet"
          />
        )}
      </section>
    </div>
  );
}
