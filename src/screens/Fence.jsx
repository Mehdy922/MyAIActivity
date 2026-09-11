import { useCallback, useEffect, useRef, useState } from "react";
import { S, C, LABEL_COLORS, LABEL_DEEP } from "../theme.js";
import { newNet, fwd, trainEpochs, pct } from "../ml/net.js";
import { useChallenges } from "../rooms/hooks.js";
import { postChallenge, claimChallenge, MAX_CHALLENGE_POINTS } from "../rooms/api.js";
import { MiniPattern } from "../components/MiniPattern.jsx";

const TICKS = 70, EPOCHS_PER_TICK = 40, LR = 0.35, MIN_DOTS = 6;
const DOT_NAMES = ["Orange", "Blue"];

export function Fence({ code, team, isTeacher, flash }) {
  const cvs = useRef(null);
  const raf = useRef(null);
  const [pts, setPts] = useState([]);
  const [col, setCol] = useState(0);
  const [hid, setHid] = useState(1);
  const [net, setNet] = useState(null);
  const [acc, setAcc] = useState(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const { value: challenges } = useChallenges(code, true);
  const poster = team ? { teamId: team.id, teamName: team.name } : isTeacher ? { teamId: "teacher", teamName: "Teacher" } : null;

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null; setRunning(false);
  }, []);
  useEffect(() => () => stop(), [stop]);

  const paint = useCallback((n) => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, R = 5, cells = 56, step = W / cells;
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, W);
    if (n) {
      for (let gy = 0; gy < cells; gy++) for (let gx = 0; gx < cells; gx++) {
        const px = gx * step, py = gy * step;
        const y = fwd(n, [(px / W) * 2 - 1, (py / W) * 2 - 1]).y;
        const a = 0.16 + Math.abs(y - 0.5) * 0.6;
        ctx.fillStyle = y > 0.5 ? `rgba(59,167,245,${a})` : `rgba(255,138,61,${a})`;
        ctx.fillRect(px, py, step + 1, step + 1);
      }
    }
    pts.forEach((p) => {
      ctx.beginPath(); ctx.arc(p.x * W, p.y * W, R + 2, 0, 7); ctx.fillStyle = C.paper; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x * W, p.y * W, R, 0, 7); ctx.fillStyle = LABEL_COLORS[p.c ? 1 : 0]; ctx.fill();
    });
  }, [pts]);

  useEffect(() => { paint(net); }, [paint, net]);

  const drop = (e) => {
    if (pts.length >= MAX_CHALLENGE_POINTS) return flash(`Max ${MAX_CHALLENGE_POINTS} dots.`);
    const c = cvs.current, r = c.getBoundingClientRect();
    setPts((p) => [...p, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, c: col }]);
    setNet(null); setAcc(null); stop();
  };

  const run = () => {
    if (pts.filter((p) => p.c).length < 2 || pts.filter((p) => !p.c).length < 2)
      return flash("Put at least two dots of each colour down.");
    stop();
    const n = newNet(2, hid, pts.length * 13 + hid);
    const X = pts.map((p) => [p.x * 2 - 1, p.y * 2 - 1]);
    const Y = pts.map((p) => p.c);
    setRunning(true);
    let i = 0;
    const tick = () => {
      trainEpochs(n, X, Y, EPOCHS_PER_TICK, LR);
      paint(n);
      let ok = 0;
      X.forEach((x, k) => { if ((fwd(n, x).y > 0.5 ? 1 : 0) === Y[k]) ok++; });
      setAcc(ok / X.length);
      if (++i < TICKS) raf.current = requestAnimationFrame(tick);
      else { setNet(n); setRunning(false); raf.current = null; }
    };
    tick();
  };

  const post = async () => {
    if (!poster) return flash("Join a team in the Lobby first.");
    if (pts.length < MIN_DOTS) return flash(`A challenge needs at least ${MIN_DOTS} dots.`);
    setBusy(true);
    try { await postChallenge({ code, ...poster, pts }); flash("Challenge posted! 🧩"); }
    catch { flash("Could not reach the class board."); }
    finally { setBusy(false); }
  };

  const claim = async (id) => {
    if (!poster) return flash("Join a team in the Lobby first.");
    if (acc == null || acc < 1) return flash("Solve it completely first — 100%.");
    setBusy(true);
    try {
      const ok = await claimChallenge({ code, id, ...poster, neurons: hid });
      flash(ok ? `Recorded: ${hid} neuron${hid > 1 ? "s" : ""} 🎯` : "Someone already did it with fewer neurons.");
    } catch { flash("Could not reach the class board."); }
    finally { setBusy(false); }
  };

  const list = Object.entries(challenges || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));

  return (
    <main style={S.main}>
      <section style={S.card} className="nl-fade">
        <h2 style={S.h2}>Build a fence</h2>
        <p style={S.hint}>
          Tap to drop dots. The machine tries to fence the two colours apart. One neuron can only
          make a straight fence. Add more and it starts to bend.
        </p>
        <div style={S.pickRow}>
          {DOT_NAMES.map((l, i) => (
            <button key={l} className="nl-btn" onClick={() => setCol(i)}
              style={{ ...S.pick, ...(col === i ? { background: LABEL_COLORS[i], color: C.paper, boxShadow: `0 4px 0 ${LABEL_DEEP[i]}` } : null) }}>
              {l}
            </button>
          ))}
        </div>

        <canvas ref={cvs} width={320} height={320} style={{ ...S.canvas, background: C.cream }} onClick={drop} aria-label="Dot field" />

        <div style={S.sliderRow}>
          <span style={S.slLbl}>Neurons</span>
          <input className="nl-in" type="range" min={1} max={8} value={hid} style={S.slider} aria-label="Neurons"
            onChange={(e) => { setHid(+e.target.value); setNet(null); setAcc(null); stop(); }} />
          <span style={S.slVal}>{hid === 1 ? "1 · straight" : hid}</span>
        </div>

        <div style={S.btnRow}>
          <button className="nl-btn" style={S.primary} onClick={run} disabled={running}>{running ? "Learning…" : "Train"}</button>
          <button className="nl-btn" style={S.ghost} onClick={() => { setPts([]); setNet(null); setAcc(null); stop(); }}>Clear</button>
          <button className="nl-btn" style={S.accent} onClick={post} disabled={busy}>Post as challenge</button>
        </div>

        {acc != null && (
          <div style={{ ...S.guess, borderColor: acc === 1 ? C.leaf : C.sun }}>
            <span style={S.guessLbl}>{pct(acc)} fenced correctly</span>
            <span style={S.guessConf}>{acc === 1 ? "solved ✓" : "some dots on the wrong side"}</span>
          </div>
        )}
      </section>

      <section style={S.card} className="nl-fade">
        <h2 style={S.h2}>Class challenges <span style={S.badge}>{list.length}</span></h2>
        <p style={S.hint}>Load someone else's pattern. Solve it with the fewest neurons you can.</p>
        {list.length === 0 ? (
          <p style={S.empty}>Nothing posted yet. Make a pattern a straight fence cannot solve, then post it.</p>
        ) : (
          <div style={S.chList}>
            {list.map(([id, ch]) => (
              <div key={id} style={S.ch}>
                <MiniPattern pts={ch.pts} />
                <div style={S.chBody}>
                  <div style={S.chTeam}>{ch.teamName}</div>
                  <div style={S.chBest}>
                    {ch.best ? `best: ${ch.best.neurons} neuron${ch.best.neurons > 1 ? "s" : ""} · ${ch.best.teamName}` : "unsolved"}
                  </div>
                  <div style={S.chBtns}>
                    <button className="nl-btn" style={S.tiny}
                      onClick={() => { setPts((ch.pts || []).map((p) => ({ ...p }))); setNet(null); setAcc(null); stop(); }}>
                      Load
                    </button>
                    <button className="nl-btn" style={S.tiny} disabled={busy} onClick={() => claim(id)}>
                      I solved it with {hid}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
