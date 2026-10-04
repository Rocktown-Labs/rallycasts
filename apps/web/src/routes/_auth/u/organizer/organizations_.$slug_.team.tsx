import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

const TeamPage = () => <TeamPageRoute slug={Route.useParams().slug} />;

export const Route = createFileRoute(
  "/_auth/u/organizer/organizations_/$slug_/team"
)({
  component: TeamPage,
});

const getOrganization = (slug: string) =>
  readApiJson(apiClient.api.v1.hosts[":slug"].$get({ param: { slug } }));

const TeamPageRoute = ({ slug }: { slug: string }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryFn: () => getOrganization(slug),
    queryKey: ["organization", slug],
  });
  const [memberUsername, setMemberUsername] = useState("");

  const addMember = useMutation({
    mutationFn: (username: string) =>
      readApiJson(
        apiClient.api.v1.hosts[":slug"].members.$post({
          json: { role: "editor", username },
          param: { slug },
        })
      ),
    onSuccess: async () => {
      setMemberUsername("");
      await queryClient.invalidateQueries({ queryKey: ["organization", slug] });
      toast.success("Team member added");
    },
  });

  if (isLoading || !data?.organization) {
    return <div className="bg-muted h-64 animate-pulse rounded-xl" />;
  }

  const { members } = data;

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
            Host tools
          </p>
          <h1 className="text-3xl font-black">
            Team · {data.organization.name}
          </h1>
        </div>
        <Link params={{ slug }} to="/u/organizer/organizations/$slug">
          <Button className="rounded-lg" variant="outline">
            <ArrowLeft className="size-4" />
            Back to organization
          </Button>
        </Link>
      </header>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="text-primary size-5" />
            Add a team member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const username = memberUsername.trim();
              if (!username) {
                toast.error("Enter a player username first.");
                return;
              }
              addMember.mutate(username);
            }}
          >
            <Input
              aria-label="Player username"
              className="rounded-lg"
              onChange={(event) => setMemberUsername(event.target.value)}
              placeholder="Player username"
              value={memberUsername}
            />
            <Button
              className="rounded-lg"
              disabled={!memberUsername.trim() || addMember.isPending}
              type="submit"
            >
              {addMember.isPending ? "Adding…" : "Add editor"}
            </Button>
          </form>
          <p className="text-muted-foreground mt-2 text-xs">
            Team members with the editor role can publish and manage tournaments
            for this organization.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="text-primary size-5" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((member) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
              key={member.user.id}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  {member.user.name}
                  {member.role === "owner" ? (
                    <BadgeCheck className="text-primary size-4 shrink-0" />
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  @{member.user.username || member.user.id.slice(0, 8)}
                </p>
              </div>
              <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold capitalize">
                {member.role}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
};
