import { ForkKnifeIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

/** The dashboard's own mark: the orange tile with a fork and knife. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
    >
      <ForkKnifeIcon weight="duotone" className="size-[22px]" />
    </span>
  );
}
