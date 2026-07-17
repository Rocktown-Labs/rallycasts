import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import { UploadCloud, Video } from "lucide-react";

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
          Upload new match footage, finish drafts, and manage every video from
          one place.
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
              <Video className="size-5 text-primary" />
              Content
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Review drafts, processing videos, published matches, and clips.
            </p>
            <Link to="/u/videos/me">
              <Button className="rounded-lg" variant="outline">
                Manage videos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
