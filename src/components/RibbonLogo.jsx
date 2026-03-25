import './RibbonLogo.css'

export function RibbonLogo() {
  // Full continuous figure-8 — wider loops to match spread b stems
  const infinityPath = [
    "M 44,44",
    "C 44,24 60,22 76,44",
    "C 87,66 98,64 98,44",
    "C 98,24 87,22 76,44",
    "C 60,66 44,64 44,44",
    "Z"
  ].join(" ")

  const strandOver = "M 44,44 C 44,24 60,22 76,44 C 87,66 98,64 98,44"
  const strandUnder = "M 98,44 C 98,24 87,22 76,44 C 60,66 44,64 44,44"

  return (
    <svg
      className="ribbon-logo"
      viewBox="0 0 162 72"
      overflow="visible"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ribbon"
    >
      <defs>
        {/* Hardcoded colors for Safari SMIL compatibility */}
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="0%"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="25%" stopColor="#39ff14" />
          <stop offset="50%" stopColor="#fff01f" />
          <stop offset="75%" stopColor="#ff00aa" />
          <stop offset="100%" stopColor="#00f0ff" />
        </linearGradient>

        {/* Animated gradient that flows along the ribbon */}
        <linearGradient id="tape-grad-anim" x1="0%" y1="0%" x2="100%" y2="0%"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f0ff">
            <animate attributeName="stop-color"
              values="#00f0ff;#39ff14;#ff00aa;#fff01f;#00f0ff"
              dur="4s" repeatCount="indefinite" />
          </stop>
          <stop offset="25%" stopColor="#39ff14">
            <animate attributeName="stop-color"
              values="#39ff14;#ff00aa;#fff01f;#00f0ff;#39ff14"
              dur="4s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#ff00aa">
            <animate attributeName="stop-color"
              values="#ff00aa;#fff01f;#00f0ff;#39ff14;#ff00aa"
              dur="4s" repeatCount="indefinite" />
          </stop>
          <stop offset="75%" stopColor="#fff01f">
            <animate attributeName="stop-color"
              values="#fff01f;#00f0ff;#39ff14;#ff00aa;#fff01f"
              dur="4s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#00f0ff">
            <animate attributeName="stop-color"
              values="#00f0ff;#39ff14;#ff00aa;#fff01f;#00f0ff"
              dur="4s" repeatCount="indefinite" />
          </stop>
        </linearGradient>

        <filter id="tape-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="sparkle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Letter strokes ── */}
      <g
        className="logo-letters"
        fill="none"
        stroke="url(#logo-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* r */}
        <path d="M 10,30 L 10,58" />
        <path d="M 10,37 C 10,28 22,26 28,32" />

        {/* i */}
        <circle cx="38" cy="20" r="2.5" fill="url(#logo-grad)" stroke="none" />
        <path d="M 38,30 L 38,58" />

        {/* first b stem */}
        <path d="M 44,10 L 44,46" />

        {/* second b stem */}
        <path d="M 76,10 L 76,46" />

        {/* o */}
        <ellipse cx="112" cy="44" rx="12" ry="14" />

        {/* n */}
        <path d="M 132,30 L 132,58" />
        <path d="M 132,37 C 132,26 154,26 154,37 L 154,58" />
      </g>

      {/* ── Möbius infinity ribbon ── */}

      {/* Wide glow aura */}
      <path
        d={infinityPath}
        fill="none"
        stroke="url(#tape-grad-anim)"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.12"
        filter="url(#tape-glow)"
      />

      {/* UNDER strand — the back side of the fold (dimmer, thinner) */}
      <path
        className="ribbon-under"
        d={strandUnder}
        fill="none"
        stroke="url(#tape-grad-anim)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Crossing bridge — covers the under strand at the fold point */}
      <ellipse cx="76" cy="44" rx="5" ry="4" fill="#0a0a12" />

      {/* OVER strand — the front side of the fold (bright, thicker) */}
      <path
        className="ribbon-over"
        d={strandOver}
        fill="none"
        stroke="url(#tape-grad-anim)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Shimmer highlight 1 — fast bright streak */}
      <path
        className="shimmer-1"
        d={infinityPath}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Shimmer highlight 2 — slower, wider, colored */}
      <path
        className="shimmer-2"
        d={infinityPath}
        fill="none"
        stroke="url(#tape-grad-anim)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Sparkle particles along the ribbon */}
      <g className="sparkles" filter="url(#sparkle-glow)">
        <circle className="sparkle s1" cx="50" cy="34" r="1" fill="white" />
        <circle className="sparkle s2" cx="88" cy="54" r="0.8" fill="#00f0ff" />
        <circle className="sparkle s3" cx="96" cy="38" r="1" fill="#ff00aa" />
        <circle className="sparkle s4" cx="64" cy="58" r="0.8" fill="#39ff14" />
        <circle className="sparkle s5" cx="76" cy="44" r="1.2" fill="white" />
        <circle className="sparkle s6" cx="48" cy="50" r="0.7" fill="#fff01f" />
      </g>
    </svg>
  )
}
