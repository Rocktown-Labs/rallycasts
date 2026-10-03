import { env } from "@rallycaststv/env/web";
import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dataCollection: {
    httpBodies: [],
    userInfo: false,
  },

  dsn: env.VITE_SENTRY_DSN,
  enabled: Boolean(env.VITE_SENTRY_DSN),

  integrations: [
    Sentry.replayIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: "system",
    }),
  ],

  replaysOnErrorSampleRate: 1,

  replaysSessionSampleRate: 0.1,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production.
  // Learn more at https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1,
});
