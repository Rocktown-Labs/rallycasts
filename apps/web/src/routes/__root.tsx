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
        title: "RallyCasts — Live Pickleball Streaming & Highlights",
      },
      {
        content:
          "Stream live pickleball matches in 4K, follow real-time scoreboards, track tournament brackets, and catch clutch highlights from courts near you.",
        name: "description",
      },
      // Open Graph
      {
        content: "RallyCasts — Live Pickleball Streaming & Highlights",
        property: "og:title",
      },
      {
        content:
          "Stream live pickleball from any court. 4K broadcasts, live scoreboards, tournament brackets, and clutch highlights.",
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
        content: "RallyCasts — Live Pickleball. Every Court. Live Scores.",
        property: "og:image:alt",
      },
      // Twitter Card
      {
        content: "summary_large_image",
        name: "twitter:card",
      },
      {
        content: "RallyCasts — Live Pickleball Streaming & Highlights",
        name: "twitter:title",
      },
      {
        content:
          "Stream live pickleball from any court. 4K broadcasts, live scoreboards, tournament brackets, and clutch highlights.",
        name: "twitter:description",
      },
      {
        content: "https://rallycasts.com/og-image.png",
        name: "twitter:image",
      },
      {
        content: "RallyCasts — Live Pickleball. Every Court. Live Scores.",
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
                "Live Pickleball Streaming, Real-time Scoreboards, and Highlights",
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
                "Community and broadcast network for live pickleball streaming and tournament coverage.",
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
