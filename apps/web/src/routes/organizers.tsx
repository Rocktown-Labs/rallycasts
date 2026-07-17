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
    throw redirect({ to: "/events/organizers" });
  },
});

export function OrganizersPage() {
  const [query, setQuery] = useState("");
  const { data: session } = authClient.useSession();
  const { data, isLoading } = useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.organizations.$get()),
    queryKey: ["organizations"],
  });
  const organizations = (data?.organizations ?? []).filter((organization) =>
    `${organization.name} ${organization.city ?? ""} ${organization.state ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <section className="rounded-2xl bg-primary p-7 text-white">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bcdf21]">
              Tournament hosts
            </p>
            <h1 className="mt-2 text-4xl font-black">Organizations</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Follow clubs, leagues, facilities, and official RallyCasts events
              without confusing the organizer identity with its owner’s player
              profile.
            </p>
          </div>
          {session?.user ? (
            <Link to="/events/organizers/new">
              <Button className="bg-[#bcdf21] text-black hover:bg-[#d3f34b]">
                <Plus className="size-4" /> Create organization
              </Button>
            </Link>
          ) : null}
        </div>
      </section>

      <Input
        aria-label="Search organizations"
        className="max-w-xl"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search organizations, cities, or states"
        value={query}
      />

      {isLoading ? (
        <div className="h-52 animate-pulse rounded-xl bg-muted" />
      ) : null}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((organization) => (
          <Link
            className="group rounded-2xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-lg"
            key={organization.id}
            params={{ slug: organization.slug }}
            to="/events/organizers/$slug"
          >
            <div className="flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10 text-primary">
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
                <h2 className="flex items-center gap-1.5 truncate font-bold group-hover:text-primary">
                  {organization.name}
                  {organization.isOfficial ? (
                    <BadgeCheck className="size-4 shrink-0 text-[#bcdf21]" />
                  ) : null}
                </h2>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {[organization.city, organization.state]
                    .filter(Boolean)
                    .join(", ") || "Location coming soon"}
                </p>
              </div>
            </div>
            <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
              {organization.bio ??
                "Tournament and pickleball community organizer."}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
