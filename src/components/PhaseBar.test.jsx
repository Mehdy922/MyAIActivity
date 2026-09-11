import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhaseBar } from "./PhaseBar.jsx";

describe("PhaseBar", () => {
  it("advances from lobby with a single button", () => {
    const onAdvance = vi.fn();
    render(<PhaseBar phase="lobby" round={1} onAdvance={onAdvance} onNextRound={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Start teaching/ }));
    expect(onAdvance).toHaveBeenCalledWith("teach");
    expect(screen.queryByRole("button", { name: /Next round/ })).toBeNull();
  });
  it("offers Next round and Open bendy fence at reveal", () => {
    const onAdvance = vi.fn(), onNextRound = vi.fn();
    render(<PhaseBar phase="reveal" round={1} onAdvance={onAdvance} onNextRound={onNextRound} />);
    fireEvent.click(screen.getByRole("button", { name: /Next round/ }));
    expect(onNextRound).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Open bendy fence/ }));
    expect(onAdvance).toHaveBeenCalledWith("fence");
  });
  it("shows the round number", () => {
    render(<PhaseBar phase="teach" round={2} onAdvance={() => {}} onNextRound={() => {}} />);
    expect(screen.getByText(/Round 2/)).toBeTruthy();
  });
  it("has no buttons at fence", () => {
    render(<PhaseBar phase="fence" round={1} onAdvance={() => {}} onNextRound={() => {}} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
