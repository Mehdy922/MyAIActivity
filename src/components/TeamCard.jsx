import { useState } from "react";
import { S, C } from "../theme.js";

export function TeamCard({ teamId, team, members = [], cap = 4, isMine = false, locked = false, canJoin = false,
  onJoin, onLeave, teacher = false, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team?.name || "");
  const full = members.length >= cap;

  return (
    <div className="nl-fade" style={{ ...S.teamCard, ...(isMine ? S.teamCardMine : null) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        {editing ? (
          <input className="nl-in" style={{ ...S.input, padding: "6px 10px", fontSize: 15 }} value={name} maxLength={22}
            onChange={(e) => setName(e.target.value)} aria-label="Team name" />
        ) : (
          <div style={S.teamName}>{team?.name}</div>
        )}
        <div style={S.teamCount}>{members.length}/{cap}</div>
      </div>

      <div style={S.memberList}>
        {members.length === 0 && <span style={{ ...S.member, color: C.muted }}>nobody yet</span>}
        {members.map((m) => <span key={m.uid} style={S.member}>{m.name}</span>)}
      </div>

      <div style={S.btnRow}>
        {isMine && (locked
          ? <span style={S.badge}>model sent ✓</span>
          : <button className="nl-btn" style={S.ghost} onClick={() => onLeave?.(teamId)}>Leave</button>)}
        {!isMine && canJoin && (
          <button className="nl-btn" style={S.accent} disabled={full} onClick={() => onJoin?.(teamId)}>
            {full ? "Full" : "Join"}
          </button>
        )}
        {teacher && (editing ? (
          <>
            <button className="nl-btn" style={S.tiny} onClick={() => { onRename?.(teamId, name); setEditing(false); }}>Save</button>
            <button className="nl-btn" style={S.tiny} onClick={() => { setName(team?.name || ""); setEditing(false); }}>Cancel</button>
          </>
        ) : (
          <>
            <button className="nl-btn" style={S.tiny} onClick={() => setEditing(true)}>Rename</button>
            <button className="nl-btn" style={{ ...S.tiny, color: C.red }} onClick={() => onDelete?.(teamId)}>Delete</button>
          </>
        ))}
      </div>
    </div>
  );
}
