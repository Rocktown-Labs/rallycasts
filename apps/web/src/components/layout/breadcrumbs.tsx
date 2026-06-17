import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, useMatches } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

const breadcrumbLabels = new Map<string, string>([
  ["/", "rallycasts"],
  ["/trending", "trending"],
  ["/players", "players"],
  ["/events", "events"],
  ["/casters", "casters"],
  ["/organizers", "organizers"],
  ["/videos", "videos"],
  ["/u/me", "me"],
  ["/u/profile", "profile"],
  ["/u/settings", "settings"],
  ["/u/videos/me", "my videos"],
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
      className="hidden min-w-0 items-center gap-2 md:flex"
    >
      {visiblePathnames.map((pathname, index) => {
        const isLast = index === visiblePathnames.length - 1;
        const segments = pathname.split("/").filter(Boolean);
        const lastSegment = segments.at(-1) ?? "home";
        const label = breadcrumbLabels.get(pathname) ?? humanize(lastSegment);

        return (
          <div key={pathname} className="flex min-w-0 items-center gap-2">
            {index > 0 ? (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            ) : null}
            <Link
              to={pathname}
              className={cn(
                "inline-flex h-9.5 min-w-32 max-w-48 items-center justify-center rounded-full bg-primary px-5 text-lg font-logo text-primary-foreground transition-colors",
                isLast && "bg-primary text-brand-yellow"
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
