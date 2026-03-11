import { describe, expect, it } from "vitest";
import { routePreviewRoutes, shellRoutes } from "./routes";

describe("shell route metadata", () => {
  it("contains only shell sections in navigation routes", () => {
    expect(shellRoutes.map((route) => route.path)).toEqual([
      "/dashboard",
      "/members",
      "/memberships",
      "/reservations",
      "/access",
      "/lockers",
      "/crm",
      "/settlements",
      "/products"
    ]);
  });

  it("keeps preview/detail routes outside the shell navigation surface", () => {
    expect(routePreviewRoutes.some((route) => route.path === "/members/:memberId")).toBe(true);
    expect(routePreviewRoutes.some((route) => route.path === "/products/new")).toBe(true);
    expect(shellRoutes.some((route) => route.path === "/members/:memberId")).toBe(false);
    expect(shellRoutes.some((route) => route.path === "/products/new")).toBe(false);
  });
});
