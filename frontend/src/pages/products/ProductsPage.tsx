import { useEffect } from "react";

import { useAuthState } from "../../app/auth";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { useProductsQuery } from "./modules/useProductsQuery";
import { useProductPrototypeState } from "./modules/useProductPrototypeState";
import { createDefaultProductFilters, type ProductRecord } from "./modules/types";
import { EmptyState } from "../../shared/ui/EmptyState";
import { SkeletonLoader } from "../../shared/ui/SkeletonLoader";

import styles from "./ProductsPage.module.css";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

function productTypeSummary(product: ProductRecord) {
  if (product.productType === "DURATION") {
    return `DURATION · ${product.validityDays ?? "-"}일`;
  }
  return `COUNT · ${product.totalCount ?? "-"}회`;
}

export default function ProductsPage() {
  const { authUser, isMockMode } = useAuthState();
  const {
    productFilters,
    setProductFilters,
    selectedProductId,
    selectedProduct,
    productForm,
    setProductForm,
    productFormMode,
    productFormOpen,
    productFormSubmitting,
    productPanelMessage,
    productPanelError,
    productFormError,
    clearProductFeedback,
    startCreateProduct,
    openProductEditor,
    closeProductForm,
    handleProductSubmit,
    handleProductStatusToggle
  } = useProductPrototypeState();
  const { products, productsLoading, productsQueryError, loadProducts, resetProductsQuery } = useProductsQuery({
    getDefaultFilters: createDefaultProductFilters
  });
  const canReadLiveProducts = isMockMode || authUser?.role === "ROLE_CENTER_ADMIN" || authUser?.role === "ROLE_DESK";
  const canMutateProducts = isMockMode || authUser?.role === "ROLE_CENTER_ADMIN";
  const productsPagination = usePagination(products, {
    initialPageSize: 10,
    resetDeps: [products.length, productFilters.category, productFilters.status]
  });

  useEffect(() => {
    if (!canReadLiveProducts) {
      resetProductsQuery();
      return;
    }
    void loadProducts(productFilters);
    return () => {
      resetProductsQuery();
    };
  }, [canReadLiveProducts, loadProducts, productFilters, resetProductsQuery]);

  useEffect(() => {
    if (!canMutateProducts && productFormOpen) {
      closeProductForm();
    }
  }, [canMutateProducts, closeProductForm, productFormOpen]);

  async function runSubmit() {
    const product = await handleProductSubmit();
    if (product) {
      await loadProducts(productFilters);
    }
  }

  async function runStatusToggle() {
    const product = await handleProductStatusToggle();
    if (product) {
      await loadProducts(productFilters);
    }
  }

  return (
    <section className={styles["members-prototype-layout"]}>
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>상품 관리 프로토타입</h1>
            <p>shared products domain 위에 `/products` 전용 CRUD form/action state를 얹어서 새 구조의 admin slice를 검증합니다.</p>
          </div>
          {canMutateProducts ? (
            <button type="button" className="secondary-button" onClick={startCreateProduct}>
              신규 등록
            </button>
          ) : null}
        </div>

        {!canReadLiveProducts ? (
          <div className="selected-member-card mb-md">
            <div className="selected-member-card-header">
              <div>
                <h2>이 역할은 live 상품 관리 미지원</h2>
                <p>현재 live backend는 상품 관리 화면을 관리자/데스크 읽기, 관리자 쓰기 범위로만 열어두고 있습니다.</p>
              </div>
            </div>
          </div>
        ) : null}

        {!isMockMode && authUser?.role === "ROLE_DESK" ? (
          <div className="selected-member-card mb-md">
            <div className="selected-member-card-header">
              <div>
                <h2>데스크 계정은 읽기 전용</h2>
                <p>상품 등록, 수정, 상태 변경은 관리자 계정에서만 수행할 수 있습니다.</p>
              </div>
            </div>
          </div>
        ) : null}

        <form
          className={styles["members-filter-grid"]}
          onSubmit={(event) => {
            event.preventDefault();
            if (!canReadLiveProducts) {
              return;
            }
            void loadProducts(productFilters);
          }}
        >
          <label>
            카테고리
            <select
              value={productFilters.category}
              onChange={(event) =>
                setProductFilters((prev) => ({
                  ...prev,
                  category: event.target.value as typeof prev.category
                }))
              }
            >
              <option value="">전체</option>
              <option value="MEMBERSHIP">MEMBERSHIP</option>
              <option value="PT">PT</option>
              <option value="GX">GX</option>
              <option value="ETC">ETC</option>
            </select>
          </label>
          <label>
            상태
            <select
              value={productFilters.status}
              onChange={(event) =>
                setProductFilters((prev) => ({
                  ...prev,
                  status: event.target.value as typeof prev.status
                }))
              }
            >
              <option value="">전체</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>
          <div className={styles["toolbar-actions"]}>
            <button type="submit" className="primary-button" disabled={productsLoading || !canReadLiveProducts}>
              {productsLoading ? "조회 중..." : "조회"}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!canReadLiveProducts}
              onClick={() => {
                if (!canReadLiveProducts) {
                  return;
                }
                clearProductFeedback();
                const nextFilters = createDefaultProductFilters();
                setProductFilters(nextFilters);
                void loadProducts(nextFilters);
              }}
            >
              초기화
            </button>
          </div>
        </form>

        {productPanelMessage ? <p>{productPanelMessage}</p> : null}
        {productPanelError || productsQueryError ? <p className="error-text">{productPanelError ?? productsQueryError}</p> : null}

        <div className={styles["table-shell"]}>
          <table className="members-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>상품명</th>
                <th>카테고리</th>
                <th>유형</th>
                <th>가격</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {productsPagination.pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles["empty-cell"]}>
                    {!canReadLiveProducts
                      ? "현재 역할에서는 live 상품 목록을 조회할 수 없습니다."
                      : productsLoading
                        ? <SkeletonLoader type="rectangular" height={40} />
                        : <EmptyState message="조회된 상품이 없습니다." />}
                  </td>
                </tr>
              ) : (
                productsPagination.pagedItems.map((product) => (
                  <tr key={product.productId} className={product.productId === selectedProductId ? "is-selected" : ""}>
                    <td>{product.productId}</td>
                    <td>{product.productName}</td>
                    <td>{product.productCategory ?? "-"}</td>
                    <td>{productTypeSummary(product)}</td>
                    <td>{formatCurrency(product.priceAmount)}</td>
                    <td>
                      <span className={product.productStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                        {product.productStatus}
                      </span>
                    </td>
                    <td>
                      {canMutateProducts ? (
                        <button type="button" className="secondary-button" onClick={() => openProductEditor(product)}>
                          편집
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={productsPagination.page}
          totalPages={productsPagination.totalPages}
          pageSize={productsPagination.pageSize}
          pageSizeOptions={[10, 20]}
          totalItems={productsPagination.totalItems}
          startItemIndex={productsPagination.startItemIndex}
          endItemIndex={productsPagination.endItemIndex}
          onPageChange={productsPagination.setPage}
          onPageSizeChange={productsPagination.setPageSize}
        />
      </article>

      <aside className="panel-card">
        <div className="panel-card-header">
          <div>
            <h2>{productFormMode === "create" ? "상품 등록" : `상품 수정 #${selectedProductId ?? "-"}`}</h2>
            <p>page-local form state만 이 패널이 소유하고, product read는 shared domain에서 유지합니다.</p>
          </div>
          {productFormOpen && productFormMode === "edit" && selectedProduct ? (
            <button
              type="button"
              className="secondary-button"
              disabled={productFormSubmitting || !canMutateProducts}
              onClick={() => void runStatusToggle()}
            >
              상태 토글 ({selectedProduct.productStatus})
            </button>
          ) : null}
        </div>

        {!canMutateProducts ? (
          <p>이 역할에서는 상품 편집/등록을 사용할 수 없습니다.</p>
        ) : !productFormOpen ? (
          <p>등록 또는 편집을 시작하면 이 패널에 form이 열립니다.</p>
        ) : (
          <form
            className={styles["members-filter-grid"]}
            onSubmit={(event) => {
              event.preventDefault();
              void runSubmit();
            }}
          >
            {productFormError ? <p className="error-text">{productFormError}</p> : null}
            <label>
              상품명
              <input
                value={productForm.productName}
                onChange={(event) => setProductForm((prev) => ({ ...prev, productName: event.target.value }))}
              />
            </label>
            <label>
              카테고리
              <select
                value={productForm.productCategory}
                onChange={(event) =>
                  setProductForm((prev) => ({
                    ...prev,
                    productCategory: event.target.value as typeof prev.productCategory
                  }))
                }
              >
                <option value="">선택 안함</option>
                <option value="MEMBERSHIP">MEMBERSHIP</option>
                <option value="PT">PT</option>
                <option value="GX">GX</option>
                <option value="ETC">ETC</option>
              </select>
            </label>
            <label>
              유형
              <select
                value={productForm.productType}
                onChange={(event) =>
                  setProductForm((prev) => ({
                    ...prev,
                    productType: event.target.value as typeof prev.productType
                  }))
                }
              >
                <option value="DURATION">DURATION</option>
                <option value="COUNT">COUNT</option>
              </select>
            </label>
            <label>
              가격
              <input
                value={productForm.priceAmount}
                onChange={(event) => setProductForm((prev) => ({ ...prev, priceAmount: event.target.value }))}
              />
            </label>
            <label>
              유효일수
              <input
                value={productForm.validityDays}
                disabled={productForm.productType !== "DURATION"}
                onChange={(event) => setProductForm((prev) => ({ ...prev, validityDays: event.target.value }))}
              />
            </label>
            <label>
              총횟수
              <input
                value={productForm.totalCount}
                disabled={productForm.productType !== "COUNT"}
                onChange={(event) => setProductForm((prev) => ({ ...prev, totalCount: event.target.value }))}
              />
            </label>
            <label>
              상태
              <select
                value={productForm.productStatus}
                onChange={(event) =>
                  setProductForm((prev) => ({
                    ...prev,
                    productStatus: event.target.value as typeof prev.productStatus
                  }))
                }
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            <label className={styles["checkbox-row"]}>
              <input
                type="checkbox"
                checked={productForm.allowHold}
                onChange={(event) => setProductForm((prev) => ({ ...prev, allowHold: event.target.checked }))}
              />
              홀딩 허용
            </label>
            <label>
              최대 홀딩일
              <input
                value={productForm.maxHoldDays}
                disabled={!productForm.allowHold}
                onChange={(event) => setProductForm((prev) => ({ ...prev, maxHoldDays: event.target.value }))}
              />
            </label>
            <label>
              최대 홀딩횟수
              <input
                value={productForm.maxHoldCount}
                disabled={!productForm.allowHold}
                onChange={(event) => setProductForm((prev) => ({ ...prev, maxHoldCount: event.target.value }))}
              />
            </label>
            <label className={styles["checkbox-row"]}>
              <input
                type="checkbox"
                checked={productForm.allowTransfer}
                onChange={(event) => setProductForm((prev) => ({ ...prev, allowTransfer: event.target.checked }))}
              />
              양도 허용
            </label>
            <label className={styles["full-span"]}>
              설명
              <textarea
                value={productForm.description}
                onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
            <div className={`${styles["toolbar-actions"]} ${styles["full-span"]}`}>
              <button type="submit" className="primary-button" disabled={productFormSubmitting}>
                {productFormSubmitting ? "저장 중..." : productFormMode === "create" ? "상품 등록" : "상품 저장"}
              </button>
              <button type="button" className="secondary-button" onClick={closeProductForm}>
                닫기
              </button>
            </div>
          </form>
        )}
      </aside>
    </section>
  );
}
