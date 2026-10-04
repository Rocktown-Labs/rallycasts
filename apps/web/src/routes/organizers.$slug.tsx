import { Button } from "@rallycaststv/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { BadgeCheck, Building2, Calendar, MapPin, Users } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { getVideoSlug } from "@/lib/hooks";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/organizers/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      params: { slug: params.slug },
      to: "/events/hosts/$slug",
    });
  },
});

export function OrganizationProfilePage({ slug }: { slug: string }) {
  const { data: session } = authClient.useSession();
  const { data, isLoading } = useQuery({
    queryFn: () =>
      readApiJson(apiClient.api.v1.hosts[":slug"].$get({ param: { slug } })),
    queryKey: ["organization", slug],
  });
  if (isLoading) {
    return (
      <div className="bg-muted mx-auto h-72 max-w-7xl animate-pulse rounded-xl" />
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
      <section className="bg-card rounded-2xl border p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex gap-5">
            <div className="bg-primary/10 text-primary grid size-20 place-items-center overflow-hidden rounded-2xl">
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
              <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                <MapPin className="size-4" />
                {[organization.city, organization.state]
                  .filter(Boolean)
                  .join(", ") || "Location coming soon"}
              </p>
            </div>
          </div>
          {canManage ? (
            <Link params={{ slug }} to="/u/organizer/organizations/$slug">
              <Button className="rounded-lg">Manage organization</Button>
            </Link>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-6 max-w-3xl text-sm leading-6">
          {organization.bio ?? "This organization has not added a bio yet."}
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Organization updates</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {posts.slice(0, 4).map((item) => (
            <article
              className="bg-card rounded-xl border p-5 text-sm"
              key={item.id}
            >
              {item.content}
            </article>
          ))}
          {videos.slice(0, 4).map((item) => (
            <Link
              className="bg-card hover:border-primary/50 rounded-xl border p-5"
              key={item.id}
              params={{ id: getVideoSlug(item) }}
              to="/videos/$id"
            >
              <p className="font-bold">{item.title}</p>
              <p className="text-muted-foreground mt-1 text-xs capitalize">
                {item.status} · {item.visibility}
              </p>
            </Link>
          ))}
          {posts.length === 0 && videos.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-sm">
              No organization updates yet.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Calendar className="text-primary size-5" /> Tournaments and events
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((item) => (
            <Link
              className="bg-card hover:border-primary/50 rounded-xl border p-5"
              key={item.id}
              params={{ id: item.id }}
              to="/events/$id"
            >
              <p className="font-bold">{item.name}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                {new Date(item.startsAt).toLocaleString()} · {item.status}
              </p>
              <p className="text-primary mt-3 text-sm font-semibold">
                {item.entryFeeCents > 0
                  ? `$${(item.entryFeeCents / 100).toFixed(2)} entry`
                  : "Free entry"}
              </p>
            </Link>
          ))}
          {events.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-sm">
              No tournaments published yet.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Users className="text-primary size-5" /> Team
        </h2>
        <div className="flex flex-wrap gap-3">
          {members.map((member) => (
            <Link
              className="bg-card rounded-full border px-4 py-2 text-sm"
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

export const HostProfilePage = OrganizationProfilePage;
