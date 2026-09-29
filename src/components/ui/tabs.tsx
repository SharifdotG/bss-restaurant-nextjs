"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { useFormatter } from "next-intl";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("min-w-0", className)} {...props} />;
}

/** Underlined tabs on the page ground; the orange line slides to the active one. */
function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative flex [scrollbar-width:none] items-center gap-6 overflow-x-auto border-b border-border",
        className,
      )}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator className="absolute bottom-0 left-(--active-tab-left) h-0.5 w-(--active-tab-width) rounded-full bg-primary transition-[left,width] duration-(--duration-base) ease-standard" />
    </TabsPrimitive.List>
  );
}

type TabProps = TabsPrimitive.Tab.Props & { count?: number };

function TabsTab({ className, count, children, ...props }: TabProps) {
  const format = useFormatter();
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "group/tab inline-flex h-11 shrink-0 items-center gap-2 text-base whitespace-nowrap text-muted-foreground transition-colors duration-(--duration-fast) outline-none hover:text-foreground focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/40 data-active:font-bold data-active:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-2xs font-bold text-muted-foreground tabular-nums group-data-active/tab:bg-primary-soft group-data-active/tab:text-primary-soft-foreground">
          {format.number(count)}
        </span>
      )}
    </TabsPrimitive.Tab>
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsPanel, TabsTab };
