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
      {
        href: "/favicon.png",
        rel: "icon",
        type: "image/png",
      },
      {
        href: "/apple-touch-icon.png",
        rel: "apple-touch-icon",
      },
      {
        href: "https://rallycasts.com",
        rel: "canonical",
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
        content: "#090d12",
        name: "theme-color",
      },
      {
        content: "light dark",
        name: "color-scheme",
      },
      {
        title: "RallyCasts — The Social Home for Pickleball",
      },
      {
        content:
          "Connect with local pickleball players, find active open play courts, track tournament brackets, and share match highlights with your community.",
        name: "description",
      },
      // Open Graph
      {
        content: "RallyCasts — The Social Home for Pickleball",
        property: "og:title",
      },
      {
        content:
          "Discover local players, find active open courts, join tournaments, and share your best rallies with the pickleball community.",
        property: "og:description",
      },
      {
        content: "https://rallycasts.com",
        property: "og:url",
      },
      {
        content: "RallyCasts",
        property: "og:site_name",
      },
      {
        content: "website",
        property: "og:type",
      },
      {
        content: "https://rallycasts.com/og-image.png",
        property: "og:image",
      },
      {
        content: "https://rallycasts.com/og-image.png",
        property: "og:image:secure_url",
      },
      {
        content: "image/png",
        property: "og:image:type",
      },
      {
        content: "1200",
        property: "og:image:width",
      },
      {
        content: "630",
        property: "og:image:height",
      },
      {
        content:
          "RallyCasts — The Social Home for Pickleball. Discover players, active courts, tournaments, and match highlights.",
        property: "og:image:alt",
      },
      // Twitter Card
      {
        content: "summary_large_image",
        name: "twitter:card",
      },
      {
        content: "RallyCasts — The Social Home for Pickleball",
        name: "twitter:title",
      },
      {
        content:
          "Discover local players, find active open courts, join tournaments, and share your best rallies with the pickleball community.",
        name: "twitter:description",
      },
      {
        content: "https://rallycasts.com/og-image.png",
        name: "twitter:image",
      },
      {
        content:
          "RallyCasts — The Social Home for Pickleball. Discover players, active courts, tournaments, and match highlights.",
        name: "twitter:image:alt",
      },
    ],
    scripts: [
      {
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@id": "https://rallycasts.com/#website",
              "@type": "WebSite",
              description:
                "The social platform for pickleball. Discover local players, find active courts, join tournaments, and share highlights.",
              name: "RallyCasts",
              publisher: {
                "@id": "https://rallycasts.com/#organization",
              },
              url: "https://rallycasts.com",
            },
            {
              "@id": "https://rallycasts.com/#organization",
              "@type": "SportsOrganization",
              description:
                "The social platform and community for pickleball players, active courts, tournaments, and match highlights.",
              image: "https://rallycasts.com/og-image.png",
              logo: "https://rallycasts.com/rallycasts-icon.png",
              name: "RallyCasts",
              url: "https://rallycasts.com",
            },
          ],
        }),
        type: "application/ld+json",
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
