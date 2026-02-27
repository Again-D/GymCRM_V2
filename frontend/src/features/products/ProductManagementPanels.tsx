import type { Dispatch, FormEvent, SetStateAction } from "react";
import { EmptyTableRow } from "../../shared/ui/EmptyTableRow";
import { NoticeText } from "../../shared/ui/NoticeText";
import { OverlayPanel } from "../../shared/ui/OverlayPanel";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { formatCurrency } from "../../shared/utils/format";

type ProductFiltersState = {
  category: "" | "MEMBERSHIP" | "PT" | "GX" | "ETC";
  status: "" | "ACTIVE" | "INACTIVE";
};

type ProductSummaryRow = {
  productId: number;
  productName: string;
  productCategory: "MEMBERSHIP" | "PT" | "GX" | "ETC" | null;
  productType: "DURATION" | "COUNT";
  priceAmount: number;
  productStatus: "ACTIVE" | "INACTIVE";
};

type ProductDetailView = {
  productId: number;
  centerId: number;
  productName: string;
  productCategory: "MEMBERSHIP" | "PT" | "GX" | "ETC" | null;
  productType: "DURATION" | "COUNT";
  priceAmount: number;
  validityDays: number | null;
  totalCount: number | null;
  allowHold: boolean;
  maxHoldDays: number | null;
  maxHoldCount: number | null;
  allowTransfer: boolean;
  productStatus: "ACTIVE" | "INACTIVE";
  description: string | null;
};

type ProductFormFields = {
  productName: string;
  productCategory: "" | "MEMBERSHIP" | "PT" | "GX" | "ETC";
  productType: "DURATION" | "COUNT";
  priceAmount: string;
  validityDays: string;
  totalCount: string;
  allowHold: boolean;
  maxHoldDays: string;
  maxHoldCount: string;
  allowTransfer: boolean;
  productStatus: "ACTIVE" | "INACTIVE";
  description: string;
};

type ProductManagementPanelsProps = {
  canManageProducts: boolean;
  startCreateProduct: () => void;
  productFilters: ProductFiltersState;
  setProductFilters: Dispatch<SetStateAction<ProductFiltersState>>;
  loadProducts: (filters?: ProductFiltersState) => Promise<void>;
  productsLoading: boolean;
  productPanelMessage: string | null;
  productPanelError: string | null;
  products: ProductSummaryRow[];
  selectedProductId: number | null;
  openProductEditor: (productId: number) => Promise<void>;
  productFormMode: "create" | "edit";
  productFormOpen: boolean;
  closeProductForm: () => void;
  selectedProduct: ProductDetailView | null;
  handleProductStatusToggle: () => Promise<void>;
  productFormSubmitting: boolean;
  handleProductSubmit: (event: FormEvent<HTMLFormElement>) => void;
  productFormMessage: string | null;
  productFormError: string | null;
  productForm: ProductFormFields;
  setProductForm: Dispatch<SetStateAction<ProductFormFields>>;
};

export function ProductManagementPanels({
  canManageProducts,
  startCreateProduct,
  productFilters,
  setProductFilters,
  loadProducts,
  productsLoading,
  productPanelMessage,
  productPanelError,
  products,
  selectedProductId,
  openProductEditor,
  productFormMode,
  productFormOpen,
  closeProductForm,
  selectedProduct,
  handleProductStatusToggle,
  productFormSubmitting,
  handleProductSubmit,
  productFormMessage,
  productFormError,
  productForm,
  setProductForm
}: ProductManagementPanelsProps) {
  return (
    <>
      <article className="panel product-management-panel">
        <PanelHeader
          title="상품 목록"
          actions={
            <button
              type="button"
              className="secondary-button"
              onClick={startCreateProduct}
              disabled={!canManageProducts}
              title={!canManageProducts ? "DESK 권한은 상품 변경이 제한됩니다." : undefined}
            >
              신규 등록
            </button>
          }
        />
        {!canManageProducts ? (
          <NoticeText compact>DESK 권한은 상품 조회만 가능합니다. 상품 등록/수정/상태변경은 제한됩니다.</NoticeText>
        ) : null}

        <form
          className="toolbar-grid products-toolbar-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void loadProducts();
          }}
        >
          <label>
            카테고리
            <select
              value={productFilters.category}
              onChange={(e) =>
                setProductFilters((prev) => ({ ...prev, category: e.target.value as ProductFiltersState["category"] }))
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
              onChange={(e) =>
                setProductFilters((prev) => ({ ...prev, status: e.target.value as ProductFiltersState["status"] }))
              }
            >
              <option value="">전체</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>
          <div className="toolbar-actions">
            <button type="submit" className="primary-button" disabled={productsLoading}>
              {productsLoading ? "조회 중..." : "조회"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                const emptyFilters: ProductFiltersState = { category: "", status: "" };
                setProductFilters(emptyFilters);
                void loadProducts(emptyFilters);
              }}
            >
              초기화
            </button>
          </div>
        </form>

        {productPanelMessage ? <NoticeText tone="success">{productPanelMessage}</NoticeText> : null}
        {productPanelError ? <NoticeText tone="error">{productPanelError}</NoticeText> : null}

        <div className="list-shell">
          <table className="products-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>상품명</th>
                <th>유형</th>
                <th>카테고리</th>
                <th>가격</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <EmptyTableRow colSpan={7} message="조회된 상품이 없습니다." />
              ) : (
                products.map((product) => (
                  <tr key={product.productId} className={product.productId === selectedProductId ? "is-selected" : ""}>
                    <td>{product.productId}</td>
                    <td>{product.productName}</td>
                    <td>{product.productType}</td>
                    <td>{product.productCategory ?? "-"}</td>
                    <td>{formatCurrency(product.priceAmount)}</td>
                    <td>
                      <span className={product.productStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                        {product.productStatus}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="secondary-button" onClick={() => void openProductEditor(product.productId)}>
                        편집
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <OverlayPanel
        open={productFormOpen}
        title={productFormMode === "create" ? "상품 등록" : `상품 수정 #${selectedProductId ?? "-"}`}
        onClose={closeProductForm}
        actions={
          productFormMode === "edit" && selectedProduct ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleProductStatusToggle()}
              disabled={productFormSubmitting || !canManageProducts}
            >
              상태 토글 ({selectedProduct.productStatus})
            </button>
          ) : undefined
        }
      >
        {!canManageProducts ? (
          <NoticeText compact>상품 정책 변경은 `ROLE_CENTER_ADMIN` 권한에서만 가능합니다.</NoticeText>
        ) : null}

        <form className="form-grid" onSubmit={handleProductSubmit}>
          {productFormMessage ? (
            <NoticeText tone="success" fullRow>
              {productFormMessage}
            </NoticeText>
          ) : null}
          {productFormError ? (
            <NoticeText tone="error" fullRow>
              {productFormError}
            </NoticeText>
          ) : null}
          <fieldset className="form-fieldset" disabled={!canManageProducts || productFormSubmitting}>
            <label className="full-row">
              상품명 *
              <input
                required
                value={productForm.productName}
                onChange={(e) => setProductForm((prev) => ({ ...prev, productName: e.target.value }))}
              />
            </label>
            <label>
              카테고리
              <select
                value={productForm.productCategory}
                onChange={(e) =>
                  setProductForm((prev) => ({
                    ...prev,
                    productCategory: e.target.value as ProductFormFields["productCategory"]
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
              유형 *
              <select
                value={productForm.productType}
                onChange={(e) => {
                  const nextType = e.target.value as ProductFormFields["productType"];
                  setProductForm((prev) => ({
                    ...prev,
                    productType: nextType,
                    validityDays: nextType === "DURATION" ? prev.validityDays || "30" : "",
                    totalCount: nextType === "COUNT" ? prev.totalCount || "10" : ""
                  }));
                }}
              >
                <option value="DURATION">DURATION</option>
                <option value="COUNT">COUNT</option>
              </select>
            </label>
            <label>
              가격 (KRW) *
              <input
                required
                inputMode="decimal"
                value={productForm.priceAmount}
                onChange={(e) => setProductForm((prev) => ({ ...prev, priceAmount: e.target.value }))}
              />
            </label>
            <label>
              유효일수 {productForm.productType === "DURATION" ? "*" : ""}
              <input
                inputMode="numeric"
                disabled={productForm.productType !== "DURATION"}
                value={productForm.validityDays}
                onChange={(e) => setProductForm((prev) => ({ ...prev, validityDays: e.target.value }))}
              />
            </label>
            <label>
              총횟수 {productForm.productType === "COUNT" ? "*" : ""}
              <input
                inputMode="numeric"
                disabled={productForm.productType !== "COUNT"}
                value={productForm.totalCount}
                onChange={(e) => setProductForm((prev) => ({ ...prev, totalCount: e.target.value }))}
              />
            </label>
            <label>
              상태
              <select
                value={productForm.productStatus}
                onChange={(e) =>
                  setProductForm((prev) => ({
                    ...prev,
                    productStatus: e.target.value as ProductFormFields["productStatus"]
                  }))
                }
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={productForm.allowHold}
                onChange={(e) => setProductForm((prev) => ({ ...prev, allowHold: e.target.checked }))}
              />
              홀딩 허용
            </label>
            <label>
              최대 홀딩일
              <input
                inputMode="numeric"
                disabled={!productForm.allowHold}
                value={productForm.maxHoldDays}
                onChange={(e) => setProductForm((prev) => ({ ...prev, maxHoldDays: e.target.value }))}
              />
            </label>
            <label>
              최대 홀딩횟수
              <input
                inputMode="numeric"
                disabled={!productForm.allowHold}
                value={productForm.maxHoldCount}
                onChange={(e) => setProductForm((prev) => ({ ...prev, maxHoldCount: e.target.value }))}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={productForm.allowTransfer}
                onChange={(e) => setProductForm((prev) => ({ ...prev, allowTransfer: e.target.checked }))}
              />
              양도 허용
            </label>
            <label className="full-row">
              설명
              <textarea
                rows={3}
                value={productForm.description}
                onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <div className="form-actions full-row">
              <button type="submit" className="primary-button" disabled={productFormSubmitting || !canManageProducts}>
                {productFormSubmitting ? "저장 중..." : productFormMode === "create" ? "상품 등록" : "상품 수정 저장"}
              </button>
            </div>
          </fieldset>
        </form>
      </OverlayPanel>
    </>
  );
}
