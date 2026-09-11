# Neural Lab Classroom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-file `neural-lab.jsx` prototype into a free-hosted, multi-device classroom app with teacher-created rooms, student teams, phase-gated tournament reveal, and a playful visual theme.

**Architecture:** Vite + React static site on GitHub Pages. Firebase Realtime Database (RTDB) + Anonymous Auth hold room state (meta, members, teams, models, challenges) under `rooms/{CODE}`. The ML core (tiny MLP, auto-crop capture, cross-scoring) is lifted from the prototype into pure modules with unit tests. Screens subscribe to light paths (`meta`, `members`, `teams`) and load heavy `models` only when the Tournament tab is mounted. Security is in RTDB rules, tested against the emulator.

**Tech Stack:** React 19, Vite 8, Vitest 5 (jsdom), Firebase JS SDK 12 (`firebase/app`, `firebase/auth`, `firebase/database`), `qrcode`, `@firebase/rules-unit-testing` + `firebase-tools` emulator, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-11-neural-lab-classroom-design.md`

## Global Constraints

- Plain JavaScript, no TypeScript. React function components + hooks only.
- Vite `base` is exactly `/MyAIActivity/`. Live URL `https://mehdy922.github.io/MyAIActivity/`.
- Routing is by query param `?room=CODE` only. No router library.
- Room code: 5 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Limits copied from spec: member name ≤ 24 chars, team name ≤ 22 chars, label ≤ 24 chars, team cap 1–12 (default 4), challenge ≤ 60 points, 3 test drawings per label, 4 drawings per label minimum before Train.
- Network: 256 → 10 (tanh) → 1 (sigmoid), 240 epochs, lr 0.06. Fence net: 2 → h (1–8) → 1, 70 ticks × 40 epochs, lr 0.35.
- Capture: crop to ink bounding box (red channel < 200), centre, side = max(w,h) × 1.25 + 8, scale to 16×16, invert to 0–1. Do not change.
- Phases in order: `lobby` → `teach` → `reveal` → `fence`.
- Copy kept verbatim from prototype: the "So what did your machine actually learn" question and the Multan mango closing (see Task 18).
- Theme: cream ground, white cards, mango-orange (label 0) and sky-blue (label 1), Fredoka display + Nunito body, pill buttons. Text contrast ≥ 4.5:1.
- Firebase config lives in `src/firebaseConfig.js` and is committed. Placeholder values contain the string `PASTE`.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Run tests with `npm test` (Vitest, jsdom). Rules tests with `npm run test:rules` (needs Java, present: 22.0.2).

## File map

```
.github/workflows/deploy.yml   GitHub Pages build+deploy on push to main
index.html                     Vite entry
vite.config.js                 base, react plugin, vitest (jsdom) config
vitest.rules.config.js         node-env config for emulator rules tests
firebase.json                  emulator + rules file pointer
database.rules.json            RTDB security rules
package.json
README.md                      setup steps for the teacher (Firebase + Pages)
docs/prototype/neural-lab.jsx  original prototype, moved here for reference
src/main.jsx                   React root
src/App.jsx                    auth, ?room parsing, Landing/Create/Join/Room switch
src/firebaseConfig.js          committed web config (user pastes values)
src/firebase.js                getFirebase(), ensureAuth(), subscribe(), isConfigured()
src/theme.js                   C (palette), LABEL_COLORS, fonts, CSS, S (styles)
src/ml/net.js                  mulberry32, newNet, fwd, trainEpochs, accuracy, packNet, packPix, pct
src/ml/capture.js              GRID, NPIX, inkBounds, cropBox, rgbaToPix, pixToRGBA, captureFromCanvas
src/ml/scoring.js              buildTournamentTable, tableAverages, MIN_TEAMS_*
src/rooms/codes.js             CODE_ALPHABET, CODE_LENGTH, generateRoomCode, normalizeCode, isValidCode
src/rooms/phases.js            PHASES, TABS, visibleTabs, nextPhase, PHASE_ACTIONS
src/rooms/api.js               all RTDB writes + pure payload builders
src/rooms/hooks.js             useAuth, usePath, useRoom, useModels, useChallenges, useTeamModel
src/components/Toast.jsx       useToast, Toast
src/components/Tabs.jsx        Tabs
src/components/Thumb.jsx       Thumb (16×16 preview)
src/components/MiniPattern.jsx MiniPattern (challenge preview)
src/components/QrLink.jsx      QrLink
src/components/TeamCard.jsx    TeamCard
src/components/DrawCanvas.jsx  DrawCanvas (pointer drawing, clear/capture via ref)
src/components/PhaseBar.jsx    PhaseBar (teacher phase controls)
src/screens/Landing.jsx        "Are you a teacher or a student?"
src/screens/TeacherCreate.jsx  labels + cap → createRoom
src/screens/StudentJoin.jsx    code + name → joinRoom
src/screens/Room.jsx           room shell: header, tabs, routes to tab screens
src/screens/Lobby.jsx          teams grid, create/join/leave, teacher QR + controls
src/screens/Teach.jsx          draw, train, test, send
src/screens/Tournament.jsx     leaderboard, caution, questions
src/screens/Fence.jsx          bendy fence + challenges
src/screens/Settings.jsx       labels, cap, reset, close, teacher notes
tests/rules/rules.test.js      emulator rules tests
```

---

### Task 1: Scaffold Vite + React project

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `.gitignore`
- Move: `neural-lab.jsx` → `docs/prototype/neural-lab.jsx`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test` scripts. `src/App.jsx` default export `App` (placeholder, replaced in Task 15).

- [ ] **Step 1: Move the prototype**

```bash
mkdir -p docs/prototype && git mv neural-lab.jsx docs/prototype/neural-lab.jsx
```

- [ ] **Step 2: Write package.json**

```json
{
  "name": "neural-lab-classroom",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:rules": "firebase emulators:exec --only database --project demo-neural-lab \"vitest run --config vitest.rules.config.js\""
  },
  "dependencies": {
    "firebase": "^12.19.0",
    "qrcode": "^1.5.4",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^5.0.2",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.3.3",
    "@vitejs/plugin-react": "^6.1.1",
    "firebase-tools": "^15.30.0",
    "jsdom": "^30.0.1",
    "vite": "^8.3.0",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 3: Write vite.config.js**

```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/MyAIActivity/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    passWithNoTests: true,
  },
});
```

- [ ] **Step 4: Write index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#FF8A3D" />
    <title>Neural Lab</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write src/main.jsx and placeholder src/App.jsx**

`src/main.jsx`:
```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/App.jsx` (placeholder, replaced in Task 15):
```jsx
export default function App() {
  return <h1 style={{ fontFamily: "system-ui", padding: 24 }}>Neural Lab — scaffold OK</h1>;
}
```

- [ ] **Step 6: Write .gitignore**

```
node_modules
dist
.firebase
firebase-debug.log
database-debug.log
ui-debug.log
*.local
```

- [ ] **Step 7: Install and build**

Run: `npm install`
Expected: completes, `package-lock.json` created, no ERESOLVE errors.
Fallback if npm reports ERESOLVE on `@vitejs/plugin-react`: pin `"vite": "^7.1.0"` and `"@vitejs/plugin-react": "^5.0.0"` (Vitest 5 supports Vite 7) and re-run.

Run: `npm run build`
Expected: `dist/index.html` exists, output mentions `/MyAIActivity/assets/...`.

Run: `npm test`
Expected: exits 0 with "No test files found" (allowed by `passWithNoTests`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Scaffold Vite + React app, move prototype to docs/prototype

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: GitHub Pages deploy pipeline

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: every push to `main` builds and deploys `dist/` to `https://mehdy922.github.io/MyAIActivity/`.

- [ ] **Step 1: Write the workflow**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Make the repo public (user has confirmed), then enable Pages with Actions as source**

The repo was private on 2026-09-11. Free GitHub Pages requires a public repo. Nothing in the repo is secret: the Firebase web config is public by design and access is controlled by `database.rules.json`.

Run:
```bash
gh repo edit Mehdy922/MyAIActivity --visibility public --accept-visibility-change-consequences
gh repo view Mehdy922/MyAIActivity --json visibility
gh api -X POST repos/Mehdy922/MyAIActivity/pages -f build_type=workflow
```
Expected: `{"visibility":"PUBLIC"}`, then Pages JSON with `"build_type": "workflow"`.
Expected: JSON with `"build_type": "workflow"`. If HTTP 409 "already exists", run instead:
```bash
gh api -X PUT repos/Mehdy922/MyAIActivity/pages -f build_type=workflow
```

- [ ] **Step 3: Commit and push, watch the run**

```bash
git add .github
git commit -m "Add GitHub Pages deploy workflow

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main
gh run watch --exit-status
```
Expected: run succeeds. Then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://mehdy922.github.io/MyAIActivity/
```
Expected: `200` (may take a minute after first deploy).

---

### Task 3: ML core — `src/ml/net.js`

**Files:**
- Create: `src/ml/net.js`, `src/ml/net.test.js`

**Interfaces:**
- Produces:
  - `mulberry32(seed: number): () => number`
  - `newNet(nIn: number, nHid: number, seed?: number): Net` where `Net = { nIn, nHid, W1: number[][], b1: number[], W2: number[], b2: number }`
  - `fwd(net: Net, x: number[]): { h: number[], y: number }`
  - `trainEpochs(net: Net, X: number[][], Y: (0|1)[], epochs: number, lr: number): void` (mutates net)
  - `accuracy(net: Net, samples: { pix: number[], label: 0|1 }[]): number | null`
  - `packNet(net: Net): Net` (rounded to 3 dp)
  - `packPix(pix: number[]): number[]` (rounded to 2 dp)
  - `pct(v: number | null): string`
  - constants `HID_A = 10`, `EPOCHS_A = 240`, `LR_A = 0.06`, `MIN_PER_LABEL = 4`

- [ ] **Step 1: Write the failing tests**

`src/ml/net.test.js`:
```js
import { describe, it, expect } from "vitest";
import { mulberry32, newNet, fwd, trainEpochs, accuracy, packNet, packPix, pct, HID_A, EPOCHS_A, LR_A } from "./net.js";

// 16x16 synthetic drawings: label 0 = left half inked, label 1 = right half inked
function halfPattern(side, shift) {
  const pix = new Array(256).fill(0);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const inked = side === 0 ? x < 8 + shift : x >= 8 + shift;
      pix[y * 16 + x] = inked ? 1 : 0;
    }
  return pix;
}

describe("mulberry32", () => {
  it("is deterministic and in [0,1)", () => {
    const a = mulberry32(7), b = mulberry32(7);
    const xs = Array.from({ length: 5 }, () => a());
    const ys = Array.from({ length: 5 }, () => b());
    expect(xs).toEqual(ys);
    xs.forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); });
  });
});

describe("newNet / fwd", () => {
  it("builds the right shapes and outputs a probability", () => {
    const net = newNet(4, 3, 1);
    expect(net.W1).toHaveLength(3);
    expect(net.W1[0]).toHaveLength(4);
    expect(net.b1).toHaveLength(3);
    expect(net.W2).toHaveLength(3);
    const { h, y } = fwd(net, [0.1, 0.2, 0.3, 0.4]);
    expect(h).toHaveLength(3);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(1);
  });
});

describe("trainEpochs", () => {
  it("reaches 100% on a linearly separable 2D set", () => {
    const X = [[-1, -1], [-1, 1], [1, -1], [1, 1], [-0.5, 0.2], [0.5, -0.3]];
    const Y = [0, 0, 1, 1, 0, 1];
    const net = newNet(2, 1, 3);
    trainEpochs(net, X, Y, 200, 0.3);
    const samples = X.map((pix, i) => ({ pix, label: Y[i] }));
    expect(accuracy(net, samples)).toBe(1);
  });

  it("reaches 100% on synthetic 16x16 drawings with the production settings", () => {
    const samples = [];
    for (const shift of [-1, 0, 1, 2]) {
      samples.push({ pix: halfPattern(0, shift), label: 0 });
      samples.push({ pix: halfPattern(1, shift), label: 1 });
    }
    const net = newNet(256, HID_A, samples.length * 7 + 3);
    trainEpochs(net, samples.map((s) => s.pix), samples.map((s) => s.label), EPOCHS_A, LR_A);
    expect(accuracy(net, samples)).toBe(1);
  });
});

describe("accuracy", () => {
  it("returns null for no samples", () => {
    expect(accuracy(newNet(2, 1), [])).toBeNull();
  });
});

describe("packNet / packPix", () => {
  it("rounds weights to 3 dp and keeps predictions", () => {
    const net = newNet(2, 2, 5);
    net.W1[0][0] = 0.123456;
    const packed = packNet(net);
    expect(packed.W1[0][0]).toBe(0.123);
    expect(packed.nIn).toBe(2);
    expect(packed.nHid).toBe(2);
    const y1 = fwd(net, [0.3, -0.7]).y, y2 = fwd(packed, [0.3, -0.7]).y;
    expect(Math.abs(y1 - y2)).toBeLessThan(0.01);
  });
  it("packPix rounds to 2 dp", () => {
    expect(packPix([0.123, 0.999, 0])).toEqual([0.12, 1, 0]);
  });
});

describe("pct", () => {
  it("formats", () => {
    expect(pct(null)).toBe("—");
    expect(pct(undefined)).toBe("—");
    expect(pct(0.5)).toBe("50%");
    expect(pct(0.666)).toBe("67%");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ml/net.test.js`
Expected: FAIL — cannot resolve `./net.js`.

- [ ] **Step 3: Write src/ml/net.js**

```js
// Tiny MLP: nIn -> nHid (tanh) -> 1 (sigmoid). Lifted from the prototype unchanged.

export const HID_A = 10;        // hidden units for the drawing net
export const EPOCHS_A = 240;
export const LR_A = 0.06;
export const MIN_PER_LABEL = 4;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newNet(nIn, nHid, seed = 1) {
  const r = mulberry32(seed);
  return {
    nIn, nHid,
    W1: Array.from({ length: nHid }, () =>
      Array.from({ length: nIn }, () => (r() * 2 - 1) * Math.sqrt(2 / nIn))),
    b1: new Array(nHid).fill(0),
    W2: Array.from({ length: nHid }, () => (r() * 2 - 1) * Math.sqrt(2 / nHid)),
    b2: 0,
  };
}

export function fwd(net, x) {
  const h = new Array(net.nHid);
  for (let j = 0; j < net.nHid; j++) {
    let s = net.b1[j];
    const w = net.W1[j];
    for (let i = 0; i < net.nIn; i++) s += w[i] * x[i];
    h[j] = Math.tanh(s);
  }
  let o = net.b2;
  for (let j = 0; j < net.nHid; j++) o += net.W2[j] * h[j];
  return { h, y: 1 / (1 + Math.exp(-o)) };
}

export function trainEpochs(net, X, Y, epochs, lr) {
  for (let e = 0; e < epochs; e++) {
    for (let n = 0; n < X.length; n++) {
      const x = X[n], t = Y[n];
      const { h, y } = fwd(net, x);
      const dO = y - t;
      for (let j = 0; j < net.nHid; j++) {
        const dH = dO * net.W2[j] * (1 - h[j] * h[j]);
        net.W2[j] -= lr * dO * h[j];
        const w = net.W1[j];
        for (let i = 0; i < net.nIn; i++) if (x[i] !== 0) w[i] -= lr * dH * x[i];
        net.b1[j] -= lr * dH;
      }
      net.b2 -= lr * dO;
    }
  }
}

export function accuracy(net, samples) {
  if (!samples || !samples.length) return null;
  let ok = 0;
  samples.forEach((s) => { if ((fwd(net, s.pix).y > 0.5 ? 1 : 0) === s.label) ok++; });
  return ok / samples.length;
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const r2 = (v) => Math.round(v * 100) / 100;

export const packNet = (n) => ({
  nIn: n.nIn, nHid: n.nHid,
  W1: n.W1.map((row) => row.map(r3)),
  b1: n.b1.map(r3),
  W2: n.W2.map(r3),
  b2: r3(n.b2),
});

export const packPix = (p) => p.map(r2);

export const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ml/net.test.js`
Expected: all PASS. If the 16×16 test fails, do NOT change the constants; change the seed in the test to `samples.length * 7 + 4` and note it — the production seed depends on sample count and the toy set is much smaller than a real class set.

- [ ] **Step 5: Commit**

```bash
git add src/ml/net.js src/ml/net.test.js
git commit -m "Add tiny MLP core with tests

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Drawing capture — `src/ml/capture.js`

**Files:**
- Create: `src/ml/capture.js`, `src/ml/capture.test.js`

**Interfaces:**
- Produces:
  - `GRID = 16`, `NPIX = 256`, `INK_THRESHOLD = 200`
  - `inkBounds(data: Uint8ClampedArray, width, height, threshold?) → { x0, y0, x1, y1 } | null`
  - `cropBox(bounds) → { sx, sy, side }`
  - `rgbaToPix(data, n?) → number[]` (1 − red/255)
  - `pixToRGBA(pix: number[]) → Uint8ClampedArray` (grey, opaque)
  - `captureFromCanvas(canvas: HTMLCanvasElement, grid?) → number[] | null` (browser only)

- [ ] **Step 1: Write the failing tests**

`src/ml/capture.test.js`:
```js
import { describe, it, expect } from "vitest";
import { inkBounds, cropBox, rgbaToPix, pixToRGBA, GRID, NPIX } from "./capture.js";

function whiteRGBA(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  d.fill(255);
  return d;
}
function ink(d, w, x, y) {
  const i = (y * w + x) * 4;
  d[i] = 17; d[i + 1] = 17; d[i + 2] = 17; d[i + 3] = 255;
}

describe("constants", () => {
  it("grid is 16 and NPIX 256", () => {
    expect(GRID).toBe(16);
    expect(NPIX).toBe(256);
  });
});

describe("inkBounds", () => {
  it("returns null for a blank canvas", () => {
    expect(inkBounds(whiteRGBA(10, 10), 10, 10)).toBeNull();
  });
  it("finds the bounding box of dark pixels", () => {
    const d = whiteRGBA(20, 20);
    ink(d, 20, 3, 4); ink(d, 20, 10, 12); ink(d, 20, 7, 7);
    expect(inkBounds(d, 20, 20)).toEqual({ x0: 3, y0: 4, x1: 10, y1: 12 });
  });
  it("ignores light grey above the threshold", () => {
    const d = whiteRGBA(5, 5);
    d[0] = 230;
    expect(inkBounds(d, 5, 5)).toBeNull();
  });
});

describe("cropBox", () => {
  it("centres a square 25% larger plus 8px", () => {
    const box = cropBox({ x0: 10, y0: 20, x1: 50, y1: 40 });
    // w=40, h=20 -> side = 40*1.25+8 = 58, centre (30,30)
    expect(box.side).toBe(58);
    expect(box.sx).toBe(30 - 29);
    expect(box.sy).toBe(30 - 29);
  });
});

describe("rgbaToPix / pixToRGBA", () => {
  it("inverts red channel to 0..1", () => {
    const d = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 127.5, 0, 0, 255]);
    const pix = rgbaToPix(d, 3);
    expect(pix[0]).toBe(0);
    expect(pix[1]).toBe(1);
    expect(pix[2]).toBeCloseTo(0.5, 1);
  });
  it("round-trips through pixToRGBA", () => {
    const pix = [0, 1, 0.5];
    const rgba = pixToRGBA(pix);
    expect(rgba).toHaveLength(12);
    expect(rgba[0]).toBe(255); expect(rgba[3]).toBe(255);
    expect(rgba[4]).toBe(0);
    expect(rgba[8]).toBe(255 - 128);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ml/capture.test.js`
Expected: FAIL — cannot resolve `./capture.js`.

- [ ] **Step 3: Write src/ml/capture.js**

```js
// Canvas -> auto-crop -> centre -> 16x16 -> 256 floats in 0..1.
// The crop/centre step is what stops a team "winning" by always drawing in one corner.

export const GRID = 16;
export const NPIX = GRID * GRID;
export const INK_THRESHOLD = 200;

export function inkBounds(data, width, height, threshold = INK_THRESHOLD) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4] < threshold) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

export function cropBox({ x0, y0, x1, y1 }) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const side = Math.max(x1 - x0, y1 - y0) * 1.25 + 8;
  return { sx: cx - side / 2, sy: cy - side / 2, side };
}

export function rgbaToPix(data, n = NPIX) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = 1 - data[i * 4] / 255;
  return out;
}

export function pixToRGBA(pix) {
  const out = new Uint8ClampedArray(pix.length * 4);
  for (let i = 0; i < pix.length; i++) {
    const v = 255 - Math.round(pix[i] * 255);
    out[i * 4] = v; out[i * 4 + 1] = v; out[i * 4 + 2] = v; out[i * 4 + 3] = 255;
  }
  return out;
}

export function captureFromCanvas(canvas, grid = GRID) {
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = inkBounds(img.data, canvas.width, canvas.height);
  if (!bounds) return null;
  const { sx, sy, side } = cropBox(bounds);
  const small = document.createElement("canvas");
  small.width = grid; small.height = grid;
  const sc = small.getContext("2d");
  sc.imageSmoothingEnabled = true;
  sc.fillStyle = "#fff"; sc.fillRect(0, 0, grid, grid);
  sc.drawImage(canvas, sx, sy, side, side, 0, 0, grid, grid);
  return rgbaToPix(sc.getImageData(0, 0, grid, grid).data, grid * grid);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ml/capture.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ml/capture.js src/ml/capture.test.js
git commit -m "Add drawing capture with auto-crop and centre

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Tournament scoring — `src/ml/scoring.js`

**Files:**
- Create: `src/ml/scoring.js`, `src/ml/scoring.test.js`

**Interfaces:**
- Consumes: `accuracy` from `./net.js`.
- Produces:
  - `buildTournamentTable(models: Record<teamId, { model, tests, own }>, teams: Record<teamId, { name }>) → Row[]` sorted by `cross` desc, `Row = { teamId, name, own, cross, n }`
  - `tableAverages(rows) → { avgOwn, avgCross, count }`
  - `MIN_TEAMS_TO_SHOW = 2`, `MIN_TEAMS_MEANINGFUL = 4`

- [ ] **Step 1: Write the failing tests**

`src/ml/scoring.test.js`:
```js
import { describe, it, expect } from "vitest";
import { buildTournamentTable, tableAverages, MIN_TEAMS_TO_SHOW, MIN_TEAMS_MEANINGFUL } from "./scoring.js";

// 1-input, 1-hidden nets with hand-set weights.
const signNet = { nIn: 1, nHid: 1, W1: [[10]], b1: [0], W2: [10], b2: 0 };   // x>0 -> 1
const flipNet = { nIn: 1, nHid: 1, W1: [[10]], b1: [0], W2: [-10], b2: 0 };  // x>0 -> 0
const tests = [{ pix: [1], label: 1 }, { pix: [-1], label: 0 }];

const models = {
  tA: { model: signNet, tests, own: 1 },
  tB: { model: signNet, tests, own: 0.9 },
  tC: { model: flipNet, tests, own: 0.5 },
};
const teams = { tA: { name: "Aloo" }, tB: { name: "Bhindi" } };

describe("buildTournamentTable", () => {
  it("scores each model on the other teams' tests and sorts by cross desc", () => {
    const rows = buildTournamentTable(models, teams);
    expect(rows.map((r) => r.teamId)).toEqual(["tA", "tB", "tC"]);
    expect(rows[0].cross).toBe(1);
    expect(rows[1].cross).toBe(1);
    expect(rows[2].cross).toBe(0);
    rows.forEach((r) => expect(r.n).toBe(4));
  });
  it("uses team names and falls back for deleted teams", () => {
    const rows = buildTournamentTable(models, teams);
    expect(rows.find((r) => r.teamId === "tA").name).toBe("Aloo");
    expect(rows.find((r) => r.teamId === "tC").name).toBe("Unknown team");
  });
  it("gives cross null and n 0 for a single team", () => {
    const rows = buildTournamentTable({ tA: models.tA }, teams);
    expect(rows).toHaveLength(1);
    expect(rows[0].cross).toBeNull();
    expect(rows[0].n).toBe(0);
  });
  it("returns [] for no models", () => {
    expect(buildTournamentTable(null, teams)).toEqual([]);
    expect(buildTournamentTable({}, teams)).toEqual([]);
  });
});

describe("tableAverages", () => {
  it("averages own and cross, ignoring nulls", () => {
    const rows = buildTournamentTable(models, teams);
    const a = tableAverages(rows);
    expect(a.count).toBe(3);
    expect(a.avgOwn).toBeCloseTo((1 + 0.9 + 0.5) / 3, 6);
    expect(a.avgCross).toBeCloseTo(2 / 3, 6);
  });
  it("returns nulls for empty", () => {
    expect(tableAverages([])).toEqual({ avgOwn: null, avgCross: null, count: 0 });
  });
});

describe("thresholds", () => {
  it("are 2 and 4", () => {
    expect(MIN_TEAMS_TO_SHOW).toBe(2);
    expect(MIN_TEAMS_MEANINGFUL).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ml/scoring.test.js`
Expected: FAIL — cannot resolve `./scoring.js`.

- [ ] **Step 3: Write src/ml/scoring.js**

```js
import { accuracy } from "./net.js";

export const MIN_TEAMS_TO_SHOW = 2;
export const MIN_TEAMS_MEANINGFUL = 4;

// Each team's model is scored on the union of every OTHER team's test drawings.
export function buildTournamentTable(models, teams) {
  const ids = Object.keys(models || {});
  const rows = ids.map((id) => {
    const me = models[id];
    const foreign = ids.filter((o) => o !== id).flatMap((o) => models[o].tests || []);
    return {
      teamId: id,
      name: teams?.[id]?.name ?? "Unknown team",
      own: me.own ?? null,
      cross: foreign.length ? accuracy(me.model, foreign) : null,
      n: foreign.length,
    };
  });
  return rows.sort((a, b) => (b.cross ?? -1) - (a.cross ?? -1));
}

export function tableAverages(rows) {
  const mean = (xs, k) => (xs.length ? xs.reduce((s, r) => s + r[k], 0) / xs.length : null);
  return {
    avgOwn: mean(rows.filter((r) => r.own != null), "own"),
    avgCross: mean(rows.filter((r) => r.cross != null), "cross"),
    count: rows.length,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ml/scoring.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ml/scoring.js src/ml/scoring.test.js
git commit -m "Add tournament cross-scoring

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Room codes — `src/rooms/codes.js`

**Files:**
- Create: `src/rooms/codes.js`, `src/rooms/codes.test.js`

**Interfaces:**
- Produces:
  - `CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"`, `CODE_LENGTH = 5`
  - `generateRoomCode(rand?: () => number) → string`
  - `normalizeCode(input: string) → string` (uppercase, strip non-alphanumerics, max 5)
  - `isValidCode(code: string) → boolean`

- [ ] **Step 1: Write the failing tests**

`src/rooms/codes.test.js`:
```js
import { describe, it, expect } from "vitest";
import { CODE_ALPHABET, CODE_LENGTH, generateRoomCode, normalizeCode, isValidCode } from "./codes.js";

describe("codes", () => {
  it("alphabet has no O, 0, I, 1", () => {
    for (const ch of "O0I1") expect(CODE_ALPHABET.includes(ch)).toBe(false);
    expect(CODE_ALPHABET).toHaveLength(32);
  });
  it("generates 5 chars from the alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateRoomCode();
      expect(c).toHaveLength(CODE_LENGTH);
      for (const ch of c) expect(CODE_ALPHABET.includes(ch)).toBe(true);
    }
  });
  it("is deterministic given rand", () => {
    let i = 0;
    const rand = () => [0, 0.5, 0.999, 0.25, 0.75][i++ % 5];
    expect(generateRoomCode(rand)).toBe("A" + CODE_ALPHABET[16] + CODE_ALPHABET[31] + CODE_ALPHABET[8] + CODE_ALPHABET[24]);
  });
  it("normalizes user input", () => {
    expect(normalizeCode(" ab-cd e ")).toBe("ABCDE");
    expect(normalizeCode("abcdefg")).toBe("ABCDE");
  });
  it("validates", () => {
    expect(isValidCode("ABCDE")).toBe(true);
    expect(isValidCode("ABCD")).toBe(false);
    expect(isValidCode("ABCD0")).toBe(false);
    expect(isValidCode("abcde")).toBe(false);
    expect(isValidCode("")).toBe(false);
    expect(isValidCode(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/rooms/codes.test.js`
Expected: FAIL — cannot resolve `./codes.js`.

- [ ] **Step 3: Write src/rooms/codes.js**

```js
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 5;

export function generateRoomCode(rand = Math.random) {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return out;
}

export function normalizeCode(input) {
  return String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
}

export function isValidCode(code) {
  if (typeof code !== "string" || code.length !== CODE_LENGTH) return false;
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return false;
  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/rooms/codes.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rooms/codes.js src/rooms/codes.test.js
git commit -m "Add room code generation and validation

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Phases and tab visibility — `src/rooms/phases.js`

**Files:**
- Create: `src/rooms/phases.js`, `src/rooms/phases.test.js`

**Interfaces:**
- Produces:
  - `PHASES = ["lobby", "teach", "reveal", "fence"]`
  - `TABS = [{ key, label, emoji, minPhase }]` for `lobby`, `teach`, `tournament`, `fence`; plus `SETTINGS_TAB = { key: "settings", label: "Settings", emoji: "⚙️" }`
  - `visibleTabs(role: "teacher" | "student", phase: string) → Tab[]`
  - `nextPhase(phase) → string | null`
  - `PHASE_ACTIONS = { lobby: "Start teaching", teach: "Reveal tournament", reveal: "Open bendy fence" }`

- [ ] **Step 1: Write the failing tests**

`src/rooms/phases.test.js`:
```js
import { describe, it, expect } from "vitest";
import { PHASES, TABS, visibleTabs, nextPhase, PHASE_ACTIONS } from "./phases.js";

const keys = (tabs) => tabs.map((t) => t.key);

describe("phases", () => {
  it("has four phases in order", () => {
    expect(PHASES).toEqual(["lobby", "teach", "reveal", "fence"]);
  });
  it("nextPhase walks forward and stops", () => {
    expect(nextPhase("lobby")).toBe("teach");
    expect(nextPhase("teach")).toBe("reveal");
    expect(nextPhase("reveal")).toBe("fence");
    expect(nextPhase("fence")).toBeNull();
    expect(nextPhase("bogus")).toBeNull();
  });
  it("has an action label for every non-final phase", () => {
    expect(Object.keys(PHASE_ACTIONS).sort()).toEqual(["lobby", "reveal", "teach"]);
  });
});

describe("visibleTabs", () => {
  it("teacher always sees every tab plus settings", () => {
    for (const p of PHASES) {
      expect(keys(visibleTabs("teacher", p))).toEqual(["lobby", "teach", "tournament", "fence", "settings"]);
    }
  });
  it("student sees tabs gated by phase", () => {
    expect(keys(visibleTabs("student", "lobby"))).toEqual(["lobby"]);
    expect(keys(visibleTabs("student", "teach"))).toEqual(["lobby", "teach"]);
    expect(keys(visibleTabs("student", "reveal"))).toEqual(["lobby", "teach", "tournament"]);
    expect(keys(visibleTabs("student", "fence"))).toEqual(["lobby", "teach", "tournament", "fence"]);
  });
  it("student with unknown phase sees only lobby", () => {
    expect(keys(visibleTabs("student", undefined))).toEqual(["lobby"]);
  });
  it("TABS carry emoji and labels", () => {
    TABS.forEach((t) => { expect(t.emoji).toBeTruthy(); expect(t.label).toBeTruthy(); });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/rooms/phases.test.js`
Expected: FAIL — cannot resolve `./phases.js`.

- [ ] **Step 3: Write src/rooms/phases.js**

```js
export const PHASES = ["lobby", "teach", "reveal", "fence"];

export const TABS = [
  { key: "lobby", label: "Lobby", emoji: "🏠", minPhase: "lobby" },
  { key: "teach", label: "Teach it", emoji: "✏️", minPhase: "teach" },
  { key: "tournament", label: "Tournament", emoji: "🏆", minPhase: "reveal" },
  { key: "fence", label: "Bendy fence", emoji: "🪢", minPhase: "fence" },
];

export const SETTINGS_TAB = { key: "settings", label: "Settings", emoji: "⚙️" };

export const PHASE_ACTIONS = {
  lobby: "Start teaching",
  teach: "Reveal tournament",
  reveal: "Open bendy fence",
};

const idx = (p) => PHASES.indexOf(p);

export function visibleTabs(role, phase) {
  if (role === "teacher") return [...TABS, SETTINGS_TAB];
  const cur = Math.max(0, idx(phase));
  return TABS.filter((t) => idx(t.minPhase) <= cur);
}

export function nextPhase(phase) {
  const i = idx(phase);
  return i >= 0 && i < PHASES.length - 1 ? PHASES[i + 1] : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/rooms/phases.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rooms/phases.js src/rooms/phases.test.js
git commit -m "Add phase order and tab visibility rules

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Playful theme — `src/theme.js`

**Files:**
- Create: `src/theme.js`, `src/theme.test.js`

**Interfaces:**
- Produces: `C` (palette), `LABEL_COLORS = [C.mango, C.sky]`, `disp`, `sans`, `CSS` (global stylesheet string), `S` (style objects). Every `S.*` key referenced by later tasks is defined here — later tasks must not invent new keys; if one is missing, add it here.

- [ ] **Step 1: Write the failing test**

`src/theme.test.js`:
```js
import { describe, it, expect } from "vitest";
import { C, LABEL_COLORS, CSS, S } from "./theme.js";

describe("theme", () => {
  it("label colours are mango then sky", () => {
    expect(LABEL_COLORS).toEqual([C.mango, C.sky]);
  });
  it("CSS loads Fredoka and Nunito and defines the button class", () => {
    expect(CSS).toContain("Fredoka");
    expect(CSS).toContain("Nunito");
    expect(CSS).toContain(".nl-btn");
  });
  it("defines every style key the screens use", () => {
    const needed = ["app", "head", "word", "tag", "tabs", "tab", "tabOn", "strip", "chip", "main", "wide", "card",
      "h1", "h2", "lede", "hint", "empty", "pickRow", "pick", "pickN", "canvas", "btnRow", "primary", "ghost",
      "accent", "tiny", "danger", "guess", "guessLbl", "guessConf", "thumbs", "thumb", "train", "send", "score",
      "scoreN", "scoreL", "bigCompare", "bigN", "bigL", "arrow", "table", "tr", "thead", "barCell", "bar", "qBox",
      "qKick", "q", "qBig", "closing", "qNote", "sliderRow", "slLbl", "slider", "slVal", "chList", "ch", "mini",
      "chBody", "chTeam", "chBest", "chBtns", "toast", "center", "centerCard", "choiceGrid", "choiceCard",
      "choiceEmoji", "choiceTitle", "choiceSub", "field", "label", "input", "codeInput", "codeBig", "qr", "link",
      "teamGrid", "teamCard", "teamCardMine", "teamName", "teamCount", "memberList", "member", "caution", "badge",
      "phaseBar", "phaseBtn", "phaseNow", "settingsGrid", "notesP", "sheetRow", "logo", "row"];
    for (const k of needed) expect(S[k], `S.${k}`).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theme.test.js`
Expected: FAIL — cannot resolve `./theme.js`.

- [ ] **Step 3: Write src/theme.js**

```js
// Playful, colourful theme: cream ground, white cards, mango + sky accents.

export const C = {
  cream: "#FFF7E8",
  paper: "#FFFFFF",
  soft: "#FFF1DC",
  ink: "#2A2140",
  muted: "#6F6785",
  line: "#F0E4D0",
  mango: "#FF8A3D",
  mangoDeep: "#D9651F",
  sky: "#3BA7F5",
  skyDeep: "#2378BD",
  leaf: "#2FA866",
  berry: "#E85D9C",
  sun: "#FFD23F",
  red: "#E24B4B",
};

export const LABEL_COLORS = [C.mango, C.sky];
export const LABEL_DEEP = [C.mangoDeep, C.skyDeep];

export const disp = "'Fredoka', 'Baloo 2', 'Nunito', 'Segoe UI', system-ui, sans-serif";
export const sans = "'Nunito', 'Segoe UI', system-ui, -apple-system, sans-serif";

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap');
* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; }
body { background: ${C.cream}; color: ${C.ink}; font-family: ${sans}; -webkit-font-smoothing: antialiased; }
.nl-btn { font-family: ${sans}; cursor: pointer; background: none; border: none; transition: transform .12s ease, box-shadow .12s ease, opacity .12s ease; }
.nl-btn:hover:not(:disabled) { transform: translateY(-1px); }
.nl-btn:active:not(:disabled) { transform: translateY(2px) scale(.98); box-shadow: none !important; }
.nl-btn:disabled { cursor: not-allowed; opacity: .45; }
.nl-btn:focus-visible, .nl-in:focus-visible { outline: 3px solid ${C.sky}; outline-offset: 2px; }
.nl-in { font-family: ${sans}; }
.nl-in::placeholder { color: ${C.muted}; opacity: .7; }
input[type=range].nl-in { accent-color: ${C.mango}; }
@keyframes nl-pop { from { transform: translate(-50%, 16px) scale(.92); opacity: 0 } to { transform: translate(-50%, 0) scale(1); opacity: 1 } }
@keyframes nl-bounce { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes nl-wiggle { 0%, 100% { transform: rotate(0) } 25% { transform: rotate(-4deg) } 75% { transform: rotate(4deg) } }
@keyframes nl-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
.nl-pop { animation: nl-pop .25s ease-out; }
.nl-bounce { animation: nl-bounce 1.2s ease-in-out infinite; }
.nl-wiggle { animation: nl-wiggle .5s ease-in-out; }
.nl-fade { animation: nl-fade .3s ease-out; }
`;

const card = { background: C.paper, borderRadius: 20, padding: 22, boxShadow: `0 6px 0 ${C.line}` };
const pill = { borderRadius: 999, fontWeight: 800, fontSize: 14, padding: "10px 18px" };

export const S = {
  app: { fontFamily: sans, background: C.cream, color: C.ink, minHeight: "100vh", paddingBottom: 72 },

  head: { display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: C.paper, borderBottom: `4px solid ${C.mango}` },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  word: { fontFamily: disp, fontSize: 26, fontWeight: 700, lineHeight: 1, color: C.ink },
  tag: { fontSize: 13, color: C.muted, marginTop: 4 },
  tabs: { display: "flex", gap: 6, flexWrap: "wrap" },
  tab: { ...pill, padding: "8px 14px", fontSize: 13, background: C.soft, color: C.ink },
  tabOn: { background: C.ink, color: C.paper },

  strip: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "10px 20px", fontSize: 13, color: C.muted },
  chip: { background: C.paper, borderRadius: 999, padding: "6px 12px", fontWeight: 700, color: C.ink, boxShadow: `0 3px 0 ${C.line}` },
  badge: { display: "inline-block", background: C.sun, color: C.ink, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800 },
  row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  main: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, padding: "20px 16px" },
  wide: { padding: "24px 16px", maxWidth: 960, margin: "0 auto" },
  card,

  h1: { fontFamily: disp, fontSize: 40, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.05 },
  h2: { fontFamily: disp, fontSize: 22, fontWeight: 700, margin: "0 0 12px" },
  lede: { fontSize: 17, lineHeight: 1.55, color: C.ink, maxWidth: "56ch", margin: "0 0 22px" },
  hint: { fontSize: 13.5, color: C.muted, lineHeight: 1.6, margin: "10px 0 0", maxWidth: "48ch" },
  empty: { fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: "46ch" },

  pickRow: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  pick: { ...pill, background: C.soft, color: C.ink, border: `2px solid transparent` },
  pickN: { opacity: 0.7, marginLeft: 6, fontSize: 12 },

  canvas: { width: "100%", maxWidth: 320, aspectRatio: "1", background: "#fff", borderRadius: 16, cursor: "crosshair", touchAction: "none", display: "block", border: `3px solid ${C.line}` },

  btnRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 },
  primary: { ...pill, background: C.mango, color: C.paper, boxShadow: `0 4px 0 ${C.mangoDeep}` },
  accent: { ...pill, background: C.sky, color: C.paper, boxShadow: `0 4px 0 ${C.skyDeep}` },
  ghost: { ...pill, background: C.soft, color: C.ink },
  tiny: { ...pill, padding: "6px 12px", fontSize: 12, background: C.soft, color: C.ink },
  danger: { ...pill, background: C.paper, color: C.red, border: `2px solid ${C.red}` },

  guess: { marginTop: 14, border: "3px solid", borderRadius: 16, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", background: C.soft },
  guessLbl: { fontFamily: disp, fontSize: 22, fontWeight: 700 },
  guessConf: { fontSize: 13, color: C.muted, fontWeight: 700 },

  thumbs: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 },
  thumb: { width: 42, height: 42, imageRendering: "pixelated", border: "3px solid", borderRadius: 8, background: "#fff" },

  train: { ...pill, width: "100%", background: C.berry, color: C.paper, padding: 14, fontSize: 16, boxShadow: `0 4px 0 #B83E78` },
  send: { ...pill, width: "100%", marginTop: 14, background: C.leaf, color: C.paper, padding: 13, fontSize: 15, boxShadow: `0 4px 0 #1F7A49` },

  score: { marginTop: 18, borderTop: `2px dashed ${C.line}`, paddingTop: 16 },
  scoreN: { fontFamily: disp, fontSize: 52, fontWeight: 700, color: C.leaf, lineHeight: 1 },
  scoreL: { fontSize: 13, color: C.muted, marginTop: 3, fontWeight: 700 },

  bigCompare: { display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", ...card, marginBottom: 24 },
  bigN: { fontFamily: disp, fontSize: 64, fontWeight: 700, lineHeight: 1 },
  bigL: { fontSize: 14, color: C.muted, marginTop: 6, fontWeight: 700 },
  arrow: { fontSize: 36, color: C.muted },

  table: { display: "grid", gap: 6 },
  tr: { display: "grid", gridTemplateColumns: "1.4fr .6fr .8fr 2fr", gap: 12, alignItems: "center", padding: "12px 14px", fontSize: 16, borderRadius: 14, background: C.paper },
  thead: { fontSize: 12, color: C.muted, background: "transparent", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" },
  barCell: { height: 12, background: C.soft, borderRadius: 999, overflow: "hidden" },
  bar: { display: "block", height: "100%", borderRadius: 999, transition: "width .6s ease" },

  qBox: { marginTop: 30, ...card, borderLeft: `8px solid ${C.sky}` },
  qKick: { fontSize: 12.5, color: C.mangoDeep, marginBottom: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" },
  q: { fontSize: 16, lineHeight: 1.6, color: C.ink, maxWidth: "56ch", margin: "0 0 14px" },
  qBig: { fontFamily: disp, fontSize: 26, fontWeight: 700, lineHeight: 1.3, margin: 0, maxWidth: "40ch" },
  closing: { marginTop: 20, ...card, borderLeft: `8px solid ${C.mango}` },
  qNote: { fontSize: 13, color: C.muted, marginTop: 14 },

  sliderRow: { display: "flex", alignItems: "center", gap: 11, marginTop: 15 },
  slLbl: { fontSize: 13, color: C.muted, fontWeight: 700 },
  slider: { flex: 1, minWidth: 90 },
  slVal: { fontFamily: disp, fontSize: 16, fontWeight: 700, color: C.mangoDeep, minWidth: 88 },

  chList: { display: "grid", gap: 10 },
  ch: { display: "flex", gap: 12, alignItems: "center", background: C.soft, padding: 10, borderRadius: 14 },
  mini: { width: 56, height: 56, borderRadius: 10, flexShrink: 0 },
  chBody: { flex: 1, minWidth: 0 },
  chTeam: { fontSize: 14, fontWeight: 800 },
  chBest: { fontSize: 12, color: C.muted, margin: "2px 0 7px" },
  chBtns: { display: "flex", gap: 6, flexWrap: "wrap" },

  toast: { position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: C.ink, color: C.paper, padding: "12px 20px", fontSize: 14, fontWeight: 800, borderRadius: 999, zIndex: 50, boxShadow: "0 8px 24px rgba(42,33,64,.25)", maxWidth: "calc(100vw - 32px)" },

  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  centerCard: { ...card, width: "100%", maxWidth: 520, textAlign: "center", padding: 28 },
  choiceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 18 },
  choiceCard: { ...card, cursor: "pointer", textAlign: "center", padding: "26px 18px", border: "3px solid transparent" },
  choiceEmoji: { fontSize: 48, lineHeight: 1 },
  choiceTitle: { fontFamily: disp, fontSize: 22, fontWeight: 700, marginTop: 10 },
  choiceSub: { fontSize: 13, color: C.muted, marginTop: 4 },

  field: { display: "grid", gap: 6, textAlign: "left", marginTop: 14 },
  label: { fontSize: 13, color: C.muted, fontWeight: 800 },
  input: { background: C.paper, border: `3px solid ${C.line}`, color: C.ink, padding: "10px 14px", fontSize: 16, borderRadius: 14, width: "100%" },
  codeInput: { background: C.paper, border: `3px solid ${C.line}`, color: C.ink, padding: "12px 14px", fontSize: 32, fontFamily: disp, fontWeight: 700, letterSpacing: ".25em", textTransform: "uppercase", textAlign: "center", borderRadius: 16, width: "100%" },
  codeBig: { fontFamily: disp, fontSize: 56, fontWeight: 700, letterSpacing: ".18em", lineHeight: 1, color: C.ink },
  qr: { width: 200, height: 200, borderRadius: 16, background: "#fff", padding: 8, boxShadow: `0 4px 0 ${C.line}` },
  link: { fontSize: 13, color: C.skyDeep, wordBreak: "break-all", fontWeight: 700 },

  teamGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 },
  teamCard: { ...card, padding: 16, border: "3px solid transparent" },
  teamCardMine: { border: `3px solid ${C.leaf}` },
  teamName: { fontFamily: disp, fontSize: 20, fontWeight: 700 },
  teamCount: { fontSize: 12, color: C.muted, fontWeight: 800 },
  memberList: { display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" },
  member: { background: C.soft, borderRadius: 999, padding: "4px 10px", fontSize: 12.5, fontWeight: 700 },

  caution: { background: C.sun, color: C.ink, borderRadius: 14, padding: "10px 14px", fontSize: 14, fontWeight: 800, marginBottom: 16 },

  phaseBar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "10px 20px", background: C.soft, borderBottom: `2px solid ${C.line}` },
  phaseNow: { fontSize: 13, color: C.muted, fontWeight: 800 },
  phaseBtn: { ...pill, background: C.ink, color: C.paper, padding: "8px 16px", fontSize: 13 },

  settingsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 },
  notesP: { fontSize: 13.5, lineHeight: 1.6, color: C.muted, margin: "0 0 8px", maxWidth: "58ch" },
  sheetRow: { display: "flex", gap: 10, fontSize: 13, marginBottom: 4 },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/theme.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme.js src/theme.test.js
git commit -m "Add playful theme palette and styles

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Firebase bootstrap — `src/firebaseConfig.js`, `src/firebase.js`

**Files:**
- Create: `src/firebaseConfig.js`, `src/firebase.js`, `src/firebase.test.js`

**Interfaces:**
- Produces:
  - `firebaseConfig` object (user pastes values; placeholders contain `PASTE`).
  - `isConfigured(cfg?) → boolean`
  - `getFirebase() → { app, auth, db }` (lazy, memoized)
  - `ensureAuth() → Promise<uid>` (signs in anonymously if needed)
  - `subscribe(path: string, cb: (value) => void, onError?) → () => void`

- [ ] **Step 1: Write the failing test**

`src/firebase.test.js`:
```js
import { describe, it, expect } from "vitest";
import { isConfigured } from "./firebase.js";
import { firebaseConfig } from "./firebaseConfig.js";

describe("isConfigured", () => {
  it("is false while placeholders remain", () => {
    expect(isConfigured({ apiKey: "PASTE_API_KEY", projectId: "x" })).toBe(false);
  });
  it("is true when every value is a non-placeholder string", () => {
    expect(isConfigured({ apiKey: "AIza123", authDomain: "p.firebaseapp.com", databaseURL: "https://p-default-rtdb.firebaseio.com", projectId: "p", appId: "1:2:web:3" })).toBe(true);
  });
  it("shipped config exposes the five required keys", () => {
    for (const k of ["apiKey", "authDomain", "databaseURL", "projectId", "appId"]) {
      expect(typeof firebaseConfig[k]).toBe("string");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/firebase.test.js`
Expected: FAIL — cannot resolve `./firebase.js`.

- [ ] **Step 3: Write src/firebaseConfig.js**

```js
// Paste your Firebase web app config here.
// Firebase console → Project settings → General → Your apps → Web app → SDK setup and configuration → Config.
// These values are safe to commit: security lives in database.rules.json, not here.
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://PASTE_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "PASTE_PROJECT_ID",
  appId: "PASTE_APP_ID",
};
```

- [ ] **Step 4: Write src/firebase.js**

```js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig.js";

export function isConfigured(cfg = firebaseConfig) {
  const vals = Object.values(cfg || {});
  return vals.length > 0 && vals.every((v) => typeof v === "string" && v.length > 0 && !v.includes("PASTE"));
}

let cached = null;
export function getFirebase() {
  if (!cached) {
    const app = getApps()[0] || initializeApp(firebaseConfig);
    cached = { app, auth: getAuth(app), db: getDatabase(app) };
  }
  return cached;
}

// Resolves with the anonymous uid. Rejects if Anonymous sign-in is not enabled in the console.
// One in-flight promise for the whole app: React StrictMode double-runs effects in dev, and two
// concurrent signInAnonymously calls would create two users and desync uid from auth.currentUser.
let authPromise = null;
export function ensureAuth() {
  if (authPromise) return authPromise;
  const { auth } = getFirebase();
  authPromise = new Promise((resolve, reject) => {
    const off = onAuthStateChanged(
      auth,
      (user) => {
        if (user) { off(); resolve(user.uid); return; }
        signInAnonymously(auth).catch((e) => { off(); authPromise = null; reject(e); });
      },
      (e) => { off(); authPromise = null; reject(e); }
    );
  });
  return authPromise;
}

export function subscribe(path, cb, onError) {
  const { db } = getFirebase();
  return onValue(ref(db, path), (snap) => cb(snap.val()), onError);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/firebase.test.js`
Expected: PASS (importing `firebase/*` in jsdom is fine; nothing initializes until `getFirebase()` is called).

- [ ] **Step 6: Commit**

```bash
git add src/firebaseConfig.js src/firebase.js src/firebase.test.js
git commit -m "Add Firebase bootstrap with anonymous auth and subscribe helper

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Security rules + emulator tests

**Files:**
- Create: `database.rules.json`, `firebase.json`, `vitest.rules.config.js`, `tests/rules/rules.test.js`

**Interfaces:**
- Produces: rules enforcing spec §5. `npm run test:rules` runs them against the emulator.

- [ ] **Step 1: Write firebase.json and vitest.rules.config.js**

`firebase.json`:
```json
{
  "database": { "rules": "database.rules.json" },
  "emulators": {
    "database": { "host": "127.0.0.1", "port": 9000 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

`vitest.rules.config.js`:
```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.js"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
```

- [ ] **Step 2: Write the failing rules tests**

`tests/rules/rules.test.js`:
```js
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, it } from "vitest";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";

const CODE = "ABCDE";
const TEACHER = "teacher1";
let env;

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();
const path = (sub) => `rooms/${CODE}/${sub}`;

const validModel = {
  model: { nIn: 256, nHid: 10, W1: [[0.1]], b1: [0], W2: [0.2], b2: 0 },
  tests: [{ label: 0, pix: [0, 1] }, { label: 1, pix: [1, 0] }],
  own: 1,
  sentBy: "s1",
  at: 1,
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-neural-lab",
    database: {
      rules: readFileSync("database.rules.json", "utf8"),
      host: "127.0.0.1",
      port: 9000,
    },
  });
});

afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.database().ref(`rooms/${CODE}`).set({
      meta: { labels: ["Mango", "Cricket ball"], teamCap: 4, phase: "teach", teacherUid: TEACHER },
      teams: { tA: { name: "A", createdBy: "s1" }, tB: { name: "B", createdBy: "s2" } },
      members: { s1: { name: "Sana", teamId: "tA" }, s2: { name: "Bilal", teamId: "tB" } },
      challenges: { c1: { teamId: "tA", teamName: "A", pts: [{ x: 0.1, y: 0.2, c: 0 }] } },
    });
  });
});

describe("reads", () => {
  it("denies unauthenticated read", async () => {
    await assertFails(db(null).ref(path("meta")).get());
  });
  it("allows any anonymous user to read", async () => {
    await assertSucceeds(db("anyone").ref(path("meta")).get());
  });
});

describe("meta", () => {
  it("teacher can change phase and labels", async () => {
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ phase: "reveal" }));
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ labels: ["Sun", "Flower"] }));
    await assertSucceeds(db(TEACHER).ref(path("meta")).update({ teamCap: 6 }));
  });
  it("student cannot write meta", async () => {
    await assertFails(db("s1").ref(path("meta")).update({ phase: "reveal" }));
    await assertFails(db("s1").ref(path("meta/teacherUid")).set("s1"));
  });
  it("anyone can create a new room whose teacherUid is themselves", async () => {
    await assertSucceeds(db("t2").ref("rooms/ZZZZZ/meta").set({ labels: ["A", "B"], teamCap: 4, phase: "lobby", teacherUid: "t2", createdAt: 1 }));
  });
  it("cannot create a room claiming someone else as teacher", async () => {
    await assertFails(db("t2").ref("rooms/YYYYY/meta").set({ labels: ["A", "B"], teamCap: 4, phase: "lobby", teacherUid: "t3" }));
  });
  it("rejects bad phase or cap", async () => {
    await assertFails(db(TEACHER).ref(path("meta")).update({ phase: "party" }));
    await assertFails(db(TEACHER).ref(path("meta")).update({ teamCap: 0 }));
    await assertFails(db(TEACHER).ref(path("meta")).update({ teamCap: 13 }));
  });
});

describe("members", () => {
  it("a user can write only their own member record", async () => {
    await assertSucceeds(db("s3").ref(path("members/s3")).set({ name: "Zara", joinedAt: 1 }));
    await assertFails(db("s3").ref(path("members/s1")).update({ name: "Hacked" }));
  });
  it("teacher can move any member", async () => {
    await assertSucceeds(db(TEACHER).ref(path("members/s1")).update({ teamId: "tB" }));
  });
  it("teamId must reference an existing team", async () => {
    await assertSucceeds(db("s1").ref(path("members/s1")).update({ teamId: "tB" }));
    await assertFails(db("s1").ref(path("members/s1")).update({ teamId: "nope" }));
    await assertSucceeds(db("s1").ref(path("members/s1")).update({ teamId: null }));
  });
  it("name length is bounded", async () => {
    await assertFails(db("s4").ref(path("members/s4")).set({ name: "x".repeat(25) }));
    await assertFails(db("s4").ref(path("members/s4")).set({ name: "" }));
  });
});

describe("teams", () => {
  it("any member can create a team; only teacher can rename or delete", async () => {
    await assertSucceeds(db("s3").ref(path("teams/tC")).set({ name: "C", createdBy: "s3", createdAt: 1 }));
    await assertFails(db("s1").ref(path("teams/tA")).update({ name: "Renamed" }));
    await assertFails(db("s1").ref(path("teams/tA")).remove());
    await assertSucceeds(db(TEACHER).ref(path("teams/tA")).update({ name: "Renamed" }));
    await assertSucceeds(db(TEACHER).ref(path("teams/tB")).remove());
  });
  it("team name length is bounded", async () => {
    await assertFails(db("s3").ref(path("teams/tD")).set({ name: "x".repeat(23), createdBy: "s3" }));
  });
});

describe("models", () => {
  it("a member can write their own team's model", async () => {
    await assertSucceeds(db("s1").ref(path("models/tA")).set(validModel));
  });
  it("a member cannot write another team's model", async () => {
    await assertFails(db("s1").ref(path("models/tB")).set(validModel));
  });
  it("a member with no team cannot write any model", async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path("members/s9")).set({ name: "Solo" }));
    await assertFails(db("s9").ref(path("models/tA")).set(validModel));
  });
  it("rejects a model with the wrong shape", async () => {
    await assertFails(db("s1").ref(path("models/tA")).set({ ...validModel, model: { ...validModel.model, nHid: 3 } }));
    await assertFails(db("s1").ref(path("models/tA")).set({ ...validModel, model: { ...validModel.model, nIn: 64 } }));
  });
  it("teacher can wipe all models", async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref(path("models/tA")).set(validModel));
    await assertFails(db("s1").ref(path("models")).remove());
    await assertSucceeds(db(TEACHER).ref(path("models")).remove());
  });
});

describe("challenges", () => {
  it("any member can post a challenge and update best; only teacher deletes", async () => {
    await assertSucceeds(db("s2").ref(path("challenges/c2")).set({ teamId: "tB", teamName: "B", pts: [{ x: 0.5, y: 0.5, c: 1 }], at: 1 }));
    await assertSucceeds(db("s2").ref(path("challenges/c1/best")).set({ teamId: "tB", teamName: "B", neurons: 2 }));
    await assertFails(db("s2").ref(path("challenges/c1")).remove());
    await assertSucceeds(db(TEACHER).ref(path("challenges/c1")).remove());
    await assertSucceeds(db(TEACHER).ref(path("challenges")).remove());
  });
});
```

- [ ] **Step 3: Write database.rules.json**

```json
{
  "rules": {
    "rooms": {
      "$code": {
        ".read": "auth != null",

        "meta": {
          ".write": "auth != null && ((!data.exists() && newData.child('teacherUid').val() === auth.uid) || data.child('teacherUid').val() === auth.uid)",
          ".validate": "newData.hasChildren(['labels', 'teamCap', 'phase', 'teacherUid'])",
          "teacherUid": { ".validate": "newData.isString()" },
          "teamCap": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 12" },
          "phase": { ".validate": "newData.isString() && (newData.val() === 'lobby' || newData.val() === 'teach' || newData.val() === 'reveal' || newData.val() === 'fence')" },
          "labels": {
            "$i": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 24" }
          },
          "closed": { ".validate": "newData.isBoolean()" },
          "createdAt": { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        },

        "members": {
          "$uid": {
            ".write": "auth != null && ($uid === auth.uid || root.child('rooms/' + $code + '/meta/teacherUid').val() === auth.uid)",
            "name": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 24" },
            "teamId": { ".validate": "newData.isString() && root.child('rooms/' + $code + '/teams/' + newData.val()).exists()" },
            "joinedAt": { ".validate": "newData.isNumber()" },
            "$other": { ".validate": false }
          }
        },

        "teams": {
          "$teamId": {
            ".write": "auth != null && (!data.exists() || root.child('rooms/' + $code + '/meta/teacherUid').val() === auth.uid)",
            "name": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 22" },
            "createdBy": { ".validate": "newData.isString()" },
            "createdAt": { ".validate": "newData.isNumber()" },
            "$other": { ".validate": false }
          }
        },

        "models": {
          ".write": "auth != null && root.child('rooms/' + $code + '/meta/teacherUid').val() === auth.uid",
          "$teamId": {
            ".write": "auth != null && root.child('rooms/' + $code + '/members/' + auth.uid + '/teamId').val() === $teamId",
            ".validate": "newData.hasChildren(['model', 'tests', 'own', 'sentBy'])",
            "model": {
              ".validate": "newData.hasChildren(['nIn', 'nHid', 'W1', 'b1', 'W2', 'b2'])",
              "nIn": { ".validate": "newData.val() === 256" },
              "nHid": { ".validate": "newData.val() === 10" }
            },
            "own": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1" },
            "sentBy": { ".validate": "newData.isString()" }
          }
        },

        "challenges": {
          ".write": "auth != null && root.child('rooms/' + $code + '/meta/teacherUid').val() === auth.uid",
          "$id": {
            ".write": "auth != null && newData.exists()",
            "teamId": { ".validate": "newData.isString()" },
            "teamName": { ".validate": "newData.isString() && newData.val().length <= 22" },
            "best": {
              ".validate": "newData.hasChildren(['teamId', 'teamName', 'neurons'])",
              "neurons": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 8" }
            }
          }
        },

        "$other": { ".validate": false }
      }
    }
  }
}
```

Notes for the implementer:
- `.write` cascades downward: the teacher's write permission on `models` / `challenges` covers children, so the teacher can also overwrite any team's model.
- `$id` write requires `newData.exists()`, so a non-teacher cannot delete a challenge, but can create one or update `best`.
- `.validate` runs only at the written path and below, so `update(meta, { phase })` is validated by `meta/phase` only; the `hasChildren` on `meta` applies to full creates.

- [ ] **Step 4: Run the rules tests**

Run: `npm run test:rules`
Expected: emulator downloads on first run (needs Java, present), then all tests PASS. If the emulator port is busy, change `9000` in both `firebase.json` and the test file.

If `assertSucceeds` for `members/s1 update teamId: null` fails: RTDB treats `null` as delete and skips `.validate` — this should pass. If it does not, the failing rule is likely `$other`; check the exact error in the emulator output.

- [ ] **Step 5: Commit**

```bash
git add database.rules.json firebase.json vitest.rules.config.js tests/rules/rules.test.js
git commit -m "Add RTDB security rules with emulator tests

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Room API — `src/rooms/api.js`

**Files:**
- Create: `src/rooms/api.js`, `src/rooms/api.test.js`

**Interfaces:**
- Consumes: `getFirebase` (Task 9), `generateRoomCode` (Task 6), `packNet`, `packPix` (Task 3).
- Produces (all return Promises unless marked pure):
  - `DEFAULT_LABELS = ["Mango", "Cricket ball"]`, `DEFAULT_TEAM_CAP = 4`, `TEST_PER_LABEL = 3`, `MAX_CHALLENGE_POINTS = 60`
  - `createRoom({ uid, labels?, teamCap? }) → code`
  - `getRoomMeta(code) → meta | null`
  - `joinRoom({ code, uid, name })`
  - `createTeam({ code, uid, name }) → teamId`
  - `joinTeam({ code, uid, teamId })`, `leaveTeam({ code, uid })`
  - `renameTeam({ code, teamId, name })`, `deleteTeam({ code, teamId, members })`, `moveMember({ code, uid, teamId })`
  - pure `pickTests(samples, perLabel?, rand?) → { label, pix }[]`
  - pure `buildModelPayload({ net, samples, own, uid, rand? }) → payload`
  - `sendModel({ code, teamId, net, samples, own, uid })`
  - `postChallenge({ code, teamId, teamName, pts })`
  - `claimChallenge({ code, id, teamId, teamName, neurons }) → boolean` (committed)
  - `setPhase({ code, phase })`, `setLabels({ code, labels })`, `setTeamCap({ code, teamCap })`, `resetBoard({ code })`, `closeRoom({ code })`

- [ ] **Step 1: Write the failing tests (pure helpers only)**

`src/rooms/api.test.js`:
```js
import { describe, it, expect } from "vitest";
import { pickTests, buildModelPayload, TEST_PER_LABEL, DEFAULT_LABELS, DEFAULT_TEAM_CAP } from "./api.js";
import { newNet } from "../ml/net.js";

const mk = (label, v) => ({ label, pix: new Array(4).fill(v) });
const samples = [mk(0, 0.111), mk(0, 0.222), mk(0, 0.333), mk(0, 0.444), mk(1, 0.555), mk(1, 0.666), mk(1, 0.777), mk(1, 0.888)];

describe("pickTests", () => {
  it("picks perLabel per label, rounded to 2 dp", () => {
    const t = pickTests(samples, 3, () => 0.5);
    expect(t.filter((s) => s.label === 0)).toHaveLength(3);
    expect(t.filter((s) => s.label === 1)).toHaveLength(3);
    t.forEach((s) => s.pix.forEach((v) => expect(v).toBe(Math.round(v * 100) / 100)));
  });
  it("takes all when fewer than perLabel exist", () => {
    const t = pickTests([mk(0, 0.1), mk(1, 0.2)], 3);
    expect(t).toHaveLength(2);
  });
  it("defaults are 3 per label", () => {
    expect(TEST_PER_LABEL).toBe(3);
    expect(pickTests(samples)).toHaveLength(6);
  });
});

describe("buildModelPayload", () => {
  it("packs the net, picks tests, records own and sender", () => {
    const net = newNet(4, 10, 1);
    const p = buildModelPayload({ net, samples, own: 1, uid: "u1" });
    expect(p.model.nIn).toBe(4);
    expect(p.model.nHid).toBe(10);
    expect(p.model.W1[0][0]).toBe(Math.round(p.model.W1[0][0] * 1000) / 1000);
    expect(p.tests).toHaveLength(6);
    expect(p.own).toBe(1);
    expect(p.sentBy).toBe("u1");
    expect(p.at).toBeTruthy(); // server timestamp sentinel
  });
});

describe("defaults", () => {
  it("labels and cap", () => {
    expect(DEFAULT_LABELS).toEqual(["Mango", "Cricket ball"]);
    expect(DEFAULT_TEAM_CAP).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/rooms/api.test.js`
Expected: FAIL — cannot resolve `./api.js`.

- [ ] **Step 3: Write src/rooms/api.js**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/rooms/api.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rooms/api.js src/rooms/api.test.js
git commit -m "Add room API for rooms, teams, models, challenges

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Live-state hooks — `src/rooms/hooks.js`

**Files:**
- Create: `src/rooms/hooks.js`, `src/rooms/hooks.test.jsx`

**Interfaces:**
- Consumes: `subscribe`, `ensureAuth` (Task 9).
- Produces:
  - `useAuth() → { uid: string | null, error: Error | null }`
  - `usePath(path: string | null, enabled = true) → { value, loading }` (`value` is `undefined` while loading, `null` if missing)
  - `useRoom(code) → { meta, members, teams, loading, missing }`
  - `useModels(code, enabled) → { value: modelsMap | null, loading }`
  - `useChallenges(code, enabled) → { value, loading }`
  - `useTeamModel(code, teamId) → { value: { sentBy, at, own } | null, loading }`

- [ ] **Step 1: Write the failing tests**

`src/rooms/hooks.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const subs = new Map();   // path -> callback
const offs = new Map();   // path -> unsubscribe spy

vi.mock("../firebase.js", () => ({
  subscribe: (path, cb) => {
    subs.set(path, cb);
    const off = vi.fn(() => subs.delete(path));
    offs.set(path, off);
    return off;
  },
  ensureAuth: () => Promise.resolve("uid-1"),
}));

import { usePath, useRoom, useAuth } from "./hooks.js";

beforeEach(() => { subs.clear(); offs.clear(); });

const fire = (path, value) => act(() => { subs.get(path)(value); });

describe("usePath", () => {
  it("is loading until the first value, then exposes it", () => {
    const { result } = renderHook(() => usePath("rooms/X/teams"));
    expect(result.current.loading).toBe(true);
    fire("rooms/X/teams", { t1: { name: "A" } });
    expect(result.current.loading).toBe(false);
    expect(result.current.value).toEqual({ t1: { name: "A" } });
  });
  it("reports null for a missing node", () => {
    const { result } = renderHook(() => usePath("rooms/X/meta"));
    fire("rooms/X/meta", null);
    expect(result.current.value).toBeNull();
    expect(result.current.loading).toBe(false);
  });
  it("does not subscribe when disabled or path is null, and unsubscribes on unmount", () => {
    const { unmount: u1 } = renderHook(() => usePath("rooms/X/models", false));
    expect(subs.has("rooms/X/models")).toBe(false);
    u1();
    const { unmount } = renderHook(() => usePath("rooms/X/models", true));
    expect(subs.has("rooms/X/models")).toBe(true);
    unmount();
    expect(offs.get("rooms/X/models")).toHaveBeenCalled();
  });
});

describe("useRoom", () => {
  it("subscribes to meta, members and teams and reports missing rooms", () => {
    const { result } = renderHook(() => useRoom("ABCDE"));
    expect(result.current.loading).toBe(true);
    fire("rooms/ABCDE/meta", null);
    expect(result.current.missing).toBe(true);
  });
  it("exposes live state", () => {
    const { result } = renderHook(() => useRoom("ABCDE"));
    fire("rooms/ABCDE/meta", { phase: "teach", teacherUid: "t" });
    fire("rooms/ABCDE/members", { u1: { name: "Sana", teamId: "t1" } });
    fire("rooms/ABCDE/teams", { t1: { name: "A" } });
    expect(result.current.loading).toBe(false);
    expect(result.current.missing).toBe(false);
    expect(result.current.meta.phase).toBe("teach");
    expect(result.current.members.u1.name).toBe("Sana");
    expect(result.current.teams.t1.name).toBe("A");
  });
  it("defaults members and teams to empty objects", () => {
    const { result } = renderHook(() => useRoom("ABCDE"));
    fire("rooms/ABCDE/meta", { phase: "lobby" });
    fire("rooms/ABCDE/members", null);
    fire("rooms/ABCDE/teams", null);
    expect(result.current.members).toEqual({});
    expect(result.current.teams).toEqual({});
  });
});

describe("useAuth", () => {
  it("resolves the uid", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.uid).toBe("uid-1"));
    expect(result.current.error).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/rooms/hooks.test.jsx`
Expected: FAIL — cannot resolve `./hooks.js`.

- [ ] **Step 3: Write src/rooms/hooks.js**

```js
import { useEffect, useState } from "react";
import { subscribe, ensureAuth } from "../firebase.js";

export function useAuth() {
  const [state, setState] = useState({ uid: null, error: null });
  useEffect(() => {
    let alive = true;
    ensureAuth()
      .then((uid) => alive && setState({ uid, error: null }))
      .catch((error) => alive && setState({ uid: null, error }));
    return () => { alive = false; };
  }, []);
  return state;
}

// value: undefined while loading, null when the node does not exist.
export function usePath(path, enabled = true) {
  const [value, setValue] = useState(undefined);
  useEffect(() => {
    if (!enabled || !path) { setValue(undefined); return undefined; }
    setValue(undefined);
    const off = subscribe(path, (v) => setValue(v === undefined ? null : v));
    return () => off();
  }, [path, enabled]);
  return { value, loading: value === undefined };
}

export function useRoom(code) {
  const meta = usePath(code ? `rooms/${code}/meta` : null);
  const members = usePath(code ? `rooms/${code}/members` : null);
  const teams = usePath(code ? `rooms/${code}/teams` : null);
  return {
    meta: meta.value,
    members: members.value || {},
    teams: teams.value || {},
    loading: meta.loading,
    missing: meta.value === null,
  };
}

export const useModels = (code, enabled = true) => usePath(code ? `rooms/${code}/models` : null, enabled);
export const useChallenges = (code, enabled = true) => usePath(code ? `rooms/${code}/challenges` : null, enabled);
export const useTeamModel = (code, teamId) => usePath(code && teamId ? `rooms/${code}/models/${teamId}` : null, Boolean(teamId));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/rooms/hooks.test.jsx`
Expected: PASS. If React warns about `act`, ensure `@testing-library/react` and `@testing-library/dom` are installed (Task 1 package.json).

- [ ] **Step 5: Commit**

```bash
git add src/rooms/hooks.js src/rooms/hooks.test.jsx
git commit -m "Add live room state hooks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Shared components

**Files:**
- Create: `src/components/Toast.jsx`, `src/components/Tabs.jsx`, `src/components/Thumb.jsx`, `src/components/MiniPattern.jsx`, `src/components/QrLink.jsx`, `src/components/TeamCard.jsx`, `src/components/DrawCanvas.jsx`, `src/components/PhaseBar.jsx`, `src/components/TeamCard.test.jsx`, `src/components/Tabs.test.jsx`

**Interfaces:**
- Consumes: `S`, `C`, `LABEL_COLORS` (Task 8), `pixToRGBA`, `GRID` (Task 4), `PHASE_ACTIONS`, `nextPhase` (Task 7), `captureFromCanvas` (Task 4).
- Produces:
  - `useToast() → { toast: string, flash: (msg) => void }`, `Toast({ message })`
  - `Tabs({ tabs: { key, label, emoji }[], active, onChange })`
  - `Thumb({ pix, tint })`
  - `MiniPattern({ pts })`
  - `QrLink({ url, size? })`
  - `TeamCard({ teamId, team, members: { uid, name }[], cap, isMine, locked, canJoin, onJoin, onLeave, teacher, onRename, onDelete })`
  - `DrawCanvas` (forwardRef) with `ref.current.clear()` and `ref.current.capture() → pix | null`; props `{ size = 300, onStrokeStart }`
  - `PhaseBar({ phase, onAdvance, busy })`

- [ ] **Step 1: Write the failing component tests**

`src/components/Tabs.test.jsx`:
```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "./Tabs.jsx";

const tabs = [{ key: "a", label: "Alpha", emoji: "🅰️" }, { key: "b", label: "Beta", emoji: "🅱️" }];

describe("Tabs", () => {
  it("renders each tab and fires onChange", () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Beta/ }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("tab", { name: /Alpha/ }).getAttribute("aria-selected")).toBe("true");
  });
});
```

`src/components/TeamCard.test.jsx`:
```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamCard } from "./TeamCard.jsx";

const team = { name: "Aloo Gosht" };
const members = [{ uid: "u1", name: "Sana" }, { uid: "u2", name: "Bilal" }];

describe("TeamCard", () => {
  it("shows name, count and members, and joins", () => {
    const onJoin = vi.fn();
    render(<TeamCard teamId="t1" team={team} members={members} cap={4} canJoin onJoin={onJoin} />);
    expect(screen.getByText("Aloo Gosht")).toBeTruthy();
    expect(screen.getByText("2/4")).toBeTruthy();
    expect(screen.getByText("Sana")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Join/ }));
    expect(onJoin).toHaveBeenCalledWith("t1");
  });
  it("disables join when full", () => {
    render(<TeamCard teamId="t1" team={team} members={members} cap={2} canJoin onJoin={() => {}} />);
    expect(screen.getByRole("button", { name: /Full/ }).disabled).toBe(true);
  });
  it("shows Leave for my team unless locked", () => {
    const onLeave = vi.fn();
    const { rerender } = render(<TeamCard teamId="t1" team={team} members={members} cap={4} isMine onLeave={onLeave} />);
    fireEvent.click(screen.getByRole("button", { name: /Leave/ }));
    expect(onLeave).toHaveBeenCalled();
    rerender(<TeamCard teamId="t1" team={team} members={members} cap={4} isMine locked onLeave={onLeave} />);
    expect(screen.queryByRole("button", { name: /Leave/ })).toBeNull();
    expect(screen.getByText(/sent/i)).toBeTruthy();
  });
  it("shows teacher controls", () => {
    const onDelete = vi.fn();
    render(<TeamCard teamId="t1" team={team} members={members} cap={4} teacher onRename={() => {}} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /Delete/ }));
    expect(onDelete).toHaveBeenCalledWith("t1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components`
Expected: FAIL — cannot resolve `./Tabs.jsx`, `./TeamCard.jsx`.

- [ ] **Step 3: Write the components**

`src/components/Toast.jsx`:
```jsx
import { useCallback, useRef, useState } from "react";
import { S } from "../theme.js";

export function useToast() {
  const [toast, setToast] = useState("");
  const timer = useRef(null);
  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2600);
  }, []);
  return { toast, flash };
}

export function Toast({ message }) {
  if (!message) return null;
  return <div role="status" className="nl-pop" style={S.toast}>{message}</div>;
}
```

`src/components/Tabs.jsx`:
```jsx
import { S } from "../theme.js";

export function Tabs({ tabs, active, onChange }) {
  return (
    <nav role="tablist" style={S.tabs}>
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={active === t.key} className="nl-btn"
          style={{ ...S.tab, ...(active === t.key ? S.tabOn : null) }} onClick={() => onChange(t.key)}>
          <span aria-hidden="true">{t.emoji}</span> {t.label}
        </button>
      ))}
    </nav>
  );
}
```

`src/components/Thumb.jsx`:
```jsx
import { useEffect, useRef } from "react";
import { S } from "../theme.js";
import { GRID, pixToRGBA } from "../ml/capture.js";

export function Thumb({ pix, tint }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(GRID, GRID);
    img.data.set(pixToRGBA(pix));
    ctx.putImageData(img, 0, 0);
  }, [pix]);
  return <canvas ref={ref} width={GRID} height={GRID} style={{ ...S.thumb, borderColor: tint }} aria-hidden="true" />;
}
```

`src/components/MiniPattern.jsx`:
```jsx
import { useEffect, useRef } from "react";
import { C, LABEL_COLORS, S } from "../theme.js";

export function MiniPattern({ pts }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, 56, 56);
    (pts || []).forEach((p) => {
      ctx.beginPath(); ctx.arc(p.x * 56, p.y * 56, 2.5, 0, 7);
      ctx.fillStyle = LABEL_COLORS[p.c ? 1 : 0]; ctx.fill();
    });
  }, [pts]);
  return <canvas ref={ref} width={56} height={56} style={S.mini} aria-hidden="true" />;
}
```

`src/components/QrLink.jsx`:
```jsx
import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { C, S } from "../theme.js";

export function QrLink({ url, size = 200 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !url) return;
    QRCode.toCanvas(ref.current, url, { width: size, margin: 1, color: { dark: C.ink, light: "#FFFFFF" } }).catch(() => {});
  }, [url, size]);
  return <canvas ref={ref} style={{ ...S.qr, width: size, height: size }} aria-label={`QR code for ${url}`} />;
}
```

`src/components/TeamCard.jsx`:
```jsx
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
```

`src/components/DrawCanvas.jsx`:
```jsx
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { S } from "../theme.js";
import { captureFromCanvas } from "../ml/capture.js";

export const DrawCanvas = forwardRef(function DrawCanvas({ size = 300, onStrokeStart }, ref) {
  const cvs = useRef(null);
  const drawing = useRef(false);

  const clear = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  useEffect(() => { clear(); }, [clear]);

  useImperativeHandle(ref, () => ({
    clear,
    capture: () => (cvs.current ? captureFromCanvas(cvs.current) : null),
  }), [clear]);

  const pos = (e) => {
    const c = cvs.current, r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)];
  };
  const down = (e) => {
    drawing.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onStrokeStart?.();
    const ctx = cvs.current.getContext("2d");
    ctx.strokeStyle = "#111"; ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const [x, y] = pos(e);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.01, y + 0.01); ctx.stroke();
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = cvs.current.getContext("2d");
    const [x, y] = pos(e);
    ctx.lineTo(x, y); ctx.stroke();
  };
  const up = () => { drawing.current = false; };

  return (
    <canvas ref={cvs} width={size} height={size} style={S.canvas} aria-label="Drawing canvas"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
  );
});
```

`src/components/PhaseBar.jsx`:
```jsx
import { S } from "../theme.js";
import { PHASE_ACTIONS, nextPhase } from "../rooms/phases.js";

const NAMES = { lobby: "Lobby — teams forming", teach: "Teaching — teams draw and train", reveal: "Tournament revealed", fence: "Bendy fence open" };

export function PhaseBar({ phase, onAdvance, busy = false }) {
  const next = nextPhase(phase);
  return (
    <div style={S.phaseBar}>
      <span style={S.phaseNow}>Now: {NAMES[phase] || phase}</span>
      {next && (
        <button className="nl-btn" style={S.phaseBtn} disabled={busy} onClick={() => onAdvance(next)}>
          {PHASE_ACTIONS[phase]} →
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "Add shared UI components

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Entry screens — Landing, TeacherCreate, StudentJoin

**Files:**
- Create: `src/screens/Landing.jsx`, `src/screens/TeacherCreate.jsx`, `src/screens/StudentJoin.jsx`, `src/screens/Landing.test.jsx`, `src/screens/StudentJoin.test.jsx`

**Interfaces:**
- Consumes: `S`, `C` (Task 8); `createRoom`, `getRoomMeta`, `joinRoom`, `DEFAULT_LABELS`, `DEFAULT_TEAM_CAP` (Task 11); `normalizeCode`, `isValidCode` (Task 6).
- Produces:
  - `Landing({ onChoose: (role: "teacher" | "student") => void })`
  - `TeacherCreate({ uid, onCreated: (code) => void, onBack })`
  - `StudentJoin({ uid, lockedCode?: string, onJoined: (code) => void, onExit })` — when `lockedCode` is given the code field is fixed (QR arrival or in-room join).

- [ ] **Step 1: Write the failing tests**

`src/screens/Landing.test.jsx`:
```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Landing } from "./Landing.jsx";

describe("Landing", () => {
  it("asks teacher or student and reports the choice", () => {
    const onChoose = vi.fn();
    render(<Landing onChoose={onChoose} />);
    expect(screen.getByText(/Are you a teacher or a student\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Teacher/ }));
    expect(onChoose).toHaveBeenCalledWith("teacher");
    fireEvent.click(screen.getByRole("button", { name: /Student/ }));
    expect(onChoose).toHaveBeenCalledWith("student");
  });
});
```

`src/screens/StudentJoin.test.jsx`:
```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const api = { getRoomMeta: vi.fn(), joinRoom: vi.fn() };
vi.mock("../rooms/api.js", () => ({
  getRoomMeta: (...a) => api.getRoomMeta(...a),
  joinRoom: (...a) => api.joinRoom(...a),
}));

import { StudentJoin } from "./StudentJoin.jsx";

beforeEach(() => { api.getRoomMeta.mockReset(); api.joinRoom.mockReset(); localStorage.clear(); });

describe("StudentJoin", () => {
  it("disables Join until code is valid and name is filled, normalizes code", () => {
    render(<StudentJoin uid="u1" onJoined={() => {}} onExit={() => {}} />);
    const join = screen.getByRole("button", { name: /Join/ });
    expect(join.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Room code/), { target: { value: "ab cde" } });
    expect(screen.getByLabelText(/Room code/).value).toBe("ABCDE");
    expect(join.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: "Sana" } });
    expect(join.disabled).toBe(false);
  });
  it("shows an error when the room does not exist", async () => {
    api.getRoomMeta.mockResolvedValue(null);
    render(<StudentJoin uid="u1" onJoined={() => {}} onExit={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Room code/), { target: { value: "ABCDE" } });
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: "Sana" } });
    fireEvent.click(screen.getByRole("button", { name: /Join/ }));
    await waitFor(() => expect(screen.getByText(/No room called ABCDE/)).toBeTruthy());
    expect(api.joinRoom).not.toHaveBeenCalled();
  });
  it("joins and reports the code", async () => {
    api.getRoomMeta.mockResolvedValue({ phase: "lobby" });
    api.joinRoom.mockResolvedValue();
    const onJoined = vi.fn();
    render(<StudentJoin uid="u1" onJoined={onJoined} onExit={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Room code/), { target: { value: "ABCDE" } });
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: "Sana" } });
    fireEvent.click(screen.getByRole("button", { name: /Join/ }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith("ABCDE"));
    expect(api.joinRoom).toHaveBeenCalledWith({ code: "ABCDE", uid: "u1", name: "Sana" });
  });
  it("locks the code field when lockedCode is given", () => {
    render(<StudentJoin uid="u1" lockedCode="QWERT" onJoined={() => {}} onExit={() => {}} />);
    const code = screen.getByLabelText(/Room code/);
    expect(code.value).toBe("QWERT");
    expect(code.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/screens`
Expected: FAIL — cannot resolve `./Landing.jsx`, `./StudentJoin.jsx`.

- [ ] **Step 3: Write the screens**

`src/screens/Landing.jsx`:
```jsx
import { S } from "../theme.js";

export function Landing({ onChoose }) {
  return (
    <div style={S.center}>
      <div className="nl-fade" style={{ ...S.centerCard, maxWidth: 640 }}>
        <div className="nl-bounce" style={{ fontSize: 64, lineHeight: 1 }} aria-hidden="true">🧠</div>
        <h1 style={S.h1}>Neural Lab</h1>
        <p style={{ ...S.lede, margin: "0 auto 18px" }}>Teach a machine to see. Then find out what it really learned.</p>
        <p style={{ ...S.label, fontSize: 16 }}>Are you a teacher or a student?</p>
        <div style={S.choiceGrid}>
          <button className="nl-btn" style={S.choiceCard} onClick={() => onChoose("teacher")}>
            <div style={S.choiceEmoji} aria-hidden="true">👩‍🏫</div>
            <div style={S.choiceTitle}>Teacher</div>
            <div style={S.choiceSub}>Create a room for your class</div>
          </button>
          <button className="nl-btn" style={S.choiceCard} onClick={() => onChoose("student")}>
            <div style={S.choiceEmoji} aria-hidden="true">🙋</div>
            <div style={S.choiceTitle}>Student</div>
            <div style={S.choiceSub}>Join with a room code</div>
          </button>
        </div>
      </div>
    </div>
  );
}
```

`src/screens/TeacherCreate.jsx`:
```jsx
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
```

`src/screens/StudentJoin.jsx`:
```jsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/screens`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens
git commit -m "Add landing, teacher create and student join screens

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: App shell and Room routing

**Files:**
- Modify: `src/App.jsx` (replace placeholder)
- Create: `src/screens/Room.jsx`, `src/screens/Lobby.jsx` (stub replaced in Task 16), `src/screens/Teach.jsx`, `src/screens/Tournament.jsx`, `src/screens/Fence.jsx`, `src/screens/Settings.jsx` (stubs replaced in Tasks 17–20)

**Interfaces:**
- Consumes: `isConfigured` (Task 9), `useAuth`, `useRoom` (Task 12), `visibleTabs` (Task 7), `setPhase`, `DEFAULT_LABELS` (Task 11), `Tabs`, `Toast/useToast`, `PhaseBar` (Task 13), entry screens (Task 14).
- Produces:
  - `App` default export.
  - `Room({ code, uid, onExit })`.
  - Every tab screen receives the same props object, referred to below as **RoomProps**:
    `{ code, uid, meta, members, teams, labels, team: { id, name } | null, isTeacher, flash }`.

- [ ] **Step 1: Write stub tab screens (replaced later)**

Each of `src/screens/Lobby.jsx`, `Teach.jsx`, `Tournament.jsx`, `Fence.jsx`, `Settings.jsx`, for now:
```jsx
import { S } from "../theme.js";
export function Lobby() { return <main style={S.wide}><p style={S.empty}>Lobby coming soon.</p></main>; }
```
(Change the exported name per file: `Teach`, `Tournament`, `Fence`, `Settings`.)

- [ ] **Step 2: Write src/screens/Room.jsx**

```jsx
import { useState } from "react";
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
  const { meta, members, teams, loading, missing } = useRoom(code);
  const { toast, flash } = useToast();
  const [tab, setTab] = useState("lobby");
  const [busy, setBusy] = useState(false);

  if (loading) return <Centered><p style={S.lede}>Opening room {code}…</p></Centered>;
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
  if (!isTeacher && !me) return <StudentJoin uid={uid} lockedCode={code} onJoined={() => {}} onExit={onExit} />;
  if (!isTeacher && meta.closed) {
    return (
      <Centered>
        <h2 style={S.h2}>This room has been closed</h2>
        <button className="nl-btn" style={{ ...S.ghost, marginTop: 14 }} onClick={onExit}>Back to start</button>
      </Centered>
    );
  }

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
        <button className="nl-btn" style={{ ...S.tiny, marginLeft: "auto" }} onClick={onExit}>Leave room</button>
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
```

- [ ] **Step 3: Replace src/App.jsx**

```jsx
import { useState } from "react";
import { CSS, S, C } from "./theme.js";
import { isConfigured } from "./firebase.js";
import { useAuth } from "./rooms/hooks.js";
import { normalizeCode, isValidCode } from "./rooms/codes.js";
import { Landing } from "./screens/Landing.jsx";
import { TeacherCreate } from "./screens/TeacherCreate.jsx";
import { StudentJoin } from "./screens/StudentJoin.jsx";
import { Room } from "./screens/Room.jsx";

const LS_ROOM = "nl.room";

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

  const enter = (c) => { rememberCode(c); setCode(c); };
  const exit = () => { rememberCode(null); setCode(null); setChoice(null); };

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
  return <Landing onChoose={setChoice} />;
}

export default function App() {
  return (
    <>
      <style>{CSS}</style>
      {isConfigured() ? <Shell /> : <SetupNotice />}
    </>
  );
}
```

- [ ] **Step 4: Build and smoke-run**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds.

Run: `npm run dev` in the background, open `http://localhost:5173/MyAIActivity/`.
Expected: with placeholder config, the "One more step" notice renders with the playful theme (cream background, Fredoka heading). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/screens
git commit -m "Add app shell with auth, room routing and phase-gated tabs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 16: Lobby screen

**Files:**
- Modify: `src/screens/Lobby.jsx` (replace stub)

**Interfaces:**
- Consumes: RoomProps (Task 15); `useTeamModel` (Task 12); `createTeam`, `joinTeam`, `leaveTeam`, `renameTeam`, `deleteTeam`, `moveMember`, `DEFAULT_TEAM_CAP` (Task 11); `TeamCard`, `QrLink` (Task 13).
- Produces: `Lobby(RoomProps)`.

- [ ] **Step 1: Write src/screens/Lobby.jsx**

```jsx
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
                if (window.confirm(`Delete team ${teams[tid]?.name}? Members go back to the lobby.`))
                  run(() => deleteTeam({ code, teamId: tid, members }), "Team deleted.");
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
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: succeeds. (Lobby is exercised in the manual acceptance run, Task 22.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/Lobby.jsx
git commit -m "Add lobby with team creation, joining and teacher controls

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 17: Teach screen

**Files:**
- Modify: `src/screens/Teach.jsx` (replace stub)

**Interfaces:**
- Consumes: RoomProps; `newNet`, `fwd`, `trainEpochs`, `accuracy`, `pct`, `HID_A`, `EPOCHS_A`, `LR_A`, `MIN_PER_LABEL` (Task 3); `NPIX` (Task 4); `sendModel` (Task 11); `useTeamModel` (Task 12); `DrawCanvas`, `Thumb` (Task 13); `LABEL_COLORS`, `LABEL_DEEP` (Task 8).
- Produces: `Teach(RoomProps)`. Drawings persist per room+team in `localStorage` key `nl.samples.{code}.{teamId|solo}`.

- [ ] **Step 1: Write src/screens/Teach.jsx**

```jsx
import { useEffect, useRef, useState } from "react";
import { S, C, LABEL_COLORS, LABEL_DEEP } from "../theme.js";
import { newNet, fwd, trainEpochs, accuracy, pct, HID_A, EPOCHS_A, LR_A, MIN_PER_LABEL } from "../ml/net.js";
import { NPIX } from "../ml/capture.js";
import { sendModel } from "../rooms/api.js";
import { useTeamModel } from "../rooms/hooks.js";
import { DrawCanvas } from "../components/DrawCanvas.jsx";
import { Thumb } from "../components/Thumb.jsx";

const load = (key) => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };

export function Teach({ code, uid, members, labels, team, isTeacher, flash }) {
  const canvas = useRef(null);
  const storageKey = `nl.samples.${code}.${team?.id || "solo"}`;
  const [which, setWhich] = useState(0);
  const [samples, setSamples] = useState(() => load(storageKey));
  const [net, setNet] = useState(null);
  const [ownAcc, setOwnAcc] = useState(null);
  const [training, setTraining] = useState(false);
  const [guess, setGuess] = useState(null);
  const [sending, setSending] = useState(false);
  const sent = useTeamModel(code, team?.id);

  useEffect(() => { setSamples(load(storageKey)); setNet(null); setOwnAcc(null); }, [storageKey]);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(samples)); } catch { /* ignore */ } }, [samples, storageKey]);

  const counts = [0, 1].map((l) => samples.filter((s) => s.label === l).length);
  const ready = counts[0] >= MIN_PER_LABEL && counts[1] >= MIN_PER_LABEL;

  const invalidate = () => { setNet(null); setOwnAcc(null); setGuess(null); };

  const add = () => {
    const pix = canvas.current?.capture();
    if (!pix) return flash("Draw something first!");
    setSamples((s) => [...s, { label: which, pix }]);
    invalidate();
    canvas.current.clear();
  };

  const remove = (i) => { setSamples((s) => s.filter((_, k) => k !== i)); invalidate(); };

  const train = () => {
    setTraining(true); setGuess(null);
    setTimeout(() => {
      const n = newNet(NPIX, HID_A, samples.length * 7 + 3);
      trainEpochs(n, samples.map((s) => s.pix), samples.map((s) => s.label), EPOCHS_A, LR_A);
      setNet(n); setOwnAcc(accuracy(n, samples)); setTraining(false);
    }, 30);
  };

  const test = () => {
    if (!net) return;
    const pix = canvas.current?.capture();
    if (!pix) return flash("Draw something first!");
    const y = fwd(net, pix).y;
    setGuess({ label: y > 0.5 ? 1 : 0, conf: y > 0.5 ? y : 1 - y });
  };

  const send = async () => {
    if (!net) return flash("Train it first.");
    if (!team) return flash(isTeacher ? "Teachers don't enter the tournament. Join a team to try it." : "Join a team in the Lobby first.");
    setSending(true);
    try { await sendModel({ code, teamId: team.id, net, samples, own: ownAcc, uid }); flash("Sent to the class! 🚀"); }
    catch { flash("Could not reach the class board."); }
    finally { setSending(false); }
  };

  const sentBy = sent.value?.sentBy ? members[sent.value.sentBy]?.name || "a teammate" : null;
  const sentAt = sent.value?.at ? new Date(sent.value.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <main style={S.main}>
      <section style={S.card} className="nl-fade">
        <h2 style={S.h2}>Draw {MIN_PER_LABEL}–6 of each</h2>
        <div style={S.pickRow}>
          {labels.map((l, i) => (
            <button key={l} className="nl-btn" onClick={() => setWhich(i)}
              style={{ ...S.pick, ...(which === i ? { background: LABEL_COLORS[i], color: C.paper, boxShadow: `0 4px 0 ${LABEL_DEEP[i]}` } : null) }}>
              {l} <span style={S.pickN}>{counts[i]}</span>
            </button>
          ))}
        </div>

        <DrawCanvas ref={canvas} size={300} onStrokeStart={() => setGuess(null)} />

        <div style={S.btnRow}>
          <button className="nl-btn" style={S.primary} onClick={add}>Add this drawing</button>
          <button className="nl-btn" style={S.ghost} onClick={() => { canvas.current?.clear(); setGuess(null); }}>Clear</button>
          {net && <button className="nl-btn" style={S.accent} onClick={test}>What is it? 🤔</button>}
        </div>

        {guess && (
          <div className="nl-fade" style={{ ...S.guess, borderColor: LABEL_COLORS[guess.label] }}>
            <span style={{ ...S.guessLbl, color: LABEL_DEEP[guess.label] }}>{labels[guess.label]}</span>
            <span style={S.guessConf}>{pct(guess.conf)} sure</span>
          </div>
        )}
      </section>

      <section style={S.card} className="nl-fade">
        <h2 style={S.h2}>Your training set</h2>
        {samples.length === 0 ? (
          <p style={S.empty}>Nothing yet. Every drawing you add is one example the machine gets to learn from.</p>
        ) : (
          <div style={S.thumbs}>
            {samples.map((s, i) => (
              <button key={i} className="nl-btn" title="Remove this drawing" onClick={() => remove(i)} style={{ padding: 0, lineHeight: 0 }}>
                <Thumb pix={s.pix} tint={LABEL_COLORS[s.label]} />
              </button>
            ))}
          </div>
        )}

        <button className="nl-btn" style={S.train} disabled={!ready || training} onClick={train}>
          {training ? "Learning…" : `Train it (${samples.length} examples)`}
        </button>
        {!ready && <p style={S.hint}>At least {MIN_PER_LABEL} of each before it can learn anything.</p>}

        {ownAcc != null && (
          <>
            <div style={S.score} className="nl-fade">
              <div style={S.scoreN}>{pct(ownAcc)}</div>
              <div style={S.scoreL}>correct on your own drawings</div>
            </div>
            <p style={S.hint}>Draw a new one and press <b>What is it?</b> to test it yourself.</p>
            <button className="nl-btn" style={S.send} disabled={sending} onClick={send}>
              {sending ? "Sending…" : "Send my machine to the class 🚀"}
            </button>
          </>
        )}

        {team && sent.value && (
          <p style={{ ...S.hint, color: C.leaf, fontWeight: 800 }}>
            ✓ {team.name}'s machine is in — sent by {sentBy}{sentAt ? ` at ${sentAt}` : ""}. Sending again replaces it.
          </p>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Teach.jsx
git commit -m "Add teach screen: draw, train, test, send

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 18: Tournament screen

**Files:**
- Modify: `src/screens/Tournament.jsx` (replace stub)
- Create: `src/screens/Tournament.test.jsx`

**Interfaces:**
- Consumes: RoomProps; `useModels` (Task 12); `buildTournamentTable`, `tableAverages`, `MIN_TEAMS_TO_SHOW`, `MIN_TEAMS_MEANINGFUL` (Task 5); `pct` (Task 3).
- Produces: `Tournament(RoomProps)`.

- [ ] **Step 1: Write the failing test**

`src/screens/Tournament.test.jsx`:
```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let modelsValue = {};
vi.mock("../rooms/hooks.js", () => ({ useModels: () => ({ value: modelsValue, loading: false }) }));

import { Tournament } from "./Tournament.jsx";

const signNet = { nIn: 1, nHid: 1, W1: [[10]], b1: [0], W2: [10], b2: 0 };
const tests = [{ pix: [1], label: 1 }, { pix: [-1], label: 0 }];
const mk = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`t${i}`, { model: signNet, tests, own: 1 }]));
const teams = { t0: { name: "Zero" }, t1: { name: "One" }, t2: { name: "Two" }, t3: { name: "Three" } };
const props = { code: "ABCDE", teams, labels: ["Mango", "Cricket ball"], team: { id: "t1", name: "One" }, isTeacher: false };

describe("Tournament", () => {
  it("waits below two teams", () => {
    modelsValue = mk(1);
    render(<Tournament {...props} />);
    expect(screen.getByText(/Waiting for teams/)).toBeTruthy();
  });
  it("shows scores with a caution between two and three teams", () => {
    modelsValue = mk(3);
    render(<Tournament {...props} />);
    expect(screen.getByText(/at least 4 teams/i)).toBeTruthy();
    expect(screen.getByText(/Zero/)).toBeTruthy();
  });
  it("drops the caution at four teams and shows the questions", () => {
    modelsValue = mk(4);
    render(<Tournament {...props} />);
    expect(screen.queryByText(/at least 4 teams/i)).toBeNull();
    expect(screen.getByText(/So what did your machine actually learn/)).toBeTruthy();
    expect(screen.getByText(/Whose mistake was that\?/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/Tournament.test.jsx`
Expected: FAIL — "Waiting for teams" not found (stub renders "coming soon").

- [ ] **Step 3: Write src/screens/Tournament.jsx**

```jsx
import { useMemo } from "react";
import { S, C } from "../theme.js";
import { useModels } from "../rooms/hooks.js";
import { buildTournamentTable, tableAverages, MIN_TEAMS_TO_SHOW, MIN_TEAMS_MEANINGFUL } from "../ml/scoring.js";
import { pct } from "../ml/net.js";

const crossColor = (v) => (v == null ? C.muted : v > 0.8 ? C.leaf : v > 0.6 ? C.mangoDeep : C.red);

export function Tournament({ code, teams, labels, team }) {
  const { value: models, loading } = useModels(code, true);
  const rows = useMemo(() => buildTournamentTable(models, teams), [models, teams]);
  const { avgOwn, avgCross, count } = tableAverages(rows);
  const thing = (labels?.[0] || "mango").toLowerCase();

  return (
    <main style={S.wide} className="nl-fade">
      <h1 style={S.h1}>🏆 The tournament</h1>
      <p style={S.lede}>
        Every machine in the room is now tested on drawings made by other teams. Nothing about the
        machines changed. Only who drew the pictures.
      </p>

      {loading ? (
        <p style={S.empty}>Loading machines…</p>
      ) : count < MIN_TEAMS_TO_SHOW ? (
        <p style={S.empty}>Waiting for teams to send their machines. {count} of {MIN_TEAMS_TO_SHOW} so far. Four or more makes it interesting.</p>
      ) : (
        <>
          {count < MIN_TEAMS_MEANINGFUL && (
            <div style={S.caution}>⚠️ Only {count} teams so far. Needs at least 4 teams before this means anything.</div>
          )}

          <div style={S.bigCompare}>
            <div>
              <div style={{ ...S.bigN, color: C.leaf }}>{pct(avgOwn)}</div>
              <div style={S.bigL}>on their own drawings</div>
            </div>
            <div style={S.arrow} aria-hidden="true">→</div>
            <div>
              <div style={{ ...S.bigN, color: crossColor(avgCross) }}>{pct(avgCross)}</div>
              <div style={S.bigL}>on everyone else's</div>
            </div>
          </div>

          <div style={S.table} role="table" aria-label="Leaderboard">
            <div style={{ ...S.tr, ...S.thead }} role="row">
              <span>Team</span><span>Own</span><span>Strangers</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={r.teamId} role="row" style={{ ...S.tr, ...(r.teamId === team?.id ? { outline: `3px solid ${C.sky}` } : null) }}>
                <span style={{ fontWeight: 800, color: i === 0 ? C.mangoDeep : C.ink }}>{i === 0 ? "⭐ " : ""}{r.name}</span>
                <span style={{ color: C.muted, fontWeight: 700 }}>{pct(r.own)}</span>
                <span style={{ color: crossColor(r.cross), fontWeight: 800 }}>{pct(r.cross)}</span>
                <span style={S.barCell}>
                  <span style={{ ...S.bar, width: `${(r.cross || 0) * 100}%`, background: i === 0 ? C.sun : C.sky }} />
                </span>
              </div>
            ))}
          </div>

          <div style={S.qBox}>
            <div style={S.qKick}>Work this out before anyone tells you</div>
            <p style={S.q}>
              Every machine got nearly everything right on its own drawings and then fell apart on
              other people's. It was never tested on those before.
            </p>
            <p style={S.qBig}>So what did your machine actually learn — {thing}, or the way <em>your team</em> draws a {thing}?</p>
          </div>

          <div style={S.closing}>
            <div style={S.qKick}>Before you leave</div>
            <p style={S.q}>
              An app that tells you if a mango is ripe was built from photos of mangoes on one farm in
              Sindh. Your uncle grows mangoes in Multan. The app says every one of his is bad.
            </p>
            <p style={S.qBig}>Whose mistake was that?</p>
            <div style={S.qNote}>No answer is coming. Argue about it in the corridor.</div>
          </div>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/screens/Tournament.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Tournament.jsx src/screens/Tournament.test.jsx
git commit -m "Add tournament leaderboard with four-team caution

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 19: Bendy Fence screen

**Files:**
- Modify: `src/screens/Fence.jsx` (replace stub)

**Interfaces:**
- Consumes: RoomProps; `newNet`, `fwd`, `trainEpochs`, `pct` (Task 3); `useChallenges` (Task 12); `postChallenge`, `claimChallenge`, `MAX_CHALLENGE_POINTS` (Task 11); `MiniPattern` (Task 13); `LABEL_COLORS` (Task 8).
- Produces: `Fence(RoomProps)`.

- [ ] **Step 1: Write src/screens/Fence.jsx**

```jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { S, C, LABEL_COLORS, LABEL_DEEP } from "../theme.js";
import { newNet, fwd, trainEpochs, pct } from "../ml/net.js";
import { useChallenges } from "../rooms/hooks.js";
import { postChallenge, claimChallenge, MAX_CHALLENGE_POINTS } from "../rooms/api.js";
import { MiniPattern } from "../components/MiniPattern.jsx";

const TICKS = 70, EPOCHS_PER_TICK = 40, LR = 0.35, MIN_DOTS = 6;
const DOT_NAMES = ["Orange", "Blue"];

export function Fence({ code, team, isTeacher, flash }) {
  const cvs = useRef(null);
  const raf = useRef(null);
  const [pts, setPts] = useState([]);
  const [col, setCol] = useState(0);
  const [hid, setHid] = useState(1);
  const [net, setNet] = useState(null);
  const [acc, setAcc] = useState(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const { value: challenges } = useChallenges(code, true);
  const poster = team ? { teamId: team.id, teamName: team.name } : isTeacher ? { teamId: "teacher", teamName: "Teacher" } : null;

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null; setRunning(false);
  }, []);
  useEffect(() => () => stop(), [stop]);

  const paint = useCallback((n) => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, R = 5, cells = 56, step = W / cells;
    ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, W);
    if (n) {
      for (let gy = 0; gy < cells; gy++) for (let gx = 0; gx < cells; gx++) {
        const px = gx * step, py = gy * step;
        const y = fwd(n, [(px / W) * 2 - 1, (py / W) * 2 - 1]).y;
        const a = 0.16 + Math.abs(y - 0.5) * 0.6;
        ctx.fillStyle = y > 0.5 ? `rgba(59,167,245,${a})` : `rgba(255,138,61,${a})`;
        ctx.fillRect(px, py, step + 1, step + 1);
      }
    }
    pts.forEach((p) => {
      ctx.beginPath(); ctx.arc(p.x * W, p.y * W, R + 2, 0, 7); ctx.fillStyle = C.paper; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x * W, p.y * W, R, 0, 7); ctx.fillStyle = LABEL_COLORS[p.c ? 1 : 0]; ctx.fill();
    });
  }, [pts]);

  useEffect(() => { paint(net); }, [paint, net]);

  const drop = (e) => {
    if (pts.length >= MAX_CHALLENGE_POINTS) return flash(`Max ${MAX_CHALLENGE_POINTS} dots.`);
    const c = cvs.current, r = c.getBoundingClientRect();
    setPts((p) => [...p, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, c: col }]);
    setNet(null); setAcc(null); stop();
  };

  const run = () => {
    if (pts.filter((p) => p.c).length < 2 || pts.filter((p) => !p.c).length < 2)
      return flash("Put at least two dots of each colour down.");
    stop();
    const n = newNet(2, hid, pts.length * 13 + hid);
    const X = pts.map((p) => [p.x * 2 - 1, p.y * 2 - 1]);
    const Y = pts.map((p) => p.c);
    setRunning(true);
    let i = 0;
    const tick = () => {
      trainEpochs(n, X, Y, EPOCHS_PER_TICK, LR);
      paint(n);
      let ok = 0;
      X.forEach((x, k) => { if ((fwd(n, x).y > 0.5 ? 1 : 0) === Y[k]) ok++; });
      setAcc(ok / X.length);
      if (++i < TICKS) raf.current = requestAnimationFrame(tick);
      else { setNet(n); setRunning(false); raf.current = null; }
    };
    tick();
  };

  const post = async () => {
    if (!poster) return flash("Join a team in the Lobby first.");
    if (pts.length < MIN_DOTS) return flash(`A challenge needs at least ${MIN_DOTS} dots.`);
    setBusy(true);
    try { await postChallenge({ code, ...poster, pts }); flash("Challenge posted! 🧩"); }
    catch { flash("Could not reach the class board."); }
    finally { setBusy(false); }
  };

  const claim = async (id) => {
    if (!poster) return flash("Join a team in the Lobby first.");
    if (acc == null || acc < 1) return flash("Solve it completely first — 100%.");
    setBusy(true);
    try {
      const ok = await claimChallenge({ code, id, ...poster, neurons: hid });
      flash(ok ? `Recorded: ${hid} neuron${hid > 1 ? "s" : ""} 🎯` : "Someone already did it with fewer neurons.");
    } catch { flash("Could not reach the class board."); }
    finally { setBusy(false); }
  };

  const list = Object.entries(challenges || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));

  return (
    <main style={S.main}>
      <section style={S.card} className="nl-fade">
        <h2 style={S.h2}>Build a fence</h2>
        <p style={S.hint}>
          Tap to drop dots. The machine tries to fence the two colours apart. One neuron can only
          make a straight fence. Add more and it starts to bend.
        </p>
        <div style={S.pickRow}>
          {DOT_NAMES.map((l, i) => (
            <button key={l} className="nl-btn" onClick={() => setCol(i)}
              style={{ ...S.pick, ...(col === i ? { background: LABEL_COLORS[i], color: C.paper, boxShadow: `0 4px 0 ${LABEL_DEEP[i]}` } : null) }}>
              {l}
            </button>
          ))}
        </div>

        <canvas ref={cvs} width={320} height={320} style={{ ...S.canvas, background: C.cream }} onClick={drop} aria-label="Dot field" />

        <div style={S.sliderRow}>
          <span style={S.slLbl}>Neurons</span>
          <input className="nl-in" type="range" min={1} max={8} value={hid} style={S.slider} aria-label="Neurons"
            onChange={(e) => { setHid(+e.target.value); setNet(null); setAcc(null); stop(); }} />
          <span style={S.slVal}>{hid === 1 ? "1 · straight" : hid}</span>
        </div>

        <div style={S.btnRow}>
          <button className="nl-btn" style={S.primary} onClick={run} disabled={running}>{running ? "Learning…" : "Train"}</button>
          <button className="nl-btn" style={S.ghost} onClick={() => { setPts([]); setNet(null); setAcc(null); stop(); }}>Clear</button>
          <button className="nl-btn" style={S.accent} onClick={post} disabled={busy}>Post as challenge</button>
        </div>

        {acc != null && (
          <div style={{ ...S.guess, borderColor: acc === 1 ? C.leaf : C.sun }}>
            <span style={S.guessLbl}>{pct(acc)} fenced correctly</span>
            <span style={S.guessConf}>{acc === 1 ? "solved ✓" : "some dots on the wrong side"}</span>
          </div>
        )}
      </section>

      <section style={S.card} className="nl-fade">
        <h2 style={S.h2}>Class challenges <span style={S.badge}>{list.length}</span></h2>
        <p style={S.hint}>Load someone else's pattern. Solve it with the fewest neurons you can.</p>
        {list.length === 0 ? (
          <p style={S.empty}>Nothing posted yet. Make a pattern a straight fence cannot solve, then post it.</p>
        ) : (
          <div style={S.chList}>
            {list.map(([id, ch]) => (
              <div key={id} style={S.ch}>
                <MiniPattern pts={ch.pts} />
                <div style={S.chBody}>
                  <div style={S.chTeam}>{ch.teamName}</div>
                  <div style={S.chBest}>
                    {ch.best ? `best: ${ch.best.neurons} neuron${ch.best.neurons > 1 ? "s" : ""} · ${ch.best.teamName}` : "unsolved"}
                  </div>
                  <div style={S.chBtns}>
                    <button className="nl-btn" style={S.tiny}
                      onClick={() => { setPts((ch.pts || []).map((p) => ({ ...p }))); setNet(null); setAcc(null); stop(); }}>
                      Load
                    </button>
                    <button className="nl-btn" style={S.tiny} disabled={busy} onClick={() => claim(id)}>
                      I solved it with {hid}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Fence.jsx
git commit -m "Add bendy fence with class challenges

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 20: Settings screen (teacher)

**Files:**
- Modify: `src/screens/Settings.jsx` (replace stub)

**Interfaces:**
- Consumes: RoomProps; `setLabels`, `setTeamCap`, `resetBoard`, `closeRoom` (Task 11).
- Produces: `Settings(RoomProps)`.

- [ ] **Step 1: Write src/screens/Settings.jsx**

```jsx
import { useEffect, useState } from "react";
import { S, C } from "../theme.js";
import { setLabels, setTeamCap, resetBoard, closeRoom } from "../rooms/api.js";

const RUN_SHEET = [
  ["0:00", "Teams of four. Team name in. No explaining."],
  ["0:03", "Draw 5 of each and add them."],
  ["0:13", "Train. Everyone hits about 100%."],
  ["0:16", "Draw fresh ones, press What is it?"],
  ["0:20", "Send to the class. Press Reveal tournament. Projector on."],
  ["0:24", "Watch the scores collapse. Let them talk."],
  ["0:32", "The mango question. Do not answer it."],
  ["0:38", "Out."],
];

export function Settings({ code, meta, flash }) {
  const [a, setA] = useState(meta.labels?.[0] || "");
  const [b, setB] = useState(meta.labels?.[1] || "");
  const [cap, setCap] = useState(meta.teamCap || 4);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setA(meta.labels?.[0] || ""); setB(meta.labels?.[1] || ""); setCap(meta.teamCap || 4); }, [meta.labels, meta.teamCap]);

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); flash(ok); }
    catch { flash("Could not reach the class board."); }
    finally { setBusy(false); }
  };

  return (
    <main style={S.wide} className="nl-fade">
      <h1 style={S.h1}>⚙️ Settings</h1>
      <div style={S.settingsGrid}>
        <section style={S.card}>
          <h2 style={S.h2}>What the class draws</h2>
          <div style={S.row}>
            <input className="nl-in" style={{ ...S.input, width: 150 }} value={a} maxLength={24} onChange={(e) => setA(e.target.value)} aria-label="First thing" />
            <span style={{ fontWeight: 800 }}>vs</span>
            <input className="nl-in" style={{ ...S.input, width: 150 }} value={b} maxLength={24} onChange={(e) => setB(e.target.value)} aria-label="Second thing" />
            <button className="nl-btn" style={S.primary} disabled={busy || !a.trim() || !b.trim()}
              onClick={() => run(() => setLabels({ code, labels: [a, b] }), "Pair set for the whole class.")}>Set</button>
          </div>
          <p style={S.notesP}>
            Pick two things that look alike. Mango and cricket ball, chappal and joota, roti and naan,
            sun and flower. Obvious pairs are learned too easily and the tournament falls flat.
            Change this before teams start drawing — everyone must draw the same pair.
          </p>

          <h2 style={{ ...S.h2, marginTop: 18 }}>Max students per team</h2>
          <div style={S.row}>
            <input className="nl-in" type="number" min={1} max={12} style={{ ...S.input, width: 100 }} value={cap} onChange={(e) => setCap(Number(e.target.value))} aria-label="Team cap" />
            <button className="nl-btn" style={S.primary} disabled={busy}
              onClick={() => run(() => setTeamCap({ code, teamCap: cap }), "Team size updated.")}>Set</button>
          </div>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>Run sheet, one period</h2>
          {RUN_SHEET.map(([t, w]) => (
            <div key={t} style={S.sheetRow}>
              <span style={{ color: C.mangoDeep, minWidth: 42, fontWeight: 800 }}>{t}</span>
              <span style={{ color: C.muted }}>{w}</span>
            </div>
          ))}
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>The one rule</h2>
          <p style={S.notesP}>
            Say nothing about how it works until after the tournament collapses. The gap between own
            and strangers is the whole lesson, and it only lands if they are surprised by it.
          </p>
          <p style={S.notesP}>
            Words to keep out of the room: overfitting, generalisation, bias, training data. They will
            describe all four in their own words. That is better than the terms.
          </p>
          <h2 style={{ ...S.h2, marginTop: 18 }}>Bendy fence, if you get a second period</h2>
          <p style={S.notesP}>
            One neuron draws a straight fence. Ask teams to make a pattern no straight fence can split,
            post it, then race to solve each other's with the fewest neurons. Four dots in a checkerboard
            is the classic. It needs at least two neurons.
          </p>
        </section>

        <section style={{ ...S.card, borderLeft: `8px solid ${C.red}` }}>
          <h2 style={S.h2}>Danger zone</h2>
          <p style={S.notesP}>Reset wipes every sent machine and every challenge, and puts the room back in the teaching phase. Teams and members stay.</p>
          <div style={S.btnRow}>
            <button className="nl-btn" style={S.danger} disabled={busy}
              onClick={() => window.confirm("Erase every model and challenge from the class board?") && run(() => resetBoard({ code }), "Class board cleared.")}>
              Reset board
            </button>
            <button className="nl-btn" style={S.danger} disabled={busy || meta.closed}
              onClick={() => window.confirm("Close this room? Students will no longer be able to use it.") && run(() => closeRoom({ code }), "Room closed.")}>
              {meta.closed ? "Room closed" : "Close room"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Build check**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Settings.jsx
git commit -m "Add teacher settings with labels, cap, reset and notes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 21: README, spec touch-up, deploy

**Files:**
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-09-11-neural-lab-classroom-design.md` (line "Vite + React 18" → "Vite + React 19")

- [ ] **Step 1: Write README.md**

````markdown
# Neural Lab

A classroom web app: teams draw two things, train a real tiny neural network in the
browser, score ~100% on their own drawings, then watch the number collapse when their
model meets other teams' drawings. Overfitting and dataset bias, discovered rather than
defined. Second period: Bendy Fence (dots, a 1–8 neuron slider, class challenges).

Live: https://mehdy922.github.io/MyAIActivity/

## One-time setup (teacher, ~5 minutes)

1. Go to https://console.firebase.google.com → **Add project** → any name → turn Google Analytics **off** → Create.
2. Left menu **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save**.
3. **Build → Realtime Database → Create database** → pick a location → **Start in locked mode** → Enable.
4. **Rules** tab → replace everything with the contents of `database.rules.json` → **Publish**.
5. Project settings (gear icon) → **General → Your apps → Web (</>)** → nickname anything → Register → copy the `firebaseConfig` values.
6. Open `src/firebaseConfig.js`, replace each `PASTE_…` value with yours, commit, push to `main`.
   GitHub Actions rebuilds and deploys automatically (Actions tab shows progress).

Everything runs on Firebase's free Spark plan. No card needed. Limits: 100 simultaneous
connections, 1 GB stored, 10 GB/month download — plenty for a class.

Troubleshooting:
- Page says "Could not sign in" with `auth/admin-restricted-operation` or `auth/operation-not-allowed` → step 2 (Anonymous) is not enabled.
- `auth/unauthorized-domain` → Authentication → Settings → Authorized domains → add `mehdy922.github.io`.
- Students see "permission denied" toasts → step 4 (rules) not published, or published to a different database.

## Running a lesson

1. Open the live URL → **Teacher** → set the pair (default Mango vs Cricket ball; try Sun vs Flower) and team size → **Create room**.
2. Put the Lobby on the projector: room code + QR.
3. Students: open the URL → **Student** → code + name → create or join a team.
4. Press **Start teaching**. Students draw 5 of each, **Train**, test with **What is it?**, then **Send my machine to the class**.
5. Press **Reveal tournament**. Open the Tournament tab on the projector. Wait for the noise.
6. Second period: **Open bendy fence**.

Teacher tips, run sheet and the one rule are in the **Settings** tab inside the room.
Bookmark the room URL — the teacher role is tied to this browser.

## Development

```bash
npm install
npm run dev          # http://localhost:5173/MyAIActivity/
npm test             # unit tests (Vitest, jsdom)
npm run test:rules   # security rules against the Firebase emulator (needs Java)
npm run build
```

## Layout

- `src/ml/` — the network, drawing capture (auto-crop + centre), cross-scoring
- `src/rooms/` — room codes, phases, RTDB API, live-state hooks
- `src/screens/` — Landing, TeacherCreate, StudentJoin, Room, Lobby, Teach, Tournament, Fence, Settings
- `database.rules.json` — who may write what
- `docs/superpowers/specs/` — design spec; `docs/prototype/` — original single-file prototype
````

- [ ] **Step 2: Fix the spec's React version**

Run:
```bash
sed -i 's/Vite + React 18, plain JavaScript/Vite + React 19, plain JavaScript/' docs/superpowers/specs/2026-09-11-neural-lab-classroom-design.md
grep -n "React 19" docs/superpowers/specs/2026-09-11-neural-lab-classroom-design.md
```
Expected: one matching line.

- [ ] **Step 3: Full verification, commit, push, watch deploy**

```bash
npm test
npm run build
git add README.md docs/superpowers/specs
git commit -m "Add README with Firebase and classroom setup

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main
gh run watch --exit-status
curl -s https://mehdy922.github.io/MyAIActivity/ | grep -o "<title>[^<]*</title>"
```
Expected: tests pass, build succeeds, workflow green, curl prints `<title>Neural Lab</title>`. The live page shows the "One more step" setup notice until the user pastes their Firebase config.

---

### Task 22: Manual acceptance (after the user pastes Firebase config)

**Files:** none. This task is a checklist; it gates "done".

Preconditions: user has completed README steps 1–6 and the deploy is green. Rules published in the console.

- [ ] **Step 1: Teacher flow (desktop browser A)**
  - Open live URL → Teacher → Create room. Code, QR and link appear in Lobby. PhaseBar reads "Lobby — teams forming".
  - Settings → change pair to Sun / Flower → header updates to "Sun vs Flower".

- [ ] **Step 2: Student flow (private window B, phone-width ~400px; and window C)**
  - Scan/paste link → name prompt with code locked → Join → Lobby. Only Lobby tab visible.
  - B creates team "Aloo"; C joins "Aloo"; count shows 2/4. C leaves and creates "Bhindi".
  - Teacher A: rename "Bhindi" → "Bhindi Masala"; move a student; both reflect live on B and C.

- [ ] **Step 3: Teach**
  - A: Start teaching. B and C now see Teach tab.
  - B: draw 4 suns + 4 flowers, Train → score shown; What is it? → guess with confidence. Reload the page → drawings still there.
  - B: Send. C (same room, other team): Teach shows no sent notice; B's Lobby card shows "model sent ✓" and Leave is gone.
  - C: draw + train + send.

- [ ] **Step 4: Tournament**
  - Before Reveal: B and C have no Tournament tab. A sees it with the "Needs at least 4 teams" caution and two rows.
  - A: Reveal tournament → B and C get the tab; rows and questions render; own team row outlined.

- [ ] **Step 5: Fence**
  - A: Open bendy fence. B: drop 2+2 dots, Train with 1 neuron → surface paints; slider to 3, Train again → bends. Post as challenge. C: Load, solve, claim → best recorded on all screens.

- [ ] **Step 6: Danger zone**
  - A: Reset board → models and challenges vanish everywhere, phase back to teach. Close room → B/C see "room closed" on next load; A still in.

- [ ] **Step 7: Rules sanity (Firebase console → Realtime Database → Rules → Playground)**
  - Simulate write to `rooms/<CODE>/meta/phase` as an anonymous uid that is not the teacher → denied.

Record any failure as a bug and fix it with the systematic-debugging skill before declaring done.
