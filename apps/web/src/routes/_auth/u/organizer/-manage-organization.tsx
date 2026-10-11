import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CreditCard,
  FileVideo,
  Plus,
  Settings,
  Sparkles,
  Users,
  ImageUp,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { ManageAdsPanel } from "@/components/ads/manage-ads-panel";
import { PlaceSearchPicker } from "@/components/places/place-search-picker";
import type { SelectedPlace } from "@/components/places/place-search-picker";
import { apiClient } from "@/lib/api-client";
import { useProfile } from "@/lib/hooks";
import { readApiJson } from "@/lib/hooks/api";

const getOrganization = (slug: string) =>
  readApiJson(apiClient.api.v1.hosts[":slug"].$get({ param: { slug } }));

type OrganizationData = Awaited<ReturnType<typeof getOrganization>>;

export const ManageOrganizationPage = ({ slug }: { slug: string }) => {
  const { data } = useQuery({
    queryFn: () => getOrganization(slug),
    queryKey: ["organization", slug],
  });

  if (!data?.organization) {
    return <div className="bg-muted h-64 animate-pulse rounded-xl" />;
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
  const { data: myProfile } = useProfile();
  const isPlatformAdmin = Boolean(myProfile?.isPlatformAdmin);
  const navigate = useNavigate();
  const { organization } = data;
  const [name, setName] = useState(organization.name);
  const [city, setCity] = useState(organization.city ?? "");
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? "");
  const [state, setState] = useState(organization.state ?? "");
  const [bio, setBio] = useState(organization.bio ?? "");
  const [eventName, setEventName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("16");
  const [entryFee, setEntryFee] = useState("0");
  const [courts, setCourts] = useState("Court 1, Court 2, Court 3, Court 4");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null
  );
  const [organizationPost, setOrganizationPost] = useState("");
  const [seedWithDemo, setSeedWithDemo] = useState(false);
  const [seedPlayerCount, setSeedPlayerCount] = useState("8");
  const [endsAt, setEndsAt] = useState("");
  const { data: myVideosData } = useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.videos.me.$get()),
    queryKey: ["videos", "me"],
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.api.v1.upload.image.$post({
        form: formData,
      });
      if (!response.ok) {
        throw new Error("Could not upload the image");
      }
      const body = (await response.json()) as { url?: string | null };
      return body.url ?? null;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not upload the logo."
      );
    },
    onSuccess: (url) => {
      if (url) {
        setLogoUrl(url);
      }
    },
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
  const seedDemo = useMutation({
    mutationFn: (eventId: string) =>
      readApiJson(
        apiClient.api.v1.events[":id"]["seed-demo"].$post({
          json: { playerCount: Number(seedPlayerCount) || 8 },
          param: { id: eventId },
        })
      ),
    onSuccess: async (_, eventId) => {
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(
        `Tournament populated with ${seedPlayerCount} demo players & live bracket!`
      );
      await navigate({
        params: { id: eventId },
        to: "/events/$id/bracket",
      });
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
            endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
            entryFeeCents: Math.round(Number(entryFee) * 100),
            eventType: "tournament",
            googlePlaceId: selectedPlace?.placeId,
            name: eventName,
            organizationId: organization?.id,
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

      if (seedWithDemo) {
        try {
          await readApiJson(
            apiClient.api.v1.events[":id"]["seed-demo"].$post({
              json: { playerCount: Number(seedPlayerCount) || 8 },
              param: { id: result.event.id },
            })
          );
          toast.success(
            `Tournament published and seeded with ${seedPlayerCount} demo competitors!`
          );
          await navigate({
            params: { id: result.event.id },
            to: "/events/$id/bracket",
          });
          return;
        } catch {
          // Fall through to regular navigate
        }
      }

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
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
            Host tools
          </p>
          <h1 className="text-3xl font-black">Manage {organization.name}</h1>
        </div>
        <Link params={{ slug }} to="/events/hosts/$slug">
          <Button variant="outline">View public page</Button>
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Settings className="text-primary size-4" /> Profile
          </h2>
          <div className="mt-4 space-y-3">
            <Input
              className="rounded-lg"
              aria-label="Organization name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Organization name"
              value={name}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                className="rounded-lg"
                aria-label="Organization city"
                onChange={(event) => setCity(event.target.value)}
                placeholder="City"
                value={city}
              />
              <Input
                className="rounded-lg"
                aria-label="Organization state"
                onChange={(event) => setState(event.target.value)}
                placeholder="State"
                value={state}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-3">
                {logoUrl.trim() ? (
                  <img
                    alt="Organization logo preview"
                    className="border-border size-12 rounded-lg border object-contain"
                    src={logoUrl.trim()}
                  />
                ) : null}
                <label
                  className="border-border bg-background hover:bg-muted text-foreground inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium"
                  htmlFor="organization-logo-file"
                >
                  <ImageUp className="size-4" />
                  Upload logo
                  <input
                    accept="image/avif,image/jpeg,image/png,image/webp"
                    className="hidden"
                    id="organization-logo-file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) {
                        uploadLogo.mutate(file);
                      }
                    }}
                    type="file"
                  />
                </label>
                {uploadLogo.isPending ? (
                  <span className="text-muted-foreground text-xs">
                    Uploading...
                  </span>
                ) : null}
              </div>
              <Input
                className="rounded-lg font-normal"
                aria-label="Organization logo URL"
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="or paste a logo URL"
                value={logoUrl}
              />
            </div>
            <textarea
              aria-label="Organization bio"
              className="bg-background min-h-28 w-full rounded-lg border p-3 text-sm"
              onChange={(event) => setBio(event.target.value)}
              placeholder="Organization bio"
              value={bio}
            />
            <Button onClick={() => updateOrganization.mutate()}>
              Save profile
            </Button>
          </div>
        </section>

        <section className="bg-card rounded-2xl border p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 font-bold">
              <Users className="text-primary size-4" /> Team
            </h2>
            <Link params={{ slug }} to="/u/organizer/organizations/$slug/team">
              <Button className="rounded-lg" variant="outline">
                Manage team
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            {data.members.length} member
            {data.members.length === 1 ? "" : "s"}, including{" "}
            {data.members
              .slice(0, 3)
              .map((member) => member.user.name)
              .join(", ")}
            {data.members.length > 3 ? ", and more" : ""}.
          </p>
        </section>
      </div>

      <section className="bg-card rounded-2xl border p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Calendar className="text-primary size-5" /> Create tournament
        </h2>
        <form
          className="mt-5 grid gap-4 md:grid-cols-2"
          onSubmit={submitTournament}
        >
          <div className="grid gap-1.5 text-sm font-semibold">
            <label className="text-foreground" htmlFor="tournament-name">
              Tournament name
            </label>
            <Input
              className="rounded-lg font-normal"
              id="tournament-name"
              onChange={(event) => setEventName(event.target.value)}
              placeholder="Spring Classic 2026"
              value={eventName}
            />
          </div>
          <div className="grid gap-1.5 text-sm font-semibold">
            <span className="text-foreground">Tournament location</span>
            <PlaceSearchPicker
              id="tournamentLocationInput"
              label="Tournament location"
              onPlaceChange={setSelectedPlace}
              onQueryChange={setLocationQuery}
              query={locationQuery}
              selectedPlace={selectedPlace}
            />
          </div>
          <div className="grid gap-1.5 text-sm font-semibold">
            <label className="text-foreground" htmlFor="tournament-starts">
              Starts
            </label>
            <Input
              className="rounded-lg font-normal"
              id="tournament-starts"
              onChange={(event) => setStartsAt(event.target.value)}
              type="datetime-local"
              value={startsAt}
            />
          </div>
          <div className="grid gap-1.5 text-sm font-semibold">
            <label className="text-foreground" htmlFor="tournament-ends">
              Ends
            </label>
            <Input
              className="rounded-lg font-normal"
              id="tournament-ends"
              onChange={(event) => setEndsAt(event.target.value)}
              type="datetime-local"
              value={endsAt}
            />
            <span className="text-muted-foreground text-[11px] font-normal">
              Leave blank if it ends when play finishes.
            </span>
          </div>
          <div className="grid gap-1.5 text-sm font-semibold">
            <label className="text-foreground" htmlFor="tournament-capacity">
              Player capacity
            </label>
            <Input
              className="rounded-lg font-normal"
              id="tournament-capacity"
              min="2"
              onChange={(event) => setCapacity(event.target.value)}
              type="number"
              value={capacity}
            />
          </div>
          <div className="grid gap-1.5 text-sm font-semibold">
            <label className="text-foreground" htmlFor="tournament-entry-fee">
              Entry fee ($)
            </label>
            <Input
              className="rounded-lg font-normal"
              id="tournament-entry-fee"
              min="0"
              onChange={(event) => setEntryFee(event.target.value)}
              step="0.01"
              type="number"
              value={entryFee}
            />
          </div>
          <div className="grid gap-1.5 text-sm font-semibold md:col-span-2">
            <label className="text-foreground" htmlFor="tournament-courts">
              Courts (comma separated)
            </label>
            <Input
              className="rounded-lg font-normal"
              id="tournament-courts"
              onChange={(event) => setCourts(event.target.value)}
              placeholder="Court 1, Court 2, Center Court"
              value={courts}
            />
          </div>
          {isPlatformAdmin ? (
            <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center gap-3 rounded-lg border p-3 md:col-span-2">
              <label
                className="flex cursor-pointer items-center gap-2 text-xs font-semibold"
                htmlFor="seed-with-demo"
              >
                <input
                  checked={seedWithDemo}
                  className="border-border text-primary focus:ring-primary size-4 cursor-pointer rounded"
                  id="seed-with-demo"
                  onChange={(event) => setSeedWithDemo(event.target.checked)}
                  type="checkbox"
                />
                <span className="flex items-center gap-1.5">
                  <Sparkles className="text-primary size-4" />
                  Seed a demo bracket
                </span>
              </label>
              {seedWithDemo ? (
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <label htmlFor="seed-player-count">Players</label>
                  <Input
                    className="w-24 rounded-lg font-normal"
                    id="seed-player-count"
                    max="64"
                    min="2"
                    onChange={(event) => setSeedPlayerCount(event.target.value)}
                    type="number"
                    value={seedPlayerCount}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          <Button
            className="md:col-span-2"
            disabled={createTournament.isPending}
            type="submit"
          >
            <Plus className="size-4" /> Publish tournament
          </Button>
        </form>
      </section>

      <section className="bg-card rounded-2xl border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Calendar className="text-primary size-5" /> Tournaments
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Review the events attached to this organization and jump into the
              operational views.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {data.events.map((item) => (
            <div className="rounded-lg border p-4" key={item.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-bold">{item.name}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(item.startsAt).toLocaleString()} ·{" "}
                    {item.eventType.replaceAll("_", " ")} · {item.status}
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
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
                  {isPlatformAdmin ? (
                    <Button
                      className="text-primary border-primary/40 hover:bg-primary/10 cursor-pointer gap-1 rounded-md"
                      disabled={seedDemo.isPending}
                      onClick={() => seedDemo.mutate(item.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Sparkles className="size-3.5" />
                      Seed Demo Bracket
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {data.events.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
              No tournaments are attached to this organization yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="bg-card rounded-2xl border p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <FileVideo className="text-primary size-4" /> Organization content
          </h2>
          <textarea
            aria-label="Organization post"
            className="bg-background mt-4 min-h-24 w-full rounded-lg border p-3 text-sm"
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
        <div className="bg-card rounded-2xl border p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <CreditCard className="text-primary size-4" /> Payments
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
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
