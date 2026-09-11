import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";

/* ── ajrak-derived palette: deep indigo ground, madder red, turquoise ────── */
const C = {
  ink: "#141838",
  panel: "#1E2455",
  raise: "#28306B",
  line: "#3B4590",
  bone: "#EFEADB",
  dim: "#9099C9",
  madder: "#D64535",
  turq: "#35B8C4",
  gold: "#E0A93B",
  green: "#5BB87A",
};

const KEY = "nnlab-v1";
const GRID = 16;              // downsample resolution -> 256 inputs
const NPIX = GRID * GRID;
const HID_A = 10;             // hidden units for the drawing net
const MIN_PER_LABEL = 4;
const TEST_PER_LABEL = 3;

/* ── tiny MLP: nIn -> nHid (tanh) -> 1 (sigmoid) ─────────────────────────── */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newNet(nIn, nHid, seed = 1) {
  const r = mulberry32(seed);
  return {
    nIn, nHid,
    W1: Array.from({ length: nHid }, () =>
      Array.from({ length: nIn }, () => (r() * 2 - 1) * Math.sqrt(2 / nIn))),
    b1: new Array(nHid).fill(0),
    W2: Array.from({ length: nHid }, () => (r() * 2 - 1) * Math.sqrt(2 / nHid)),
    b2: 0,
  };
}

function fwd(net, x) {
  const h = new Array(net.nHid);
  for (let j = 0; j < net.nHid; j++) {
    let s = net.b1[j];
    const w = net.W1[j];
    for (let i = 0; i < net.nIn; i++) s += w[i] * x[i];
    h[j] = Math.tanh(s);
  }
  let o = net.b2;
  for (let j = 0; j < net.nHid; j++) o += net.W2[j] * h[j];
  return { h, y: 1 / (1 + Math.exp(-o)) };
}

function trainEpochs(net, X, Y, epochs, lr) {
  for (let e = 0; e < epochs; e++) {
    for (let n = 0; n < X.length; n++) {
      const x = X[n], t = Y[n];
      const { h, y } = fwd(net, x);
      const dO = y - t;
      for (let j = 0; j < net.nHid; j++) {
        const dH = dO * net.W2[j] * (1 - h[j] * h[j]);
        net.W2[j] -= lr * dO * h[j];
        const w = net.W1[j];
        for (let i = 0; i < net.nIn; i++) if (x[i] !== 0) w[i] -= lr * dH * x[i];
        net.b1[j] -= lr * dH;
      }
      net.b2 -= lr * dO;
    }
  }
}

const accuracy = (net, samples) => {
  if (!samples.length) return null;
  let ok = 0;
  samples.forEach((s) => { if ((fwd(net, s.pix).y > 0.5 ? 1 : 0) === s.label) ok++; });
  return ok / samples.length;
};

const packNet = (n) => ({
  nIn: n.nIn, nHid: n.nHid,
  W1: n.W1.map((r) => r.map((v) => Math.round(v * 1000) / 1000)),
  b1: n.b1.map((v) => Math.round(v * 1000) / 1000),
  W2: n.W2.map((v) => Math.round(v * 1000) / 1000),
  b2: Math.round(n.b2 * 1000) / 1000,
});
const packPix = (p) => p.map((v) => Math.round(v * 100) / 100);
const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

/* ── shared storage ───────────────────────────────────────────────────────── */
const blank = () => ({ labels: ["Mango", "Cricket ball"], teams: {}, challenges: [] });

async function loadAll() {
  if (!window.storage) return null;
  try {
    const r = await window.storage.get(KEY, true);
    return r ? { ...blank(), ...JSON.parse(r.value) } : blank();
  } catch { return blank(); }
}
async function saveAll(mutate) {
  let base = blank();
  try {
    const r = await window.storage.get(KEY, true);
    if (r) base = { ...blank(), ...JSON.parse(r.value) };
  } catch { /* first write */ }
  const next = mutate(base);
  await window.storage.set(KEY, JSON.stringify(next), true);
  return next;
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function NeuralLab() {
  const [tab, setTab] = useState("draw");
  const [team, setTeam] = useState("");
  const [cloud, setCloud] = useState(blank());
  const [online, setOnline] = useState(true);
  const [notes, setNotes] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const refresh = useCallback(async () => {
    const d = await loadAll();
    if (d) setCloud(d); else setOnline(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 9000);
    return () => clearInterval(t);
  }, [refresh]);

  const push = async (mutate) => {
    try { setCloud(await saveAll(mutate)); setOnline(true); }
    catch { setOnline(false); flash("Could not reach the class board."); }
  };

  const labels = cloud.labels || blank().labels;

  return (
    <div style={S.app}>
      <style>{CSS}</style>

      <header style={S.head}>
        <div>
          <div style={S.word}>Neural Lab</div>
          <div style={S.tag}>Teach a machine to see. Then find out what it really learned.</div>
        </div>
        <nav style={S.tabs}>
          {[["draw", "1 · Teach it"], ["cup", "2 · Tournament"], ["fence", "3 · Bendy fence"]].map(([k, l]) => (
            <button key={k} className="nl-btn" onClick={() => setTab(k)}
              style={{ ...S.tab, ...(tab === k ? S.tabOn : null) }}>{l}</button>
          ))}
        </nav>
      </header>

      <div style={S.strip}>
        <label style={S.lbl} htmlFor="team">Team</label>
        <input id="team" className="nl-in" value={team} onChange={(e) => setTeam(e.target.value)}
          placeholder="your team name" style={S.teamIn} />
        <span style={S.stripNote}>
          {online ? `Drawing ${labels[0]} vs ${labels[1]} · ${Object.keys(cloud.teams || {}).length} teams have sent models`
                  : "Offline — nothing is shared with the class."}
        </span>
        <button className="nl-btn" style={S.miniBtn} onClick={() => setNotes((n) => !n)}>
          {notes ? "Hide teacher notes" : "Teacher notes"}
        </button>
      </div>

      {notes && <TeacherNotes cloud={cloud} push={push} flash={flash} />}

      {tab === "draw" && <Teach team={team} labels={labels} push={push} flash={flash} />}
      {tab === "cup" && <Tournament team={team} labels={labels} cloud={cloud} />}
      {tab === "fence" && <Fence team={team} cloud={cloud} push={push} flash={flash} />}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

/* ══ 1 · TEACH IT ════════════════════════════════════════════════════════ */
function Teach({ team, labels, push, flash }) {
  const cvs = useRef(null);
  const drawing = useRef(false);
  const [which, setWhich] = useState(0);
  const [samples, setSamples] = useState([]);
  const [net, setNet] = useState(null);
  const [ownAcc, setOwnAcc] = useState(null);
  const [training, setTraining] = useState(false);
  const [guess, setGuess] = useState(null);
  const [sent, setSent] = useState(false);

  const clear = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const x = c.getContext("2d");
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height);
    setGuess(null);
  }, []);
  useEffect(() => { clear(); }, [clear]);

  const pos = (e) => {
    const c = cvs.current, r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)];
  };
  const down = (e) => {
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const x = cvs.current.getContext("2d");
    x.strokeStyle = "#111"; x.lineWidth = 14; x.lineCap = "round"; x.lineJoin = "round";
    x.beginPath(); x.moveTo(...pos(e));
  };
  const move = (e) => {
    if (!drawing.current) return;
    const x = cvs.current.getContext("2d");
    x.lineTo(...pos(e)); x.stroke();
  };
  const up = () => { drawing.current = false; };

  /* crop to the ink, centre it, shrink to 16x16 */
  const capture = () => {
    const c = cvs.current;
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (d[(y * c.width + x) * 4] < 200) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
    if (x1 < 0) return null;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const side = Math.max(x1 - x0, y1 - y0) * 1.25 + 8;
    const s = document.createElement("canvas");
    s.width = GRID; s.height = GRID;
    const sx = s.getContext("2d");
    sx.imageSmoothingEnabled = true;
    sx.fillStyle = "#fff"; sx.fillRect(0, 0, GRID, GRID);
    sx.drawImage(c, cx - side / 2, cy - side / 2, side, side, 0, 0, GRID, GRID);
    const p = sx.getImageData(0, 0, GRID, GRID).data;
    const out = new Array(NPIX);
    for (let i = 0; i < NPIX; i++) out[i] = 1 - p[i * 4] / 255;
    return out;
  };

  const add = () => {
    const pix = capture();
    if (!pix) return flash("Draw something first.");
    setSamples((s) => [...s, { label: which, pix }]);
    setNet(null); setOwnAcc(null); setSent(false);
    clear();
  };

  const counts = [0, 1].map((l) => samples.filter((s) => s.label === l).length);
  const ready = counts[0] >= MIN_PER_LABEL && counts[1] >= MIN_PER_LABEL;

  const train = () => {
    setTraining(true); setGuess(null);
    setTimeout(() => {
      const n = newNet(NPIX, HID_A, samples.length * 7 + 3);
      const X = samples.map((s) => s.pix), Y = samples.map((s) => s.label);
      trainEpochs(n, X, Y, 240, 0.06);
      setNet(n); setOwnAcc(accuracy(n, samples)); setTraining(false); setSent(false);
    }, 30);
  };

  const test = () => {
    if (!net) return;
    const pix = capture();
    if (!pix) return flash("Draw something first.");
    const y = fwd(net, pix).y;
    setGuess({ label: y > 0.5 ? 1 : 0, conf: y > 0.5 ? y : 1 - y });
  };

  const send = async () => {
    if (!net) return flash("Train it first.");
    if (!team.trim()) return flash("Type your team name at the top.");
    const pick = [0, 1].flatMap((l) =>
      samples.filter((s) => s.label === l).sort(() => Math.random() - 0.5).slice(0, TEST_PER_LABEL));
    await push((b) => ({
      ...b,
      teams: {
        ...b.teams,
        [team.trim().slice(0, 22)]: {
          model: packNet(net),
          tests: pick.map((s) => ({ label: s.label, pix: packPix(s.pix) })),
          own: ownAcc, at: Date.now(),
        },
      },
    }));
    setSent(true);
    flash("Sent to the class.");
  };

  return (
    <main style={S.main}>
      <section style={S.panel}>
        <h2 style={S.h2}>Draw {MIN_PER_LABEL}–6 of each</h2>
        <div style={S.pickRow}>
          {labels.map((l, i) => (
            <button key={l} className="nl-btn" onClick={() => setWhich(i)}
              style={{ ...S.pick, ...(which === i ? { background: i ? C.turq : C.madder, color: C.ink, borderColor: "transparent" } : null) }}>
              {l} <span style={S.pickN}>{counts[i]}</span>
            </button>
          ))}
        </div>

        <canvas ref={cvs} width={300} height={300} style={S.canvas}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />

        <div style={S.btnRow}>
          <button className="nl-btn" style={S.primary} onClick={add}>Add this drawing</button>
          <button className="nl-btn" style={S.ghost} onClick={clear}>Clear</button>
          {net && <button className="nl-btn" style={S.ghostGold} onClick={test}>What is it?</button>}
        </div>

        {guess && (
          <div style={{ ...S.guess, borderColor: guess.label ? C.turq : C.madder }}>
            <span style={S.guessLbl}>{labels[guess.label]}</span>
            <span style={S.guessConf}>{pct(guess.conf)} sure</span>
          </div>
        )}
      </section>

      <section style={S.panel}>
        <h2 style={S.h2}>Your training set</h2>
        {samples.length === 0
          ? <p style={S.empty}>Nothing yet. Every drawing you add is one example the machine gets to learn from.</p>
          : <div style={S.thumbs}>{samples.map((s, i) => <Thumb key={i} pix={s.pix} tint={s.label ? C.turq : C.madder} />)}</div>}

        <button className="nl-btn"
          style={{ ...S.train, opacity: ready && !training ? 1 : 0.4 }}
          onClick={ready && !training ? train : undefined}>
          {training ? "Learning…" : `Train it (${samples.length} examples)`}
        </button>
        {!ready && <p style={S.hint}>At least {MIN_PER_LABEL} of each before it can learn anything.</p>}

        {ownAcc != null && (
          <>
            <div style={S.score}>
              <div style={S.scoreN}>{pct(ownAcc)}</div>
              <div style={S.scoreL}>correct on your own drawings</div>
            </div>
            <p style={S.hint}>Draw a new one and press “What is it?” to test it yourself.</p>
            <button className="nl-btn" style={{ ...S.send, opacity: sent ? 0.5 : 1 }} onClick={send}>
              {sent ? "Sent to the class ✓" : "Send my machine to the class"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

/* ══ 2 · TOURNAMENT ═════════════════════════════════════════════════════ */
function Tournament({ team, labels, cloud }) {
  const teams = cloud.teams || {};
  const names = Object.keys(teams);

  const table = useMemo(() => names.map((n) => {
    const me = teams[n];
    const foreign = names.filter((o) => o !== n).flatMap((o) => teams[o].tests || []);
    const cross = foreign.length ? accuracy(me.model, foreign) : null;
    return { name: n, own: me.own, cross, n: foreign.length };
  }).sort((a, b) => (b.cross ?? -1) - (a.cross ?? -1)), [names, teams]);

  const avgOwn = table.length ? table.reduce((s, r) => s + (r.own || 0), 0) / table.length : 0;
  const withCross = table.filter((r) => r.cross != null);
  const avgCross = withCross.length ? withCross.reduce((s, r) => s + r.cross, 0) / withCross.length : 0;

  return (
    <main style={S.wide}>
      <h2 style={S.h1}>The tournament</h2>
      <p style={S.lede}>
        Every machine in the room is now tested on drawings made by other teams. Nothing about the
        machines changed. Only who drew the pictures.
      </p>

      {names.length < 2 ? (
        <p style={S.empty}>Waiting for teams to send their machines. Two at minimum, six is better.</p>
      ) : (
        <>
          <div style={S.bigCompare}>
            <div>
              <div style={{ ...S.bigN, color: C.green }}>{pct(avgOwn)}</div>
              <div style={S.bigL}>on their own drawings</div>
            </div>
            <div style={S.arrow}>→</div>
            <div>
              <div style={{ ...S.bigN, color: C.madder }}>{pct(avgCross)}</div>
              <div style={S.bigL}>on everyone else's</div>
            </div>
          </div>

          <div style={S.table}>
            <div style={{ ...S.tr, ...S.thead }}>
              <span>Team</span><span>Own</span><span>Strangers</span><span style={S.barCell} />
            </div>
            {table.map((r, i) => (
              <div key={r.name} style={{ ...S.tr, background: r.name === team.trim() ? C.raise : "transparent" }}>
                <span style={{ color: i === 0 ? C.gold : C.bone }}>{i === 0 ? "★ " : ""}{r.name}</span>
                <span style={{ color: C.dim }}>{pct(r.own)}</span>
                <span style={{ color: r.cross > 0.8 ? C.green : r.cross > 0.6 ? C.gold : C.madder, fontWeight: 700 }}>
                  {pct(r.cross)}
                </span>
                <span style={S.barCell}>
                  <span style={{ ...S.bar, width: `${(r.cross || 0) * 100}%`, background: i === 0 ? C.gold : C.turq }} />
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
            <p style={S.qBig}>So what did your machine actually learn — {labels[0].toLowerCase()},
              or the way <em>your team</em> draws a {labels[0].toLowerCase()}?</p>
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

/* ══ 3 · BENDY FENCE ════════════════════════════════════════════════════ */
function Fence({ team, cloud, push, flash }) {
  const cvs = useRef(null);
  const [pts, setPts] = useState([]);
  const [col, setCol] = useState(0);
  const [hid, setHid] = useState(1);
  const [net, setNet] = useState(null);
  const [acc, setAcc] = useState(null);
  const [running, setRunning] = useState(false);
  const raf = useRef(null);

  const stop = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; setRunning(false); };
  useEffect(() => () => stop(), []);

  const paint = useCallback((n) => {
    const c = cvs.current; if (!c) return;
    const x = c.getContext("2d");
    const W = c.width, R = 4, step = W / 56;
    x.fillStyle = C.panel; x.fillRect(0, 0, W, W);
    if (n) {
      for (let gy = 0; gy < 56; gy++) for (let gx = 0; gx < 56; gx++) {
        const px = gx * step, py = gy * step;
        const y = fwd(n, [(px / W) * 2 - 1, (py / W) * 2 - 1]).y;
        x.fillStyle = y > 0.5
          ? `rgba(53,184,196,${0.14 + Math.abs(y - 0.5) * 0.5})`
          : `rgba(214,69,53,${0.14 + Math.abs(y - 0.5) * 0.5})`;
        x.fillRect(px, py, step + 1, step + 1);
      }
    }
    pts.forEach((p) => {
      x.beginPath();
      x.arc(p.x * W, p.y * W, R + 2, 0, 7);
      x.fillStyle = C.ink; x.fill();
      x.beginPath();
      x.arc(p.x * W, p.y * W, R, 0, 7);
      x.fillStyle = p.c ? C.turq : C.madder; x.fill();
    });
  }, [pts]);

  useEffect(() => { paint(net); }, [paint, net]);

  const drop = (e) => {
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
      trainEpochs(n, X, Y, 40, 0.35);
      paint(n);
      let ok = 0;
      X.forEach((x, k) => { if ((fwd(n, x).y > 0.5 ? 1 : 0) === Y[k]) ok++; });
      setAcc(ok / X.length);
      if (++i < 70) raf.current = requestAnimationFrame(tick);
      else { setNet(n); setRunning(false); raf.current = null; }
    };
    tick();
  };

  const saveChallenge = async () => {
    if (!team.trim()) return flash("Type your team name at the top.");
    if (pts.length < 6) return flash("A challenge needs at least six dots.");
    await push((b) => ({
      ...b,
      challenges: [
        { id: Math.random().toString(36).slice(2, 9), team: team.trim().slice(0, 22),
          pts: pts.map((p) => ({ x: +p.x.toFixed(3), y: +p.y.toFixed(3), c: p.c })), best: null },
        ...(b.challenges || []),
      ].slice(0, 24),
    }));
    flash("Challenge posted.");
  };

  const claim = async (id) => {
    if (!team.trim()) return flash("Type your team name at the top.");
    if (acc == null || acc < 1) return flash("Solve it completely first — 100%.");
    await push((b) => ({
      ...b,
      challenges: (b.challenges || []).map((ch) =>
        ch.id === id && (!ch.best || hid < ch.best.neurons)
          ? { ...ch, best: { team: team.trim().slice(0, 22), neurons: hid } } : ch),
    }));
    flash("Recorded.");
  };

  const challenges = cloud.challenges || [];

  return (
    <main style={S.main}>
      <section style={S.panel}>
        <h2 style={S.h2}>Build a fence</h2>
        <p style={S.hint}>
          Click to drop dots. The machine tries to fence the two colours apart. One neuron can only
          make a straight fence. Add more and it starts to bend.
        </p>

        <div style={S.pickRow}>
          {["Red", "Blue"].map((l, i) => (
            <button key={l} className="nl-btn" onClick={() => setCol(i)}
              style={{ ...S.pick, ...(col === i ? { background: i ? C.turq : C.madder, color: C.ink, borderColor: "transparent" } : null) }}>
              {l}
            </button>
          ))}
        </div>

        <canvas ref={cvs} width={320} height={320} style={S.canvas} onClick={drop} />

        <div style={S.sliderRow}>
          <span style={S.slLbl}>Neurons</span>
          <input className="nl-in" type="range" min={1} max={8} value={hid} style={S.slider}
            onChange={(e) => { setHid(+e.target.value); setNet(null); setAcc(null); stop(); }} />
          <span style={S.slVal}>{hid === 1 ? "1 · straight" : hid}</span>
        </div>

        <div style={S.btnRow}>
          <button className="nl-btn" style={S.primary} onClick={run}>{running ? "Learning…" : "Train"}</button>
          <button className="nl-btn" style={S.ghost} onClick={() => { setPts([]); setNet(null); setAcc(null); stop(); }}>Clear</button>
          <button className="nl-btn" style={S.ghostGold} onClick={saveChallenge}>Post as challenge</button>
        </div>

        {acc != null && (
          <div style={{ ...S.guess, borderColor: acc === 1 ? C.green : C.gold }}>
            <span style={S.guessLbl}>{pct(acc)} fenced correctly</span>
            <span style={S.guessConf}>{acc === 1 ? "solved" : "some dots on the wrong side"}</span>
          </div>
        )}
      </section>

      <section style={S.panel}>
        <h2 style={S.h2}>Class challenges</h2>
        <p style={S.hint}>Load someone else's pattern. Solve it with the fewest neurons you can.</p>
        {challenges.length === 0
          ? <p style={S.empty}>Nothing posted yet. Make a pattern a straight fence cannot solve, then post it.</p>
          : <div style={S.chList}>
              {challenges.map((ch) => (
                <div key={ch.id} style={S.ch}>
                  <MiniPattern pts={ch.pts} />
                  <div style={S.chBody}>
                    <div style={S.chTeam}>{ch.team}</div>
                    <div style={S.chBest}>
                      {ch.best ? `best: ${ch.best.neurons} neuron${ch.best.neurons > 1 ? "s" : ""} · ${ch.best.team}` : "unsolved"}
                    </div>
                    <div style={S.chBtns}>
                      <button className="nl-btn" style={S.tiny}
                        onClick={() => { setPts(ch.pts.map((p) => ({ ...p }))); setNet(null); setAcc(null); stop(); }}>
                        Load
                      </button>
                      <button className="nl-btn" style={S.tiny} onClick={() => claim(ch.id)}>
                        I solved it with {hid}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>}
      </section>
    </main>
  );
}

/* ── small pieces ─────────────────────────────────────────────────────────── */
function Thumb({ pix, tint }) {
  const r = useRef(null);
  useEffect(() => {
    const c = r.current; if (!c) return;
    const x = c.getContext("2d");
    const img = x.createImageData(GRID, GRID);
    for (let i = 0; i < NPIX; i++) {
      const v = 255 - Math.round(pix[i] * 255);
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }, [pix]);
  return <canvas ref={r} width={GRID} height={GRID} style={{ ...S.thumb, borderColor: tint }} />;
}

function MiniPattern({ pts }) {
  const r = useRef(null);
  useEffect(() => {
    const c = r.current; if (!c) return;
    const x = c.getContext("2d");
    x.fillStyle = C.ink; x.fillRect(0, 0, 56, 56);
    pts.forEach((p) => {
      x.beginPath(); x.arc(p.x * 56, p.y * 56, 2.5, 0, 7);
      x.fillStyle = p.c ? C.turq : C.madder; x.fill();
    });
  }, [pts]);
  return <canvas ref={r} width={56} height={56} style={S.mini} />;
}

function TeacherNotes({ cloud, push, flash }) {
  const [a, setA] = useState(cloud.labels?.[0] || "");
  const [b, setB] = useState(cloud.labels?.[1] || "");
  return (
    <div style={S.notes}>
      <div style={S.nGrid}>
        <div>
          <h3 style={S.nH}>Set what the class draws</h3>
          <div style={S.pairRow}>
            <input className="nl-in" value={a} onChange={(e) => setA(e.target.value)} style={S.pairIn} />
            <input className="nl-in" value={b} onChange={(e) => setB(e.target.value)} style={S.pairIn} />
            <button className="nl-btn" style={S.tiny}
              onClick={async () => {
                if (!a.trim() || !b.trim()) return;
                await push((p) => ({ ...p, labels: [a.trim(), b.trim()] }));
                flash("Pair set for the whole class.");
              }}>Set</button>
          </div>
          <p style={S.nP}>
            Pick two things that look alike. Mango and cricket ball, chappal and joota, roti and naan,
            patang and star. Obvious pairs are learned too easily and the tournament falls flat.
            Everyone must draw the same pair or the tournament cannot run.
          </p>
        </div>

        <div>
          <h3 style={S.nH}>Run sheet, one period</h3>
          {[["0:00", "Teams of four. Team name in. No explaining.", ""],
            ["0:03", "Draw 5 of each and add them", ""],
            ["0:13", "Train. Everyone hits about 100%.", ""],
            ["0:16", "Draw fresh ones, press What is it?", ""],
            ["0:20", "Send to the class. Open Tournament on the projector.", ""],
            ["0:24", "Watch the scores collapse. Let them talk.", ""],
            ["0:32", "The mango question. Do not answer it.", ""],
            ["0:38", "Out", ""]].map(([t, w]) => (
              <div key={t} style={S.sheetRow}>
                <span style={{ color: C.gold, minWidth: 42 }}>{t}</span>
                <span style={{ color: C.dim }}>{w}</span>
              </div>
            ))}
        </div>

        <div>
          <h3 style={S.nH}>The one rule</h3>
          <p style={S.nP}>
            Say nothing about how it works until after the tournament collapses. The gap between own
            and strangers is the whole lesson, and it only lands if they are surprised by it.
          </p>
          <p style={S.nP}>
            Words to keep out of the room: overfitting, generalisation, bias, training data. They will
            describe all four in their own words. That is better than the terms.
          </p>
        </div>

        <div>
          <h3 style={S.nH}>Tab 3, if you get a second period</h3>
          <p style={S.nP}>
            Bendy fence answers the question the tournament creates — what is actually inside. One
            neuron draws a straight fence. Ask teams to make a pattern no straight fence can split,
            post it, then race to solve each other's with the fewest neurons.
          </p>
          <p style={S.nP}>
            Four dots in a checkerboard is the classic. It needs at least two neurons and no amount of
            trying will do it with one. That is worth letting them discover the slow way.
          </p>
        </div>
      </div>
      <button className="nl-btn" style={S.clear}
        onClick={async () => {
          if (!window.confirm("Erase every model, drawing and challenge from the class board?")) return;
          await push((p) => ({ labels: p.labels, teams: {}, challenges: [] }));
          flash("Class board cleared.");
        }}>Clear the class board</button>
    </div>
  );
}

/* ── styles ───────────────────────────────────────────────────────────────── */
const disp = "'Bricolage Grotesque', 'Archivo', system-ui, sans-serif";
const sans = "'Archivo', 'Segoe UI', system-ui, -apple-system, sans-serif";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap');
.nl-btn { font-family: ${sans}; cursor: pointer; background: none; }
.nl-btn:focus-visible, .nl-in:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
.nl-in { font-family: ${sans}; }
.nl-in::placeholder { color: ${C.dim}; opacity: .65; }
input[type=range].nl-in { accent-color: ${C.gold}; }
`;

const S = {
  app: { fontFamily: sans, background: C.ink, color: C.bone, minHeight: "100%", paddingBottom: 60 },

  head: { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: C.panel, borderBottom: `3px solid ${C.madder}` },
  word: { fontFamily: disp, fontSize: 27, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 },
  tag: { fontSize: 13, color: C.dim, marginTop: 5 },
  tabs: { display: "flex", gap: 5, flexWrap: "wrap" },
  tab: { border: `1px solid ${C.line}`, color: C.dim, padding: "8px 14px", fontSize: 13, fontWeight: 600, borderRadius: 3 },
  tabOn: { background: C.bone, color: C.ink, borderColor: C.bone },

  strip: { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "11px 24px", borderBottom: `1px solid ${C.line}` },
  lbl: { fontSize: 13, color: C.dim },
  teamIn: { background: C.panel, border: `1px solid ${C.line}`, color: C.bone, padding: "7px 11px", fontSize: 14, borderRadius: 3, width: 160 },
  stripNote: { fontSize: 12.5, color: C.dim, flex: 1, minWidth: 200 },
  miniBtn: { border: `1px solid ${C.line}`, color: C.dim, padding: "6px 12px", fontSize: 12, borderRadius: 3 },

  notes: { background: C.panel, borderBottom: `1px solid ${C.line}`, padding: "22px 24px" },
  nGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 26 },
  nH: { fontSize: 14, margin: "0 0 9px", fontWeight: 700 },
  nP: { fontSize: 13, lineHeight: 1.6, color: C.dim, margin: "0 0 8px", maxWidth: "58ch" },
  sheetRow: { display: "flex", gap: 10, fontSize: 12.5, marginBottom: 3 },
  pairRow: { display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  pairIn: { background: C.ink, border: `1px solid ${C.line}`, color: C.bone, padding: "6px 9px", fontSize: 13, borderRadius: 3, width: 110 },
  clear: { marginTop: 18, border: `1px solid ${C.madder}`, color: C.madder, padding: "7px 14px", fontSize: 12, borderRadius: 3 },

  main: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20, padding: "24px" },
  wide: { padding: "28px 24px", maxWidth: 900 },
  panel: { background: C.panel, borderRadius: 4, padding: "22px" },

  h1: { fontFamily: disp, fontSize: 38, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" },
  h2: { fontFamily: disp, fontSize: 21, fontWeight: 700, margin: "0 0 14px" },
  lede: { fontSize: 16.5, lineHeight: 1.55, color: C.bone, maxWidth: "56ch", margin: "0 0 26px" },
  hint: { fontSize: 13, color: C.dim, lineHeight: 1.6, margin: "10px 0 0", maxWidth: "48ch" },
  empty: { fontSize: 13.5, color: C.dim, lineHeight: 1.6, maxWidth: "46ch" },

  pickRow: { display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" },
  pick: { border: `1px solid ${C.line}`, color: C.bone, padding: "8px 14px", fontSize: 14, fontWeight: 600, borderRadius: 3 },
  pickN: { opacity: 0.6, marginLeft: 5, fontSize: 12 },

  canvas: { width: "100%", maxWidth: 320, aspectRatio: "1", background: "#fff", borderRadius: 4, cursor: "crosshair", touchAction: "none", display: "block" },

  btnRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 13 },
  primary: { background: C.gold, color: C.ink, border: "none", padding: "9px 17px", fontSize: 14, fontWeight: 700, borderRadius: 3 },
  ghost: { border: `1px solid ${C.line}`, color: C.dim, padding: "9px 15px", fontSize: 13.5, borderRadius: 3 },
  ghostGold: { border: `1px solid ${C.gold}`, color: C.gold, padding: "9px 15px", fontSize: 13.5, fontWeight: 600, borderRadius: 3 },
  tiny: { border: `1px solid ${C.line}`, color: C.bone, padding: "5px 10px", fontSize: 12, borderRadius: 3 },

  guess: { marginTop: 14, border: "2px solid", borderRadius: 3, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
  guessLbl: { fontFamily: disp, fontSize: 20, fontWeight: 700 },
  guessConf: { fontSize: 13, color: C.dim },

  thumbs: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 },
  thumb: { width: 40, height: 40, imageRendering: "pixelated", border: "2px solid", borderRadius: 2, background: "#fff" },

  train: { width: "100%", background: C.madder, color: C.bone, border: "none", padding: "13px", fontSize: 15, fontWeight: 700, borderRadius: 3 },
  send: { width: "100%", marginTop: 14, background: C.turq, color: C.ink, border: "none", padding: "12px", fontSize: 14.5, fontWeight: 700, borderRadius: 3 },

  score: { marginTop: 18, borderTop: `1px solid ${C.line}`, paddingTop: 16 },
  scoreN: { fontFamily: disp, fontSize: 46, fontWeight: 800, color: C.green, lineHeight: 1 },
  scoreL: { fontSize: 13, color: C.dim, marginTop: 3 },

  bigCompare: { display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap", background: C.panel, padding: "24px 26px", borderRadius: 4, marginBottom: 26 },
  bigN: { fontFamily: disp, fontSize: 50, fontWeight: 800, lineHeight: 1 },
  bigL: { fontSize: 13, color: C.dim, marginTop: 4 },
  arrow: { fontSize: 28, color: C.dim },

  table: { display: "grid", gap: 2 },
  tr: { display: "grid", gridTemplateColumns: "1.4fr .6fr .8fr 2fr", gap: 12, alignItems: "center", padding: "10px 12px", fontSize: 14, borderRadius: 2 },
  thead: { fontSize: 12, color: C.dim, borderBottom: `1px solid ${C.line}` },
  barCell: { height: 8, background: C.panel, borderRadius: 4, overflow: "hidden" },
  bar: { display: "block", height: "100%", borderRadius: 4 },

  qBox: { marginTop: 34, background: C.raise, padding: "26px 26px", borderLeft: `5px solid ${C.turq}`, borderRadius: 3 },
  qKick: { fontSize: 12.5, color: C.gold, marginBottom: 10 },
  q: { fontSize: 15.5, lineHeight: 1.6, color: C.bone, maxWidth: "56ch", margin: "0 0 14px" },
  qBig: { fontFamily: disp, fontSize: 24, fontWeight: 700, lineHeight: 1.3, margin: 0, maxWidth: "40ch" },
  closing: { marginTop: 22, background: C.raise, padding: "26px", borderLeft: `5px solid ${C.madder}`, borderRadius: 3 },
  qNote: { fontSize: 13, color: C.dim, marginTop: 14 },

  sliderRow: { display: "flex", alignItems: "center", gap: 11, marginTop: 15 },
  slLbl: { fontSize: 13, color: C.dim },
  slider: { flex: 1, minWidth: 90 },
  slVal: { fontFamily: disp, fontSize: 15, fontWeight: 700, color: C.gold, minWidth: 78 },

  chList: { display: "grid", gap: 9 },
  ch: { display: "flex", gap: 12, alignItems: "center", background: C.ink, padding: 10, borderRadius: 3 },
  mini: { width: 56, height: 56, borderRadius: 2, flexShrink: 0 },
  chBody: { flex: 1, minWidth: 0 },
  chTeam: { fontSize: 14, fontWeight: 600 },
  chBest: { fontSize: 12, color: C.dim, margin: "2px 0 7px" },
  chBtns: { display: "flex", gap: 6, flexWrap: "wrap" },

  toast: { position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: C.gold, color: C.ink, padding: "11px 20px", fontSize: 14, fontWeight: 700, borderRadius: 3, zIndex: 50 },
};
