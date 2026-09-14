import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CreditCard,
  FileVideo,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { ManageAdsPanel } from "@/components/ads/manage-ads-panel";
import { PlaceSearchPicker } from "@/components/places/place-search-picker";
import type { SelectedPlace } from "@/components/places/place-search-picker";
import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/_auth/organizers/$slug/manage")({
  beforeLoad: ({ params }) => {
    throw redirect({
      params: { slug: params.slug },
      to: "/events/hosts/$slug/manage",
    });
  },
});

const getOrganization = (slug: string) =>
  readApiJson(apiClient.api.v1.hosts[":slug"].$get({ param: { slug } }));

type OrganizationData = Awaited<ReturnType<typeof getOrganization>>;

export const ManageOrganizationPage = ({ slug }: { slug: string }) => {
  const { data } = useQuery({
    queryFn: () => getOrganization(slug),
    queryKey: ["organization", slug],
  });

  if (!data?.organization) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return <ManageOrganizationEditor data={data} slug={slug} />;
};

const ManageOrganizationEditor = ({
  data,
  slug,
}: {
  data: OrganizationData;
  slug: string;
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { organization } = data;
  const [name, setName] = useState(organization.name);
  const [city, setCity] = useState(organization.city ?? "");
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? "");
  const [state, setState] = useState(organization.state ?? "");
  const [bio, setBio] = useState(organization.bio ?? "");
  const [memberUsername, setMemberUsername] = useState("");
  const [eventName, setEventName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [capacity, setCapacity] = useState("16");
  const [entryFee, setEntryFee] = useState("0");
  const [courts, setCourts] = useState("Court 1, Court 2, Court 3, Court 4");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null
  );
  const [organizationPost, setOrganizationPost] = useState("");
  const { data: myVideosData } = useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.videos.me.$get()),
    queryKey: ["videos", "me"],
  });

  const updateOrganization = useMutation({
    mutationFn: () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Organization name is required.");
      }

      return readApiJson(
        apiClient.api.v1.hosts[":slug"].$patch({
          json: {
            bio: bio.trim() || undefined,
            city: city.trim() || undefined,
            logoUrl: logoUrl.trim() || undefined,
            name: trimmedName,
            state: state.trim() || undefined,
          },
          param: { slug },
        })
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save organization profile"
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      toast.success("Organization profile saved");
    },
  });
  const addMember = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.hosts[":slug"].members.$post({
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
        apiClient.api.v1.events.$post({
          json: {
            bracketType: "single_elimination",
            capacity: Number(capacity),
            courtLabels: courts
              .split(",")
              .map((court) => court.trim())
              .filter(Boolean),
            entryFeeCents: Math.round(Number(entryFee) * 100),
            eventType: "tournament",
            googlePlaceId: selectedPlace?.placeId,
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
    onSuccess: async (result) => {
      setEventName("");
      setLocationQuery("");
      setSelectedPlace(null);
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      await queryClient.invalidateQueries({ queryKey: ["events", "mine"] });
      toast.success("Tournament published");
      await navigate({
        params: { id: result.event.id },
        to: "/events/$id",
      });
    },
  });
  const startStripe = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.stripe.connect[":organizationId"].onboarding.$post({
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
        apiClient.api.v1.hosts[":slug"].posts.$post({
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
        apiClient.api.v1.hosts[":slug"].videos.$post({
          json: { videoId },
          param: { slug },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      toast.success("Video posted as the organization");
    },
  });

  const submitTournament = (event: FormEvent) => {
    event.preventDefault();
    if (!(eventName && startsAt)) {
      toast.error("Tournament name and start time are required.");
      return;
    }
    if (!selectedPlace) {
      toast.error("Select a validated location before publishing.");
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
        <Link params={{ slug }} to="/events/hosts/$slug">
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
              aria-label="Organization name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Organization name"
              value={name}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                aria-label="Organization city"
                onChange={(event) => setCity(event.target.value)}
                placeholder="City"
                value={city}
              />
              <Input
                aria-label="Organization state"
                onChange={(event) => setState(event.target.value)}
                placeholder="State"
                value={state}
              />
            </div>
            <Input
              aria-label="Organization logo URL"
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="Logo URL"
              value={logoUrl}
            />
            <textarea
              aria-label="Organization bio"
              className="min-h-28 w-full rounded-lg border bg-background p-3 text-sm"
              onChange={(event) => setBio(event.target.value)}
              placeholder="Organization bio"
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
          <div className="md:col-span-2">
            <PlaceSearchPicker
              id="tournamentLocationInput"
              label="Tournament location"
              onPlaceChange={setSelectedPlace}
              onQueryChange={setLocationQuery}
              query={locationQuery}
              selectedPlace={selectedPlace}
            />
          </div>
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

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Calendar className="size-5 text-primary" /> Tournaments
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review the events attached to this organization and jump into the
              operational views.
            </p>
          </div>
          <Link to="/u/organizer/events">
            <Button className="rounded-md" variant="outline">
              All events
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
        <div className="mt-5 grid gap-3">
          {data.events.map((item) => (
            <div className="rounded-lg border p-4" key={item.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-bold">{item.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.startsAt).toLocaleString()} ·{" "}
                    {item.eventType.replaceAll("_", " ")} · {item.status}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.capacity ?? "Open"} capacity ·{" "}
                    {item.entryFeeCents > 0
                      ? `$${(item.entryFeeCents / 100).toFixed(2)} entry`
                      : "Free entry"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link params={{ id: item.id }} to="/events/$id">
                    <Button className="rounded-md" size="sm" variant="outline">
                      View
                    </Button>
                  </Link>
                  <Link params={{ id: item.id }} to="/events/$id/players">
                    <Button className="rounded-md" size="sm" variant="outline">
                      Players
                    </Button>
                  </Link>
                  <Link params={{ id: item.id }} to="/events/$id/bracket">
                    <Button className="rounded-md" size="sm" variant="outline">
                      Bracket
                    </Button>
                  </Link>
                  <Link params={{ id: item.id }} to="/events/$id/matches">
                    <Button className="rounded-md" size="sm" variant="outline">
                      Matches
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {data.events.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No tournaments are attached to this organization yet.
            </p>
          ) : null}
        </div>
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
            {(organization as { stripeOnboardingStatus?: string })
              .stripeOnboardingStatus === "complete"
              ? "Update Stripe"
              : "Set up Stripe payouts"}
          </Button>
        </div>
        <ManageAdsPanel
          events={data.events}
          organizationId={organization.id}
          videos={myVideosData?.videos ?? []}
        />
      </section>
    </main>
  );
};

export const ManageHostPage = ManageOrganizationPage;
