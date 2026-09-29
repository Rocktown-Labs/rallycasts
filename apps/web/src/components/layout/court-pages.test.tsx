import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CourtError } from "./court-error";
import { CourtNotFound } from "./court-not-found";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("CourtNotFound", () => {
  it("renders pickleball-themed 404 messaging and action links", () => {
    render(<CourtNotFound />);

    expect(screen.getByText("Ball Out of Bounds")).toBeTruthy();
    expect(screen.getByText(/404 • Out of Bounds/iu)).toBeTruthy();
    expect(screen.getByText("Back to Home Court")).toBeTruthy();
    expect(screen.getByText("Find Events")).toBeTruthy();
    expect(screen.getByText("Find Players")).toBeTruthy();
  });
});

describe("CourtError", () => {
  it("renders pickleball-themed recovery actions for runtime errors", () => {
    const onReset = vi.fn();
    render(
      <CourtError
        error={new Error("Failed to load match feed")}
        reset={onReset}
      />
    );

    expect(screen.getByText("Rain delay.")).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/our side of the net/iu)).toBeTruthy();
    expect(screen.getByText("Try Again")).toBeTruthy();
    expect(screen.getByText("Back to the Court")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("keeps technical details collapsed until requested", () => {
    render(<CourtError error={new Error("Failed to load match feed")} />);

    expect(screen.queryByText(/Failed to load match feed/iu)).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: /technical details/iu })
    );

    expect(screen.getByText(/Failed to load match feed/iu)).toBeTruthy();
  });

  it("renders specific account-linking instructions for account_not_linked errors", () => {
    render(
      <CourtError
        errorCode="account_not_linked"
        errorDescription="Account already exists"
      />
    );

    expect(screen.getByText("Already on the roster.")).toBeTruthy();
    expect(screen.getByText(/Sign in with your password first/iu)).toBeTruthy();
    expect(screen.getByText("Sign In")).toBeTruthy();
    expect(screen.getByText("Reset Password")).toBeTruthy();
  });
});
