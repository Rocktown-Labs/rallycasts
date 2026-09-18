import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DateOfBirthPicker } from "./dob-picker";

afterEach(() => {
  cleanup();
});

describe("DateOfBirthPicker", () => {
  it("renders month, day, and year dropdowns by default", () => {
    const onChange = vi.fn();
    render(<DateOfBirthPicker onChange={onChange} value="" />);

    expect(screen.getByText("Date of Birth")).toBeTruthy();
    expect(screen.getByLabelText("Birth Month")).toBeTruthy();
    expect(screen.getByLabelText("Birth Day")).toBeTruthy();
    expect(screen.getByLabelText("Birth Year")).toBeTruthy();
  });

  it("calculates player age and displays eligibility for valid birth dates", () => {
    const onChange = vi.fn();
    render(<DateOfBirthPicker onChange={onChange} value="05/14/1995" />);

    expect(screen.getByText(/Eligible RallyCasts player/iu)).toBeTruthy();
  });

  it("displays underage warning when player is under 13", () => {
    const onChange = vi.fn();
    // 5 years ago
    const currentYear = new Date().getFullYear();
    const underageYear = currentYear - 5;
    render(
      <DateOfBirthPicker onChange={onChange} value={`01/01/${underageYear}`} />
    );

    expect(
      screen.getByText(/Players must be at least 13 years old/iu)
    ).toBeTruthy();
  });

  it("switches to text mode and formats input correctly", () => {
    const onChange = vi.fn();
    render(<DateOfBirthPicker onChange={onChange} value="" />);

    const toggleBtn = screen.getByText("Type MM/DD/YYYY instead");
    fireEvent.click(toggleBtn);

    const textInput = screen.getByPlaceholderText("MM/DD/YYYY");
    expect(textInput).toBeTruthy();

    fireEvent.change(textInput, { target: { value: "10241996" } });
    expect(onChange).toHaveBeenCalledWith("10/24/1996");
  });
});
