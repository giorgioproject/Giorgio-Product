import type { PlayerCharacter } from "@/lib/characters";
import type { Direction, LandmarkKind } from "@/lib/street-graph";

const FACING_ROTATION: Record<Direction, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

function BoyBody({ size }: { size: number }) {
  const s = size;
  return (
    <>
      <path
        d={`M ${-s * 0.26} ${-s * 0.22} Q 0 ${-s * 0.48} ${s * 0.26} ${-s * 0.22} Q ${s * 0.3} ${-s * 0.08} ${s * 0.22} ${-s * 0.02} Q 0 ${-s * 0.1} ${-s * 0.22} ${-s * 0.02} Q ${-s * 0.3} ${-s * 0.08} ${-s * 0.26} ${-s * 0.22} Z`}
        fill="#92400E"
        stroke="#78350F"
        strokeWidth={0.8}
      />
      <circle cx={0} cy={-s * 0.12} r={s * 0.27} fill="#FDBA74" stroke="#EA580C" strokeWidth={1} />
      <path
        d={`M ${-s * 0.22} ${-s * 0.02} Q 0 ${s * 0.1} ${s * 0.22} ${-s * 0.02} L ${s * 0.2} ${s * 0.34} L ${-s * 0.2} ${s * 0.34} Z`}
        fill="#2563EB"
        stroke="#1D4ED8"
        strokeWidth={1}
      />
      <path
        d={`M ${-s * 0.18} ${-s * 0.02} L ${s * 0.18} ${-s * 0.02} L ${s * 0.16} ${s * 0.02} L ${-s * 0.16} ${s * 0.02} Z`}
        fill="#F8FAFC"
        stroke="#1D4ED8"
        strokeWidth={0.6}
      />
      <rect x={-s * 0.13} y={s * 0.32} width={s * 0.11} height={s * 0.08} rx={1.5} fill="#F8FAFC" />
      <rect x={s * 0.02} y={s * 0.32} width={s * 0.11} height={s * 0.08} rx={1.5} fill="#F8FAFC" />
      <rect x={-s * 0.12} y={s * 0.38} width={s * 0.1} height={s * 0.18} rx={2} fill="#1E3A8A" />
      <rect x={s * 0.02} y={s * 0.38} width={s * 0.1} height={s * 0.18} rx={2} fill="#1E3A8A" />
      <circle cx={-s * 0.08} cy={-s * 0.14} r={s * 0.045} fill="#0F172A" />
      <circle cx={s * 0.08} cy={-s * 0.14} r={s * 0.045} fill="#0F172A" />
      <circle cx={-s * 0.06} cy={-s * 0.16} r={s * 0.015} fill="#FFFFFF" />
      <circle cx={s * 0.1} cy={-s * 0.16} r={s * 0.015} fill="#FFFFFF" />
      <path d={`M ${-s * 0.06} ${-s * 0.06} Q 0 ${-s * 0.01} ${s * 0.06} ${-s * 0.06}`} stroke="#0F172A" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <circle cx={-s * 0.14} cy={-s * 0.04} r={s * 0.035} fill="#FDA4AF" opacity={0.55} />
      <circle cx={s * 0.14} cy={-s * 0.04} r={s * 0.035} fill="#FDA4AF" opacity={0.55} />
    </>
  );
}

function GirlBody({ size }: { size: number }) {
  const s = size;
  return (
    <>
      <ellipse cx={-s * 0.28} cy={-s * 0.08} rx={s * 0.11} ry={s * 0.14} fill="#6D28D9" stroke="#5B21B6" strokeWidth={0.8} />
      <ellipse cx={s * 0.28} cy={-s * 0.08} rx={s * 0.11} ry={s * 0.14} fill="#6D28D9" stroke="#5B21B6" strokeWidth={0.8} />
      <circle cx={-s * 0.28} cy={-s * 0.14} r={s * 0.055} fill="#A78BFA" stroke="#7C3AED" strokeWidth={0.6} />
      <circle cx={s * 0.28} cy={-s * 0.14} r={s * 0.055} fill="#A78BFA" stroke="#7C3AED" strokeWidth={0.6} />
      <path
        d={`M ${-s * 0.12} ${-s * 0.34} Q 0 ${-s * 0.44} ${s * 0.12} ${-s * 0.34} L ${s * 0.08} ${-s * 0.26} L ${-s * 0.08} ${-s * 0.26} Z`}
        fill="#7C3AED"
        stroke="#5B21B6"
        strokeWidth={0.7}
      />
      <path
        d={`M ${-s * 0.04} ${-s * 0.38} L 0 ${-s * 0.44} L ${s * 0.04} ${-s * 0.38} L 0 ${-s * 0.34} Z`}
        fill="#F472B6"
        stroke="#DB2777"
        strokeWidth={0.6}
      />
      <circle cx={0} cy={-s * 0.12} r={s * 0.27} fill="#FDBA74" stroke="#EA580C" strokeWidth={1} />
      <path
        d={`M ${-s * 0.18} ${-s * 0.02} Q 0 ${s * 0.08} ${s * 0.18} ${-s * 0.02} L ${s * 0.26} ${s * 0.36} Q 0 ${s * 0.5} ${-s * 0.26} ${s * 0.36} Z`}
        fill="#EC4899"
        stroke="#DB2777"
        strokeWidth={1}
      />
      <path
        d={`M ${-s * 0.16} ${-s * 0.02} L ${s * 0.16} ${-s * 0.02} L ${s * 0.14} ${s * 0.04} L ${-s * 0.14} ${s * 0.04} Z`}
        fill="#FDF2F8"
        stroke="#DB2777"
        strokeWidth={0.6}
      />
      <ellipse cx={0} cy={s * 0.42} rx={s * 0.22} ry={s * 0.06} fill="#BE185D" opacity={0.35} />
      <ellipse cx={-s * 0.1} cy={s * 0.4} rx={s * 0.09} ry={s * 0.05} fill="#F8FAFC" stroke="#831843" strokeWidth={0.7} />
      <ellipse cx={s * 0.1} cy={s * 0.4} rx={s * 0.09} ry={s * 0.05} fill="#F8FAFC" stroke="#831843" strokeWidth={0.7} />
      <circle cx={-s * 0.08} cy={-s * 0.14} r={s * 0.045} fill="#0F172A" />
      <circle cx={s * 0.08} cy={-s * 0.14} r={s * 0.045} fill="#0F172A" />
      <circle cx={-s * 0.06} cy={-s * 0.16} r={s * 0.015} fill="#FFFFFF" />
      <circle cx={s * 0.1} cy={-s * 0.16} r={s * 0.015} fill="#FFFFFF" />
      <path d={`M ${-s * 0.05} ${-s * 0.06} Q 0 ${-s * 0.01} ${s * 0.05} ${-s * 0.06}`} stroke="#0F172A" strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <circle cx={-s * 0.14} cy={-s * 0.04} r={s * 0.035} fill="#FDA4AF" opacity={0.6} />
      <circle cx={s * 0.14} cy={-s * 0.04} r={s * 0.035} fill="#FDA4AF" opacity={0.6} />
    </>
  );
}

function DolphinBody({ size }: { size: number }) {
  const s = size;
  return (
    <>
      <path
        d={`M ${-s * 0.14} ${s * 0.28} L 0 ${s * 0.38} L ${s * 0.14} ${s * 0.28} L ${s * 0.1} ${s * 0.22} L ${-s * 0.1} ${s * 0.22} Z`}
        fill="#0284C7"
        stroke="#0369A1"
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <ellipse cx={-s * 0.34} cy={s * 0.02} rx={s * 0.11} ry={s * 0.07} fill="#0EA5E9" stroke="#0284C7" strokeWidth={0.8} />
      <ellipse cx={s * 0.34} cy={s * 0.02} rx={s * 0.11} ry={s * 0.07} fill="#0EA5E9" stroke="#0284C7" strokeWidth={0.8} />
      <ellipse cx={0} cy={-s * 0.04} rx={s * 0.34} ry={s * 0.3} fill="#38BDF8" stroke="#0284C7" strokeWidth={1.2} />
      <path
        d={`M ${-s * 0.08} ${-s * 0.32} L 0 ${-s * 0.46} L ${s * 0.08} ${-s * 0.32} Q 0 ${-s * 0.28} ${-s * 0.08} ${-s * 0.32} Z`}
        fill="#0EA5E9"
        stroke="#0284C7"
        strokeWidth={0.8}
      />
      <ellipse cx={0} cy={s * 0.14} rx={s * 0.22} ry={s * 0.13} fill="#7DD3FC" stroke="#0284C7" strokeWidth={1} />
      <ellipse cx={0} cy={s * 0.1} rx={s * 0.14} ry={s * 0.06} fill="#BAE6FD" opacity={0.7} />
      <circle cx={-s * 0.11} cy={-s * 0.1} r={s * 0.048} fill="#0F172A" />
      <circle cx={s * 0.11} cy={-s * 0.1} r={s * 0.048} fill="#0F172A" />
      <circle cx={-s * 0.09} cy={-s * 0.12} r={s * 0.016} fill="#FFFFFF" />
      <circle cx={s * 0.13} cy={-s * 0.12} r={s * 0.016} fill="#FFFFFF" />
      <path
        d={`M ${-s * 0.09} ${s * 0.16} Q 0 ${s * 0.24} ${s * 0.09} ${s * 0.16}`}
        stroke="#0369A1"
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

/** Street name chip beside the road — never sits on the playable pavement. */
export function StreetNameSign({
  x,
  y,
  angle,
  name,
  featured = false,
}: {
  x: number;
  y: number;
  angle: number;
  name: string;
  featured?: boolean;
}) {
  const fontSize = featured ? 18 : 12;
  const padX = featured ? 10 : 7;
  const padY = featured ? 5 : 3;
  const width = Math.max(44, name.length * fontSize * 0.62 + padX * 2);
  const height = fontSize + padY * 2;

  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} pointerEvents="none">
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={height / 2}
        fill="#FFFBEB"
        stroke={featured ? "#CA8A04" : "#D97706"}
        strokeWidth={featured ? 2 : 1.2}
        opacity={0.94}
      />
      <text
        x={0}
        y={1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#1E293B"
        fontSize={fontSize}
        fontWeight={featured ? 800 : 700}
      >
        {name}
      </text>
    </g>
  );
}

export function CharacterPreview({
  character,
  size = 80,
}: {
  character: PlayerCharacter;
  size?: number;
}) {
  const body =
    character === "boy" ? (
      <BoyBody size={size} />
    ) : character === "girl" ? (
      <GirlBody size={size} />
    ) : (
      <DolphinBody size={size} />
    );

  return (
    <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width={size} height={size} aria-hidden>
      <g transform={`translate(0 ${size * 0.05})`}>{body}</g>
    </svg>
  );
}

export function PlayerSprite({
  x,
  y,
  facing,
  character,
  size = 24,
}: {
  x: number;
  y: number;
  facing: Direction;
  character: PlayerCharacter;
  size?: number;
}) {
  const rot = FACING_ROTATION[facing];
  const body =
    character === "boy" ? (
      <BoyBody size={size} />
    ) : character === "girl" ? (
      <GirlBody size={size} />
    ) : (
      <DolphinBody size={size} />
    );

  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {body}
    </g>
  );
}

/** @deprecated use PlayerSprite */
export function PacManSprite({
  x,
  y,
  facing,
  size = 22,
}: {
  x: number;
  y: number;
  facing: Direction;
  size?: number;
}) {
  return <PlayerSprite x={x} y={y} facing={facing} character="boy" size={size} />;
}

const GHOST_PALETTE = [
  { fill: "#EF4444", stroke: "#B91C1C" },
  { fill: "#F472B6", stroke: "#DB2777" },
  { fill: "#22D3EE", stroke: "#0891B2" },
  { fill: "#FB923C", stroke: "#EA580C" },
] as const;

const LANDMARK_PALETTE: Record<
  LandmarkKind,
  { body: string; stroke: string; accent: string }
> = {
  restaurant: { body: "#F97316", stroke: "#C2410C", accent: "#FEF3C7" },
  building: { body: "#6366F1", stroke: "#4338CA", accent: "#E0E7FF" },
  monument: { body: "#A855F7", stroke: "#7E22CE", accent: "#F3E8FF" },
  shop: { body: "#EC4899", stroke: "#BE185D", accent: "#FCE7F3" },
  theater: { body: "#EF4444", stroke: "#B91C1C", accent: "#FEE2E2" },
  museum: { body: "#14B8A6", stroke: "#0F766E", accent: "#CCFBF1" },
  park: { body: "#22C55E", stroke: "#15803D", accent: "#DCFCE7" },
  beach: { body: "#0EA5E9", stroke: "#0369A1", accent: "#E0F2FE" },
  windmill: { body: "#EAB308", stroke: "#A16207", accent: "#FEF9C3" },
};

function LandmarkKindBody({ kind, size }: { kind: LandmarkKind; size: number }) {
  const s = size;
  const c = LANDMARK_PALETTE[kind];
  switch (kind) {
    case "restaurant":
      return (
        <>
          <path
            d={`M ${-s * 0.2} ${-s * 0.35} L 0 ${-s * 0.5} L ${s * 0.2} ${-s * 0.35} L ${s * 0.18} ${-s * 0.05} L ${-s * 0.18} ${-s * 0.05} Z`}
            fill={c.accent}
            stroke={c.stroke}
            strokeWidth={1}
          />
          <ellipse cx={0} cy={s * 0.12} rx={s * 0.28} ry={s * 0.12} fill={c.body} stroke={c.stroke} strokeWidth={1} />
          <circle cx={0} cy={s * 0.05} r={s * 0.08} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
        </>
      );
    case "shop":
      return (
        <>
          <rect x={-s * 0.28} y={-s * 0.08} width={s * 0.56} height={s * 0.38} rx={3} fill={c.body} stroke={c.stroke} strokeWidth={1} />
          <path d={`M ${-s * 0.3} ${-s * 0.08} L 0 ${-s * 0.28} L ${s * 0.3} ${-s * 0.08} Z`} fill={c.accent} stroke={c.stroke} strokeWidth={1} />
          <rect x={-s * 0.06} y={s * 0.08} width={s * 0.12} height={s * 0.18} rx={1} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
        </>
      );
    case "windmill":
      return (
        <>
          <rect x={-s * 0.06} y={-s * 0.05} width={s * 0.12} height={s * 0.42} fill={c.body} stroke={c.stroke} strokeWidth={1} />
          <circle cx={0} cy={-s * 0.12} r={s * 0.06} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
          <path d={`M 0 ${-s * 0.12} L 0 ${-s * 0.42} M 0 ${-s * 0.12} L ${s * 0.22} ${s * 0.02} M 0 ${-s * 0.12} L ${-s * 0.22} ${s * 0.02} M 0 ${-s * 0.12} L ${s * 0.18} ${-s * 0.32} M 0 ${-s * 0.12} L ${-s * 0.18} ${-s * 0.32}`} stroke={c.stroke} strokeWidth={1.4} strokeLinecap="round" />
        </>
      );
    case "theater":
      return (
        <>
          <path d={`M ${-s * 0.3} ${s * 0.28} L ${-s * 0.22} ${-s * 0.18} L ${s * 0.22} ${-s * 0.18} L ${s * 0.3} ${s * 0.28} Z`} fill={c.body} stroke={c.stroke} strokeWidth={1} />
          <rect x={-s * 0.32} y={s * 0.22} width={s * 0.64} height={s * 0.08} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
          <circle cx={-s * 0.12} cy={s * 0.02} r={s * 0.07} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
          <circle cx={s * 0.12} cy={s * 0.02} r={s * 0.07} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
        </>
      );
    case "museum":
      return (
        <>
          <rect x={-s * 0.3} y={-s * 0.05} width={s * 0.6} height={s * 0.38} rx={2} fill={c.body} stroke={c.stroke} strokeWidth={1} />
          <path d={`M ${-s * 0.34} ${-s * 0.05} L 0 ${-s * 0.32} L ${s * 0.34} ${-s * 0.05} Z`} fill={c.accent} stroke={c.stroke} strokeWidth={1} />
          <rect x={-s * 0.14} y={s * 0.02} width={s * 0.28} height={s * 0.18} rx={1} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
        </>
      );
    case "park":
      return (
        <>
          <rect x={-s * 0.05} y={s * 0.05} width={s * 0.1} height={s * 0.22} fill={c.body} stroke={c.stroke} strokeWidth={0.8} />
          <circle cx={0} cy={-s * 0.12} r={s * 0.22} fill={c.accent} stroke={c.stroke} strokeWidth={1} />
          <circle cx={-s * 0.14} cy={-s * 0.02} r={s * 0.14} fill={c.body} stroke={c.stroke} strokeWidth={0.8} />
          <circle cx={s * 0.14} cy={-s * 0.02} r={s * 0.14} fill={c.body} stroke={c.stroke} strokeWidth={0.8} />
        </>
      );
    case "beach":
      return (
        <>
          <path d={`M ${-s * 0.32} ${s * 0.2} Q 0 ${-s * 0.05} ${s * 0.32} ${s * 0.2} L ${s * 0.32} ${s * 0.32} L ${-s * 0.32} ${s * 0.32} Z`} fill={c.accent} stroke={c.stroke} strokeWidth={1} />
          <path d={`M ${-s * 0.05} ${-s * 0.32} L ${-s * 0.05} ${s * 0.08} M ${-s * 0.05} ${-s * 0.32} Q ${s * 0.08} ${-s * 0.38} ${s * 0.2} ${-s * 0.22}`} stroke={c.body} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <circle cx={s * 0.22} cy={-s * 0.24} r={s * 0.06} fill={c.body} stroke={c.stroke} strokeWidth={0.8} />
        </>
      );
    case "monument":
      return (
        <>
          <rect x={-s * 0.08} y={-s * 0.28} width={s * 0.16} height={s * 0.52} fill={c.body} stroke={c.stroke} strokeWidth={1} />
          <rect x={-s * 0.18} y={s * 0.18} width={s * 0.36} height={s * 0.06} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
          <path d={`M ${-s * 0.12} ${-s * 0.28} L 0 ${-s * 0.42} L ${s * 0.12} ${-s * 0.28} Z`} fill={c.accent} stroke={c.stroke} strokeWidth={1} />
        </>
      );
    case "building":
    default:
      return (
        <>
          <rect x={-s * 0.26} y={-s * 0.12} width={s * 0.52} height={s * 0.42} rx={2} fill={c.body} stroke={c.stroke} strokeWidth={1} />
          <rect x={-s * 0.08} y={s * 0.08} width={s * 0.16} height={s * 0.22} rx={1} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
          <rect x={s * 0.08} y={-s * 0.02} width={s * 0.1} height={s * 0.1} rx={1} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
          <rect x={-s * 0.18} y={-s * 0.02} width={s * 0.1} height={s * 0.1} rx={1} fill={c.accent} stroke={c.stroke} strokeWidth={0.8} />
        </>
      );
  }
}

/** Illustrated map pin — same bold style as player/ghost sprites. */
export function LandmarkMapIcon({
  x,
  y,
  kind,
  size = 26,
  selected = false,
}: {
  x: number;
  y: number;
  kind: LandmarkKind;
  size?: number;
  selected?: boolean;
}) {
  const pad = size * 0.55;
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle
        cx={0}
        cy={size * 0.05}
        r={pad}
        fill={selected ? "#FFFFFF" : "#FFFBEB"}
        stroke="#CA8A04"
        strokeWidth={selected ? 2.5 : 1.5}
        opacity={0.95}
      />
      <g transform={`translate(0 ${size * 0.08})`}>
        <LandmarkKindBody kind={kind} size={size} />
      </g>
    </g>
  );
}

export function GhostSprite({
  x,
  y,
  size = 22,
  variant = 0,
}: {
  x: number;
  y: number;
  size?: number;
  variant?: number;
}) {
  const w = size;
  const h = size * 1.1;
  const colors = GHOST_PALETTE[variant % GHOST_PALETTE.length]!;
  return (
    <g transform={`translate(${x - w / 2} ${y - h / 2})`}>
      <path
        d={`M 0 ${h * 0.35} Q 0 0 ${w / 2} 0 Q ${w} 0 ${w} ${h * 0.35} L ${w} ${h} L ${w * 0.85} ${h * 0.82} L ${w * 0.7} ${h} L ${w * 0.55} ${h * 0.82} L ${w * 0.4} ${h} L ${w * 0.25} ${h * 0.82} L ${w * 0.1} ${h} L 0 ${h * 0.82} Z`}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={1.2}
      />
      <circle cx={w * 0.35} cy={h * 0.38} r={w * 0.1} fill="#FFFFFF" />
      <circle cx={w * 0.65} cy={h * 0.38} r={w * 0.1} fill="#FFFFFF" />
      <circle cx={w * 0.35} cy={h * 0.4} r={w * 0.05} fill="#0F172A" />
      <circle cx={w * 0.65} cy={h * 0.4} r={w * 0.05} fill="#0F172A" />
    </g>
  );
}
