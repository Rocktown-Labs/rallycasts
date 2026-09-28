import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { cn } from "@rallycaststv/ui/lib/utils";
import {
  Link,
  useLocation,
  useNavigate,
  useSearch as useRouterSearch,
} from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useSearch as useEntitySearch } from "@/lib/hooks";
import type { SearchEntity } from "@/lib/hooks";

const filters = [
  { label: "All", value: "all" },
  { label: "Videos", value: "videos" },
  { label: "Players", value: "players" },
  { label: "Posts", value: "posts" },
  { label: "Events", value: "events" },
  { label: "Parks", value: "parks" },
] as const;

const filterForPath = (pathname: string): SearchEntity => {
  if (pathname.startsWith("/players")) {
    return "players";
  }

  if (pathname.startsWith("/events")) {
    return "events";
  }

  if (pathname.startsWith("/videos")) {
    return "videos";
  }

  if (pathname.startsWith("/trending")) {
    return "parks";
  }

  return "all";
};

export default function SearchForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeSearch = useRouterSearch({ strict: false });
  const routeFilter = useMemo(
    () => filterForPath(location.pathname),
    [location.pathname]
  );
  const routeQuery = typeof routeSearch.q === "string" ? routeSearch.q : "";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchEntity>(routeFilter);
  const { data } = useEntitySearch(query, filter);
  const hasResults =
    data &&
    (data.videos.length > 0 ||
      data.players.length > 0 ||
      data.posts.length > 0 ||
      data.events.length > 0 ||
      data.venues.length > 0);

  useEffect(() => {
    setFilter(routeFilter);
    setQuery(routeQuery);
  }, [routeFilter, routeQuery]);

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    void navigate({
      search: (previous) => ({
        ...previous,
        q: nextQuery.trim() || undefined,
      }),
      to: ".",
    });
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <form
        className="flex h-10 items-center rounded-md border border-border bg-background/80 px-1 shadow-sm"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="sr-only" htmlFor="global-search">
          Search RallyCasts
        </label>
        <select
          aria-label="Search filter"
          className="hidden h-8 rounded-md border border-border bg-muted px-2 text-sm text-foreground outline-none md:block"
          value={filter}
          onChange={(event) => setFilter(event.target.value as SearchEntity)}
        >
          {filters.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Search className="mx-1 md:mx-2 size-4 text-muted-foreground shrink-0" />
        <Input
          id="global-search"
          className="h-8 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          placeholder="Search..."
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
        />
      </form>
      {query.trim().length > 1 ? (
        <div className="absolute right-0 left-0 top-12 z-50 rounded-md border border-border bg-popover p-2 shadow-xl">
          {hasResults ? (
            <div className="grid gap-1">
              {data.videos.slice(0, 3).map((video) => (
                <Link
                  key={video.id}
                  params={{ id: video.id }}
                  to="/videos/$id"
                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="font-medium">{video.title}</span>
                  <span className="ml-2 text-muted-foreground">video</span>
                </Link>
              ))}
              {data.players.slice(0, 3).map((player) => (
                <Link
                  key={player.id}
                  params={{ username: player.username ?? player.id }}
                  to="/players/$username"
                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="font-medium">{player.name}</span>
                  <span className="ml-2 text-muted-foreground">player</span>
                </Link>
              ))}
              {data.posts.slice(0, 3).map(({ author, post }) => (
                <Link
                  key={post.id}
                  to="/"
                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="font-medium line-clamp-1">
                    {post.content}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    post by {author.name}
                  </span>
                </Link>
              ))}
              {data.events.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  params={{ id: event.id }}
                  to="/events/$id"
                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="font-medium">{event.name}</span>
                  <span className="ml-2 text-muted-foreground">event</span>
                </Link>
              ))}
              {data.venues.slice(0, 3).map((venue) => (
                <Link
                  key={venue.id}
                  params={{ id: venue.id }}
                  to="/venues/$id"
                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="font-medium">{venue.name}</span>
                  <span className="ml-2 text-muted-foreground">park</span>
                </Link>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "px-3 py-6 text-center text-sm text-muted-foreground"
              )}
            >
              No RallyCasts results yet.
            </div>
          )}
        </div>
      ) : null}
      <Button className="sr-only" type="submit">
        Search
      </Button>
    </div>
  );
}
