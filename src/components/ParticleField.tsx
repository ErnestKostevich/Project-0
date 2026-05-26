import { useMemo } from "react";

/**
 * Falling sakura petals layer. Pure CSS animations driven by inline styles
 * so each petal has its own duration / delay / horizontal drift / size.
 * Cheap to render — no JS animation loop.
 */
interface Props {
  count?: number;
}

interface Petal {
  id: number;
  left: number; // percent
  size: number; // px
  duration: number; // s
  delay: number; // s
  drift: number; // px sideways
  rotate: number; // deg start
  opacity: number;
}

export function ParticleField({ count = 14 }: Props) {
  const petals = useMemo<Petal[]>(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 8 + Math.random() * 10,
      duration: 10 + Math.random() * 14,
      delay: -Math.random() * 20,
      drift: (Math.random() * 2 - 1) * 30,
      rotate: Math.random() * 360,
      opacity: 0.45 + Math.random() * 0.35,
    }));
  }, [count]);

  return (
    <div className="particle-field" aria-hidden>
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
            // CSS vars used in keyframes
            ["--drift" as never]: `${p.drift}px`,
            ["--rotate" as never]: `${p.rotate}deg`,
          }}
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%">
            <defs>
              <radialGradient id={`pg-${p.id}`} cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFE7EE" />
                <stop offset="55%" stopColor="#FFB7CE" />
                <stop offset="100%" stopColor="#FF85A1" />
              </radialGradient>
            </defs>
            <path
              d="M12 2 C 14 7, 18 8, 20 12 C 18 16, 14 17, 12 22 C 10 17, 6 16, 4 12 C 6 8, 10 7, 12 2 Z"
              fill={`url(#pg-${p.id})`}
              stroke="#FF85A1"
              strokeOpacity="0.3"
              strokeWidth="0.5"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}
