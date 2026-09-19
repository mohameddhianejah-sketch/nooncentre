/* Custom line-art icon set for NOON Center, in the brand's teal/blush palette.
   These are original illustrations (not stock photos) designed to match the
   logo's hand-drawn feel and fill the site's empty spots with something
   intentional rather than generic clipart. */

export function IconFace(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path d="M15 18 L19 11 L29 8 L36 14 L34 29 L27 37 L18 34 L13 27 Z" fill="none" stroke="#8C2F55" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15 18 L23 20 L34 17" fill="none" stroke="#D4517A" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M18 26 L21 24 M27 24 L30 26 M21 31 L27 31" fill="none" stroke="#8C2F55" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="19" cy="19" r="1.5" fill="#D4517A" />
      <circle cx="32" cy="13" r="1.2" fill="#D4517A" />
    </svg>
  );
}

export function IconLeaf(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path d="M10 29 C 15 13, 26 7, 39 9 C 40 22, 34 35, 19 38 C 14 36, 11 33, 10 29 Z"
        fill="none" stroke="#8C2F55" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 34 C 19 27, 26 20, 38 11" fill="none" stroke="#D4517A" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M19 28 L18 21 M25 22 L25 16 M30 18 L34 18" fill="none" stroke="#8C2F55" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="39" cy="9" r="2" fill="none" stroke="#D4517A" strokeWidth="1.2" />
    </svg>
  );
}

export function IconSparkle(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path d="M24 7 L27 18 L38 21 L27 24 L24 36 L21 24 L10 21 L21 18 Z"
        fill="none" stroke="#8C2F55" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M34 31 L35.5 35.5 L40 37 L35.5 38.5 L34 43 L32.5 38.5 L28 37 L32.5 35.5 Z"
        fill="none" stroke="#D4517A" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="1.8" fill="#D4517A" />
      <path d="M12 6 V4 M12 18 V16 M7 11 H5 M19 11 H17" stroke="#8C2F55" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconPetal(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <g fill="none" stroke="#8C2F55" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M24 24 C 24 16, 19 10, 24 6 C 29 10, 24 16, 24 24 Z" />
        <path d="M24 24 C 32 24, 38 19, 42 24 C 38 29, 32 24, 24 24 Z" />
        <path d="M24 24 C 24 32, 29 38, 24 42 C 19 38, 24 32, 24 24 Z" />
        <path d="M24 24 C 16 24, 10 29, 6 24 C 10 19, 16 24, 24 24 Z" />
      </g>
      <circle cx="24" cy="24" r="2.4" fill="#D4517A" />
    </svg>
  );
}

export function IconHand(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path d="M15 42 C 12 38, 11 32, 11 27 C 11 25, 12.5 24, 14 24 C 15.5 24, 16.5 25.5, 16.5 27
               L 16.5 22 C 16.5 20, 18 19, 19.3 19 C 20.6 19, 22 20, 22 22 L 22 20
               C 22 18, 23.5 17, 24.8 17 C 26.1 17, 27.5 18, 27.5 20 L 27.5 22
               C 27.5 20.3, 28.8 19.2, 30.2 19.2 C 31.6 19.2, 33 20.3, 33 22.3
               L 33 30 C 33 37, 30 42, 24 42 Z"
        fill="none" stroke="#8C2F55" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M37 12 C 37.6 15, 39 16.4, 42 17 C 39 17.6, 37.6 19, 37 22 C 36.4 19, 35 17.6, 32 17 C 35 16.4, 36.4 15, 37 12 Z"
        fill="#D4517A" />
    </svg>
  );
}

export function IconQuote(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path d="M6 26 C 6 17, 12 12, 19 10 L 20 14 C 15 16, 12 19, 12 24 C 13 23, 14.5 22.5, 16 22.5
               C 19.5 22.5, 22 25, 22 28.5 C 22 32, 19 35, 15 35 C 9.5 35, 6 31, 6 26 Z" fill="#D4517A" />
      <path d="M26 26 C 26 17, 32 12, 39 10 L 40 14 C 35 16, 32 19, 32 24 C 33 23, 34.5 22.5, 36 22.5
               C 39.5 22.5, 42 25, 42 28.5 C 42 32, 39 35, 35 35 C 29.5 35, 26 31, 26 26 Z" fill="#D4517A" />
    </svg>
  );
}

/** Decorative spa still-life (candle, stacked stones, leaf sprig, ripples) for the About page. */
export function AboutScene(props) {
  return (
    <svg viewBox="0 0 200 240" {...props}>
      <ellipse cx="100" cy="205" rx="70" ry="7" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.35" />
      <ellipse cx="100" cy="205" rx="50" ry="5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" />

      <ellipse cx="60" cy="196" rx="26" ry="9" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <ellipse cx="63" cy="180" rx="19" ry="7.5" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <ellipse cx="58" cy="167" rx="12.5" ry="5.5" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />

      <rect x="128" y="150" width="22" height="52" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <line x1="139" y1="150" x2="139" y2="141" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M139 141 C 136 135, 140 130, 139 125 C 138 130, 142 135, 139 141 Z" fill="#C79A4B" />

      <path d="M100 150 C 96 130, 100 110, 112 96" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M106 138 C 100 134, 96 128, 98 121 C 105 123, 109 129, 106 138 Z" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M104 118 C 98 115, 95 109, 98 102 C 105 104, 108 111, 104 118 Z" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M112 100 C 107 96, 105 90, 109 84 C 115 87, 117 94, 112 100 Z" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinejoin="round" />

      <circle cx="45" cy="120" r="1.6" fill="#D4517A" opacity="0.8" />
      <circle cx="160" cy="110" r="2" fill="#FFFFFF" opacity="0.5" />
      <circle cx="150" cy="70" r="1.4" fill="#D4517A" opacity="0.7" />
    </svg>
  );
}
