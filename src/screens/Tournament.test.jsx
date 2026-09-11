import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let modelsValue = {};
let roundsValue = null;
vi.mock("../rooms/hooks.js", () => ({
  useModels: () => ({ value: modelsValue, loading: false }),
  useRounds: () => ({ value: roundsValue, loading: false }),
}));

import { Tournament } from "./Tournament.jsx";

const signNet = { nIn: 1, nHid: 1, W1: [[10]], b1: [0], W2: [10], b2: 0 };
const tests = [{ pix: [1], label: 1 }, { pix: [-1], label: 0 }];
const mk = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`t${i}`, { model: signNet, tests, own: 1 }]));
const teams = { t0: { name: "Zero" }, t1: { name: "One" }, t2: { name: "Two" }, t3: { name: "Three" } };
const props = { code: "ABCDE", teams, labels: ["Mango", "Cricket ball"], team: { id: "t1", name: "One" }, isTeacher: false, round: 1 };

describe("Tournament rounds", () => {
  it("shows the round and per-team change against the previous round", () => {
    modelsValue = mk(4);
    roundsValue = { 1: { t0: { name: "Zero", own: 1, cross: 0.5 }, t1: { name: "One", own: 1, cross: 0.75 } } };
    render(<Tournament {...props} round={2} />);
    expect(screen.getAllByText(/Round 2/).length).toBeGreaterThan(0);
    expect(screen.getByText("▲ +50")).toBeTruthy();   // Zero: 0.5 → 1.0
    expect(screen.getByText("▲ +25")).toBeTruthy();   // One: 0.75 → 1.0
    expect(screen.getByText(/Round 1: 63%/)).toBeTruthy(); // history average of 0.5 and 0.75
  });
  it("shows no deltas in round 1", () => {
    modelsValue = mk(4);
    roundsValue = null;
    render(<Tournament {...props} round={1} />);
    expect(screen.queryByText(/▲|▼/)).toBeNull();
    expect(screen.queryByText(/Round 1:/)).toBeNull();
  });
});

describe("Tournament", () => {
  it("waits below two teams", () => {
    modelsValue = mk(1);
    render(<Tournament {...props} />);
    expect(screen.getByText(/Waiting for teams/)).toBeTruthy();
  });
  it("shows scores with a caution between two and three teams", () => {
    modelsValue = mk(3);
    render(<Tournament {...props} />);
    expect(screen.getByText(/at least 4 teams/i)).toBeTruthy();
    expect(screen.getByText(/Zero/)).toBeTruthy();
  });
  it("drops the caution at four teams and shows the questions", () => {
    modelsValue = mk(4);
    render(<Tournament {...props} />);
    expect(screen.queryByText(/at least 4 teams/i)).toBeNull();
    expect(screen.getByText(/So what did your machine actually learn/)).toBeTruthy();
    expect(screen.getByText(/Whose mistake was that\?/)).toBeTruthy();
  });
});
