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
  ["/hosts", "hosts"],
  ["/organizers", "hosts"],
  ["/u/organizer", "host tools"],
  ["/u/organizer/organizations", "organizations"],
  ["/u/organizer/organizations/$slug", "organization"],
  ["/shop", "shop"],
  ["/videos", "videos"],
  ["/u/me", "me"],
  ["/u/settings", "settings"],
  ["/u/studio", "studio"],
  ["/u/studio/upload", "upload"],
  ["/u/studio/clips", "clips"],
  ["/u/studio/live", "live"],
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
    (p) => p === "/events/hosts" || p.startsWith("/events/hosts/")
  );

  if (hasHostsRoute && !pathnames.includes("/events/hosts")) {
    const firstSubIndex = pathnames.findIndex((p) =>
      p.startsWith("/events/hosts/")
    );
    const targetParent = "/events/hosts";
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
                "inline-flex h-7 items-center justify-center rounded-full px-3.5 text-xs font-semibold transition-all duration-150 active:scale-97",
                isLast
                  ? "bg-[#183e1c] text-[#bcdf21] border border-[#2d6833] shadow-xs hover:bg-[#1f4e24] hover:text-[#d4f842]"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground px-2.5"
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
