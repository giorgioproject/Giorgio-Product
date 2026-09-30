import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Direction } from "@/lib/street-graph";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

type DirectionPadProps = {
  onDirection: (dir: Direction) => void;
  disabled?: boolean;
  /** Brighter ring on arrows that work at the next corner. */
  activeDirections?: Direction[];
};

function DirButton({
  dir,
  label,
  icon,
  disabled,
  highlighted,
  onDirection,
}: {
  dir: Direction;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  highlighted?: boolean;
  onDirection: (dir: Direction) => void;
}) {
  const fire = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) onDirection(dir);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className={`h-14 w-14 flex-col gap-0.5 rounded-lg bg-white/90 shadow-md touch-manipulation ${
        highlighted
          ? "border-primary border-[3px] bg-primary/15 ring-2 ring-primary/40"
          : ""
      }`}
      disabled={disabled}
      aria-label={`Move ${label}`}
      onPointerUp={fire}
    >
      {icon}
      <span className="text-[10px] font-bold leading-none text-foreground">{label}</span>
    </Button>
  );
}

export function DirectionPad({
  onDirection,
  disabled,
  activeDirections,
}: DirectionPadProps) {
  const active = new Set(activeDirections ?? []);
  const highlight = (dir: Direction) =>
    activeDirections !== undefined && active.has(dir);

  return (
    <div
      className="grid grid-cols-3 gap-1.5 w-fit mx-auto select-none touch-manipulation"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div />
      <DirButton
        dir="up"
        label="Up"
        disabled={disabled}
        highlighted={highlight("up")}
        onDirection={onDirection}
        icon={<ChevronUp className="size-5" />}
      />
      <div />
      <DirButton
        dir="left"
        label="Left"
        disabled={disabled}
        highlighted={highlight("left")}
        onDirection={onDirection}
        icon={<ChevronLeft className="size-5" />}
      />
      <div className="h-14 w-14 rounded-lg bg-white/40 border-2 border-white/60" aria-hidden />
      <DirButton
        dir="right"
        label="Right"
        disabled={disabled}
        highlighted={highlight("right")}
        onDirection={onDirection}
        icon={<ChevronRight className="size-5" />}
      />
      <div />
      <DirButton
        dir="down"
        label="Down"
        disabled={disabled}
        highlighted={highlight("down")}
        onDirection={onDirection}
        icon={<ChevronDown className="size-5" />}
      />
      <div />
    </div>
  );
}
