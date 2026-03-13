type PaginationControlsProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalItems: number;
  startItemIndex: number;
  endItemIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

function buildVisiblePages(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export function PaginationControls({
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  totalItems,
  startItemIndex,
  endItemIndex,
  onPageChange,
  onPageSizeChange
}: PaginationControlsProps) {
  const visiblePages = buildVisiblePages(page, totalPages);

  return (
    <nav className="pagination-controls" aria-label="목록 페이지네이션">
      <div className="pagination-summary" aria-live="polite">
        <strong>{totalItems.toLocaleString()}건</strong>
        <span>{totalItems === 0 ? "0건" : `${startItemIndex}-${endItemIndex}건 표시`}</span>
      </div>

      <div className="pagination-actions">
        <label className="pagination-size">
          <span>페이지당</span>
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}개
              </option>
            ))}
          </select>
        </label>

        <div className="pagination-buttons">
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            이전
          </button>
          <div className="pagination-page-list">
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === page ? "pagination-page is-active" : "pagination-page"}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            다음
          </button>
        </div>
      </div>
    </nav>
  );
}
