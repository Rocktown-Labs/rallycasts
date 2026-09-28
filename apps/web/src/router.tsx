import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

import { CourtError } from "./components/layout/court-error";
import Loader from "./components/loader";
import {
  isModuleLoadError,
  shouldReloadForNewDeploy,
} from "./lib/deploy-stability";
import { routeTree } from "./routeTree.gen";

const DefaultRouteError = ({ error, reset }: ErrorComponentProps) => {
  useEffect(() => {
    // A deploy swaps hashed chunks under tabs that are already open. A route
    // chunk that fails to load is stale, and one hard reload picks up the
    // new manifest. Guarded so a broken deployment cannot reload-loop.
    if (isModuleLoadError(error) && shouldReloadForNewDeploy()) {
      window.location.reload();
    }
  }, [error]);

  return <CourtError error={error} reset={reset} />;
};

export const getRouter = () => {
  const router = createTanStackRouter({
    context: {},
    defaultErrorComponent: DefaultRouteError,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    defaultPendingComponent: () => <Loader />,
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });

  if (!router.isServer) {
    Sentry.addIntegration(
      Sentry.tanstackRouterBrowserTracingIntegration(router)
    );
  }

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
