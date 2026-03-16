import { useEffect, useState } from "react";

import { useAuthState } from "../../app/auth";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { useProductsQuery } from "./modules/useProductsQuery";
import { useProductPrototypeState } from "./modules/useProductPrototypeState";
import { createDefaultProductFilters, type ProductRecord } from "./modules/types";
import { Modal } from "../../shared/ui/Modal";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

function productTypeSummary(product: ProductRecord) {
  if (product.productType === "DURATION") {
    return `PERIOD · ${product.validityDays ?? "-"}d`;
  }
  return `SESSION · x${product.totalCount ?? "-"}`;
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
    <div className="stack-lg">
      
      {/* PRODUCT DIRECTORY */}
      <article className="panel-card">
        <header className="panel-card-header mb-md">
          <div>
            <h1 className="brand-title" style={{ fontSize: '1.25rem' }}>Product & Service Inventory</h1>
            <p className="text-muted text-xs">Manage active memberships, session packs, and retail offerings.</p>
          </div>
          {canMutateProducts && (
            <button type="button" className="primary-button" onClick={startCreateProduct}>
              Create New Item
            </button>
          )}
        </header>

        <div className="members-filter-grid" style={{ marginBottom: '24px' }}>
          <label className="stack-sm">
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Category Range</span>
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
              <option value="">All Categories</option>
              <option value="MEMBERSHIP">Membership</option>
              <option value="PT">Personal Training</option>
              <option value="GX">Group Classes</option>
              <option value="ETC">Other</option>
            </select>
          </label>
          <label className="stack-sm">
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Availability State</span>
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
              <option value="">All States</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Archived</option>
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
                Clear Filters
              </button>
              <button type="button" className="secondary-button" onClick={() => void loadProducts(productFilters)} disabled={productsLoading || !canReadLiveProducts}>
                {productsLoading ? "Syncing..." : "Apply"}
              </button>
          </div>
        </div>

        {(productPanelMessage || productPanelError || productsQueryError) && (
          <div className="mb-md">
            {productPanelMessage && <div className="pill ok full-span" style={{ justifyContent: 'center' }}>{productPanelMessage}</div>}
            {(productPanelError || productsQueryError) && <div className="pill danger full-span" style={{ justifyContent: 'center' }}>{productPanelError ?? productsQueryError}</div>}
          </div>
        )}

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>Service Identity</th>
                <th>Classification</th>
                <th>Pricing</th>
                <th>State</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {productsPagination.pagedItems.map((product) => (
                <tr key={product.productId} className={product.productId === selectedProductId ? "is-selected-row" : ""}>
                  <td>
                    <div className="stack-sm">
                      <span className="text-sm" style={{ fontWeight: 600 }}>{product.productName}</span>
                      <span className="text-xs text-muted">ID: #{product.productId} · {productTypeSummary(product)}</span>
                    </div>
                  </td>
                  <td><span className="pill muted">{product.productCategory ?? "Unclassified"}</span></td>
                  <td><span className="brand-title text-sm">{formatCurrency(product.priceAmount)}</span></td>
                  <td>
                    <span className={product.productStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                      {product.productStatus}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {canMutateProducts && (
                      <button type="button" className="secondary-button" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => openProductEditor(product)}>
                        MANAGE
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {productsPagination.pagedItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell" style={{ padding: '48px' }}>
                    {!canReadLiveProducts ? "Access Restricted." : "No product inventory records available."}
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
        title={productFormMode === "create" ? "Catalog: New Product Profile" : `Catalog: Update Product #${selectedProductId}`}
        footer={
          <>
            <button className="secondary-button" onClick={closeProductForm}>Cancel</button>
            <button 
              className="primary-button" 
              onClick={() => void runSubmit()}
              disabled={productFormSubmitting}
            >
              {productFormSubmitting ? "Saving Profile..." : "Submit Profile"}
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
                  SET AS {selectedProduct.productStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
                </button>
             </div>
          )}

          {productFormError && <div className="pill danger full-span">{productFormError}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label className="stack-sm">
              <span className="text-sm">Product Title</span>
              <input
                className="input"
                placeholder="Operational name..."
                value={productForm.productName}
                onChange={(event) => setProductForm((prev) => ({ ...prev, productName: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-sm">Classification</span>
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
                <option value="">-- Choose Category --</option>
                <option value="MEMBERSHIP">Membership</option>
                <option value="PT">Personal Training</option>
                <option value="GX">Group Classes</option>
                <option value="ETC">Other Services</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label className="stack-sm">
              <span className="text-sm">Service Model</span>
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
                <option value="DURATION">Duration (Days)</option>
                <option value="COUNT">Session Count</option>
              </select>
            </label>
            <label className="stack-sm">
              <span className="text-sm">Unit Price</span>
              <input
                className="input"
                placeholder="Market value..."
                value={productForm.priceAmount}
                onChange={(event) => setProductForm((prev) => ({ ...prev, priceAmount: event.target.value }))}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label className="stack-sm">
              <span className="text-sm">Active Period (Days)</span>
              <input
                className="input"
                value={productForm.validityDays}
                disabled={productForm.productType !== "DURATION"}
                onChange={(event) => setProductForm((prev) => ({ ...prev, validityDays: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-sm">Total Allocations</span>
              <input
                className="input"
                value={productForm.totalCount}
                disabled={productForm.productType !== "COUNT"}
                onChange={(event) => setProductForm((prev) => ({ ...prev, totalCount: event.target.value }))}
              />
            </label>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-minimal)' }}>
             <span className="text-xs" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>OPERATIONAL POLICIES</span>
             <div className="row-actions mt-sm" style={{ gap: '24px' }}>
                <label className="row-actions" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.allowHold}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, allowHold: event.target.checked }))}
                  />
                  <span className="text-sm">Enable Hold</span>
                </label>
                <label className="row-actions" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.allowTransfer}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, allowTransfer: event.target.checked }))}
                  />
                  <span className="text-sm">Enable Transfer</span>
                </label>
             </div>
             {productForm.allowHold && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="mt-sm">
                  <label className="stack-sm">
                    <span className="text-xs">Max Days</span>
                    <input className="input" style={{ padding: '8px' }} value={productForm.maxHoldDays} onChange={(e) => setProductForm(p => ({ ...p, maxHoldDays: e.target.value }))} />
                  </label>
                  <label className="stack-sm">
                    <span className="text-xs">Max Occurrences</span>
                    <input className="input" style={{ padding: '8px' }} value={productForm.maxHoldCount} onChange={(e) => setProductForm(p => ({ ...p, maxHoldCount: e.target.value }))} />
                  </label>
                </div>
             )}
          </div>

          <label className="stack-sm">
            <span className="text-sm">Internal Description</span>
            <textarea
              className="input"
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={productForm.description}
              onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </div>
      </Modal>

    </div>
  );
}
