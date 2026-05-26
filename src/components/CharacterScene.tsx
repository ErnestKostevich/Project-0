/**
 * Decorative background scene rendered behind the 3D character.
 * Layers (back → front):
 *   1. Soft sky gradient
 *   2. Sakura tree silhouette (top-right)
 *   3. Distant haze gradient (bottom blur)
 *   4. Floor disc reflection (soft ellipse beneath character)
 *
 * All SVG / CSS — zero perf cost. Mood prop tints the palette.
 */
interface Props {
  mood?: "idle" | "focus" | "break";
}

export function CharacterScene({ mood = "idle" }: Props) {
  return (
    <div className={`char-scene char-scene-${mood}`} aria-hidden>
      {/* Sakura branch silhouette top-right */}
      <svg
        className="scene-branch"
        viewBox="0 0 200 160"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="branchGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7A4A5A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7A4A5A" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="petalGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE3EC" />
            <stop offset="100%" stopColor="#FF85A1" />
          </radialGradient>
        </defs>
        {/* Main branch */}
        <path
          d="M 200 10 Q 150 30 110 38 Q 70 46 30 80"
          stroke="url(#branchGrad)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Side branches */}
        <path
          d="M 150 30 Q 145 60 130 75"
          stroke="url(#branchGrad)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 80 44 Q 90 60 78 80"
          stroke="url(#branchGrad)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        {/* Cluster of sakura blossoms */}
        {[
          { cx: 165, cy: 22, r: 8 },
          { cx: 142, cy: 38, r: 7 },
          { cx: 122, cy: 36, r: 6.5 },
          { cx: 134, cy: 70, r: 6 },
          { cx: 88, cy: 44, r: 7 },
          { cx: 72, cy: 78, r: 6 },
          { cx: 50, cy: 70, r: 5 },
          { cx: 195, cy: 18, r: 5.5 },
        ].map((b, i) => (
          <g key={i} opacity={0.85}>
            {/* 5 petals */}
            {[0, 72, 144, 216, 288].map((rot) => (
              <ellipse
                key={rot}
                cx={b.cx}
                cy={b.cy - b.r * 0.55}
                rx={b.r * 0.45}
                ry={b.r * 0.7}
                fill="url(#petalGrad)"
                transform={`rotate(${rot} ${b.cx} ${b.cy})`}
              />
            ))}
            <circle cx={b.cx} cy={b.cy} r={b.r * 0.32} fill="#FFC9D8" />
          </g>
        ))}
      </svg>

      {/* Floor disc under character — soft ellipse */}
      <div className="scene-floor" />

      {/* Distant haze */}
      <div className="scene-haze" />
    </div>
  );
}
