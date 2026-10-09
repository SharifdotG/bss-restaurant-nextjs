"use client";

import { useState } from "react";
import { CalendarBlankIcon, CaretUpDownIcon } from "@phosphor-icons/react";
import { bn } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { businessDate, dayToDate, TIME_ZONE } from "@/lib/format";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  /** An API date, "2026-10-11". */
  value: string;
  onChange: (day: string) => void;
  /** Days before this can't be picked. */
  from?: string;
  /** Days after this can't be picked. */
  to?: string;
  /** The button's text; the date with its weekday when left out. */
  label?: string;
  className?: string;
  "aria-label"?: string;
};

/** A button showing a day, opening a month to pick another. Picking closes it. */
export function DatePicker({
  value,
  onChange,
  from,
  to,
  label,
  className,
  ...props
}: DatePickerProps) {
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const disabled = [
    ...(from ? [{ before: dayToDate(from) }] : []),
    ...(to ? [{ after: dayToDate(to) }] : []),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn("justify-start tabular-nums", className)}
            aria-label={props["aria-label"]}
          />
        }
      >
        <CalendarBlankIcon />
        <span className="flex-1 truncate text-left">{label ?? format.dayWithWeekday(value)}</span>
        <CaretUpDownIcon className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-24px)]">
        <Calendar
          mode="single"
          required
          selected={dayToDate(value)}
          onSelect={(date) => {
            onChange(businessDate(date));
            setOpen(false);
          }}
          defaultMonth={dayToDate(value)}
          disabled={disabled}
          timeZone={TIME_ZONE}
          locale={format.locale === "bn" ? bn : undefined}
          numerals={format.locale === "bn" ? "beng" : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
