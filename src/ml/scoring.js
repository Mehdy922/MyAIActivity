import { accuracy } from "./net.js";

export const MIN_TEAMS_TO_SHOW = 2;
export const MIN_TEAMS_MEANINGFUL = 4;

// Each team's model is scored on the union of every OTHER team's test drawings.
export function buildTournamentTable(models, teams) {
  const ids = Object.keys(models || {});
  const rows = ids.map((id) => {
    const me = models[id];
    const foreign = ids.filter((o) => o !== id).flatMap((o) => models[o].tests || []);
    return {
      teamId: id,
      name: teams?.[id]?.name ?? "Unknown team",
      own: me.own ?? null,
      cross: foreign.length ? accuracy(me.model, foreign) : null,
      n: foreign.length,
    };
  });
  return rows.sort((a, b) => (b.cross ?? -1) - (a.cross ?? -1));
}

// Attach the previous round's cross score and the change to each row.
// prev: { [teamId]: { cross } } from rounds/{round-1}, or null in round 1.
export function withDeltas(rows, prev) {
  return rows.map((r) => {
    const p = prev?.[r.teamId]?.cross;
    const has = typeof p === "number" && r.cross != null;
    return { ...r, prevCross: typeof p === "number" ? p : null, delta: has ? r.cross - p : null };
  });
}

// Average cross score of every completed round, oldest first.
// rounds: { [n]: { [teamId]: { cross } } }
export function historyAverages(rounds) {
  return Object.keys(rounds || {})
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((n) => {
      const xs = Object.values(rounds[n] || {}).map((t) => t?.cross).filter((v) => typeof v === "number");
      return { round: n, avgCross: xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null, count: xs.length };
    });
}

export function tableAverages(rows) {
  const mean = (xs, k) => (xs.length ? xs.reduce((s, r) => s + r[k], 0) / xs.length : null);
  return {
    avgOwn: mean(rows.filter((r) => r.own != null), "own"),
    avgCross: mean(rows.filter((r) => r.cross != null), "cross"),
    count: rows.length,
  };
}
