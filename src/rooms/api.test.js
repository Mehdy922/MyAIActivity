import { describe, it, expect } from "vitest";
import { pickTests, buildModelPayload, normalizeMaxTeams, TEST_PER_LABEL, DEFAULT_LABELS, DEFAULT_TEAM_CAP, MAX_TEAMS_MIN, MAX_TEAMS_MAX } from "./api.js";
import { newNet } from "../ml/net.js";

const mk = (label, v) => ({ label, pix: new Array(4).fill(v) });
const samples = [mk(0, 0.111), mk(0, 0.222), mk(0, 0.333), mk(0, 0.444), mk(1, 0.555), mk(1, 0.666), mk(1, 0.777), mk(1, 0.888)];

describe("pickTests", () => {
  it("picks perLabel per label, rounded to 2 dp", () => {
    const t = pickTests(samples, 3, () => 0.5);
    expect(t.filter((s) => s.label === 0)).toHaveLength(3);
    expect(t.filter((s) => s.label === 1)).toHaveLength(3);
    t.forEach((s) => s.pix.forEach((v) => expect(v).toBe(Math.round(v * 100) / 100)));
  });
  it("takes all when fewer than perLabel exist", () => {
    const t = pickTests([mk(0, 0.1), mk(1, 0.2)], 3);
    expect(t).toHaveLength(2);
  });
  it("defaults are 3 per label", () => {
    expect(TEST_PER_LABEL).toBe(3);
    expect(pickTests(samples)).toHaveLength(6);
  });
});

describe("buildModelPayload", () => {
  it("packs the net, picks tests, records own and sender", () => {
    const net = newNet(4, 10, 1);
    const p = buildModelPayload({ net, samples, own: 1, uid: "u1" });
    expect(p.model.nIn).toBe(4);
    expect(p.model.nHid).toBe(10);
    expect(p.model.W1[0][0]).toBe(Math.round(p.model.W1[0][0] * 1000) / 1000);
    expect(p.tests).toHaveLength(6);
    expect(p.own).toBe(1);
    expect(p.sentBy).toBe("u1");
    expect(p.at).toBeTruthy(); // server timestamp sentinel
  });
});

describe("defaults", () => {
  it("labels and cap", () => {
    expect(DEFAULT_LABELS).toEqual(["Mango", "Cricket ball"]);
    expect(DEFAULT_TEAM_CAP).toBe(4);
  });
});

describe("normalizeMaxTeams", () => {
  it("bounds are 2 and 20", () => {
    expect(MAX_TEAMS_MIN).toBe(2);
    expect(MAX_TEAMS_MAX).toBe(20);
  });
  it("blank, zero or junk means no limit", () => {
    expect(normalizeMaxTeams("")).toBeNull();
    expect(normalizeMaxTeams(0)).toBeNull();
    expect(normalizeMaxTeams(null)).toBeNull();
    expect(normalizeMaxTeams(undefined)).toBeNull();
    expect(normalizeMaxTeams("abc")).toBeNull();
  });
  it("clamps into 2..20 and rounds", () => {
    expect(normalizeMaxTeams(1)).toBe(2);
    expect(normalizeMaxTeams("5")).toBe(5);
    expect(normalizeMaxTeams(5.6)).toBe(6);
    expect(normalizeMaxTeams(25)).toBe(20);
  });
});
