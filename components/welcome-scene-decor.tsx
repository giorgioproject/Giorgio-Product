/** Playful header art for the welcome screen — palms, sun, surf (kid-game vibe). */
export function WelcomeSceneDecor() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-44 sm:h-52"
      aria-hidden
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 900 220"
        preserveAspectRatio="xMidYMin slice"
      >
        <defs>
          <linearGradient id="welcome-wave" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>
        </defs>

        <path
          d="M0 0 H900 V52 Q675 8 450 38 Q225 68 0 28 Z"
          fill="url(#welcome-wave)"
        />
        <path
          d="M0 18 Q112 42 225 22 T450 32 T675 24 T900 40 V0 H0 Z"
          fill="#FFFFFF"
          opacity={0.35}
        />

        <g transform="translate(720 52)">
          <g fill="#FDE047" stroke="#CA8A04" strokeWidth={2}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <polygon
                key={deg}
                points="0,-58 8,-42 -8,-42"
                transform={`rotate(${deg})`}
              />
            ))}
          </g>
          <circle cx={0} cy={0} r={38} fill="#FACC15" stroke="#EAB308" strokeWidth={2.5} />
          <circle cx={-12} cy={-6} r={4} fill="#78350F" />
          <circle cx={12} cy={-6} r={4} fill="#78350F" />
          <path
            d="M -14 10 Q 0 22 14 10"
            stroke="#78350F"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
          <circle cx={-14} cy={8} r={5} fill="#FDA4AF" opacity={0.7} />
          <circle cx={14} cy={8} r={5} fill="#FDA4AF" opacity={0.7} />
        </g>

        <ellipse cx={120} cy={36} rx={52} ry={22} fill="#FFFFFF" opacity={0.45} />
        <ellipse cx={380} cy={24} rx={44} ry={18} fill="#FFFFFF" opacity={0.4} />
        <ellipse cx={560} cy={40} rx={38} ry={16} fill="#FFFFFF" opacity={0.35} />

        <g transform="translate(48 214)">
          <path
            d="M 0 0 Q 14 -95 28 -168 Q 32 -175 38 -168 Q 48 -120 52 -168 Q 58 -178 64 -168 Q 70 -110 78 -175"
            stroke="#92400E"
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx={18} cy={-178} rx={42} ry={14} fill="#22C55E" stroke="#15803D" strokeWidth={1.5} />
          <ellipse cx={55} cy={-182} rx={38} ry={13} fill="#4ADE80" stroke="#15803D" strokeWidth={1.5} />
          <ellipse cx={38} cy={-192} rx={36} ry={12} fill="#16A34A" stroke="#14532D" strokeWidth={1.5} />
          <circle cx={72} cy={-168} r={14} fill="#854D0E" stroke="#713F12" strokeWidth={1} />
          <circle cx={72} cy={-168} r={9} fill="#A16207" />
        </g>

        <g transform="translate(852 214) scale(-1 1)">
          <path
            d="M 0 0 Q 14 -95 28 -168 Q 32 -175 38 -168 Q 48 -120 52 -168 Q 58 -178 64 -168 Q 70 -110 78 -175"
            stroke="#92400E"
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx={18} cy={-178} rx={42} ry={14} fill="#22C55E" stroke="#15803D" strokeWidth={1.5} />
          <ellipse cx={55} cy={-182} rx={38} ry={13} fill="#4ADE80" stroke="#15803D" strokeWidth={1.5} />
          <ellipse cx={38} cy={-192} rx={36} ry={12} fill="#16A34A" stroke="#14532D" strokeWidth={1.5} />
          <circle cx={72} cy={-168} r={14} fill="#854D0E" stroke="#713F12" strokeWidth={1} />
          <circle cx={72} cy={-168} r={9} fill="#A16207" />
        </g>

        <g transform="translate(450 118) rotate(-12)">
          <ellipse cx={0} cy={0} rx={56} ry={14} fill="#F472B6" stroke="#DB2777" strokeWidth={2} />
          <rect x={-48} y={-4} width={96} height={8} rx={2} fill="#FFFFFF" opacity={0.85} />
          <rect x={-8} y={-14} width={16} height={28} rx={3} fill="#38BDF8" stroke="#0284C7" strokeWidth={1.5} />
        </g>

        <path
          d="M 280 88 Q 320 72 360 88 T440 84 T520 90"
          stroke="#FFFFFF"
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
      </svg>
    </div>
  );
}
