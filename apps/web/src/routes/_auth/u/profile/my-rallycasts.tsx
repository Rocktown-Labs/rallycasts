import { createFileRoute } from "@tanstack/react-router";

import ProfileTabs from "@/components/profile/profile-tabs";
import { EmptyState, VideoCard } from "@/components/rally/cards";
import { useMyVideos } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/profile/my-rallycasts")({
  component: MyRallyCastsPage,
});

function MyRallyCastsPage() {
  const { data } = useMyVideos();
  const videos = data?.videos ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Your RallyCasts Studio</h1>
        <ProfileTabs />
      </div>
      {videos.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <EmptyState
          message="Your uploaded matches, shorts, and clips will live here."
          title="No RallyCasts yet"
        />
      )}
    </div>
  );
}
