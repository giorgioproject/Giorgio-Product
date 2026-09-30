import type { Landmark } from "@/lib/street-graph";

export function getLandmarkImageUrl(landmark: Landmark): string {
  if (landmark.imageUrl.startsWith("/")) return landmark.imageUrl;
  return `/landmarks/${landmark.id}.jpg`;
}
