import { ref, get, set, update, push, runTransaction, serverTimestamp } from "firebase/database";
import { getFirebase } from "../firebase.js";
import { generateRoomCode } from "./codes.js";
import { packNet, packPix } from "../ml/net.js";

export const DEFAULT_LABELS = ["Mango", "Cricket ball"];
export const DEFAULT_TEAM_CAP = 4;
export const TEST_PER_LABEL = 3;
export const MAX_CHALLENGE_POINTS = 60;

const roomRef = (code, sub = "") => ref(getFirebase().db, `rooms/${code}${sub ? "/" + sub : ""}`);
const clampCap = (n) => Math.max(1, Math.min(12, Math.round(Number(n) || DEFAULT_TEAM_CAP)));
const cleanLabel = (s) => String(s || "").trim().slice(0, 24);

// ── rooms ────────────────────────────────────────────────────────────────
export async function createRoom({ uid, labels = DEFAULT_LABELS, teamCap = DEFAULT_TEAM_CAP }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const snap = await get(roomRef(code, "meta"));
    if (snap.exists()) continue;
    await set(roomRef(code, "meta"), {
      labels: [cleanLabel(labels[0]) || DEFAULT_LABELS[0], cleanLabel(labels[1]) || DEFAULT_LABELS[1]],
      teamCap: clampCap(teamCap),
      phase: "lobby",
      teacherUid: uid,
      createdAt: serverTimestamp(),
    });
    return code;
  }
  throw new Error("Could not find a free room code. Try again.");
}

export async function getRoomMeta(code) {
  const snap = await get(roomRef(code, "meta"));
  return snap.exists() ? snap.val() : null;
}

export async function joinRoom({ code, uid, name }) {
  await update(roomRef(code, `members/${uid}`), { name: String(name).trim().slice(0, 24), joinedAt: serverTimestamp() });
}

// ── teams ────────────────────────────────────────────────────────────────
export async function createTeam({ code, uid, name }) {
  const teamRef = push(roomRef(code, "teams"));
  // Two writes on purpose: rules validate members/{uid}/teamId against the EXISTING teams node.
  await set(teamRef, { name: String(name).trim().slice(0, 22), createdBy: uid, createdAt: serverTimestamp() });
  await update(roomRef(code, `members/${uid}`), { teamId: teamRef.key });
  return teamRef.key;
}

export const joinTeam = ({ code, uid, teamId }) => update(roomRef(code, `members/${uid}`), { teamId });
export const leaveTeam = ({ code, uid }) => update(roomRef(code, `members/${uid}`), { teamId: null });
export const moveMember = ({ code, uid, teamId }) => update(roomRef(code, `members/${uid}`), { teamId: teamId || null });
export const renameTeam = ({ code, teamId, name }) => update(roomRef(code, `teams/${teamId}`), { name: String(name).trim().slice(0, 22) });

export async function deleteTeam({ code, teamId, members }) {
  const updates = { [`teams/${teamId}`]: null, [`models/${teamId}`]: null };
  Object.entries(members || {}).forEach(([uid, m]) => {
    if (m?.teamId === teamId) updates[`members/${uid}/teamId`] = null;
  });
  await update(roomRef(code), updates);
}

// ── models ───────────────────────────────────────────────────────────────
export function pickTests(samples, perLabel = TEST_PER_LABEL, rand = Math.random) {
  return [0, 1].flatMap((l) =>
    samples
      .filter((s) => s.label === l)
      .map((s) => ({ s, r: rand() }))
      .sort((a, b) => a.r - b.r)
      .slice(0, perLabel)
      .map(({ s }) => ({ label: s.label, pix: packPix(s.pix) }))
  );
}

export function buildModelPayload({ net, samples, own, uid, rand = Math.random }) {
  return { model: packNet(net), tests: pickTests(samples, TEST_PER_LABEL, rand), own, sentBy: uid, at: serverTimestamp() };
}

export const sendModel = ({ code, teamId, net, samples, own, uid }) =>
  set(roomRef(code, `models/${teamId}`), buildModelPayload({ net, samples, own, uid }));

// ── challenges ───────────────────────────────────────────────────────────
export async function postChallenge({ code, teamId, teamName, pts }) {
  const clean = pts.slice(0, MAX_CHALLENGE_POINTS).map((p) => ({ x: +p.x.toFixed(3), y: +p.y.toFixed(3), c: p.c ? 1 : 0 }));
  await set(push(roomRef(code, "challenges")), { teamId, teamName: String(teamName).slice(0, 22), pts: clean, at: serverTimestamp() });
}

export async function claimChallenge({ code, id, teamId, teamName, neurons }) {
  const res = await runTransaction(roomRef(code, `challenges/${id}/best`), (cur) =>
    !cur || neurons < cur.neurons ? { teamId, teamName: String(teamName).slice(0, 22), neurons } : undefined
  );
  return res.committed;
}

// ── teacher controls ─────────────────────────────────────────────────────
export const setPhase = ({ code, phase }) => update(roomRef(code, "meta"), { phase });
export const setLabels = ({ code, labels }) => update(roomRef(code, "meta"), { labels: [cleanLabel(labels[0]), cleanLabel(labels[1])] });
export const setTeamCap = ({ code, teamCap }) => update(roomRef(code, "meta"), { teamCap: clampCap(teamCap) });
export const resetBoard = ({ code }) => update(roomRef(code), { models: null, challenges: null, "meta/phase": "teach" });
export const closeRoom = ({ code }) => update(roomRef(code, "meta"), { closed: true });
