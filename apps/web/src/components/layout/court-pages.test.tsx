import { cleanup, render, screen } from "@testing-library/react";
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
  it("renders specific account-linking instructions for account_not_linked errors", () => {
    render(
      <CourtError
        errorCode="account_not_linked"
        errorDescription="Account already exists"
      />
    );

    expect(screen.getByText("Account Not Linked Yet")).toBeTruthy();
    expect(screen.getByText(/Account Linking Required/iu)).toBeTruthy();
    expect(screen.getByText("Sign In with Password")).toBeTruthy();
    expect(screen.getByText("Reset Password")).toBeTruthy();
    expect(
      screen.getByText(/please sign in with your email and password first/iu)
    ).toBeTruthy();
  });

  it("renders kitchen fault messaging for unexpected runtime errors", () => {
    const onReset = vi.fn();
    render(
      <CourtError
        error={new Error("Failed to load match feed")}
        reset={onReset}
      />
    );

    expect(screen.getByText("Foot Fault in the Kitchen")).toBeTruthy();
    expect(screen.getByText(/Court Fault Detected/iu)).toBeTruthy();
    expect(screen.getByText("Replay Point (Try Again)")).toBeTruthy();
    expect(screen.getByText("Back to Home Court")).toBeTruthy();
  });
});
