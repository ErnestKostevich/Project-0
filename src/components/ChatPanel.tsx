import { useEffect, useRef, useState } from "react";
import type { ChatTurn } from "../hooks/useChat";
import { IconClose, IconRefresh, IconSend } from "./icons/Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  turns: ChatTurn[];
  busy: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
}

export function ChatPanel({ open, onClose, turns, busy, onSend, onClear }: Props) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [turns]);

  const submit = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    onSend(text);
  };

  return (
    <div className={`panel chat-panel ${open ? "open" : ""}`}>
      <div className="panel-header">
        <span className="panel-title">Chat</span>
        <button
          className="icon-btn"
          onClick={onClear}
          title="Clear conversation"
          disabled={turns.length === 0}
          aria-label="Clear"
        >
          <IconRefresh width={14} height={14} />
        </button>
        <button className="icon-btn" onClick={onClose} title="Close" aria-label="Close">
          <IconClose width={14} height={14} />
        </button>
      </div>

      <div className="chat-list" ref={listRef}>
        {turns.length === 0 ? (
          <div className="chat-empty">
            Say hi to Hiyori 🌸 — or ask for a Pomodoro.
          </div>
        ) : (
          turns.map((t) => (
            <div key={t.id} className={`chat-bubble ${t.role}`}>
              <div className="chat-bubble-text">
                {t.content || (t.streaming ? "…" : "")}
              </div>
              {t.error ? <div className="chat-error">⚠ {t.error}</div> : null}
            </div>
          ))
        )}
      </div>

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={busy ? "thinking…" : "type a message"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={busy}
        />
        <button
          className="chat-send"
          onClick={submit}
          disabled={busy || !draft.trim()}
          aria-label="Send"
        >
          <IconSend width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
