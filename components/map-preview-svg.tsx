import { buildOceanLayer } from "@/lib/map-ocean";
import { getPlayGraphForMap, type MapId } from "@/lib/maps";
import { projectPoint } from "@/lib/projection";

const PREVIEW_W = 900;
const PREVIEW_H = 506;

type MapPreviewSvgProps = {
  mapId: MapId;
  className?: string;
};

/** Welcome-screen thumbnail — same land, streets, and ocean as the live map. */
export function MapPreviewSvg({ mapId, className }: MapPreviewSvgProps) {
  const graph = getPlayGraphForMap(mapId);
  const bbox = graph.bbox;
  const ocean = buildOceanLayer(graph, PREVIEW_W, PREVIEW_H, mapId);

  const project = (lon: number, lat: number) =>
    projectPoint(lon, lat, bbox, PREVIEW_W, PREVIEW_H);

  const playableEdges = graph.edges.filter((e) => e.playable);

  return (
    <svg
      viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id={`preview-land-${mapId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
        <linearGradient id={`preview-ocean-${mapId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>
      <rect width={PREVIEW_W} height={PREVIEW_H} fill={`url(#preview-land-${mapId})`} />
      {ocean && (
        <>
          <polygon points={ocean.fillPoints} fill={`url(#preview-ocean-${mapId})`} />
          <polyline
            points={ocean.wavePoints}
            fill="none"
            stroke="#BAE6FD"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.85}
          />
        </>
      )}
      {playableEdges.map((edge) => {
        const a = graph.nodes.find((n) => n.id === edge.from);
        const b = graph.nodes.find((n) => n.id === edge.to);
        if (!a || !b) return null;
        const p1 = project(a.lon, a.lat);
        const p2 = project(b.lon, b.lat);
        return (
          <line
            key={edge.id}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="#64748B"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        );
      })}
      {playableEdges.map((edge) => {
        const a = graph.nodes.find((n) => n.id === edge.from);
        const b = graph.nodes.find((n) => n.id === edge.to);
        if (!a || !b) return null;
        const p1 = project(a.lon, a.lat);
        const p2 = project(b.lon, b.lat);
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        return (
          <circle key={`${edge.id}-dot`} cx={mx} cy={my} r={2.2} fill="#FACC15" opacity={0.85} />
        );
      })}
    </svg>
  );
}
