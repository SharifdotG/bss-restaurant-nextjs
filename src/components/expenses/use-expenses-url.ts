"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ExpenseCategory } from "@/lib/api/schema";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";

const params = {
  month: parseAsString,
  q: parseAsString,
  category: parseAsStringLiteral(EXPENSE_CATEGORIES),
};

/** The month, search and category on the Expenses page, kept in the address. */
export function useExpensesUrl(thisMonth: string) {
  const [url, setUrl] = useQueryStates(params, { history: "replace" });
  const month =
    url.month && /^\d{4}-\d{2}$/.test(url.month) && url.month <= thisMonth ? url.month : thisMonth;
  return {
    month,
    search: url.q ?? "",
    category: url.category,
    setMonth: (next: string) => void setUrl({ month: next === thisMonth ? null : next }),
    setSearch: (q: string) => void setUrl({ q: q || null }),
    setCategory: (category: ExpenseCategory | null) => void setUrl({ category }),
  };
}
