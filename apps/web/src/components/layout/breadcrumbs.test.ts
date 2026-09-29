import { describe, expect, it } from "vitest";

import { breadcrumbLabels, getVisiblePathnames, humanize } from "./breadcrumbs";

describe("breadcrumbs", () => {
  it("maps the host namespaces to hosts", () => {
    expect(breadcrumbLabels.get("/events/hosts")).toBe("hosts");
    expect(breadcrumbLabels.get("/hosts")).toBe("hosts");
    expect(breadcrumbLabels.get("/organizers")).toBe("hosts");
    expect(breadcrumbLabels.get("/u/organizer")).toBe("host tools");
    expect(breadcrumbLabels.get("/u/organizer/organizations")).toBe(
      "organizations"
    );
  });

  it("omits /events and shows only /events/hosts on the hosts index", () => {
    const visible = getVisiblePathnames(["/", "/events", "/events/hosts"]);
    expect(visible).toEqual(["/events/hosts"]);
  });

  it("omits /events and shows hosts > [slug] on a host profile", () => {
    const visible = getVisiblePathnames([
      "/",
      "/events",
      "/events/hosts",
      "/events/hosts/rallycasts",
    ]);
    expect(visible).toEqual(["/events/hosts", "/events/hosts/rallycasts"]);
  });

  it("injects /events/hosts when navigating to /events/hosts/new", () => {
    const visible = getVisiblePathnames(["/", "/events/hosts/new"]);
    expect(visible).toEqual(["/events/hosts", "/events/hosts/new"]);
  });

  it("shows the host console crumbs for organization management", () => {
    const visible = getVisiblePathnames([
      "/",
      "/u",
      "/u/organizer",
      "/u/organizer/organizations",
      "/u/organizer/organizations/rallycasts",
      "/u/organizer/organizations/rallycasts/team",
    ]);
    expect(visible).toEqual([
      "/u/organizer",
      "/u/organizer/organizations",
      "/u/organizer/organizations/rallycasts",
      "/u/organizer/organizations/rallycasts/team",
    ]);
  });

  it("retains /events for standard event routes", () => {
    const eventIndex = getVisiblePathnames(["/", "/events"]);
    expect(eventIndex).toEqual(["/events"]);

    const eventDetail = getVisiblePathnames(["/", "/events", "/events/123"]);
    expect(eventDetail).toEqual(["/events", "/events/123"]);
  });

  it("humanizes hyphenated slugs", () => {
    expect(humanize("searcy-pickleball-club")).toBe("searcy pickleball club");
  });
});
