// Emblème logo "Screen Auto Pro" — hexagone rouge + flux de filtration (style auto/pro)
export default function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="sapLogo" x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f43f5e" />
          <stop offset="0.6" stopColor="#dc2626" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>
      {/* Hexagone */}
      <path d="M24 2.5 41.55 12.75 V33.25 L24 43.5 6.45 33.25 V12.75 Z"
        fill="url(#sapLogo)" stroke="#000" strokeOpacity="0.12" strokeWidth="1" />
      {/* Flux de filtration (3 courbes) + pointe */}
      <g stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M13 18 C 19.5 13.5, 28.5 13.5, 35 18" />
        <path d="M13 24 C 19.5 19.5, 28.5 19.5, 35 24" />
        <path d="M13 30 C 19.5 25.5, 28.5 25.5, 35 30" />
      </g>
      <circle cx="35" cy="18" r="2.1" fill="#fff" />
    </svg>
  );
}
