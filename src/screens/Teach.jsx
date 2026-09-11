import { useEffect, useRef, useState } from "react";
import { S, C, LABEL_COLORS, LABEL_DEEP } from "../theme.js";
import { newNet, fwd, trainEpochs, accuracy, pct, HID_A, EPOCHS_A, LR_A, MIN_PER_LABEL } from "../ml/net.js";
import { NPIX } from "../ml/capture.js";
import { sendModel } from "../rooms/api.js";
import { useTeamModel } from "../rooms/hooks.js";
import { DrawCanvas } from "../components/DrawCanvas.jsx";
import { Thumb } from "../components/Thumb.jsx";

const load = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };

export function Teach({ code, uid, members, labels, team, isTeacher, flash }) {
  const canvas = useRef(null);
  const storageKey = `nl.samples.${code}.${team?.id || "solo"}`;
  const [which, setWhich] = useState(0);
  const [samples, setSamples] = useState(() => load(storageKey));
  const [net, setNet] = useState(null);
  const [ownAcc, setOwnAcc] = useState(null);
  const [training, setTraining] = useState(false);
  const [guess, setGuess] = useState(null);
  const [sending, setSending] = useState(false);
  const sent = useTeamModel(code, team?.id);

  useEffect(() => { setSamples(load(storageKey)); setNet(null); setOwnAcc(null); }, [storageKey]);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(samples)); } catch { /* ignore */ } }, [samples, storageKey]);

  const counts = [0, 1].map((l) => samples.filter((s) => s.label === l).length);
  const ready = counts[0] >= MIN_PER_LABEL && counts[1] >= MIN_PER_LABEL;

  const invalidate = () => { setNet(null); setOwnAcc(null); setGuess(null); };

  const add = () => {
    const pix = canvas.current?.capture();
    if (!pix) return flash("Draw something first!");
    setSamples((s) => [...s, { label: which, pix }]);
    invalidate();
    canvas.current.clear();
  };

  const remove = (i) => { setSamples((s) => s.filter((_, k) => k !== i)); invalidate(); };

  const train = () => {
    setTraining(true); setGuess(null);
    setTimeout(() => {
      const n = newNet(NPIX, HID_A, samples.length * 7 + 3);
      trainEpochs(n, samples.map((s) => s.pix), samples.map((s) => s.label), EPOCHS_A, LR_A);
      setNet(n); setOwnAcc(accuracy(n, samples)); setTraining(false);
    }, 30);
  };

  const test = () => {
    if (!net) return;
    const pix = canvas.current?.capture();
    if (!pix) return flash("Draw something first!");
    const y = fwd(net, pix).y;
    setGuess({ label: y > 0.5 ? 1 : 0, conf: y > 0.5 ? y : 1 - y });
  };

  const send = async () => {
    if (!net) return flash("Train it first.");
    if (!team) return flash(isTeacher ? "Teachers don't enter the tournament. Join a team to try it." : "Join a team in the Lobby first.");
    setSending(true);
    try { await sendModel({ code, teamId: team.id, net, samples, own: ownAcc, uid }); flash("Sent to the class! 🚀"); }
    catch { flash("Could not reach the class board."); }
    finally { setSending(false); }
  };

  const sentBy = sent.value?.sentBy ? members[sent.value.sentBy]?.name || "a teammate" : null;
  const sentAt = sent.value?.at ? new Date(sent.value.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <main style={S.main}>
      <section style={S.card} className="nl-fade">
        <h2 style={S.h2}>Draw {MIN_PER_LABEL}–6 of each</h2>
        <div style={S.pickRow}>
          {labels.map((l, i) => (
            <button key={l} className="nl-btn" onClick={() => setWhich(i)}
              style={{ ...S.pick, ...(which === i ? { background: LABEL_COLORS[i], color: C.paper, boxShadow: `0 4px 0 ${LABEL_DEEP[i]}` } : null) }}>
              {l} <span style={S.pickN}>{counts[i]}</span>
            </button>
          ))}
        </div>

        <DrawCanvas ref={canvas} size={300} onStrokeStart={() => setGuess(null)} />

        <div style={S.btnRow}>
          <button className="nl-btn" style={S.primary} onClick={add}>Add this drawing</button>
          <button className="nl-btn" style={S.ghost} onClick={() => { canvas.current?.clear(); setGuess(null); }}>Clear</button>
          {net && <button className="nl-btn" style={S.accent} onClick={test}>What is it? 🤔</button>}
        </div>

        {guess && (
          <div className="nl-fade" style={{ ...S.guess, borderColor: LABEL_COLORS[guess.label] }}>
            <span style={{ ...S.guessLbl, color: LABEL_DEEP[guess.label] }}>{labels[guess.label]}</span>
            <span style={S.guessConf}>{pct(guess.conf)} sure</span>
          </div>
        )}
      </section>

      <section style={S.card} className="nl-fade">
        <h2 style={S.h2}>Your training set</h2>
        {samples.length === 0 ? (
          <p style={S.empty}>Nothing yet. Every drawing you add is one example the machine gets to learn from.</p>
        ) : (
          <div style={S.thumbs}>
            {samples.map((s, i) => (
              <button key={i} className="nl-btn" title="Remove this drawing" onClick={() => remove(i)} style={{ padding: 0, lineHeight: 0 }}>
                <Thumb pix={s.pix} tint={LABEL_COLORS[s.label]} />
              </button>
            ))}
          </div>
        )}

        <button className="nl-btn" style={S.train} disabled={!ready || training} onClick={train}>
          {training ? "Learning…" : `Train it (${samples.length} examples)`}
        </button>
        {!ready && <p style={S.hint}>At least {MIN_PER_LABEL} of each before it can learn anything.</p>}

        {ownAcc != null && (
          <>
            <div style={S.score} className="nl-fade">
              <div style={S.scoreN}>{pct(ownAcc)}</div>
              <div style={S.scoreL}>correct on your own drawings</div>
            </div>
            <p style={S.hint}>Draw a new one and press <b>What is it?</b> to test it yourself.</p>
            <button className="nl-btn" style={S.send} disabled={sending} onClick={send}>
              {sending ? "Sending…" : "Send my machine to the class 🚀"}
            </button>
          </>
        )}

        {team && sent.value && (
          <p style={{ ...S.hint, color: C.leaf, fontWeight: 800 }}>
            ✓ {team.name}'s machine is in — sent by {sentBy}{sentAt ? ` at ${sentAt}` : ""}. Sending again replaces it.
          </p>
        )}
      </section>
    </main>
  );
}
