import * as Sentry from "@sentry/cloudflare";
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export default Sentry.withSentry(
  (env?: Record<string, unknown>) => ({
    dsn: env?.SENTRY_DSN as string | undefined,
    enableLogs: Boolean(env?.SENTRY_DSN),
    tracesSampleRate: 0.1,
  }),
  createServerEntry(
    wrapFetchWithSentry({
      fetch(request: Request) {
        return handler.fetch(request);
      },
    })
  )
);
