import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  dsn:
    process.env.SENTRY_DSN ||
    "https://338f0301abd453229078af2d60600c0f@o4510278858309632.ingest.us.sentry.io/4511701810020352",

  enableLogs: true,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production.
  // Learn more at https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1,
});
