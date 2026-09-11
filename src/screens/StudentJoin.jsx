import { useState } from "react";
import { S, C } from "../theme.js";
import { getRoomMeta, joinRoom } from "../rooms/api.js";
import { normalizeCode, isValidCode } from "../rooms/codes.js";

const LS_NAME = "nl.name";
const readName = () => { try { return localStorage.getItem(LS_NAME) || ""; } catch { return ""; } };

export function StudentJoin({ uid, lockedCode = null, onJoined, onExit }) {
  const [code, setCode] = useState(lockedCode || "");
  const [name, setName] = useState(readName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const valid = isValidCode(code) && name.trim().length >= 1;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setErr("");
    try {
      const meta = await getRoomMeta(code);
      if (!meta) { setErr(`No room called ${code}. Check the code with your teacher.`); setBusy(false); return; }
      if (meta.closed) { setErr("That room has been closed."); setBusy(false); return; }
      await joinRoom({ code, uid, name: name.trim() });
      try { localStorage.setItem(LS_NAME, name.trim()); } catch { /* ignore */ }
      onJoined(code);
      setBusy(false);
    } catch {
      setErr("Could not join. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div style={S.center}>
      <form className="nl-fade" style={S.centerCard} onSubmit={submit}>
        <div style={{ fontSize: 48, lineHeight: 1 }} aria-hidden="true">🙋</div>
        <h1 style={S.h1}>Join your class</h1>
        <div style={S.field}>
          <label style={S.label} htmlFor="code">Room code</label>
          <input id="code" className="nl-in" style={S.codeInput} value={code} disabled={Boolean(lockedCode)}
            onChange={(e) => setCode(normalizeCode(e.target.value))} placeholder="ABCDE"
            autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </div>
        <div style={S.field}>
          <label style={S.label} htmlFor="name">Your name</label>
          <input id="name" className="nl-in" style={S.input} value={name} maxLength={24}
            onChange={(e) => setName(e.target.value)} placeholder="What should your team call you?" />
        </div>
        {err && <p style={{ color: C.red, fontWeight: 800, marginTop: 12 }}>{err}</p>}
        <div style={{ ...S.btnRow, justifyContent: "center" }}>
          <button type="button" className="nl-btn" style={S.ghost} onClick={onExit}>Back</button>
          <button type="submit" className="nl-btn" style={S.accent} disabled={!valid || busy}>
            {busy ? "Joining…" : "Join 🚀"}
          </button>
        </div>
      </form>
    </div>
  );
}
