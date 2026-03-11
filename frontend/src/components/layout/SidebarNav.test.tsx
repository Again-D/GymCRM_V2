import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { shellRoutes } from "../../app/routes";
import { SidebarNav } from "./SidebarNav";

describe("SidebarNav", () => {
  it("renders shell route links for sidebar navigation", () => {
    const items = shellRoutes.filter((route) => route.showInSidebar);

    render(
      <MemoryRouter>
        <SidebarNav
          items={items}
          activeKey="members"
          isJwtMode={true}
          selectedMemberLabel="-"
          currentUserLabel="Center Admin"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /회원 관리/ }).getAttribute("href")).toBe("/members");
    expect(screen.getByRole("link", { name: /회원권 업무/ }).getAttribute("href")).toBe("/memberships");
    expect(screen.getByRole("link", { name: /예약 관리/ }).getAttribute("href")).toBe("/reservations");
  });
});
