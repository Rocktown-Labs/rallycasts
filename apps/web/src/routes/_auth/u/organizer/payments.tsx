import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CreditCard } from "lucide-react";

import { useMyOrganizations } from "@/lib/hooks";
import {
  formatDollars,
  useOrganizerAnalytics,
} from "@/lib/hooks/use-organizer-analytics";

export const Route = createFileRoute("/_auth/u/organizer/payments")({
  component: () => <OrganizerPaymentsPage />,
});

const OrganizerPaymentsPage = () => {
  const { data: analytics, isLoading: analyticsLoading } =
    useOrganizerAnalytics();
  const { data: orgsData, isLoading: orgsLoading } = useMyOrganizations();
  const organizations = orgsData?.organizations ?? [];

  const totals = analytics?.totals;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
          Organizer Tools
        </p>
        <h1 className="mt-1 text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Entry-fee revenue and payout setup for your organizations. RallyCasts
          takes a 10% platform fee on entry fees; the rest lands in your
          connected account.
        </p>
      </header>

      {analyticsLoading || orgsLoading ? (
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
      ) : null}

      {!analyticsLoading && totals ? (
        <Card className="rounded-lg">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs font-semibold">
                Entry revenue (net)
              </p>
              <p className="mt-1 text-2xl font-extrabold">
                {formatDollars(totals.revenueCents)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Across {totals.registrations - totals.cancelledRegistrations}{" "}
                paid registrations
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold">
                Platform fee (10%)
              </p>
              <p className="mt-1 text-2xl font-extrabold">
                {formatDollars(Math.round(totals.revenueCents * 0.1))}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Deducted at settlement
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold">
                Your payout (est.)
              </p>
              <p className="mt-1 text-2xl font-extrabold">
                {formatDollars(
                  totals.revenueCents - Math.round(totals.revenueCents * 0.1)
                )}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                After fees, per your Stripe account
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!orgsLoading && organizations.length > 0 ? (
        <Card className="rounded-lg">
          <CardContent className="space-y-4">
            <h2 className="font-bold">Payout accounts</h2>
            {organizations.map(({ organization }) => {
              const status = (
                organization as { stripeOnboardingStatus?: string }
              ).stripeOnboardingStatus;
              const complete = status === "complete";
              return (
                <div
                  className="border-border flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                  key={organization.id}
                >
                  <div>
                    <p className="text-sm font-semibold">{organization.name}</p>
                    <p className="text-muted-foreground text-xs capitalize">
                      Stripe payouts:{" "}
                      {complete
                        ? "Connected"
                        : (status ?? "not set up").replaceAll("_", " ")}
                    </p>
                  </div>
                  <Link
                    params={{ slug: organization.slug }}
                    to="/u/organizer/organizations/$slug"
                  >
                    <Button
                      className="rounded-lg"
                      variant={complete ? "outline" : "default"}
                    >
                      <CreditCard className="size-4" />
                      {complete ? "Manage payouts" : "Set up payouts"}
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {!orgsLoading && organizations.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CreditCard className="text-muted-foreground size-10" />
            <p className="text-muted-foreground text-sm">
              Create an organization to connect a payout account.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
