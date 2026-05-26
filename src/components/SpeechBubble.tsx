import { useEffect, useState } from "react";

/**
 * Floating speech bubble above the character. Fades after `fadeAfter` ms
 * unless the content is still streaming.
 */
interface Props {
  text: string;
  streaming?: boolean;
  fadeAfter?: number;
}

export function SpeechBubble({ text, streaming, fadeAfter = 7000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!text) {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (streaming) return;
    const id = window.setTimeout(() => setVisible(false), fadeAfter);
    return () => window.clearTimeout(id);
  }, [text, streaming, fadeAfter]);

  if (!text) return null;

  return (
    <div className={`speech-bubble ${visible ? "show" : "hide"}`}>
      <div className="speech-bubble-inner">
        {text}
        {streaming ? <span className="streaming-dots" /> : null}
      </div>
      <svg
        className="speech-bubble-tail"
        viewBox="0 0 16 12"
        width="16"
        height="12"
      >
        <path d="M 0 0 L 16 0 L 8 12 Z" />
      </svg>
    </div>
  );
}
