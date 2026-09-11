import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const api = {
  setLabels: vi.fn(() => Promise.resolve()),
  setTeamCap: vi.fn(() => Promise.resolve()),
  setMaxTeams: vi.fn(() => Promise.resolve()),
  resetBoard: vi.fn(() => Promise.resolve()),
  closeRoom: vi.fn(() => Promise.resolve()),
};
vi.mock("../rooms/api.js", () => ({
  setLabels: (...a) => api.setLabels(...a),
  setTeamCap: (...a) => api.setTeamCap(...a),
  setMaxTeams: (...a) => api.setMaxTeams(...a),
  resetBoard: (...a) => api.resetBoard(...a),
  closeRoom: (...a) => api.closeRoom(...a),
  MAX_TEAMS_MIN: 2,
  MAX_TEAMS_MAX: 20,
}));

import { Settings } from "./Settings.jsx";

const base = { code: "ABCDE", flash: () => {} };

describe("Settings max teams", () => {
  it("shows the current limit and sets a new one", () => {
    render(<Settings {...base} meta={{ labels: ["Mango", "Cricket ball"], teamCap: 4, maxTeams: 6 }} />);
    const input = screen.getByLabelText("Max teams");
    expect(input.value).toBe("6");
    fireEvent.change(input, { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Set max teams" }));
    expect(api.setMaxTeams).toHaveBeenCalledWith({ code: "ABCDE", maxTeams: "8" });
  });
  it("blank means no limit", () => {
    render(<Settings {...base} meta={{ labels: ["Mango", "Cricket ball"], teamCap: 4 }} />);
    const input = screen.getByLabelText("Max teams");
    expect(input.value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Set max teams" }));
    expect(api.setMaxTeams).toHaveBeenCalledWith({ code: "ABCDE", maxTeams: "" });
  });
});

describe("Settings", () => {
  it("keeps a half-typed team cap when an unrelated meta snapshot arrives", () => {
    const meta1 = { labels: ["Mango", "Cricket ball"], teamCap: 4, phase: "lobby" };
    const { rerender } = render(<Settings {...base} meta={meta1} />);
    fireEvent.change(screen.getByLabelText("Team cap"), { target: { value: "6" } });
    // new snapshot: same values, new array identity, phase changed
    const meta2 = { labels: ["Mango", "Cricket ball"], teamCap: 4, phase: "teach" };
    rerender(<Settings {...base} meta={meta2} />);
    expect(screen.getByLabelText("Team cap").value).toBe("6");
  });
  it("resyncs a field when its value actually changes remotely", () => {
    const { rerender } = render(<Settings {...base} meta={{ labels: ["Mango", "Cricket ball"], teamCap: 4 }} />);
    rerender(<Settings {...base} meta={{ labels: ["Sun", "Flower"], teamCap: 4 }} />);
    expect(screen.getByLabelText("First thing").value).toBe("Sun");
    expect(screen.getByLabelText("Second thing").value).toBe("Flower");
  });
});
