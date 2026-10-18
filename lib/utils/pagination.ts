/**
 * Generic mathematical helpers for offset-based pagination.
 */

/**
 * Calculates total pages required for offset pagination given a total item count and page size.
 * Always returns at least 1.
 */
export function calculateTotalPages(totalCount: number, pageSize: number): number {
  if (totalCount <= 0 || pageSize <= 0) return 1;
  return Math.ceil(totalCount / pageSize);
}

/**
 * Calculates the 1-based start and end indices of displayed items for pagination summary bars.
 */
export function calculateItemRange(
  page: number,
  pageSize: number,
  totalCount: number
): { start: number; end: number } {
  if (totalCount <= 0 || page <= 0 || pageSize <= 0) return { start: 0, end: 0 };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  return { start, end };
}

/**
 * Calculates the database query skip offset given a 1-indexed page number and page size.
 */
export function calculateSkipOffset(page: number, pageSize: number): number {
  if (page <= 1 || pageSize <= 0) return 0;
  return (page - 1) * pageSize;
}
