import { useState } from "react";
import { S, C } from "../theme.js";
import { createRoom, DEFAULT_LABELS, DEFAULT_TEAM_CAP } from "../rooms/api.js";

export function TeacherCreate({ uid, onCreated, onBack }) {
  const [a, setA] = useState(DEFAULT_LABELS[0]);
  const [b, setB] = useState(DEFAULT_LABELS[1]);
  const [cap, setCap] = useState(DEFAULT_TEAM_CAP);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const code = await createRoom({ uid, labels: [a, b], teamCap: cap });
      onCreated(code);
    } catch (ex) {
      setErr(ex?.message || "Could not create the room. Check your connection.");
      setBusy(false);
    }
  };

  return (
    <div style={S.center}>
      <form className="nl-fade" style={S.centerCard} onSubmit={submit}>
        <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden="true">👩‍🏫</div>
        <h1 style={S.h1}>Create a room</h1>
        <p style={{ ...S.hint, margin: "0 auto" }}>
          Pick two things that look alike. Mango and cricket ball, chappal and joota, roti and naan, sun and flower.
          Obvious pairs are learned too easily and the tournament falls flat.
        </p>
        <div style={S.field}>
          <label style={S.label} htmlFor="label-a">Students draw…</label>
          <input id="label-a" className="nl-in" style={S.input} value={a} maxLength={24} onChange={(e) => setA(e.target.value)} />
        </div>
        <div style={S.field}>
          <label style={S.label} htmlFor="label-b">…versus</label>
          <input id="label-b" className="nl-in" style={S.input} value={b} maxLength={24} onChange={(e) => setB(e.target.value)} />
        </div>
        <div style={S.field}>
          <label style={S.label} htmlFor="cap">Max students per team</label>
          <input id="cap" className="nl-in" type="number" min={1} max={12} style={S.input} value={cap} onChange={(e) => setCap(Number(e.target.value))} />
        </div>
        {err && <p style={{ color: C.red, fontWeight: 800, marginTop: 12 }}>{err}</p>}
        <div style={{ ...S.btnRow, justifyContent: "center" }}>
          <button type="button" className="nl-btn" style={S.ghost} onClick={onBack}>Back</button>
          <button type="submit" className="nl-btn" style={S.primary} disabled={busy || !a.trim() || !b.trim()}>
            {busy ? "Creating…" : "Create room 🎉"}
          </button>
        </div>
      </form>
    </div>
  );
}
