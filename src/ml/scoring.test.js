import { describe, it, expect } from "vitest";
import { buildTournamentTable, tableAverages, withDeltas, historyAverages, MIN_TEAMS_TO_SHOW, MIN_TEAMS_MEANINGFUL } from "./scoring.js";

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

describe("withDeltas", () => {
  const rows = [
    { teamId: "tA", name: "Aloo", own: 1, cross: 0.75, n: 4 },
    { teamId: "tB", name: "Bhindi", own: 1, cross: 0.5, n: 4 },
    { teamId: "tC", name: "New", own: 1, cross: 0.6, n: 4 },
  ];
  it("attaches the previous round's cross score and the change", () => {
    const prev = { tA: { name: "Aloo", own: 1, cross: 0.5 }, tB: { name: "Bhindi", own: 1, cross: 0.6 } };
    const out = withDeltas(rows, prev);
    expect(out[0]).toMatchObject({ teamId: "tA", prevCross: 0.5 });
    expect(out[0].delta).toBeCloseTo(0.25, 9);
    expect(out[1].delta).toBeCloseTo(-0.1, 9);
    expect(out[2].prevCross).toBeNull();
    expect(out[2].delta).toBeNull();
  });
  it("leaves rows untouched when there is no previous round", () => {
    const out = withDeltas(rows, null);
    out.forEach((r) => { expect(r.prevCross).toBeNull(); expect(r.delta).toBeNull(); });
    expect(out).toHaveLength(3);
  });
});

describe("historyAverages", () => {
  it("averages cross per past round in round order", () => {
    const rounds = {
      2: { tA: { cross: 0.8 }, tB: { cross: 0.6 } },
      1: { tA: { cross: 0.5 }, tB: { cross: 0.5 }, tC: {} },
    };
    expect(historyAverages(rounds)).toEqual([
      { round: 1, avgCross: 0.5, count: 2 },
      { round: 2, avgCross: 0.7, count: 2 },
    ]);
  });
  it("is empty for no history", () => {
    expect(historyAverages(null)).toEqual([]);
    expect(historyAverages({})).toEqual([]);
  });
});

describe("thresholds", () => {
  it("are 2 and 4", () => {
    expect(MIN_TEAMS_TO_SHOW).toBe(2);
    expect(MIN_TEAMS_MEANINGFUL).toBe(4);
  });
});
