export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  pageCount: number;
  totalItems: number;
}

export function paginate<T>(
  items: T[],
  totalItems: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalItems / pageSize)),
    totalItems,
  };
}
