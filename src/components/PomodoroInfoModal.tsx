import { IconClose, IconTomato } from "./icons/Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}

/**
 * First-time / on-demand explainer for the Pomodoro technique.
 * Shown when the user clicks the (?) help button next to the tomato icon.
 */
export function PomodoroInfoModal({ open, onClose, onStart }: Props) {
  return (
    <div className={`panel info-panel ${open ? "open" : ""}`}>
      <div className="panel-header">
        <span className="panel-title">What's a Pomodoro?</span>
        <button className="icon-btn" onClick={onClose} title="Close" aria-label="Close">
          <IconClose width={14} height={14} />
        </button>
      </div>

      <div className="info-body">
        <div className="info-hero">
          <div className="info-hero-icon">
            <IconTomato width={36} height={36} />
          </div>
          <p className="info-hero-text">
            A focus method, not a fruit 🌸
          </p>
        </div>

        <div className="info-block">
          <div className="info-step">
            <span className="info-num">1</span>
            <div>
              <strong>25 minutes</strong> of single-task focus. Phone face-down. One tab.
            </div>
          </div>
          <div className="info-step">
            <span className="info-num">2</span>
            <div>
              <strong>5 minute</strong> break. Stand up, water, look out the window.
            </div>
          </div>
          <div className="info-step">
            <span className="info-num">3</span>
            <div>
              Repeat. After <strong>4 cycles</strong>, take a longer 15-30 min break.
            </div>
          </div>
        </div>

        <div className="info-why">
          <strong>Why it works:</strong> short fixed windows make starting cheap. The break
          prevents fatigue. Counting cycles makes progress visible. It's the most-cited
          productivity technique with actual research behind it (Cirillo, 1980s).
        </div>

        <div className="info-cta-row">
          <button className="info-cta" onClick={() => { onClose(); onStart(); }}>
            Start my first Pomodoro
          </button>
        </div>
      </div>
    </div>
  );
}
