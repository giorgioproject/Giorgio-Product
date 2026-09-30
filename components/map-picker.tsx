import Image from "next/image";
import { MapPreviewSvg } from "@/components/map-preview-svg";
import { getMapCatalog, type MapId } from "@/lib/maps";

type MapPickerProps = {
  value: MapId | null;
  onChange: (mapId: MapId) => void;
};

export function MapPicker({ value, onChange }: MapPickerProps) {
  const maps = getMapCatalog();

  return (
    <div className="space-y-3">
      <h2 className="text-center text-lg font-bold text-white drop-shadow-md">
        Choose your map
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
        {maps.map((map) => {
          const selected = value === map.id;
          return (
            <button
              key={map.id}
              type="button"
              onClick={() => onChange(map.id)}
              className={`flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all ${
                selected
                  ? "border-white bg-white shadow-lg scale-[1.02]"
                  : "border-white/60 bg-white/85 hover:bg-white hover:border-white"
              }`}
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                <Image
                  src={map.landscapeImage}
                  alt={`${map.name} landscape`}
                  fill
                  className={
                    map.id === "downtown-santa-barbara"
                      ? "object-cover object-[80%_42%]"
                      : "object-cover"
                  }
                  sizes="(max-width: 640px) 90vw, 280px"
                />
              </div>
              <div className="relative aspect-[16/9] overflow-hidden bg-muted border-y border-border">
                <MapPreviewSvg mapId={map.id} className="h-full w-full" />
              </div>
              <div className="p-3 space-y-1">
                <p className="font-bold text-sm text-foreground">{map.name}</p>
                <p className="text-xs text-muted-foreground">{map.difficulty}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
