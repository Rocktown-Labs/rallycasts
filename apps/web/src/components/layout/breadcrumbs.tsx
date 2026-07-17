import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, useMatches } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

const breadcrumbLabels = new Map<string, string>([
  ["/", "rallycasts"],
  ["/trending", "trending"],
  ["/players", "players"],
  ["/events", "events"],
  ["/casters", "casters"],
  ["/events/organizers", "organizers"],
  ["/shop", "shop"],
  ["/videos", "videos"],
  ["/u/me", "me"],
  ["/u/profile", "profile"],
  ["/u/settings", "settings"],
  ["/u/videos/me", "my videos"],
  ["/u/studio", "studio"],
  ["/u/studio/upload", "upload"],
  ["/u/recording-requests/me", "recording requests"],
  ["/u/messages", "messages"],
  ["/u/history", "history"],
  ["/onboarding", "onboarding"],
]);

const humanize = (value: string) => value.replaceAll("-", " ");

export default function Breadcrumbs() {
  const matches = useMatches();
  const pathnames = [
    ...new Set(
      matches
        // Remove trailing slash
        .map((match) => match.pathname.replace(/\/$/u, ""))
        .filter((pathname) => pathname !== "")
    ),
  ];

  const hasUserSubRoute = pathnames.some((p) => p.startsWith("/u/"));
  const visiblePathnames = pathnames.filter((pathname) => {
    if (pathname === "/") {
      return false;
    }
    if (pathname === "/u" && hasUserSubRoute) {
      return false;
    }
    return true;
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden min-w-0 items-center gap-1.5 md:flex"
    >
      {visiblePathnames.map((pathname, index) => {
        const isLast = index === visiblePathnames.length - 1;
        const segments = pathname.split("/").filter(Boolean);
        const lastSegment = segments.at(-1) ?? "home";
        const label = breadcrumbLabels.get(pathname) ?? humanize(lastSegment);

        return (
          <div key={pathname} className="flex min-w-0 items-center gap-1.5">
            {index > 0 ? (
              <ChevronRight className="size-4 text-muted-foreground" />
            ) : null}
            <Link
              to={pathname}
              className={cn(
                "inline-flex h-7 min-w-20 max-w-36 items-center justify-center rounded-full bg-primary px-3 text-base font-logo text-primary-foreground lowercase transition-colors",
                isLast && "bg-primary text-[#bcdf21]"
              )}
            >
              <span className="truncate">{label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
