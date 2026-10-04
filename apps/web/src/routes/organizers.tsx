import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { BadgeCheck, Building2, MapPin, Plus } from "lucide-react";
import { useState } from "react";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/organizers")({
  beforeLoad: () => {
    throw redirect({ to: "/events/hosts" });
  },
});

export function OrganizersPage() {
  const [query, setQuery] = useState("");
  const { data: session } = authClient.useSession();
  const { data, isLoading } = useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.hosts.$get()),
    queryKey: ["hosts"],
  });
  const organizations = (data?.organizations ?? []).filter((organization) =>
    `${organization.name} ${organization.city ?? ""} ${organization.state ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <section className="bg-primary rounded-2xl p-7 text-white">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#bcdf21] uppercase">
              Tournament hosts
            </p>
            <h1 className="mt-2 text-4xl font-black">
              Host events on RallyCasts
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Follow clubs, leagues, facilities, and official tournaments—or get
              a host account to organize your own. On RallyCasts, you can be a
              player, host, or rallycaster.
            </p>
          </div>
          <Link to={session?.user ? "/events/hosts/new" : "/login"}>
            <Button className="rounded-lg bg-[#bcdf21] text-black hover:bg-[#d3f34b]">
              <Plus className="size-4" /> Get a host account
            </Button>
          </Link>
        </div>
      </section>

      <Input
        aria-label="Search hosts"
        className="max-w-xl"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search hosts, clubs, cities, or states"
        value={query}
      />

      {isLoading ? (
        <div className="bg-muted h-52 animate-pulse rounded-xl" />
      ) : null}
      {!isLoading && organizations.length === 0 ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed p-12 text-center text-sm">
          No hosts found matching your search.
        </p>
      ) : null}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((organization) => (
          <Link
            className="group bg-card hover:border-primary/50 rounded-2xl border p-5 transition hover:shadow-lg"
            key={organization.id}
            params={{ slug: organization.slug }}
            to="/events/hosts/$slug"
          >
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl">
                {organization.logoUrl ? (
                  <img
                    alt={`${organization.name} logo`}
                    className="size-full object-cover"
                    src={organization.logoUrl}
                  />
                ) : (
                  <Building2 className="size-6" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="group-hover:text-primary flex items-center gap-1.5 truncate font-bold">
                  {organization.name}
                  {organization.isOfficial ? (
                    <BadgeCheck className="size-4 shrink-0 text-[#bcdf21]" />
                  ) : null}
                </h2>
                <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                  <MapPin className="size-3" />
                  {[organization.city, organization.state]
                    .filter(Boolean)
                    .join(", ") || "Location coming soon"}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 line-clamp-3 text-sm">
              {organization.bio ?? "Tournament and pickleball community host."}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}

export const HostsPage = OrganizersPage;
