import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, useMatches } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export const breadcrumbLabels = new Map<string, string>([
  ["/", "rallycasts"],
  ["/trending", "trending"],
  ["/players", "players"],
  ["/events", "events"],
  ["/casters", "casters"],
  ["/events/hosts", "hosts"],
  ["/events/hosts/new", "new"],
  ["/events/hosts/manage", "manage"],
  ["/hosts", "hosts"],
  ["/events/organizers", "hosts"],
  ["/organizers", "hosts"],
  ["/events/organizers/new", "new"],
  ["/events/organizers/manage", "manage"],
  ["/shop", "shop"],
  ["/videos", "videos"],
  ["/u/me", "me"],
  ["/u/profile", "profile"],
  ["/u/settings", "settings"],
  ["/u/videos", "my videos"],
  ["/u/videos/clips", "clips"],
  ["/u/videos/live", "live"],
  ["/u/videos/me", "my videos"],
  ["/u/studio", "studio"],
  ["/u/studio/upload", "upload"],
  ["/u/casts", "casts"],
  ["/u/casts/all", "all"],
  ["/u/casts/new", "new"],
  ["/u/casts/pending", "pending"],
  ["/u/casts/approved", "approved"],
  ["/u/casts/completed", "completed"],
  ["/u/messages", "messages"],
  ["/u/history", "history"],
  ["/onboarding", "onboarding"],
  ["/venues", "venues"],
  ["/places", "venues"],
]);

const isIdLike = (segment: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
    segment
  ) ||
  segment.startsWith("google:") ||
  (segment.length > 25 && !segment.includes(" "));

export const humanize = (value: string) => {
  if (isIdLike(value)) {
    return "details";
  }
  return value.replaceAll("-", " ");
};

export function getVisiblePathnames(rawPathnames: string[]): string[] {
  const pathnames = [
    ...new Set(
      rawPathnames
        // Remove trailing slash
        .map((pathname) => pathname.replace(/\/$/u, ""))
        .filter((pathname) => pathname !== "")
    ),
  ];

  const hasUserSubRoute = pathnames.some((p) => p.startsWith("/u/"));
  const hasHostsRoute = pathnames.some(
    (p) =>
      p === "/events/hosts" ||
      p.startsWith("/events/hosts/") ||
      p === "/events/organizers" ||
      p.startsWith("/events/organizers/")
  );

  if (
    hasHostsRoute &&
    !pathnames.includes("/events/hosts") &&
    !pathnames.includes("/events/organizers")
  ) {
    const firstSubIndex = pathnames.findIndex(
      (p) =>
        p.startsWith("/events/hosts/") || p.startsWith("/events/organizers/")
    );
    const targetParent = pathnames.some((p) => p.startsWith("/events/hosts/"))
      ? "/events/hosts"
      : "/events/organizers";
    if (firstSubIndex === -1) {
      pathnames.push(targetParent);
    } else {
      pathnames.splice(firstSubIndex, 0, targetParent);
    }
  }

  return pathnames.filter((pathname) => {
    if (pathname === "/") {
      return false;
    }
    if (pathname === "/u" && hasUserSubRoute) {
      return false;
    }
    if (pathname === "/events" && hasHostsRoute) {
      return false;
    }
    return true;
  });
}

export default function Breadcrumbs() {
  const matches = useMatches();
  const rawPathnames = matches.map((match) => match.pathname);
  const visiblePathnames = getVisiblePathnames(rawPathnames);

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
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            ) : null}
            <Link
              to={pathname}
              className={cn(
                "inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-medium transition-all duration-150 active:scale-97",
                isLast
                  ? "bg-muted/80 text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span className="truncate max-w-36">{label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
