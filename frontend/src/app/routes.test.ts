import { describe, expect, it } from "vitest";

import {
  canAccessShellRoute,
  canSeeShellRoute,
  getDashboardRoutes,
  getSidebarRoutes,
  shellRoutes,
} from "./routes";

const adminUser = {
  userId: 11,
  username: "admin",
  primaryRole: "ROLE_ADMIN",
  roles: ["ROLE_ADMIN"],
};

const superAdminUser = {
  userId: 1,
  username: "super-admin",
  primaryRole: "ROLE_SUPER_ADMIN",
  roles: ["ROLE_SUPER_ADMIN"],
};

const managerUser = {
  userId: 12,
  username: "manager",
  primaryRole: "ROLE_MANAGER",
  roles: ["ROLE_MANAGER"],
};

const deskUser = {
  userId: 13,
  username: "desk",
  primaryRole: "ROLE_DESK",
  roles: ["ROLE_DESK"],
};

const trainerUser = {
  userId: 14,
  username: "trainer",
  primaryRole: "ROLE_TRAINER",
  roles: ["ROLE_TRAINER"],
};

describe("shell routes", () => {
  it("shows the new admin routes only to admin-capable users", () => {
    const adminSidebarRoutes = getSidebarRoutes(adminUser, false);
    const managerSidebarRoutes = getSidebarRoutes(managerUser, false);

    expect(adminSidebarRoutes.map((route) => route.path)).toContain("/settings");
    expect(adminSidebarRoutes.map((route) => route.path)).toContain("/user-accounts");
    expect(managerSidebarRoutes.map((route) => route.path)).not.toContain("/settings");
    expect(managerSidebarRoutes.map((route) => route.path)).not.toContain("/user-accounts");
  });

  it("allows admins and blocks managers for the new protected routes", () => {
    const settingsRoute = shellRoutes.find((route) => route.path === "/settings");
    const userAccountsRoute = shellRoutes.find((route) => route.path === "/user-accounts");

    expect(settingsRoute).toBeTruthy();
    expect(userAccountsRoute).toBeTruthy();

    expect(canSeeShellRoute(settingsRoute!, adminUser, false)).toBe(true);
    expect(canAccessShellRoute(settingsRoute!, adminUser, false)).toBe(true);
    expect(canSeeShellRoute(settingsRoute!, superAdminUser, false)).toBe(true);
    expect(canAccessShellRoute(settingsRoute!, superAdminUser, false)).toBe(true);
    expect(canSeeShellRoute(settingsRoute!, managerUser, false)).toBe(false);
    expect(canAccessShellRoute(settingsRoute!, managerUser, false)).toBe(false);

    expect(canSeeShellRoute(userAccountsRoute!, adminUser, false)).toBe(true);
    expect(canAccessShellRoute(userAccountsRoute!, adminUser, false)).toBe(true);
    expect(canSeeShellRoute(userAccountsRoute!, superAdminUser, false)).toBe(true);
    expect(canAccessShellRoute(userAccountsRoute!, superAdminUser, false)).toBe(true);
    expect(canSeeShellRoute(userAccountsRoute!, managerUser, false)).toBe(false);
    expect(canAccessShellRoute(userAccountsRoute!, managerUser, false)).toBe(false);
  });

  it("keeps settlements visible for trainers and hidden from desk users", () => {
    const settlementsRoute = shellRoutes.find((route) => route.path === "/settlements");

    expect(settlementsRoute).toBeTruthy();

    expect(getDashboardRoutes(trainerUser, false).map((route) => route.path)).not.toContain("/settlements");
    expect(getDashboardRoutes(deskUser, false).map((route) => route.path)).not.toContain("/settlements");

    expect(canSeeShellRoute(settlementsRoute!, trainerUser, false)).toBe(true);
    expect(canAccessShellRoute(settlementsRoute!, trainerUser, false)).toBe(true);
    expect(canSeeShellRoute(settlementsRoute!, deskUser, false)).toBe(false);
    expect(canAccessShellRoute(settlementsRoute!, deskUser, false)).toBe(false);
  });
});
