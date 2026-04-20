import { describe, expect, it } from "vitest";

import {
  getCreateRoleOptions,
  MANAGEABLE_ROLE_OPTIONS,
  SUPER_ADMIN_CREATE_ROLE_OPTIONS,
} from "./types";

describe("user account role options", () => {
  it("limits super admin to admin account creation", () => {
    expect(getCreateRoleOptions(true)).toEqual(SUPER_ADMIN_CREATE_ROLE_OPTIONS);
  });

  it("limits admin users to operational account creation", () => {
    expect(getCreateRoleOptions(false)).toEqual(MANAGEABLE_ROLE_OPTIONS);
  });
});
