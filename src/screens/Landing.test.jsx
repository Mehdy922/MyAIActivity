import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Landing } from "./Landing.jsx";

describe("Landing", () => {
  it("asks teacher or student and reports the choice", () => {
    const onChoose = vi.fn();
    render(<Landing onChoose={onChoose} />);
    expect(screen.getByText(/Are you a teacher or a student\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Teacher/ }));
    expect(onChoose).toHaveBeenCalledWith("teacher");
    fireEvent.click(screen.getByRole("button", { name: /Student/ }));
    expect(onChoose).toHaveBeenCalledWith("student");
  });
});
