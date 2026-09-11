# Neural Lab

A classroom web app: teams draw two things, train a real tiny neural network in the
browser, score ~100% on their own drawings, then watch the number collapse when their
model meets other teams' drawings. Overfitting and dataset bias, discovered rather than
defined. Second period: Bendy Fence (dots, a 1–8 neuron slider, class challenges).

Live: https://mehdy922.github.io/neural-lab/

## One-time setup (teacher, ~5 minutes)

1. Go to https://console.firebase.google.com → **Add project** → any name → turn Google Analytics **off** → Create.
2. Left menu **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save**.
3. **Build → Realtime Database → Create database** → pick a location → **Start in locked mode** → Enable.
   Then open the **Data** tab and copy the database URL shown at the top (it looks like
   https://…-default-rtdb.firebaseio.com or https://…-default-rtdb.<region>.firebasedatabase.app).
   You'll need it in step 6.
4. **Rules** tab → replace everything with the contents of `database.rules.json` → **Publish**.
5. Project settings (gear icon) → **General → Your apps → Web (</>)** → nickname anything → Register → copy the `firebaseConfig` values.
6. Use the URL copied in step 3 for `databaseURL`; the other four values (`apiKey`, `authDomain`,
   `projectId`, `appId`) come from the web-app config in step 5.
   Easiest: on GitHub open `src/firebaseConfig.js` → pencil icon (Edit) → replace the `PASTE_…`
   values → Commit changes directly to `main` (or clone the repo, edit locally, commit and push).
   GitHub Actions rebuilds and deploys automatically (Actions tab shows progress).
7. Firebase console → Authentication → Settings → Authorized domains → Add domain →
   `mehdy922.github.io`.
8. GitHub → repo Settings → Pages → Source: GitHub Actions. (Already done for this repo;
   needed for forks or re-dos.)

Everything runs on Firebase's free Spark plan. No card needed. Limits: 100 simultaneous
connections, 1 GB stored, 10 GB/month download — plenty for a class.

Troubleshooting:
- Page says "Could not sign in" with `auth/admin-restricted-operation` or `auth/operation-not-allowed` → step 2 (Anonymous) is not enabled.
- `auth/unauthorized-domain` → see step 7 (Authorized domains).
- Students see "permission denied" toasts → step 4 (rules) not published, or published to a different database.

## Running a lesson

1. Open the live URL → **Teacher** → set the pair (default Mango vs Cricket ball; try Sun vs Flower) and team size → **Create room**.
2. Put the Lobby on the projector: room code + QR.
3. Students: open the URL → **Student** → code + name → create or join a team.
4. Press **Start teaching**. Students draw 5 of each, **Train**, test with **What is it?**, then **Send my machine to the class**.
5. Press **Reveal tournament**. Open the Tournament tab on the projector. Wait for the noise.
6. Second period: **Open bendy fence**.

Teacher tips, run sheet and the one rule are in the **Settings** tab inside the room.

## Development

```bash
npm install
npm run dev          # http://localhost:5173/neural-lab/
npm test             # unit tests (Vitest, jsdom)
npm run test:rules   # security rules against the Firebase emulator (needs Java)
npm run build
```

## After the first deploy

- Bookmark the room URL you create — the teacher role is tied to this browser (anonymous sign-in). Clearing site data or switching browsers means creating a new room.
- To re-use the app next term: open the live URL → Teacher → Create room. Old rooms stay in the database until you delete them in the Firebase console (Realtime Database → `rooms`).

## Layout

- `src/ml/` — the network, drawing capture (auto-crop + centre), cross-scoring
- `src/rooms/` — room codes, phases, RTDB API, live-state hooks
- `src/screens/` — Landing, TeacherCreate, StudentJoin, Room, Lobby, Teach, Tournament, Fence, Settings
- `database.rules.json` — who may write what
- `docs/superpowers/specs/` — design spec; `docs/prototype/` — original single-file prototype
