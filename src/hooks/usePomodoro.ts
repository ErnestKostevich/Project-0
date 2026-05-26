import { useCallback, useEffect, useReducer, useRef } from "react";

/**
 * 25/5 Pomodoro state machine.
 * Triggers `onPhaseChange` whenever the phase transitions — App.tsx hooks this
 * up so the AI character can react ("good luck!" / "great job, take a break").
 */

export type PomodoroPhase = "idle" | "working" | "break";

interface State {
  phase: PomodoroPhase;
  remaining: number; // seconds
  cyclesDone: number;
}

type Action =
  | { type: "start" }
  | { type: "stop" }
  | { type: "tick" }
  | { type: "skip" };

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const initialState: State = { phase: "idle", remaining: WORK_SECONDS, cyclesDone: 0 };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "start":
      return { phase: "working", remaining: WORK_SECONDS, cyclesDone: s.cyclesDone };
    case "stop":
      return { phase: "idle", remaining: WORK_SECONDS, cyclesDone: s.cyclesDone };
    case "skip":
      return s.phase === "working"
        ? { phase: "break", remaining: BREAK_SECONDS, cyclesDone: s.cyclesDone + 1 }
        : { phase: "working", remaining: WORK_SECONDS, cyclesDone: s.cyclesDone };
    case "tick":
      if (s.phase === "idle") return s;
      if (s.remaining <= 1) {
        return s.phase === "working"
          ? { phase: "break", remaining: BREAK_SECONDS, cyclesDone: s.cyclesDone + 1 }
          : { phase: "working", remaining: WORK_SECONDS, cyclesDone: s.cyclesDone };
      }
      return { ...s, remaining: s.remaining - 1 };
  }
}

export function usePomodoro(onPhaseChange?: (phase: PomodoroPhase, cyclesDone: number) => void) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const prevPhase = useRef<PomodoroPhase>(state.phase);

  // Fire onPhaseChange on transitions only (after first mount).
  useEffect(() => {
    if (prevPhase.current !== state.phase) {
      onPhaseChange?.(state.phase, state.cyclesDone);
      prevPhase.current = state.phase;
    }
  }, [state.phase, state.cyclesDone, onPhaseChange]);

  // 1-second tick while running.
  useEffect(() => {
    if (state.phase === "idle") return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(id);
  }, [state.phase]);

  return {
    phase: state.phase,
    remaining: state.remaining,
    cyclesDone: state.cyclesDone,
    start: useCallback(() => dispatch({ type: "start" }), []),
    stop: useCallback(() => dispatch({ type: "stop" }), []),
    skip: useCallback(() => dispatch({ type: "skip" }), []),
  };
}

export function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
