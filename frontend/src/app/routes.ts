import type { PrototypeAuthUser } from "./auth";
import { hasAnyRole } from "./roles";

export type NavSectionKey =
  | "dashboard"
  | "members"
  | "mySchedule"
  | "gxSchedules"
  | "trainers"
  | "memberships"
  | "reservations"
  | "access"
  | "lockers"
  | "crm"
  | "settlements"
  | "products";

export type ShellRoute = {
  key: NavSectionKey;
  path: string;
  label: string;
  protected: boolean;
  showInSidebar: boolean;
  showInDashboard: boolean;
  visibleRoles?: string[];
  allowedRoles?: string[];
};

export const shellRoutes: ShellRoute[] = [
  {
    key: "dashboard",
    path: "/dashboard",
    label: "대시보드",
    protected: true,
    showInSidebar: true,
    showInDashboard: false,
  },
  {
    key: "members",
    path: "/members",
    label: "회원 관리",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
  },
  {
    key: "mySchedule",
    path: "/my-schedule",
    label: "내 스케줄",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
    visibleRoles: ["ROLE_TRAINER"],
    allowedRoles: ["ROLE_TRAINER"],
  },
  {
    key: "gxSchedules",
    path: "/gx-schedules",
    label: "GX 스케줄",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
    visibleRoles: [
      "ROLE_SUPER_ADMIN",
      "ROLE_CENTER_ADMIN",
      "ROLE_MANAGER",
      "ROLE_DESK",
      "ROLE_TRAINER",
    ],
    allowedRoles: [
      "ROLE_SUPER_ADMIN",
      "ROLE_CENTER_ADMIN",
      "ROLE_MANAGER",
      "ROLE_DESK",
      "ROLE_TRAINER",
    ],
  },
  {
    key: "trainers",
    path: "/trainers",
    label: "트레이너 관리",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
    visibleRoles: ["ROLE_SUPER_ADMIN", "ROLE_CENTER_ADMIN", "ROLE_DESK"],
    allowedRoles: ["ROLE_SUPER_ADMIN", "ROLE_CENTER_ADMIN", "ROLE_DESK"],
  },
  {
    key: "memberships",
    path: "/memberships",
    label: "회원권 업무",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
  },
  {
    key: "reservations",
    path: "/reservations",
    label: "예약 관리",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
  },
  {
    key: "access",
    path: "/access",
    label: "출입 관리",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
  },
  {
    key: "lockers",
    path: "/lockers",
    label: "라커 관리",
    protected: true,
    showInSidebar: true,
    showInDashboard: false,
  },
  {
    key: "crm",
    path: "/crm",
    label: "CRM 메시지",
    protected: true,
    showInSidebar: true,
    showInDashboard: false,
  },
  {
    key: "settlements",
    path: "/settlements",
    label: "정산 리포트",
    protected: true,
    showInSidebar: true,
    showInDashboard: false,
  },
  {
    key: "products",
    path: "/products",
    label: "상품 관리",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
  },
];

const shellRouteByPath = new Map(
  shellRoutes.map((route) => [route.path, route]),
);

export function getShellRouteByPath(pathname: string) {
  return shellRouteByPath.get(pathname) ?? null;
}

export function canAccessShellRoute(
  route: ShellRoute,
  authUser: PrototypeAuthUser | null | undefined,
  isMockMode: boolean,
) {
  if (isMockMode) {
    return true;
  }
  return hasAnyRole(authUser, route.allowedRoles);
}

export function canSeeShellRoute(
  route: ShellRoute,
  authUser: PrototypeAuthUser | null | undefined,
  isMockMode: boolean,
) {
  if (isMockMode) {
    return true;
  }
  return hasAnyRole(authUser, route.visibleRoles);
}

export function getSidebarRoutes(
  authUser: PrototypeAuthUser | null | undefined,
  isMockMode: boolean,
) {
  return shellRoutes.filter(
    (route) =>
      route.showInSidebar && canSeeShellRoute(route, authUser, isMockMode),
  );
}

export function getDashboardRoutes(
  authUser: PrototypeAuthUser | null | undefined,
  isMockMode: boolean,
) {
  return shellRoutes.filter(
    (route) =>
      route.showInDashboard && canSeeShellRoute(route, authUser, isMockMode),
  );
}
