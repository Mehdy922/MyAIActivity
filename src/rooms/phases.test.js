import { describe, it, expect } from "vitest";
import { PHASES, TABS, visibleTabs, nextPhase, PHASE_ACTIONS } from "./phases.js";

const keys = (tabs) => tabs.map((t) => t.key);

describe("phases", () => {
  it("has four phases in order", () => {
    expect(PHASES).toEqual(["lobby", "teach", "reveal", "fence"]);
  });
  it("nextPhase walks forward and stops", () => {
    expect(nextPhase("lobby")).toBe("teach");
    expect(nextPhase("teach")).toBe("reveal");
    expect(nextPhase("reveal")).toBe("fence");
    expect(nextPhase("fence")).toBeNull();
    expect(nextPhase("bogus")).toBeNull();
  });
  it("has an action label for every non-final phase", () => {
    expect(Object.keys(PHASE_ACTIONS).sort()).toEqual(["lobby", "reveal", "teach"]);
  });
});

describe("visibleTabs", () => {
  it("teacher always sees every tab plus settings", () => {
    for (const p of PHASES) {
      expect(keys(visibleTabs("teacher", p))).toEqual(["lobby", "teach", "tournament", "fence", "settings"]);
    }
  });
  it("student sees tabs gated by phase", () => {
    expect(keys(visibleTabs("student", "lobby"))).toEqual(["lobby"]);
    expect(keys(visibleTabs("student", "teach"))).toEqual(["lobby", "teach"]);
    expect(keys(visibleTabs("student", "reveal"))).toEqual(["lobby", "teach", "tournament"]);
    expect(keys(visibleTabs("student", "fence"))).toEqual(["lobby", "teach", "tournament", "fence"]);
  });
  it("student with unknown phase sees only lobby", () => {
    expect(keys(visibleTabs("student", undefined))).toEqual(["lobby"]);
  });
  it("TABS carry emoji and labels", () => {
    TABS.forEach((t) => { expect(t.emoji).toBeTruthy(); expect(t.label).toBeTruthy(); });
  });
});
