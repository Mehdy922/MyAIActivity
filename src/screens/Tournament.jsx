import { useMemo } from "react";
import { S, C } from "../theme.js";
import { useModels } from "../rooms/hooks.js";
import { buildTournamentTable, tableAverages, MIN_TEAMS_TO_SHOW, MIN_TEAMS_MEANINGFUL } from "../ml/scoring.js";
import { pct } from "../ml/net.js";

const crossColor = (v) => (v == null ? C.muted : v > 0.8 ? C.leaf : v > 0.6 ? C.mangoDeep : C.red);

export function Tournament({ code, teams, labels, team }) {
  const { value: models, loading } = useModels(code, true);
  const rows = useMemo(() => buildTournamentTable(models, teams), [models, teams]);
  const { avgOwn, avgCross, count } = tableAverages(rows);
  const thing = (labels?.[0] || "mango").toLowerCase();

  return (
    <main style={S.wide} className="nl-fade">
      <h1 style={S.h1}>🏆 The tournament</h1>
      <p style={S.lede}>
        Every machine in the room is now tested on drawings made by other teams. Nothing about the
        machines changed. Only who drew the pictures.
      </p>

      {loading ? (
        <p style={S.empty}>Loading machines…</p>
      ) : count < MIN_TEAMS_TO_SHOW ? (
        <p style={S.empty}>Waiting for teams to send their machines. {count} of {MIN_TEAMS_TO_SHOW} so far. Four or more makes it interesting.</p>
      ) : (
        <>
          {count < MIN_TEAMS_MEANINGFUL && (
            <div style={S.caution}>⚠️ Only {count} teams so far. Needs at least 4 teams before this means anything.</div>
          )}

          <div style={S.bigCompare}>
            <div>
              <div style={{ ...S.bigN, color: C.leaf }}>{pct(avgOwn)}</div>
              <div style={S.bigL}>on their own drawings</div>
            </div>
            <div style={S.arrow} aria-hidden="true">→</div>
            <div>
              <div style={{ ...S.bigN, color: crossColor(avgCross) }}>{pct(avgCross)}</div>
              <div style={S.bigL}>on everyone else's</div>
            </div>
          </div>

          <div style={S.table} role="table" aria-label="Leaderboard">
            <div style={{ ...S.tr, ...S.thead }} role="row">
              <span>Team</span><span>Own</span><span>Strangers</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={r.teamId} role="row" style={{ ...S.tr, ...(r.teamId === team?.id ? { outline: `3px solid ${C.sky}` } : null) }}>
                <span style={{ fontWeight: 800, color: i === 0 ? C.mangoDeep : C.ink }}>{i === 0 ? "⭐ " : ""}{r.name}</span>
                <span style={{ color: C.muted, fontWeight: 700 }}>{pct(r.own)}</span>
                <span style={{ color: crossColor(r.cross), fontWeight: 800 }}>{pct(r.cross)}</span>
                <span style={S.barCell}>
                  <span style={{ ...S.bar, width: `${(r.cross || 0) * 100}%`, background: i === 0 ? C.sun : C.sky }} />
                </span>
              </div>
            ))}
          </div>

          <div style={S.qBox}>
            <div style={S.qKick}>Work this out before anyone tells you</div>
            <p style={S.q}>
              Every machine got nearly everything right on its own drawings and then fell apart on
              other people's. It was never tested on those before.
            </p>
            <p style={S.qBig}>So what did your machine actually learn — {thing}, or the way <em>your team</em> draws a {thing}?</p>
          </div>

          <div style={S.closing}>
            <div style={S.qKick}>Before you leave</div>
            <p style={S.q}>
              An app that tells you if a mango is ripe was built from photos of mangoes on one farm in
              Sindh. Your uncle grows mangoes in Multan. The app says every one of his is bad.
            </p>
            <p style={S.qBig}>Whose mistake was that?</p>
            <div style={S.qNote}>No answer is coming. Argue about it in the corridor.</div>
          </div>
        </>
      )}
    </main>
  );
}
