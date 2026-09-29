import { buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { BarChart3, Radio, Scissors, UploadCloud } from "lucide-react";

import { VideosLibrary } from "./-videos-library";

type VideosSection = "clips" | "live" | "videos";

const studioActions = [
  {
    description: "Start a new private upload.",
    icon: UploadCloud,
    label: "Upload",
    to: "/u/studio/upload",
  },
  {
    description: "Cut highlights from a video.",
    icon: Scissors,
    label: "Clips",
    to: "/u/studio/clips",
  },
] as const;

/**
 * The Studio shell: page header, quick actions, and the video library. The
 * three studio routes (videos, clips, live) all render this with the
 * matching library section.
 */
export function StudioPage({
  section = "videos",
}: {
  section?: VideosSection;
}) {
  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            RallyCasts Studio
          </p>
          <h1 className="mt-1 text-3xl font-bold">Studio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload match footage, cut clips, and manage your videos.
          </p>
        </div>
        <Link
          className={cn(buttonVariants(), "rounded-lg")}
          to="/u/studio/upload"
        >
          <UploadCloud className="size-4" />
          Upload video
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {studioActions.map(({ description, icon: Icon, label, to }) => (
          <Link
            className="group rounded-xl border border-border/80 bg-card/60 p-4 transition-[background-color,border-color,transform] duration-150 hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] cursor-pointer"
            key={label}
            to={to}
          >
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Icon className="size-4 text-primary" />
              {label}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </Link>
        ))}
        <div className="rounded-xl border border-border/80 bg-card/60 p-4">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Radio className="size-4 text-primary" />
            Go live
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Live sessions start from courtside soon.
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card/60 p-4">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <BarChart3 className="size-4 text-primary" />
            Analytics
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Coming soon.</p>
        </div>
      </div>

      <VideosLibrary section={section} />
    </main>
  );
}
