import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePomodoro, formatMMSS } from "../usePomodoro";

describe("usePomodoro", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in idle with full 25min remaining and 0 cycles", () => {
    const { result } = renderHook(() => usePomodoro());
    expect(result.current.phase).toBe("idle");
    expect(result.current.remaining).toBe(25 * 60);
    expect(result.current.cyclesDone).toBe(0);
  });

  it("transitions idle → working on start()", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    expect(result.current.phase).toBe("working");
    expect(result.current.remaining).toBe(25 * 60);
  });

  it("ticks down 1 second per real second while working", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.remaining).toBe(25 * 60 - 3);
  });

  it("transitions working → break and increments cyclesDone when timer hits zero", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });
    expect(result.current.phase).toBe("break");
    expect(result.current.remaining).toBe(5 * 60);
    expect(result.current.cyclesDone).toBe(1);
  });

  it("transitions break → working after the 5 minute break ends", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000); // finish work
    });
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000); // finish break
    });
    expect(result.current.phase).toBe("working");
    expect(result.current.cyclesDone).toBe(1);
    expect(result.current.remaining).toBe(25 * 60);
  });

  it("stop() resets to idle and preserves cyclesDone", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    }); // 1 cycle done
    act(() => result.current.stop());
    expect(result.current.phase).toBe("idle");
    expect(result.current.cyclesDone).toBe(1);
  });

  it("skip() advances working → break manually", () => {
    const { result } = renderHook(() => usePomodoro());
    act(() => result.current.start());
    act(() => result.current.skip());
    expect(result.current.phase).toBe("break");
    expect(result.current.cyclesDone).toBe(1);
  });

  it("fires onPhaseChange when the phase actually transitions", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => usePomodoro(cb));
    act(() => result.current.start());
    expect(cb).toHaveBeenCalledWith("working", 0);
    cb.mockClear();
    act(() => result.current.skip());
    expect(cb).toHaveBeenCalledWith("break", 1);
  });
});

describe("formatMMSS", () => {
  it("formats seconds into MM:SS with zero padding", () => {
    expect(formatMMSS(0)).toBe("00:00");
    expect(formatMMSS(9)).toBe("00:09");
    expect(formatMMSS(65)).toBe("01:05");
    expect(formatMMSS(25 * 60)).toBe("25:00");
    expect(formatMMSS(60 * 60 + 23)).toBe("60:23");
  });
});
