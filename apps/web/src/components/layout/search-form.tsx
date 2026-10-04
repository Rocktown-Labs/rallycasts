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

import { authClient } from "@/lib/auth-client";
import { getVideoSlug, useSearch as useEntitySearch } from "@/lib/hooks";
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
  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);
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
      (isSignedIn && data.players.length > 0) ||
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
        className="border-border bg-background/80 flex h-10 items-center rounded-md border px-1 shadow-sm"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="sr-only" htmlFor="global-search">
          Search RallyCasts
        </label>
        <select
          aria-label="Search filter"
          className="border-border bg-muted text-foreground hidden h-8 rounded-md border px-2 text-sm outline-none md:block"
          value={filter}
          onChange={(event) => setFilter(event.target.value as SearchEntity)}
        >
          {filters.map(({ label, value }) => (
            <option
              hidden={!isSignedIn && value === "players"}
              key={value}
              value={value}
            >
              {label}
            </option>
          ))}
        </select>
        <Search className="text-muted-foreground mx-1 size-4 shrink-0 md:mx-2" />
        <Input
          id="global-search"
          className="h-8 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          placeholder="Search..."
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
        />
      </form>
      {query.trim().length > 1 ? (
        <div className="border-border bg-popover absolute top-12 right-0 left-0 z-50 rounded-md border p-2 shadow-xl">
          {hasResults ? (
            <div className="grid gap-1">
              {data.videos.slice(0, 3).map((video) => (
                <Link
                  key={video.id}
                  params={{ id: getVideoSlug(video) }}
                  to="/videos/$id"
                  className="hover:bg-muted rounded-md px-3 py-2 text-sm"
                >
                  <span className="font-medium">{video.title}</span>
                  <span className="text-muted-foreground ml-2">video</span>
                </Link>
              ))}
              {isSignedIn
                ? data.players.slice(0, 3).map((player) => (
                    <Link
                      key={player.id}
                      params={{ username: player.username ?? player.id }}
                      to="/players/$username"
                      className="hover:bg-muted rounded-md px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{player.name}</span>
                      <span className="text-muted-foreground ml-2">player</span>
                    </Link>
                  ))
                : null}
              {data.posts.slice(0, 3).map(({ author, post }) => (
                <Link
                  key={post.id}
                  to="/"
                  className="hover:bg-muted rounded-md px-3 py-2 text-sm"
                >
                  <span className="line-clamp-1 font-medium">
                    {post.content}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    post by {author.name}
                  </span>
                </Link>
              ))}
              {data.events.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  params={{ id: event.id }}
                  to="/events/$id"
                  className="hover:bg-muted rounded-md px-3 py-2 text-sm"
                >
                  <span className="font-medium">{event.name}</span>
                  <span className="text-muted-foreground ml-2">event</span>
                </Link>
              ))}
              {data.venues.slice(0, 3).map((venue) => (
                <Link
                  key={venue.id}
                  params={{ id: venue.id }}
                  to="/venues/$id"
                  className="hover:bg-muted rounded-md px-3 py-2 text-sm"
                >
                  <span className="font-medium">{venue.name}</span>
                  <span className="text-muted-foreground ml-2">park</span>
                </Link>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "text-muted-foreground px-3 py-6 text-center text-sm"
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
