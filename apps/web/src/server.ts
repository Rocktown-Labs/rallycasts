import * as Sentry from "@sentry/cloudflare";
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export default Sentry.withSentry(
  (env?: Record<string, unknown>) => ({
    dsn:
      (env?.SENTRY_DSN as string | undefined) ||
      "https://338f0301abd453229078af2d60600c0f@o4510278858309632.ingest.us.sentry.io/4511701810020352",
    enableLogs: true,
    tracesSampleRate: 1,
  }),
  // @ts-expect-error - handler is not typed as a Cloudflare handler
  createServerEntry(
    wrapFetchWithSentry({
      fetch(request: Request) {
        return handler.fetch(request);
      },
    })
  )
);
