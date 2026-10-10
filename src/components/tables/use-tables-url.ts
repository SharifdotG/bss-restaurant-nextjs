"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

const params = { q: parseAsString, area: parseAsString, staff: parseAsInteger };

/** Search and filters for the Tables page, kept in the address. */
export function useTablesUrl() {
  const [url, setUrl] = useQueryStates(params, { history: "replace" });
  return {
    search: url.q ?? "",
    area: url.area,
    staff: url.staff,
    setSearch: (q: string) => void setUrl({ q: q || null }),
    setArea: (area: string | null) => void setUrl({ area }),
    setStaff: (staff: number | null) => void setUrl({ staff }),
  };
}
