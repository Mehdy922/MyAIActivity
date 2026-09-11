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
