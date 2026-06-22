import { Button } from "@rallycaststv/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Calendar, MapPin, Swords, Video } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/_auth/u/challenges")({
  component: ChallengesPage,
});

function ChallengesPage() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryFn: () => readApiJson(apiClient.api.challenges.me.$get()),
    queryKey: ["challenges", "me"],
  });
  const respond = useMutation({
    mutationFn: ({
      id,
      response,
    }: {
      id: string;
      response: "accepted" | "declined" | "cancelled";
    }) =>
      readApiJson(
        apiClient.api.challenges[":id"].respond.$patch({
          json: { response },
          param: { id },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["challenges", "me"] });
      toast.success("Challenge updated");
    },
  });
  const challenges = data?.challenges ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Head-to-head play
        </p>
        <h1 className="text-3xl font-black">Match challenges</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set the park, court, time, coverage, cost split, and caster tip before
          anyone commits.
        </p>
      </header>
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : null}
      <div className="space-y-4">
        {challenges.map(({ challenge, venue }) => {
          const incoming = challenge.challengedUserId === session?.user?.id;
          return (
            <article
              className="rounded-2xl border bg-card p-5"
              key={challenge.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 font-bold capitalize">
                    <Swords className="size-4 text-primary" />{" "}
                    {challenge.matchMode ?? "singles"} challenge
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-4" />{" "}
                    {challenge.venueLabel ?? venue?.name ?? "Park TBD"} ·{" "}
                    {challenge.courtLabel ?? "Court TBD"}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="size-4" />{" "}
                    {challenge.scheduledAt
                      ? new Date(challenge.scheduledAt).toLocaleString()
                      : "Time TBD"}
                  </p>
                  {challenge.isCasted ? (
                    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                      <Video className="size-4" /> Caster requested ·{" "}
                      {challenge.castingSplitMode?.replaceAll("_", " ")} · $
                      {(challenge.casterTipCents / 100).toFixed(2)} tip
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold capitalize text-primary">
                  {challenge.status}
                </span>
              </div>
              {challenge.message ? (
                <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
                  “{challenge.message}”
                </p>
              ) : null}
              {incoming && challenge.status === "issued" ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() =>
                      respond.mutate({ id: challenge.id, response: "accepted" })
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() =>
                      respond.mutate({ id: challenge.id, response: "declined" })
                    }
                    variant="outline"
                  >
                    Decline
                  </Button>
                </div>
              ) : null}
              {!incoming && challenge.status === "issued" ? (
                <Button
                  className="mt-4"
                  onClick={() =>
                    respond.mutate({ id: challenge.id, response: "cancelled" })
                  }
                  variant="outline"
                >
                  Cancel challenge
                </Button>
              ) : null}
            </article>
          );
        })}
        {challenges.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <Swords className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-bold">No challenges yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a player profile to issue your first challenge.
            </p>
            <Link to="/players">
              <Button className="mt-4">Find players</Button>
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
