import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/_auth/organizers/new")({
  beforeLoad: () => {
    throw redirect({ to: "/events/hosts/new" });
  },
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/(^-|-$)/gu, "");

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [bio, setBio] = useState("");
  const createOrganization = useMutation({
    mutationFn: () => {
      const trimmedName = name.trim();
      const trimmedSlug = slug.trim();

      return readApiJson(
        apiClient.api.v1.hosts.$post({
          json: {
            bio: bio.trim() || undefined,
            city: city.trim() || undefined,
            name: trimmedName,
            slug: trimmedSlug,
            state: state.trim() || undefined,
          },
        })
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to create organization"
      );
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["hosts"] });
      toast.success("Organization created");
      await navigate({
        params: { slug: result.organization.slug },
        to: "/events/hosts/$slug/manage",
      });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!(name.trim() && slug.trim())) {
      toast.error("Name and slug are required.");
      return;
    }
    createOrganization.mutate();
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Organizer setup
        </p>
        <h1 className="mt-1 text-3xl font-black">Create an organization</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your player profile stays separate. This page becomes the public host
          identity for tournaments and content.
        </p>
      </div>
      <form
        className="space-y-5 rounded-2xl border bg-card p-6"
        onSubmit={submit}
      >
        <label className="block space-y-2" htmlFor="organization-name">
          <span className="text-sm font-semibold">Organization name</span>
          <Input
            aria-label="Organization name"
            id="organization-name"
            onChange={(event) => {
              setName(event.target.value);
              if (!slug || slug === slugify(name)) {
                setSlug(slugify(event.target.value));
              }
            }}
            placeholder="RallyCasts"
            value={name}
          />
        </label>
        <label className="block space-y-2" htmlFor="organization-slug">
          <span className="text-sm font-semibold">Public slug</span>
          <Input
            aria-label="Public organization slug"
            id="organization-slug"
            onChange={(event) => setSlug(slugify(event.target.value))}
            value={slug}
          />
          <span className="text-xs text-muted-foreground">
            rallycasts.com/events/hosts/{slug || "your-org"}
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            aria-label="City"
            onChange={(event) => setCity(event.target.value)}
            placeholder="City"
            value={city}
          />
          <Input
            aria-label="State"
            onChange={(event) => setState(event.target.value)}
            placeholder="State"
            value={state}
          />
        </div>
        <label className="block space-y-2" htmlFor="organization-bio">
          <span className="text-sm font-semibold">Bio</span>
          <textarea
            aria-label="Organization bio"
            id="organization-bio"
            className="min-h-28 w-full rounded-lg border bg-background p-3 text-sm"
            onChange={(event) => setBio(event.target.value)}
            placeholder="Tell players what you host."
            value={bio}
          />
        </label>
        <Button disabled={createOrganization.isPending} type="submit">
          Create organization
        </Button>
      </form>
    </main>
  );
}

export const CreateHostPage = CreateOrganizationPage;
