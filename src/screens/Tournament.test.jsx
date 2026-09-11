import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let modelsValue = {};
vi.mock("../rooms/hooks.js", () => ({ useModels: () => ({ value: modelsValue, loading: false }) }));

import { Tournament } from "./Tournament.jsx";

const signNet = { nIn: 1, nHid: 1, W1: [[10]], b1: [0], W2: [10], b2: 0 };
const tests = [{ pix: [1], label: 1 }, { pix: [-1], label: 0 }];
const mk = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`t${i}`, { model: signNet, tests, own: 1 }]));
const teams = { t0: { name: "Zero" }, t1: { name: "One" }, t2: { name: "Two" }, t3: { name: "Three" } };
const props = { code: "ABCDE", teams, labels: ["Mango", "Cricket ball"], team: { id: "t1", name: "One" }, isTeacher: false };

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
