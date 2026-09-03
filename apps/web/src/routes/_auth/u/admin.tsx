import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Skeleton } from "@rallycaststv/ui/components/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, StatCard } from "@/components/rally/cards";
import {
  useAdminDashboard,
  useProfile,
  useRunSearchBackfill,
} from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/admin")({
  component: AdminDashboardPage,
});

const formatNumber = (value: number | undefined) =>
  new Intl.NumberFormat("en").format(value ?? 0);

const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
};

function AdminSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <Skeleton className="h-36 rounded-lg" />
      <div className="grid gap-4 md:grid-cols-4">
        {["users", "content", "search", "activity"].map((key) => (
          <Skeleton key={key} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}

function StatusBreakdown({
  label,
  rows,
}: {
  label: string;
  rows: Record<string, number>;
}) {
  const entries = Object.entries(rows);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records yet.</p>
        ) : (
          entries.map(([status, count]) => (
            <div
              className="flex items-center justify-between gap-4 text-sm"
              key={status}
            >
              <span className="capitalize text-muted-foreground">
                {status.replaceAll("_", " ")}
              </span>
              <span className="font-semibold">{formatNumber(count)}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AdminDashboardPage() {
  const { data: profileData, isLoading: isProfileLoading } = useProfile();
  const isPlatformAdmin = profileData?.isPlatformAdmin ?? false;
  const { data, isLoading } = useAdminDashboard(isPlatformAdmin);
  const searchBackfill = useRunSearchBackfill();

  const runBackfill = () => {
    searchBackfill.mutate(undefined, {
      onError: () => toast.error("Could not queue the search rebuild."),
      onSuccess: (result) => {
        const queuedTotal = Object.values(result.queued).reduce(
          (total, count) => total + count,
          0
        );
        toast.success(`Queued ${queuedTotal} search documents.`);
      },
    });
  };

  if (isProfileLoading || (isPlatformAdmin && isLoading)) {
    return <AdminSkeleton />;
  }

  if (!isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          message="Your account is signed in, but it is not configured as a RallyCasts platform admin."
          title="Admin access required"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<AlertTriangle className="size-5" />}
          message="The admin dashboard could not load. Try refreshing once the API is healthy."
          title="Admin data unavailable"
        />
      </div>
    );
  }

  const contentTotal =
    data.totals.videos +
    data.totals.events +
    data.totals.venues +
    data.totals.organizations;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-primary">Platform Admin</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
              RallyCasts operating room
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Watch the onboarding funnel, content inventory, system readiness,
              and search index health before the public launch data reset.
            </p>
          </div>
          <Button
            className="rounded-md"
            disabled={
              searchBackfill.isPending || !data.health.searchBackfillReady
            }
            onClick={runBackfill}
          >
            <RefreshCw className="size-4" />
            Rebuild Search Index
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users className="size-5" />}
          label="Users"
          trend={`${formatNumber(data.totals.newUsers24h)} new in 24h`}
          value={formatNumber(data.totals.users)}
        />
        <StatCard
          icon={<CheckCircle2 className="size-5" />}
          label="Onboarded"
          trend={`${formatNumber(data.users.pendingOnboarding)} pending`}
          value={formatNumber(data.users.onboarded)}
        />
        <StatCard
          icon={<Database className="size-5" />}
          label="Content Records"
          trend={`${formatNumber(data.totals.venues)} venues`}
          value={formatNumber(contentTotal)}
        />
        <StatCard
          icon={<Search className="size-5" />}
          label="Search Documents"
          trend={`${formatNumber(data.search.queuedForEmbedding)} need embeddings`}
          value={formatNumber(data.search.documents)}
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Launch Readiness</CardTitle>
            <CardDescription>
              Core services and data areas to watch while testing production.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              ["Gemini embeddings", data.health.geminiConfigured],
              ["Vector search index", data.health.searchIndexConfigured],
              ["Search rebuild action", data.health.searchBackfillReady],
              ["API version", data.health.apiVersion === "v1"],
            ].map(([label, healthy]) => (
              <div
                className="flex items-center justify-between rounded-lg border border-border p-4"
                key={String(label)}
              >
                <span className="text-sm font-medium">{label}</span>
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  {healthy ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : (
                    <AlertTriangle className="size-4 text-destructive" />
                  )}
                  {healthy ? "Ready" : "Needs setup"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Search Index</CardTitle>
            <CardDescription>
              Gemini Embedding 2 documents queued for discovery and feed
              ranking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground">Pending</p>
                <p className="mt-1 text-xl font-bold">
                  {formatNumber(data.search.pending)}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground">Failed</p>
                <p className="mt-1 text-xl font-bold">
                  {formatNumber(data.search.failed)}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground">Total</p>
                <p className="mt-1 text-xl font-bold">
                  {formatNumber(data.search.documents)}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 font-semibold">Embedding models</p>
              {Object.entries(data.search.embeddingModels).length === 0 ? (
                <p className="text-muted-foreground">No embeddings yet.</p>
              ) : (
                Object.entries(data.search.embeddingModels).map(
                  ([model, count]) => (
                    <div
                      className="flex items-center justify-between gap-4"
                      key={model}
                    >
                      <span className="truncate text-muted-foreground">
                        {model}
                      </span>
                      <span className="font-semibold">
                        {formatNumber(count)}
                      </span>
                    </div>
                  )
                )
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusBreakdown label="Videos" rows={data.statusBreakdown.videos} />
        <StatusBreakdown label="Events" rows={data.statusBreakdown.events} />
        <StatusBreakdown
          label="Casting Requests"
          rows={data.statusBreakdown.castingJobs}
        />
        <StatusBreakdown
          label="Challenges"
          rows={data.statusBreakdown.challenges}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              The quickest signal for onboarding quality after a data reset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <div className="grid gap-3">
                {data.recentUsers.map((record) => (
                  <div
                    className="flex flex-col gap-1 rounded-lg border border-border p-3 md:flex-row md:items-center md:justify-between"
                    key={record.id}
                  >
                    <div>
                      <p className="font-semibold">{record.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.email}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground md:text-right">
                      <p className="capitalize">
                        {record.onboardingStatus.replaceAll("_", " ")}
                      </p>
                      <p>{formatDateTime(record.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Activity Inventory</CardTitle>
            <CardDescription>
              Counts that help decide whether test data should stay or reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {[
              ["Organizations", data.totals.organizations],
              ["Events", data.totals.events],
              ["Event registrations", data.totals.eventRegistrations],
              ["Casting requests", data.totals.castingJobs],
              ["Challenges", data.totals.challenges],
              ["Notifications", data.totals.notifications],
            ].map(([label, value]) => (
              <div
                className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0"
                key={label}
              >
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Activity className="size-4 text-primary" />
                  {label}
                </span>
                <span className="font-semibold">
                  {formatNumber(Number(value))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
