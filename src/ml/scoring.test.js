import { describe, it, expect } from "vitest";
import { buildTournamentTable, tableAverages, MIN_TEAMS_TO_SHOW, MIN_TEAMS_MEANINGFUL } from "./scoring.js";

// 1-input, 1-hidden nets with hand-set weights.
const signNet = { nIn: 1, nHid: 1, W1: [[10]], b1: [0], W2: [10], b2: 0 };   // x>0 -> 1
const flipNet = { nIn: 1, nHid: 1, W1: [[10]], b1: [0], W2: [-10], b2: 0 };  // x>0 -> 0
const tests = [{ pix: [1], label: 1 }, { pix: [-1], label: 0 }];

const models = {
  tA: { model: signNet, tests, own: 1 },
  tB: { model: signNet, tests, own: 0.9 },
  tC: { model: flipNet, tests, own: 0.5 },
};
const teams = { tA: { name: "Aloo" }, tB: { name: "Bhindi" } };

describe("buildTournamentTable", () => {
  it("scores each model on the other teams' tests and sorts by cross desc", () => {
    const rows = buildTournamentTable(models, teams);
    expect(rows.map((r) => r.teamId)).toEqual(["tA", "tB", "tC"]);
    expect(rows[0].cross).toBe(1);
    expect(rows[1].cross).toBe(1);
    expect(rows[2].cross).toBe(0);
    rows.forEach((r) => expect(r.n).toBe(4));
  });
  it("uses team names and falls back for deleted teams", () => {
    const rows = buildTournamentTable(models, teams);
    expect(rows.find((r) => r.teamId === "tA").name).toBe("Aloo");
    expect(rows.find((r) => r.teamId === "tC").name).toBe("Unknown team");
  });
  it("gives cross null and n 0 for a single team", () => {
    const rows = buildTournamentTable({ tA: models.tA }, teams);
    expect(rows).toHaveLength(1);
    expect(rows[0].cross).toBeNull();
    expect(rows[0].n).toBe(0);
  });
  it("returns [] for no models", () => {
    expect(buildTournamentTable(null, teams)).toEqual([]);
    expect(buildTournamentTable({}, teams)).toEqual([]);
  });
});

describe("tableAverages", () => {
  it("averages own and cross, ignoring nulls", () => {
    const rows = buildTournamentTable(models, teams);
    const a = tableAverages(rows);
    expect(a.count).toBe(3);
    expect(a.avgOwn).toBeCloseTo((1 + 0.9 + 0.5) / 3, 6);
    expect(a.avgCross).toBeCloseTo(2 / 3, 6);
  });
  it("returns nulls for empty", () => {
    expect(tableAverages([])).toEqual({ avgOwn: null, avgCross: null, count: 0 });
  });
});

describe("thresholds", () => {
  it("are 2 and 4", () => {
    expect(MIN_TEAMS_TO_SHOW).toBe(2);
    expect(MIN_TEAMS_MEANINGFUL).toBe(4);
  });
});
