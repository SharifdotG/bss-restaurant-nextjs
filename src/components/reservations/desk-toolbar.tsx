"use client";

import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shiftDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SHOW, type DeskUrl, type Show } from "./use-desk-url";

/** Day stepping, search and the two filters above the grid. */
export function DeskToolbar({
  url,
  today,
  areas,
}: {
  url: DeskUrl;
  today: string;
  areas: string[];
}) {
  const t = useTranslations("reservations.toolbar");
  const show = useTranslations("reservations.show");
  const { searching } = url;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label={t("previous")}
        disabled={searching}
        onClick={() => url.setDay(shiftDay(url.day, -1))}
      >
        <CaretLeftIcon />
      </Button>
      <DatePicker
        value={url.day}
        onChange={url.setDay}
        className="w-auto min-w-48"
        aria-label={t("day")}
      />
      <Button
        variant="outline"
        size="icon"
        aria-label={t("next")}
        disabled={searching}
        onClick={() => url.setDay(shiftDay(url.day, 1))}
      >
        <CaretRightIcon />
      </Button>
      {!url.isToday && (
        <Button variant="ghost" onClick={() => url.setDay(today)}>
          {t("today")}
        </Button>
      )}
      <div className="ml-auto flex w-full flex-wrap gap-2 lg:w-auto">
        <SearchBox url={url} className="min-w-0 flex-1 lg:w-72 lg:flex-none" />
        {!searching && (
          <>
            <Select
              value={url.show}
              onValueChange={(next) => next && url.setShow(next as Show)}
              items={SHOW.map((value) => ({ value, label: show(value) }))}
            >
              <SelectTrigger className="w-auto min-w-36" aria-label={t("show")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {SHOW.map((value) => (
                  <SelectItem key={value} value={value}>
                    {show(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {areas.length > 1 && (
              <Select
                value={url.area ?? ""}
                onValueChange={(next) => url.setArea(next || null)}
                items={[
                  { value: "", label: t("allAreas") },
                  ...areas.map((area) => ({ value: area, label: area })),
                ]}
              >
                <SelectTrigger className="w-auto min-w-36" aria-label={t("area")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="">{t("allAreas")}</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Name, phone or booking code. The address holds the text; the results wait for a pause. */
export function SearchBox({ url, className }: { url: DeskUrl; className?: string }) {
  const t = useTranslations("reservations.toolbar");

  return (
    <div className={cn("relative", className)}>
      <IconInput
        icon={MagnifyingGlassIcon}
        type="search"
        inputMode="search"
        value={url.search}
        onChange={(event) => url.setSearch(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && url.setSearch("")}
        placeholder={t("search")}
        aria-label={t("search")}
        className="pr-9"
      />
      {url.search && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("clear")}
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={() => url.setSearch("")}
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
}
