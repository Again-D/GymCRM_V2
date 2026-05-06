export interface TransferCalculation {
  productType: string;
  originalTotalCount: number | null;
  originalRemainingCount: number | null;
  newTotalCount: number | null;
  newRemainingCount: number | null;
  newEndDate: string | null;
  transferFee: string;
}

export interface ExtendCalculation {
  originalEndDate: string;
  newEndDate: string;
  extensionDays: number;
  calculatedFee: string;
  actualFee: string;
}