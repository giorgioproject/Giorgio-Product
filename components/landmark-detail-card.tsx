import Image from "next/image";
import { LandmarkMapIcon } from "@/components/game-sprites";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLandmarkImageUrl } from "@/lib/landmark-image";
import { landmarkKindLabel } from "@/lib/landmarks";
import type { Landmark } from "@/lib/street-graph";

type LandmarkDetailCardProps = {
  landmark: Landmark;
  onClose: () => void;
  pauseHint?: boolean;
};

export function LandmarkDetailCard({
  landmark,
  onClose,
  pauseHint = true,
}: LandmarkDetailCardProps) {
  return (
    <Card className="max-w-sm w-full shadow-md pointer-events-auto overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted">
        <Image
          src={getLandmarkImageUrl(landmark)}
          alt={landmark.name}
          fill
          className="object-cover"
          sizes="(max-width: 480px) 100vw, 400px"
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-background/90 px-2 py-1 shadow-sm">
          <svg viewBox="0 0 64 64" width={28} height={28} aria-hidden>
            <LandmarkMapIcon x={32} y={32} kind={landmark.kind} size={22} selected />
          </svg>
          <span className="text-xs font-semibold text-muted-foreground">
            {landmarkKindLabel(landmark.kind)}
          </span>
        </div>
      </div>
      <CardHeader>
        <CardTitle>{landmark.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-base leading-relaxed">
        {landmark.blurb}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {pauseHint ? (
          <p className="text-xs text-muted-foreground flex-1">
            Chase paused — close to keep running. Photos: Wikimedia Commons & Flickr (CC).
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </CardFooter>
    </Card>
  );
}
