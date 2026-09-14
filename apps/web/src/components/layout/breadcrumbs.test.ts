import { describe, expect, it } from "vitest";

import { breadcrumbLabels, getVisiblePathnames, humanize } from "./breadcrumbs";

describe("breadcrumbs", () => {
  it("maps /events/organizers to hosts", () => {
    expect(breadcrumbLabels.get("/events/organizers")).toBe("hosts");
    expect(breadcrumbLabels.get("/organizers")).toBe("hosts");
  });

  it("omits /events and shows only /events/organizers on the organizers index", () => {
    const visible = getVisiblePathnames(["/", "/events", "/events/organizers"]);
    expect(visible).toEqual(["/events/organizers"]);
  });

  it("omits /events and shows hosts > [slug] on an organizer profile", () => {
    const visible = getVisiblePathnames([
      "/",
      "/events",
      "/events/organizers",
      "/events/organizers/rallycasts",
    ]);
    expect(visible).toEqual([
      "/events/organizers",
      "/events/organizers/rallycasts",
    ]);
  });

  it("injects /events/organizers when navigating to /events/organizers/new", () => {
    const visible = getVisiblePathnames(["/", "/events/organizers/new"]);
    expect(visible).toEqual(["/events/organizers", "/events/organizers/new"]);
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
