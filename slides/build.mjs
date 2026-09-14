// Builds slides/Neural-Lab-Lesson.pptx — the 30–40 minute lesson that runs BEFORE the activity,
// plus an appendix used AFTER the tournament. Same palette as the app; pixel art from the same
// code the bot simulator draws with.
//
//   npm run slides          (expects screenshots in slides/img/ — see scripts/screenshots.mjs)

import pptxgen from "pptxgenjs";
import { existsSync } from "node:fs";
import { mulberry32 } from "../src/ml/net.js";
import { GRID } from "../src/ml/capture.js";
import { drawShape, STYLES } from "../scripts/lib/pixelart.mjs";

// ── theme (mirrors src/theme.js) ─────────────────────────────────────────
const C = {
  cream: "FFF7E8", paper: "FFFFFF", soft: "FFF1DC", ink: "2A2140", muted: "6F6785", line: "F0E4D0",
  mango: "FF8A3D", mangoDeep: "D9651F", sky: "3BA7F5", skyDeep: "2378BD", leaf: "2FA866", berry: "E85D9C", sun: "FFD23F", red: "E24B4B",
};
// Fonts that ship with Windows 10/11 and Office, so the deck renders identically on the school PC
// without installing anything. (The web app uses Fredoka/Nunito; these are the closest safe match.)
const DISP = "Segoe UI Black";
const SANS = "Calibri";
const W = 10, H = 5.625, M = 0.5;   // 16:9 layout in inches

const pptx = new pptxgen();
pptx.layout = "LAYOUT_16x9";
pptx.author = "Neural Lab";
pptx.title = "How does a machine learn?";

pptx.defineSlideMaster({
  title: "LAB",
  background: { color: C.cream },
  objects: [
    { rect: { x: 0, y: 0, w: W, h: 0.09, fill: { color: C.mango } } },
    { text: { text: "🧠 Neural Lab", options: { x: M, y: H - 0.42, w: 3, h: 0.3, fontFace: SANS, fontSize: 10, bold: true, color: C.muted } } },
  ],
  slideNumber: { x: W - M - 0.6, y: H - 0.42, w: 0.6, h: 0.3, fontFace: SANS, fontSize: 10, color: C.muted, align: "right" },
});

// ── helpers ──────────────────────────────────────────────────────────────
const slide = (notes) => { const s = pptx.addSlide({ masterName: "LAB" }); if (notes) s.addNotes(notes); return s; };
const title = (s, text, opts = {}) =>
  s.addText(text, { x: M, y: 0.32, w: W - 2 * M, h: 0.9, fontFace: DISP, fontSize: 34, bold: true, color: C.ink, valign: "middle", ...opts });
const sub = (s, text, y = 1.15, opts = {}) =>
  s.addText(text, { x: M, y, w: W - 2 * M, h: 0.5, fontFace: SANS, fontSize: 16, color: C.muted, valign: "top", ...opts });
const card = (s, x, y, w, h, fill = C.paper) => {
  s.addShape(pptx.ShapeType.roundRect, { x, y: y + 0.07, w, h, fill: { color: C.line }, line: { color: C.line, width: 0 }, rectRadius: 0.18 });
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, rectRadius: 0.18 });
};
const badge = (s, text, x, y, color = C.sun, textColor = C.ink, w = 1.6) =>
  s.addText(text, { x, y, w, h: 0.36, fontFace: SANS, fontSize: 11, bold: true, color: textColor, align: "center", valign: "middle",
    fill: { color }, line: { color, width: 0 }, shape: pptx.ShapeType.roundRect, rectRadius: 0.18 });
const body = (s, text, x, y, w, h, opts = {}) =>
  s.addText(text, { x, y, w, h, fontFace: SANS, fontSize: 15, color: C.ink, valign: "top", paraSpaceAfter: 6, ...opts });
const big = (s, text, x, y, w, h, color = C.ink, size = 44) =>
  s.addText(text, { x, y, w, h, fontFace: DISP, fontSize: size, bold: true, color, align: "center", valign: "middle" });
const bullets = (s, items, x, y, w, h, opts = {}) =>
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { code: "25CF" }, breakLine: i < items.length - 1 } })),
    { x, y, w, h, fontFace: SANS, fontSize: 15, color: C.ink, valign: "top", paraSpaceAfter: 8, ...opts });

// 16×16 pixel art: one small square per inked pixel.
function pixelArt(s, pix, x, y, size, color = C.ink, bg = C.paper) {
  const cell = size / GRID;
  s.addShape(pptx.ShapeType.roundRect, { x: x - 0.06, y: y - 0.06, w: size + 0.12, h: size + 0.12, fill: { color: bg }, line: { color: C.line, width: 1.5 }, rectRadius: 0.1 });
  for (let i = 0; i < pix.length; i++) {
    if (pix[i] <= 0) continue;
    const gx = i % GRID, gy = Math.floor(i / GRID);
    const c = pix[i] >= 1 ? color : C.muted;
    s.addShape(pptx.ShapeType.rect, { x: x + gx * cell, y: y + gy * cell, w: cell, h: cell, fill: { color: c }, line: { color: c, width: 0 } });
  }
}
const art = (kind, styleIdx, seed) => drawShape(kind, STYLES[styleIdx % STYLES.length], mulberry32(seed));
const img = (s, file, x, y, w, h) => {
  const path = `slides/img/${file}`;
  if (existsSync(path)) s.addImage({ path, x, y, w, h, rounding: false, sizing: { type: "contain", w, h } });
  else { card(s, x, y, w, h, C.soft); body(s, `screenshot: ${file}`, x + 0.2, y + h / 2 - 0.2, w - 0.4, 0.4, { color: C.muted, align: "center" }); }
};
const arrow = (s, x, y, w = 0.5) => s.addText("→", { x, y, w, h: 0.5, fontFace: DISP, fontSize: 28, color: C.muted, align: "center", valign: "middle" });

// ═════════════════════════════════════════════════════════════════════════
// 1 · Title
{
  const s = slide("Welcome. Today in one line: how does a machine learn anything? In 30 minutes you will know, and then you will build one yourself on your phone. Keep the energy up — the payoff is the activity.");
  badge(s, "GRADES 9–12 · 30–40 MIN", M, 0.5, C.sun, C.ink, 2.4);
  s.addText("How does a machine learn?", { x: M, y: 1.0, w: 6.2, h: 1.6, fontFace: DISP, fontSize: 48, bold: true, color: C.ink, valign: "middle" });
  s.addText("Teach a machine to see. Then find out what it really learned.", { x: M, y: 2.65, w: 6, h: 0.8, fontFace: SANS, fontSize: 18, color: C.muted });
  badge(s, "PART 1 · THE LESSON", M, 3.7, C.mango, C.paper, 2.2);
  badge(s, "PART 2 · THE ACTIVITY", M + 2.35, 3.7, C.sky, C.paper, 2.3);
  pixelArt(s, art(0, 0, 11), 7.0, 1.1, 1.3, C.mangoDeep);
  pixelArt(s, art(1, 1, 12), 8.4, 1.1, 1.3, C.skyDeep);
  pixelArt(s, art(1, 3, 13), 7.0, 2.6, 1.3, C.skyDeep);
  pixelArt(s, art(0, 5, 14), 8.4, 2.6, 1.3, C.mangoDeep);
}

// 2 · Hook
{
  const s = slide("3 min. Ask: which one is the mango? Wait. All four are mangoes, drawn by four different people. Ask: how did you know so fast? Nobody gave you a rule. Collect two or three answers, then move on — the point lands on the next slide.");
  title(s, "Which one is the mango?");
  const ys = 1.45, size = 1.55, gap = 0.55;
  [0, 1, 2, 5].forEach((st, i) => {
    const x = M + i * (size + gap) + 0.55;
    card(s, x - 0.15, ys - 0.15, size + 0.3, size + 0.75);
    pixelArt(s, art(0, st, 20 + i), x, ys, size, C.mangoDeep);
    body(s, ["Filled, tilted", "Outline only", "Small, wobbly", "Big, upright"][i], x - 0.15, ys + size + 0.08, size + 0.3, 0.4, { align: "center", color: C.muted, fontSize: 12 });
  });
  s.addText("All of them. You knew instantly. How?", { x: M, y: 4.2, w: W - 2 * M, h: 0.6, fontFace: DISP, fontSize: 24, bold: true, color: C.ink, align: "center" });
}

// 3 · Learning from examples
{
  const s = slide("3 min. Nobody handed you a rulebook for 'mango'. You saw hundreds: in the bazaar, on trees, cut on a plate, badly drawn by a cousin. Each one nudged your idea of 'mango' a little. That is learning from examples. Hold this phrase; it is the whole lesson.");
  title(s, "Nobody handed you a rulebook.");
  card(s, M, 1.4, 5.4, 2.9);
  body(s, "You saw hundreds of mangoes.\nIn the bazaar. On the tree. Cut on a plate. Badly drawn by a cousin.\n\nEvery single one nudged your idea of “mango” a tiny bit.", M + 0.3, 1.6, 4.8, 2.5, { fontSize: 17 });
  card(s, 6.3, 1.4, 3.2, 2.9, C.soft);
  big(s, "Learning\nfrom\nexamples", 6.3, 1.5, 3.2, 2.7, C.mangoDeep, 36);
  sub(s, "Machines can do this too. That is what “AI” mostly means today.", 4.55, { align: "center" });
}

// 4 · Rules break
{
  const s = slide("4 min, interactive. Ask students to shout rules for 'is this a mango?'. Write two or three on the board. Then ask for something that breaks each rule. Green mangoes exist. Oranges are round and orange. Drawings have no smell. Every rule breaks somewhere; examples bend instead. This is why nobody programs face unlock with rules.");
  title(s, "Try writing the rules.");
  card(s, M, 1.35, 4.3, 3.1);
  body(s, "IF it is orange…", M + 0.3, 1.55, 3.8, 0.45, { fontSize: 18, bold: true, color: C.skyDeep });
  body(s, "IF it is round-ish…", M + 0.3, 2.15, 3.8, 0.45, { fontSize: 18, bold: true, color: C.skyDeep });
  body(s, "IF it has a stem…", M + 0.3, 2.75, 3.8, 0.45, { fontSize: 18, bold: true, color: C.skyDeep });
  body(s, "IF it smells sweet…", M + 0.3, 3.35, 3.8, 0.45, { fontSize: 18, bold: true, color: C.skyDeep });
  card(s, 5.2, 1.35, 4.3, 3.1, C.soft);
  bullets(s, ["A raw mango is green.", "An orange is round and orange.", "Half the mangoes in the market have no stem.", "A drawing smells of nothing."], 5.45, 1.55, 3.9, 2.8, { fontSize: 16 });
  badge(s, "RULES BREAK. EXAMPLES BEND.", 3.2, 4.7, C.berry, C.paper, 3.6);
}

// 5 · How a computer sees
{
  const s = slide("4 min. This is the only technical slide that matters. A drawing is squashed to a 16 by 16 grid: 256 little squares. Each square becomes a number from 0 (white) to 1 (black). The machine never sees a mango. It sees 256 numbers. Ask: could you tell a mango from a cricket ball if someone read you 256 numbers? No. Yet the machine will.");
  title(s, "How a computer sees your drawing.");
  const pix = art(0, 0, 31);
  pixelArt(s, pix, M + 0.2, 1.4, 2.9, C.ink);
  arrow(s, 3.75, 2.55, 0.6);
  card(s, 4.5, 1.4, 5.0, 3.15);
  const row = (r) => Array.from({ length: GRID }, (_, x) => pix[r * GRID + x]).map((v) => (v >= 1 ? "1" : v > 0 ? ".6" : "0")).join("  ");
  s.addText([5, 6, 7, 8, 9, 10].map((r, i) => ({ text: row(r), options: { breakLine: i < 5 } })),
    { x: 4.7, y: 1.5, w: 4.6, h: 1.45, fontFace: "Consolas", fontSize: 10.5, color: C.ink, valign: "top" });
  body(s, "…and 10 more rows like these.", 4.7, 2.95, 4.6, 0.35, { color: C.muted, fontSize: 11.5 });
  body(s, "16 × 16 = 256 numbers, each between 0 (white) and 1 (black). That is all the machine ever gets. No colour, no smell, no “mango”.", 4.7, 3.3, 4.6, 1.15, { fontSize: 13 });
  sub(s, "Your drawing is also moved to the middle and scaled, so drawing in a corner doesn't matter.", 4.72, { fontSize: 12.5 });
}

// 6 · Inside the machine
{
  const s = slide("5 min. Cartoon version of a neural network, and it is honestly what runs on their phones later. Left: 256 inputs, one per pixel. Middle: 10 neurons. Call them detectives: each one learns to look for some pattern (a curve here, a straight line there). Right: one output, mango or cricket ball. Every line between them has a knob, a weight. There are about 2,600 knobs. At the start every knob is set randomly, so the machine guesses like a coin toss.");
  title(s, "Inside the machine.");
  const x0 = 1.1, x1 = 4.6, x2 = 8.2, top = 1.5, bottom = 4.5;
  for (let i = 0; i < 12; i++) {
    const y = top + (i / 11) * (bottom - top);
    s.addShape(pptx.ShapeType.ellipse, { x: x0 - 0.1, y: y - 0.1, w: 0.2, h: 0.2, fill: { color: i === 5 || i === 6 ? C.muted : C.ink }, line: { color: C.ink, width: 0 } });
  }
  for (let j = 0; j < 5; j++) {
    const y = top + 0.3 + (j / 4) * (bottom - top - 0.6);
    s.addShape(pptx.ShapeType.ellipse, { x: x1 - 0.25, y: y - 0.25, w: 0.5, h: 0.5, fill: { color: C.sky }, line: { color: C.skyDeep, width: 1.5 } });
    for (let i = 0; i < 12; i += 1) {
      const yi = top + (i / 11) * (bottom - top);
      s.addShape(pptx.ShapeType.line, { x: Math.min(x0, x1), y: Math.min(yi, y), w: Math.abs(x1 - x0) - 0.25, h: Math.abs(y - yi) || 0.001, line: { color: C.line, width: 0.75 }, flipV: y < yi });
    }
    s.addShape(pptx.ShapeType.line, { x: x1 + 0.25, y: Math.min(y, 3.0), w: x2 - x1 - 0.65, h: Math.abs(3.0 - y) || 0.001, line: { color: C.line, width: 1 }, flipV: y > 3.0 });
  }
  s.addShape(pptx.ShapeType.ellipse, { x: x2 - 0.4, y: 3.0 - 0.4, w: 0.8, h: 0.8, fill: { color: C.mango }, line: { color: C.mangoDeep, width: 2 } });
  body(s, "256 inputs\none per pixel", x0 - 0.7, bottom + 0.15, 1.6, 0.6, { align: "center", fontSize: 12, bold: true });
  body(s, "10 “detectives”\neach learns one pattern", x1 - 1.1, bottom + 0.15, 2.2, 0.6, { align: "center", fontSize: 12, bold: true });
  body(s, "1 answer\nmango or cricket ball", x2 - 1.1, bottom + 0.15, 2.2, 0.6, { align: "center", fontSize: 12, bold: true });
  body(s, "…", x0 - 0.1, 2.85, 0.4, 0.3, { fontSize: 14, color: C.muted, align: "center" });
  card(s, 5.6, 1.3, 3.9, 1.2, C.soft);
  body(s, "Every line has a knob (a “weight”). About 2,600 knobs in total.\nAt the start they are all random. The machine guesses like a coin toss.", 5.8, 1.4, 3.6, 1.05, { fontSize: 13 });
}

// 7 · Training
{
  const s = slide("4 min. Training is a loop. Show it one drawing. It guesses. Compare the guess with the label you gave. Nudge every knob a tiny bit in the direction that would have made the guess less wrong. Next drawing. Ten drawings, 240 laps, about one second on a phone. Don't use the word gradient. If someone asks how it knows which way to nudge: it tries the tiniest change and keeps the direction that helped.");
  title(s, "Training = guess, check, nudge.");
  const steps = [["👀", "GUESS", "Show it one drawing. It says: “72% cricket ball.”"], ["✅", "CHECK", "You labelled it “mango”. So the guess was wrong by a lot."], ["🎛️", "NUDGE", "Turn every knob a tiny bit in the direction that would have made it less wrong."]];
  steps.forEach(([e, h, t], i) => {
    const x = M + i * 3.15;
    card(s, x, 1.45, 2.7, 2.5);
    s.addText(e, { x, y: 1.55, w: 2.7, h: 0.7, fontSize: 32, align: "center" });
    s.addText(h, { x, y: 2.2, w: 2.7, h: 0.4, fontFace: DISP, fontSize: 20, bold: true, color: C.skyDeep, align: "center" });
    body(s, t, x + 0.2, 2.65, 2.3, 1.2, { fontSize: 13, align: "center" });
    if (i < 2) arrow(s, x + 2.72, 2.45, 0.4);
  });
  s.addText("↺  repeat with the next drawing", { x: M, y: 4.05, w: 9, h: 0.4, fontFace: SANS, fontSize: 14, color: C.muted, align: "center" });
  badge(s, "240 LAPS OVER 10 DRAWINGS · ABOUT 1 SECOND ON A PHONE", 2.2, 4.55, C.leaf, C.paper, 5.6);
}

// 8 · Confidence
{
  const s = slide("2 min. The output is never yes or no. It is a number between 0 and 1, which we show as a percentage. 0.78 means 'leaning cricket ball'. 0.51 means 'no idea'. Keep this in mind for later: a confident machine can still be confidently wrong.");
  title(s, "The answer is a confidence.");
  card(s, 2.4, 1.5, 5.2, 1.4);
  s.addShape(pptx.ShapeType.roundRect, { x: 2.55, y: 1.65, w: 4.9, h: 1.1, fill: { color: C.soft }, line: { color: C.sky, width: 3 }, rectRadius: 0.15 });
  s.addText("Cricket ball", { x: 2.8, y: 1.75, w: 3, h: 0.9, fontFace: DISP, fontSize: 26, bold: true, color: C.skyDeep, valign: "middle" });
  s.addText("78% sure", { x: 5.6, y: 1.75, w: 1.8, h: 0.9, fontFace: SANS, fontSize: 16, bold: true, color: C.muted, valign: "middle", align: "right" });
  s.addShape(pptx.ShapeType.roundRect, { x: 1.5, y: 3.4, w: 7, h: 0.35, fill: { color: C.line }, line: { color: C.line, width: 0 }, rectRadius: 0.17 });
  s.addShape(pptx.ShapeType.roundRect, { x: 1.5, y: 3.4, w: 7 * 0.78, h: 0.35, fill: { color: C.sky }, line: { color: C.sky, width: 0 }, rectRadius: 0.17 });
  body(s, "0 · definitely mango", 1.5, 3.85, 3, 0.4, { fontSize: 12, color: C.muted });
  body(s, "1 · definitely cricket ball", 5.5, 3.85, 3, 0.4, { fontSize: 12, color: C.muted, align: "right" });
  sub(s, "Never certain. A machine can be very sure and still wrong. Remember that.", 4.5, { align: "center" });
}

// 9 · What it looks like (screenshots)
{
  const s = slide("5 min. This is the app you will use in a few minutes. Left: a team drawing mangoes and cricket balls; each drawing added becomes one example in the training set at the bottom. Right: after Train, the score on their own drawings and a test with a fresh drawing. Walk through the buttons: Add this drawing, Train it, What is it?, Send my machine to the class.");
  title(s, "What it looks like.");
  img(s, "teach-drawing.png", M, 1.3, 2.2, 3.5);
  img(s, "teach-guess.png", 2.85, 1.3, 2.2, 3.5);
  img(s, "teach-trained.png", 5.2, 1.3, 2.2, 3.5);
  card(s, 7.6, 1.3, 1.9, 3.5, C.soft);
  bullets(s, ["Draw big, in the middle.", "Add this drawing.", "5 of each. Train it.", "Fresh one. What is it?", "Send to the class."], 7.7, 1.45, 1.75, 3.3, { fontSize: 11.5 });
  body(s, "1 · draw and add", M, 4.85, 2.2, 0.3, { fontSize: 11, color: C.muted, align: "center" });
  body(s, "2 · test it yourself", 2.85, 4.85, 2.2, 0.3, { fontSize: 11, color: C.muted, align: "center" });
  body(s, "3 · your training set + score", 5.2, 4.85, 2.2, 0.3, { fontSize: 11, color: C.muted, align: "center" });
}

// 10 · In your pocket
{
  const s = slide("3 min. Every one of these learned from examples, not rules. Face unlock saw thousands of photos of your face. The spam filter saw millions of emails people marked as spam. Autocorrect saw what people typed and fixed. Recommendations watch what you skip. Fraud alerts learned what normal spending looks like for you. Ask: which of these has ever been wrong for you? All of them have.");
  title(s, "It's already in your pocket.");
  const items = [["🔓", "Face unlock", "thousands of photos of you"], ["📧", "Spam filter", "millions of emails people flagged"], ["⌨️", "Autocorrect", "what everyone typed and fixed"], ["▶️", "Video picks", "what you watched and skipped"], ["🏦", "Fraud alerts", "what your normal spending looks like"]];
  items.forEach(([e, h, t], i) => {
    const x = M + i * 1.82;
    card(s, x, 1.45, 1.65, 2.6);
    s.addText(e, { x, y: 1.55, w: 1.65, h: 0.7, fontSize: 30, align: "center" });
    s.addText(h, { x, y: 2.25, w: 1.65, h: 0.45, fontFace: DISP, fontSize: 14, bold: true, color: C.ink, align: "center" });
    body(s, t, x + 0.1, 2.7, 1.45, 1.2, { fontSize: 11.5, color: C.muted, align: "center" });
  });
  badge(s, "ALL LEARNED FROM EXAMPLES. NONE FROM RULES.", 2.6, 4.4, C.sun, C.ink, 4.8);
}

// 11 · Hands up
{
  const s = slide("2 min, quick poll. Read each one; hands up if it learned from examples. Calculator: no, pure rules. Face unlock: yes. Alarm clock: no. Spam filter: yes. Maps arrival time: yes, it learned from millions of past trips. The point: 'computer' does not mean 'learned'. Most software is still rules. Learning is the new part.");
  title(s, "Hands up: which of these learned?");
  const items = [["🧮", "Calculator"], ["🔓", "Face unlock"], ["⏰", "Alarm clock"], ["📧", "Spam filter"], ["🗺️", "Maps arrival time"]];
  items.forEach(([e, h], i) => {
    const x = M + i * 1.82;
    card(s, x, 1.6, 1.65, 1.9);
    s.addText(e, { x, y: 1.7, w: 1.65, h: 0.8, fontSize: 34, align: "center" });
    s.addText(h, { x, y: 2.55, w: 1.65, h: 0.8, fontFace: DISP, fontSize: 14, bold: true, color: C.ink, align: "center", valign: "top" });
  });
  card(s, M, 3.85, 9, 0.9, C.soft);
  body(s, "For you: calculator no · face unlock yes · alarm clock no · spam filter yes · maps yes.\n“Computer” doesn't mean “learned”. Most software is still rules. Learning is the new part.", M + 0.25, 3.92, 8.5, 0.8, { fontSize: 12.5 });
}

// 12 · Teaser
{
  const s = slide("1 min. Build suspense and say nothing more. Whatever you do, do not explain what is coming. The activity only works if the drop surprises them.");
  s.addText("Your machine is going to score 100%.", { x: M, y: 1.4, w: W - 2 * M, h: 1.2, fontFace: DISP, fontSize: 40, bold: true, color: C.ink, align: "center", valign: "middle" });
  s.addText("Then something is going to happen.", { x: M, y: 2.7, w: W - 2 * M, h: 0.9, fontFace: DISP, fontSize: 30, bold: true, color: C.mangoDeep, align: "center", valign: "middle" });
  sub(s, "No spoilers.", 3.8, { align: "center", fontSize: 16 });
}

// 13 · The activity
{
  const s = slide("3 min. Briefing. Teams of up to four; every member draws at least one of each. Join with the room code or QR on the projector. Draw five mangoes and five cricket balls, big and in the middle. Train. Test with a fresh drawing. Only send when the whole team agrees the machine is good. Twenty minutes for all of it.");
  title(s, "The activity.");
  const steps = [["👥", "Teams", "Up to 4. Everyone draws at least one of each."], ["📱", "Join", "Room code or QR from the projector. Type your name."], ["✏️", "Draw", "5 mangoes + 5 cricket balls. Big, in the middle."], ["🧠", "Train & test", "Press Train. Draw a fresh one. Ask it."], ["🚀", "Send", "When the whole team agrees: Send my machine."]];
  steps.forEach(([e, h, t], i) => {
    const x = M + i * 1.82;
    card(s, x, 1.45, 1.65, 2.7);
    badge(s, String(i + 1), x + 0.55, 1.3, C.mango, C.paper, 0.55);
    s.addText(e, { x, y: 1.75, w: 1.65, h: 0.7, fontSize: 30, align: "center" });
    s.addText(h, { x, y: 2.45, w: 1.65, h: 0.4, fontFace: DISP, fontSize: 15, bold: true, color: C.ink, align: "center" });
    body(s, t, x + 0.1, 2.85, 1.45, 1.3, { fontSize: 11.5, color: C.muted, align: "center" });
  });
  badge(s, "20 MINUTES · DON'T PEEK AT THE PROJECTOR UNTIL YOU'RE TOLD", 1.9, 4.5, C.berry, C.paper, 6.2);
}

// 14 · Join
{
  const s = slide("Switch the projector to the app now: Teacher → your room → Lobby shows the code and QR live. Leave this slide up only if the projector can't switch. Press Start teaching once teams are formed.");
  title(s, "Join now.");
  card(s, 2.0, 1.5, 6.0, 2.6);
  s.addText("mehdy922.github.io/neural-lab", { x: 2.0, y: 1.7, w: 6.0, h: 0.6, fontFace: SANS, fontSize: 20, bold: true, color: C.skyDeep, align: "center" });
  s.addText("ROOM CODE", { x: 2.0, y: 2.35, w: 6.0, h: 0.4, fontFace: SANS, fontSize: 12, bold: true, color: C.muted, align: "center" });
  s.addText("— on the projector —", { x: 2.0, y: 2.75, w: 6.0, h: 1.0, fontFace: DISP, fontSize: 36, bold: true, color: C.ink, align: "center", valign: "middle" });
  sub(s, "Student → type the code → your name → make or join a team.", 4.35, { align: "center" });
}

// ── Appendix: after the tournament ───────────────────────────────────────
{
  const s = slide("Do not show anything past this point until the tournament has been revealed and the room has argued about it. The gap between 'own' and 'strangers' is the lesson; it only lands if they were surprised.");
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0.09, w: W, h: H - 0.09, fill: { color: C.ink }, line: { color: C.ink, width: 0 } });
  s.addText("APPENDIX · USE AFTER THE TOURNAMENT", { x: M, y: 1.6, w: W - 2 * M, h: 0.5, fontFace: SANS, fontSize: 14, bold: true, color: C.sun, align: "center" });
  s.addText("The debrief.", { x: M, y: 2.1, w: W - 2 * M, h: 1.2, fontFace: DISP, fontSize: 48, bold: true, color: C.paper, align: "center", valign: "middle" });
  s.addText("Only after the numbers have fallen and the room has argued about why.", { x: M, y: 3.3, w: W - 2 * M, h: 0.6, fontFace: SANS, fontSize: 16, color: C.line, align: "center" });
}

// A1 · What just happened
{
  const s = slide("Let them tell you first. They will say 'it learned our handwriting', 'it only knows how we draw'. Now, and only now, give the words. Overfitting: it memorised the quirks of the few examples it saw. Generalisation: working on examples it never saw, which is the only thing that actually matters. Point at the projector screenshot: same machines, different pencils.");
  title(s, "What just happened?");
  img(s, "tournament-projector-r1.png", M, 1.35, 5.2, 3.1);
  card(s, 6.0, 1.35, 3.5, 1.45, C.soft);
  s.addText("Overfitting", { x: 6.2, y: 1.42, w: 3.1, h: 0.45, fontFace: DISP, fontSize: 20, bold: true, color: C.red });
  body(s, "It memorised the quirks of your ten drawings, not the idea of a mango.", 6.2, 1.85, 3.1, 0.9, { fontSize: 13 });
  card(s, 6.0, 2.95, 3.5, 1.5, C.soft);
  s.addText("Generalisation", { x: 6.2, y: 3.02, w: 3.1, h: 0.45, fontFace: DISP, fontSize: 20, bold: true, color: C.leaf });
  body(s, "Working on examples it has never seen. The only score that matters.", 6.2, 3.45, 3.1, 0.9, { fontSize: 13 });
  badge(s, "SAME MACHINES. DIFFERENT PENCILS.", 3.0, 4.7, C.sun, C.ink, 4.0);
}

// A2 · Not a classroom problem
{
  const s = slide("Now the real world. The mango app from the closing screen: trained on one farm's photos, rejects your uncle's mangoes in Multan. Three documented cases, keep them factual: a 2018 MIT study found commercial face-recognition products made far more errors on darker-skinned women than on lighter-skinned men; voice assistants have been shown to make more mistakes with some accents; medical image models trained mostly at one hospital did worse at other hospitals. Ask the question at the bottom and let it sit.");
  title(s, "This is not a classroom problem.");
  card(s, M, 1.35, 4.2, 3.2, C.soft);
  s.addText("🥭 The mango app", { x: M + 0.2, y: 1.45, w: 3.8, h: 0.45, fontFace: DISP, fontSize: 18, bold: true, color: C.mangoDeep });
  body(s, "Built from photos of mangoes on one farm in Sindh. Your uncle grows mangoes in Multan. The app says every one of his is bad.\n\nWhose mistake was that?", M + 0.2, 1.9, 3.8, 2.5, { fontSize: 14 });
  const cases = [["🙂", "Face recognition", "A 2018 MIT study: far more errors on darker-skinned women than lighter-skinned men."], ["🎙️", "Voice assistants", "Shown to make more mistakes with some accents than others."], ["🏥", "Medical imaging", "Models trained mostly at one hospital did worse at other hospitals."]];
  cases.forEach(([e, h, t], i) => {
    const y = 1.35 + i * 1.08;
    card(s, 5.0, y, 4.5, 0.95);
    s.addText(e, { x: 5.1, y: y + 0.1, w: 0.6, h: 0.75, fontSize: 22, align: "center", valign: "middle" });
    s.addText(h, { x: 5.7, y: y + 0.08, w: 3.7, h: 0.35, fontFace: DISP, fontSize: 14, bold: true, color: C.ink });
    body(s, t, 5.7, y + 0.4, 3.7, 0.55, { fontSize: 11, color: C.muted });
  });
  badge(s, "WHO WAS MISSING FROM THE EXAMPLES?", 2.6, 4.75, C.berry, C.paper, 4.8);
}

// A3 · How you fix it
{
  const s = slide("If you ran Round 2, point to the deltas: teams that added drawings in other styles climbed. That is the fix, and it is not a better machine, it is a wider view. Three habits: more variety in the examples; always test on strangers before trusting; ask who is missing from the data before you build.");
  title(s, "How would you fix it?");
  const fixes = [["🎨", "More variety", "Mangoes drawn every way you can think of, not just yours."], ["🧪", "Test on strangers", "Never trust a score on the examples it learned from."], ["🔍", "Ask who's missing", "Before you build: whose examples are not in here?"]];
  fixes.forEach(([e, h, t], i) => {
    const y = 1.35 + i * 1.08;
    card(s, M, y, 4.1, 0.96);
    s.addText(e, { x: M + 0.1, y: y + 0.13, w: 0.7, h: 0.7, fontSize: 26, align: "center", valign: "middle" });
    s.addText(h, { x: M + 0.85, y: y + 0.08, w: 3.1, h: 0.38, fontFace: DISP, fontSize: 16, bold: true, color: C.skyDeep });
    body(s, t, M + 0.85, y + 0.44, 3.15, 0.5, { fontSize: 11.5, color: C.muted });
  });
  img(s, "tournament-projector.png", 4.9, 1.35, 4.6, 2.9);
  body(s, "Round 2 in the app: every team that added other teams' styles climbed. Same machine, wider view.", 4.9, 4.3, 4.6, 0.6, { fontSize: 12.5, color: C.muted });
}

// A4 · Exit question
{
  const s = slide("Exit ticket or homework. One line each. Collect them; the answers make a good opener next lesson.");
  s.addText("Exit question", { x: M, y: 0.6, w: W - 2 * M, h: 0.5, fontFace: SANS, fontSize: 14, bold: true, color: C.mangoDeep, align: "center" });
  card(s, 1.2, 1.3, 7.6, 2.6);
  s.addText("Name one app that learns from you.\nWhose examples did it learn from?\nWho is missing?", { x: 1.4, y: 1.4, w: 7.2, h: 2.4, fontFace: DISP, fontSize: 28, bold: true, color: C.ink, align: "center", valign: "middle" });
  sub(s, "One line each. Bring it next lesson.", 4.15, { align: "center" });
  pixelArt(s, art(0, 2, 41), 0.35, 4.2, 0.9, C.mangoDeep);
  pixelArt(s, art(1, 4, 42), 8.75, 4.2, 0.9, C.skyDeep);
}

const out = "slides/Neural-Lab-Lesson.pptx";
await pptx.writeFile({ fileName: out });
console.log(`wrote ${out} · ${pptx.slides.length} slides`);
