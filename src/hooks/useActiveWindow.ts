import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface ActiveWindow {
  title: string;
  app_name: string;
  process_path: string;
}

export type AppCategory =
  | "productive"
  | "distracting"
  | "communication"
  | "neutral";

interface ActiveWindowState {
  window: ActiveWindow | null;
  category: AppCategory;
  /** How long (ms) the user has been on the current app category. */
  categoryStreakMs: number;
}

/**
 * Heuristic classification of the active app. Errs on the side of "neutral"
 * — only flags clear-cut cases so Lumi doesn't constantly mis-nag the user.
 */
export function classifyApp(window: ActiveWindow | null): AppCategory {
  if (!window) return "neutral";
  const haystack = `${window.app_name} ${window.title} ${window.process_path}`.toLowerCase();

  // Procrastination flags — common time-sinks. Match BEFORE communication
  // (Twitter/X is distracting even though it's social).
  if (
    /(youtube|tiktok|twitter\b|^x\b|instagram|reddit|netflix|twitch|facebook|9gag|pinterest|imgur|tumblr)/i.test(
      haystack,
    )
  ) {
    return "distracting";
  }

  // Productive tools — IDEs, design, writing, terminal.
  if (
    /(code\.exe|vscode|sublime|vim|emacs|webstorm|intellij|pycharm|rider|xcode|jetbrains|visual studio|terminal|powershell|cmd\.exe|wsl|figma|photoshop|illustrator|after effects|blender|davinci|premiere|notion|obsidian|onenote|excel|word|docs\.google|sheets\.google|overleaf|cursor|zed|fleet|nvim|github\.com\/.*\/(pull|issue))/i.test(
      haystack,
    )
  ) {
    return "productive";
  }

  // Real-time comms.
  if (
    /(slack|discord|teams|zoom|google meet|telegram|whatsapp|signal|mattermost|skype)/i.test(
      haystack,
    )
  ) {
    return "communication";
  }

  return "neutral";
}

/**
 * Polls the active foreground window every `intervalMs`. Returns the latest
 * window, its category, and how long the user has stayed in that category
 * (so Lumi can nudge after N minutes of YouTube).
 */
export function useActiveWindow(intervalMs = 8000): ActiveWindowState {
  const [window, setWindow] = useState<ActiveWindow | null>(null);
  const [category, setCategory] = useState<AppCategory>("neutral");
  const [streakStart, setStreakStart] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    let lastCategory: AppCategory = "neutral";
    let lastStreak = Date.now();

    const poll = async () => {
      try {
        const result = await invoke<ActiveWindow | null>("get_active_window");
        if (cancelled) return;
        setWindow(result ?? null);
        const cat = classifyApp(result);
        if (cat !== lastCategory) {
          lastStreak = Date.now();
          lastCategory = cat;
          setStreakStart(lastStreak);
        }
        setCategory(cat);
        setNow(Date.now());
      } catch (err) {
        // Tauri command not available (e.g. running in browser dev) — fail silent.
        if (!cancelled) {
          setWindow(null);
          setCategory("neutral");
        }
      }
    };

    void poll();
    const id = window?.setInterval ? null : null; // type guard
    const tid = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(tid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return {
    window,
    category,
    categoryStreakMs: now - streakStart,
  };
}
