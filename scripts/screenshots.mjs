// Capture app screenshots for the slide deck by driving the LIVE site as a student.
//
//   node scripts/screenshots.mjs --room CODE [--team "Chai Wallahs"] [--out slides/img]
//
// Needs a room that is already in the "fence" phase with a team that has space
// (e.g. one produced by `npm run simulate -- --rounds 2 --hold 600`).
// Produces: teach-drawing.png, teach-trained.png, lobby.png, tournament-phone.png, tournament-projector.png

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const CODE = arg("room");
const TEAM = arg("team", "Chai Wallahs");
const OUT = arg("out", "slides/img");
const PROJECTOR_FILE = arg("projector-file", "tournament-projector.png");
const PROJECTOR_ONLY = process.argv.includes("--projector-only");
const URL = `https://mehdy922.github.io/neural-lab/?room=${CODE}`;
if (!CODE) { console.error("--room CODE is required"); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const log = (s) => console.log(`▶ ${s}`);
const browser = await chromium.launch();

if (PROJECTOR_ONLY) {
  log("tournament (projector) only");
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const p2 = await desk.newPage();
  await p2.goto(URL, { waitUntil: "networkidle" });
  await p2.getByLabel("Your name").fill("Projector");
  await p2.getByRole("button", { name: /Join/ }).click();
  await p2.getByRole("tab", { name: /Tournament/ }).click();
  await p2.getByRole("table", { name: "Leaderboard" }).waitFor({ timeout: 20000 });
  await p2.waitForTimeout(800);
  await p2.screenshot({ path: `${OUT}/${PROJECTOR_FILE}`, fullPage: false });
  await browser.close();
  log(`done → ${OUT}/${PROJECTOR_FILE}`);
  process.exit(0);
}

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await phone.newPage();

log(`open ${URL}`);
await page.goto(URL, { waitUntil: "networkidle" });
await page.getByLabel("Your name").fill("Aisha");
await page.getByRole("button", { name: /Join/ }).click();
await page.getByRole("heading", { name: /Teams/ }).waitFor({ timeout: 20000 });
log("joined the room");

// Join a team with space.
const card = page.locator("div", { hasText: TEAM }).filter({ has: page.getByRole("button", { name: /^Join$/ }) }).last();
await card.getByRole("button", { name: /^Join$/ }).click();
await page.getByText(new RegExp(`Team ${TEAM}`)).waitFor({ timeout: 15000 });
log(`joined team ${TEAM}`);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/lobby.png`, fullPage: false });

// Teach tab.
await page.getByRole("tab", { name: /Teach it/ }).click();
const canvas = page.locator('canvas[aria-label="Drawing canvas"]');
await canvas.waitFor();

async function stroke(points) {
  const box = await canvas.boundingBox();
  const P = points.map(([u, v]) => [box.x + u * box.width, box.y + v * box.height]);
  await page.mouse.move(P[0][0], P[0][1]);
  await page.mouse.down();
  for (const [x, y] of P.slice(1)) await page.mouse.move(x, y, { steps: 3 });
  await page.mouse.up();
}
const ellipse = (cx, cy, rx, ry, tilt = 0, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
  const t = (i / n) * Math.PI * 2, x = rx * Math.cos(t), y = ry * Math.sin(t);
  return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)];
});
async function drawMango(k) {
  await stroke(ellipse(0.5 + (k % 3) * 0.02, 0.52, 0.30 + k * 0.01, 0.23, -0.5 + k * 0.1));
  await stroke([[0.62, 0.30], [0.66, 0.20]]); // stem
}
async function drawBall(k) {
  await stroke(ellipse(0.5, 0.5, 0.27 + k * 0.01, 0.27 + k * 0.01));
  await stroke([[0.5, 0.24], [0.5, 0.76]]); // seam
  for (const y of [0.34, 0.44, 0.54, 0.64]) await stroke([[0.46, y], [0.54, y + 0.02]]);
}
const add = () => page.getByRole("button", { name: "Add this drawing" }).click();
const pick = (label) => page.getByRole("button", { name: new RegExp(`^${label}`) }).first().click();

log("drawing 5 mangoes and 5 cricket balls");
await pick("Mango");
for (let k = 0; k < 5; k++) { await drawMango(k); await add(); }
await pick("Cricket ball");
for (let k = 0; k < 5; k++) { await drawBall(k); await add(); }
await pick("Mango");
await drawMango(1); // leave one on the canvas for the shot
await page.waitForTimeout(400);
const drawCard = page.locator("main > section", { hasText: "Add this drawing" });
const setCard = page.locator("main > section", { hasText: "Your training set" });
await page.screenshot({ path: `${OUT}/teach-full.png`, fullPage: true });
await drawCard.screenshot({ path: `${OUT}/teach-drawing.png` });

log("training");
await page.getByRole("button", { name: /Train it/ }).click();
await page.getByText(/correct on your own drawings/).waitFor({ timeout: 30000 });
await page.getByRole("button", { name: /What is it/ }).click();
await page.getByText(/sure$/).waitFor({ timeout: 10000 });
await page.waitForTimeout(400);
await drawCard.screenshot({ path: `${OUT}/teach-guess.png` });
await setCard.screenshot({ path: `${OUT}/teach-trained.png` });

log("tournament (phone)");
await page.getByRole("tab", { name: /Tournament/ }).click();
await page.getByRole("table", { name: "Leaderboard" }).waitFor({ timeout: 20000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/tournament-phone.png`, fullPage: true });
await phone.close();

log("tournament (projector)");
const desk = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const p2 = await desk.newPage();
await p2.goto(URL, { waitUntil: "networkidle" });
await p2.getByLabel("Your name").fill("Projector");
await p2.getByRole("button", { name: /Join/ }).click();
await p2.getByRole("tab", { name: /Tournament/ }).click();
await p2.getByRole("table", { name: "Leaderboard" }).waitFor({ timeout: 20000 });
await p2.waitForTimeout(800);
await p2.screenshot({ path: `${OUT}/${PROJECTOR_FILE}`, fullPage: false });
await desk.close();
await browser.close();
log(`done → ${OUT}/`);
