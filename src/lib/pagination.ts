/**
 * The page buttons to show: always the first and last, the current one with a neighbour
 * each side, and a gap marker where pages are skipped. Seven slots at most.
 *
 *   pageWindow(6, 12) → [1, "gap", 5, 6, 7, "gap", 12]
 */
export function pageWindow(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "gap", pages];
  if (page >= pages - 3) return [1, "gap", pages - 4, pages - 3, pages - 2, pages - 1, pages];
  return [1, "gap", page - 1, page, page + 1, "gap", pages];
}

/** "Showing 11–20 of 24": the first and last row numbers on a page. */
export function pageRange(page: number, size: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * size + 1;
  return { from, to: Math.min(total, from + size - 1) };
}
