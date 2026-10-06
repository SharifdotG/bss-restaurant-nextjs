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
};

/** The card every dashboard section sits in: a title, a line under it, and the content. */
export function Panel({ title, subtitle, action, children, className, flush }: PanelProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-xl bg-card py-5 shadow-md sm:py-6",
        !flush && "px-5 sm:px-6",
        className,
      )}
    >
      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
          flush && "px-5 sm:px-6",
        )}
      >
        {/* A link stays beside the title on phones; a wider switch drops below it. */}
        <div className="min-w-0 flex-[1_1_10rem]">
          <h2 className="text-md font-bold text-balance">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground tabular-nums">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      {children}
    </section>
  );
}
