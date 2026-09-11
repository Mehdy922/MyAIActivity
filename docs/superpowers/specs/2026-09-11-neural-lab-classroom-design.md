# Neural Lab Classroom — Design Spec

Date: 2026-09-11
Status: approved by user (design sections 1–9 in chat), pending spec review

## 1. Purpose

A free-hosted classroom web app for a 40-minute lesson on what a neural network
actually learns. Teams of students draw two things (default: mango vs cricket
ball), train a real tiny neural network in the browser, see ~100% on their own
drawings, then watch that number collapse when their model is scored on other
teams' drawings. The gap is the lesson: overfitting and dataset bias, discovered
rather than defined. A second period adds "Bendy Fence": dots on a field, a
1–8 neuron slider, and a challenge board.

The existing `neural-lab.jsx` (a Claude-artifact prototype using `window.storage`)
contains the working ML core and all three activity tabs. This project turns it
into a multi-device app with rooms, teams, a teacher role, and a phase-gated
reveal.

## 2. Roles and flow

### Landing
First screen asks: **Are you a teacher or a student?**
- Teacher → Create room.
- Student → Enter 5-character room code (or arrive pre-filled via QR / link
  `?room=CODE`).

### Teacher
1. Create room → receives room code, QR code, join link.
2. Dashboard with tabs:
   - **Lobby**: live list of teams and members; can rename/delete a team,
     move a student, change team cap.
   - **Teach**: same Teach tab students see (teacher can demo).
   - **Tournament**: projector view. Big type. Own-vs-strangers comparison,
     leaderboard, the mango question, the Multan closing.
   - **Fence**: bendy-fence tab plus class challenge board.
   - **Settings**: label pair, team cap (default 4), phase controls
     (Start teaching / Reveal tournament / Open fence), Reset board
     (deletes models + challenges), Close room. Teacher notes and run sheet
     from the prototype live here too.
3. Teacher identity = their Firebase anonymous uid stored as
   `meta/teacherUid`. Persists in that browser's localStorage. Teacher should
   bookmark the room URL. No cross-device teacher recovery in v1.

### Student
1. Enter room code + display name.
2. Lobby: create a team (name) or tap an existing team to join. Team card
   shows members and `n/cap`. Full teams are disabled. Student can leave and
   switch teams until their team has sent a model.
3. Tabs visible depend on room phase (see below). Team name is derived from
   membership; no free-text team field on the Teach tab.
4. Anonymous uid persists → reload keeps the student in their team.

### Phases (`meta/phase`)

| phase    | students see                      | teacher action to advance |
|----------|-----------------------------------|---------------------------|
| `lobby`  | Lobby only                        | "Start teaching"          |
| `teach`  | Lobby, Teach                      | "Reveal tournament"       |
| `reveal` | Lobby, Teach, Tournament          | "Open fence"              |
| `fence`  | Lobby, Teach, Tournament, Fence   | —                         |

Teacher sees all tabs at all times. Phases only move forward except via
"Reset board", which returns to `teach` and clears models/challenges.
Students who join during `teach` or later can still form/join a team and draw.

## 3. Stack and hosting

- **Frontend**: Vite + React 19, plain JavaScript (no TypeScript). No router
  library; room selected via `?room=CODE` query param.
- **Backend**: Firebase Realtime Database (RTDB) + Firebase Anonymous
  Authentication, Spark (free) plan. Verified limits (2026-09-11):
  100 simultaneous connections, 1 GB stored, 10 GB/month download,
  no payment method required.
- **Hosting**: GitHub Pages from the existing repo `Mehdy922/neural-lab`
  via a GitHub Actions workflow on push to `main`. Vite `base` set to
  `/neural-lab/`. Live URL: `https://mehdy922.github.io/neural-lab/`.
- **Config**: Firebase web config object committed in `src/firebaseConfig.js`
  (public by design; security is in RTDB rules). README gives the exact
  console steps: create project → enable Anonymous sign-in → create RTDB
  (locked mode) → paste config → deploy rules.
- **QR code**: one small npm dependency (`qrcode`) to render the join
  link on the teacher's Create/Lobby screen.

## 4. Data model (RTDB)

```
rooms/{CODE}/
  meta:
    labels:      ["Mango", "Cricket ball"]
    teamCap:     4
    phase:       "lobby" | "teach" | "reveal" | "fence"
    teacherUid:  string
    createdAt:   serverTimestamp
    closed:      boolean (optional)
  members/{uid}:
    name:        string (≤ 24 chars)
    teamId:      string | null
    joinedAt:    serverTimestamp
  teams/{teamId}:                    # light; every client subscribes
    name:        string (≤ 22 chars)
    createdBy:   uid
    createdAt:   serverTimestamp
  models/{teamId}:                   # heavy (~25 KB); fetched on reveal
    model:       { nIn, nHid, W1, b1, W2, b2 }   (rounded to 3 dp)
    tests:       [ { label: 0|1, pix: [256 numbers, 2 dp] } ]  (3 per label)
    own:         number (0–1)
    sentBy:      uid
    at:          serverTimestamp
  challenges/{id}:
    teamId:      string
    teamName:    string
    pts:         [ { x, y, c } ]  (≤ 60 points, 3 dp)
    best:        { teamId, teamName, neurons } | null
    at:          serverTimestamp
```

Decisions:
- Team keys are RTDB push IDs. Names are fields (RTDB keys cannot contain
  `. # $ [ ] /`; the prototype used names as keys).
- Per-team write paths remove the prototype's read-modify-write race on a
  single blob.
- Students subscribe to `meta`, `members`, `teams` only. `models` is
  subscribed only while the Tournament tab is mounted (teacher projector, or
  students at `reveal`+).
- Room code: 5 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no O/0/I/1).
  Client checks `rooms/{CODE}/meta` does not exist before creating; retries on
  collision (max 5).
- Labels live per room in `meta`. Closing scenario fixed to the mango/Multan
  text in v1.

## 5. Security rules (RTDB)

Written in plain language here; implemented in `database.rules.json`.

- All reads under `rooms/{CODE}` require `auth != null` (anonymous counts).
- `meta`: create allowed if `teacherUid` does not exist yet and the new value
  sets `teacherUid == auth.uid`. Updates allowed only when
  `auth.uid == existing teacherUid`.
- `members/{uid}`: write only when `uid == auth.uid`, or by teacher (to move
  students). `name` ≤ 24 chars.
- `teams/{teamId}`: create allowed for any authed user; `name` ≤ 22 chars.
  Rename/delete only by teacher.
- Team cap: enforced client-side (disabled join button). Not enforced in
  rules for v1; acceptable in a supervised classroom.
- `models/{teamId}`: write only when
  `root.rooms/{CODE}/members/{auth.uid}/teamId == teamId`, or by teacher.
  Validation: `tests` length ≤ 12, `model.nHid == 10`, `model.nIn == 256`.
- `challenges/{id}`: create by any authed user; `best` may be updated by any
  authed user (fewest-neurons check is client-side); delete by teacher only.
- Teacher-only bulk deletes: `models`, `challenges` (Reset board). Close room
  sets `meta/closed = true`; actual deletion is manual in the console for v1.

## 6. Screens and components

```
src/
  main.jsx
  App.jsx                 # reads ?room, auth state, role, phase → routes
  firebase.js             # app init, auth, db handles
  theme.js                # palette, styles, CSS string
  ml/
    net.js                # mulberry32, newNet, fwd, trainEpochs, accuracy, packNet
    capture.js            # canvas → auto-crop → 16×16 → 256 floats
    scoring.js            # buildTournamentTable(models, teams)
  rooms/
    codes.js              # generateRoomCode, isValidCode
    api.js                # createRoom, joinRoom, createTeam, joinTeam, leaveTeam,
                          # sendModel, postChallenge, claimChallenge, setPhase,
                          # setLabels, setTeamCap, resetBoard, closeRoom
    useRoom.js            # hook: subscribes meta/members/teams; returns live state
    phases.js             # visibleTabs(role, phase)
  screens/
    Landing.jsx           # "Are you a teacher or a student?"
    TeacherCreate.jsx     # create room → code, QR, link
    StudentJoin.jsx       # code + name
    Lobby.jsx             # teams grid; role-dependent controls
    Teach.jsx             # prototype Tab 1, team from membership
    Tournament.jsx        # prototype Tab 2, projector type sizes, ≥4-team caution
    Fence.jsx             # prototype Tab 3 + challenge board
    Settings.jsx          # teacher-only
  components/
    Tabs.jsx, Toast.jsx, Thumb.jsx, MiniPattern.jsx, QrLink.jsx, TeamCard.jsx
```

### Visual design: playful, colorful, fun (user request)

The prototype's dark indigo "ajrak" palette is replaced.

- **Ground**: warm off-white / cream background, white cards with soft
  shadows and large radii (16–20 px).
- **Accents** (saturated, high-contrast on cream): mango orange, leaf green,
  sky blue, berry pink, sunshine yellow. Label 0 and label 1 get two distinct
  accents (orange vs blue) used consistently for pick buttons, thumbnails,
  dots, and decision-surface tints.
- **Type**: rounded display font from Google Fonts (Fredoka or Baloo 2) for
  headlines and big numbers; a clean sans (Nunito) for body. Real fallback
  stacks.
- **Buttons**: chunky, pill-shaped, bold, with a small press/bounce
  transition. Primary action per screen is unmistakable.
- **Motion**: light only. Toast slide-in, score count-up on Train, confetti
  burst or emoji pop when a model is sent. Nothing that blocks interaction.
- **Tournament / projector**: same playful palette but larger type; own score
  in green, strangers score in orange/red; leaderboard bars in accent colors.
- **Accessibility**: text contrast ≥ 4.5:1 on all backgrounds; colour never
  the only signal (labels always have text).

### Layout rules
- Phone-first at ~400 px width; canvases keep `touchAction: none`; side
  gutter ≥ 16 px.
- Tournament headline numbers ≥ 56 px on desktop.
- Tournament shows scores at ≥ 2 sent models, with a visible caution
  ("Needs at least 4 teams before this means anything") until ≥ 4.

## 7. Behaviour preserved from the prototype

- Drawing capture: crop to ink bounding box, centre, pad 25% + 8 px, scale
  to 16×16, invert to 0–1. Unchanged. This is what stops teams "winning" by
  drawing in a fixed corner.
- Network: 256 → 10 (tanh) → 1 (sigmoid); SGD, 240 epochs, lr 0.06; seeded
  by sample count. Training runs on the main thread (≈1 s on a phone).
- Minimum 4 drawings per label before Train enables; UI asks for 5–6.
- Send: packed weights (3 dp) + 3 random test drawings per label (2 dp).
- Tournament: each model scored against the union of all other teams' test
  drawings; sorted by strangers score; averages shown as own → strangers.
- Fence: 2 → h (tanh) → 1, h ∈ [1, 8]; 70 animated ticks × 40 epochs at
  lr 0.35; decision surface painted on a 56×56 grid; challenge needs ≥ 6 dots;
  claim requires 100% and fewer neurons than the current best.
- Copy: the "So what did your machine actually learn" question and the
  Multan mango closing are kept verbatim. Teacher notes/run sheet kept in
  Settings.

## 8. Error handling and edge cases

- **Offline / write failure**: toast "Could not reach the class board";
  local drawings and trained model are kept; RTDB SDK retries on reconnect.
- **Room not found or closed**: clear message on Join; return to Landing.
- **Room code collision on create**: regenerate and retry (max 5).
- **Team full**: join button disabled with `n/cap` shown.
- **Student sends model then wants to switch team**: blocked with message;
  teacher can move them from Lobby.
- **Two members of one team both press Send**: last write wins on
  `models/{teamId}`; Teach tab shows "Sent by <name> at <time>" from the live
  record so both see which one stands.
- **Teacher device lost**: no recovery in v1; documented. Teacher can create
  a new room and re-share the code.
- **Student reloads**: anonymous uid persists; `members/{uid}` restores team.
- **Phase moves while student mid-draw**: local state unaffected; new tab
  simply becomes available.

## 9. Testing

- **Unit (Vitest)**:
  - `ml/net.js`: training on a small separable set reaches 100%; `fwd` output
    in (0,1); `packNet` round-trips within tolerance.
  - `ml/scoring.js`: cross-score table with 3 fake teams matches hand-computed
    values; sorting; averages; `n` counts.
  - `rooms/codes.js`: length 5, alphabet excludes O/0/I/1, validator.
  - `rooms/phases.js`: visible tabs for every (role, phase) pair.
- **Rules (`@firebase/rules-unit-testing` + emulator)**:
  - Non-teacher cannot write `meta`; teacher can.
  - Member can write only own `members/{uid}`.
  - Member of team A cannot write `models/teamB`.
  - Unauthenticated read denied.
- **Manual acceptance**: two browsers (teacher + student). Full run: create →
  join → team → draw → train → send → reveal → leaderboard → fence challenge
  → claim. Also one phone at ~400 px.

## 10. Out of scope for v1

- Web Worker training.
- Teacher account recovery across devices.
- Automatic room expiry/cleanup (manual delete in Firebase console).
- Multiple label pairs per room, per-room closing scenario picker.
- Enforcing team cap in security rules.
- i18n.

## 11. Setup the user performs (documented in README)

1. console.firebase.google.com → Add project (any name, Analytics off).
2. Build → Authentication → Sign-in method → enable **Anonymous**.
3. Build → Realtime Database → Create database → locked mode.
4. Project settings → Your apps → Web app → copy config → paste into
   `src/firebaseConfig.js`.
5. Deploy rules: either paste `database.rules.json` into the Rules tab, or
   `npx firebase deploy --only database` after `firebase login`.
6. Repo → Settings → Pages → Source: GitHub Actions. Push to `main` deploys.
