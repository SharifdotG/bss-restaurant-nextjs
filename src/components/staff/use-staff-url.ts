"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { UserRole } from "@/lib/api/schema";
import { ROLES } from "@/lib/staff";

const SHOWS = ["current", "noSignIn", "left"] as const;

const params = {
  q: parseAsString,
  role: parseAsStringLiteral(ROLES as UserRole[]),
  show: parseAsStringLiteral(SHOWS),
};

/** Search and filters for the Staff page, kept in the address. */
export function useStaffUrl() {
  const [url, setUrl] = useQueryStates(params, { history: "replace" });
  return {
    search: url.q ?? "",
    role: url.role,
    show: url.show ?? "current",
    setSearch: (q: string) => void setUrl({ q: q || null }),
    setRole: (role: UserRole | null) => void setUrl({ role }),
    setShow: (show: (typeof SHOWS)[number]) =>
      void setUrl({ show: show === "current" ? null : show }),
  };
}

export { SHOWS as STAFF_SHOWS };
