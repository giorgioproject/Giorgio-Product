import { CharacterPreview } from "@/components/game-sprites";
import type { PlayerCharacter } from "@/lib/characters";

type WinCelebrationGraphicProps = {
  character: PlayerCharacter;
  className?: string;
};

/** Hand-drawn win banner — same sprite style as the map, not a photo or emoji. */
export function WinCelebrationGraphic({
  character,
  className = "",
}: WinCelebrationGraphicProps) {
  return (
    <div
      className={`relative mx-auto aspect-[2/1] w-full max-w-[280px] overflow-hidden rounded-xl border-2 border-border bg-muted ${className}`}
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 280 140"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="280" height="140" className="fill-muted" />
        {/* Mini street grid */}
        <g stroke="var(--border)" strokeWidth="5" strokeLinecap="round" opacity={0.9}>
          <line x1="0" y1="72" x2="280" y2="72" />
          <line x1="140" y1="0" x2="140" y2="140" />
          <line x1="40" y1="0" x2="40" y2="140" opacity={0.5} />
          <line x1="240" y1="0" x2="240" y2="140" opacity={0.5} />
        </g>
        {/* Eaten pellet trail */}
        {[
          [48, 72],
          [88, 72],
          [192, 72],
          [228, 72],
          [140, 48],
          [140, 96],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={4}
            className="fill-muted-foreground/25"
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        ))}
        {/* Simple confetti — flat shapes */}
        <rect x="24" y="18" width="8" height="8" rx="1" className="fill-primary" opacity={0.85} transform="rotate(12 28 22)" />
        <rect x="232" y="24" width="7" height="7" rx="1" className="fill-accent" opacity={0.9} transform="rotate(-18 235 27)" />
        <circle cx="210" cy="108" r="5" className="fill-primary" opacity={0.7} />
        <circle cx="52" cy="104" r="4" className="fill-accent" opacity={0.75} />
        <path
          d="M 248 52 l 6 12 l -12 0 z"
          className="fill-primary"
          opacity={0.65}
        />
        {/* Pennant */}
        <path
          d="M 70 28 L 210 28 L 198 52 L 140 44 L 82 52 Z"
          className="fill-primary"
          stroke="var(--primary)"
          strokeWidth={2}
        />
        <text
          x="140"
          y="42"
          textAnchor="middle"
          className="fill-primary-foreground"
          fontSize="14"
          fontWeight="800"
          fontFamily="var(--font-fredoka), system-ui, sans-serif"
        >
          CLEAR!
        </text>
        {/* Tiny ghost bouncing off */}
        <g transform="translate(218 88)">
          <ellipse cx="0" cy="8" rx="14" ry="16" className="fill-card" stroke="var(--border)" strokeWidth={1.5} />
          <circle cx="-5" cy="4" r="2.5" className="fill-foreground" />
          <circle cx="5" cy="4" r="2.5" className="fill-foreground" />
          <path d="M -6 12 Q 0 16 6 12" fill="none" className="stroke-foreground" strokeWidth={1.2} />
          <path
            d="M -14 22 L -10 18 L -6 22 L -2 18 L 2 22 L 6 18 L 10 22 L 14 18 L 14 24 L -14 24 Z"
            className="fill-card"
            stroke="var(--border)"
            strokeWidth={1}
          />
        </g>
      </svg>
      <div className="absolute inset-x-0 bottom-2 flex justify-center">
        <div className="rounded-full border-2 border-border bg-card px-1 py-0.5 shadow-sm">
          <CharacterPreview character={character} size={64} />
        </div>
      </div>
    </div>
  );
}
