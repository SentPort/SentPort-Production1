export const RESULTS_PER_PAGE = 10;

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function calculatePagination<T>(
  items: T[],
  currentPage: number
): PaginationInfo {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / RESULTS_PER_PAGE));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));

  const startIndex = (safePage - 1) * RESULTS_PER_PAGE;
  const endIndex = Math.min(startIndex + RESULTS_PER_PAGE, totalItems);

  return {
    currentPage: safePage,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
}

export function paginateResults<T>(
  items: T[],
  currentPage: number
): T[] {
  const { startIndex, endIndex } = calculatePagination(items, currentPage);
  return items.slice(startIndex, endIndex);
}

export function getPageFromUrl(searchParams: URLSearchParams): number {
  const pageParam = searchParams.get('page');
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  return isNaN(page) || page < 1 ? 1 : page;
}

export function updatePageInUrl(
  page: number,
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams) => void
): void {
  const newParams = new URLSearchParams(searchParams);
  if (page > 1) {
    newParams.set('page', page.toString());
  } else {
    newParams.delete('page');
  }
  setSearchParams(newParams);
}
