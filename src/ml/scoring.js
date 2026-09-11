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

export function tableAverages(rows) {
  const mean = (xs, k) => (xs.length ? xs.reduce((s, r) => s + r[k], 0) / xs.length : null);
  return {
    avgOwn: mean(rows.filter((r) => r.own != null), "own"),
    avgCross: mean(rows.filter((r) => r.cross != null), "cross"),
    count: rows.length,
  };
}
