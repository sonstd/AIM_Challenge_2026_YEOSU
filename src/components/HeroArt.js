/**
 * 인트로 일러스트 — 여수의 바다와 등대(오동도 모티프)를 담은 원형 장면.
 * 외부 이미지 없이 인라인 SVG라서 어떤 환경에서도 동일하게 그려진다.
 */
export default function HeroArt({ className = "" }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="여수 바다와 등대 일러스트"
    >
      <defs>
        <clipPath id="hero-clip">
          <circle cx="100" cy="100" r="94" />
        </clipPath>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfe9ff" />
          <stop offset="100%" stopColor="#8fd4f5" />
        </linearGradient>
        <linearGradient id="hero-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3aa7dd" />
          <stop offset="100%" stopColor="#1e7bb5" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="94" fill="url(#hero-sky)" />

      <g clipPath="url(#hero-clip)">
        {/* 해 */}
        <circle cx="150" cy="52" r="26" fill="#ffd36e" opacity="0.45" />
        <circle cx="150" cy="52" r="17" fill="#ffc542" />

        {/* 구름 */}
        <g fill="#ffffff" opacity="0.95">
          <rect x="26" y="46" width="46" height="15" rx="7.5" />
          <circle cx="38" cy="47" r="10" />
          <circle cx="56" cy="44" r="13" />
        </g>
        <g fill="#ffffff" opacity="0.7">
          <rect x="112" y="94" width="34" height="11" rx="5.5" />
          <circle cx="121" cy="95" r="7.5" />
          <circle cx="136" cy="93" r="9.5" />
        </g>

        {/* 바다 */}
        <path
          d="M-6 132 q 26 -11 53 0 t 53 0 t 53 0 t 53 0 V210 H-6 Z"
          fill="url(#hero-sea)"
        />

        {/* 섬과 등대 */}
        <path d="M52 134 q 26 -34 52 0 Z" fill="#3f9a63" />
        <path d="M74 118 q 10 -13 20 0 Z" fill="#57b87a" />
        <g>
          <rect x="94" y="86" width="14" height="46" rx="3" fill="#ffffff" />
          <rect x="94" y="98" width="14" height="8" fill="#e8534a" />
          <rect x="94" y="116" width="14" height="8" fill="#e8534a" />
          <rect x="91" y="80" width="20" height="7" rx="3.5" fill="#d8e6f0" />
          <circle cx="101" cy="76" r="4.5" fill="#ffd85c" />
        </g>

        {/* 물결 */}
        <g stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" opacity="0.65" fill="none">
          <path d="M28 158 q 8 -6 16 0" />
          <path d="M132 150 q 8 -6 16 0" />
          <path d="M70 176 q 8 -6 16 0" />
        </g>
      </g>

      <circle
        cx="100"
        cy="100"
        r="94"
        fill="none"
        stroke="#ffffff"
        strokeWidth="7"
      />
    </svg>
  );
}
