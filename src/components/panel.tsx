import { cn } from "@/lib/utils";

type PanelProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Top right: a link, a switch or a download. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Tables and lists that run to the card's edges. */
  flush?: boolean;
  /** No card of its own: the heading sits on the page and the content brings its own cards. */
  plain?: boolean;
};

/** The card every dashboard section sits in: a title, a line under it, and the content. */
export function Panel({ title, subtitle, action, children, className, flush, plain }: PanelProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col",
        plain ? "gap-4" : "gap-5 rounded-xl bg-card py-5 shadow-md sm:py-6",
        !flush && !plain && "px-5 sm:px-6",
        className,
      )}
    >
      <header className={cn(plain && "px-1", flush && "px-5 sm:px-6")}>
        {/* The title never squeezes: if the action doesn't fit beside it, it drops below. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="min-w-0 flex-auto text-md font-bold text-balance">{title}</h2>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
        {subtitle && (
          <p className="text-sm text-pretty text-muted-foreground tabular-nums">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}
