import { describe, expect, it } from "vitest";

import { isMembershipReservableOn } from "./reservableMemberships";

describe("isMembershipReservableOn", () => {
  const businessDate = "2026-03-12";

  it("accepts active count memberships with remaining sessions", () => {
    expect(
      isMembershipReservableOn(
        {
          membershipStatus: "ACTIVE",
          productTypeSnapshot: "COUNT",
          remainingCount: 3,
          endDate: "2026-05-01"
        },
        businessDate
      )
    ).toBe(true);
  });

  it("rejects expired active memberships", () => {
    expect(
      isMembershipReservableOn(
        {
          membershipStatus: "ACTIVE",
          productTypeSnapshot: "COUNT",
          remainingCount: 3,
          endDate: "2026-01-01"
        },
        businessDate
      )
    ).toBe(false);
  });

  it("rejects holding memberships and exhausted count memberships", () => {
    expect(
      isMembershipReservableOn(
        {
          membershipStatus: "HOLDING",
          productTypeSnapshot: "DURATION",
          remainingCount: null,
          endDate: "2026-06-01"
        },
        businessDate
      )
    ).toBe(false);

    expect(
      isMembershipReservableOn(
        {
          membershipStatus: "ACTIVE",
          productTypeSnapshot: "COUNT",
          remainingCount: 0,
          endDate: "2026-06-01"
        },
        businessDate
      )
    ).toBe(false);
  });
});
