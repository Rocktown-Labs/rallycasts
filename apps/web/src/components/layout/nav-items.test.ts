import { Settings } from "lucide-react";
import { describe, expect, it } from "vitest";

import { accountNavItems, mobileAccountItems } from "./nav-items";

describe("account navigation", () => {
  it("links casting requests to the current casts route", () => {
    expect(accountNavItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Casting Requests",
          to: "/u/casts/all",
        }),
      ])
    );
    expect(mobileAccountItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Requests", to: "/u/casts/all" }),
      ])
    );
    expect(accountNavItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Dashboard", to: "/u/me" }),
      ])
    );
    expect(mobileAccountItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Dashboard", to: "/u/me" }),
      ])
    );
  });

  it("does not expose legacy recording request routes", () => {
    const routes = [...accountNavItems, ...mobileAccountItems].map(
      (item) => item.to
    );

    expect(routes).not.toContain("/u/recording-requests/all");
    expect(routes).not.toContain("/u/recording-requests/me");
  });

  it("does not expose the merged videos and profile routes", () => {
    const routes = [...accountNavItems, ...mobileAccountItems].map(
      (item) => item.to
    );

    // The videos library merged into Studio, and profile editing merged
    // into Settings.
    expect(routes).not.toContain("/u/videos");
    expect(routes).not.toContain("/u/profile");
  });

  it("keeps settings as the last account nav item", () => {
    const last = accountNavItems.at(-1);

    expect(last).toEqual({
      icon: Settings,
      label: "Settings",
      to: "/u/settings",
    });
  });
});
