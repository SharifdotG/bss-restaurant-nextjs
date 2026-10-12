import { cn } from "@/lib/utils";

type ChipProps = React.ComponentProps<"button"> & {
  /** Shown as picked; leave out for a chip that only acts. */
  pressed?: boolean;
  size?: "sm" | "md";
};

/** A small rounded button for quick picks: reasons, wallets, cash amounts. */
function Chip({ pressed, size = "sm", className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      data-slot="chip"
      aria-pressed={pressed}
      className={cn(
        "hit-target relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-colors duration-(--duration-fast) ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-base",
        pressed
          ? "border-primary/30 bg-primary-soft text-primary-soft-foreground"
          : "border-border bg-card hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Chip };
