import { useMemo, useState } from "react";
import { S, C } from "../theme.js";
import { useTeamModel } from "../rooms/hooks.js";
import { createTeam, joinTeam, leaveTeam, renameTeam, deleteTeam, moveMember, DEFAULT_TEAM_CAP } from "../rooms/api.js";
import { TeamCard } from "../components/TeamCard.jsx";
import { QrLink } from "../components/QrLink.jsx";

export function Lobby({ code, uid, meta, members, teams, team, isTeacher, flash }) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [moveUid, setMoveUid] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const myModel = useTeamModel(code, team?.id);
  const locked = Boolean(myModel.value);
  const cap = meta.teamCap || DEFAULT_TEAM_CAP;

  const byTeam = useMemo(() => {
    const m = {};
    Object.entries(members).forEach(([id, mem]) => {
      if (mem?.teamId) (m[mem.teamId] ||= []).push({ uid: id, name: mem.name });
    });
    return m;
  }, [members]);

  const teamIds = Object.keys(teams).sort((a, b) => (teams[a].createdAt || 0) - (teams[b].createdAt || 0));
  const unassigned = Object.entries(members).filter(([, m]) => !m?.teamId);
  const joinUrl = `${window.location.origin}${import.meta.env.BASE_URL}?room=${code}`;

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) flash(okMsg); }
    catch { flash("Could not reach the class board."); }
    finally { setBusy(false); }
  };

  const create = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    run(async () => { await createTeam({ code, uid, name: newName }); setNewName(""); }, "Team created! 🎉");
  };

  return (
    <main style={S.main}>
      {isTeacher && (
        <section style={S.card} className="nl-fade">
          <h2 style={S.h2}>Students join here</h2>
          <div style={S.codeBig}>{code}</div>
          <div style={{ margin: "14px 0" }}><QrLink url={joinUrl} /></div>
          <a style={S.link} href={joinUrl}>{joinUrl}</a>
          <p style={S.hint}>Put this on the projector. Students scan the code or type it in. Press <b>Start teaching</b> above when teams are ready.</p>
        </section>
      )}

      {!isTeacher && (
        <section style={S.card} className="nl-fade">
          <h2 style={S.h2}>{team ? "Your team" : "Make a team"}</h2>
          {team ? (
            <p style={S.hint}>
              You're in <b>{team.name}</b>. {locked ? "Your team has sent its machine, so you're locked in." : "Wait for your teacher to start, or switch teams below."}
            </p>
          ) : (
            <form onSubmit={create} style={S.row}>
              <input className="nl-in" style={{ ...S.input, flex: 1, minWidth: 160 }} placeholder="Team name" maxLength={22}
                value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="New team name" />
              <button type="submit" className="nl-btn" style={S.primary} disabled={busy || !newName.trim()}>Create</button>
            </form>
          )}
          <p style={S.hint}>Up to {cap} per team. Or tap a team below to join it.</p>
        </section>
      )}

      <section style={{ ...S.card, gridColumn: "1 / -1" }}>
        <h2 style={S.h2}>Teams <span style={S.badge}>{teamIds.length}</span></h2>
        {teamIds.length === 0 && (
          <p style={S.empty}>No teams yet. {isTeacher ? "Students create teams from their phones." : "Be the first!"}</p>
        )}
        <div style={S.teamGrid}>
          {teamIds.map((id) => (
            <TeamCard key={id} teamId={id} team={teams[id]} members={byTeam[id] || []} cap={cap}
              isMine={team?.id === id} locked={locked}
              canJoin={!isTeacher && !locked && team?.id !== id}
              onJoin={(tid) => run(() => joinTeam({ code, uid, teamId: tid }), `Joined ${teams[tid]?.name}!`)}
              onLeave={() => run(() => leaveTeam({ code, uid }), "Left the team.")}
              teacher={isTeacher}
              onRename={(tid, name) => name.trim() && run(() => renameTeam({ code, teamId: tid, name }), "Renamed.")}
              onDelete={(tid) => {
                if (window.confirm(`Delete team ${teams[tid]?.name}? Members go back to the lobby.`)) {
                  run(() => deleteTeam({ code, teamId: tid, members }), "Team deleted.");
                  setMoveTo(""); setMoveUid("");
                }
              }} />
          ))}
        </div>

        {unassigned.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={S.label}>Not in a team yet</div>
            <div style={S.memberList}>{unassigned.map(([id, m]) => <span key={id} style={S.member}>{m.name}</span>)}</div>
          </div>
        )}

        {isTeacher && Object.keys(members).length > 0 && teamIds.length > 0 && (
          <div style={{ marginTop: 18, borderTop: `2px dashed ${C.line}`, paddingTop: 14 }}>
            <div style={S.label}>Move a student</div>
            <div style={{ ...S.row, marginTop: 8 }}>
              <select className="nl-in" style={{ ...S.input, width: "auto", flex: 1, minWidth: 140 }} value={moveUid} onChange={(e) => setMoveUid(e.target.value)} aria-label="Student">
                <option value="">Student…</option>
                {Object.entries(members).map(([id, m]) => <option key={id} value={id}>{m.name}</option>)}
              </select>
              <select className="nl-in" style={{ ...S.input, width: "auto", flex: 1, minWidth: 140 }} value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="Team">
                <option value="">No team</option>
                {teamIds.map((id) => <option key={id} value={id}>{teams[id].name}</option>)}
              </select>
              <button className="nl-btn" style={S.tiny} disabled={busy || !moveUid}
                onClick={() => run(() => moveMember({ code, uid: moveUid, teamId: moveTo || null }), "Moved.")}>Move</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
