import * as Sentry from "@sentry/cloudflare";
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler from "@tanstack/react-start/server-entry";

export default Sentry.withSentry(
  (env: Record<string, unknown>) => ({
    dsn: env.SENTRY_DSN as string | undefined,
    enableLogs: true,
    tracesSampleRate: 1,
  }),
  // @ts-expect-error - handler is not typed as a Cloudflare handler
  wrapFetchWithSentry(handler)
);
