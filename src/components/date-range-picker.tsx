"use client";

import { useState } from "react";
import { CalendarBlankIcon, CaretDownIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { DateRange as PickedRange } from "react-day-picker";
import { bn } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { businessDate, dayToDate, shiftDay, TIME_ZONE } from "@/lib/format";
import { rangeDays, type DayRange } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  value: DayRange;
  onChange: (range: DayRange) => void;
  /** Today's business date; nothing after it can be picked. */
  today: string;
  className?: string;
};

/** A button showing the range, opening a calendar to pick a new one. Nothing applies until Apply. */
export function DateRangePicker({ value, onChange, today, className }: DateRangePickerProps) {
  const t = useTranslations("common.range");
  const format = useFormat();
  const phone = useShellLayout() === "phone";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PickedRange | undefined>();

  const from = draft?.from && businessDate(draft.from);
  const to = draft?.to ? businessDate(draft.to) : from;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft({ from: dayToDate(value.from), to: dayToDate(value.to) });
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={<Button variant="outline" className={cn("tabular-nums", className)} />}
      >
        <CalendarBlankIcon />
        {format.dayRange(value.from, value.to)}
        <CaretDownIcon className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-24px)]">
        <Calendar
          mode="range"
          selected={draft}
          onSelect={setDraft}
          resetOnSelect
          numberOfMonths={phone ? 1 : 2}
          // Two months side by side end on the range's last month.
          defaultMonth={dayToDate(phone ? value.to : shiftDay(value.to.slice(0, 8) + "01", -1))}
          disabled={{ after: dayToDate(today) }}
          timeZone={TIME_ZONE}
          locale={format.locale === "bn" ? bn : undefined}
          numerals={format.locale === "bn" ? "beng" : undefined}
        />
        <div className="flex items-center gap-3 border-t border-border px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground tabular-nums">
            {from && to
              ? t("summary", { range: format.dayRange(from, to), n: rangeDays({ from, to }) })
              : t("hint")}
          </p>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            disabled={!from || !to}
            onClick={() => {
              if (from && to) onChange({ from, to });
              setOpen(false);
            }}
          >
            {t("apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
