"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { waitersQuery } from "@/lib/api/queries";

type StaffPickerProps = {
  value: number[];
  onChange: (ids: number[]) => void;
  "aria-labelledby"?: string;
};

/** Waiters and managers who can look after a table, ticked on or off. */
export function StaffPicker({ value, onChange, ...props }: StaffPickerProps) {
  const t = useTranslations("tables.staff");
  const people = useQuery(waitersQuery).data;

  if (!people) {
    return (
      <div className="grid gap-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }
  if (people.length === 0) return <p className="text-sm text-muted-foreground">{t("none")}</p>;

  return (
    <ul role="group" className="grid gap-1.5" {...props}>
      {people.map((person) => {
        const checked = value.includes(person.id);
        return (
          <li key={person.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors duration-(--duration-fast) hover:bg-muted has-data-checked:border-primary/40 has-data-checked:bg-primary-soft">
              <Checkbox
                checked={checked}
                onCheckedChange={(next) =>
                  onChange(next ? [...value, person.id] : value.filter((id) => id !== person.id))
                }
              />
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{initials(person.fullName)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{person.fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {person.designation}
                  {person.tables.length > 0 &&
                    ` · ${t("has", { tables: person.tables.map((table) => table.number).join(", ") })}`}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
