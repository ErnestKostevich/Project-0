import { useEffect, useState } from "react";

/**
 * Detailed CSS+SVG anime mascot — twin tails, sailor uniform, sparkly eyes.
 * Used as both a loading placeholder AND a graceful fallback when Live2D fails.
 * Eye-tracks the cursor and blinks periodically.
 */
interface Props {
  size?: number;
}

export function FallbackCharacter({ size = 300 }: Props) {
  const [eye, setEye] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;
      const max = 2.2;
      setEye({
        x: Math.max(-max, Math.min(max, dx * 5)),
        y: Math.max(-max, Math.min(max, dy * 4)),
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    let to: number;
    const tick = () => {
      to = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => {
          setBlink(false);
          tick();
        }, 140);
      }, 2800 + Math.random() * 3200);
    };
    tick();
    return () => window.clearTimeout(to);
  }, []);

  return (
    <div className="mascot-wrap" style={{ width: size, height: size }}>
      <svg viewBox="0 0 240 280" width={size} height={size} className="mascot-svg">
        <defs>
          {/* Hair: soft pink → deeper pink */}
          <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD0DD" />
            <stop offset="55%" stopColor="#FFA5BC" />
            <stop offset="100%" stopColor="#FF7799" />
          </linearGradient>
          <linearGradient id="hairBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFA5BC" />
            <stop offset="100%" stopColor="#E55F82" />
          </linearGradient>
          {/* Skin gradient */}
          <radialGradient id="skin" cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#FFF8F2" />
            <stop offset="100%" stopColor="#FFE4D5" />
          </radialGradient>
          {/* Uniform */}
          <linearGradient id="uniform" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F4ECEC" />
          </linearGradient>
          <linearGradient id="collar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9CC9F0" />
            <stop offset="100%" stopColor="#5E9CD3" />
          </linearGradient>
          {/* Ribbon */}
          <linearGradient id="ribbon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF7E9A" />
            <stop offset="100%" stopColor="#E55F82" />
          </linearGradient>
          {/* Blush */}
          <radialGradient id="blush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF8AA8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#FF8AA8" stopOpacity="0" />
          </radialGradient>
          {/* Eyes — violet-rose */}
          <radialGradient id="iris" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#B07DC7" />
            <stop offset="55%" stopColor="#7A4D8A" />
            <stop offset="100%" stopColor="#3D2050" />
          </radialGradient>
          {/* Sparkle in eye */}
          <radialGradient id="sparkle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ============ BODY GROUP — breathes ============ */}
        <g className="mascot-body">
          {/* Back hair (twin tails) — behind body */}
          <g className="twin-tails">
            <path
              d="M 65 110 Q 30 160 35 230 Q 50 245 70 240 Q 60 200 80 165 Q 78 140 70 120 Z"
              fill="url(#hairBack)"
            />
            <path
              d="M 175 110 Q 210 160 205 230 Q 190 245 170 240 Q 180 200 160 165 Q 162 140 170 120 Z"
              fill="url(#hairBack)"
            />
            {/* Ribbon ties on twin tails */}
            <ellipse cx="55" cy="160" rx="10" ry="6" fill="url(#ribbon)" />
            <ellipse cx="185" cy="160" rx="10" ry="6" fill="url(#ribbon)" />
            <path
              d="M 48 156 L 42 152 L 45 162 L 50 162 Z M 62 156 L 68 152 L 65 162 L 60 162 Z"
              fill="url(#ribbon)"
              opacity="0.85"
            />
            <path
              d="M 178 156 L 172 152 L 175 162 L 180 162 Z M 192 156 L 198 152 L 195 162 L 190 162 Z"
              fill="url(#ribbon)"
              opacity="0.85"
            />
          </g>

          {/* Shoulders / uniform top */}
          <path
            d="M 60 220 Q 70 215 85 215 L 155 215 Q 170 215 180 220 L 195 255 Q 195 270 180 275 L 60 275 Q 45 270 45 255 Z"
            fill="url(#uniform)"
            stroke="#E5D8D8"
            strokeWidth="0.8"
          />
          {/* Sailor collar */}
          <path
            d="M 88 215 L 105 245 L 120 215 L 135 245 L 152 215 Q 145 210 120 210 Q 95 210 88 215 Z"
            fill="url(#collar)"
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          {/* Front ribbon */}
          <g>
            <path
              d="M 105 225 L 100 220 L 95 230 L 102 232 Z M 135 225 L 140 220 L 145 230 L 138 232 Z"
              fill="url(#ribbon)"
            />
            <ellipse cx="120" cy="232" rx="9" ry="6" fill="url(#ribbon)" />
            <ellipse cx="120" cy="232" rx="3" ry="3" fill="#E55F82" />
          </g>

          {/* Neck */}
          <path
            d="M 105 200 Q 110 215 120 215 Q 130 215 135 200 L 134 192 L 106 192 Z"
            fill="url(#skin)"
          />

          {/* ===== Head ===== */}
          <g className="mascot-head">
            {/* Head shape */}
            <ellipse cx="120" cy="135" rx="58" ry="63" fill="url(#skin)" />

            {/* Side bangs (long, framing face) */}
            <path
              d="M 64 115 Q 60 175 70 195 L 90 175 Q 78 150 80 120 Z"
              fill="url(#hair)"
            />
            <path
              d="M 176 115 Q 180 175 170 195 L 150 175 Q 162 150 160 120 Z"
              fill="url(#hair)"
            />

            {/* Front fringe */}
            <path
              d="M 64 110 Q 78 60 120 56 Q 162 60 176 110 Q 168 90 152 88 L 138 110 L 120 75 L 102 110 L 88 88 Q 72 90 64 110 Z"
              fill="url(#hair)"
            />
            {/* Inner fringe tufts */}
            <path
              d="M 100 80 L 112 70 L 110 105 L 96 100 Z"
              fill="url(#hair)"
              opacity="0.92"
            />
            <path
              d="M 140 80 L 128 70 L 130 105 L 144 100 Z"
              fill="url(#hair)"
              opacity="0.92"
            />

            {/* Cheek blush */}
            <ellipse cx="86" cy="155" rx="14" ry="8" fill="url(#blush)" />
            <ellipse cx="154" cy="155" rx="14" ry="8" fill="url(#blush)" />

            {/* ===== Eyes ===== */}
            <g className={`mascot-eyes ${blink ? "blinking" : ""}`}>
              {/* Left eye */}
              <g transform={`translate(${eye.x}, ${eye.y})`}>
                {/* White */}
                <ellipse cx="92" cy="142" rx="12" ry="14" fill="#FFFFFF" />
                {/* Iris */}
                <ellipse cx="92" cy="142" rx="10" ry="12" fill="url(#iris)" />
                {/* Pupil */}
                <ellipse cx="92" cy="143" rx="3" ry="5" fill="#1A0820" />
                {/* Sparkles */}
                <ellipse cx="95" cy="137" rx="3" ry="4" fill="#FFFFFF" opacity="0.95" />
                <circle cx="89" cy="147" r="1.5" fill="#FFFFFF" opacity="0.8" />
                <circle cx="96" cy="144" r="0.8" fill="#FFE7EE" opacity="0.9" />
              </g>
              {/* Right eye */}
              <g transform={`translate(${eye.x}, ${eye.y})`}>
                <ellipse cx="148" cy="142" rx="12" ry="14" fill="#FFFFFF" />
                <ellipse cx="148" cy="142" rx="10" ry="12" fill="url(#iris)" />
                <ellipse cx="148" cy="143" rx="3" ry="5" fill="#1A0820" />
                <ellipse cx="151" cy="137" rx="3" ry="4" fill="#FFFFFF" opacity="0.95" />
                <circle cx="145" cy="147" r="1.5" fill="#FFFFFF" opacity="0.8" />
                <circle cx="152" cy="144" r="0.8" fill="#FFE7EE" opacity="0.9" />
              </g>

              {/* Eyelid covers when blinking — height animates */}
              <rect
                x="80"
                y="128"
                width="24"
                height={blink ? 28 : 0}
                fill="url(#skin)"
                className="lid"
              />
              <rect
                x="136"
                y="128"
                width="24"
                height={blink ? 28 : 0}
                fill="url(#skin)"
                className="lid"
              />

              {/* Eyelashes (top) */}
              <path
                d="M 80 130 Q 92 126 104 130"
                stroke="#2A1530"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 136 130 Q 148 126 160 130"
                stroke="#2A1530"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />
              {/* Lash flicks */}
              <path d="M 102 128 L 106 124" stroke="#2A1530" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M 158 128 L 162 124" stroke="#2A1530" strokeWidth="1.6" strokeLinecap="round" />
            </g>

            {/* Brows */}
            <path
              d="M 80 117 Q 92 113 102 116"
              stroke="#A06090"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              opacity="0.55"
            />
            <path
              d="M 138 116 Q 148 113 160 117"
              stroke="#A06090"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              opacity="0.55"
            />

            {/* Nose hint */}
            <path
              d="M 118 165 Q 120 169 122 165"
              stroke="#D8A89C"
              strokeWidth="1.3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Mouth — gentle smile */}
            <path
              d="M 112 178 Q 120 185 128 178"
              stroke="#C45670"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Hair top tuft (ahoge) */}
            <path
              d="M 116 58 Q 121 40 126 58 L 121 70 Z"
              fill="url(#hair)"
            />

            {/* Hair shine highlights */}
            <path
              d="M 92 80 Q 110 70 130 78 Q 150 70 168 84 Q 150 80 130 86 Q 110 80 92 90 Z"
              fill="#FFD8E4"
              opacity="0.45"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
