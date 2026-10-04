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
          <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
            RallyCasts Studio
          </p>
          <h1 className="mt-1 text-3xl font-bold">Studio</h1>
          <p className="text-muted-foreground mt-2 text-sm">
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
            className="group border-border/80 bg-card/60 hover:border-primary/50 hover:bg-card focus-visible:ring-ring/50 cursor-pointer rounded-xl border p-4 transition-[background-color,border-color,transform] duration-150 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
            key={label}
            to={to}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="text-primary size-4" />
              {label}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{description}</p>
          </Link>
        ))}
        <div className="border-border/80 bg-card/60 rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Radio className="text-primary size-4" />
            Go live
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Live sessions start from courtside soon.
          </p>
        </div>
        <div className="border-border/80 bg-card/60 rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="text-primary size-4" />
            Analytics
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Coming soon.</p>
        </div>
      </div>

      <VideosLibrary section={section} />
    </main>
  );
}
