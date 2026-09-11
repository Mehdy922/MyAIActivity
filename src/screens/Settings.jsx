import { useEffect, useState } from "react";
import { S, C } from "../theme.js";
import { setLabels, setTeamCap, resetBoard, closeRoom } from "../rooms/api.js";

const RUN_SHEET = [
  ["0:00", "Teams of four. Team name in. No explaining."],
  ["0:03", "Draw 5 of each and add them."],
  ["0:13", "Train. Everyone hits about 100%."],
  ["0:16", "Draw fresh ones, press What is it?"],
  ["0:20", "Send to the class. Press Reveal tournament. Projector on."],
  ["0:24", "Watch the scores collapse. Let them talk."],
  ["0:32", "The mango question. Do not answer it."],
  ["0:38", "Out."],
];

export function Settings({ code, meta, flash }) {
  const [a, setA] = useState(meta.labels?.[0] || "");
  const [b, setB] = useState(meta.labels?.[1] || "");
  const [cap, setCap] = useState(meta.teamCap || 4);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setA(meta.labels?.[0] || ""); setB(meta.labels?.[1] || ""); setCap(meta.teamCap || 4); }, [meta.labels, meta.teamCap]);

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); flash(ok); }
    catch { flash("Could not reach the class board."); }
    finally { setBusy(false); }
  };

  return (
    <main style={S.wide} className="nl-fade">
      <h1 style={S.h1}>⚙️ Settings</h1>
      <div style={S.settingsGrid}>
        <section style={S.card}>
          <h2 style={S.h2}>What the class draws</h2>
          <div style={S.row}>
            <input className="nl-in" style={{ ...S.input, width: 150 }} value={a} maxLength={24} onChange={(e) => setA(e.target.value)} aria-label="First thing" />
            <span style={{ fontWeight: 800 }}>vs</span>
            <input className="nl-in" style={{ ...S.input, width: 150 }} value={b} maxLength={24} onChange={(e) => setB(e.target.value)} aria-label="Second thing" />
            <button className="nl-btn" style={S.primary} disabled={busy || !a.trim() || !b.trim()}
              onClick={() => run(() => setLabels({ code, labels: [a, b] }), "Pair set for the whole class.")}>Set</button>
          </div>
          <p style={S.notesP}>
            Pick two things that look alike. Mango and cricket ball, chappal and joota, roti and naan,
            sun and flower. Obvious pairs are learned too easily and the tournament falls flat.
            Change this before teams start drawing — everyone must draw the same pair.
          </p>

          <h2 style={{ ...S.h2, marginTop: 18 }}>Max students per team</h2>
          <div style={S.row}>
            <input className="nl-in" type="number" min={1} max={12} style={{ ...S.input, width: 100 }} value={cap} onChange={(e) => setCap(Number(e.target.value))} aria-label="Team cap" />
            <button className="nl-btn" style={S.primary} disabled={busy}
              onClick={() => run(() => setTeamCap({ code, teamCap: cap }), "Team size updated.")}>Set</button>
          </div>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>Run sheet, one period</h2>
          {RUN_SHEET.map(([t, w]) => (
            <div key={t} style={S.sheetRow}>
              <span style={{ color: C.mangoDeep, minWidth: 42, fontWeight: 800 }}>{t}</span>
              <span style={{ color: C.muted }}>{w}</span>
            </div>
          ))}
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>The one rule</h2>
          <p style={S.notesP}>
            Say nothing about how it works until after the tournament collapses. The gap between own
            and strangers is the whole lesson, and it only lands if they are surprised by it.
          </p>
          <p style={S.notesP}>
            Words to keep out of the room: overfitting, generalisation, bias, training data. They will
            describe all four in their own words. That is better than the terms.
          </p>
          <h2 style={{ ...S.h2, marginTop: 18 }}>Bendy fence, if you get a second period</h2>
          <p style={S.notesP}>
            One neuron draws a straight fence. Ask teams to make a pattern no straight fence can split,
            post it, then race to solve each other's with the fewest neurons. Four dots in a checkerboard
            is the classic. It needs at least two neurons.
          </p>
        </section>

        <section style={{ ...S.card, borderLeft: `8px solid ${C.red}` }}>
          <h2 style={S.h2}>Danger zone</h2>
          <p style={S.notesP}>Reset wipes every sent machine and every challenge, and puts the room back in the teaching phase. Teams and members stay.</p>
          <div style={S.btnRow}>
            <button className="nl-btn" style={S.danger} disabled={busy}
              onClick={() => window.confirm("Erase every model and challenge from the class board?") && run(() => resetBoard({ code }), "Class board cleared.")}>
              Reset board
            </button>
            <button className="nl-btn" style={S.danger} disabled={busy || meta.closed}
              onClick={() => window.confirm("Close this room? Students will no longer be able to use it.") && run(() => closeRoom({ code }), "Room closed.")}>
              {meta.closed ? "Room closed" : "Close room"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
