import type { SVGProps } from "react";

/**
 * Brand mark — stylised sakura with a glowing core. Used in the top bar of the
 * desktop app and the landing page hero. Designed as inline SVG so it scales
 * crisp at any DPI and we can color-shift it via CSS currentColor / gradients.
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <radialGradient id="logoCore" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#FFE3EC" />
          <stop offset="100%" stopColor="#FF6789" />
        </radialGradient>
        <linearGradient id="logoPetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD0DD" />
          <stop offset="100%" stopColor="#FF6789" />
        </linearGradient>
      </defs>
      {/* 5 petals around center */}
      <g style={{ transformOrigin: "center" }}>
        {[0, 72, 144, 216, 288].map((rot) => (
          <path
            key={rot}
            d="M 16 4 C 18.5 7, 21 9, 21 13 C 21 16, 18.5 17.5, 16 17.5 C 13.5 17.5, 11 16, 11 13 C 11 9, 13.5 7, 16 4 Z"
            fill="url(#logoPetal)"
            stroke="#FF6789"
            strokeOpacity="0.35"
            strokeWidth="0.4"
            transform={`rotate(${rot} 16 16)`}
          />
        ))}
      </g>
      {/* Glowing core */}
      <circle cx="16" cy="16" r="4" fill="url(#logoCore)" />
      <circle cx="16" cy="16" r="1.6" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

/**
 * Wordmark variant — logo mark + "Lumi" text in a friendly rounded font.
 * Includes optional tagline.
 */
interface WordmarkProps extends SVGProps<SVGSVGElement> {
  showTagline?: boolean;
}

export function LogoWordmark({ showTagline = false, ...rest }: WordmarkProps) {
  return (
    <svg
      viewBox={showTagline ? "0 0 160 50" : "0 0 160 36"}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <defs>
        <linearGradient id="wmText" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF6789" />
          <stop offset="100%" stopColor="#B575C7" />
        </linearGradient>
        <radialGradient id="wmCore" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FF6789" />
        </radialGradient>
        <linearGradient id="wmPetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD0DD" />
          <stop offset="100%" stopColor="#FF6789" />
        </linearGradient>
      </defs>
      <g transform="translate(2 2)">
        {[0, 72, 144, 216, 288].map((rot) => (
          <path
            key={rot}
            d="M 16 4 C 18.5 7, 21 9, 21 13 C 21 16, 18.5 17.5, 16 17.5 C 13.5 17.5, 11 16, 11 13 C 11 9, 13.5 7, 16 4 Z"
            fill="url(#wmPetal)"
            transform={`rotate(${rot} 16 16)`}
          />
        ))}
        <circle cx="16" cy="16" r="4" fill="url(#wmCore)" />
      </g>
      <text
        x="40"
        y="26"
        fontFamily='"Quicksand", "Plus Jakarta Sans", sans-serif'
        fontWeight="700"
        fontSize="22"
        fill="url(#wmText)"
        letterSpacing="0.5"
      >
        Lumi
      </text>
      {showTagline ? (
        <text
          x="40"
          y="42"
          fontFamily='"Plus Jakarta Sans", sans-serif'
          fontWeight="500"
          fontSize="9"
          fill="#8E7E8E"
          letterSpacing="1.2"
        >
          ANIME STUDY BUDDY
        </text>
      ) : null}
    </svg>
  );
}
