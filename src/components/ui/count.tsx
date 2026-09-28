import { useFormatter } from "next-intl";
import { cn } from "@/lib/utils";

/** A small orange pill with a number; nothing at all for zero. */
function Count({ value, className }: { value: number; className?: string }) {
  const format = useFormatter();
  if (value <= 0) return null;
  return (
    <span
      data-slot="count"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-2xs font-bold text-primary-foreground tabular-nums",
        className,
      )}
    >
      {format.number(Math.min(value, 99))}
      {value > 99 && "+"}
    </span>
  );
}

export { Count };
