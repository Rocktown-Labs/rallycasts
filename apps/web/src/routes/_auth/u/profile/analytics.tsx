import { Link, createFileRoute } from "@tanstack/react-router";
import { Eye, Radio, Timer, UserPlus, Users, Video } from "lucide-react";

import ProfileTabs from "@/components/profile/profile-tabs";
import { EmptyState, StatCard } from "@/components/rally/cards";
import {
  formatWatchTime,
  useCreatorAnalytics,
} from "@/lib/hooks/use-creator-analytics";
import type {
  CreatorAnalytics,
  CreatorVideoStat,
} from "@/lib/hooks/use-creator-analytics";

export const Route = createFileRoute("/_auth/u/profile/analytics")({
  component: AnalyticsPage,
});

function AudienceMomentum({
  viewsByDay,
}: {
  viewsByDay: { date: string; views: number }[];
}) {
  const maxViews = Math.max(1, ...viewsByDay.map((day) => day.views));
  const totalViews = viewsByDay.reduce((sum, day) => sum + day.views, 0);
  return (
    <div className="border-border rounded-lg border p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Audience momentum</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Real video views recorded in the last 30 days.
          </p>
        </div>
        <span className="text-muted-foreground text-xs">
          {totalViews.toLocaleString()} views
        </span>
      </div>
      {totalViews > 0 ? (
        <div
          aria-label="Daily video views for the last 30 days"
          className="mt-6 flex h-56 items-end gap-1"
        >
          {viewsByDay.map((day) => (
            <div
              className="group relative flex h-full flex-1 items-end"
              key={day.date}
            >
              <div
                className="bg-primary/70 group-hover:bg-primary w-full rounded-t-sm transition-colors"
                style={{
                  height: `${Math.max(4, (day.views / maxViews) * 100)}%`,
                }}
              />
              <span className="bg-popover text-popover-foreground pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded px-2 py-1 text-[10px] whitespace-nowrap shadow group-hover:block">
                {day.date}: {day.views.toLocaleString()} views
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-6 rounded-lg border border-dashed p-8 text-center text-sm">
          Views will appear here as people watch your videos. Nothing is
          pre-filled.
        </p>
      )}
    </div>
  );
}

function TopVideos({ videos }: { videos: CreatorVideoStat[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Top videos</h2>
        <Link
          className="text-primary text-sm font-semibold hover:underline"
          to="/u/studio"
        >
          Open Studio
        </Link>
      </div>
      {videos.length > 0 ? (
        <div className="border-border divide-border divide-y rounded-lg border">
          {videos.map((video) => (
            <Link
              className="hover:bg-muted/40 flex items-center gap-3 p-3 transition-colors"
              key={video.id}
              params={{ id: video.id }}
              to="/videos/$id"
            >
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
                {video.thumbnailUrl ? (
                  <img
                    alt=""
                    className="size-full object-cover"
                    src={video.thumbnailUrl}
                  />
                ) : (
                  <Video className="text-muted-foreground size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{video.title}</p>
                <p className="text-muted-foreground text-xs capitalize">
                  {video.mediaType}
                </p>
              </div>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Eye className="size-3.5" />
                {video.viewCount.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          message="Publish a video to start collecting real view and watch-time data."
          title="No published videos yet"
        />
      )}
    </section>
  );
}

function CreatorStats({
  completedViews,
  followers,
  following,
  friends,
  liveStreams,
  totalVideos,
  totalViews,
  watchTimeSeconds,
}: {
  completedViews: number;
  followers: number;
  following: number;
  friends: number;
  liveStreams: number;
  totalVideos: number;
  totalViews: number;
  watchTimeSeconds: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={<Eye className="size-5" />}
        label="Views"
        trend={`${totalVideos} published videos`}
        value={totalViews.toLocaleString()}
      />
      <StatCard
        icon={<Timer className="size-5" />}
        label="Watch time"
        trend={`${completedViews.toLocaleString()} completed views`}
        value={formatWatchTime(watchTimeSeconds)}
      />
      <StatCard
        icon={<Users className="size-5" />}
        label="Followers"
        trend={`${friends} friends`}
        value={followers.toLocaleString()}
      />
      <StatCard
        icon={<UserPlus className="size-5" />}
        label="Following"
        trend={`${liveStreams} live streams created`}
        value={following.toLocaleString()}
      />
    </div>
  );
}

const EMPTY_ANALYTICS: CreatorAnalytics = {
  followers: 0,
  following: 0,
  friends: 0,
  liveStreams: 0,
  topVideos: [],
  totals: {
    completedViews: 0,
    totalVideos: 0,
    totalViews: 0,
    watchTimeSeconds: 0,
  },
  viewsByDay: [],
};

function AnalyticsPage() {
  const { data, isLoading } = useCreatorAnalytics();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Your RallyCasts Studio</h1>
          <ProfileTabs />
        </div>
        <p className="text-muted-foreground text-sm">Loading your numbers…</p>
      </div>
    );
  }

  const analytics = data ?? EMPTY_ANALYTICS;
  const { totals, topVideos } = analytics;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your RallyCasts Studio</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            First-party numbers only. Views and watch time are recorded from
            real playback.
          </p>
        </div>
        <ProfileTabs />
      </div>

      <CreatorStats
        completedViews={totals.completedViews}
        followers={analytics.followers}
        following={analytics.following}
        friends={analytics.friends}
        liveStreams={analytics.liveStreams}
        totalVideos={totals.totalVideos}
        totalViews={totals.totalViews}
        watchTimeSeconds={totals.watchTimeSeconds}
      />

      <AudienceMomentum viewsByDay={analytics.viewsByDay} />

      <TopVideos videos={topVideos} />

      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Radio className="size-3.5" />
        Live stream replays are published as videos when a broadcast ends.
      </p>
    </div>
  );
}
