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
  const canMovePrev = page > 1;
  const canMoveNext = page < totalPages;

  return (
    <nav className="pagination-controls" aria-label="목록 페이지네이션">
      <div className="pagination-summary" aria-live="polite">
        <strong>{totalItems.toLocaleString()}건</strong>
        <span>
          {totalItems === 0 ? "0건" : `${startItemIndex}-${endItemIndex}건 표시`}
        </span>
      </div>

      <div className="pagination-actions">
        <label className="pagination-size">
          <span>페이지당</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="페이지당 표시 개수"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}개
              </option>
            ))}
          </select>
        </label>

        <div className="pagination-buttons">
          <button
            type="button"
            className="secondary-button pagination-button"
            onClick={() => onPageChange(page - 1)}
            disabled={!canMovePrev}
            aria-label="이전 페이지"
          >
            이전
          </button>

          <div className="pagination-page-list" aria-label="페이지 번호">
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === page ? "pagination-page is-active" : "pagination-page"}
                onClick={() => onPageChange(pageNumber)}
                aria-current={pageNumber === page ? "page" : undefined}
              >
                {pageNumber}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="secondary-button pagination-button"
            onClick={() => onPageChange(page + 1)}
            disabled={!canMoveNext}
            aria-label="다음 페이지"
          >
            다음
          </button>
        </div>
      </div>
    </nav>
  );
}
