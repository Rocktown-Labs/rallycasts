import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import ProfileTabs from "@/components/profile/profile-tabs";
import { StatCard, studioStats } from "@/components/rally/cards";
import { useProfile, useUpdateProfile } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/profile/me")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data } = useProfile();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState({
    bio: "",
    homeCity: "",
    homeState: "",
  });
  const user = data?.user;
  const profile = data?.profile;

  useEffect(() => {
    if (profile) {
      setForm({
        bio: profile.bio ?? "",
        homeCity: profile.homeCity ?? "",
        homeState: profile.homeState ?? "",
      });
    }
  }, [profile]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Your RallyCasts Studio</h1>
        <ProfileTabs />
      </div>
      <div className="grid gap-6 xl:grid-cols-[.95fr_1.95fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div className="grid size-24 place-items-center rounded-full bg-muted text-xl">
              {user?.image ? (
                <img
                  alt=""
                  className="size-full rounded-full object-cover"
                  src={user.image}
                />
              ) : (
                user?.name?.at(0)
              )}
            </div>
            <h2 className="mt-5 text-xl font-bold">
              {user?.name ?? "RallyCasts Player"}
            </h2>
            <p className="text-muted-foreground">
              @{user?.username ?? user?.displayUsername ?? "player"}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-5 text-sm">
              Role: {profile?.isCaster ? "Caster" : "Player"}
            </p>
            <Button className="mt-5 rounded-md text-xs" variant="outline">
              <Pencil className="size-4" />
              Change Photo
            </Button>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {studioStats.slice(0, 3).map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateProfile.mutate(form);
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="home-city">City</Label>
                    <Input
                      id="home-city"
                      value={form.homeCity}
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          homeCity: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="home-state">State</Label>
                    <Input
                      id="home-state"
                      value={form.homeState}
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          homeState: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    aria-label="Bio"
                    id="bio"
                    className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Tell us about yourself..."
                    value={form.bio}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        bio: event.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  className="w-fit rounded-md text-xs"
                  disabled={updateProfile.isPending}
                >
                  <Camera className="size-4" />
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
