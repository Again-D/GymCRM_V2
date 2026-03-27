import type { PrototypeAuthUser } from "./auth";
import { hasAnyRole } from "./roles";

export type NavSectionKey =
  | "dashboard"
  | "members"
  | "mySchedule"
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
  description: string;
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
    description: "운영 요약 / 빠른 진입",
    protected: true,
    showInSidebar: true,
    showInDashboard: false,
  },
  {
    key: "members",
    path: "/members",
    label: "회원 관리",
    description: "회원 목록 / 검색 / 상태 확인",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
  },
  {
    key: "mySchedule",
    path: "/my-schedule",
    label: "내 스케줄",
    description: "주간 가능 시간 / 휴무 / 날짜별 예외",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
    visibleRoles: ["ROLE_TRAINER"],
    allowedRoles: ["ROLE_TRAINER"],
  },
  {
    key: "trainers",
    path: "/trainers",
    label: "트레이너 관리",
    description: "계정 운영 / 담당 회원 / 오늘 예약 현황",
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
    description: "구매 / 홀딩 / 해제 / 환불",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
  },
  {
    key: "reservations",
    path: "/reservations",
    label: "예약 관리",
    description: "예약 생성 / 변경 / 완료",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
  },
  {
    key: "access",
    path: "/access",
    label: "출입 관리",
    description: "입장 / 퇴장 / 현재 입장",
    protected: true,
    showInSidebar: true,
    showInDashboard: true,
  },
  {
    key: "lockers",
    path: "/lockers",
    label: "라커 관리",
    description: "슬롯 조회 / 배정 / 반납",
    protected: true,
    showInSidebar: true,
    showInDashboard: false,
  },
  {
    key: "crm",
    path: "/crm",
    label: "CRM 메시지",
    description: "트리거 / 큐 / 발송 이력",
    protected: true,
    showInSidebar: true,
    showInDashboard: false,
  },
  {
    key: "settlements",
    path: "/settlements",
    label: "정산 리포트",
    description: "기간별 정산 집계",
    protected: true,
    showInSidebar: true,
    showInDashboard: false,
  },
  {
    key: "products",
    path: "/products",
    label: "상품 관리",
    description: "상품 목록 / 정책",
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
    (route) => route.showInSidebar && canSeeShellRoute(route, authUser, isMockMode),
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
