"use client";

import { useTranslations } from "next-intl";
import { DateRangePicker } from "@/components/date-range-picker";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GROUPS, PRESETS } from "@/lib/reports";
import { cn } from "@/lib/utils";
import type { ReportUrl } from "./use-report-url";

type RangeBarProps = {
  url: ReportUrl;
  today: string;
  /** Only the sales report is broken into periods. */
  grouping: boolean;
  className?: string;
};

/** Quick ranges, a calendar for anything else, and how to group the rows. */
export function RangeBar({ url, today, grouping, className }: RangeBarProps) {
  const t = useTranslations("reports.range");
  const groups = GROUPS.map((value) => ({ value, label: t(`groups.${value}`) }));

  return (
    <div className={cn("flex max-w-full min-w-0 flex-wrap items-center gap-2", className)}>
      {/* Five presets don't fit a phone, so they scroll sideways there. */}
      <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 md:mx-0 md:max-w-full md:px-0">
        <Segmented
          aria-label={t("label")}
          value={url.preset ?? "custom"}
          onValueChange={(next) => next !== "custom" && url.setPreset(next)}
          options={PRESETS.map((value) => ({ value, label: t(`presets.${value}`) }))}
          className="whitespace-nowrap"
        />
      </div>
      <DateRangePicker value={url.range} onChange={url.setRange} today={today} />
      {grouping && (
        <Select
          value={url.groupBy}
          onValueChange={(next) => next && url.setGroup(next)}
          items={groups}
        >
          <SelectTrigger className="w-auto min-w-32" aria-label={t("groupLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {groups.map((group) => (
              <SelectItem key={group.value} value={group.value}>
                {group.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
