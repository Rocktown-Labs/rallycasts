import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dataCollection: {
    httpBodies: [],
    userInfo: false,
  },

  dsn: process.env.SENTRY_DSN,
  enableLogs: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 0.1,
});
