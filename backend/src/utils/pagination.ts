export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const resolvePagination = (
  page?: number,
  pageSize?: number,
): PaginationParams => {
  const resolvedPage = page && page > 0 ? page : DEFAULT_PAGE;
  const resolvedSize = Math.min(
    pageSize && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );
  return {
    page: resolvedPage,
    pageSize: resolvedSize,
    skip: (resolvedPage - 1) * resolvedSize,
    take: resolvedSize,
  };
};

export const buildPaginatedResult = <T>(
  items: T[],
  total: number,
  pagination: PaginationParams,
): PaginatedResult<T> => ({
  items,
  page: pagination.page,
  pageSize: pagination.pageSize,
  total,
  totalPages: Math.ceil(total / pagination.pageSize) || 0,
});
