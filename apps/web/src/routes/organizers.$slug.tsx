import { Button } from "@rallycaststv/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { BadgeCheck, Building2, Calendar, MapPin, Users } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/organizers/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      params: { slug: params.slug },
      to: "/events/organizers/$slug",
    });
  },
});

export function OrganizationProfilePage({ slug }: { slug: string }) {
  const { data: session } = authClient.useSession();
  const { data, isLoading } = useQuery({
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.organizations[":slug"].$get({ param: { slug } })
      ),
    queryKey: ["organization", slug],
  });
  if (isLoading) {
    return (
      <div className="mx-auto h-72 max-w-7xl animate-pulse rounded-xl bg-muted" />
    );
  }
  if (!data?.organization) {
    return <p className="p-12 text-center">Organization not found.</p>;
  }
  const { organization, members, events, posts, videos } = data;
  const canManage = members.some(
    (member) => member.user.id === session?.user?.id
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <section className="rounded-2xl border bg-card p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex gap-5">
            <div className="grid size-20 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
              {organization.logoUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  src={organization.logoUrl}
                />
              ) : (
                <Building2 className="size-9" />
              )}
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-black">
                {organization.name}
                {organization.isOfficial ? (
                  <BadgeCheck className="size-6 text-[#bcdf21]" />
                ) : null}
              </h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {[organization.city, organization.state]
                  .filter(Boolean)
                  .join(", ") || "Location coming soon"}
              </p>
            </div>
          </div>
          {canManage ? (
            <Link params={{ slug }} to="/events/organizers/$slug/manage">
              <Button>Manage organization</Button>
            </Link>
          ) : null}
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-muted-foreground">
          {organization.bio ?? "This organization has not added a bio yet."}
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Organization updates</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {posts.slice(0, 4).map((item) => (
            <article
              className="rounded-xl border bg-card p-5 text-sm"
              key={item.id}
            >
              {item.content}
            </article>
          ))}
          {videos.slice(0, 4).map((item) => (
            <Link
              className="rounded-xl border bg-card p-5 hover:border-primary/50"
              key={item.id}
              params={{ id: item.id }}
              to="/videos/$id"
            >
              <p className="font-bold">{item.title}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {item.status} · {item.visibility}
              </p>
            </Link>
          ))}
          {posts.length === 0 && videos.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No organization updates yet.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Calendar className="size-5 text-primary" /> Tournaments and events
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((item) => (
            <Link
              className="rounded-xl border bg-card p-5 hover:border-primary/50"
              key={item.id}
              params={{ id: item.id }}
              to="/events/$id"
            >
              <p className="font-bold">{item.name}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(item.startsAt).toLocaleString()} · {item.status}
              </p>
              <p className="mt-3 text-sm font-semibold text-primary">
                {item.entryFeeCents > 0
                  ? `$${(item.entryFeeCents / 100).toFixed(2)} entry`
                  : "Free entry"}
              </p>
            </Link>
          ))}
          {events.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No tournaments published yet.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Users className="size-5 text-primary" /> Team
        </h2>
        <div className="flex flex-wrap gap-3">
          {members.map((member) => (
            <Link
              className="rounded-full border bg-card px-4 py-2 text-sm"
              key={member.user.id}
              params={{ username: member.user.username ?? "player" }}
              to="/players/$username"
            >
              {member.user.name} · {member.role}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
