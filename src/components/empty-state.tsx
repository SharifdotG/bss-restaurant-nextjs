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
          "grid size-14 place-items-center rounded-xl",
          tone === "brand"
            ? "bg-primary-soft text-primary-soft-foreground"
            : "bg-tone-slate-subtle text-tone-slate-text",
        )}
      >
        <Icon weight="duotone" className="size-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-balance">{title}</h2>
      {children && (
        <p className="mt-1.5 max-w-[46ch] text-sm text-pretty text-muted-foreground">{children}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
