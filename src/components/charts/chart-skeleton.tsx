import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const HEIGHTS = [45, 62, 38, 70, 55, 82, 48, 66, 90, 58, 74, 42, 68, 30];

/** Stands in for a chart while its data, or the chart code itself, is still on the way. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex h-56 items-end gap-2 pl-10", className)}>
      {HEIGHTS.map((height, i) => (
        <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}
