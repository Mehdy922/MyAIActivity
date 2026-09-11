import { useEffect, useState } from "react";
import { CSS, S, C } from "./theme.js";
import { isConfigured } from "./firebase.js";
import { useAuth } from "./rooms/hooks.js";
import { normalizeCode, isValidCode } from "./rooms/codes.js";
import { Landing } from "./screens/Landing.jsx";
import { TeacherCreate } from "./screens/TeacherCreate.jsx";
import { StudentJoin } from "./screens/StudentJoin.jsx";
import { Room } from "./screens/Room.jsx";

const LS_ROOM = "nl.room";
const LS_LAST_ROOM = "nl.lastRoom";

function codeFromUrl() {
  const c = normalizeCode(new URLSearchParams(window.location.search).get("room"));
  return isValidCode(c) ? c : null;
}
function savedCode() {
  try { const c = localStorage.getItem(LS_ROOM); return isValidCode(c) ? c : null; } catch { return null; }
}
function rememberCode(code) {
  try { code ? localStorage.setItem(LS_ROOM, code) : localStorage.removeItem(LS_ROOM); } catch { /* ignore */ }
  const url = new URL(window.location.href);
  if (code) url.searchParams.set("room", code); else url.searchParams.delete("room");
  window.history.replaceState(null, "", url);
}
function lastCode() {
  try { const c = localStorage.getItem(LS_LAST_ROOM); return isValidCode(c) ? c : null; } catch { return null; }
}

function Centered({ children }) {
  return <div style={S.center}><div className="nl-fade" style={S.centerCard}>{children}</div></div>;
}

function SetupNotice() {
  return (
    <Centered>
      <div style={{ fontSize: 48 }} aria-hidden="true">🔧</div>
      <h1 style={S.h1}>One more step</h1>
      <p style={S.lede}>Firebase is not configured yet. Paste your web app config into <code>src/firebaseConfig.js</code> and redeploy. The README has the steps.</p>
    </Centered>
  );
}

function Shell() {
  const { uid, error } = useAuth();
  const [code, setCode] = useState(() => codeFromUrl() || savedCode());
  const [choice, setChoice] = useState(null);

  useEffect(() => { if (code) rememberCode(code); }, [code]);

  const enter = (c) => { rememberCode(c); setCode(c); };
  const exit = () => {
    try { localStorage.setItem(LS_LAST_ROOM, code || ""); } catch { /* ignore */ }
    rememberCode(null); setCode(null); setChoice(null);
  };

  if (error) {
    return (
      <Centered>
        <h1 style={S.h1}>Could not sign in</h1>
        <p style={S.lede}>Error <code>{error.code || String(error)}</code>. In the Firebase console, enable <b>Anonymous</b> under Authentication → Sign-in method.</p>
      </Centered>
    );
  }
  if (!uid) return <Centered><p style={{ ...S.lede, color: C.muted }}>Connecting…</p></Centered>;
  if (code) return <Room code={code} uid={uid} onExit={exit} />;
  if (choice === "teacher") return <TeacherCreate uid={uid} onCreated={enter} onBack={() => setChoice(null)} />;
  if (choice === "student") return <StudentJoin uid={uid} onJoined={enter} onExit={() => setChoice(null)} />;
  return <Landing onChoose={setChoice} rejoinCode={lastCode()} onRejoin={enter} />;
}

export default function App() {
  return (
    <>
      <style>{CSS}</style>
      {isConfigured() ? <Shell /> : <SetupNotice />}
    </>
  );
}
