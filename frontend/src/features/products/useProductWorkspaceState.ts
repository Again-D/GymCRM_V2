import { useState } from "react";

export type ProductSummary = {
  productId: number;
  centerId: number;
  productName: string;
  productCategory: "MEMBERSHIP" | "PT" | "GX" | "ETC" | null;
  productType: "DURATION" | "COUNT";
  priceAmount: number;
  productStatus: "ACTIVE" | "INACTIVE";
};

export type ProductDetail = {
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

export type ProductFormState = {
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

export type ProductFilters = {
  category: "" | "MEMBERSHIP" | "PT" | "GX" | "ETC";
  status: "" | "ACTIVE" | "INACTIVE";
};

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  productName: "",
  productCategory: "MEMBERSHIP",
  productType: "DURATION",
  priceAmount: "",
  validityDays: "30",
  totalCount: "",
  allowHold: true,
  maxHoldDays: "30",
  maxHoldCount: "1",
  allowTransfer: false,
  productStatus: "ACTIVE",
  description: ""
};

export function useProductWorkspaceState() {
  const [productFilters, setProductFilters] = useState<ProductFilters>({ category: "", status: "" });
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [productFormMode, setProductFormMode] = useState<"create" | "edit">("create");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productFormSubmitting, setProductFormSubmitting] = useState(false);
  const [productPanelMessage, setProductPanelMessage] = useState<string | null>(null);
  const [productPanelError, setProductPanelError] = useState<string | null>(null);
  const [productFormMessage, setProductFormMessage] = useState<string | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);

  function resetProductWorkspace() {
    setProductFilters({ category: "", status: "" });
    setProducts([]);
    setProductsLoading(false);
    setSelectedProductId(null);
    setSelectedProduct(null);
    setProductForm({ ...EMPTY_PRODUCT_FORM });
    setProductFormMode("create");
    setProductFormOpen(false);
    setProductFormSubmitting(false);
    setProductPanelMessage(null);
    setProductPanelError(null);
    setProductFormMessage(null);
    setProductFormError(null);
  }

  return {
    productFilters,
    setProductFilters,
    products,
    setProducts,
    productsLoading,
    setProductsLoading,
    selectedProductId,
    setSelectedProductId,
    selectedProduct,
    setSelectedProduct,
    productForm,
    setProductForm,
    productFormMode,
    setProductFormMode,
    productFormOpen,
    setProductFormOpen,
    productFormSubmitting,
    setProductFormSubmitting,
    productPanelMessage,
    setProductPanelMessage,
    productPanelError,
    setProductPanelError,
    productFormMessage,
    setProductFormMessage,
    productFormError,
    setProductFormError,
    resetProductWorkspace
  };
}
