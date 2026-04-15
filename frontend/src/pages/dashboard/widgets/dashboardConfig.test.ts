import { describe, expect, it } from "vitest";
import { getDashboardWidgetConfig } from "./dashboardConfig";

describe("getDashboardWidgetConfig", () => {
  it("returns [accessSummary, metricsSummary, scheduleOverview] for ROLE_MANAGER", () => {
    const widgets = getDashboardWidgetConfig({
      userId: 1,
      centerId: 1,
      username: "admin-user",
      primaryRole: "ROLE_MANAGER",
      roles: ["ROLE_MANAGER"],
    });

    const ids = widgets.map((w) => w.id);
    expect(ids).toEqual(["accessSummary", "metricsSummary", "scheduleOverview"]);
  });

  it("returns [accessSummary, metricsSummary, scheduleOverview] for ROLE_ADMIN", () => {
    const widgets = getDashboardWidgetConfig({
      userId: 1,
      centerId: 1,
      username: "admin-user",
      primaryRole: "ROLE_ADMIN",
      roles: ["ROLE_ADMIN"],
    });

    const ids = widgets.map((w) => w.id);
    expect(ids).toEqual(["accessSummary", "metricsSummary", "scheduleOverview"]);
  });

  it("returns [accessSummary, metricsSummary, scheduleOverview] for ROLE_SUPER_ADMIN", () => {
    const widgets = getDashboardWidgetConfig({
      userId: 1,
      username: "super-admin",
      primaryRole: "ROLE_SUPER_ADMIN",
      roles: ["ROLE_SUPER_ADMIN"],
    });

    const ids = widgets.map((w) => w.id);
    expect(ids).toEqual(["accessSummary", "metricsSummary", "scheduleOverview"]);
  });

  it("returns [accessSummary, scheduleOverview, crmAction] for ROLE_DESK", () => {
    const widgets = getDashboardWidgetConfig({
      userId: 2,
      username: "desk-user",
      primaryRole: "ROLE_DESK",
      roles: ["ROLE_DESK"],
    });

    const ids = widgets.map((w) => w.id);
    expect(ids).toEqual(["accessSummary", "scheduleOverview", "crmAction"]);
  });

  it("returns [accessSummary, scheduleOverview, crmAction] for ROLE_DESK", () => {
    const widgets = getDashboardWidgetConfig({
      userId: 3,
      username: "desk-user",
      primaryRole: "ROLE_DESK",
      roles: ["ROLE_DESK"],
    });

    const ids = widgets.map((w) => w.id);
    expect(ids).toEqual(["accessSummary", "scheduleOverview", "crmAction"]);
  });

  it("returns [trainerSchedule, crmAction] for ROLE_TRAINER", () => {
    const widgets = getDashboardWidgetConfig({
      userId: 4,
      username: "trainer-user",
      primaryRole: "ROLE_TRAINER",
      roles: ["ROLE_TRAINER"],
    });

    const ids = widgets.map((w) => w.id);
    expect(ids).toEqual(["trainerSchedule", "crmAction"]);
  });

  it("returns an empty array for unknown roles", () => {
    const widgets = getDashboardWidgetConfig({
      userId: 5,
      username: "unknown-user",
      primaryRole: "ROLE_UNKNOWN",
      roles: ["ROLE_UNKNOWN"],
    });

    expect(widgets).toEqual([]);
  });

  it("returns an empty array for null authUser", () => {
    const widgets = getDashboardWidgetConfig(null);
    expect(widgets).toEqual([]);
  });
});
