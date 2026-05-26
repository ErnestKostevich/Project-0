import type { PomodoroPhase } from "../hooks/usePomodoro";
import { formatMMSS } from "../hooks/usePomodoro";
import { IconSkip, IconStop } from "./icons/Icons";

interface Props {
  phase: PomodoroPhase;
  remaining: number;
  cyclesDone: number;
  onStart: () => void;
  onStop: () => void;
  onSkip: () => void;
}

export function PomodoroBar({ phase, remaining, cyclesDone, onStop, onSkip }: Props) {
  if (phase === "idle") return null;

  const phaseLabel = phase === "working" ? "Focus" : "Break";
  const total = phase === "working" ? 25 * 60 : 5 * 60;
  const pct = ((total - remaining) / total) * 100;
  const cycleNum = cyclesDone + (phase === "working" ? 1 : 0);

  return (
    <div className={`pomo-bar ${phase}`}>
      <div className="pomo-progress" style={{ width: `${pct}%` }} />
      <div className="pomo-content">
        <span className="pomo-label">
          {phaseLabel} <span className="pomo-cycle">· #{cycleNum}</span>
        </span>
        <span className="pomo-time">{formatMMSS(remaining)}</span>
        <button className="pomo-btn" onClick={onSkip} title="Skip" aria-label="Skip">
          <IconSkip width={11} height={11} />
        </button>
        <button className="pomo-btn" onClick={onStop} title="Stop" aria-label="Stop">
          <IconStop width={11} height={11} />
        </button>
      </div>
    </div>
  );
}
