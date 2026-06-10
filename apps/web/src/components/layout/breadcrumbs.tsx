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
  ["/profile", "profile"],
  ["/profile/my-rallycasts", "my rallycasts"],
  ["/profile/analytics", "analytics"],
  ["/profile/earn", "earn"],
  ["/requests", "requests"],
  ["/messages", "messages"],
  ["/history", "history"],
  ["/onboarding", "onboarding"],
]);

const humanize = (value: string) => value.replaceAll("-", " ");

export default function Breadcrumbs() {
  const matches = useMatches();
  const pathnames = matches
    .map((match) => match.pathname)
    .filter(
      (pathname, index, all) => pathname && all.indexOf(pathname) === index
    );
  const visiblePathnames = pathnames.length > 0 ? pathnames : ["/"];

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden min-w-0 items-center gap-2 md:flex"
    >
      {visiblePathnames.map((pathname, index) => {
        const isLast = index === visiblePathnames.length - 1;
        const label =
          breadcrumbLabels.get(pathname) ??
          humanize(pathname.split("/").findLast(Boolean) ?? "home");

        return (
          <div key={pathname} className="flex min-w-0 items-center gap-2">
            {index > 0 ? (
              <ChevronRight className="size-3 text-muted-foreground" />
            ) : null}
            <Link
              to={pathname}
              className={cn(
                "inline-flex h-6 min-w-28 max-w-40 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors",
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
