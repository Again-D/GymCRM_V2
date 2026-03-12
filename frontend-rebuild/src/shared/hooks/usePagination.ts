import { useEffect, useMemo, useState } from "react";

type UsePaginationOptions = {
  initialPage?: number;
  initialPageSize?: number;
  resetDeps?: readonly unknown[];
};

type UsePaginationResult<T> = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  pagedItems: T[];
  startItemIndex: number;
  endItemIndex: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

function clampPage(page: number, totalPages: number) {
  if (totalPages <= 0) {
    return 1;
  }

  return Math.min(Math.max(page, 1), totalPages);
}

export function usePagination<T>(items: readonly T[], options: UsePaginationOptions = {}): UsePaginationResult<T> {
  const { initialPage = 1, initialPageSize = 10, resetDeps = [] } = options;
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

  useEffect(() => {
    setPageState(1);
  }, resetDeps);

  useEffect(() => {
    setPageState((currentPage) => clampPage(currentPage, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, page, pageSize]);

  const startItemIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItemIndex = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    pagedItems,
    startItemIndex,
    endItemIndex,
    setPage: (nextPage) => setPageState(clampPage(nextPage, totalPages)),
    setPageSize: (nextPageSize) => setPageSizeState(nextPageSize)
  };
}
