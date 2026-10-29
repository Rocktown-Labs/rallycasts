import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Link } from "@tanstack/react-router";
import { MapPin, Star, UserRound } from "lucide-react";

import type { useProfile } from "@/lib/hooks";

type ProfilePreviewData = ReturnType<typeof useProfile>["data"];

/**
 * Compact public-facing summary of the signed-in player, shown above the
 * profile editor on the settings page.
 */
export function ProfilePreview({ data }: { data: ProfilePreviewData }) {
  const user = data?.user;
  const profile =
    data?.profile && "homeCity" in data.profile ? data.profile : undefined;
  const displayName = user?.name || "RallyCasts Player";
  const username = user?.username || user?.displayUsername || "player";
  const homeLocation = [profile?.homeCity, profile?.homeState]
    .filter(Boolean)
    .join(", ");
  const roles = getProfileRoles(data);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserRound className="text-primary size-5" />
          Profile view
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[auto_1fr]">
        <ProfileAvatar displayName={displayName} image={user?.image} />
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                {displayName}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">@{username}</p>
            </div>
            <Link params={{ username }} to="/players/$username">
              <Button className="rounded-lg" variant="outline">
                Public preview
              </Button>
            </Link>
          </div>
          <ProfileMeta
            homeLocation={homeLocation}
            skillLevel={profile?.skillLevel}
          />
          <p className="max-w-2xl text-sm leading-relaxed">
            {profile?.bio ||
              "Add a bio below so players know your style, home court, and what kinds of games you like to play."}
          </p>
          <RoleBadges roles={roles} />
        </div>
      </CardContent>
    </Card>
  );
}

const getProfileRoles = (data: ProfilePreviewData) => {
  const profile = data?.profile;
  return [
    profile?.isPlayer === false ? null : "Player",
    profile?.isCaster ? "Caster" : null,
    profile?.isOrganizer ? "Organizer" : null,
  ];
};

function ProfileAvatar({
  displayName,
  image,
}: {
  displayName: string;
  image?: string | null;
}) {
  return (
    <div className="bg-muted flex size-24 items-center justify-center overflow-hidden rounded-full border text-3xl font-bold">
      {image ? (
        <img alt={displayName} className="size-full object-cover" src={image} />
      ) : (
        displayName.at(0)
      )}
    </div>
  );
}

function ProfileMeta({
  homeLocation,
  skillLevel,
}: {
  homeLocation: string;
  skillLevel?: string | null;
}) {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
      {homeLocation ? (
        <span className="inline-flex items-center gap-1">
          <MapPin className="text-primary size-4" />
          {homeLocation}
        </span>
      ) : null}
      {skillLevel ? (
        <span className="inline-flex items-center gap-1">
          <Star className="text-primary size-4" />
          {skillLevel} skill level
        </span>
      ) : null}
    </div>
  );
}

function RoleBadges({ roles }: { roles: (string | null)[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) =>
        role ? (
          <span
            className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold"
            key={role}
          >
            {role}
          </span>
        ) : null
      )}
    </div>
  );
}
