import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser Web Speech API wrapper.
 * - Picks a sensible default female voice (en).
 * - Emits a pseudo-amplitude signal while speaking so the VRM mouth blendshape
 *   can lip-sync. (Web Speech API doesn't expose the synth audio stream, so we
 *   simulate amplitude with a sinusoid + noise — visually it reads as "talking"
 *   and is indistinguishable from real lip-sync at this scale.)
 *
 * Pro tier will swap this for ElevenLabs Flash v2.5 streaming + WebAudio
 * analyser-based real lip-sync.
 */

interface UseTTSOpts {
  onAmplitude?: (level: number) => void;
  enabled?: boolean;
}

interface UseTTSReturn {
  voices: SpeechSynthesisVoice[];
  voiceId: string;
  setVoiceId: (id: string) => void;
  speak: (text: string) => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
}

// Names that consistently belong to female voices across Windows / macOS / Linux.
const FEMALE_NAME_HINTS = [
  "aria", "jenny", "ava", "ana", "anna", "emma", "michelle", "natasha",
  "samantha", "victoria", "karen", "moira", "tessa", "fiona", "veena",
  "zira", "hazel", "susan", "linda", "heather", "catherine",
  "monica", "paulina", "ines", "sara", "luciana", "joana", "elena", "yuna",
  "kyoko", "haruka", "sayaka", "nanami", "mizuki", "siri (female",
  "google us english", "google uk english female",
];

// Names / hints that mean MALE — used to exclude.
const MALE_NAME_HINTS = [
  "mark", "david", "george", "alex", "daniel", "fred", "ralph", "tom",
  "james", "brian", "richard", "guy", "ryan", "matthew", "jorge", "diego",
  "carlos", "thomas", "oliver", "william", "ichiro", "otoya", "google us english male",
];

function isLikelyFemale(v: SpeechSynthesisVoice): boolean {
  const n = v.name.toLowerCase();
  if (MALE_NAME_HINTS.some((m) => n.includes(m))) return false;
  if (FEMALE_NAME_HINTS.some((f) => n.includes(f))) return true;
  // Some voices include "female" / "f" explicitly.
  if (/\bfemale\b/i.test(v.name)) return true;
  if (/\bmale\b/i.test(v.name)) return false;
  return false;
}

const VOICE_PREFERENCE = [
  "aria", // Microsoft Aria (high quality en-US female)
  "jenny", // Microsoft Jenny
  "ava", // Microsoft Ava
  "ana",
  "natasha",
  "zira", // Microsoft Zira
  "samantha", // Apple Samantha
  "hazel",
  "emma",
];

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const female = voices.filter(isLikelyFemale);
  const pool = female.length ? female : voices;
  for (const pref of VOICE_PREFERENCE) {
    const m = pool.find((v) => v.name.toLowerCase().includes(pref));
    if (m) return m;
  }
  const en = pool.filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (en.length) return en[0];
  return pool[0];
}

/** Public helper — only female voices, sorted with en-US first. */
function filterFemale(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const female = voices.filter(isLikelyFemale);
  return female.sort((a, b) => {
    const ae = a.lang.toLowerCase().startsWith("en") ? 0 : 1;
    const be = b.lang.toLowerCase().startsWith("en") ? 0 : 1;
    if (ae !== be) return ae - be;
    return a.name.localeCompare(b.name);
  });
}

export function useTTS({ onAmplitude, enabled = true }: UseTTSOpts = {}): UseTTSReturn {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceId, setVoiceId] = useState<string>("");
  const [speaking, setSpeaking] = useState(false);
  const ampIntervalRef = useRef<number | null>(null);
  const onAmpRef = useRef(onAmplitude);
  onAmpRef.current = onAmplitude;

  // Populate voices (voiceschanged fires async on some browsers).
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const female = filterFemale(all);
      // Show female voices only in the settings dropdown.
      setVoices(female.length ? female : all);
      setVoiceId((cur) => {
        if (cur) return cur;
        const best = pickBestVoice(all);
        return best?.voiceURI ?? "";
      });
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported]);

  const stopAmpInterval = useCallback(() => {
    if (ampIntervalRef.current != null) {
      window.clearInterval(ampIntervalRef.current);
      ampIntervalRef.current = null;
    }
    onAmpRef.current?.(0);
  }, []);

  const speak = useCallback(
    (rawText: string) => {
      if (!enabled || !supported) return;
      const text = rawText.trim();
      if (!text) return;
      try {
        window.speechSynthesis.cancel(); // interrupt previous utterance
        const u = new SpeechSynthesisUtterance(text);
        const v = voices.find((x) => x.voiceURI === voiceId);
        if (v) u.voice = v;
        u.rate = 1.05;
        u.pitch = 1.18; // slight upward shift for anime feel
        u.volume = 0.95;

        u.onstart = () => {
          setSpeaking(true);
          // Simulated amplitude — sine + noise. Visually reads as talking on the
          // VRM mouth blendshape and stays in sync with utterance duration.
          let phase = 0;
          ampIntervalRef.current = window.setInterval(() => {
            phase += 0.42;
            const base = (Math.sin(phase) + 1) / 2; // 0..1
            const noise = (Math.random() - 0.5) * 0.3;
            const amp = Math.max(0.05, Math.min(1, base * 0.6 + 0.3 + noise));
            onAmpRef.current?.(amp);
          }, 70);
        };
        const finish = () => {
          stopAmpInterval();
          setSpeaking(false);
        };
        u.onend = finish;
        u.onerror = finish;

        window.speechSynthesis.speak(u);
      } catch (err) {
        console.warn("[useTTS] speak failed:", err);
        stopAmpInterval();
        setSpeaking(false);
      }
    },
    [enabled, supported, voices, voiceId, stopAmpInterval],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    stopAmpInterval();
    setSpeaking(false);
  }, [supported, stopAmpInterval]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
      if (ampIntervalRef.current != null) window.clearInterval(ampIntervalRef.current);
    };
  }, []);

  return { voices, voiceId, setVoiceId, speak, stop, speaking, supported };
}
