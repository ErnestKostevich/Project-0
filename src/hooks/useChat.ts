import { useCallback, useRef, useState } from "react";
import { streamChat, type ChatMessage } from "../lib/llm";
import { buildSystemPrompt, type PersonalityContext } from "../lib/personality";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  error?: string;
}

export interface UseChatOpts {
  apiKey: string;
  model: string;
  /** Snapshot of personality context at send time. Called once per send. */
  buildContext: () => PersonalityContext;
  /** Called when a new assistant turn finishes streaming. */
  onAssistantTurn?: (text: string) => void;
}

function genId(): string {
  // crypto.randomUUID is available in modern browsers and Tauri's WebView.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useChat({ apiKey, model, buildContext, onAssistantTurn }: UseChatOpts) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (busy) return;

      if (!apiKey) {
        setTurns((t) => [
          ...t,
          { id: genId(), role: "user", content: trimmed },
          {
            id: genId(),
            role: "assistant",
            content:
              "I need an OpenRouter API key first. Click the ⚙ button to open settings and paste your key — you can grab one at openrouter.ai/keys ✨",
          },
        ]);
        return;
      }

      const userTurn: ChatTurn = { id: genId(), role: "user", content: trimmed };
      const assistantId = genId();
      setTurns((t) => [
        ...t,
        userTurn,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
      setBusy(true);

      const controller = new AbortController();
      controllerRef.current = controller;

      // Use the latest turns + the new user turn as history.
      const history: ChatMessage[] = [...turns, userTurn].map((t) => ({
        role: t.role,
        content: t.content,
      }));

      let buffer = "";
      await streamChat({
        apiKey,
        model,
        messages: history,
        systemPrompt: buildSystemPrompt(buildContext()),
        onDelta: (d) => {
          buffer += d;
          setTurns((t) =>
            t.map((x) => (x.id === assistantId ? { ...x, content: x.content + d } : x)),
          );
        },
        onDone: () => {
          setTurns((t) =>
            t.map((x) => (x.id === assistantId ? { ...x, streaming: false } : x)),
          );
          setBusy(false);
          if (buffer.trim()) onAssistantTurn?.(buffer);
        },
        onError: (err) => {
          setTurns((t) =>
            t.map((x) =>
              x.id === assistantId ? { ...x, streaming: false, error: err.message } : x,
            ),
          );
          setBusy(false);
        },
        signal: controller.signal,
      });
    },
    [apiKey, model, busy, turns, buildContext, onAssistantTurn],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setBusy(false);
  }, []);

  const clear = useCallback(() => setTurns([]), []);

  return { turns, busy, send, cancel, clear };
}
