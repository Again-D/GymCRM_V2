import { describe, expect, it } from "vitest";

import { canAccessLockerWorkspace, canRegisterLockerSlots } from "./lockerPermissions";

describe("lockerPermissions", () => {
  it("allows desk users to access the locker workspace but not register lockers", () => {
    const deskUser = {
      userId: 3,
      username: "desk-user",
      primaryRole: "ROLE_DESK",
      roles: ["ROLE_DESK"],
    };

    expect(canAccessLockerWorkspace(deskUser, false)).toBe(true);
    expect(canRegisterLockerSlots(deskUser, false)).toBe(false);
  });

  it("allows managers to register lockers", () => {
    const managerUser = {
      userId: 2,
      username: "manager-user",
      primaryRole: "ROLE_MANAGER",
      roles: ["ROLE_MANAGER"],
    };

    expect(canRegisterLockerSlots(managerUser, false)).toBe(true);
  });
});
