import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrganizerSetupCard } from "./organizer-setup-card";
import { buildHostCategory } from "./setup-guide";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: () => ({
    location: { pathname: "/u/organizer" },
  }),
}));

afterEach(() => {
  cleanup();
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("buildHostCategory", () => {
  it("returns all 7 organization launch checklist items when no organization exists", () => {
    const category = buildHostCategory({
      firstOrgDetails: null,
      myEvents: [],
      myOrgs: [],
    });

    expect(category.items).toHaveLength(7);
    expect(category.items.map((i) => i.id)).toEqual([
      "org_create",
      "org_branding",
      "org_first_post",
      "org_team",
      "org_tournament",
      "org_payouts",
      "org_share",
    ]);

    const createItem = category.items.find((i) => i.id === "org_create");
    expect(createItem?.isComplete).toBe(false);
    expect(createItem?.actionLabel).toBe("Create Org");
    expect(createItem?.to).toBe("/events/hosts/new");
  });

  it("marks org_create complete when an organization exists and routes to group feed", () => {
    const category = buildHostCategory({
      firstOrgDetails: null,
      myEvents: [],
      myOrgs: [
        {
          organization: {
            id: "org-1",
            name: "Austin Pickleball Club",
            slug: "austin-pickleball",
          },
        },
      ],
    });

    const createItem = category.items.find((i) => i.id === "org_create");
    expect(createItem?.isComplete).toBe(true);
    expect(createItem?.actionLabel).toBe("View Hub");
    expect(createItem?.to).toBe("/events/hosts/austin-pickleball");
  });

  it("evaluates branding, posts, team members, tournaments, payouts, and community share dynamically", () => {
    const category = buildHostCategory({
      firstOrgDetails: {
        events: [{ id: "evt-1" }],
        members: [
          { role: "owner", user: { id: "user-1" } },
          { role: "admin", user: { id: "user-2" } },
        ],
        organization: {
          bio: "Premier club in Austin, TX",
          city: "Austin",
          id: "org-1",
          logoUrl: "https://rallycasts.com/logo.png",
          name: "Austin Pickleball Club",
          slug: "austin-pickleball",
          state: "TX",
          stripeOnboardingStatus: "complete",
        },
        posts: [{ id: "post-1" }],
      },
      myEvents: [{ id: "evt-1" }],
      myOrgs: [
        {
          organization: {
            bio: "Premier club in Austin, TX",
            city: "Austin",
            id: "org-1",
            logoUrl: "https://rallycasts.com/logo.png",
            name: "Austin Pickleball Club",
            slug: "austin-pickleball",
            state: "TX",
            stripeOnboardingStatus: "complete",
          },
        },
      ],
    });

    for (const item of category.items) {
      expect(item.isComplete).toBe(true);
    }
  });

  it("marks branding complete with bio and logo alone (no cover image field)", () => {
    const category = buildHostCategory({
      firstOrgDetails: null,
      myEvents: [],
      myOrgs: [
        {
          organization: {
            bio: "Premier club in Austin, TX",
            logoUrl: "https://media.rallycasts.com/images/abc.png",
            slug: "austin-pickleball",
          },
        },
      ],
    });

    const brandingItem = category.items.find((i) => i.id === "org_branding");
    expect(brandingItem?.isComplete).toBe(true);
    expect(brandingItem?.to).toBe(
      "/u/organizer/organizations/austin-pickleball"
    );
  });

  it("marks branding incomplete when the bio or logo is missing", () => {
    const category = buildHostCategory({
      firstOrgDetails: null,
      myEvents: [],
      myOrgs: [
        {
          organization: {
            logoUrl: "https://media.rallycasts.com/images/abc.png",
            slug: "austin-pickleball",
          },
        },
      ],
    });

    const brandingItem = category.items.find((i) => i.id === "org_branding");
    expect(brandingItem?.isComplete).toBe(false);
  });

  it("marks payouts incomplete when Stripe onboarding is not completed", () => {
    const category = buildHostCategory({
      firstOrgDetails: {
        organization: {
          slug: "austin-pickleball",
          stripeOnboardingStatus: "pending",
        },
      },
      myEvents: [],
      myOrgs: [
        {
          organization: {
            slug: "austin-pickleball",
            stripeOnboardingStatus: "pending",
          },
        },
      ],
    });

    const payoutsItem = category.items.find((i) => i.id === "org_payouts");
    expect(payoutsItem?.isComplete).toBe(false);
    expect(payoutsItem?.to).toBe("/u/organizer/payments");
  });
});

describe("OrganizerSetupCard", () => {
  it("renders the launch checklist and item actions", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OrganizerSetupCard
          events={[]}
          firstOrgDetails={null}
          organizations={[
            {
              organization: {
                id: "org-1",
                name: "Austin Pickleball Club",
                slug: "austin-pickleball",
              },
            },
          ]}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("Organization Launch Checklist")).toBeDefined();
    expect(screen.getByText("1/7 complete")).toBeDefined();
    expect(screen.getByText("Publish first group post")).toBeDefined();
    expect(screen.getByText("Invite co-hosts & admins")).toBeDefined();
  });
});
