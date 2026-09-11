import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../rooms/api.js", () => ({
  setLabels: vi.fn(() => Promise.resolve()),
  setTeamCap: vi.fn(() => Promise.resolve()),
  resetBoard: vi.fn(() => Promise.resolve()),
  closeRoom: vi.fn(() => Promise.resolve()),
}));

import { Settings } from "./Settings.jsx";

const base = { code: "ABCDE", flash: () => {} };

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
