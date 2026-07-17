import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BarChart3, Radio, Scissors, UploadCloud } from "lucide-react";

export const Route = createFileRoute("/_auth/u/studio/")({
  component: StudioIndexPage,
});

function StudioIndexPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          RallyCasts Studio
        </p>
        <h1 className="mt-1 text-3xl font-bold">Studio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create new content, go live, cut clips, and review channel analytics.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UploadCloud className="size-5 text-primary" />
              Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Start a new private upload and continue into the studio editor.
            </p>
            <Link to="/u/studio/upload">
              <Button className="rounded-lg">Upload video</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="size-5 text-primary" />
              Go live
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Start a live RallyCast session from courtside.
            </p>
            <Button className="rounded-lg" disabled variant="outline">
              Start live
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scissors className="size-5 text-primary" />
              Clips
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Open a Studio video workspace to cut short highlights.
            </p>
            <Link to="/u/videos">
              <Button className="rounded-lg" variant="outline">
                Pick video
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="size-5 text-primary" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Track uploads, views, clips, and publishing performance.
            </p>
            <Button className="rounded-lg" disabled variant="outline">
              Coming soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
