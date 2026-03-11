import { describe, expect, it } from "vitest";
import { isMembershipReservableOn } from "./reservableMemberships";

describe("isMembershipReservableOn", () => {
  it("rejects expired active memberships", () => {
    expect(
      isMembershipReservableOn(
        {
          membershipStatus: "ACTIVE",
          productTypeSnapshot: "DURATION",
          remainingCount: null,
          endDate: "2026-03-10"
        },
        "2026-03-11"
      )
    ).toBe(false);
  });

  it("rejects exhausted count memberships", () => {
    expect(
      isMembershipReservableOn(
        {
          membershipStatus: "ACTIVE",
          productTypeSnapshot: "COUNT",
          remainingCount: 0,
          endDate: "2026-03-30"
        },
        "2026-03-11"
      )
    ).toBe(false);
  });

  it("accepts active non-expired memberships", () => {
    expect(
      isMembershipReservableOn(
        {
          membershipStatus: "ACTIVE",
          productTypeSnapshot: "DURATION",
          remainingCount: null,
          endDate: "2026-03-11"
        },
        "2026-03-11"
      )
    ).toBe(true);
  });
});
