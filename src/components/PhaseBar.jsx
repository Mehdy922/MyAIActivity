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
