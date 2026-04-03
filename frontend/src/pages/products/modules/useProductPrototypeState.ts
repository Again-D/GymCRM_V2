import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apiPatch, apiPost, isMockApiMode } from "../../../api/client";
import { queryKeys } from "../../../app/queryHelpers";
import {
  createDefaultProductFilters,
  createEmptyProductForm,
  createProductFormFromRecord,
  type ProductFilters,
  type ProductFormState,
  type ProductRecord,
} from "./types";

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildProductInput(productForm: ProductFormState) {
  const productName = productForm.productName.trim();
  if (!productName) {
    return { error: "상품명을 입력해야 합니다." } as const;
  }

  const priceAmount = Number(productForm.priceAmount);
  if (!Number.isFinite(priceAmount) || priceAmount <= 0) {
    return { error: "가격은 0보다 큰 숫자여야 합니다." } as const;
  }

  const validityDays =
    productForm.productType === "DURATION"
      ? parseOptionalNumber(productForm.validityDays)
      : null;
  const totalCount =
    productForm.productType === "COUNT"
      ? parseOptionalNumber(productForm.totalCount)
      : null;
  if (
    productForm.productType === "DURATION" &&
    (!validityDays || validityDays <= 0)
  ) {
    return { error: "기간형 상품은 유효일수를 입력해야 합니다." } as const;
  }
  if (productForm.productType === "COUNT" && (!totalCount || totalCount <= 0)) {
    return { error: "횟수형 상품은 총횟수를 입력해야 합니다." } as const;
  }

  return {
    value: {
      productName,
      productCategory: productForm.productCategory || null,
      productType: productForm.productType,
      priceAmount,
      validityDays,
      totalCount,
      allowHold: productForm.allowHold,
      maxHoldDays: productForm.allowHold
        ? parseOptionalNumber(productForm.maxHoldDays)
        : null,
      maxHoldCount: productForm.allowHold
        ? parseOptionalNumber(productForm.maxHoldCount)
        : null,
      allowHoldBypass: productForm.allowHold && productForm.allowHoldBypass,
      allowTransfer: productForm.allowTransfer,
      productStatus: productForm.productStatus,
      description: productForm.description.trim() || null,
    },
  } as const;
}

export function useProductPrototypeState() {
  const queryClient = useQueryClient();
  const [productFilters, setProductFilters] = useState<ProductFilters>(
    createDefaultProductFilters(),
  );
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(
    null,
  );
  const [productForm, setProductForm] = useState<ProductFormState>(
    createEmptyProductForm(),
  );
  const [productFormMode, setProductFormMode] = useState<"create" | "edit">(
    "create",
  );
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productFormSubmitting, setProductFormSubmitting] = useState(false);
  const [productPanelMessage, setProductPanelMessage] = useState<string | null>(
    null,
  );
  const [productPanelError, setProductPanelError] = useState<string | null>(
    null,
  );
  const [productFormMessage, setProductFormMessage] = useState<string | null>(
    null,
  );
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const useMockMutations = isMockApiMode();

  function clearProductFeedback() {
    setProductPanelMessage(null);
    setProductPanelError(null);
    setProductFormMessage(null);
    setProductFormError(null);
  }

  const invalidateProducts = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  };

  function startCreateProduct() {
    clearProductFeedback();
    setSelectedProductId(null);
    setSelectedProduct(null);
    setProductFormMode("create");
    setProductForm(createEmptyProductForm());
    setProductFormOpen(true);
  }

  function openProductEditor(product: ProductRecord) {
    clearProductFeedback();
    setSelectedProductId(product.productId);
    setSelectedProduct(product);
    setProductFormMode("edit");
    setProductForm(createProductFormFromRecord(product));
    setProductFormOpen(true);
  }

  function closeProductForm() {
    setProductFormOpen(false);
    setProductFormError(null);
    setProductFormMessage(null);
  }

  function resetProductsWorkspace() {
    setProductFilters(createDefaultProductFilters());
    setSelectedProductId(null);
    setSelectedProduct(null);
    setProductForm(createEmptyProductForm());
    setProductFormMode("create");
    setProductFormOpen(false);
    setProductFormSubmitting(false);
    clearProductFeedback();
  }

  async function handleProductSubmit() {
    clearProductFeedback();
    const parsed = buildProductInput(productForm);
    if ("error" in parsed) {
      setProductFormError(parsed.error ?? "상품 입력값이 올바르지 않습니다.");
      return null;
    }

    setProductFormSubmitting(true);
    try {
      let nextProduct: ProductRecord | null;
      if (productFormMode === "create") {
        if (useMockMutations) {
          const { createMockProduct } = await import("../../../api/mockData");
          nextProduct = createMockProduct(parsed.value);
          setProductPanelMessage(
            `상품 #${nextProduct.productId}를 생성했습니다.`,
          );
        } else {
          const response = await apiPost<ProductRecord>(
            "/api/v1/products",
            parsed.value,
          );
          nextProduct = response.data;
          setProductPanelMessage(response.message);
        }
      } else if (selectedProductId != null) {
        if (useMockMutations) {
          const { updateMockProduct } = await import("../../../api/mockData");
          nextProduct = updateMockProduct(selectedProductId, (current) => ({
            ...current,
            ...parsed.value,
          }));
          if (!nextProduct) {
            setProductFormError("수정할 상품을 찾을 수 없습니다.");
            return null;
          }
          setProductPanelMessage(
            `상품 #${nextProduct.productId}를 수정했습니다.`,
          );
        } else {
          const response = await apiPatch<ProductRecord>(
            `/api/v1/products/${selectedProductId}`,
            parsed.value,
          );
          nextProduct = response.data;
          setProductPanelMessage(response.message);
        }
      } else {
        setProductFormError("수정할 상품이 선택되지 않았습니다.");
        return null;
      }

      await invalidateProducts();
      setSelectedProductId(nextProduct.productId);
      setSelectedProduct(nextProduct);
      setProductFormMode("edit");
      setProductForm(createProductFormFromRecord(nextProduct));
      setProductFormOpen(false);
      return nextProduct;
    } finally {
      setProductFormSubmitting(false);
    }
  }

  async function handleProductStatusToggle() {
    clearProductFeedback();
    if (selectedProductId == null) {
      setProductPanelError("상태를 변경할 상품이 선택되지 않았습니다.");
      return null;
    }

    setProductFormSubmitting(true);
    try {
      let nextProduct: ProductRecord | null;
      if (useMockMutations) {
        const { toggleMockProductStatus } =
          await import("../../../api/mockData");
        nextProduct = toggleMockProductStatus(selectedProductId);
        if (!nextProduct) {
          setProductPanelError("상태를 변경할 상품을 찾을 수 없습니다.");
          return null;
        }
        setProductPanelMessage(
          `상품 #${nextProduct.productId} 상태를 ${nextProduct.productStatus}로 변경했습니다.`,
        );
      } else {
        const nextStatus =
          selectedProduct?.productStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const response = await apiPatch<ProductRecord>(
          `/api/v1/products/${selectedProductId}/status`,
          {
            productStatus: nextStatus,
          },
        );
        nextProduct = response.data;
        setProductPanelMessage(response.message);
      }
      await invalidateProducts();
      setSelectedProduct(nextProduct);
      setProductForm(createProductFormFromRecord(nextProduct));
      return nextProduct;
    } finally {
      setProductFormSubmitting(false);
    }
  }

  return {
    productFilters,
    setProductFilters,
    selectedProductId,
    setSelectedProductId,
    selectedProduct,
    setSelectedProduct,
    productForm,
    setProductForm,
    productFormMode,
    productFormOpen,
    productFormSubmitting,
    productPanelMessage,
    productPanelError,
    productFormMessage,
    productFormError,
    clearProductFeedback,
    startCreateProduct,
    openProductEditor,
    closeProductForm,
    resetProductsWorkspace,
    handleProductSubmit,
    handleProductStatusToggle,
  } as const;
}
