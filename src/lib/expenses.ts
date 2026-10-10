import type { ExpenseCategory, ExpenseOut } from "@/lib/api/schema";
import { toPaisa, toTaka } from "@/lib/money";
import type { DayRange } from "@/lib/reports";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "ingredients",
  "salary",
  "rent",
  "utilities",
  "supplies",
  "maintenance",
  "marketing",
  "other",
];

/** "2026-10" moved by whole months. */
export function shiftMonth(month: string, months: number) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, index! - 1 + months, 1)).toISOString().slice(0, 7);
}

/** The days of a month that have happened: this month stops at today. */
export function monthRange(month: string, today: string): DayRange {
  const [year, index] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year!, index!, 0)).toISOString().slice(0, 10);
  return { from: `${month}-01`, to: last < today ? last : today };
}

const sum = (values: number[]) => toTaka(values.reduce((total, v) => total + toPaisa(v), 0));

export type CategorySpend = {
  category: ExpenseCategory;
  amount: number;
  count: number;
  share: number;
};

/** Spend per category, biggest first, with each one's share of the total. */
export function spendByCategory(expenses: ExpenseOut[]) {
  const total = sum(expenses.map((expense) => expense.amount));
  const groups = new Map<ExpenseCategory, ExpenseOut[]>();
  for (const expense of expenses) {
    groups.set(expense.category, [...(groups.get(expense.category) ?? []), expense]);
  }
  const categories: CategorySpend[] = [...groups]
    .map(([category, items]) => {
      const amount = sum(items.map((item) => item.amount));
      return { category, amount, count: items.length, share: total ? (amount / total) * 100 : 0 };
    })
    .sort((a, b) => b.amount - a.amount);
  return { total, categories };
}

export function matchesExpense(
  expense: ExpenseOut,
  { categories, search }: { categories: ExpenseCategory[]; search: string },
) {
  if (categories.length && !categories.includes(expense.category)) return false;
  const query = search.trim().toLowerCase();
  return (
    !query ||
    [expense.title, expense.paidTo, expense.notes].some((value) =>
      value?.toLowerCase().includes(query),
    )
  );
}
