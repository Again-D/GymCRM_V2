import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routePreviewRoutes, shellRoutes } from "../../app/routes";
import { DashboardSection } from "./DashboardSection";

describe("DashboardSection", () => {
  it("renders dashboard quick actions from shell routes as links", () => {
    const quickActions = shellRoutes.filter((route) => route.showInDashboard);

    render(
      <MemoryRouter>
        <DashboardSection
          routePreview={routePreviewRoutes.slice(0, 4)}
          quickActions={quickActions}
          selectedMemberLabel="-"
          hasSelectedMember={false}
          isDeskRole={false}
          securityMode="jwt"
          isAuthenticated={true}
          membersCount={12}
          productsCount={4}
          sessionMembershipCount={2}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "회원 관리" }).getAttribute("href")).toBe("/members");
    expect(screen.getByRole("link", { name: "회원권 업무" }).getAttribute("href")).toBe("/memberships");
    expect(screen.getByRole("link", { name: "예약 관리" }).getAttribute("href")).toBe("/reservations");
    expect(screen.getByRole("link", { name: "출입 관리" }).getAttribute("href")).toBe("/access");
    expect(screen.getByRole("link", { name: "상품 관리" }).getAttribute("href")).toBe("/products");
  });
});
