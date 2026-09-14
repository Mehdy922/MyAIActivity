// Bot simulation of a full Neural Lab lesson against the LIVE Firebase project.
//
//   npm run simulate                      # 4 teams, 9 students, max teams 3 → one team over the limit, cleans up
//   npm run simulate -- --students 12 --max-teams 4 --rounds 2 --keep
//
// --rounds 2 makes the teacher press "Next round" after the first reveal: teams add drawings in
// OTHER teams' styles, retrain, send again, and the second reveal shows each team's change.
//
// --keep leaves the room in the database so you can open it on the projector
// (Teacher tabs need the bot-teacher's browser, but any Student can join with the code).
// Each bot is its own anonymous Firebase user, exactly like a phone in class.

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator, ref, get, set, update, push, remove, runTransaction, serverTimestamp } from "firebase/database";
import { firebaseConfig } from "../src/firebaseConfig.js";
import { newNet, trainEpochs, accuracy, fwd, HID_A, EPOCHS_A, LR_A, MIN_PER_LABEL, pct, mulberry32 } from "../src/ml/net.js";
import { GRID, NPIX } from "../src/ml/capture.js";
import { buildModelPayload, summarizeRound, DEFAULT_TEAM_CAP, normalizeMaxTeams } from "../src/rooms/api.js";
import { buildTournamentTable, tableAverages, withDeltas, historyAverages, MIN_TEAMS_MEANINGFUL } from "../src/ml/scoring.js";
import { generateRoomCode } from "../src/rooms/codes.js";
import { visibleTabs } from "../src/rooms/phases.js";
import { drawShape, STYLES } from "./lib/pixelart.mjs";

// ── args ─────────────────────────────────────────────────────────────────
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const N_STUDENTS = Number(arg("students", 9));
const MAX_TEAMS = normalizeMaxTeams(arg("max-teams", 3));
const TEAM_CAP = DEFAULT_TEAM_CAP;
const KEEP = process.argv.includes("--keep");
// --hold N: keep the finished room alive for N seconds (e.g. to open it in a browser or take
// screenshots), then clean it up. Ignored with --keep.
const HOLD = Math.max(0, Number(arg("hold", 0)));
const ROUNDS = Math.max(1, Number(arg("rounds", 1)));
// --emulator: real (live) anonymous auth, but all database traffic goes to the local emulator on :9000,
// which serves database.rules.json. Use it to test rule changes before publishing them:
//   npx firebase emulators:exec --only database --project demo-neural-lab "node scripts/simulate.mjs --rounds 2 --emulator"
// Under `firebase emulators:exec` the SDK auto-connects through FIREBASE_DATABASE_EMULATOR_HOST.
// NOTE: the emulator treats real (production) sign-in tokens as admin, so security-rule checks are
// skipped there — the emulator rules tests (npm run test:rules) cover them with mock tokens.
const EMULATOR = process.argv.includes("--emulator") || Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
const LABELS = ["Mango", "Cricket ball"];
const NAMES = ["Sana", "Bilal", "Zara", "Ahmed", "Hira", "Usman", "Ayesha", "Hamza", "Noor", "Ali", "Mariam", "Faisal", "Iqra", "Danish", "Laiba", "Saad"];
const TEAM_NAMES = ["Aloo Gosht", "Bhindi Masala", "Chai Wallahs", "Daal Chawal", "Emaan FC", "Falooda"];

const log = (s) => console.log(s);
const step = (s) => console.log(`\n▶ ${s}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── synthetic "drawings": 16×16 pixel arrays with a per-team style ─────────
// Each team draws the same two things differently: size, line weight, filled vs outline,
// seam angle, wobble. That is exactly what makes a model learn "our team's mango".
// (Shared with the slide deck builder — see scripts/lib/pixelart.mjs.)

// ── firebase users ───────────────────────────────────────────────────────
async function mkUser(tag) {
  const app = initializeApp(firebaseConfig, tag);
  const cred = await signInAnonymously(getAuth(app));
  const db = getDatabase(app);
  if (EMULATOR && !process.env.FIREBASE_DATABASE_EMULATOR_HOST) connectDatabaseEmulator(db, "127.0.0.1", 9000);
  return { tag, uid: cred.user.uid, db };
}
const R = (u, code, sub = "") => ref(u.db, `rooms/${code}${sub ? "/" + sub : ""}`);
const denied = async (label, fn) => {
  if (EMULATOR) { log(`   – ${label}: skipped on emulator (production tokens are admin there; see npm run test:rules)`); return true; }
  try { await fn(); log(`   ✗ ${label}: ALLOWED (unexpected!)`); return false; }
  catch (e) { log(`   ✓ ${label}: blocked (${e.code || e.message})`); return true; }
};

// ── main ─────────────────────────────────────────────────────────────────
const t0 = Date.now();
step(`Signing in 1 teacher + ${N_STUDENTS} students (anonymous auth, one user per bot)${EMULATOR ? " — database: LOCAL EMULATOR" : " — database: LIVE"}`);
const teacher = await mkUser("teacher");
const students = await Promise.all(Array.from({ length: N_STUDENTS }, (_, i) => mkUser(`s${i}`)));
students.forEach((s, i) => (s.name = NAMES[i % NAMES.length] + (i >= NAMES.length ? i : "")));
log(`   ${students.length + 1} users signed in`);

step("Teacher creates the room");
let code;
for (let i = 0; i < 5; i++) {
  code = generateRoomCode();
  if (!(await get(R(teacher, code, "meta"))).exists()) break;
}
await set(R(teacher, code, "meta"), {
  labels: LABELS, teamCap: TEAM_CAP, ...(MAX_TEAMS ? { maxTeams: MAX_TEAMS } : {}),
  round: 1, phase: "lobby", teacherUid: teacher.uid, createdAt: serverTimestamp(),
});
log(`   room ${code} · ${LABELS[0]} vs ${LABELS[1]} · max ${TEAM_CAP} per team · max teams ${MAX_TEAMS ?? "unlimited"}`);
log(`   join link: https://mehdy922.github.io/neural-lab/?room=${code}`);

step("Students join at once (QR scan → name → Join)");
await Promise.all(students.map((s) => update(R(s, code, `members/${s.uid}`), { name: s.name, joinedAt: serverTimestamp() })));
log(`   ${students.length} members in the lobby`);

step("Team formation — leaders create, others join; the client refuses to create past the limit");
const leaderCount = Math.ceil(N_STUDENTS / 2);
const leaders = students.slice(0, leaderCount);
const teams = {}; // teamId -> { name, members: [] }
for (const [i, s] of leaders.entries()) {
  const current = (await get(R(s, code, "teams"))).val() || {};
  if (MAX_TEAMS && Object.keys(current).length >= MAX_TEAMS) {
    log(`   ${s.name} wanted to make a team → sees "All ${MAX_TEAMS} teams are made — join one below"`);
    continue;
  }
  const tRef = push(R(s, code, "teams"));
  await set(tRef, { name: TEAM_NAMES[i % TEAM_NAMES.length], createdBy: s.uid, createdAt: serverTimestamp() });
  await update(R(s, code, `members/${s.uid}`), { teamId: tRef.key });
  teams[tRef.key] = { name: TEAM_NAMES[i % TEAM_NAMES.length], members: [s], style: STYLES[i % STYLES.length] };
  s.teamId = tRef.key;
  log(`   ${s.name} created "${teams[tRef.key].name}"`);
}
const teamIds = Object.keys(teams);
for (const s of students.filter((x) => !x.teamId)) {
  const open = teamIds.find((id) => teams[id].members.length < TEAM_CAP);
  if (!open) { log(`   ${s.name}: every team is full (cap ${TEAM_CAP}) — stays in the lobby`); continue; }
  await update(R(s, code, `members/${s.uid}`), { teamId: open });
  teams[open].members.push(s); s.teamId = open;
  log(`   ${s.name} joined "${teams[open].name}" (${teams[open].members.length}/${TEAM_CAP})`);
}
log(`   → ${teamIds.length} teams: ` + teamIds.map((id) => `${teams[id].name} ×${teams[id].members.length}`).join(", ") + " (unequal sizes are fine)");

step("Rule checks — things a mischievous student might try");
const [sA, sB] = [teams[teamIds[0]].members[0], teams[teamIds[1]].members[0]];
await denied("student rewrites meta/phase", () => update(R(sA, code, "meta"), { phase: "reveal" }));
await denied("student renames another team", () => update(R(sA, code, `teams/${teamIds[1]}`), { name: "Losers" }));
await denied("student edits someone else's member record", () => update(R(sA, code, `members/${sB.uid}`), { name: "Hacked" }));
await denied("student sets maxTeams", () => update(R(sA, code, "meta"), { maxTeams: 2 }));

step(`Teacher presses "Start teaching" → phase teach`);
await update(R(teacher, code, "meta"), { phase: "teach" });
log(`   students now see tabs: ${visibleTabs("student", "teach").map((t) => t.label).join(", ")}`);

const trained = {};
const rands = {};
const teamsNode = (await get(R(teacher, code, "teams"))).val();

// One team trains on its current drawings and sends. Round ≥ 2 adds drawings in other teams' styles first.
async function teachAndSend(id, i, round) {
  const t = teams[id];
  const rand = (rands[id] ||= mulberry32(100 + i));
  const samples = trained[id]?.samples || [];
  if (round === 1) {
    for (let k = 0; k < MIN_PER_LABEL + 1; k++) { samples.push({ label: 0, pix: drawShape(0, t.style, rand) }); samples.push({ label: 1, pix: drawShape(1, t.style, rand) }); }
  } else {
    // "Draw them the way other teams might": borrow two other styles.
    const others = teamIds.filter((o) => o !== id).map((o) => teams[o].style).slice(0, 2);
    for (const st of others.length ? others : [t.style]) for (let k = 0; k < 2; k++) {
      samples.push({ label: 0, pix: drawShape(0, st, rand) }); samples.push({ label: 1, pix: drawShape(1, st, rand) });
    }
  }
  const net = newNet(NPIX, HID_A, samples.length * 7 + 3);
  const tTrain = Date.now();
  trainEpochs(net, samples.map((s) => s.pix), samples.map((s) => s.label), EPOCHS_A, LR_A);
  const own = accuracy(net, samples);
  const fresh = { label: 0, pix: drawShape(0, t.style, rand) };
  const guess = fwd(net, fresh.pix).y > 0.5 ? 1 : 0;
  const sender = t.members[0];
  await set(R(sender, code, `models/${id}`), buildModelPayload({ net, samples, own, uid: sender.uid, rand }));
  trained[id] = { net, samples };
  log(`   ${t.name.padEnd(14)} ${samples.length} drawings  own ${pct(own)}  fresh ${LABELS[0]} → "${LABELS[guess]}"  train ${Date.now() - tTrain} ms  ${sender.name} pressed Send`);
}

async function reveal(round) {
  step(`Teacher presses "Reveal tournament" (round ${round}) — every model is scored on the OTHER teams' drawings`);
  await update(R(teacher, code, "meta"), { phase: "reveal" });
  const models = (await get(R(teacher, code, "models"))).val();
  const rounds = (await get(R(teacher, code, "rounds"))).val();
  const prev = round > 1 ? rounds?.[round - 1] || null : null;
  const rows = withDeltas(buildTournamentTable(models, teamsNode), prev);
  const avg = tableAverages(rows);
  const hist = historyAverages(rounds).filter((h) => h.round < round);
  if (round === 1) log(`   students now see tabs: ${visibleTabs("student", "reveal").map((t) => t.label).join(", ")}`);
  if (rows.length < MIN_TEAMS_MEANINGFUL) log(`   ⚠️  only ${rows.length} teams — the app shows "Needs at least 4 teams before this means anything"`);
  log("");
  log(`   PROJECTOR (round ${round}):   ${pct(avg.avgOwn)} on their own drawings   →   ${pct(avg.avgCross)} on everyone else's`);
  if (hist.length) log(`   ${hist.map((h) => `Round ${h.round}: ${pct(h.avgCross)}`).join(" → ")} → Round ${round}: ${pct(avg.avgCross)} on strangers`);
  log("   " + "Team".padEnd(16) + "Own".padEnd(8) + "Strangers".padEnd(12) + (round > 1 ? "change".padEnd(9) : "") + "tested on");
  rows.forEach((r, i) => {
    const d = r.delta == null ? "" : `${r.delta >= 0 ? "▲ +" : "▼ "}${Math.round(r.delta * 100)}`;
    log(`   ${(i === 0 ? "⭐ " : "   ") + r.name.padEnd(13)} ${pct(r.own).padEnd(7)} ${pct(r.cross).padEnd(11)} ${round > 1 ? d.padEnd(9) : ""}${r.n} drawings`);
  });
  log("");
  log(round === 1
    ? `   "So what did your machine actually learn — ${LABELS[0].toLowerCase()}, or the way YOUR TEAM draws a ${LABELS[0].toLowerCase()}?"`
    : `   "The teams that climbed gave the same machine a wider view. What would you feed it next?"`);
  return rows;
}

for (let round = 1; round <= ROUNDS; round++) {
  if (round > 1) {
    step(`Teacher presses "Next round" → round ${round}: scores saved, machines cleared, back to Teach it`);
    const models = (await get(R(teacher, code, "models"))).val();
    const results = summarizeRound(buildTournamentTable(models, teamsNode));
    await update(R(teacher, code), { [`rounds/${round - 1}`]: results, models: null, "meta/round": round, "meta/phase": "teach" });
    const cleared = (await get(R(teacher, code, "models"))).exists();
    log(`   rounds/${round - 1} saved for ${Object.keys(results).length} teams · models cleared: ${!cleared} · students see tabs: ${visibleTabs("student", "teach").map((t) => t.label).join(", ")}`);
  }
  step(round === 1
    ? `Each team draws ${MIN_PER_LABEL + 1} of each in its own style, trains (${NPIX}→${HID_A}→1, ${EPOCHS_A} epochs), tests, sends`
    : `Round ${round}: each team adds 4 drawings per thing in two OTHER teams' styles, retrains, sends again`);
  for (const [i, id] of teamIds.entries()) await teachAndSend(id, i, round);
  if (round === 1) {
    await denied(`${sA.name} (${teams[teamIds[0]].name}) overwrites ${teams[teamIds[1]].name}'s model`,
      () => set(R(sA, code, `models/${teamIds[1]}`), buildModelPayload({ net: trained[teamIds[0]].net, samples: trained[teamIds[0]].samples, own: 0, uid: sA.uid })));
    await denied(`${sA.name} tries to start the next round`, () => update(R(sA, code), { "meta/round": 2, "meta/phase": "teach" }));
  }
  await reveal(round);
}

step(`Teacher presses "Open bendy fence" — one team posts a checkerboard, others race to solve it`);
await update(R(teacher, code, "meta"), { phase: "fence" });
const poster = teams[teamIds[0]];
const xor = [{ x: 0.25, y: 0.25, c: 0 }, { x: 0.75, y: 0.75, c: 0 }, { x: 0.25, y: 0.75, c: 1 }, { x: 0.75, y: 0.25, c: 1 }, { x: 0.3, y: 0.3, c: 0 }, { x: 0.7, y: 0.3, c: 1 }];
const chRef = push(R(poster.members[0], code, "challenges"));
await set(chRef, { teamId: teamIds[0], teamName: poster.name, pts: xor, at: serverTimestamp() });
log(`   ${poster.name} posted a 6-dot checkerboard (no straight fence can split it)`);
const solve = (hid) => {
  const n = newNet(2, hid, 13 + hid); const X = xor.map((p) => [p.x * 2 - 1, p.y * 2 - 1]); const Y = xor.map((p) => p.c);
  for (let i = 0; i < 70; i++) trainEpochs(n, X, Y, 40, 0.35);
  let ok = 0; X.forEach((x, k) => { if ((fwd(n, x).y > 0.5 ? 1 : 0) === Y[k]) ok++; }); return ok / X.length;
};
for (const [hid, id] of [[1, teamIds[1 % teamIds.length]], [3, teamIds[2 % teamIds.length]], [2, teamIds[1 % teamIds.length]]]) {
  const acc = solve(hid); const who = teams[id];
  if (acc < 1) { log(`   ${who.name} tried ${hid} neuron${hid > 1 ? "s" : ""}: ${pct(acc)} fenced — not solved, app refuses the claim`); continue; }
  const res = await runTransaction(R(who.members[0], code, `challenges/${chRef.key}/best`), (cur) => (!cur || hid < cur.neurons ? { teamId: id, teamName: who.name, neurons: hid } : undefined));
  log(`   ${who.name} solved it with ${hid} neurons → ${res.committed ? "recorded as best" : "not better than the current best"}`);
}

step("Reload check — a student who refreshes still has a team");
const me = (await get(R(sA, code, `members/${sA.uid}`))).val();
log(`   ${sA.name} reloads → members/${sA.uid.slice(0, 6)}… says team "${teams[me.teamId]?.name}" ✓`);

if (KEEP) {
  step(`--keep: room ${code} left in the database`);
  log(`   Open https://mehdy922.github.io/neural-lab/?room=${code} as a Student to look around (phase is "fence", so all tabs show).`);
  log(`   Delete it later in the Firebase console under rooms/${code}.`);
} else {
  if (HOLD) {
    step(`--hold: room ${code} stays open for ${HOLD} s — https://mehdy922.github.io/neural-lab/?room=${code}`);
    log(`ROOM_CODE=${code}`);
    await sleep(HOLD * 1000);
  }
  step("Teacher cleans up (Reset board + delete teams, members, room)");
  await update(R(teacher, code), { models: null, challenges: null, rounds: null });
  // Re-read teams and members from the database: anyone who joined during a --hold (e.g. the
  // screenshot browser) must go too, and the teacher is allowed to delete any member record.
  const liveTeams = (await get(R(teacher, code, "teams"))).val() || {};
  const liveMembers = (await get(R(teacher, code, "members"))).val() || {};
  for (const id of Object.keys(liveTeams)) await remove(R(teacher, code, `teams/${id}`));
  for (const uid of Object.keys(liveMembers)) await remove(R(teacher, code, `members/${uid}`));
  await remove(R(teacher, code, "meta"));
  log(`   rooms/${code} is gone: ${(await get(R(teacher, code))).exists() ? "NO — leftovers!" : "yes"}`);
}
log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
process.exit(0);
