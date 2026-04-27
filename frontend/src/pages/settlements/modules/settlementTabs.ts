import type { SettlementTabKey } from "./types";

export type SettlementTabDefinition = {
  key: SettlementTabKey;
  label: string;
  description: string;
};

export const settlementTabs: SettlementTabDefinition[] = [
  {
    key: "salesAnalytics",
    label: "매출 분석",
    description: "운영 요약과 추이 증빙을 확인합니다."
  },
  {
    key: "trainerPayroll",
    label: "트레이너 정산",
    description: "기간 기준 preview와 정산 작업을 분리해 관리합니다."
  }
];

export const DEFAULT_SETTLEMENT_TAB: SettlementTabKey = "salesAnalytics";

export function isSettlementTabKey(value: string | null | undefined): value is SettlementTabKey {
  return settlementTabs.some((tab) => tab.key === value);
}

export function resolveSettlementTab(value: string | null | undefined): SettlementTabKey {
  return isSettlementTabKey(value) ? value : DEFAULT_SETTLEMENT_TAB;
}
