import { Toaster } from "@rallycaststv/ui/components/sonner";
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { z } from "zod";

import AppShell from "@/components/layout/app-shell";
import { CourtError } from "@/components/layout/court-error";
import { CourtNotFound } from "@/components/layout/court-not-found";
import Providers from "@/components/providers";

import appCss from "../index.css?url";

export type RouterAppContext = Record<string, never>;

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,
  errorComponent: ({ error, reset }) => (
    <RootDocument>
      <CourtError error={error} reset={reset} />
    </RootDocument>
  ),
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
        name: "viewport",
      },
      {
        content: "#0a0a0a",
        name: "theme-color",
      },
      {
        content: "light dark",
        name: "color-scheme",
      },
      {
        title: "RallyCasts",
      },
    ],
  }),
  notFoundComponent: () => (
    <RootDocument>
      <CourtNotFound />
    </RootDocument>
  ),
  validateSearch: z.object({
    q: z.string().optional(),
  }),
});

function RootDocument({ children }: { children?: ReactNode } = {}) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <Toaster richColors />
        <TanStackRouterDevtools position="bottom-left" />
        <Scripts />
      </body>
    </html>
  );
}
