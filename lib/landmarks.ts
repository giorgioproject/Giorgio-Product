import type { GraphBbox } from "@/lib/street-graph";
import type { Landmark, LandmarkKind } from "@/lib/street-graph";

export const MIN_LANDMARKS_PER_MAP = 5;

export function landmarkKindLabel(kind: LandmarkKind): string {
  switch (kind) {
    case "restaurant":
      return "Restaurant";
    case "building":
      return "Building";
    case "monument":
      return "Landmark";
    case "shop":
      return "Shop";
    case "theater":
      return "Theater";
    case "museum":
      return "Museum";
    case "park":
      return "Park";
    case "beach":
      return "Beach & pier";
    case "windmill":
      return "Windmill";
    default:
      return "Place";
  }
}

export function isLandmarkInBbox(landmark: Landmark, bbox: GraphBbox): boolean {
  return (
    landmark.lat >= bbox.south &&
    landmark.lat <= bbox.north &&
    landmark.lon >= bbox.west &&
    landmark.lon <= bbox.east
  );
}

export function filterLandmarksInBbox(
  landmarks: Landmark[],
  bbox: GraphBbox
): Landmark[] {
  return landmarks.filter((lm) => isLandmarkInBbox(lm, bbox));
}
