"use client";

import { createParser, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { MENU_SHOWS } from "@/lib/menu";

// A category id, or "none" for dishes that haven't been given one.
const parseAsCategory = createParser({
  parse: (value): number | "none" | null =>
    value === "none" ? "none" : /^\d+$/.test(value) ? Number(value) : null,
  serialize: (value: number | "none") => String(value),
});

const params = {
  category: parseAsCategory,
  q: parseAsString,
  show: parseAsStringLiteral(MENU_SHOWS),
};

/** The Menu page's category, search and filter, kept in the address. */
export function useMenuUrl() {
  const [url, setUrl] = useQueryStates(params, { history: "replace" });
  return {
    category: url.category,
    search: url.q ?? "",
    show: url.show ?? "all",
    setCategory: (category: number | "none" | null) => void setUrl({ category }),
    setSearch: (q: string) => void setUrl({ q: q || null }),
    setShow: (show: (typeof MENU_SHOWS)[number]) =>
      void setUrl({ show: show === "all" ? null : show }),
  };
}
