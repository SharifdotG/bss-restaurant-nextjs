"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Sits flush inside a card; the card gives the corners and the shadow. */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  const container = useRef<HTMLDivElement>(null);
  const scrolls = useScrollsSideways(container);

  return (
    <div
      ref={container}
      data-slot="table-container"
      // A table wider than its card scrolls, so keyboards need a way in to scroll it.
      tabIndex={scrolls ? 0 : undefined}
      className="relative w-full overflow-x-auto outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

function useScrollsSideways(ref: React.RefObject<HTMLElement | null>) {
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const check = () => setScrolls(element.scrollWidth > element.clientWidth + 1);
    const observer = new ResizeObserver(check);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [ref]);
  return scrolls;
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("bg-muted", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />;
}

const rowClass =
  "border-b border-border transition-colors duration-(--duration-fast) last:border-b-0 [tbody_&]:hover:bg-foreground/[0.025]";

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn(rowClass, className)} {...props} />;
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-4 text-left align-middle text-2xs font-bold tracking-wide whitespace-nowrap text-muted-foreground uppercase first:pl-6 last:pr-6",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-3 align-middle first:pl-6 last:pr-6", className)}
      {...props}
    />
  );
}

export { rowClass, Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
