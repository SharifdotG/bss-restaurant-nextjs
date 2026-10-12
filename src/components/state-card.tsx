import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type StateCardProps = {
  icon: Icon;
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** h2 when the card sits under a page header that already has the h1. */
  heading?: "h1" | "h2";
  className?: string;
};

/** A centred card for whole-page moments: role denied, not found, nothing here yet. */
export function StateCard({
  icon: Icon,
  title,
  children,
  actions,
  heading: Heading = "h1",
  className,
}: StateCardProps) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-[480px] animate-rise flex-col items-center rounded-xl bg-card px-6 py-10 text-center shadow-md sm:px-10",
        className,
      )}
    >
      <span className="grid size-14 animate-pop place-items-center rounded-xl bg-tone-slate-subtle text-tone-slate-text">
        <Icon weight="duotone" className="size-7" />
      </span>
      <Heading className="mt-4 text-lg font-bold text-balance">{title}</Heading>
      {children && (
        <div className="mt-2 max-w-[44ch] text-base text-pretty text-muted-foreground">
          {children}
        </div>
      )}
      {actions && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">{actions}</div>
      )}
    </section>
  );
}
