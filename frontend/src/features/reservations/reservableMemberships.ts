type ReservableMembership = {
  membershipStatus: "ACTIVE" | "HOLDING" | "REFUNDED" | "EXPIRED";
  productTypeSnapshot: "DURATION" | "COUNT";
  remainingCount: number | null;
  endDate: string | null;
};

export function isMembershipReservableOn(
  membership: ReservableMembership,
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
