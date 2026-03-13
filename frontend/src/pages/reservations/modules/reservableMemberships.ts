import type { PurchasedMembership } from "../../members/modules/types";

export function isMembershipReservableOn(
  membership: Pick<PurchasedMembership, "membershipStatus" | "productTypeSnapshot" | "remainingCount" | "endDate">,
  businessDateText: string
): boolean {
  if (membership.membershipStatus !== "ACTIVE") {
    return false;
  }
  if (membership.endDate && membership.endDate < businessDateText) {
    return false;
  }
  if (membership.productTypeSnapshot === "COUNT" && (membership.remainingCount ?? 0) <= 0) {
    return false;
  }
  return true;
}
