import {
  useLinkSocial,
  useListAccounts,
  useUnlinkAccount,
} from "@better-auth-ui/react";
import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Link2, Unlink } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

const providerLabel = (providerId: string) => {
  if (providerId === "credential") {
    return "Email and password";
  }

  return providerId.charAt(0).toUpperCase() + providerId.slice(1);
};

const LinkedAccounts = () => {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const accounts = useListAccounts(authClient);
  const linkSocial = useLinkSocial(authClient, {
    onError: (error) => toast.error(getAuthErrorMessage(error)),
  });
  const unlinkAccount = useUnlinkAccount(authClient, {
    onError: (error) => toast.error(getAuthErrorMessage(error)),
    onSuccess: () => toast.success("Login method unlinked"),
  });

  if (isSessionPending || accounts.isPending) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Login methods</CardTitle>
          <CardDescription>Loading your linked accounts...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!session?.user || accounts.isError) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Login methods</CardTitle>
          <CardDescription>
            We could not load your linked login methods. Refresh and try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const linkedAccounts = accounts.data ?? [];
  const hasGoogle = linkedAccounts.some(
    (account) => account.providerId === "google"
  );
  const canUnlink = linkedAccounts.length > 1;

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="size-5 text-primary" /> Login methods
        </CardTitle>
        <CardDescription>
          Link Google to sign in without a password. We only allow unlinking
          when another login method remains available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {linkedAccounts.map((account) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
            key={account.id}
          >
            <div>
              <p className="text-sm font-semibold">
                {providerLabel(account.providerId)}
              </p>
              <p className="text-xs text-muted-foreground">
                {account.providerId === "credential"
                  ? "Your RallyCasts password"
                  : "Connected social account"}
              </p>
            </div>
            {account.providerId !== "credential" && (
              <Button
                disabled={!canUnlink || unlinkAccount.isPending}
                onClick={() =>
                  unlinkAccount.mutate({
                    accountId: account.accountId,
                    providerId: account.providerId,
                  })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <Unlink className="size-4" />
                Unlink
              </Button>
            )}
          </div>
        ))}

        {!hasGoogle && (
          <Button
            disabled={linkSocial.isPending}
            onClick={() =>
              linkSocial.mutate({
                callbackURL: new URL(
                  "/u/settings",
                  window.location.origin
                ).toString(),
                errorCallbackURL: new URL(
                  "/u/settings",
                  window.location.origin
                ).toString(),
                provider: "google",
              })
            }
            type="button"
          >
            <Link2 className="size-4" />
            {linkSocial.isPending ? "Connecting..." : "Link Google"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default LinkedAccounts;
