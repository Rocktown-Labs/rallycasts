import * as Sentry from "@sentry/cloudflare";
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import {
  isStaticAssetRequest,
  staticAssetNotFoundResponse,
} from "./lib/deploy-stability";

export default Sentry.withSentry(
  (env?: Record<string, unknown>) => ({
    dsn: env?.SENTRY_DSN as string | undefined,
    enableLogs: Boolean(env?.SENTRY_DSN),
    tracesSampleRate: 0.1,
  }),
  createServerEntry(
    wrapFetchWithSentry({
      fetch(request: Request) {
        // Existing static assets never reach this code path, so this is a
        // stale or missing file (for example a tab open across a deploy).
        // Answer 404 instead of the SSR HTML document so browsers never try
        // to execute HTML as a JavaScript module.
        if (isStaticAssetRequest(request)) {
          return staticAssetNotFoundResponse();
        }
        return handler.fetch(request);
      },
    })
  )
);
