export type ProductCategory = "MEMBERSHIP" | "PT" | "GX" | "ETC" | null;
export type ProductType = "DURATION" | "COUNT";
export type ProductStatus = "ACTIVE" | "INACTIVE";

export type ProductPromotionRecord = {
  promotionDiscountType: "PERCENT" | "AMOUNT";
  promotionDiscountValue: number;
  promotionStartDate: string;
  promotionEndDate: string;
};

export type ProductRecord = {
  productId: number;
  centerId: number;
  productName: string;
  productCategory: ProductCategory;
  productType: ProductType;
  priceAmount: number;
  validityDays: number | null;
  totalCount: number | null;
  allowHold: boolean;
  maxHoldDays: number | null;
  maxHoldCount: number | null;
  allowHoldBypass: boolean;
  allowTransfer: boolean;
  assignedTrainerId: number | null;
  promotion: ProductPromotionRecord | null;
  productStatus: ProductStatus;
  description: string | null;
};

export type ProductFilters = {
  category: "" | Exclude<ProductCategory, null>;
  status: "" | ProductStatus;
};

export type ProductFormState = {
  productName: string;
  productCategory: "" | Exclude<ProductCategory, null>;
  productType: ProductType;
  priceAmount: string;
  validityDays: string;
  totalCount: string;
  allowHold: boolean;
  maxHoldDays: string;
  maxHoldCount: string;
  allowHoldBypass: boolean;
  allowTransfer: boolean;
  assignedTrainerId: string;
  promotionDiscountType: "" | ProductPromotionRecord["promotionDiscountType"];
  promotionDiscountValue: string;
  promotionStartDate: string;
  promotionEndDate: string;
  productStatus: ProductStatus;
  description: string;
};

export function createDefaultProductFilters(): ProductFilters {
  return {
    category: "",
    status: ""
  };
}

export function createEmptyProductForm(): ProductFormState {
  return {
    productName: "",
    productCategory: "MEMBERSHIP",
    productType: "DURATION",
    priceAmount: "",
    validityDays: "30",
    totalCount: "",
    allowHold: true,
    maxHoldDays: "30",
    maxHoldCount: "1",
    allowHoldBypass: false,
    allowTransfer: false,
    assignedTrainerId: "",
    promotionDiscountType: "",
    promotionDiscountValue: "",
    promotionStartDate: "",
    promotionEndDate: "",
    productStatus: "ACTIVE",
    description: ""
  };
}

export function createProductFormFromRecord(product: ProductRecord): ProductFormState {
  return {
    productName: product.productName,
    productCategory: product.productCategory ?? "",
    productType: product.productType,
    priceAmount: String(product.priceAmount),
    validityDays: product.validityDays == null ? "" : String(product.validityDays),
    totalCount: product.totalCount == null ? "" : String(product.totalCount),
    allowHold: product.allowHold,
    maxHoldDays: product.maxHoldDays == null ? "" : String(product.maxHoldDays),
    maxHoldCount: product.maxHoldCount == null ? "" : String(product.maxHoldCount),
    allowHoldBypass: product.allowHoldBypass,
    allowTransfer: product.allowTransfer,
    assignedTrainerId: product.assignedTrainerId == null ? "" : String(product.assignedTrainerId),
    promotionDiscountType: product.promotion?.promotionDiscountType ?? "",
    promotionDiscountValue: product.promotion == null ? "" : String(product.promotion.promotionDiscountValue),
    promotionStartDate: product.promotion?.promotionStartDate ?? "",
    promotionEndDate: product.promotion?.promotionEndDate ?? "",
    productStatus: product.productStatus,
    description: product.description ?? ""
  };
}
