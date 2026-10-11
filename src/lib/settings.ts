import type { RestaurantOut, RestaurantUpdate } from "@/lib/api/schema";
import { toPaisa, toTaka } from "@/lib/money";

const percentOf = (paisa: number, rate: number) => Math.round((paisa * rate) / 100);

/**
 * A bill's charges the way the API adds them up: service charge on the food (dine-in only),
 * then VAT on the food and the service charge together, each rounded half up to the paisa.
 */
export function billTotals(food: number, servicePercent: number, vatPercent: number) {
  const foodPaisa = toPaisa(food);
  const service = percentOf(foodPaisa, servicePercent);
  const vat = percentOf(foodPaisa + service, vatPercent);
  return {
    service: toTaka(service),
    vat: toTaka(vat),
    total: toTaka(foodPaisa + service + vat),
  };
}

/** "HH:MM" every `step` minutes through the day, for the opening hours pickers. */
export function timeSteps(step = 30) {
  return Array.from({ length: (24 * 60) / step }, (_, i) => {
    const minutes = i * step;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
}

export type SettingsDraft = Required<{
  [K in keyof RestaurantUpdate]: NonNullable<RestaurantUpdate[K]> | null;
}>;

/** Only what changed, so saving one switch doesn't rewrite every field someone else just set. */
export function settingsChanges(saved: RestaurantOut, draft: Partial<SettingsDraft>) {
  const changes: RestaurantUpdate = {};
  for (const [key, value] of Object.entries(draft) as [keyof RestaurantUpdate, unknown][]) {
    const before = saved[key as keyof RestaurantOut];
    const same =
      key === "opensAt" || key === "closesAt"
        ? String(before).slice(0, 5) === String(value).slice(0, 5)
        : before === value || (before == null && value === null);
    if (!same) Object.assign(changes, { [key]: value });
  }
  return changes;
}
