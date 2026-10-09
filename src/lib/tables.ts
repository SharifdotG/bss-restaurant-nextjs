import type { TableOut } from "@/lib/api/schema";

/**
 * Where a table's QR code sends guests. It has no locale, so the guest's own language is
 * picked on arrival, and it stays the same through redesigns of the guest pages.
 */
export const qrLink = (origin: string, token: string) => `${origin}/t/${token}`;

/** The first few characters of a QR token, enough to match a printed card to its table. */
export const shortCode = (token: string) => token.slice(0, 6);

/** Areas already in use, for the area field's suggestions. */
export const areaNames = (tables: readonly Pick<TableOut, "location">[]) =>
  [...new Set(tables.map((table) => table.location?.trim()).filter(Boolean) as string[])].toSorted(
    (a, b) => a.localeCompare(b),
  );

export const seatCount = (tables: readonly Pick<TableOut, "seats">[]) =>
  tables.reduce((sum, table) => sum + table.seats, 0);

/** Search by number or area, the way the API's search matches. */
export const matchesTable = (table: Pick<TableOut, "number" | "location">, search: string) => {
  const needle = search.trim().toLowerCase();
  return (
    !needle ||
    table.number.toLowerCase().includes(needle) ||
    Boolean(table.location?.toLowerCase().includes(needle))
  );
};
