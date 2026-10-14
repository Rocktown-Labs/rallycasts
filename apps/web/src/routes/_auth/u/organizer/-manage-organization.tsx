import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CreditCard,
  FileVideo,
  ImageUp,
  Megaphone,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";
import { useImageUpload } from "@/lib/hooks/use-upload";

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
  const { organization } = data;
  const [name, setName] = useState(organization.name);
  const [city, setCity] = useState(organization.city ?? "");
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? "");
  const [state, setState] = useState(organization.state ?? "");
  const [bio, setBio] = useState(organization.bio ?? "");
  const [organizationPost, setOrganizationPost] = useState("");
  const { data: myVideosData } = useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.videos.me.$get()),
    queryKey: ["videos", "me"],
  });

  const uploadLogo = useImageUpload();
  // Local preview of the file the user just picked, so the selection is
  // visible (and looks like the future logo) before the upload completes.
  const [pendingLogo, setPendingLogo] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const pendingLogoUrlRef = useRef<string | null>(null);

  const clearPendingLogo = () => {
    if (pendingLogoUrlRef.current) {
      URL.revokeObjectURL(pendingLogoUrlRef.current);
      pendingLogoUrlRef.current = null;
    }
    setPendingLogo(null);
  };

  const showPendingLogo = (file: File) => {
    if (pendingLogoUrlRef.current) {
      URL.revokeObjectURL(pendingLogoUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    pendingLogoUrlRef.current = url;
    setPendingLogo({ name: file.name, url });
  };

  useEffect(
    () => () => {
      if (pendingLogoUrlRef.current) {
        URL.revokeObjectURL(pendingLogoUrlRef.current);
      }
    },
    []
  );
  const previewSrc = pendingLogo?.url ?? (logoUrl.trim() || null);

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
                {previewSrc ? (
                  <img
                    alt={
                      pendingLogo
                        ? "Selected logo preview"
                        : "Organization logo preview"
                    }
                    className="border-border size-12 rounded-lg border object-contain"
                    src={previewSrc}
                  />
                ) : null}
                <div className="flex flex-col">
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
                        if (!file) {
                          return;
                        }
                        showPendingLogo(file);
                        uploadLogo.mutate(file, {
                          onError: (error) => {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Could not upload the logo."
                            );
                          },
                          onSuccess: (result) => {
                            if (result.url) {
                              setLogoUrl(result.url);
                              clearPendingLogo();
                              toast.success(
                                "Logo uploaded. Save the profile to keep it."
                              );
                            }
                          },
                        });
                      }}
                      type="file"
                    />
                  </label>
                  {pendingLogo ? (
                    <span className="text-muted-foreground max-w-48 truncate text-xs">
                      {pendingLogo.name}
                    </span>
                  ) : null}
                </div>
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Calendar className="text-primary size-5" /> Tournaments
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Hosting happens in the Tournaments tab now: lists, brackets, and a
              dedicated create flow.
            </p>
          </div>
          <Link to="/u/organizer/tournaments/new">
            <Button className="rounded-lg">
              <Plus className="size-4" />
              Host a tournament
            </Button>
          </Link>
        </div>
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            Campaigns, creative previews, and budget top-ups live in the Ads
            tab.
          </p>
          <Link to="/u/organizer/ads">
            <Button className="rounded-lg" variant="outline">
              <Megaphone className="size-4" />
              Go to Ads
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
};
