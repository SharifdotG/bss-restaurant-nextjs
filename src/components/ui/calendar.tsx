"use client";

import * as React from "react";
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon, CaretUpIcon } from "@phosphor-icons/react";
import { DayPicker, getDefaultClassNames, type DayButton } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CHEVRONS = {
  left: CaretLeftIcon,
  right: CaretRightIcon,
  up: CaretUpIcon,
  down: CaretDownIcon,
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("group/calendar p-3 [--cell-size:--spacing(9)]", className)}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-6 sm:flex-row", defaults.months),
        month: cn("flex w-full flex-col gap-3", defaults.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaults.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-(--cell-size) aria-disabled:opacity-40",
          defaults.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-(--cell-size) aria-disabled:opacity-40",
          defaults.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaults.month_caption,
        ),
        caption_label: cn("text-sm font-bold select-none", defaults.caption_label),
        month_grid: cn("w-full border-collapse", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "flex-1 text-xs font-medium text-muted-foreground select-none",
          defaults.weekday,
        ),
        week: cn("mt-1 flex w-full", defaults.week),
        day: cn(
          "group/day relative aspect-square size-(--cell-size) p-0 text-center select-none",
          defaults.day,
        ),
        // The band between the two ends of a range sits behind the day buttons.
        range_start: cn("rounded-l-md bg-primary-soft", defaults.range_start),
        range_middle: cn("rounded-none bg-primary-soft", defaults.range_middle),
        range_end: cn("rounded-r-md bg-primary-soft", defaults.range_end),
        today: cn("font-bold text-primary-soft-foreground", defaults.today),
        outside: cn("text-muted-foreground/60", defaults.outside),
        disabled: cn("text-muted-foreground opacity-40", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation = "down", ...rest }) => {
          const Caret = CHEVRONS[orientation];
          return <Caret className={cn("size-4", className)} {...rest} />;
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const end = modifiers.range_start || modifiers.range_end;
  const single = modifiers.selected && !end && !modifiers.range_middle;

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.isoDate}
      className={cn(
        "relative z-10 grid size-(--cell-size) place-items-center rounded-md text-sm tabular-nums transition-colors duration-(--duration-fast) outline-none",
        "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none",
        modifiers.range_middle && "rounded-none hover:bg-primary/15",
        (end || single) && "bg-primary font-bold text-primary-foreground hover:bg-primary-hover",
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
