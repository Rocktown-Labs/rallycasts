import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  CreditCard,
  FileVideo,
  Megaphone,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/_auth/organizers/$slug/manage")({
  component: ManageOrganizationPage,
});

function ManageOrganizationPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryFn: () =>
      readApiJson(
        apiClient.api.organizations[":slug"].$get({ param: { slug } })
      ),
    queryKey: ["organization", slug],
  });
  const organization = data?.organization;
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [memberUsername, setMemberUsername] = useState("");
  const [eventName, setEventName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [capacity, setCapacity] = useState("16");
  const [entryFee, setEntryFee] = useState("0");
  const [courts, setCourts] = useState("Court 1, Court 2, Court 3, Court 4");
  const [organizationPost, setOrganizationPost] = useState("");
  const { data: myVideosData } = useQuery({
    queryFn: () => readApiJson(apiClient.api.videos.me.$get()),
    queryKey: ["videos", "me"],
  });

  const updateOrganization = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.organizations[":slug"].$patch({
          json: {
            bio: bio || organization?.bio || undefined,
            name: name || organization?.name,
          },
          param: { slug },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      toast.success("Organization profile saved");
    },
  });
  const addMember = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.organizations[":slug"].members.$post({
          json: { role: "editor", username: memberUsername },
          param: { slug },
        })
      ),
    onSuccess: async () => {
      setMemberUsername("");
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      toast.success("Team member added");
    },
  });
  const createTournament = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.events.$post({
          json: {
            bracketType: "single_elimination",
            capacity: Number(capacity),
            courtLabels: courts
              .split(",")
              .map((court) => court.trim())
              .filter(Boolean),
            entryFeeCents: Math.round(Number(entryFee) * 100),
            eventType: "tournament",
            name: eventName,
            organizationId: organization?.id,
            registrationDeadline: registrationDeadline
              ? new Date(registrationDeadline).toISOString()
              : undefined,
            startsAt: new Date(startsAt).toISOString(),
            status: "published",
          },
        })
      ),
    onSuccess: async () => {
      setEventName("");
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      toast.success("Tournament published");
    },
  });
  const startStripe = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.stripe.connect[":organizationId"].onboarding.$post({
          param: { organizationId: organization?.id ?? "" },
        })
      ),
    onSuccess: (result) => {
      window.location.assign(result.url);
    },
  });
  const publishPost = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.organizations[":slug"].posts.$post({
          json: { content: organizationPost },
          param: { slug },
        })
      ),
    onSuccess: async () => {
      setOrganizationPost("");
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      toast.success("Posted as the organization");
    },
  });
  const attachVideo = useMutation({
    mutationFn: (videoId: string) =>
      readApiJson(
        apiClient.api.organizations[":slug"].videos.$post({
          json: { videoId },
          param: { slug },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      toast.success("Video posted as the organization");
    },
  });

  if (!organization) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  const submitTournament = (event: FormEvent) => {
    event.preventDefault();
    if (!(eventName && startsAt)) {
      toast.error("Tournament name and start time are required.");
      return;
    }
    createTournament.mutate();
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Organizer console
          </p>
          <h1 className="text-3xl font-black">Manage {organization.name}</h1>
        </div>
        <Link params={{ slug }} to="/organizers/$slug">
          <Button variant="outline">View public page</Button>
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Settings className="size-4 text-primary" /> Profile
          </h2>
          <div className="mt-4 space-y-3">
            <Input
              onChange={(event) => setName(event.target.value)}
              placeholder={organization.name}
              value={name}
            />
            <textarea
              aria-label="Organization bio"
              className="min-h-28 w-full rounded-lg border bg-background p-3 text-sm"
              onChange={(event) => setBio(event.target.value)}
              placeholder={organization.bio ?? "Organization bio"}
              value={bio}
            />
            <Button onClick={() => updateOrganization.mutate()}>
              Save profile
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Users className="size-4 text-primary" /> Members
          </h2>
          <div className="mt-4 flex gap-2">
            <Input
              onChange={(event) => setMemberUsername(event.target.value)}
              placeholder="Player username"
              value={memberUsername}
            />
            <Button
              disabled={!memberUsername}
              onClick={() => addMember.mutate()}
            >
              Add editor
            </Button>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {data.members.map((member) => (
              <p key={member.user.id}>
                {member.user.name} · {member.role}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Calendar className="size-5 text-primary" /> Create tournament
        </h2>
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={submitTournament}
        >
          <Input
            aria-label="Tournament name"
            onChange={(event) => setEventName(event.target.value)}
            placeholder="Tournament name"
            value={eventName}
          />
          <Input
            aria-label="Tournament start time"
            onChange={(event) => setStartsAt(event.target.value)}
            type="datetime-local"
            value={startsAt}
          />
          <Input
            aria-label="Registration deadline"
            onChange={(event) => setRegistrationDeadline(event.target.value)}
            type="datetime-local"
            value={registrationDeadline}
          />
          <Input
            aria-label="Capacity"
            min="2"
            onChange={(event) => setCapacity(event.target.value)}
            type="number"
            value={capacity}
          />
          <Input
            aria-label="Entry fee in dollars"
            min="0"
            onChange={(event) => setEntryFee(event.target.value)}
            step="0.01"
            type="number"
            value={entryFee}
          />
          <Input
            aria-label="Court labels"
            onChange={(event) => setCourts(event.target.value)}
            value={courts}
          />
          <Button
            className="md:col-span-2"
            disabled={createTournament.isPending}
            type="submit"
          >
            <Plus className="size-4" /> Publish tournament
          </Button>
        </form>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <FileVideo className="size-4 text-primary" /> Organization content
          </h2>
          <textarea
            aria-label="Organization post"
            className="mt-4 min-h-24 w-full rounded-lg border bg-background p-3 text-sm"
            onChange={(event) => setOrganizationPost(event.target.value)}
            placeholder={`Post an update as ${organization.name}`}
            value={organizationPost}
          />
          <Button
            className="mt-2"
            disabled={!organizationPost.trim() || publishPost.isPending}
            onClick={() => publishPost.mutate()}
          >
            Publish update
          </Button>
          <div className="mt-5 space-y-2">
            {(myVideosData?.videos ?? []).slice(0, 5).map((item) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
                key={item.id}
              >
                <span className="truncate text-xs font-semibold">
                  {item.title}
                </span>
                <Button
                  onClick={() => attachVideo.mutate(item.id)}
                  size="sm"
                  variant="outline"
                >
                  Post as org
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <CreditCard className="size-4 text-primary" /> Payments
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Stripe-hosted onboarding enables paid registration and organizer
            payouts. RallyCasts retains 5%.
          </p>
          <Button className="mt-4" onClick={() => startStripe.mutate()}>
            {organization.stripeOnboardingStatus === "complete"
              ? "Update Stripe"
              : "Set up Stripe payouts"}
          </Button>
        </div>
        <div className="rounded-2xl border border-dashed bg-muted/20 p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Megaphone className="size-4 text-primary" /> Ads — coming soon
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Promoted tournaments and local sponsor placements will live here.
          </p>
        </div>
      </section>
    </main>
  );
}
