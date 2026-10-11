import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: Icon;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "brand" | "slate";
  className?: string;
};

// The tile pops and the words follow it up, once, whenever the state appears.
const after = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Inside a card or a column when there's nothing to show: what happened and the way on. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  tone = "brand",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-16 text-center", className)}>
      <span
        className={cn(
          "grid size-14 animate-pop place-items-center rounded-xl",
          tone === "brand"
            ? "bg-primary-soft text-primary-soft-foreground"
            : "bg-tone-slate-subtle text-tone-slate-text",
        )}
      >
        <Icon weight="duotone" className="size-7" />
      </span>
      <h2 className="mt-4 animate-rise text-lg font-bold text-balance" style={after(60)}>
        {title}
      </h2>
      {children && (
        <p
          className="mt-1.5 max-w-[46ch] animate-rise text-sm text-pretty text-muted-foreground"
          style={after(100)}
        >
          {children}
        </p>
      )}
      {action && (
        <div className="mt-5 animate-rise" style={after(140)}>
          {action}
        </div>
      )}
    </div>
  );
}
