import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../personality";

describe("buildSystemPrompt", () => {
  it("defaults to Lumi when no characterName provided", () => {
    const p = buildSystemPrompt({});
    expect(p).toMatch(/You are Lumi/);
  });

  it("uses a custom characterName when provided", () => {
    const p = buildSystemPrompt({ characterName: "Mio" });
    expect(p).toMatch(/You are Mio/);
    expect(p).not.toMatch(/You are Lumi/);
  });

  it("contains hard SFW + safety guardrails", () => {
    const p = buildSystemPrompt({});
    expect(p).toMatch(/SFW/);
    expect(p).toMatch(/NEVER BREAK/);
    expect(p).toMatch(/Never engage with romantic/i);
    expect(p).toMatch(/Never give medical, legal, or financial advice/);
    expect(p).toMatch(/professional/);
  });

  it("requests brief replies (desktop sidekick UX)", () => {
    const p = buildSystemPrompt({});
    expect(p).toMatch(/Brief responses/i);
  });

  it("injects user name when present", () => {
    const p = buildSystemPrompt({ userName: "Ernest" });
    expect(p).toMatch(/User's name: Ernest/);
  });

  it("falls back to asking for name when none provided", () => {
    const p = buildSystemPrompt({});
    expect(p).toMatch(/don't know the user's name yet/);
  });

  it("injects active Pomodoro context (working phase)", () => {
    const p = buildSystemPrompt({ pomodoroPhase: "working", pomodoroRemaining: 12 * 60 });
    expect(p).toMatch(/Pomodoro FOCUS session/);
    expect(p).toMatch(/12 min remaining/);
  });

  it("injects break Pomodoro context", () => {
    const p = buildSystemPrompt({ pomodoroPhase: "break", pomodoroRemaining: 3 * 60 });
    expect(p).toMatch(/Pomodoro BREAK/);
    expect(p).toMatch(/3 min remaining/);
  });

  it("does not mention Pomodoro when phase is idle", () => {
    const p = buildSystemPrompt({ pomodoroPhase: "idle" });
    expect(p).not.toMatch(/Pomodoro FOCUS/);
    expect(p).not.toMatch(/Pomodoro BREAK/);
  });

  it("injects the long-term memory block when present", () => {
    const memory = "- (project) Is building a Tauri app called Lumi\n- (deadline) Ships Friday";
    const p = buildSystemPrompt({ userName: "Ernest", memory });
    expect(p).toMatch(/WHAT YOU REMEMBER ABOUT Ernest/);
    expect(p).toMatch(/building a Tauri app called Lumi/);
    expect(p).toMatch(/Ships Friday/);
    // Instructed to reference naturally, not recite
    expect(p).toMatch(/reference naturally/i);
  });

  it("omits the memory block when memory is empty", () => {
    const p = buildSystemPrompt({ userName: "Ernest", memory: "" });
    expect(p).not.toMatch(/WHAT YOU REMEMBER/);
  });
});
