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

  it("offers to rejoin the last room", () => {
    const onRejoin = vi.fn();
    render(<Landing onChoose={vi.fn()} rejoinCode="ABCDE" onRejoin={onRejoin} />);
    fireEvent.click(screen.getByRole("button", { name: /Rejoin room ABCDE/ }));
    expect(onRejoin).toHaveBeenCalledWith("ABCDE");
  });

  it("does not offer a rejoin button without a rejoinCode", () => {
    render(<Landing onChoose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Rejoin room/ })).toBeNull();
  });
});
