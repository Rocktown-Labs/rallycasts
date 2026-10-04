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
    queryFn: () => readApiJson(apiClient.api.v1.challenges.me.$get()),
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
        apiClient.api.v1.challenges[":id"].respond.$patch({
          json: { response },
          param: { id },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["challenges", "me"] });
      toast.success("Challenge updated");
    },
  });
  const reportResult = useMutation({
    mutationFn: ({
      id,
      result,
    }: {
      id: string;
      result: "draw" | "lost" | "won";
    }) =>
      readApiJson(
        apiClient.api.v1.challenges[":id"].result.$patch({
          json: { result },
          param: { id },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["challenges", "me"] });
      toast.success("Match result saved");
    },
  });
  const challenges = data?.challenges ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-7">
      <header>
        <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
          Head-to-head play
        </p>
        <h1 className="text-3xl font-black">Match challenges</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Set the park, court, time, coverage, cost split, and caster tip before
          anyone commits.
        </p>
      </header>
      {isLoading ? (
        <div className="bg-muted h-48 animate-pulse rounded-xl" />
      ) : null}
      <div className="space-y-4">
        {challenges.map(({ challenge, venue }) => {
          const incoming = challenge.challengedUserId === session?.user?.id;
          return (
            <article
              className="bg-card rounded-2xl border p-5"
              key={challenge.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 font-bold capitalize">
                    <Swords className="text-primary size-4" />{" "}
                    {challenge.matchMode ?? "singles"} challenge
                  </p>
                  <p className="text-muted-foreground mt-2 flex items-center gap-1 text-sm">
                    <MapPin className="size-4" />{" "}
                    {challenge.venueLabel ?? venue?.name ?? "Park TBD"} ·{" "}
                    {challenge.courtLabel ?? "Court TBD"}
                  </p>
                  <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                    <Calendar className="size-4" />{" "}
                    {challenge.scheduledAt
                      ? new Date(challenge.scheduledAt).toLocaleString()
                      : "Time TBD"}
                  </p>
                  {challenge.isCasted ? (
                    <p className="text-primary mt-2 flex items-center gap-1 text-xs font-semibold">
                      <Video className="size-4" /> Caster requested ·{" "}
                      {challenge.castingSplitMode?.replaceAll("_", " ")} · $
                      {(challenge.casterTipCents / 100).toFixed(2)} tip
                    </p>
                  ) : null}
                </div>
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-bold capitalize">
                  {challenge.result
                    ? `${challenge.status} · ${challenge.result}`
                    : challenge.status}
                </span>
              </div>
              {challenge.message ? (
                <p className="bg-muted mt-4 rounded-lg p-3 text-sm">
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
              {challenge.status === "accepted" ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs font-semibold">
                    Report result:
                  </span>
                  <Button
                    className="rounded-lg"
                    onClick={() =>
                      reportResult.mutate({
                        id: challenge.id,
                        result: incoming ? "lost" : "won",
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    I won
                  </Button>
                  <Button
                    className="rounded-lg"
                    onClick={() =>
                      reportResult.mutate({
                        id: challenge.id,
                        result: incoming ? "won" : "lost",
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    I lost
                  </Button>
                  <Button
                    className="rounded-lg"
                    onClick={() =>
                      reportResult.mutate({ id: challenge.id, result: "draw" })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Draw
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })}
        {challenges.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <Swords className="text-primary mx-auto size-8" />
            <p className="mt-3 font-bold">No challenges yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
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
