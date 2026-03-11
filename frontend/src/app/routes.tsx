export type NavSectionKey =
  | "dashboard"
  | "members"
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
};

export type RoutePreviewItem = {
  path: string;
  label: string;
};

export const shellRoutes: ShellRoute[] = [
  {
    key: "dashboard",
    path: "/dashboard",
    label: "대시보드",
    description: "운영 요약 / 빠른 진입",
    protected: true,
    showInSidebar: true,
    showInDashboard: false
  },
  {
    key: "members",
    path: "/members",
    label: "회원 관리",
    description: "회원 목록 / 등록 / 수정",
    protected: true,
    showInSidebar: true,
    showInDashboard: true
  },
  {
    key: "memberships",
    path: "/memberships",
    label: "회원권 업무",
    description: "구매 / 홀딩 / 해제 / 환불",
    protected: true,
    showInSidebar: true,
    showInDashboard: true
  },
  {
    key: "reservations",
    path: "/reservations",
    label: "예약 관리",
    description: "예약 생성 / 취소 / 완료 / 차감",
    protected: true,
    showInSidebar: true,
    showInDashboard: true
  },
  {
    key: "access",
    path: "/access",
    label: "출입 관리",
    description: "입장 / 퇴장 / 거절 이력 / 현재 입장",
    protected: true,
    showInSidebar: true,
    showInDashboard: true
  },
  {
    key: "lockers",
    path: "/lockers",
    label: "라커 관리",
    description: "슬롯 조회 / 배정 / 반납",
    protected: true,
    showInSidebar: true,
    showInDashboard: false
  },
  {
    key: "crm",
    path: "/crm",
    label: "CRM 메시지",
    description: "만료임박 트리거 / 큐 처리 / 이력",
    protected: true,
    showInSidebar: true,
    showInDashboard: false
  },
  {
    key: "settlements",
    path: "/settlements",
    label: "정산 리포트",
    description: "기간/상품/결제수단/순매출",
    protected: true,
    showInSidebar: true,
    showInDashboard: false
  },
  {
    key: "products",
    path: "/products",
    label: "상품 관리",
    description: "상품 목록 / 정책 / 상태",
    protected: true,
    showInSidebar: true,
    showInDashboard: true
  }
];

export const routePreviewRoutes: RoutePreviewItem[] = [
  { path: "/members", label: "회원 목록" },
  { path: "/members/:memberId", label: "회원 상세" },
  { path: "/access", label: "출입 관리" },
  { path: "/products", label: "상품 목록" },
  { path: "/products/new", label: "상품 등록" }
];

export const shellRouteByKey = new Map(shellRoutes.map((route) => [route.key, route]));
export const shellRouteByPath = new Map(shellRoutes.map((route) => [route.path, route]));

export function getShellRouteByPath(pathname: string) {
  return shellRouteByPath.get(pathname) ?? null;
}

export function getShellRouteByKey(key: NavSectionKey) {
  return shellRouteByKey.get(key) ?? null;
}
