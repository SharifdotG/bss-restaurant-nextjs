"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import {
  autoGroup,
  compareRange,
  GROUPS,
  matchPreset,
  presetRange,
  PRESETS,
  type DayRange,
  type Preset,
} from "@/lib/reports";

export const REPORT_TABS = ["sales", "dishes", "expenses", "staff"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const params = {
  tab: parseAsStringLiteral(REPORT_TABS).withDefault("sales"),
  range: parseAsStringLiteral(PRESETS),
  from: parseAsString,
  to: parseAsString,
  group: parseAsStringLiteral(GROUPS),
};

/**
 * The report's tab, dates and grouping, all in the address so a report can be shared or
 * bookmarked. Custom dates win over a preset; anything unreadable falls back to this month.
 */
export function useReportUrl(today: string) {
  const [url, setUrl] = useQueryStates(params, { history: "replace" });

  const custom =
    url.from && url.to && DAY.test(url.from) && DAY.test(url.to) && url.from <= url.to
      ? { from: url.from, to: url.to > today ? today : url.to }
      : null;
  const range: DayRange = custom ?? presetRange(url.range ?? "month", today);
  const preset: Preset | null = matchPreset(range, today);

  return {
    tab: url.tab,
    range,
    preset,
    compare: compareRange(range),
    groupBy: url.group ?? autoGroup(range),
    groupPicked: url.group !== null,
    setTab: (tab: ReportTab) => void setUrl({ tab: tab === "sales" ? null : tab }),
    setPreset: (next: Preset) =>
      void setUrl({ range: next === "month" ? null : next, from: null, to: null, group: null }),
    setRange: (next: DayRange) => {
      const named = matchPreset(next, today);
      void setUrl(
        named
          ? { range: named === "month" ? null : named, from: null, to: null, group: null }
          : { range: null, from: next.from, to: next.to, group: null },
      );
    },
    setGroup: (group: (typeof GROUPS)[number]) =>
      void setUrl({ group: group === autoGroup(range) ? null : group }),
  };
}

export type ReportUrl = ReturnType<typeof useReportUrl>;
