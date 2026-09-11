import { S } from "../theme.js";
import { PHASE_ACTIONS, ROUND_ACTION, nextPhase } from "../rooms/phases.js";

const NAMES = { lobby: "Lobby — teams forming", teach: "Teaching — teams draw and train", reveal: "Tournament revealed", fence: "Bendy fence open" };

export function PhaseBar({ phase, round = 1, onAdvance, onNextRound, busy = false }) {
  const next = nextPhase(phase);
  return (
    <div style={S.phaseBar}>
      <span style={S.phaseNow}>Round {round} · {NAMES[phase] || phase}</span>
      {phase === "reveal" && (
        <button className="nl-btn" style={{ ...S.phaseBtn, background: S.accent.background, boxShadow: S.accent.boxShadow }}
          disabled={busy} onClick={() => onNextRound?.()}>
          ↺ {ROUND_ACTION}
        </button>
      )}
      {next && (
        <button className="nl-btn" style={S.phaseBtn} disabled={busy} onClick={() => onAdvance(next)}>
          {PHASE_ACTIONS[phase]} →
        </button>
      )}
    </div>
  );
}
