import { useEffect, useState } from "react";
import { S } from "../theme.js";
import { useRoom } from "../rooms/hooks.js";
import { visibleTabs } from "../rooms/phases.js";
import { setPhase, DEFAULT_LABELS } from "../rooms/api.js";
import { Tabs } from "../components/Tabs.jsx";
import { Toast, useToast } from "../components/Toast.jsx";
import { PhaseBar } from "../components/PhaseBar.jsx";
import { StudentJoin } from "./StudentJoin.jsx";
import { Lobby } from "./Lobby.jsx";
import { Teach } from "./Teach.jsx";
import { Tournament } from "./Tournament.jsx";
import { Fence } from "./Fence.jsx";
import { Settings } from "./Settings.jsx";

function Centered({ children }) {
  return <div style={S.center}><div className="nl-fade" style={S.centerCard}>{children}</div></div>;
}

export function Room({ code, uid, onExit }) {
  const { meta, members, teams, loading, missing, error } = useRoom(code);
  const { toast, flash } = useToast();
  const [tab, setTab] = useState("lobby");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  if (error) {
    return (
      <Centered>
        <h2 style={S.h2}>Could not open the room</h2>
        <p style={S.hint}><code>{error.code || error.message || String(error)}</code></p>
        <p style={S.hint}>If you're the teacher: publish <code>database.rules.json</code> in the Firebase console (Realtime Database → Rules).</p>
        <button className="nl-btn" style={{ ...S.ghost, marginTop: 14 }} onClick={onExit}>Back to start</button>
      </Centered>
    );
  }
  if (loading) {
    return (
      <Centered>
        <p style={S.lede}>Opening room {code}…</p>
        {slow && (
          <>
            <p style={S.hint}>Still connecting — check your wifi.</p>
            <button className="nl-btn" style={{ ...S.ghost, marginTop: 14 }} onClick={onExit}>Back to start</button>
          </>
        )}
      </Centered>
    );
  }
  if (missing) {
    return (
      <Centered>
        <h2 style={S.h2}>No room called {code}</h2>
        <p style={S.hint}>Check the code with your teacher.</p>
        <button className="nl-btn" style={{ ...S.ghost, marginTop: 14 }} onClick={onExit}>Back to start</button>
      </Centered>
    );
  }

  const isTeacher = meta.teacherUid === uid;
  const me = members[uid];
  if (!isTeacher && meta.closed) {
    return (
      <Centered>
        <h2 style={S.h2}>This room has been closed</h2>
        <button className="nl-btn" style={{ ...S.ghost, marginTop: 14 }} onClick={onExit}>Back to start</button>
      </Centered>
    );
  }
  if (!isTeacher && !me) return <StudentJoin uid={uid} lockedCode={code} onJoined={() => {}} onExit={onExit} />;

  const role = isTeacher ? "teacher" : "student";
  const tabs = visibleTabs(role, meta.phase);
  const active = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;
  const team = me?.teamId && teams[me.teamId] ? { id: me.teamId, name: teams[me.teamId].name } : null;
  const labels = meta.labels?.length === 2 ? meta.labels : DEFAULT_LABELS;
  const teamCount = Object.keys(teams).length;

  const advance = async (next) => {
    setBusy(true);
    try { await setPhase({ code, phase: next }); }
    catch { flash("Could not update the phase."); }
    finally { setBusy(false); }
  };

  const props = { code, uid, meta, members, teams, labels, team, isTeacher, flash };

  const leave = () => {
    if (isTeacher) {
      const ok = window.confirm(`Leave room ${code}? Your class keeps running. You can come back from the start screen with "Rejoin room ${code}".`);
      if (!ok) return;
    }
    onExit();
  };

  return (
    <div style={S.app}>
      <header style={S.head}>
        <div style={S.logo}>
          <span style={{ fontSize: 30, lineHeight: 1 }} aria-hidden="true">🧠</span>
          <div>
            <div style={S.word}>Neural Lab</div>
            <div style={S.tag}>Room <b>{code}</b> · {labels[0]} vs {labels[1]}</div>
          </div>
        </div>
        <Tabs tabs={tabs} active={active} onChange={setTab} />
      </header>

      {isTeacher && <PhaseBar phase={meta.phase} onAdvance={advance} busy={busy} />}

      <div style={S.strip}>
        <span style={S.chip}>{isTeacher ? "👩‍🏫 Teacher" : `🙋 ${me.name}`}</span>
        {team && <span style={S.chip}>Team {team.name}</span>}
        <span>{teamCount} team{teamCount === 1 ? "" : "s"}</span>
        <button className="nl-btn" style={{ ...S.tiny, marginLeft: "auto" }} onClick={leave}>Leave room</button>
      </div>

      {active === "lobby" && <Lobby {...props} />}
      {active === "teach" && <Teach {...props} />}
      {active === "tournament" && <Tournament {...props} />}
      {active === "fence" && <Fence {...props} />}
      {active === "settings" && isTeacher && <Settings {...props} />}

      <Toast message={toast} />
    </div>
  );
}
