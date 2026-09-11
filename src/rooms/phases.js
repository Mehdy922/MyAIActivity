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

// Offered alongside "Open bendy fence" at reveal: save scores, clear machines, back to teach as round+1.
export const ROUND_ACTION = "Next round";

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
