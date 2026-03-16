import { useEffect, useState } from "react";

import { useAuthState } from "../../app/auth";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { useProductsQuery } from "./modules/useProductsQuery";
import { useProductPrototypeState } from "./modules/useProductPrototypeState";
import { createDefaultProductFilters, type ProductRecord } from "./modules/types";
import { Modal } from "../../shared/ui/Modal";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

function productTypeSummary(product: ProductRecord) {
  if (product.productType === "DURATION") {
    return `기간형 · ${product.validityDays ?? "-"}일`;
  }
  return `횟수형 · ${product.totalCount ?? "-"}회`;
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
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">상품 카탈로그</span>
          <h1 className="ops-title">상품 및 서비스 관리</h1>
          <p className="ops-subtitle">회원권, PT, 그룹수업, 기타 상품을 한 곳에서 관리할 수 있는 카탈로그 화면입니다.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">카탈로그 필터</span>
            <span className="ops-meta__pill">상태 제어</span>
            <span className="ops-meta__pill">모달 편집</span>
          </div>
        </div>
        {canMutateProducts && (
          <button type="button" className="primary-button" onClick={startCreateProduct}>
            신규 상품 등록
          </button>
        )}
      </div>

      <div className="ops-kpi-grid">
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">조회 상품 수</span>
          <span className="ops-kpi-card__value">{products.length}</span>
          <span className="ops-kpi-card__hint">현재 조건으로 불러온 상품 수입니다.</span>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">활성 상품</span>
          <span className="ops-kpi-card__value">{products.filter((product) => product.productStatus === "ACTIVE").length}</span>
          <span className="ops-kpi-card__hint">판매 또는 배정 가능한 활성 상품 수입니다.</span>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">편집 모드</span>
          <span className="ops-kpi-card__value">{productFormOpen ? (productFormMode === "create" ? "등록" : "수정") : "-"}</span>
          <span className="ops-kpi-card__hint">{selectedProduct ? selectedProduct.productName : "현재 열린 모달이 없습니다."}</span>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">라이브 접근</span>
          <span className="ops-kpi-card__value">{canReadLiveProducts ? "가능" : "잠김"}</span>
          <span className="ops-kpi-card__hint">권한에 따라 조회 및 수정 가능 여부가 달라집니다.</span>
        </div>
      </div>

      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">상품 목록</h2>
            <p className="ops-section__subtitle">분류와 상태를 기준으로 상품을 필터링하고 모달 편집을 열 수 있습니다.</p>
          </div>
        </div>

        <div className="members-filter-grid" style={{ marginBottom: '24px' }}>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">상품 분류</span>
            <select
              className="input"
              value={productFilters.category}
              onChange={(event) =>
                setProductFilters((prev) => ({
                  ...prev,
                  category: event.target.value as typeof prev.category
                }))
              }
            >
              <option value="">전체 분류</option>
              <option value="MEMBERSHIP">회원권</option>
              <option value="PT">PT</option>
              <option value="GX">그룹수업</option>
              <option value="ETC">기타</option>
            </select>
          </label>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">판매 상태</span>
            <select
              className="input"
              value={productFilters.status}
              onChange={(event) =>
                setProductFilters((prev) => ({
                  ...prev,
                  status: event.target.value as typeof prev.status
                }))
              }
            >
              <option value="">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
            </select>
          </label>
          <div className="row-actions" style={{ alignItems: 'flex-end', marginLeft: 'auto' }}>
             <button
                type="button"
                className="secondary-button"
                disabled={!canReadLiveProducts}
                onClick={() => {
                  clearProductFeedback();
                  const nextFilters = createDefaultProductFilters();
                  setProductFilters(nextFilters);
                  void loadProducts(nextFilters);
                }}
              >
                필터 초기화
              </button>
              <button type="button" className="secondary-button" onClick={() => void loadProducts(productFilters)} disabled={productsLoading || !canReadLiveProducts}>
                {productsLoading ? "동기화 중..." : "적용"}
              </button>
          </div>
        </div>

        {!canReadLiveProducts && (
          <div className="field-ops-note field-ops-note--restricted mb-md">
            <span className="field-ops-note__label">라이브 제한</span>
            <div className="mt-xs text-sm">현재 권한에서는 실시간 상품 카탈로그를 조회하거나 수정할 수 없습니다.</div>
          </div>
        )}

        {(productPanelMessage || productPanelError || productsQueryError) && (
          <div className="ops-feedback-stack mb-md">
            {productPanelMessage && <div className="pill ok full-span">{productPanelMessage}</div>}
            {(productPanelError || productsQueryError) && <div className="pill danger full-span">{productPanelError ?? productsQueryError}</div>}
          </div>
        )}

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>상품 정보</th>
                <th>분류</th>
                <th>가격</th>
                <th>상태</th>
                <th style={{ textAlign: 'right' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {productsPagination.pagedItems.map((product) => (
                <tr key={product.productId} className={product.productId === selectedProductId ? "is-selected-row" : ""}>
                  <td>
                    <div className="stack-sm">
                      <span className="text-sm brand-title">{product.productName}</span>
                      <span className="text-xs text-muted">ID: #{product.productId} · {productTypeSummary(product)}</span>
                    </div>
                  </td>
                  <td><span className="pill muted">{product.productCategory ?? "미분류"}</span></td>
                  <td><span className="brand-title text-sm">{formatCurrency(product.priceAmount)}</span></td>
                  <td>
                    <span className={product.productStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                      {product.productStatus}
                    </span>
                  </td>
                  <td className="ops-right">
                    {canMutateProducts && (
                      <button type="button" className="secondary-button ops-action-button" onClick={() => openProductEditor(product)}>
                        관리
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {productsPagination.pagedItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    {!canReadLiveProducts ? "현재 권한에서는 상품 정보를 조회할 수 없습니다." : "등록된 상품이 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-md">
          <PaginationControls {...productsPagination} pageSizeOptions={[10, 20]} onPageChange={productsPagination.setPage} onPageSizeChange={productsPagination.setPageSize} />
        </div>
      </article>

      {/* PRODUCT EDITOR MODAL */}
      <Modal
        isOpen={productFormOpen}
        onClose={closeProductForm}
        title={productFormMode === "create" ? "신규 상품 등록" : `상품 #${selectedProductId} 수정`}
        footer={
          <>
            <button className="secondary-button" onClick={closeProductForm}>취소</button>
            <button 
              className="primary-button" 
              onClick={() => void runSubmit()}
              disabled={productFormSubmitting}
            >
              {productFormSubmitting ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <div className="stack-md">
          {productFormMode === "edit" && selectedProduct && (
             <div className="row-actions" style={{ justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ fontSize: '11px', color: selectedProduct.productStatus === "ACTIVE" ? 'var(--status-danger)' : 'var(--status-ok)' }}
                  disabled={productFormSubmitting || !canMutateProducts}
                  onClick={() => void runStatusToggle()}
                >
                  {selectedProduct.productStatus === "ACTIVE" ? "비활성으로 변경" : "활성으로 변경"}
                </button>
             </div>
          )}

          {productFormError && <div className="pill danger full-span">{productFormError}</div>}

          <div className="ops-field-grid-2">
            <label className="stack-sm">
              <span className="text-sm">상품명</span>
              <input
                className="input"
                placeholder="상품명을 입력하세요"
                value={productForm.productName}
                onChange={(event) => setProductForm((prev) => ({ ...prev, productName: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-sm">분류</span>
              <select
                className="input"
                value={productForm.productCategory}
                onChange={(event) =>
                  setProductForm((prev) => ({
                    ...prev,
                    productCategory: event.target.value as typeof prev.productCategory
                  }))
                }
              >
                <option value="">-- 분류 선택 --</option>
                <option value="MEMBERSHIP">회원권</option>
                <option value="PT">PT</option>
                <option value="GX">그룹수업</option>
                <option value="ETC">기타 서비스</option>
              </select>
            </label>
          </div>

          <div className="ops-field-grid-2">
            <label className="stack-sm">
              <span className="text-sm">상품 유형</span>
              <select
                className="input"
                value={productForm.productType}
                onChange={(event) =>
                  setProductForm((prev) => ({
                    ...prev,
                    productType: event.target.value as typeof prev.productType
                  }))
                }
              >
                <option value="DURATION">기간형</option>
                <option value="COUNT">횟수형</option>
              </select>
            </label>
            <label className="stack-sm">
              <span className="text-sm">판매 금액</span>
              <input
                className="input"
                placeholder="금액을 입력하세요"
                value={productForm.priceAmount}
                onChange={(event) => setProductForm((prev) => ({ ...prev, priceAmount: event.target.value }))}
              />
            </label>
          </div>

          <div className="ops-field-grid-2">
            <label className="stack-sm">
              <span className="text-sm">유효 기간(일)</span>
              <input
                className="input"
                value={productForm.validityDays}
                disabled={productForm.productType !== "DURATION"}
                onChange={(event) => setProductForm((prev) => ({ ...prev, validityDays: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-sm">총 이용 횟수</span>
              <input
                className="input"
                value={productForm.totalCount}
                disabled={productForm.productType !== "COUNT"}
                onChange={(event) => setProductForm((prev) => ({ ...prev, totalCount: event.target.value }))}
              />
            </label>
          </div>

          <div className="ops-policy-block">
             <span className="ops-kpi-card__label">운영 정책</span>
             <div className="ops-policy-row mt-sm">
                <label className="row-actions">
                  <input
                    type="checkbox"
                    checked={productForm.allowHold}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, allowHold: event.target.checked }))}
                  />
                  <span className="text-sm">홀딩 허용</span>
                </label>
                <label className="row-actions">
                  <input
                    type="checkbox"
                    checked={productForm.allowTransfer}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, allowTransfer: event.target.checked }))}
                  />
                  <span className="text-sm">양도 허용</span>
                </label>
             </div>
             {productForm.allowHold && (
                <div className="ops-field-grid-2 mt-sm">
                  <label className="stack-sm">
                    <span className="text-xs">최대 일수</span>
                    <input className="input" value={productForm.maxHoldDays} onChange={(e) => setProductForm(p => ({ ...p, maxHoldDays: e.target.value }))} />
                  </label>
                  <label className="stack-sm">
                    <span className="text-xs">최대 횟수</span>
                    <input className="input" value={productForm.maxHoldCount} onChange={(e) => setProductForm(p => ({ ...p, maxHoldCount: e.target.value }))} />
                  </label>
                </div>
             )}
          </div>

          <label className="stack-sm">
            <span className="text-sm">내부 설명</span>
            <textarea
              className="input"
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={productForm.description}
              onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </div>
      </Modal>

    </section>
  );
}
